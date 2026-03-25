import Phaser from 'phaser';
import { ITEM_COUNT, CATEGORIES } from './constants.js';
import { SoundManager } from './SoundManager.js';
import { SaveManager } from './SaveManager.js';
import { Confetti } from './Confetti.js';

const DRESSUP_KEYS = ['outfit', 'wings', 'crown', 'background'];
const TOOL_OPTIONS = [
  { key: 'dress', label: 'Dress Up' },
  { key: 'plant', label: 'Plant' },
  { key: 'water', label: 'Water' },
];
const FLOWER_COLORS = [
  [0xFF6B8A, 0xFFE07A, 0xFFFFFF],
  [0x6BC8B7, 0xB8F2E6, 0xFFF3A3],
  [0xC777FF, 0xE8C3FF, 0xFFE07A],
  [0xFF9F68, 0xFFD6A5, 0xFFF5C2],
  [0x4D9EFF, 0xBBD7FF, 0xFFF5C2],
  [0xF06292, 0xF8BBD0, 0xFFF176],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.isLandscape = this.W > this.H;
    this.sound_mgr = new SoundManager();
    this.store = new SaveManager();
    this.confetti = new Confetti(this);

    this.state = {
      outfit: this.store.get('outfit'),
      wings: this.store.get('wings'),
      crown: this.store.get('crown'),
      background: this.store.get('background'),
      garden: this.store.get('garden'),
    };

    this.selectedCategory = 'outfit';
    this.selectedTool = 'dress';
    this._booActive = false;
    this._babyActive = false;
    this._booSprites = [];
    this._babySprites = [];
    this._heartSprites = [];
    this._sparkles = [];
    this._gardenPlots = [];

    this._buildLayout();

    this.scale.on('resize', this._handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this._handleResize, this);
    });
  }

  _handleResize(gameSize) {
    const { width, height } = gameSize;
    if (Math.abs(width - this.W) < 2 && Math.abs(height - this.H) < 2) {
      return;
    }

    this.W = width;
    this.H = height;
    this.scene.restart();
  }

  _buildLayout() {
    this._computeLayout();
    this._createBackground();
    this._createStage();
    this._createActionStrip();
    this._createButtonPanel();
    this._createGearButton();
  }

  _computeLayout() {
    const topInset = 24;
    const panelPadding = 16;

    if (this.isLandscape) {
      const sideWidth = clamp(this.W * 0.3, 228, 320);
      this.stageRect = {
        x: 0,
        y: 0,
        width: this.W - sideWidth,
        height: this.H,
      };
      this.panelRect = {
        x: this.W - sideWidth,
        y: 0,
        width: sideWidth,
        height: this.H,
      };
      this.stageCenter = {
        x: this.stageRect.x + this.stageRect.width * 0.48,
        y: this.stageRect.y + this.stageRect.height * 0.44,
      };
      this.characterScale = clamp(this.H / 844, 0.76, 1.01);
      this.stageBottom = this.H - 52;
      this.gardenArea = {
        x: 36,
        y: this.H - 220,
        width: this.stageRect.width - 72,
        height: 130,
      };
    } else {
      const bottomHeight = clamp(this.H * 0.33, 220, 290);
      this.stageRect = {
        x: 0,
        y: 0,
        width: this.W,
        height: this.H - bottomHeight,
      };
      this.panelRect = {
        x: 0,
        y: this.H - bottomHeight,
        width: this.W,
        height: bottomHeight,
      };
      this.stageCenter = {
        x: this.W / 2,
        y: this.stageRect.height * 0.41,
      };
      this.characterScale = clamp(this.stageRect.height / 520, 0.78, 1.04);
      this.stageBottom = this.panelRect.y - 24;
      this.gardenArea = {
        x: 28,
        y: this.stageBottom - 140,
        width: this.W - 56,
        height: 118,
      };
    }

    this.actionStripY = topInset + 36;
    this.panelPadding = panelPadding;
  }

  _createBackground() {
    this.bgImage = this.add.image(this.W / 2, this.H / 2, `bg_${this.state.background}`)
      .setDisplaySize(this.W, this.H)
      .setDepth(0);

    const vignette = this.add.graphics().setDepth(1);
    vignette.fillStyle(0x130225, 0.16);
    vignette.fillRect(0, 0, this.W, this.H);
    vignette.fillStyle(0xffffff, 0.05);
    vignette.fillRoundedRect(14, 14, this.W - 28, this.H - 28, 28);
  }

  _updateBackground(idx) {
    this.bgImage.setTexture(`bg_${idx}`);
    this.bgImage.setDisplaySize(this.W, this.H);
  }

  _createStage() {
    const centerX = this.stageCenter.x;
    const centerY = this.stageCenter.y + (this.isLandscape ? 0 : 10);
    const baseY = centerY - 22 * this.characterScale;

    this.stageSwipeZone = this.add.rectangle(
      this.stageRect.x + this.stageRect.width / 2,
      this.stageRect.y + this.stageRect.height / 2,
      this.stageRect.width,
      this.stageRect.height,
      0xffffff,
      0.001,
    ).setDepth(2).setInteractive();

    this.stageSwipeZone.on('pointerdown', (pointer) => {
      this._pointerStart = { x: pointer.x, y: pointer.y, time: this.time.now };
    });

    this.stageSwipeZone.on('pointerup', (pointer) => {
      this._handleStageGesture(pointer);
    });

    this.wingsImage = this.add.image(centerX, baseY + 20 * this.characterScale, `wings_${this.state.wings}`)
      .setDisplaySize(260 * this.characterScale, 185 * this.characterScale)
      .setDepth(4);
    this.pennyImage = this.add.image(centerX, baseY, 'penny_base')
      .setDisplaySize(180 * this.characterScale, 270 * this.characterScale)
      .setDepth(5);
    this.outfitImage = this.add.image(centerX, baseY + 60 * this.characterScale, `outfit_${this.state.outfit}`)
      .setDisplaySize(145 * this.characterScale, 165 * this.characterScale)
      .setDepth(6);
    this.crownImage = this.add.image(centerX, baseY - 100 * this.characterScale, `crown_${this.state.crown}`)
      .setDisplaySize(115 * this.characterScale, 70 * this.characterScale)
      .setDepth(7);

    this._createTouchHotspot(centerX, baseY - 92 * this.characterScale, 150 * this.characterScale, 90 * this.characterScale, 'crown');
    this._createTouchHotspot(centerX, baseY + 10 * this.characterScale, 260 * this.characterScale, 210 * this.characterScale, 'wings');
    this._createTouchHotspot(centerX, baseY + 66 * this.characterScale, 170 * this.characterScale, 190 * this.characterScale, 'outfit');

    this._addFloatingSparkles(centerX, baseY);
    this._createGarden();
  }

  _createTouchHotspot(x, y, width, height, key) {
    const hotspot = this.add.rectangle(x, y, width, height, 0xffffff, 0.001)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });

    hotspot.on('pointerdown', () => {
      if (this.selectedTool !== 'dress') {
        return;
      }
      this._setSelectedCategory(key);
      this._cycleItem(key, 1, hotspot);
    });
  }

  _addFloatingSparkles(centerX, centerY) {
    const colors = [0xFFE400, 0xFF4B64, 0x87CEEB, 0x90EE90, 0xCC99FF];

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 120 * this.characterScale + Math.random() * 28;
      const sx = centerX + Math.cos(angle) * radius;
      const sy = centerY + Math.sin(angle) * radius;

      const spark = this.add.graphics().setDepth(9);
      spark.fillStyle(colors[i % colors.length], 0.82);
      spark.fillPoints(this._createSparklePoints(4, 3.5, 8.5), true);
      spark.x = sx;
      spark.y = sy;

      this.tweens.add({
        targets: spark,
        y: sy - 18,
        alpha: { from: 0.3, to: 0.95 },
        scaleX: { from: 0.75, to: 1.18 },
        scaleY: { from: 0.75, to: 1.18 },
        duration: 1000 + Math.random() * 700,
        yoyo: true,
        repeat: -1,
        delay: i * 120,
        ease: 'Sine.easeInOut',
      });

      this._sparkles.push(spark);
    }
  }

  _createSparklePoints(points, innerRadius, outerRadius) {
    const sparklePoints = [];
    const step = Math.PI / points;

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      sparklePoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return sparklePoints;
  }

  _createGarden() {
    const titleY = this.gardenArea.y - 16;
    this.gardenTitle = this.add.text(
      this.gardenArea.x + this.gardenArea.width / 2,
      titleY,
      'Fairy Garden',
      {
        fontSize: this.isLandscape ? '18px' : '16px',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        color: '#ffffff',
        stroke: '#2f0e55',
        strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(11);

    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0x1e0738, 0.68);
    panel.fillRoundedRect(this.gardenArea.x, this.gardenArea.y, this.gardenArea.width, this.gardenArea.height, 26);
    panel.lineStyle(2, 0xffc9f3, 0.55);
    panel.strokeRoundedRect(this.gardenArea.x, this.gardenArea.y, this.gardenArea.width, this.gardenArea.height, 26);

    const plotCount = this.state.garden.length;
    const spacing = this.gardenArea.width / plotCount;

    for (let i = 0; i < plotCount; i++) {
      const plotX = this.gardenArea.x + spacing * (i + 0.5);
      const plotY = this.gardenArea.y + this.gardenArea.height * 0.64;
      this._createGardenPlot(i, plotX, plotY, spacing * 0.82, this.gardenArea.height * 0.8);
    }
  }

  _createGardenPlot(index, x, y, width, height) {
    const container = this.add.container(x, y).setDepth(12);
    const graphics = this.add.graphics();
    const label = this.add.text(0, height * 0.36, '', {
      fontSize: this.isLandscape ? '13px' : '12px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#fff8ff',
      stroke: '#2f0e55',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    container.add([graphics, label, hit]);

    hit.on('pointerdown', () => this._onGardenPlotPressed(index));

    const plot = { index, x, y, width, height, container, graphics, label, hit };
    this._gardenPlots.push(plot);
    this._drawGardenPlot(plot);
  }

  _drawGardenPlot(plot) {
    const data = this.state.garden[plot.index];
    const { graphics: g, width, height, label } = plot;
    const soilY = height * 0.2;
    const stemTop = -height * 0.18;
    const flowerColors = FLOWER_COLORS[data.flower % FLOWER_COLORS.length];
    const isToolActive = this.selectedTool === 'plant' || this.selectedTool === 'water';

    g.clear();

    if (isToolActive) {
      g.fillStyle(this.selectedTool === 'water' ? 0x7FDBFF : 0xFFE07A, 0.14);
      g.fillEllipse(0, soilY, width * 0.9, height * 0.9);
    }

    g.fillStyle(0x8b5a2b, 1);
    g.fillEllipse(0, soilY, width * 0.58, height * 0.26);
    g.fillStyle(0x6f451f, 1);
    g.fillEllipse(0, soilY + 6, width * 0.56, height * 0.18);
    g.lineStyle(2, 0x4a2c10, 0.55);
    g.strokeEllipse(0, soilY, width * 0.58, height * 0.26);

    if (data.stage === 0) {
      g.lineStyle(2, 0xffe8a6, 0.55);
      g.strokeCircle(0, soilY - 2, Math.min(width * 0.12, 16));
      g.beginPath();
      g.moveTo(-8, soilY - 2);
      g.lineTo(8, soilY - 2);
      g.moveTo(0, soilY - 10);
      g.lineTo(0, soilY + 6);
      g.strokePath();
      label.setText(this.selectedTool === 'plant' ? 'Tap to plant' : 'Empty patch');
      return;
    }

    if (data.stage >= 1) {
      g.fillStyle(0x9c6b2f, 1);
      g.fillCircle(0, soilY - 6, 7);
    }

    if (data.stage >= 2) {
      g.lineStyle(5, 0x3da35d, 1);
      g.beginPath();
      g.moveTo(0, soilY - 8);
      g.lineTo(0, stemTop + 24);
      g.strokePath();

      g.fillStyle(0x52b788, 1);
      g.fillEllipse(-12, stemTop + 40, 22, 12);
      g.fillEllipse(12, stemTop + 30, 22, 12);
    }

    if (data.stage >= 3) {
      g.fillStyle(0x7ac943, 1);
      g.fillCircle(0, stemTop + 18, 10);
      g.lineStyle(2, 0x2f6b3d, 0.6);
      g.strokeCircle(0, stemTop + 18, 10);
    }

    if (data.stage >= 4) {
      g.fillStyle(0x5fa13f, 1);
      g.fillCircle(0, stemTop + 18, 6);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = Math.cos(angle) * 15;
        const py = stemTop + 18 + Math.sin(angle) * 15;
        g.fillStyle(flowerColors[i % flowerColors.length], 1);
        g.fillCircle(px, py, 8);
      }
      g.fillStyle(0xFFF176, 1);
      g.fillCircle(0, stemTop + 18, 6);
      label.setText('Blooming!');
      return;
    }

    if (data.stage === 1) {
      label.setText(this.selectedTool === 'water' ? 'Water me' : 'Seed planted');
    } else if (data.stage === 2) {
      label.setText(this.selectedTool === 'water' ? 'Tap to water' : 'Little sprout');
    } else {
      label.setText(this.selectedTool === 'water' ? 'Almost blooming' : 'Growing fast');
    }
  }

  _onGardenPlotPressed(index) {
    const plot = this._gardenPlots[index];
    const data = this.state.garden[index];

    if (this.selectedTool === 'plant') {
      if (data.stage !== 0) {
        this._showGardenToast('That patch already has a flower started.');
        return;
      }

      data.stage = 1;
      data.water = 0;
      data.flower = Phaser.Math.Between(0, FLOWER_COLORS.length - 1);
      this._saveGarden();
      this._drawGardenPlot(plot);
      this._animatePlanting(plot);
      this._bounceCharacter();
      this.sound_mgr.playPop();
      return;
    }

    if (this.selectedTool === 'water') {
      if (data.stage === 0) {
        this._showGardenToast('Plant a seed first.');
        return;
      }

      if (data.stage >= 4) {
        this._celebrateBloom(plot, true);
        return;
      }

      this._waterPlot(plot);
      return;
    }

    if (data.stage >= 4) {
      this._celebrateBloom(plot, true);
    } else if (data.stage > 0) {
      this._setSelectedTool('water');
      this._showGardenToast('Try watering this flower.');
    } else {
      this._setSelectedTool('plant');
      this._showGardenToast('Tap the patch again to plant a seed.');
    }
  }

  _waterPlot(plot) {
    const data = this.state.garden[plot.index];
    this._animateWatering(plot, () => {
      data.stage = Math.min(4, data.stage + 1);
      data.water = Math.min(2, data.water + 1);
      this._saveGarden();
      this._drawGardenPlot(plot);
      this._animatePlotGrow(plot);
      this._bounceCharacter();
      this.sound_mgr.playSparkle();

      if (data.stage >= 4) {
        this._celebrateBloom(plot, false);
      } else {
        this.confetti.burst(plot.x, plot.y - 30, 12);
      }
    });
  }

  _animatePlanting(plot) {
    this.confetti.burst(plot.x, plot.y - 20, 10);
    this.tweens.add({
      targets: plot.container,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  _animateWatering(plot, onComplete) {
    const can = this.add.graphics().setDepth(30);
    const startX = this.stageCenter.x + 80;
    const startY = this.stageCenter.y + 20;
    can.x = startX;
    can.y = startY;

    can.fillStyle(0x5aa9e6, 1);
    can.fillRoundedRect(-22, -10, 34, 22, 8);
    can.lineStyle(3, 0xffffff, 0.6);
    can.strokeRoundedRect(-22, -10, 34, 22, 8);
    can.lineStyle(4, 0x5aa9e6, 1);
    can.beginPath();
    can.moveTo(10, -4);
    can.lineTo(28, -10);
    can.lineTo(30, -2);
    can.strokePath();
    can.strokeCircle(-18, -2, 9);

    this.tweens.add({
      targets: can,
      x: plot.x + 34,
      y: plot.y - 52,
      angle: -24,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => {
        for (let i = 0; i < 8; i++) {
          this.time.delayedCall(i * 45, () => {
            const drop = this.add.circle(plot.x + 12, plot.y - 44, 4, 0x7FDBFF)
              .setDepth(31)
              .setAlpha(0.8);
            this.tweens.add({
              targets: drop,
              x: plot.x + Phaser.Math.Between(-10, 12),
              y: plot.y - 4,
              alpha: 0,
              duration: 240,
              onComplete: () => drop.destroy(),
            });
          });
        }

        this.time.delayedCall(420, () => {
          can.destroy();
          onComplete();
        });
      },
    });
  }

  _animatePlotGrow(plot) {
    this.tweens.add({
      targets: plot.container,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  _celebrateBloom(plot, extraButterfly) {
    this.confetti.burst(plot.x, plot.y - 40, 18);
    this.sound_mgr.playSparkle();
    this._spawnGardenButterfly(plot.x, plot.y - 70, extraButterfly ? 2 : 1);
    this._showGardenToast('Your flower bloomed!');
  }

  _spawnGardenButterfly(x, y, count) {
    for (let i = 0; i < count; i++) {
      const butterfly = this.add.image(x + Phaser.Math.Between(-18, 18), y + Phaser.Math.Between(-8, 8), 'butterfly')
        .setDisplaySize(34, 28)
        .setDepth(18)
        .setAlpha(0.95);

      this.tweens.add({
        targets: butterfly,
        x: x + Phaser.Math.Between(-80, 80),
        y: y - Phaser.Math.Between(30, 70),
        alpha: 0,
        scaleX: 0.6,
        scaleY: 0.6,
        duration: 1300,
        ease: 'Sine.easeOut',
        onComplete: () => butterfly.destroy(),
      });

      this.tweens.add({
        targets: butterfly,
        scaleY: { from: 1, to: 0.45 },
        duration: 160,
        yoyo: true,
        repeat: 7,
      });
    }
  }

  _showGardenToast(message) {
    if (this.gardenToast) {
      this.gardenToast.destroy();
    }

    this.gardenToast = this.add.text(
      this.stageRect.x + this.stageRect.width / 2,
      this.gardenArea.y - 42,
      message,
      {
        fontSize: '14px',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        color: '#fff7ff',
        stroke: '#2f0e55',
        strokeThickness: 4,
        backgroundColor: 'rgba(29,7,56,0.75)',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets: this.gardenToast,
      alpha: 0,
      y: this.gardenToast.y - 12,
      delay: 1000,
      duration: 500,
      onComplete: () => {
        if (this.gardenToast) {
          this.gardenToast.destroy();
          this.gardenToast = null;
        }
      },
    });
  }

  _saveGarden() {
    this.store.set('garden', this.state.garden);
    this._gardenPlots.forEach((plot) => this._drawGardenPlot(plot));
  }

  _createActionStrip() {
    const stripWidth = Math.min(this.stageRect.width - 32, this.isLandscape ? 430 : this.W - 32);
    const stripX = this.stageRect.x + this.stageRect.width / 2;

    const stripBg = this.add.graphics().setDepth(12);
    stripBg.fillStyle(0x200741, 0.8);
    stripBg.fillRoundedRect(stripX - stripWidth / 2, this.actionStripY - 32, stripWidth, 64, 22);
    stripBg.lineStyle(2, 0xffd9fb, 0.5);
    stripBg.strokeRoundedRect(stripX - stripWidth / 2, this.actionStripY - 32, stripWidth, 64, 22);

    this.categoryTitle = this.add.text(stripX, this.actionStripY - 8, '', {
      fontSize: this.isLandscape ? '20px' : '18px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#2f0e55',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(13);

    this.categoryHint = this.add.text(stripX, this.actionStripY + 16, '', {
      fontSize: this.isLandscape ? '12px' : '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd8ff',
    }).setOrigin(0.5).setDepth(13);

    const navY = this.stageBottom - (this.isLandscape ? 16 : 8);
    this.prevButton = this._createControlButton(
      this.stageRect.x + 74,
      navY,
      this.isLandscape ? 94 : 100,
      60,
      'Prev',
      () => this._cycleSelected(-1),
      { fill: 0x3D1A8E, stroke: 0xCC99FF },
    );
    this.nextButton = this._createControlButton(
      this.stageRect.x + this.stageRect.width - 74,
      navY,
      this.isLandscape ? 94 : 100,
      60,
      'Next',
      () => this._cycleSelected(1),
      { fill: 0x3D1A8E, stroke: 0xCC99FF },
    );

    const magicWidth = this.isLandscape ? 188 : Math.min(220, this.stageRect.width - 220);
    this.magicButton = this._createControlButton(
      this.stageRect.x + this.stageRect.width / 2,
      navY,
      magicWidth,
      64,
      'Surprise Me',
      () => this._magicAction(),
      { fill: 0xFF6B8A, stroke: 0xFFF1A8 },
    );

    this._refreshModeUi();
  }

  _createControlButton(x, y, width, height, label, onTap, colors) {
    const container = this.add.container(x, y).setDepth(13);
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontSize: height >= 64 ? '20px' : '18px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#2f0e55',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    const redraw = (pressed = false) => {
      bg.clear();
      bg.fillStyle(pressed ? Phaser.Display.Color.IntegerToColor(colors.fill).brighten(18).color : colors.fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
      bg.lineStyle(3, colors.stroke, pressed ? 1 : 0.85);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
    };

    redraw();
    container.add([bg, text, hit]);

    hit.on('pointerdown', () => {
      redraw(true);
      this.tweens.add({
        targets: container,
        scaleX: 0.94,
        scaleY: 0.94,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => redraw(false),
      });
      onTap();
    });

    hit.on('pointerover', () => redraw(true));
    hit.on('pointerout', () => redraw(false));

    return { container, bg, text, hit, redraw };
  }

  _createButtonPanel() {
    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0x1A064E, 0.94);

    if (this.isLandscape) {
      panel.fillRoundedRect(this.panelRect.x, this.panelRect.y, this.panelRect.width, this.panelRect.height, { tl: 28, tr: 0, bl: 28, br: 0 });
      panel.lineStyle(3, 0xCC99FF, 0.45);
      panel.strokeRoundedRect(this.panelRect.x + 1.5, this.panelRect.y + 1.5, this.panelRect.width - 3, this.panelRect.height - 3, { tl: 28, tr: 0, bl: 28, br: 0 });
    } else {
      panel.fillRoundedRect(this.panelRect.x, this.panelRect.y, this.panelRect.width, this.panelRect.height, { tl: 28, tr: 28, bl: 0, br: 0 });
      panel.lineStyle(3, 0xCC99FF, 0.45);
      panel.strokeRoundedRect(this.panelRect.x + 1.5, this.panelRect.y + 1.5, this.panelRect.width - 3, this.panelRect.height - 3, { tl: 28, tr: 28, bl: 0, br: 0 });
    }

    const heading = this.add.text(
      this.panelRect.x + this.panelRect.width / 2,
      this.panelRect.y + 26,
      'Play With Penny',
      {
        fontSize: this.isLandscape ? '18px' : '17px',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        color: '#fff4ff',
        stroke: '#2f0e55',
        strokeThickness: 3,
      },
    ).setOrigin(0.5).setDepth(11);

    this.toolButtons = [];
    const toolRowY = heading.y + 40;
    const toolGap = 10;
    const toolWidth = Math.floor((this.panelRect.width - this.panelPadding * 2 - toolGap * 2) / 3);
    TOOL_OPTIONS.forEach((tool, index) => {
      const x = this.panelRect.x + this.panelPadding + index * (toolWidth + toolGap) + toolWidth / 2;
      const button = this._createToolButton(tool, x, toolRowY, toolWidth, 42);
      this.toolButtons.push(button);
    });

    this.buttons = [];
    const gridTop = toolRowY + 44;
    const columns = this.isLandscape ? 2 : 3;
    const rows = Math.ceil(CATEGORIES.length / columns);
    const availableWidth = this.panelRect.width - this.panelPadding * 2;
    const availableHeight = this.panelRect.height - (gridTop - this.panelRect.y) - this.panelPadding - 8;
    const gapX = this.isLandscape ? 12 : 10;
    const gapY = this.isLandscape ? 12 : 10;
    const buttonWidth = Math.floor((availableWidth - gapX * (columns - 1)) / columns);
    const buttonHeight = Math.floor((availableHeight - gapY * (rows - 1)) / rows);

    CATEGORIES.forEach((cat, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = this.panelRect.x + this.panelPadding + col * (buttonWidth + gapX) + buttonWidth / 2;
      const y = gridTop + row * (buttonHeight + gapY) + buttonHeight / 2;
      const button = this._createCategoryButton(cat, x, y, buttonWidth, buttonHeight);
      this.buttons.push(button);
    });

    this._refreshCategoryButtons();
    this._refreshToolButtons();
  }

  _createToolButton(tool, x, y, width, height) {
    const container = this.add.container(x, y).setDepth(11);
    const bg = this.add.graphics();
    const label = this.add.text(0, 0, tool.label, {
      fontSize: '14px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#2f0e55',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    const redraw = (pressed = false) => {
      const selected = this.selectedTool === tool.key;
      const fill = selected ? 0xFF6B8A : 0x41207E;
      const stroke = selected ? 0xFFF1A8 : 0xCC99FF;

      bg.clear();
      bg.fillStyle(pressed ? Phaser.Display.Color.IntegerToColor(fill).brighten(18).color : fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
      bg.lineStyle(2.5, stroke, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    };

    redraw();
    container.add([bg, label, hit]);

    hit.on('pointerdown', () => {
      this._setSelectedTool(tool.key);
      redraw(true);
    });
    hit.on('pointerover', () => redraw(true));
    hit.on('pointerout', () => redraw(false));

    return { key: tool.key, redraw };
  }

  _createCategoryButton(cat, x, y, width, height) {
    const container = this.add.container(x, y).setDepth(11);
    const bg = this.add.graphics();
    const emoji = this.add.text(0, -height * 0.16, cat.emoji, {
      fontSize: `${Math.floor(height * 0.36)}px`,
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
    }).setOrigin(0.5);
    const label = this.add.text(0, height * 0.2, cat.label, {
      fontSize: `${Math.max(14, Math.floor(height * 0.16))}px`,
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#1a0a2e',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    const redraw = (state = 'idle') => {
      const isSelected = cat.key === this.selectedCategory;
      const isSpecial = !DRESSUP_KEYS.includes(cat.key);
      const fill = isSelected ? 0xFF6B8A : (isSpecial ? 0x4A238D : 0x3D1A8E);
      const stroke = isSelected ? 0xFFF1A8 : (isSpecial ? 0x8fd3ff : 0xCC99FF);
      const brighten = state === 'pressed' || state === 'hover';

      bg.clear();
      bg.fillStyle(brighten ? Phaser.Display.Color.IntegerToColor(fill).brighten(18).color : fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
      bg.lineStyle(3, stroke, brighten ? 1 : 0.82);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
    };

    redraw();
    container.add([bg, emoji, label, hit]);

    hit.on('pointerdown', () => {
      redraw('pressed');
      this._onCategoryPressed(cat.key, container);
    });
    hit.on('pointerover', () => redraw('hover'));
    hit.on('pointerout', () => redraw('idle'));

    return { key: cat.key, redraw };
  }

  _onCategoryPressed(key, container) {
    this.tweens.add({
      targets: container,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });

    if (DRESSUP_KEYS.includes(key)) {
      this._setSelectedTool('dress');
      this._setSelectedCategory(key);
      this._cycleItem(key, 1, container);
      return;
    }

    if (key === 'boo') {
      this._triggerBoo();
      this.sound_mgr.playCatMeow();
    } else if (key === 'baby') {
      this._triggerBaby();
      this.sound_mgr.playBabyGiggle();
    }

    this.confetti.burst(this.stageCenter.x, this.stageCenter.y - 50, 18);
    this.sound_mgr.playSparkle();
    this._refreshCategoryButtons();
  }

  _setSelectedTool(key) {
    this.selectedTool = key;
    this._refreshModeUi();
    this._refreshToolButtons();
    this._gardenPlots.forEach((plot) => this._drawGardenPlot(plot));
  }

  _setSelectedCategory(key) {
    if (!DRESSUP_KEYS.includes(key)) {
      return;
    }

    this.selectedCategory = key;
    this._refreshModeUi();
    this._refreshCategoryButtons();
  }

  _refreshModeUi() {
    if (!this.categoryTitle || !this.categoryHint) {
      return;
    }

    if (this.selectedTool === 'plant') {
      this.categoryTitle.setText('Plant Flower Seeds');
      this.categoryHint.setText('Tap an empty garden patch to plant a seed.');
      this.magicButton.text.setText('Plant All');
      return;
    }

    if (this.selectedTool === 'water') {
      this.categoryTitle.setText('Water The Garden');
      this.categoryHint.setText('Tap sprouts and buds to help them grow.');
      this.magicButton.text.setText('Water All');
      return;
    }

    const selected = CATEGORIES.find((cat) => cat.key === this.selectedCategory);
    this.categoryTitle.setText(`${selected?.emoji ?? ''} ${selected?.label ?? 'Outfit'}`.trim());
    this.categoryHint.setText('Tap Penny or swipe left and right to change it');
    this.magicButton.text.setText('Surprise Me');
  }

  _refreshCategoryButtons() {
    if (!this.buttons) {
      return;
    }

    this.buttons.forEach((button) => button.redraw('idle'));
  }

  _refreshToolButtons() {
    if (!this.toolButtons) {
      return;
    }

    this.toolButtons.forEach((button) => button.redraw(false));
  }

  _cycleSelected(direction) {
    this._setSelectedTool('dress');
    this._cycleItem(this.selectedCategory, direction, this.selectedCategory === 'background' ? this.bgImage : this.pennyImage);
  }

  _cycleItem(key, direction, burstTarget) {
    if (!DRESSUP_KEYS.includes(key)) {
      return;
    }

    this.state[key] = (this.state[key] + direction + ITEM_COUNT) % ITEM_COUNT;
    this.store.set(key, this.state[key]);
    this._updateItem(key, this.state[key]);
    this.sound_mgr.playPop();
    this.sound_mgr.playSparkle();

    const burstX = burstTarget?.x ?? this.stageCenter.x;
    const burstY = burstTarget?.y ?? (this.stageCenter.y - 60);
    this.confetti.burst(burstX, burstY, 18);
  }

  _magicAction() {
    if (this.selectedTool === 'plant') {
      this._plantAll();
      return;
    }

    if (this.selectedTool === 'water') {
      this._waterAll();
      return;
    }

    this._surpriseMe();
  }

  _plantAll() {
    let planted = 0;
    this.state.garden.forEach((plot, index) => {
      if (plot.stage === 0) {
        plot.stage = 1;
        plot.water = 0;
        plot.flower = Phaser.Math.Between(0, FLOWER_COLORS.length - 1);
        planted += 1;
        this._animatePlanting(this._gardenPlots[index]);
      }
    });

    if (!planted) {
      this._showGardenToast('All of your garden patches are already planted.');
      return;
    }

    this._saveGarden();
    this.sound_mgr.playPop();
    this.confetti.burst(this.gardenArea.x + this.gardenArea.width / 2, this.gardenArea.y + 10, 16);
  }

  _waterAll() {
    let watered = 0;
    this.state.garden.forEach((plot, index) => {
      if (plot.stage > 0 && plot.stage < 4) {
        plot.stage += 1;
        plot.water = Math.min(2, plot.water + 1);
        watered += 1;
        this._animatePlotGrow(this._gardenPlots[index]);
        if (plot.stage >= 4) {
          this._celebrateBloom(this._gardenPlots[index], false);
        }
      }
    });

    if (!watered) {
      this._showGardenToast('Plant some seeds first or enjoy your blooms.');
      return;
    }

    this._saveGarden();
    this.sound_mgr.playSparkle();
    this.confetti.burst(this.gardenArea.x + this.gardenArea.width / 2, this.gardenArea.y - 10, 22);
    this._bounceCharacter();
  }

  _surpriseMe() {
    DRESSUP_KEYS.forEach((key) => {
      let nextValue = Phaser.Math.Between(0, ITEM_COUNT - 1);
      if (nextValue === this.state[key]) {
        nextValue = (nextValue + 1) % ITEM_COUNT;
      }
      this.state[key] = nextValue;
      this.store.set(key, nextValue);
      this._updateItem(key, nextValue);
    });

    this.sound_mgr.playPop();
    this.sound_mgr.playSparkle();
    this.confetti.burst(this.stageCenter.x, this.stageCenter.y - 30, 42);
    this._bounceCharacter();
  }

  _handleStageGesture(pointer) {
    if (!this._pointerStart || this.selectedTool !== 'dress') {
      return;
    }

    const dx = pointer.x - this._pointerStart.x;
    const dy = pointer.y - this._pointerStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 36 && absX > absY) {
      this._cycleSelected(dx < 0 ? 1 : -1);
      return;
    }

    const duration = this.time.now - this._pointerStart.time;
    if (duration < 260 && Phaser.Math.Distance.Between(pointer.x, pointer.y, this._pointerStart.x, this._pointerStart.y) < 18) {
      this._cycleSelected(1);
    }
  }

  _updateItem(key, val) {
    let target = null;

    if (key === 'outfit') {
      target = this.outfitImage;
      this.outfitImage.setTexture(`outfit_${val}`);
    } else if (key === 'wings') {
      target = this.wingsImage;
      this.wingsImage.setTexture(`wings_${val}`);
    } else if (key === 'crown') {
      target = this.crownImage;
      this.crownImage.setTexture(`crown_${val}`);
    } else if (key === 'background') {
      this._updateBackground(val);
      return;
    }

    if (target) {
      this._bounceItem(target);
    }
  }

  _bounceItem(target) {
    const baseScaleX = target.scaleX;
    const baseScaleY = target.scaleY;

    this.tweens.add({
      targets: target,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 1.15,
      duration: 130,
      ease: 'Back.easeOut',
      yoyo: true,
    });
  }

  _bounceCharacter() {
    this.tweens.add({
      targets: [this.pennyImage, this.outfitImage, this.crownImage, this.wingsImage],
      y: '-=10',
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  _triggerBoo() {
    if (this._booActive) {
      return;
    }

    this._booActive = true;
    const groundY = this.H - (this.isLandscape ? 120 : 155);
    const leftEdge = this.stageRect.x - 80;
    const rightEdge = this.stageRect.x + this.stageRect.width + 80;

    this._booSprites.forEach((sprite) => sprite.destroy());
    this._booSprites = [];

    const butterfly = this.add.image(rightEdge - 10, groundY - 80, 'butterfly')
      .setDisplaySize(56, 46)
      .setDepth(15);
    this._booSprites.push(butterfly);

    this.tweens.add({
      targets: butterfly,
      scaleY: { from: 1, to: 0.35 },
      duration: 180,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: butterfly,
      x: leftEdge - 30,
      y: groundY - 96,
      duration: 3000,
      ease: 'Sine.easeInOut',
      onComplete: () => butterfly.destroy(),
    });

    const cat = this.add.image(leftEdge, groundY, 'boo_cat')
      .setDisplaySize(96, 86)
      .setDepth(14)
      .setFlipX(false);
    this._booSprites.push(cat);

    this.tweens.add({
      targets: cat,
      y: groundY - 12,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cat,
      x: rightEdge,
      duration: 2800,
      ease: 'Linear',
      onComplete: () => {
        cat.destroy();
        this._booActive = false;
      },
    });
  }

  _triggerBaby() {
    if (this._babyActive) {
      return;
    }

    this._babyActive = true;
    const cx = this.stageCenter.x;
    const endY = this.H - (this.isLandscape ? 180 : 220);

    this._babySprites.forEach((sprite) => sprite.destroy());
    this._heartSprites.forEach((sprite) => sprite.destroy());
    this._babySprites = [];
    this._heartSprites = [];

    const baby = this.add.image(cx, this.H + 90, 'baby_luke')
      .setDisplaySize(106, 128)
      .setDepth(16);
    this._babySprites.push(baby);

    this.tweens.add({
      targets: baby,
      y: endY,
      duration: 520,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: baby,
          angle: { from: -8, to: 8 },
          duration: 280,
          yoyo: true,
          repeat: 3,
        });

        for (let i = 0; i < 8; i++) {
          this.time.delayedCall(i * 180, () => {
            const hx = cx + Phaser.Math.Between(-78, 78);
            const hy = endY - 28;
            const heart = this.add.image(hx, hy, 'heart')
              .setDisplaySize(34, 30)
              .setDepth(17)
              .setAlpha(0.92);
            this._heartSprites.push(heart);

            this.tweens.add({
              targets: heart,
              y: hy - Phaser.Math.Between(90, 180),
              x: hx + Phaser.Math.Between(-44, 44),
              alpha: 0,
              scale: 1.35,
              duration: Phaser.Math.Between(1200, 1900),
              ease: 'Sine.easeOut',
              onComplete: () => {
                heart.destroy();
                const index = this._heartSprites.indexOf(heart);
                if (index !== -1) {
                  this._heartSprites.splice(index, 1);
                }
              },
            });
          });
        }

        this.time.delayedCall(2400, () => {
          this.tweens.add({
            targets: baby,
            y: this.H + 110,
            duration: 420,
            ease: 'Back.easeIn',
            onComplete: () => {
              baby.destroy();
              this._babyActive = false;
            },
          });
        });
      },
    });
  }

  _createGearButton() {
    const x = this.isLandscape ? this.panelRect.x + this.panelRect.width - 34 : this.W - 34;
    const y = 34;

    const gear = this.add.image(x, y, 'gear_icon')
      .setDisplaySize(42, 42)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    const baseScaleX = gear.scaleX;
    const baseScaleY = gear.scaleY;

    gear.on('pointerover', () => gear.setScale(baseScaleX * 1.15, baseScaleY * 1.15));
    gear.on('pointerout', () => gear.setScale(baseScaleX, baseScaleY));
    gear.on('pointerdown', () => this._showResetDialog());

    this.tweens.add({
      targets: gear,
      angle: 360,
      duration: 6000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  _showResetDialog() {
    const z = 50;
    const width = Math.min(340, this.W - 40);
    const height = 216;
    const x = this.W / 2;
    const y = this.H / 2;

    const overlay = this.add.rectangle(x, y, this.W, this.H, 0x000000, 0.68)
      .setDepth(z)
      .setInteractive();
    const panel = this.add.graphics().setDepth(z + 1);
    panel.fillStyle(0x2D1A4E, 1);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 24);
    panel.lineStyle(3, 0xCC99FF, 1);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 24);

    const title = this.add.text(x, y - 56, 'Reset Everything?', {
      fontSize: '24px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#3a1a5c',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(z + 2);

    const subtitle = this.add.text(x, y - 18, 'This resets outfits and the flower garden.', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ddaaff',
    }).setOrigin(0.5).setDepth(z + 2);

    const yesButton = this._createDialogButton(x - 76, y + 54, 108, 52, 'Yes', 0xFF7B7D, 0xFFFFFF, () => {
      closeAll();
      this._resetAll();
    }, z + 2);
    const noButton = this._createDialogButton(x + 76, y + 54, 108, 52, 'No', 0x3D1A8E, 0xCC99FF, () => {
      closeAll();
    }, z + 2);

    const closeAll = () => {
      [overlay, panel, title, subtitle].forEach((obj) => obj.destroy());
      [yesButton, noButton].forEach(({ container }) => container.destroy());
    };

    overlay.on('pointerdown', () => closeAll());
  }

  _createDialogButton(x, y, width, height, label, fill, stroke, onTap, depth) {
    const container = this.add.container(x, y).setDepth(depth);
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontSize: '20px',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    const draw = (pressed = false) => {
      bg.clear();
      bg.fillStyle(pressed ? Phaser.Display.Color.IntegerToColor(fill).brighten(16).color : fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      bg.lineStyle(2, stroke, 0.85);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    };

    draw();
    container.add([bg, text, hit]);

    hit.on('pointerdown', () => {
      draw(true);
      onTap();
    });
    hit.on('pointerout', () => draw(false));

    return { container };
  }

  _resetAll() {
    this.store.reset();
    this.state = {
      outfit: 0,
      wings: 0,
      crown: 0,
      background: 0,
      garden: this.store.get('garden'),
    };
    this.outfitImage.setTexture('outfit_0');
    this.wingsImage.setTexture('wings_0');
    this.crownImage.setTexture('crown_0');
    this._updateBackground(0);
    this._gardenPlots.forEach((plot) => this._drawGardenPlot(plot));
    this.sound_mgr.playReset();
    this.confetti.burst(this.stageCenter.x, this.stageCenter.y, 40);
  }
}
