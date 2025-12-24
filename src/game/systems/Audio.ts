/**
 * Sistema de áudio procedural usando Web Audio API
 * Gera sons sem necessidade de arquivos externos
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private isInitialized: boolean = false;
  private diveMusic: OscillatorNode | null = null;
  private diveMusicGain: GainNode | null = null;

  /**
   * Inicializa o sistema de áudio (deve ser chamado após interação do usuário)
   */
  init(): void {
    if (this.isInitialized) return;
    
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
      
      // Music gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);
      
      // SFX gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
      
      this.isInitialized = true;
      console.log('🔊 Audio system initialized');
    } catch (e) {
      console.warn('Audio not supported:', e);
    }
  }

  /**
   * Resume o contexto de áudio (necessário após interação)
   */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Som de tiro de pistola
   */
  playGunshot(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // Noise burst para o estalo
    const noiseBuffer = this.createNoiseBuffer(0.08);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Filtro passa-alta para deixar mais "snappy"
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1000;
    
    // Envelope
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.8, now);
    envelope.gain.exponentialDecayTo(0.01, now + 0.08);
    
    noise.connect(highpass);
    highpass.connect(envelope);
    envelope.connect(this.sfxGain);
    
    noise.start(now);
    noise.stop(now + 0.1);
    
    // Tom baixo para impacto
    const bass = this.ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(150, now);
    bass.frequency.exponentialDecayTo(50, now + 0.05);
    
    const bassEnv = this.ctx.createGain();
    bassEnv.gain.setValueAtTime(0.4, now);
    bassEnv.gain.exponentialDecayTo(0.01, now + 0.05);
    
    bass.connect(bassEnv);
    bassEnv.connect(this.sfxGain);
    
    bass.start(now);
    bass.stop(now + 0.1);
  }

  /**
   * Som de corte de espada
   */
  playSwordSlash(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // Swoosh - ruído filtrado com sweep
    const noiseBuffer = this.createNoiseBuffer(0.2);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2000, now);
    bandpass.frequency.exponentialDecayTo(500, now + 0.15);
    bandpass.Q.value = 2;
    
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.5, now + 0.02);
    envelope.gain.exponentialDecayTo(0.01, now + 0.2);
    
    noise.connect(bandpass);
    bandpass.connect(envelope);
    envelope.connect(this.sfxGain);
    
    noise.start(now);
    noise.stop(now + 0.25);
    
    // Tom metálico
    const metal = this.ctx.createOscillator();
    metal.type = 'sawtooth';
    metal.frequency.setValueAtTime(800, now);
    metal.frequency.exponentialDecayTo(200, now + 0.1);
    
    const metalEnv = this.ctx.createGain();
    metalEnv.gain.setValueAtTime(0.15, now);
    metalEnv.gain.exponentialDecayTo(0.01, now + 0.1);
    
    metal.connect(metalEnv);
    metalEnv.connect(this.sfxGain);
    
    metal.start(now);
    metal.stop(now + 0.15);
  }

  /**
   * Som de morte de inimigo
   */
  playEnemyDeath(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // "Splat" - ruído com pitch descendente
    const noiseBuffer = this.createNoiseBuffer(0.3);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2000, now);
    lowpass.frequency.exponentialDecayTo(100, now + 0.2);
    
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.5, now);
    envelope.gain.exponentialDecayTo(0.01, now + 0.3);
    
    noise.connect(lowpass);
    lowpass.connect(envelope);
    envelope.connect(this.sfxGain);
    
    noise.start(now);
    noise.stop(now + 0.35);
    
    // Tom descendente
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialDecayTo(50, now + 0.2);
    
    const oscEnv = this.ctx.createGain();
    oscEnv.gain.setValueAtTime(0.2, now);
    oscEnv.gain.exponentialDecayTo(0.01, now + 0.2);
    
    osc.connect(oscEnv);
    oscEnv.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Som de coleta de XP
   */
  playXPPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // Tom ascendente agradável
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.2, now);
    envelope.gain.exponentialDecayTo(0.01, now + 0.15);
    
    osc.connect(envelope);
    envelope.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Som de level up
   */
  playLevelUp(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // Arpejo ascendente
    const notes = [400, 500, 600, 800, 1000];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const env = this.ctx!.createGain();
      env.gain.setValueAtTime(0, now + i * 0.08);
      env.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
      env.gain.exponentialDecayTo(0.01, now + i * 0.08 + 0.2);
      
      osc.connect(env);
      env.connect(this.sfxGain!);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  /**
   * Som de dano no player
   */
  playPlayerHit(): void {
    if (!this.ctx || !this.sfxGain) return;
    
    const now = this.ctx.currentTime;
    
    // Tom baixo de impacto
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialDecayTo(30, now + 0.2);
    
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.5, now);
    envelope.gain.exponentialDecayTo(0.01, now + 0.2);
    
    osc.connect(envelope);
    envelope.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Inicia música de dive cinematográfico
   */
  startDiveMusic(): void {
    if (!this.ctx || !this.musicGain || this.diveMusic) return;
    
    const now = this.ctx.currentTime;
    
    // Criar gain para fade
    this.diveMusicGain = this.ctx.createGain();
    this.diveMusicGain.gain.setValueAtTime(0, now);
    this.diveMusicGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    this.diveMusicGain.connect(this.musicGain);
    
    // Drone dramático
    this.diveMusic = this.ctx.createOscillator();
    this.diveMusic.type = 'sawtooth';
    this.diveMusic.frequency.value = 55; // A1
    
    // Filtro para tom mais cheio
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 5;
    
    this.diveMusic.connect(filter);
    filter.connect(this.diveMusicGain);
    
    this.diveMusic.start(now);
    
    // Adicionar harmônicos
    const harm = this.ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.value = 110;
    
    const harmGain = this.ctx.createGain();
    harmGain.gain.value = 0.3;
    
    harm.connect(harmGain);
    harmGain.connect(this.diveMusicGain);
    harm.start(now);
    
    // LFO para tremolo
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8;
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.15;
    
    lfo.connect(lfoGain);
    lfoGain.connect(this.diveMusicGain.gain);
    lfo.start(now);
  }

  /**
   * Para música de dive
   */
  stopDiveMusic(): void {
    if (!this.ctx || !this.diveMusic || !this.diveMusicGain) return;
    
    const now = this.ctx.currentTime;
    
    // Fade out
    this.diveMusicGain.gain.linearRampToValueAtTime(0, now + 0.2);
    
    // Parar após fade
    setTimeout(() => {
      if (this.diveMusic) {
        try {
          this.diveMusic.stop();
        } catch (e) {}
        this.diveMusic = null;
      }
      this.diveMusicGain = null;
    }, 250);
  }

  /**
   * Cria buffer de ruído branco
   */
  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
  }

  /**
   * Define volume master
   */
  setVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }
}

// Extensão para exponentialDecayTo
declare global {
  interface AudioParam {
    exponentialDecayTo(value: number, endTime: number): void;
  }
}

AudioParam.prototype.exponentialDecayTo = function(value: number, endTime: number) {
  this.exponentialRampToValueAtTime(Math.max(0.001, value), endTime);
};

// Singleton
export const Audio = new AudioSystem();

