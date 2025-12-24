import * as THREE from 'three';
import { CONFIG } from '../Config';
import { Input } from '../systems/Input';
import { Time } from '../systems/Time';
import { CameraRig } from '../systems/CameraRig';

export type WeaponType = 'pistols' | 'sword';

interface DiveState {
  active: boolean;
  direction: THREE.Vector3;
  timer: number;
  phase: 'flying' | 'falling' | 'getup';
  startY: number;
}

/**
 * Player - Third Person estilo Killer Bean / Max Payne
 * - SEMPRE de costas para a câmera
 * - Rotaciona junto com a câmera
 * - Atira na direção da mira
 */
export class Player {
  mesh: THREE.Group;
  
  // Partes do corpo
  private body!: THREE.Group;
  private head!: THREE.Mesh;
  private torso!: THREE.Mesh;
  private hips!: THREE.Mesh;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  
  // Armas
  private pistolLeft!: THREE.Group;
  private pistolRight!: THREE.Group;
  private sword!: THREE.Group;
  
  // Stats
  hp: number;
  maxHP: number;
  xp: number;
  xpToLevel: number;
  level: number;
  
  // Movement
  velocity: THREE.Vector3 = new THREE.Vector3();
  isGrounded: boolean = true;
  isJumping: boolean = false;
  
  // Dive
  dive: DiveState = {
    active: false,
    direction: new THREE.Vector3(),
    timer: 0,
    phase: 'flying',
    startY: 0,
  };
  
  // Combat
  currentWeapon: WeaponType = 'pistols';
  lastFireTime: number = 0;
  lastSlashTime: number = 0;
  isSlashing: boolean = false;
  slashTimer: number = 0;
  
  // Stats modificáveis
  moveSpeed: number;
  pistolDamage: number;
  pistolFireRate: number;
  swordDamage: number;
  swordRange: number;
  pickupRadius: number;

  upgrades: Map<string, number> = new Map();
  private walkCycle: number = 0;
  private isMoving: boolean = false;

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get isDiving(): boolean {
    return this.dive.active;
  }

  constructor() {
    this.mesh = this.createMesh();
    
    this.hp = CONFIG.player.maxHP;
    this.maxHP = CONFIG.player.maxHP;
    this.xp = 0;
    this.xpToLevel = CONFIG.xp.baseXPToLevel;
    this.level = 1;
    
    this.moveSpeed = CONFIG.player.moveSpeed;
    this.pistolDamage = CONFIG.weapons.pistols.damage;
    this.pistolFireRate = CONFIG.weapons.pistols.fireRate;
    this.swordDamage = CONFIG.weapons.sword.damage;
    this.swordRange = CONFIG.weapons.sword.range;
    this.pickupRadius = CONFIG.player.pickupRadius;
  }

  /**
   * Modelo fluido do personagem
   */
  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    this.body = new THREE.Group();
    group.add(this.body);
    
    // Materiais
    const bodyMat = new THREE.MeshStandardMaterial({
      color: CONFIG.visual.playerColor,
      roughness: 0.4,
      metalness: 0.2,
    });
    
    const darkMat = new THREE.MeshStandardMaterial({
      color: CONFIG.visual.playerAccentColor,
      roughness: 0.5,
      metalness: 0.3,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.6,
      metalness: 0,
    });

    // === TORSO ===
    const torsoGeo = new THREE.CapsuleGeometry(0.3, 0.5, 8, 16);
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.y = 1.25;
    this.torso.castShadow = true;
    this.body.add(this.torso);

