import * as THREE from 'three';
import { Player } from '../entities/Player';
import { UPGRADE_LIST, UpgradeInfo } from '../Config';
import { shuffle } from '../utils/Math';

/**
 * Sistema de UI (HTML overlay)
 */
export class UISystem {
  private hpBarFill: HTMLElement;
  private hpBarText: HTMLElement;
  private xpBarFill: HTMLElement;
  private xpBarText: HTMLElement;
  private levelNumber: HTMLElement;
  private weaponName: HTMLElement;
  private slowmoIndicator: HTMLElement;
  private upgradesContent: HTMLElement;
  private upgradeMenu: HTMLElement;
  private upgradeOptions: HTMLElement;
  private startScreen: HTMLElement;
  private killCount: HTMLElement;
  private pauseScreen: HTMLElement;

  // Callbacks
  onUpgradeSelected?: (upgrade: UpgradeInfo) => void;
  onGameStart?: () => void;

  constructor() {
    this.hpBarFill = document.querySelector('#hp-bar .bar-fill')!;
    this.hpBarText = document.querySelector('#hp-bar .bar-text')!;
    this.xpBarFill = document.querySelector('#xp-bar .bar-fill')!;
    this.xpBarText = document.querySelector('#xp-bar .bar-text')!;
    this.levelNumber = document.getElementById('level-number')!;
    this.weaponName = document.getElementById('weapon-name')!;
    this.slowmoIndicator = document.getElementById('slowmo-indicator')!;
    this.upgradesContent = document.getElementById('upgrades-content')!;
    this.upgradeMenu = document.getElementById('upgrade-menu')!;
    this.upgradeOptions = document.getElementById('upgrade-options')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.killCount = document.getElementById('kill-count')!;

    // Criar tela de pausa
    this.pauseScreen = this.createPauseScreen();

    this.startScreen.addEventListener('click', () => {
      this.startScreen.style.display = 'none';
      this.onGameStart?.();
    });
  }

