import { CONFIG } from '../Config';

/**
 * Sistema de tempo que gerencia deltaTime e slow motion
 */
export class TimeSystem {
  private lastTime: number = 0;
  private _deltaTime: number = 0;
  private _scaledDeltaTime: number = 0;
  private _timeScale: number = 1;
  private _targetTimeScale: number = 1;
  private _slowMoActive: boolean = false;

  // Limite máximo de deltaTime para evitar saltos grandes
  private readonly maxDeltaTime: number = 0.033; // ~30fps mínimo

  get deltaTime(): number {
    return this._deltaTime;
  }

  get scaledDeltaTime(): number {
    return this._scaledDeltaTime;
  }

  get timeScale(): number {
    return this._timeScale;
  }

  get isSlowMo(): boolean {
    return this._slowMoActive;
  }

  /**
   * Inicializa o sistema de tempo
   */
  init(): void {
    this.lastTime = performance.now();
  }

  /**
   * Atualiza o sistema de tempo a cada frame
   */
  update(): void {
    const currentTime = performance.now();
    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp deltaTime
    this._deltaTime = Math.min(rawDelta, this.maxDeltaTime);

    // Transição suave do timeScale
    const transitionSpeed = CONFIG.slowmo.transitionSpeed;
    if (this._timeScale !== this._targetTimeScale) {
      const diff = this._targetTimeScale - this._timeScale;
      const change = Math.sign(diff) * transitionSpeed * this._deltaTime;
      
      if (Math.abs(diff) < Math.abs(change)) {
        this._timeScale = this._targetTimeScale;
      } else {
        this._timeScale += change;
      }
    }

    // Delta escalado
    this._scaledDeltaTime = this._deltaTime * this._timeScale;
  }

  /**
   * Ativa/desativa slow motion
   */
  toggleSlowMo(): void {
    this._slowMoActive = !this._slowMoActive;
    this._targetTimeScale = this._slowMoActive ? CONFIG.slowmo.timeScale : 1;
  }

  /**
   * Define slow motion para um estado específico
   */
  setSlowMo(active: boolean): void {
    this._slowMoActive = active;
    this._targetTimeScale = active ? CONFIG.slowmo.timeScale : 1;
  }

  /**
   * Pausa total do jogo (para menus)
   */
  pause(): void {
    this._targetTimeScale = 0;
    this._timeScale = 0;
  }

  /**
   * Retoma o jogo
   */
  resume(): void {
    this._targetTimeScale = this._slowMoActive ? CONFIG.slowmo.timeScale : 1;
  }
}

// Singleton
export const Time = new TimeSystem();

