'use strict';

(() => {
  const lanes = [
    { top:548, bottom:676 },
    { top:548, bottom:676 },
    { top:526, bottom:670 }
  ];

  function lane() {
    return lanes[Math.max(0, Math.min(lanes.length - 1, game.stage | 0))];
  }

  const originalUpdateBase = Fighter.prototype.updateBase;
  Fighter.prototype.updateBase = function laneBoundUpdate(dt) {
    originalUpdateBase.call(this, dt);
    const current = lane();
    this.y = clamp(this.y, current.top, current.bottom);
  };

  const originalReset = Player.prototype.resetPosition;
  Player.prototype.resetPosition = function resetOnRoad(preserveStats = false) {
    originalReset.call(this, preserveStats);
    const current = lane();
    this.y = clamp(this.y || 612, current.top + 18, current.bottom - 10);
  };

  const panel = ui.overlay.querySelector('.panel');
  let comboGuide = document.getElementById('pause-combo-guide');
  if (!comboGuide) {
    comboGuide = document.createElement('section');
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
  }

  const originalShowOverlay = showOverlay;
  showOverlay = function staticArtOverlay(title, body, button = 'Continue', resumeOnly = false) {
    originalShowOverlay(title, body, button, resumeOnly);
    const paused = title === 'Paused';
    comboGuide.hidden = !paused;
    ui.overlay.classList.toggle('pause-mode', paused);
  };

  const originalStartGame = startGame;
  startGame = function startStaticArt(mode = 'new') {
    comboGuide.hidden = true;
    ui.overlay.classList.remove('pause-mode');
    return originalStartGame(mode);
  };
})();