import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { CameraRig } from '../systems/CameraRig';
import { isInCone } from '../utils/Math';
import { Time } from '../systems/Time';
import { Audio } from '../systems/Audio';

/**
 * Resultado de um ataque
 */
export interface AttackResult {
  hits: Enemy[];
  damages: number[];
  hitPositions: THREE.Vector3[];
  sliced?: boolean;
  sliceDirection?: THREE.Vector3;
}

/**
 * Sistema de armas com efeitos visuais e sonoros
 */
export class WeaponSystem {
  private scene: THREE.Scene;

  // Efeitos visuais
  private tracers: THREE.Line[] = [];
  private muzzleFlashes: THREE.Mesh[] = [];
  private slashEffects: THREE.Group[] = [];

  // Materiais
  private tracerMaterial: THREE.LineBasicMaterial;
  private muzzleFlashMaterial: THREE.MeshBasicMaterial;
  private slashMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    });

    this.muzzleFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.95,
    });

    this.slashMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.visual.slashColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Dispara as pistolas
   */
  firePistols(
    player: Player,
    cameraRig: CameraRig,
    enemies: Enemy[]
  ): AttackResult {
    const result: AttackResult = {
      hits: [],
      damages: [],
      hitPositions: [],
      sliced: false,
    };

    // Som do tiro
    Audio.playGunshot();

    // Origem do tiro na câmera
    const origin = cameraRig.camera.position.clone();
    
    // Direção do tiro - para onde a MIRA aponta
    const direction = cameraRig.getAimDirection();
    
    // Spread
    const spread = CONFIG.weapons.pistols.spread;
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    // Raycast
    const raycaster = new THREE.Raycaster(origin, direction, 0, CONFIG.weapons.pistols.range);
    
    // Coletar meshes dos inimigos
    const enemyMeshes: THREE.Object3D[] = [];
    enemies.forEach(e => {
      if (!e.isDead && !e.death.dying) {
        e.mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.userData.entity = e;
            enemyMeshes.push(child);
          }
        });
      }
    });
    
    const hits = raycaster.intersectObjects(enemyMeshes);
    
    if (hits.length > 0) {
      const hit = hits[0];
      const enemy = hit.object.userData.entity as Enemy;
      
      if (enemy && !enemy.isDead) {
        const damage = player.pistolDamage;
        result.hits.push(enemy);
        result.damages.push(damage);
        result.hitPositions.push(hit.point.clone());
        
        // Knockback
        const knockbackDir = direction.clone();
        knockbackDir.y = 0;
        enemy.applyKnockback(knockbackDir, CONFIG.weapons.pistols.knockback);
      }
    }

    // Efeitos visuais
    const weaponPos = player.getWeaponPosition();
    const endPos = hits.length > 0 
      ? hits[0].point 
      : origin.clone().addScaledVector(direction, CONFIG.weapons.pistols.range);

    // Dois muzzle flashes alternados para pistolas duplas
    const right = cameraRig.getRightDirection();
    const gunOffset = Math.random() > 0.5 ? 0.3 : -0.3;
    const flashPos = weaponPos.clone().addScaledVector(right, gunOffset);

    this.createMuzzleFlash(flashPos);
    this.createTracer(weaponPos, endPos);

    // Impacto
    if (hits.length > 0) {
      this.createImpactSparks(hits[0].point);
    }

    return result;
  }

  /**
   * Ataque de espada - CORRIGIDO: mira para FRENTE (direção do player)
   */
  slash(player: Player, _cameraRig: CameraRig, enemies: Enemy[]): AttackResult {
    const result: AttackResult = {
      hits: [],
      damages: [],
      hitPositions: [],
      sliced: true,
    };

    // Som do slash
    Audio.playSwordSlash();

    const origin = player.position.clone();
    origin.y += CONFIG.player.height * 0.5;
    
    // CORRIGIDO: Usar direção do PLAYER (que já está virado para câmera)
    const direction = player.getForwardDirection();
    direction.y = 0;
    direction.normalize();
    
    result.sliceDirection = direction.clone();

    // Verificar inimigos no cone à frente do player
    for (const enemy of enemies) {
      if (enemy.isDead || enemy.death.dying) continue;

      const enemyPos = enemy.position.clone();
      enemyPos.y += CONFIG.enemies.height * 0.5;
      
      if (isInCone(origin, direction, enemyPos, CONFIG.weapons.sword.coneAngle / 2, player.swordRange)) {
        const damage = player.swordDamage;
        result.hits.push(enemy);
        result.damages.push(damage);
        result.hitPositions.push(enemyPos.clone());
        
        // Knockback
        const knockbackDir = new THREE.Vector3().subVectors(enemy.position, player.position);
        knockbackDir.y = 0;
        knockbackDir.normalize();
        enemy.applyKnockback(knockbackDir, CONFIG.weapons.sword.knockback);
      }
    }

    // Efeito visual do slash - à frente do player
    this.createSlashEffect(origin, direction, player.swordRange);

    return result;
  }

  /**
   * Cria muzzle flash
   */
  private createMuzzleFlash(position: THREE.Vector3): void {
    const group = new THREE.Group();
    
    const flashGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const flash = new THREE.Mesh(flashGeo, this.muzzleFlashMaterial.clone());
    group.add(flash);
    
    const rayGeo = new THREE.ConeGeometry(0.05, 0.3, 4);
    const rayMat = this.muzzleFlashMaterial.clone();
    
    for (let i = 0; i < 4; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.rotation.z = Math.PI;
      ray.rotation.y = (i / 4) * Math.PI * 2;
      ray.position.set(
        Math.cos(ray.rotation.y) * 0.1,
        0,
        Math.sin(ray.rotation.y) * 0.1
      );
      group.add(ray);
    }
    
    group.position.copy(position);
    this.scene.add(group);
    this.muzzleFlashes.push(group as any);

    let scale = 1;
    const animate = () => {
      scale *= 0.8;
      group.scale.setScalar(scale);
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).opacity *= 0.85;
        }
      });
      
      if (scale > 0.1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      }
    };
    setTimeout(animate, 16);
  }

  /**
   * Cria tracer
   */
  private createTracer(start: THREE.Vector3, end: THREE.Vector3): void {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
      color: 0xffff44,
      transparent: true,
      opacity: 1,
    });
    
    const tracer = new THREE.Line(geometry, material);
    this.scene.add(tracer);
    this.tracers.push(tracer);

    let opacity = 1;
    const animate = () => {
      opacity -= 0.15;
      material.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(tracer);
        tracer.geometry.dispose();
        material.dispose();
        const idx = this.tracers.indexOf(tracer);
        if (idx >= 0) this.tracers.splice(idx, 1);
      }
    };
    animate();
  }

  /**
   * Cria faíscas de impacto
   */
  private createImpactSparks(position: THREE.Vector3): void {
    const sparkCount = 8;
    const sparks: THREE.Mesh[] = [];
    
    const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.15);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
    });
    
    for (let i = 0; i < sparkCount; i++) {
      const spark = new THREE.Mesh(sparkGeo.clone(), sparkMat.clone());
      spark.position.copy(position);
      
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      spark.userData.velocity = dir.multiplyScalar(5 + Math.random() * 5);
      spark.userData.life = 0.3;
      
      sparks.push(spark);
      this.scene.add(spark);
    }
    
    const animate = () => {
      let anyAlive = false;
      
      sparks.forEach(spark => {
        if (spark.userData.life > 0) {
          anyAlive = true;
          const dt = Time.deltaTime;
          
          spark.position.addScaledVector(spark.userData.velocity, dt);
          spark.userData.velocity.y -= 20 * dt;
          spark.userData.life -= dt;
          
          (spark.material as THREE.MeshBasicMaterial).opacity = spark.userData.life / 0.3;
          spark.scale.setScalar(spark.userData.life / 0.3);
        }
      });
      
      if (anyAlive) {
        requestAnimationFrame(animate);
      } else {
        sparks.forEach(spark => {
          this.scene.remove(spark);
          spark.geometry.dispose();
          (spark.material as THREE.Material).dispose();
        });
      }
    };
    animate();
  }

  /**
   * Cria efeito de slash - CORRIGIDO
   */
  private createSlashEffect(origin: THREE.Vector3, direction: THREE.Vector3, range: number): void {
    const group = new THREE.Group();
    
    // Arco de slash
    const arcShape = new THREE.Shape();
    const arcRadius = range;
    const arcAngle = CONFIG.weapons.sword.coneAngle;
    
    arcShape.moveTo(0, 0);
    arcShape.absarc(0, 0, arcRadius, -arcAngle / 2, arcAngle / 2, false);
    arcShape.lineTo(0, 0);
    
    const arcGeo = new THREE.ShapeGeometry(arcShape);
    const slashMat = new THREE.MeshBasicMaterial({
      color: CONFIG.visual.swordGlowColor,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    
    const arc = new THREE.Mesh(arcGeo, slashMat);
    arc.rotation.x = -Math.PI / 2;
    group.add(arc);
    
    // Linha de corte
    const lineGeo = new THREE.BufferGeometry();
    const linePoints = [];
    const segments = 20;
    
    for (let i = 0; i <= segments; i++) {
      const angle = -arcAngle / 2 + (arcAngle / segments) * i;
      linePoints.push(new THREE.Vector3(
        Math.sin(angle) * arcRadius,
        0,
        Math.cos(angle) * arcRadius
      ));
    }
    
    lineGeo.setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);
    
    // Posicionar
    group.position.copy(origin);
    group.position.y = origin.y;
    
    // CORRIGIDO: Rotacionar para direção correta
    const angle = Math.atan2(direction.x, direction.z);
    group.rotation.y = angle;
    
    this.scene.add(group);
    this.slashEffects.push(group);
    
    // Animação
    let progress = 0;
    const animate = () => {
      progress += Time.deltaTime * 5;
      
      if (progress < 1) {
        const scale = 0.3 + progress * 0.7;
        arc.scale.set(scale, scale, 1);
        slashMat.opacity = 0.7 * (1 - progress);
        lineMat.opacity = 1 - progress;
        
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        arcGeo.dispose();
        slashMat.dispose();
        lineGeo.dispose();
        lineMat.dispose();
        
        const idx = this.slashEffects.indexOf(group);
        if (idx >= 0) this.slashEffects.splice(idx, 1);
      }
    };
    animate();
  }

  dispose(): void {
    this.tracerMaterial.dispose();
    this.muzzleFlashMaterial.dispose();
    this.slashMaterial.dispose();
  }
}
