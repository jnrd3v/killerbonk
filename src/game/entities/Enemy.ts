import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Time } from '../systems/Time';
import { Player } from './Player';

/**
 * Estado de morte do inimigo
 */
interface DeathState {
  dying: boolean;
  timer: number;
  sliced: boolean; // Se foi cortado pela espada
  sliceDirection: THREE.Vector3;
  topHalf?: THREE.Group;
  bottomHalf?: THREE.Group;
}

/**
 * Entidade inimigo - Modelo humanoide estilizado
 */
export class Enemy {
  mesh: THREE.Group;
  
  // Partes do corpo
  private head!: THREE.Mesh;
  private torso!: THREE.Mesh;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  
  hp: number;
  maxHP: number;
  speed: number;
  damage: number;
  
  velocity: THREE.Vector3 = new THREE.Vector3();
  lastDamageTime: number = 0;
  isDead: boolean = false;

  // Estado de morte
  death: DeathState = {
    dying: false,
    timer: 0,
    sliced: false,
    sliceDirection: new THREE.Vector3(),
  };

  // Animação
  private walkCycle: number = 0;
  private baseY: number = 0;

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  constructor(position: THREE.Vector3, level: number = 1) {
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.mesh.position.y = 0;
    this.baseY = 0;
    
    // Stats baseados no level
    const scaling = 1 + (level - 1) * 0.12;
    this.maxHP = Math.floor(CONFIG.enemies.baseHP * scaling);
    this.hp = this.maxHP;
    this.speed = CONFIG.enemies.baseSpeed * (1 + (level - 1) * 0.05);
    this.damage = Math.floor(CONFIG.enemies.baseDamage * scaling);

    // Tag para identificação
    this.mesh.userData.type = 'enemy';
    this.mesh.userData.entity = this;

    // Variação aleatória de ciclo para não sincronizar animações
    this.walkCycle = Math.random() * Math.PI * 2;
  }

  /**
   * Cria o mesh do inimigo humanoide
   */
  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    
    // Materiais
    const bodyMat = new THREE.MeshStandardMaterial({
      color: CONFIG.visual.enemyColor,
      roughness: 0.5,
      metalness: 0.2,
    });
    
    const accentMat = new THREE.MeshStandardMaterial({
      color: CONFIG.visual.enemyAccentColor,
      roughness: 0.6,
      metalness: 0.3,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x90ee90, // Verde claro para pele de zumbi/monstro
      roughness: 0.8,
      metalness: 0,
    });

    // Escala um pouco menor que o player
    const scale = 0.9;

    // === TORSO ===
    const torsoGeo = new THREE.BoxGeometry(0.6 * scale, 0.8 * scale, 0.35 * scale);
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.y = 1.2 * scale;
    this.torso.castShadow = true;
    group.add(this.torso);

    // === CABEÇA ===
    const headGeo = new THREE.BoxGeometry(0.4 * scale, 0.45 * scale, 0.35 * scale);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.85 * scale;
    this.head.castShadow = true;
    group.add(this.head);

