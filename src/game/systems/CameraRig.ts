import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Input } from './Input';
import { Time } from './Time';

/**
 * Câmera Third-Person - CONTROLES CORRETOS
 * 
 * Mouse direita = câmera gira para DIREITA
 * Mouse cima = câmera olha para CIMA
 * Câmera sempre ATRÁS do player
 */
export class CameraRig {
  camera: THREE.PerspectiveCamera;
  
  private yaw: number = 0;
  private pitch: number = 0.3;
  private currentDistance: number;
  private targetDistance: number;
  private baseFOV: number = 70;
  private targetFOV: number = 70;
  
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private isDiving: boolean = false;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      this.baseFOV,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.currentDistance = CONFIG.camera.distance;
    this.targetDistance = CONFIG.camera.distance;
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  init(targetPos: THREE.Vector3): void {
    this.targetPosition.copy(targetPos);
    this.currentPosition.copy(targetPos);
    this.yaw = 0;
    this.pitch = 0.3;
    this.updateCamera();
  }

  update(targetPos: THREE.Vector3, isJumping: boolean = false, isDiving: boolean = false): void {
    // ========== CONTROLES DO MOUSE ==========
    // Mouse direita (+X) = yaw AUMENTA = gira para DIREITA
    // Mouse cima (-Y) = pitch DIMINUI = olha para CIMA
    this.yaw += Input.mouseDeltaX;
    this.pitch -= Input.mouseDeltaY; // INVERTIDO para mouse natural
    
    // Limitar pitch (não deixar virar de cabeça pra baixo)
    this.pitch = Math.max(0.1, Math.min(1.4, this.pitch));

    this.isDiving = isDiving;

    // Zoom cinematográfico
    if (isDiving) {
      this.targetDistance = CONFIG.camera.distance + CONFIG.camera.diveZoomOut;
      this.targetFOV = CONFIG.camera.diveFOV;
    } else if (isJumping) {
      this.targetDistance = CONFIG.camera.distance + CONFIG.camera.jumpZoomOut;
      this.targetFOV = this.baseFOV + 5;
    } else {
      this.targetDistance = CONFIG.camera.distance;
      this.targetFOV = this.baseFOV;
    }

    // Interpolar distância e FOV
    const distanceSpeed = CONFIG.camera.jumpZoomSpeed * Time.deltaTime;
    this.currentDistance += (this.targetDistance - this.currentDistance) * distanceSpeed;

    const fovSpeed = 5 * Time.deltaTime;
    this.camera.fov += (this.targetFOV - this.camera.fov) * fovSpeed;
    this.camera.updateProjectionMatrix();

    // Follow suave
    const smoothSpeed = CONFIG.camera.smoothSpeed * Time.deltaTime;
    this.targetPosition.copy(targetPos);
    this.currentPosition.lerp(this.targetPosition, smoothSpeed);

    this.updateCamera();
  }

  /**
   * Direção 3D para onde a câmera aponta (para tiros)
   */
  getAimDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  }

  /**
   * Direção FRENTE horizontal (para onde o player anda com W)
   * Baseado no yaw da câmera
   */
  getForwardDirection(): THREE.Vector3 {
    // Yaw 0 = olhando para +Z, então forward é +Z
    // Quando yaw aumenta (gira direita), forward gira junto
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }

  /**
   * Direção DIREITA (para strafe com D)
   * Perpendicular ao forward, 90° horário
   */
  getRightDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }

  private updateCamera(): void {
    // Câmera orbita ATRÁS do player
    // Pitch controla altura, Yaw controla rotação horizontal
    
    const horizontalDist = this.currentDistance * Math.cos(this.pitch);
    const verticalOffset = this.currentDistance * Math.sin(this.pitch) + CONFIG.camera.height;

    // Câmera fica na direção OPOSTA ao forward (atrás do player)
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * horizontalDist,
      verticalOffset,
      Math.cos(this.yaw) * horizontalDist
    );

    this.camera.position.copy(this.currentPosition).add(offset);
    
    // Olhar para o player
    const lookTarget = this.currentPosition.clone();
    lookTarget.y += CONFIG.player.height * 0.5;
    
    this.camera.lookAt(lookTarget);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
