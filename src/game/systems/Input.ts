import { CONFIG } from '../Config';

/**
 * Sistema de input que gerencia teclado e mouse
 */
export class InputSystem {
  private keys: Map<string, boolean> = new Map();
  private mouseButtons: Map<number, boolean> = new Map();
  private _mouseDeltaX: number = 0;
  private _mouseDeltaY: number = 0;
  private _wheelDelta: number = 0;
  private _isPointerLocked: boolean = false;

  // Callbacks
  onPointerLock?: () => void;
  onPointerUnlock?: () => void;
  onWeaponSwitch?: (slot: number) => void;
  onReset?: () => void;

  get mouseDeltaX(): number {
    return this._mouseDeltaX;
  }

  get mouseDeltaY(): number {
    return this._mouseDeltaY;
  }

  get wheelDelta(): number {
    return this._wheelDelta;
  }

  get isPointerLocked(): boolean {
    return this._isPointerLocked;
  }

  /**
   * Inicializa os event listeners
   */
  init(canvas: HTMLCanvasElement): void {
    // Keyboard
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('wheel', this.onWheel.bind(this));

    // Pointer Lock
    canvas.addEventListener('click', () => this.requestPointerLock(canvas));
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    document.addEventListener('pointerlockerror', () => console.error('Pointer lock error'));
  }

  /**
   * Reseta os deltas do mouse (chamar no final de cada frame)
   */
  resetDeltas(): void {
    this._mouseDeltaX = 0;
    this._mouseDeltaY = 0;
    this._wheelDelta = 0;
  }

  /**
   * Verifica se uma tecla está pressionada
   */
  isKeyDown(key: string): boolean {
    return this.keys.get(key.toLowerCase()) ?? false;
  }

  /**
   * Verifica se um botão do mouse está pressionado
   */
  isMouseDown(button: number): boolean {
    return this.mouseButtons.get(button) ?? false;
  }

  /**
   * Retorna o vetor de movimento (WASD)
   */
  getMovementVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) z -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) z += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) x -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) x += 1;

    // Normalizar se diagonal
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    return { x, z };
  }

  /**
   * Verifica se está correndo
   */
  isRunning(): boolean {
    return this.isKeyDown('shift');
  }

  /**
   * Verifica se está pulando
   */
  isJumping(): boolean {
    return this.isKeyDown(' ') || this.isKeyDown('space');
  }

  /**
   * Verifica se está atirando
   */
  isShooting(): boolean {
    return this.isMouseDown(0) && this._isPointerLocked;
  }

  /**
   * Verifica se está ativando slow motion
   */
  isSlowMoPressed(): boolean {
    return this.isMouseDown(2);
  }

  private requestPointerLock(canvas: HTMLCanvasElement): void {
    if (!this._isPointerLocked) {
      canvas.requestPointerLock();
    }
  }

  private onPointerLockChange(): void {
    this._isPointerLocked = document.pointerLockElement !== null;
    
    if (this._isPointerLocked) {
      this.onPointerLock?.();
    } else {
      this.onPointerUnlock?.();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.keys.set(key, true);

    // Weapon switching
    if (key === '1') {
      this.onWeaponSwitch?.(0);
    } else if (key === '2') {
      this.onWeaponSwitch?.(1);
    }

    // Reset
    if (key === 'r') {
      this.onReset?.();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.key.toLowerCase(), false);
  }

  private onMouseDown(event: MouseEvent): void {
    this.mouseButtons.set(event.button, true);
    
    // Prevenir menu de contexto no RMB
    if (event.button === 2) {
      event.preventDefault();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.mouseButtons.set(event.button, false);
  }

  private onMouseMove(event: MouseEvent): void {
    if (this._isPointerLocked) {
      this._mouseDeltaX += event.movementX * CONFIG.camera.sensitivity;
      this._mouseDeltaY += event.movementY * CONFIG.camera.sensitivity;
    }
  }

  private onWheel(event: WheelEvent): void {
    this._wheelDelta = Math.sign(event.deltaY);
    
    // Trocar arma com scroll
    if (this._wheelDelta !== 0 && this._isPointerLocked) {
      this.onWeaponSwitch?.(this._wheelDelta > 0 ? 1 : 0);
    }
  }
}

// Singleton
export const Input = new InputSystem();

