/**
 * Configuração centralizada do jogo
 * Altere os valores aqui para tunar o gameplay
 */
export const CONFIG = {
  // === PLAYER ===
  player: {
    maxHP: 100,
    moveSpeed: 8,
    runMultiplier: 1.8,
    jumpForce: 14,
    gravity: 28,
    height: 2.2, // Maior para modelo humanoide
    radius: 0.5,
    pickupRadius: 2.5,
  },

  // === CAMERA ===
  camera: {
    distance: 6, // Mais longe para ver melhor
    height: 2.5, // Mais alta para melhor visão
    lookAheadDistance: 4, // Olhar mais à frente
    smoothSpeed: 10,
    sensitivity: 0.002,
    minPitch: -Math.PI / 3, // Permite olhar mais para baixo
    maxPitch: Math.PI / 4,
    // Efeito cinematográfico no pulo
    jumpZoomOut: 2.5,
    jumpZoomSpeed: 4,
    // Dive cinematográfico
    diveZoomOut: 3,
    diveFOV: 90,
  },

  // === WEAPONS ===
  weapons: {
    pistols: {
      damage: 20,
      fireRate: 10,
      range: 100,
      knockback: 3,
      spread: 0.015,
    },
    sword: {
      damage: 40,
      range: 3.5,
      coneAngle: Math.PI / 2.5, // 72 graus
      knockback: 6,
      cooldown: 0.35,
      slashDuration: 0.25, // Duração da animação de corte
    },
  },

  // === ENEMIES ===
  enemies: {
    baseHP: 40,
    baseDamage: 10,
    baseSpeed: 3.5,
    spawnDistance: 22,
    minSpawnDistance: 16,
    initialSpawnRate: 1.2,
    minSpawnRate: 0.25,
    spawnRateDecrease: 0.05,
    maxEnemies: 60,
    touchDamageCooldown: 0.5,
    size: 0.5, // Raio para colisão
    height: 1.8, // Altura do modelo humanoide
    deathAnimDuration: 0.4, // Duração da animação de morte
  },

  // === XP & LEVELING ===
  xp: {
    baseXPToLevel: 80,
    xpMultiplierPerLevel: 1.15,
    orbValue: 12,
    orbSize: 0.25,
    orbSpeed: 18,
    orbLifetime: 25,
  },

  // === SLOW MOTION ===
  slowmo: {
    timeScale: 0.2, // Mais lento para efeito cinematográfico
    transitionSpeed: 8,
  },

  // === DIVE (Pulo Cinematográfico) ===
  dive: {
    duration: 0.8, // Tempo do dive em segundos
    speed: 15, // Velocidade horizontal
    height: 2, // Altura do arco
    recoveryTime: 0.3, // Tempo de recuperação após pousar
    autoSlowmo: true, // Ativar slowmo automaticamente durante dive
  },

  // === VISUAL ===
  visual: {
    groundSize: 120,
    groundColor: 0x1a1a1a,
    playerColor: 0xe85d04, // Laranja vibrante
    playerAccentColor: 0x2d2d2d, // Detalhes escuros
    enemyColor: 0x7b2cbf, // Roxo sinistro
    enemyAccentColor: 0x3c096c,
    xpOrbColor: 0x00f5d4, // Ciano brilhante
    swordColor: 0xc0c0c0, // Prata
    swordGlowColor: 0x00ffff, // Glow ciano
    muzzleFlashDuration: 0.06,
    tracerLength: 3,
    tracerDuration: 0.12,
    slashColor: 0xffffff,
  },

  // === UPGRADES ===
  upgrades: {
    pistolDamageIncrease: 8,
    pistolFireRateIncrease: 1.5,
    swordDamageIncrease: 15,
    swordRangeIncrease: 0.4,
    moveSpeedIncrease: 1.2,
    maxHPIncrease: 25,
    pickupRadiusIncrease: 0.6,
  },
};

// Tipo para os upgrades disponíveis
export type UpgradeType = 
  | 'pistol_damage'
  | 'pistol_firerate'
  | 'sword_damage'
  | 'sword_range'
  | 'move_speed'
  | 'max_hp'
  | 'pickup_radius';

export interface UpgradeInfo {
  type: UpgradeType;
  name: string;
  description: string;
}

export const UPGRADE_LIST: UpgradeInfo[] = [
  { type: 'pistol_damage', name: '🔫 +Dano Pistolas', description: `+${CONFIG.upgrades.pistolDamageIncrease} dano` },
  { type: 'pistol_firerate', name: '🔫 +Cadência', description: `+${CONFIG.upgrades.pistolFireRateIncrease} tiros/s` },
  { type: 'sword_damage', name: '⚔️ +Dano Espada', description: `+${CONFIG.upgrades.swordDamageIncrease} dano` },
  { type: 'sword_range', name: '⚔️ +Range Espada', description: `+${CONFIG.upgrades.swordRangeIncrease}m alcance` },
  { type: 'move_speed', name: '🏃 +Velocidade', description: `+${CONFIG.upgrades.moveSpeedIncrease} vel` },
  { type: 'max_hp', name: '❤️ +HP Máximo', description: `+${CONFIG.upgrades.maxHPIncrease} HP` },
  { type: 'pickup_radius', name: '🧲 +Pickup Radius', description: `+${CONFIG.upgrades.pickupRadiusIncrease}m raio` },
];
