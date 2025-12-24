import * as THREE from 'three';
import { CONFIG } from './Config';
import { Time } from './systems/Time';
import { Input } from './systems/Input';
import { CameraRig } from './systems/CameraRig';
import { SpawnerSystem } from './systems/Spawner';
import { UISystem } from './systems/UI';
import { Player } from './entities/Player';
import { WeaponSystem } from './combat/Weapons';
import { DamageSystem } from './combat/Damage';
import { Audio } from './systems/Audio';
import { UpgradeInfo } from './Config';

/**
 * Classe principal do jogo - Killer Bean Survivors
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  
  private cameraRig: CameraRig;
  private spawner: SpawnerSystem;
  private ui: UISystem;
  private weapons: WeaponSystem;
  private damage: DamageSystem;
  
  private player: Player;
  
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastSlowMoState: boolean = false;
  private wasDiving: boolean = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    
    const container = document.getElementById('game-container')!;
    container.insertBefore(this.renderer.domElement, container.firstChild);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a3040);
    this.scene.fog = new THREE.FogExp2(0x2a3040, 0.008);

    this.cameraRig = new CameraRig();

    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.spawner = new SpawnerSystem(this.scene);
    this.ui = new UISystem();
    this.weapons = new WeaponSystem(this.scene);
    this.damage = new DamageSystem(this.scene);

    this.setupScene();
    this.setupInput();
    this.setupCallbacks();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupScene(): void {
    const groundSize = CONFIG.visual.groundSize;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
    
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const ctx = groundCanvas.getContext('2d')!;
    
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 2;
    const gridSize = 32;
    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    
    const imageData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    
    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(groundSize / 10, groundSize / 10);
    
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const ringGeo = new THREE.RingGeometry(15, 15.3, 64);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x5555aa,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.scene.add(ring);

    const centerGeo = new THREE.CircleGeometry(3, 32);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x4a4a6a });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.02;
    this.scene.add(center);

    // Iluminação
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
    fill.position.set(-20, 30, -20);
    this.scene.add(fill);

    const fill2 = new THREE.DirectionalLight(0xffaa88, 0.4);
    fill2.position.set(20, 20, -30);
    this.scene.add(fill2);

    const playerLight = new THREE.PointLight(0xffffff, 0.4, 20);
    playerLight.position.set(0, 3, 0);
    this.player.mesh.add(playerLight);

    const hemi = new THREE.HemisphereLight(0xaaaaff, 0x444444, 0.5);
    this.scene.add(hemi);

    this.cameraRig.init(this.player.position);
  }

  private setupInput(): void {
    Input.init(this.renderer.domElement);

    // Quando ganha pointer lock = iniciar/continuar
    Input.onPointerLock = () => {
      Audio.init();
      Audio.resume();
      
      if (!this.isRunning) {
        this.start();
      } else {
        // Continuar jogo pausado
        this.isPaused = false;
        Time.resume();
        this.ui.hidePauseScreen();
      }
    };

    // Quando perde pointer lock (ESC) = PAUSAR (não travar!)
    Input.onPointerUnlock = () => {
      if (this.isRunning && !this.isPaused) {
        this.pauseGame();
      }
    };

    Input.onWeaponSwitch = (slot) => {
      this.player.switchWeapon(slot);
    };

    Input.onReset = () => {
      this.reset();
    };
  }

  private setupCallbacks(): void {
    this.ui.onGameStart = () => {
      Audio.init();
    };

    this.ui.onUpgradeSelected = (upgrade: UpgradeInfo) => {
      this.player.applyUpgrade(upgrade.type);
      this.spawner.updateSpawnRate(this.player.level);
      Audio.playLevelUp();
      Time.resume();
      this.isPaused = false;
    };

    this.damage.onEnemyDeath = (enemy, _position) => {
      this.spawner.onEnemyKilled(enemy);
      Audio.playEnemyDeath();
    };

    this.damage.onPlayerDeath = () => {
      this.gameOver();
    };

    this.damage.onDamageNumber = (worldPos, damage, isPlayer) => {
      const screenPos = this.ui.worldToScreen(
        worldPos,
        this.cameraRig.camera,
        window.innerWidth,
        window.innerHeight
      );
      if (screenPos) {
        this.ui.showDamageNumber(screenPos, damage, isPlayer);
      }
      
      if (isPlayer) {
        Audio.playPlayerHit();
      }
    };

    this.spawner.onXPCollected = () => {
      Audio.playXPPickup();
    };
  }

  /**
   * Pausa o jogo (ao apertar ESC)
   */
  private pauseGame(): void {
    this.isPaused = true;
    Time.pause();
    this.ui.showPauseScreen();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    Time.init();
    this.gameLoop();
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(this.gameLoop.bind(this));

    Time.update();
    
    if (!this.isPaused) {
      this.update();
    }
    
    this.render();
    Input.resetDeltas();
  }

  private update(): void {
    // Toggle slow motion manual (RMB)
    if (Input.isSlowMoPressed() && !this.lastSlowMoState) {
      Time.toggleSlowMo();
    }
    this.lastSlowMoState = Input.isSlowMoPressed();

    // Música de dive
    if (this.player.isDiving && !this.wasDiving) {
      Audio.startDiveMusic();
    } else if (!this.player.isDiving && this.wasDiving) {
      Audio.stopDiveMusic();
    }
    this.wasDiving = this.player.isDiving;

    this.player.update(this.cameraRig);

    const previousLevel = this.player.level;
    this.spawner.update(this.player);

    if (this.player.level > previousLevel) {
      this.showUpgradeMenu();
    }

    this.processCombat();
    this.damage.processEnemyCollisions(this.player, this.spawner.enemies);
    this.cameraRig.update(this.player.position, this.player.isJumping, this.player.isDiving);
    this.ui.update(this.player, Time.isSlowMo, this.spawner.killCount, this.player.isDiving);
  }

  private processCombat(): void {
    if (!Input.isShooting()) return;

    if (this.player.currentWeapon === 'pistols') {
      if (this.player.canFire()) {
        this.player.didFire();
        
        const result = this.weapons.firePistols(
          this.player,
          this.cameraRig,
          this.spawner.enemies
        );
        
        for (let i = 0; i < result.hits.length; i++) {
          this.damage.damageEnemy(result.hits[i], result.damages[i], false);
        }
      }
    } else {
      if (this.player.canSlash()) {
        this.player.didSlash();
        
        const result = this.weapons.slash(
          this.player,
          this.cameraRig,
          this.spawner.enemies
        );
        
        for (let i = 0; i < result.hits.length; i++) {
          this.damage.damageEnemy(
            result.hits[i], 
            result.damages[i], 
            true, 
            result.sliceDirection
          );
        }
      }
    }
  }

  private showUpgradeMenu(): void {
    this.isPaused = true;
    Time.pause();
    this.ui.showUpgradeMenu();
    document.exitPointerLock();
  }

  private gameOver(): void {
    this.isPaused = true;
    Time.pause();
    this.ui.showGameOver();
    document.exitPointerLock();
  }

  private reset(): void {
    this.player.reset();
    this.spawner.clear();
    this.ui.reset();
    Time.setSlowMo(false);
    Time.resume();
    this.isPaused = false;
    this.wasDiving = false;
    this.cameraRig.init(this.player.position);
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
