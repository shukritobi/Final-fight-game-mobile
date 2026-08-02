'use strict';

(() => {
  const laneByStage = [
    { top: 558, bottom: 678 },
    { top: 552, bottom: 678 },
    { top: 520, bottom: 670 }
  ];

  function currentLane() {
    return laneByStage[Math.max(0, Math.min(laneByStage.length - 1, game.stage | 0))];
  }

  const originalUpdateBase = Fighter.prototype.updateBase;
  Fighter.prototype.updateBase = function roadOnlyUpdate(dt) {
    originalUpdateBase.call(this, dt);
    const lane = currentLane();
    this.y = clamp(this.y, lane.top, lane.bottom);
  };

  const originalResetPosition = Player.prototype.resetPosition;
  Player.prototype.resetPosition = function resetOnRoad(preserveStats = false) {
    originalResetPosition.call(this, preserveStats);
    const lane = currentLane();
    this.y = clamp(this.y || 612, lane.top + 18, lane.bottom - 12);
  };

  const originalBackground = drawBackground;
  drawBackground = function roadAdjustedBackground(stageIndex, time) {
    originalBackground(stageIndex, time);
    const lane = laneByStage[Math.max(0, Math.min(laneByStage.length - 1, stageIndex | 0))];

    ctx.save();
    const roadShade = ctx.createLinearGradient(0, lane.top - 36, 0, H);
    roadShade.addColorStop(0, 'rgba(3,8,16,0)');
    roadShade.addColorStop(.18, 'rgba(3,8,16,.07)');
    roadShade.addColorStop(1, 'rgba(2,6,14,.16)');
    ctx.fillStyle = roadShade;
    ctx.fillRect(0, lane.top - 36, W, H - lane.top + 36);

    ctx.strokeStyle = stageIndex === 2 ? 'rgba(255,192,92,.28)' : 'rgba(135,215,235,.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, lane.top - 7);
    ctx.lineTo(W, lane.top - 7);
    ctx.stroke();

    ctx.globalAlpha = .16;
    ctx.strokeStyle = '#dceaf0';
    ctx.lineWidth = 2;
    for (let x = -70; x < W + 80; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, lane.bottom - 8);
      ctx.lineTo(x + 82, lane.bottom - 8);
      ctx.stroke();
    }
    ctx.restore();
  };

  const panel = ui.overlay.querySelector('.panel');
  const comboGuide = document.createElement('section');
  comboGuide.id = 'pause-combo-guide';
  comboGuide.hidden = true;
  comboGuide.innerHTML = `
    <div class="pause-combo-title">Quick Combos</div>
    <div class="pause-combo-grid">
      <span><b>P × 4</b> Jab, Cross, Hook, Heavy</span>
      <span><b>K × 3</b> Kick, Roundhouse, Axe</span>
      <span><b>P P K</b> Dragon Kick</span>
      <span><b>K K P</b> Backfist</span>
      <span><b>← → K</b> Twist Kick</span>
      <span><b>Jump + P/K</b> Uppercut / Flying Kick</span>
    </div>`;
  panel.appendChild(comboGuide);

  const originalShowOverlay = showOverlay;
  showOverlay = function overlayWithGuide(title, body, button = 'Continue', resumeOnly = false) {
    originalShowOverlay(title, body, button, resumeOnly);
    comboGuide.hidden = title !== 'Paused';
    ui.overlay.classList.toggle('pause-mode', title === 'Paused');
  };

  const originalStartGame = startGame;
  startGame = function startWithoutGuide(mode = 'new') {
    comboGuide.hidden = true;
    ui.overlay.classList.remove('pause-mode');
    return originalStartGame(mode);
  };

  window.addEventListener('pageshow', () => {
    const lane = currentLane();
    if (typeof player !== 'undefined') player.y = clamp(player.y, lane.top, lane.bottom);
  });
})();