    // Ombros
    const shoulderGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const leftShoulder = new THREE.Mesh(shoulderGeo, bodyMat);
    leftShoulder.position.set(-0.35, 0.2, 0);
    this.torso.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeo, bodyMat);
    rightShoulder.position.set(0.35, 0.2, 0);
    this.torso.add(rightShoulder);

    // === HIPS ===
    const hipsGeo = new THREE.CapsuleGeometry(0.25, 0.15, 8, 16);
    this.hips = new THREE.Mesh(hipsGeo, darkMat);
    this.hips.position.y = 0.85;
    this.body.add(this.hips);

    // === CABEÇA ===
    const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.85;
    this.head.castShadow = true;
    this.body.add(this.head);

    // Cabelo
    const hairGeo = new THREE.SphereGeometry(0.23, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.02;
    this.head.add(hair);

    // === BRAÇOS ===
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.4, 1.45, 0);
    this.body.add(this.leftArm);

    const upperArmGeo = new THREE.CapsuleGeometry(0.08, 0.25, 6, 12);
    const upperArmL = new THREE.Mesh(upperArmGeo, bodyMat);
    upperArmL.position.y = -0.18;
    this.leftArm.add(upperArmL);

    const forearmGeo = new THREE.CapsuleGeometry(0.06, 0.22, 6, 12);
    const forearmL = new THREE.Mesh(forearmGeo, skinMat);
    forearmL.position.y = -0.45;
    this.leftArm.add(forearmL);

    const handGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.y = -0.62;
    this.leftArm.add(handL);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.4, 1.45, 0);
    this.body.add(this.rightArm);

    const upperArmR = new THREE.Mesh(upperArmGeo.clone(), bodyMat);
    upperArmR.position.y = -0.18;
    this.rightArm.add(upperArmR);

    const forearmR = new THREE.Mesh(forearmGeo.clone(), skinMat);
    forearmR.position.y = -0.45;
    this.rightArm.add(forearmR);

    const handR = new THREE.Mesh(handGeo.clone(), skinMat);
    handR.position.y = -0.62;
    this.rightArm.add(handR);

    // === PERNAS ===
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.15, 0.75, 0);
    this.body.add(this.leftLeg);

    const thighGeo = new THREE.CapsuleGeometry(0.1, 0.28, 6, 12);
    const thighL = new THREE.Mesh(thighGeo, darkMat);
    thighL.position.y = -0.2;
    this.leftLeg.add(thighL);

    const shinGeo = new THREE.CapsuleGeometry(0.08, 0.28, 6, 12);
    const shinL = new THREE.Mesh(shinGeo, darkMat);
    shinL.position.y = -0.55;
    this.leftLeg.add(shinL);

    const footGeo = new THREE.CapsuleGeometry(0.06, 0.12, 4, 8);
    const footL = new THREE.Mesh(footGeo, darkMat);
    footL.position.set(0, -0.78, 0.04);
    footL.rotation.x = Math.PI / 2;
    this.leftLeg.add(footL);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.15, 0.75, 0);
    this.body.add(this.rightLeg);

    const thighR = new THREE.Mesh(thighGeo.clone(), darkMat);
    thighR.position.y = -0.2;
    this.rightLeg.add(thighR);

    const shinR = new THREE.Mesh(shinGeo.clone(), darkMat);
    shinR.position.y = -0.55;
    this.rightLeg.add(shinR);

    const footR = new THREE.Mesh(footGeo.clone(), darkMat);
    footR.position.set(0, -0.78, 0.04);
    footR.rotation.x = Math.PI / 2;
    this.rightLeg.add(footR);

    // === ARMAS ===
    this.createWeapons();

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });

    return group;
  }

  private createWeapons(): void {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.2,
      metalness: 0.9,
    });

    const swordMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.1,
      metalness: 1,
      emissive: 0x00aaff,
      emissiveIntensity: 0.15,
    });

    // === PISTOLAS ===
    this.pistolLeft = new THREE.Group();
    
    const gunBarrel = new THREE.CylinderGeometry(0.02, 0.025, 0.2, 8);
    const barrelL = new THREE.Mesh(gunBarrel, metalMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.z = 0.1;
    this.pistolLeft.add(barrelL);
    
    const gunBody = new THREE.BoxGeometry(0.06, 0.12, 0.08);
    const bodyL = new THREE.Mesh(gunBody, metalMat);
    this.pistolLeft.add(bodyL);
    
    const gunGrip = new THREE.BoxGeometry(0.04, 0.1, 0.05);
    const gripL = new THREE.Mesh(gunGrip, metalMat);
    gripL.position.y = -0.08;
    gripL.rotation.x = 0.2;
    this.pistolLeft.add(gripL);

    this.pistolLeft.position.set(0, -0.55, 0.1);
    this.leftArm.add(this.pistolLeft);

    this.pistolRight = this.pistolLeft.clone();
    this.pistolRight.position.set(0, -0.55, 0.1);
    this.rightArm.add(this.pistolRight);

    // === ESPADA ===
    this.sword = new THREE.Group();
    
    const bladePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.5, 0),
      new THREE.Vector3(0.03, 1.0, 0),
      new THREE.Vector3(0.01, 1.2, 0),
    ]);
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.02, 0);
    bladeShape.lineTo(0.02, 0);
    bladeShape.lineTo(0.015, 0.01);
    bladeShape.lineTo(-0.015, 0.01);
    bladeShape.closePath();
    
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      steps: 20,
      bevelEnabled: false,
      extrudePath: bladePath,
    });
    const blade = new THREE.Mesh(bladeGeo, swordMat);
    blade.rotation.x = -Math.PI / 2;
    this.sword.add(blade);

    const guardGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 16);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.7 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.rotation.x = Math.PI / 2;
    this.sword.add(guard);

    const handleGeo = new THREE.CylinderGeometry(0.025, 0.028, 0.28, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x2d1b0e });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.15;
    this.sword.add(handle);

    const pommelGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, guardMat);
    pommel.position.y = -0.3;
    this.sword.add(pommel);

    this.sword.position.set(0.05, -0.4, 0.05);
    this.sword.rotation.set(0, 0, -Math.PI / 6);
    this.sword.visible = false;
    this.rightArm.add(this.sword);

    this.updateWeaponVisibility();
  }

  private updateWeaponVisibility(): void {
    const showPistols = this.currentWeapon === 'pistols';
    this.pistolLeft.visible = showPistols;
    this.pistolRight.visible = showPistols;
    this.sword.visible = !showPistols;
  }

  /**
   * Update - Third Person clássico
   */
  update(cameraRig: CameraRig): void {
    const dt = Time.scaledDeltaTime;
    
    // Dive
    if (this.dive.active) {
      this.updateDive(dt);
      return;
    }

    // Iniciar dive
    if (Time.isSlowMo && Input.isJumping() && this.isGrounded) {
      this.startDive(cameraRig);
      return;
    }

    // === ROTAÇÃO: Personagem SEMPRE de costas para câmera ===
    // body.rotation.y segue o yaw da câmera (+ PI para ficar de costas)
    this.body.rotation.y = cameraRig.getYaw() + Math.PI;

    // === MOVIMENTO WASD - CORRETO ===
    const input = Input.getMovementVector();
    const forward = cameraRig.getForwardDirection();
    const right = cameraRig.getRightDirection();
    
    this.isMoving = input.x !== 0 || input.z !== 0;
    
    if (this.isMoving) {
      // W (z=-1) = frente, S (z=+1) = trás
      // A (x=-1) = esquerda, D (x=+1) = direita
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forward, -input.z); // W vai pra frente
      moveDir.addScaledVector(right, input.x);    // D vai pra direita
      moveDir.normalize();
      
      let speed = this.moveSpeed;
      if (Input.isRunning()) {
        speed *= CONFIG.player.runMultiplier;
      }
      
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      // Animação de caminhada
      this.walkCycle += dt * (Input.isRunning() ? 12 : 8);
      this.animateWalk();
    } else {
      // Desacelerar
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;
      this.animateIdle(dt);
    }

    // Pulo
    if (Input.isJumping() && this.isGrounded && !Time.isSlowMo) {
      this.velocity.y = CONFIG.player.jumpForce;
      this.isGrounded = false;
      this.isJumping = true;
    }

    // Gravidade
    if (!this.isGrounded) {
      this.velocity.y -= CONFIG.player.gravity * dt;
    }

    // Aplicar movimento
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    // Colisão com chão
    if (this.mesh.position.y <= 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.isJumping = false;
    }

    // Animação de slash
    if (this.isSlashing) {
      this.slashTimer -= dt;
      this.animateSlash();
      if (this.slashTimer <= 0) {
        this.isSlashing = false;
      }
    }
  }

  private startDive(cameraRig: CameraRig): void {
    const forward = cameraRig.getForwardDirection();
    
    this.dive.active = true;
    this.dive.direction.copy(forward);
    this.dive.timer = CONFIG.dive.duration;
    this.dive.phase = 'flying';
    this.dive.startY = this.mesh.position.y;
    this.isGrounded = false;
    this.isJumping = true;
  }

  private updateDive(dt: number): void {
    this.dive.timer -= dt;
    
    const totalDuration = CONFIG.dive.duration;
    const flyTime = totalDuration * 0.5;
    const fallTime = totalDuration * 0.3;
    
    const elapsed = totalDuration - this.dive.timer;

    if (elapsed < flyTime) {
      this.dive.phase = 'flying';
      const flyProgress = elapsed / flyTime;
      
      const speed = CONFIG.dive.speed;
      this.mesh.position.x += this.dive.direction.x * speed * dt;
      this.mesh.position.z += this.dive.direction.z * speed * dt;
      
      const heightCurve = Math.sin(flyProgress * Math.PI);
      this.mesh.position.y = this.dive.startY + heightCurve * CONFIG.dive.height;
      
      // Animação dive
      this.torso.rotation.x = Math.PI / 2 * 0.8;
      this.head.rotation.x = -0.3;
      this.leftArm.rotation.x = Math.PI / 2.5;
      this.rightArm.rotation.x = Math.PI / 2.5;
      this.leftLeg.rotation.x = 0.2;
      this.rightLeg.rotation.x = 0.2;
      
    } else if (elapsed < flyTime + fallTime) {
      this.dive.phase = 'falling';
      const fallProgress = (elapsed - flyTime) / fallTime;
      
      this.mesh.position.y = Math.max(0, CONFIG.dive.height * (1 - fallProgress));
      this.torso.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 * 0.8, Math.PI / 2, fallProgress);
      
    } else {
      this.dive.phase = 'getup';
      const getupTime = totalDuration * 0.2;
      const getupProgress = (elapsed - flyTime - fallTime) / getupTime;
      
      this.mesh.position.y = 0;
      
      this.torso.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, 0, getupProgress);
      this.head.rotation.x = THREE.MathUtils.lerp(-0.3, 0, getupProgress);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(Math.PI / 2.5, 0, getupProgress);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(Math.PI / 2.5, 0, getupProgress);
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(0.2, 0, getupProgress);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(0.2, 0, getupProgress);
    }

    if (this.dive.timer <= 0) {
      this.endDive();
    }
  }

  private endDive(): void {
    this.dive.active = false;
    this.dive.phase = 'flying';
    this.mesh.position.y = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.isJumping = false;

    this.torso.rotation.x = 0;
    this.head.rotation.x = 0;
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
  }

  private animateWalk(): void {
    const swing = Math.sin(this.walkCycle) * 0.5;
    
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    
    if (!this.isSlashing) {
      this.leftArm.rotation.x = -swing * 0.4;
      this.rightArm.rotation.x = swing * 0.4;
    }
    
    this.head.position.y = 1.85 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.02;
  }

  private animateIdle(dt: number): void {
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 8 * dt);
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 8 * dt);
    
    if (!this.isSlashing) {
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 8 * dt);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 8 * dt);
    }
    
    const breathe = Math.sin(performance.now() / 1000) * 0.01;
    this.torso.scale.y = 1 + breathe;
  }

  private animateSlash(): void {
    const progress = 1 - (this.slashTimer / CONFIG.weapons.sword.slashDuration);
    const slashAngle = Math.sin(progress * Math.PI) * Math.PI * 0.9;
    
    this.rightArm.rotation.x = -Math.PI / 4;
    this.rightArm.rotation.y = -slashAngle;
    this.rightArm.rotation.z = -0.2 - slashAngle * 0.3;
    
    this.torso.rotation.y = -slashAngle * 0.15;
  }

  canFire(): boolean {
    const now = performance.now() / 1000;
    return now - this.lastFireTime >= (1 / this.pistolFireRate);
  }

  didFire(): void {
    this.lastFireTime = performance.now() / 1000;
  }

  canSlash(): boolean {
    const now = performance.now() / 1000;
    return now - this.lastSlashTime >= CONFIG.weapons.sword.cooldown && !this.isSlashing;
  }

  didSlash(): void {
    this.lastSlashTime = performance.now() / 1000;
    this.isSlashing = true;
    this.slashTimer = CONFIG.weapons.sword.slashDuration;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  addXP(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpToLevel) {
      this.levelUp();
      return true;
    }
    return false;
  }

  private levelUp(): void {
    this.level++;
    this.xp -= this.xpToLevel;
    this.xpToLevel = Math.floor(
      CONFIG.xp.baseXPToLevel * Math.pow(CONFIG.xp.xpMultiplierPerLevel, this.level - 1)
    );
  }

  switchWeapon(slot: number): void {
    this.currentWeapon = slot === 0 ? 'pistols' : 'sword';
    this.updateWeaponVisibility();
  }

  cycleWeapon(_direction: number): void {
    this.currentWeapon = this.currentWeapon === 'pistols' ? 'sword' : 'pistols';
    this.updateWeaponVisibility();
  }

  applyUpgrade(upgradeType: string): void {
    const current = this.upgrades.get(upgradeType) || 0;
    this.upgrades.set(upgradeType, current + 1);

    switch (upgradeType) {
      case 'pistol_damage': this.pistolDamage += CONFIG.upgrades.pistolDamageIncrease; break;
      case 'pistol_firerate': this.pistolFireRate += CONFIG.upgrades.pistolFireRateIncrease; break;
      case 'sword_damage': this.swordDamage += CONFIG.upgrades.swordDamageIncrease; break;
      case 'sword_range': this.swordRange += CONFIG.upgrades.swordRangeIncrease; break;
      case 'move_speed': this.moveSpeed += CONFIG.upgrades.moveSpeedIncrease; break;
      case 'max_hp':
        this.maxHP += CONFIG.upgrades.maxHPIncrease;
        this.hp += CONFIG.upgrades.maxHPIncrease;
        break;
      case 'pickup_radius': this.pickupRadius += CONFIG.upgrades.pickupRadiusIncrease; break;
    }
  }

  /**
   * Posição da arma para efeitos visuais
   */
  getWeaponPosition(): THREE.Vector3 {
    const pos = this.mesh.position.clone();
    pos.y += 1.4;
    return pos;
  }

  /**
   * Direção para frente do personagem
   */
  getForwardDirection(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.body.rotation.y);
    return forward;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  reset(): void {
    this.mesh.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.hp = CONFIG.player.maxHP;
    this.maxHP = CONFIG.player.maxHP;
    this.xp = 0;
    this.xpToLevel = CONFIG.xp.baseXPToLevel;
    this.level = 1;
    this.currentWeapon = 'pistols';
    this.isGrounded = true;
    this.isJumping = false;
    this.dive.active = false;
    this.isSlashing = false;
    this.upgrades.clear();
    this.updateWeaponVisibility();
    
    this.moveSpeed = CONFIG.player.moveSpeed;
    this.pistolDamage = CONFIG.weapons.pistols.damage;
    this.pistolFireRate = CONFIG.weapons.pistols.fireRate;
    this.swordDamage = CONFIG.weapons.sword.damage;
    this.swordRange = CONFIG.weapons.sword.range;
    this.pickupRadius = CONFIG.player.pickupRadius;

    this.body.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.torso.scale.set(1, 1, 1);
    this.head.rotation.set(0, 0, 0);
    this.head.position.y = 1.85;
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftLeg.rotation.set(0, 0, 0);
    this.rightLeg.rotation.set(0, 0, 0);
  }
}
