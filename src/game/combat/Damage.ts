import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { CONFIG } from '../Config';

/**
 * Sistema de dano e morte
 */
export class DamageSystem {
  private scene: THREE.Scene;
  
  // Callbacks
  onEnemyDeath?: (enemy: Enemy, position: THREE.Vector3) => void;
  onPlayerDeath?: () => void;
  onDamageNumber?: (position: THREE.Vector3, damage: number, isPlayer: boolean) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Aplica dano a um inimigo
   * @param sliced - Se foi atingido pela espada (animação de corte)
   * @param sliceDir - Direção do corte
   * @returns true se o inimigo morreu
   */
  damageEnemy(
    enemy: Enemy, 
    damage: number, 
    sliced: boolean = false, 
    sliceDir?: THREE.Vector3
  ): boolean {
    const killed = enemy.takeDamage(damage, sliced, sliceDir);
    
    // Notificar dano
    const worldPos = enemy.position.clone();
    worldPos.y += CONFIG.enemies.height + 0.3;
    this.onDamageNumber?.(worldPos, damage, false);
    
    if (killed) {
      const deathPos = enemy.position.clone();
      // Delay pequeno para animação de morte começar
      setTimeout(() => {
        this.onEnemyDeath?.(enemy, deathPos);
      }, CONFIG.enemies.deathAnimDuration * 1000 * 0.9);
      return true;
    }
    
    return false;
  }

  /**
   * Aplica dano ao jogador
   * @returns true se o jogador morreu
   */
  damagePlayer(player: Player, damage: number): boolean {
    player.takeDamage(damage);
    
    // Notificar dano
    const worldPos = player.position.clone();
    worldPos.y += CONFIG.player.height + 0.5;
    this.onDamageNumber?.(worldPos, damage, true);
    
    if (!player.isAlive()) {
      this.onPlayerDeath?.();
      return true;
    }
    
    return false;
  }

  /**
   * Processa colisão de inimigos com player
   */
  processEnemyCollisions(player: Player, enemies: Enemy[]): void {
    if (!player.isAlive()) return;

    for (const enemy of enemies) {
      if (enemy.isDead || enemy.death.dying) continue;
      
      if (enemy.isCollidingWith(player) && enemy.canDealContactDamage()) {
        this.damagePlayer(player, enemy.damage);
        enemy.didDealContactDamage();
        
        // Empurrar inimigo para trás
        const pushDir = new THREE.Vector3().subVectors(
          enemy.position,
          player.position
        );
        pushDir.y = 0;
        pushDir.normalize();
        enemy.applyKnockback(pushDir, 3);
      }
    }
  }
}