  private createPauseScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'pause-screen';
    screen.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-family: 'Orbitron', sans-serif;
      z-index: 1000;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    `;
    screen.innerHTML = `
      <h1 style="font-size: 48px; color: #ffaa00; text-shadow: 0 0 20px rgba(255,170,0,0.5); margin-bottom: 20px;">
        ⏸️ PAUSADO
      </h1>
      <p style="font-size: 20px; color: #aaaaaa; margin-bottom: 40px;">
        Clique na tela para continuar
      </p>
      <div style="font-size: 16px; color: #888888;">
        <p>ESC - Pausar</p>
        <p>R - Reiniciar</p>
      </div>
    `;
    document.getElementById('ui-overlay')!.appendChild(screen);
    return screen;
  }

  /**
   * Mostra a tela de pausa
   */
  showPauseScreen(): void {
    this.pauseScreen.style.display = 'flex';
  }

  /**
   * Esconde a tela de pausa
   */
  hidePauseScreen(): void {
    this.pauseScreen.style.display = 'none';
  }

  /**
   * Atualiza a UI baseado no estado do player
   */
  update(player: Player, isSlowMo: boolean, kills: number, isDiving: boolean = false): void {
    // HP
    const hpPercent = (player.hp / player.maxHP) * 100;
    this.hpBarFill.style.width = `${hpPercent}%`;
    this.hpBarText.textContent = `${Math.ceil(player.hp)} / ${player.maxHP}`;

    // Cor do HP baseado no valor
    if (hpPercent < 25) {
      this.hpBarFill.style.background = 'linear-gradient(to bottom, #ff0000, #aa0000)';
    } else if (hpPercent < 50) {
      this.hpBarFill.style.background = 'linear-gradient(to bottom, #ff8800, #cc6600)';
    } else {
      this.hpBarFill.style.background = 'linear-gradient(to bottom, #ff4444, #cc0000)';
    }

    // XP
    const xpPercent = (player.xp / player.xpToLevel) * 100;
    this.xpBarFill.style.width = `${xpPercent}%`;
    this.xpBarText.textContent = `${Math.floor(player.xp)} / ${player.xpToLevel}`;

    // Level
    this.levelNumber.textContent = player.level.toString();

    // Weapon
    if (player.currentWeapon === 'pistols') {
      this.weaponName.textContent = '🔫 DUAL PISTOLS';
      this.weaponName.style.color = '#ffaa00';
    } else {
      this.weaponName.textContent = '⚔️ KATANA';
      this.weaponName.style.color = '#00ffff';
    }

    // Slow motion / Dive
    if (isDiving) {
      this.slowmoIndicator.textContent = '🎬 DIVE MODE 🎬';
      this.slowmoIndicator.style.color = '#ff00ff';
      this.slowmoIndicator.classList.add('active');
    } else if (isSlowMo) {
      this.slowmoIndicator.textContent = '⚡ SLOW MO ⚡';
      this.slowmoIndicator.style.color = '#ff00ff';
      this.slowmoIndicator.classList.add('active');
    } else {
      this.slowmoIndicator.classList.remove('active');
    }

    // Kill count
    this.killCount.textContent = `💀 Kills: ${kills}`;

    // Upgrades list
    this.updateUpgradesList(player);
  }

  /**
   * Atualiza lista de upgrades ativos
   */
  private updateUpgradesList(player: Player): void {
    if (player.upgrades.size === 0) {
      this.upgradesContent.textContent = 'None yet';
      return;
    }

    const lines: string[] = [];
    player.upgrades.forEach((count, type) => {
      const upgrade = UPGRADE_LIST.find(u => u.type === type);
      if (upgrade) {
        lines.push(`${upgrade.name} x${count}`);
      }
    });
    this.upgradesContent.innerHTML = lines.map(l => 
      `<div class="upgrade-item">${l}</div>`
    ).join('');
  }

  /**
   * Mostra o menu de upgrade com 3 opções aleatórias
   */
  showUpgradeMenu(): void {
    const shuffled = shuffle(UPGRADE_LIST);
    const options = shuffled.slice(0, 3);

    this.upgradeOptions.innerHTML = '';

    options.forEach(upgrade => {
      const btn = document.createElement('div');
      btn.className = 'upgrade-option';
      btn.innerHTML = `
        <h3>${upgrade.name}</h3>
        <p>${upgrade.description}</p>
      `;
      btn.addEventListener('click', () => {
        this.hideUpgradeMenu();
        this.onUpgradeSelected?.(upgrade);
      });
      this.upgradeOptions.appendChild(btn);
    });

    this.upgradeMenu.style.display = 'block';
  }

  hideUpgradeMenu(): void {
    this.upgradeMenu.style.display = 'none';
  }

  /**
   * Mostra número de dano flutuante
   */
  showDamageNumber(screenPos: { x: number; y: number }, damage: number, isPlayer: boolean): void {
    const div = document.createElement('div');
    div.className = 'damage-number';
    div.textContent = Math.round(damage).toString();
    div.style.left = `${screenPos.x}px`;
    div.style.top = `${screenPos.y}px`;
    
    if (isPlayer) {
      div.style.color = '#ff4444';
      div.style.fontSize = '28px';
    } else {
      // Cor baseada no dano
      if (damage >= 40) {
        div.style.color = '#ff00ff'; // Crítico
        div.style.fontSize = '32px';
      } else if (damage >= 25) {
        div.style.color = '#ffff00';
        div.style.fontSize = '26px';
      } else {
        div.style.color = '#ffffff';
      }
    }

    document.getElementById('ui-overlay')!.appendChild(div);
    setTimeout(() => div.remove(), 1000);
  }

  showGameOver(): void {
    this.startScreen.innerHTML = `
      <h1 style="color: #ff0000;">💀 GAME OVER 💀</h1>
      <p>Clique para reiniciar</p>
    `;
    this.startScreen.style.display = 'flex';
  }

  reset(): void {
    this.hideUpgradeMenu();
    this.hidePauseScreen();
    this.startScreen.innerHTML = `
      <h1>🔥 KILLER BEAN SURVIVORS 🔥</h1>
      <p>Clique para começar</p>
      <div class="controls-hint">
        <p>WASD - Mover</p>
        <p>SHIFT - Correr</p>
        <p>SPACE - Pular</p>
        <p>RMB + SPACE - DIVE cinematográfico!</p>
        <p>MOUSE - Câmera</p>
        <p>LMB - Atirar/Cortar</p>
        <p>RMB - Slow Motion</p>
        <p>1/2 ou SCROLL - Trocar arma</p>
        <p>ESC - Pausar</p>
        <p>R - Reiniciar</p>
      </div>
    `;
    this.startScreen.style.display = 'none';
  }

  worldToScreen(
    worldPos: THREE.Vector3,
    camera: THREE.Camera,
    width: number,
    height: number
  ): { x: number; y: number } | null {
    const pos = worldPos.clone();
    pos.project(camera);

    if (pos.z > 1) return null;

    return {
      x: (pos.x * 0.5 + 0.5) * width,
      y: (-pos.y * 0.5 + 0.5) * height,
    };
  }
}