    // Olhos brilhantes malignos
    const eyeGeo = new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.05 * scale);
    const eyeMat = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08 * scale, 0.05 * scale, 0.18 * scale);
    this.head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08 * scale, 0.05 * scale, 0.18 * scale);
    this.head.add(rightEye);

    // === BRAÇOS ===
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.4 * scale, 1.4 * scale, 0);
    group.add(this.leftArm);

    const armGeo = new THREE.BoxGeometry(0.18 * scale, 0.6 * scale, 0.18 * scale);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.y = -0.35 * scale;
    this.leftArm.add(armL);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.4 * scale, 1.4 * scale, 0);
    group.add(this.rightArm);

    const armR = new THREE.Mesh(armGeo.clone(), skinMat);
    armR.position.y = -0.35 * scale;
    this.rightArm.add(armR);

    // === PERNAS ===
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.15 * scale, 0.8 * scale, 0);
    group.add(this.leftLeg);

    const legGeo = new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale);
    const legL = new THREE.Mesh(legGeo, accentMat);
    legL.position.y = -0.4 * scale;
    this.leftLeg.add(legL);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.15 * scale, 0.8 * scale, 0);
    group.add(this.rightLeg);

    const legR = new THREE.Mesh(legGeo.clone(), accentMat);
    legR.position.y = -0.4 * scale;
    this.rightLeg.add(legR);

    // Sombras
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });

    return group;
  }

  /**
   * Atualiza o inimigo
   */
  update(player: Player): void {
    // Animação de morte
    if (this.death.dying) {
      this.updateDeath();
      return;
    }

    if (this.isDead) return;
    
    const dt = Time.scaledDeltaTime;
    
    // Direção para o player
    const toPlayer = new THREE.Vector3().subVectors(
      player.position,
      this.mesh.position
    );
    toPlayer.y = 0;
    
    const dist = toPlayer.length();
    
    if (dist > 0.8) {
      toPlayer.normalize();
      
      this.velocity.x = toPlayer.x * this.speed;
      this.velocity.z = toPlayer.z * this.speed;

      // Animação de caminhada
      this.walkCycle += dt * 8;
      const swing = Math.sin(this.walkCycle) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.6;
      this.rightArm.rotation.x = swing * 0.6;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
      
      // Animação de ataque (braços para frente)
      this.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.rotation.x, -Math.PI / 3, 8 * dt
      );
      this.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.rotation.x, -Math.PI / 3, 8 * dt
      );
    }
    
    // Aplicar movimento
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.z += this.velocity.z * dt;
    
    // Rotação para olhar o player
    if (dist > 0.1) {
      const angle = Math.atan2(toPlayer.x, toPlayer.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        angle,
        8 * dt
      );
    }
    
    // Bobbing sutil
    const time = performance.now() / 1000;
    this.mesh.position.y = this.baseY + Math.sin(time * 3 + this.walkCycle) * 0.03;
    
    // Visual de dano (flash)
    this.updateDamageFlash(time);
  }

  /**
   * Flash de dano visual
   */
  private updateDamageFlash(time: number): void {
    const flashDuration = 0.15;
    const timeSinceDamage = time - this.lastDamageTime;
    
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (timeSinceDamage < flashDuration) {
          child.material.emissive.setHex(0xff0000);
          child.material.emissiveIntensity = 0.8 * (1 - timeSinceDamage / flashDuration);
        } else {
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }

  /**
   * Atualiza animação de morte
   */
  private updateDeath(): void {
    const dt = Time.scaledDeltaTime;
    this.death.timer -= dt;
    
    const progress = 1 - (this.death.timer / CONFIG.enemies.deathAnimDuration);

    if (this.death.sliced && this.death.topHalf && this.death.bottomHalf) {
      // Animação de corte - partes se separam
      const separationSpeed = 3;
      const fallSpeed = 5;
      
      // Parte superior voa para cima e para o lado
      this.death.topHalf.position.y += (1 - progress) * separationSpeed * dt;
      this.death.topHalf.position.addScaledVector(this.death.sliceDirection, separationSpeed * dt);
      this.death.topHalf.rotation.x += dt * 3;
      this.death.topHalf.rotation.z += dt * 2;
      
      // Parte inferior cai
      this.death.bottomHalf.position.y -= fallSpeed * dt * progress;
      
      // Fade out
      const fadeAlpha = 1 - progress;
      this.death.topHalf.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          (child.material as THREE.MeshStandardMaterial).opacity = fadeAlpha;
          child.material.transparent = true;
        }
      });
      this.death.bottomHalf.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          (child.material as THREE.MeshStandardMaterial).opacity = fadeAlpha;
          child.material.transparent = true;
        }
      });
    } else {
      // Morte normal - cai e desaparece
      this.mesh.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2, progress);
      this.mesh.position.y = THREE.MathUtils.lerp(0, -0.5, progress);
      
      // Fade out
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          (child.material as THREE.MeshStandardMaterial).opacity = 1 - progress;
          child.material.transparent = true;
        }
      });
    }

    // Fim da animação
    if (this.death.timer <= 0) {
      this.isDead = true;
      this.death.dying = false;
    }
  }

  /**
   * Recebe dano
   * @param sliced - Se foi atingido pela espada (animação de corte)
   * @param sliceDir - Direção do corte
   */
  takeDamage(amount: number, sliced: boolean = false, sliceDir?: THREE.Vector3): boolean {
    if (this.isDead || this.death.dying) return false;
    
    this.hp -= amount;
    this.lastDamageTime = performance.now() / 1000;
    
    if (this.hp <= 0) {
      this.startDeath(sliced, sliceDir);
      return true;
    }
    
    return false;
  }

  /**
   * Inicia animação de morte
   */
  private startDeath(sliced: boolean, sliceDir?: THREE.Vector3): void {
    this.death.dying = true;
    this.death.timer = CONFIG.enemies.deathAnimDuration;
    this.death.sliced = sliced;
    
    if (sliced && sliceDir) {
      this.death.sliceDirection.copy(sliceDir).normalize();
      this.createSlicedHalves();
    }
  }

  /**
   * Cria as metades do inimigo cortado
   */
  private createSlicedHalves(): void {
    // Esconder mesh original
    this.mesh.visible = false;

    // Criar grupo para parte superior (cabeça + torso superior + braços)
    this.death.topHalf = new THREE.Group();
    this.death.topHalf.position.copy(this.mesh.position);
    this.death.topHalf.rotation.copy(this.mesh.rotation);
    
    // Material com sangue/energia
    const cutMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Verde para "sangue" alienígena
      emissive: 0x00ff00,
    });

    // Clone da cabeça
    const headClone = this.head.clone();
    headClone.position.y -= 0.4;
    this.death.topHalf.add(headClone);

    // Torso superior cortado
    const topTorsoGeo = new THREE.BoxGeometry(0.54, 0.4, 0.32);
    const topTorso = new THREE.Mesh(topTorsoGeo, (this.torso.material as THREE.Material).clone());
    topTorso.position.y = 0.2;
    this.death.topHalf.add(topTorso);

    // Superfície de corte
    const cutSurfaceGeo = new THREE.PlaneGeometry(0.54, 0.32);
    const cutSurfaceTop = new THREE.Mesh(cutSurfaceGeo, cutMat);
    cutSurfaceTop.rotation.x = Math.PI / 2;
    cutSurfaceTop.position.y = 0;
    this.death.topHalf.add(cutSurfaceTop);

    // Braços
    const leftArmClone = this.leftArm.clone();
    leftArmClone.position.y -= 0.5;
    this.death.topHalf.add(leftArmClone);
    
    const rightArmClone = this.rightArm.clone();
    rightArmClone.position.y -= 0.5;
    this.death.topHalf.add(rightArmClone);

    // Criar grupo para parte inferior (pernas + torso inferior)
    this.death.bottomHalf = new THREE.Group();
    this.death.bottomHalf.position.copy(this.mesh.position);
    this.death.bottomHalf.rotation.copy(this.mesh.rotation);

    // Torso inferior cortado
    const bottomTorsoGeo = new THREE.BoxGeometry(0.54, 0.4, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({
      color: CONFIG.visual.enemyAccentColor,
      roughness: 0.6,
      metalness: 0.3,
    });
    const bottomTorso = new THREE.Mesh(bottomTorsoGeo, accentMat);
    bottomTorso.position.y = 1.0;
    this.death.bottomHalf.add(bottomTorso);

    // Superfície de corte inferior
    const cutSurfaceBottom = new THREE.Mesh(cutSurfaceGeo.clone(), cutMat);
    cutSurfaceBottom.rotation.x = -Math.PI / 2;
    cutSurfaceBottom.position.y = 1.2;
    this.death.bottomHalf.add(cutSurfaceBottom);

    // Pernas
    const leftLegClone = this.leftLeg.clone();
    this.death.bottomHalf.add(leftLegClone);
    
    const rightLegClone = this.rightLeg.clone();
    this.death.bottomHalf.add(rightLegClone);

    // Adicionar à cena via parent do mesh original
    if (this.mesh.parent) {
      this.mesh.parent.add(this.death.topHalf);
      this.mesh.parent.add(this.death.bottomHalf);
    }
  }

  /**
   * Aplica knockback
   */
  applyKnockback(direction: THREE.Vector3, force: number): void {
    const knockback = direction.clone().normalize().multiplyScalar(force * 0.3);
    this.mesh.position.add(knockback);
  }

  /**
   * Verifica se pode causar dano por contato
   */
  canDealContactDamage(): boolean {
    const now = performance.now() / 1000;
    return now - this.lastDamageTime >= CONFIG.enemies.touchDamageCooldown;
  }

  didDealContactDamage(): void {
    // Usando um timer separado para dano de contato
  }

  /**
   * Verifica colisão com player
   */
  isCollidingWith(player: Player): boolean {
    const dist = this.mesh.position.distanceTo(player.position);
    const minDist = CONFIG.enemies.size + CONFIG.player.radius;
    return dist < minDist * 1.5;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    if (this.death.topHalf) {
      this.death.topHalf.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.death.topHalf.parent?.remove(this.death.topHalf);
    }

    if (this.death.bottomHalf) {
      this.death.bottomHalf.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.death.bottomHalf.parent?.remove(this.death.bottomHalf);
    }
  }
}
