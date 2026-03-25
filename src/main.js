import Phaser from 'phaser';
import { BootScene } from './BootScene.js';
import { GameScene } from './GameScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

function showFatalError(error) {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  let panel = document.getElementById('fatal-error');

  if (!panel) {
    panel = document.createElement('pre');
    panel.id = 'fatal-error';
    Object.assign(panel.style, {
      position: 'fixed',
      inset: '16px',
      padding: '16px',
      margin: '0',
      background: 'rgba(20, 6, 40, 0.94)',
      color: '#fff',
      border: '2px solid #ff9bd1',
      borderRadius: '12px',
      zIndex: '99999',
      whiteSpace: 'pre-wrap',
      font: '14px/1.4 Consolas, Monaco, monospace',
      overflow: 'auto',
    });
    document.body.appendChild(panel);
  }

  panel.textContent = `Game failed to start.\n\n${details}`;
  console.error(error);
}

window.addEventListener('error', (event) => {
  showFatalError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError(event.reason || 'Unhandled promise rejection');
});

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth || GAME_WIDTH,
  height: window.innerHeight || GAME_HEIGHT,
  backgroundColor: '#1a0a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth || GAME_WIDTH,
    height: window.innerHeight || GAME_HEIGHT,
  },
  scene: [BootScene, GameScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
  input: {
    activePointers: 3,
  },
};

try {
  new Phaser.Game(config);
} catch (error) {
  showFatalError(error);
}

// Prevent context menu and scrolling on touch devices
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
