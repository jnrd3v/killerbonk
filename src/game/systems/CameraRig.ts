import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Input } from './Input';
import { Time } from './Time';

/**
 * Sistema de câmera third-person estilo Killer Bean / Max Payne
 * - Câmera SEMPRE atrás do personagem
 * - Personagem sempre olhando para frente (de costas para câmera)
 * - Mouse controla câmera, personagem segue
 */
export class CameraRig {
  camera: THREE.PerspectiveCamera;
  
  private yaw: number = 0; // Rotação horizontal
  private pitch: number = 0.2; // Levemente olhando para baixo
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
    this.pitch = 0.2;
    this.updateCamera();
  }

  update(targetPos: THREE.Vector3, isJumping: boolean = false, isDiving: boolean = false): void {
    // Mouse controla a câmera
    this.yaw += Input.mouseDeltaX;
    this.pitch += Input.mouseDeltaY;
    
    // Limitar pitch
    this.pitch = Math.max(-0.8, Math.min(1.2, this.pitch));

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
   * Direção horizontal para frente (para movimento do player)
   */
  getForwardDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.sin(this.yaw),
      0,
      Math.cos(this.yaw)
    ).normalize();
  }

  /**
   * Direção para direita (perpendicular ao forward)
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
    // Câmera orbita ao redor do player
    // Pitch controla altura, yaw controla rotação horizontal
    const horizontalDist = this.currentDistance * Math.cos(this.pitch);
    const verticalOffset = this.currentDistance * Math.sin(this.pitch) + CONFIG.camera.height;

    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * horizontalDist,
      verticalOffset,
      -Math.cos(this.yaw) * horizontalDist
    );

    this.camera.position.copy(this.currentPosition).add(offset);
    
    // Olhar para o player (na altura do peito)
    const lookTarget = this.currentPosition.clone();
    lookTarget.y += CONFIG.player.height * 0.5;
    
    this.camera.lookAt(lookTarget);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
