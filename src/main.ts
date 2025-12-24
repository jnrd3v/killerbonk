/**
 * Killer Bean Survivors
 * 
 * Um jogo 3D inspirado em Killer Bean/John Wick (movimentação cinematográfica)
 * e Megabonk/Vampire Survivors (loop de hordas, XP, upgrades).
 * 
 * Controles:
 * - WASD: Mover
 * - SHIFT: Correr
 * - SPACE: Pular
 * - Mouse: Câmera
 * - LMB: Atirar/Socar
 * - RMB: Slow Motion (toggle)
 * - 1/2 ou Scroll: Trocar arma
 * - R: Reiniciar
 */

import { Game } from './game/Game';

// Prevenir menu de contexto
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Iniciar o jogo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔥 Killer Bean Survivors - Starting...');
  
  try {
    const game = new Game();
    console.log('✅ Game initialized successfully!');
    console.log('👆 Click on the game to start (pointer lock required)');
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
  }
});

