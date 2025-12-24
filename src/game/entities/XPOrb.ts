import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Time } from '../systems/Time';
import { Player } from './Player';

/**
 * Orbe de XP dropado por inimigos
 */
export class XPOrb {
  mesh: THREE.Mesh;
  
  value: number;
  lifetime: number;
  isCollected: boolean = false;
  isBeingAttracted: boolean = false;

  // Geometria e material compartilhados
  static sharedGeometry: THREE.SphereGeometry;
  static sharedMaterial: THREE.MeshStandardMaterial;

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  constructor(position: THREE.Vector3, value: number = CONFIG.xp.orbValue) {
    // Criar geometria/material compartilhados
    if (!XPOrb.sharedGeometry) {
      XPOrb.sharedGeometry = new THREE.SphereGeometry(CONFIG.xp.orbSize, 8, 8);
    }
    if (!XPOrb.sharedMaterial) {
      XPOrb.sharedMaterial = new THREE.MeshStandardMaterial({
        color: CONFIG.visual.xpOrbColor,
        emissive: CONFIG.visual.xpOrbColor,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });
    }

    this.mesh = new THREE.Mesh(XPOrb.sharedGeometry, XPOrb.sharedMaterial);
    this.mesh.position.copy(position);
    this.mesh.position.y = CONFIG.xp.orbSize + 0.1;
    
    this.value = value;
    this.lifetime = CONFIG.xp.orbLifetime;

    // Tag
    this.mesh.userData.type = 'xpOrb';
    this.mesh.userData.entity = this;
  }

  /**
   * Atualiza o orbe
   */
  update(player: Player): void {
    if (this.isCollected) return;
    
    const dt = Time.scaledDeltaTime;
    
    // Reduzir lifetime
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isCollected = true;
      return;
    }

    // Verificar distância do player
    const dist = this.mesh.position.distanceTo(player.position);
    
    if (dist < player.pickupRadius) {
      this.isBeingAttracted = true;
    }
    
    // Se sendo atraído, mover em direção ao player
    if (this.isBeingAttracted) {
      const toPlayer = new THREE.Vector3().subVectors(
        player.position,
        this.mesh.position
      );
      toPlayer.normalize();
      
      const moveSpeed = CONFIG.xp.orbSpeed * dt;
      this.mesh.position.addScaledVector(toPlayer, moveSpeed);
      
      // Coletar se próximo o suficiente
      if (dist < 0.5) {
        this.isCollected = true;
      }
    }
    
    // Animação flutuante
    const time = performance.now() / 1000;
    this.mesh.position.y = CONFIG.xp.orbSize + 0.1 + Math.sin(time * 3) * 0.15;
    
    // Rotação
    this.mesh.rotation.y += dt * 2;
    
    // Fade out quando lifetime baixo
    if (this.lifetime < 5) {
      const alpha = this.lifetime / 5;
      this.mesh.visible = Math.sin(this.lifetime * 10) > 0; // Piscar
    }
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    // Mesh usa material compartilhado, não precisa dispor
  }
}

