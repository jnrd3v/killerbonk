import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Enemy } from '../entities/Enemy';
import { XPOrb } from '../entities/XPOrb';
import { Player } from '../entities/Player';
import { Time } from './Time';
import { randomPointInRing } from '../utils/Math';

/**
 * Sistema de spawn de inimigos e orbes
 */
export class SpawnerSystem {
  private scene: THREE.Scene;
  
  enemies: Enemy[] = [];
  xpOrbs: XPOrb[] = [];
  
  private spawnTimer: number = 0;
  private currentSpawnRate: number = CONFIG.enemies.initialSpawnRate;
  
  killCount: number = 0;

  // Callback para som de XP
  onXPCollected?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Atualiza o sistema de spawn
   */
  update(player: Player): void {
    const dt = Time.scaledDeltaTime;
    
    // Timer de spawn
    this.spawnTimer -= dt;
    
    // Contar apenas inimigos vivos
    const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.death.dying).length;
    
    if (this.spawnTimer <= 0 && aliveEnemies < CONFIG.enemies.maxEnemies) {
      this.spawnEnemy(player);
      this.spawnTimer = this.currentSpawnRate;
    }
    
    // Atualizar inimigos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(player);
      
      // Remover mortos completamente (após animação)
      if (enemy.isDead && !enemy.death.dying) {
        this.removeEnemy(i);
      }
    }
    
    // Atualizar orbes de XP
    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      orb.update(player);
      
      if (orb.isCollected) {
        // Dar XP se foi coletado (não expirou)
        if (orb.lifetime > 0) {
          player.addXP(orb.value);
          this.onXPCollected?.(); // Som de coleta
        }
        this.removeXPOrb(i);
      }
    }
  }

  /**
   * Spawna um inimigo ao redor do player
   */
  spawnEnemy(player: Player): void {
    const spawnPos = randomPointInRing(
      player.position,
      CONFIG.enemies.minSpawnDistance,
      CONFIG.enemies.spawnDistance,
      0
    );
    
    const enemy = new Enemy(spawnPos, player.level);
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
  }

  /**
   * Remove um inimigo
   */
  private removeEnemy(index: number): void {
    const enemy = this.enemies[index];
    this.scene.remove(enemy.mesh);
    enemy.dispose();
    this.enemies.splice(index, 1);
  }

  /**
   * Spawna um orbe de XP
   */
  spawnXPOrb(position: THREE.Vector3): void {
    const orb = new XPOrb(position);
    this.xpOrbs.push(orb);
    this.scene.add(orb.mesh);
  }

  /**
   * Remove um orbe de XP
   */
  private removeXPOrb(index: number): void {
    const orb = this.xpOrbs[index];
    this.scene.remove(orb.mesh);
    orb.dispose();
    this.xpOrbs.splice(index, 1);
  }

  /**
   * Chamado quando um inimigo morre (após animação)
   */
  onEnemyKilled(enemy: Enemy): void {
    this.killCount++;
    // Spawnar XP na posição onde morreu
    this.spawnXPOrb(enemy.position.clone());
  }

  /**
   * Atualiza taxa de spawn baseado no level
   */
  updateSpawnRate(level: number): void {
    this.currentSpawnRate = Math.max(
      CONFIG.enemies.minSpawnRate,
      CONFIG.enemies.initialSpawnRate - (level - 1) * CONFIG.enemies.spawnRateDecrease
    );
  }

  /**
   * Limpa todos os inimigos e orbes
   */
  clear(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
      enemy.dispose();
    }
    this.enemies = [];
    
    for (const orb of this.xpOrbs) {
      this.scene.remove(orb.mesh);
      orb.dispose();
    }
    this.xpOrbs = [];
    
    this.killCount = 0;
    this.spawnTimer = 0;
    this.currentSpawnRate = CONFIG.enemies.initialSpawnRate;
  }

  /**
   * Retorna meshes dos inimigos para raycast
   */
  getEnemyMeshes(): THREE.Object3D[] {
    return this.enemies.filter(e => !e.isDead && !e.death.dying).map(e => e.mesh);
  }
}
