'use strict';

(() => {
  const art = window.NEON_SPRITE_ART;
  const backgrounds = window.NEON_BACKGROUNDS;
  if (!art || !backgrounds) return;

  const fallbackBackground = drawBackground;
  drawBackground = function enhancedBackground(stageIndex, time) {
    const index = Math.max(0, Math.min(backgrounds.length - 1, stageIndex | 0));
    const image = backgrounds[index];
    if (!image) {
      fallbackBackground(stageIndex, time);
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, W, H);

    if (index === 0) {
      const glow = ctx.createLinearGradient(0, 430, 0, H);
      glow.addColorStop(0, 'rgba(255,210,140,0)');
      glow.addColorStop(1, 'rgba(255,190,100,.055)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 420, W, H - 420);
    } else if (index === 1) {
      ctx.strokeStyle = 'rgba(166,225,255,.2)';
      ctx.lineWidth = 2;
      const offset = (time * 520) % 48;
      for (let x = -80; x < W + 80; x += 28) {
        for (let y = -40 + offset; y < H; y += 64) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 10, y + 25);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(50,150,210,.055)';
      ctx.fillRect(0, 500, W, H - 500);
    } else {
      const pulse = .03 + Math.sin(time * 1.5) * .012;
      const glow = ctx.createRadialGradient(980, 130, 20, 980, 130, 250);
      glow.addColorStop(0, `rgba(255,190,110,${pulse + .04})`);
      glow.addColorStop(1, 'rgba(255,80,150,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(700, -60, 520, 430);
    }
    ctx.restore();
  };

  const originalSpriteDraw = spriteRenderer.draw.bind(spriteRenderer);
  const stateMap = {
    idle:'idle', walk:'walk', jump:'jump',
    punch:'punch1', kick:'kick1',
    punch1:'punch1', punch2:'punch2', hook:'hook', heavyPunch:'heavyPunch',
    kick1:'kick1', roundKick:'roundKick', axeKick:'axeKick', dragonKick:'dragonKick',
    spinningBackfist:'spinningBackfist', twistKick:'twistKick', cyclone:'cyclone',
    uppercut:'uppercut', flyingKick:'flyingKick', special:'special',
    hurt:'hurt', dead:'dead'
  };

  function actorType(actor) {
    if (actor.team === 'player') return 'player';
    return ['brawler','kicker','knife','heavy','tiger','rainmaker','vex'].includes(actor.type)
      ? actor.type
      : 'brawler';
  }

  function actorState(actor) {
    if (actor.dead) return 'dead';
    if (actor.hurt > 0 && actor.attackTimer <= 0) return 'hurt';
    return stateMap[actor.state] || 'idle';
  }

  function frameIndex(actor, state, frameCount) {
    if (frameCount <= 1) return 0;
    if (state === 'idle') return Math.floor(actor.anim * .72) % frameCount;
    if (state === 'walk') return Math.floor(actor.anim * 1.18) % frameCount;
    if (state === 'jump') return actor.vz >= 0 ? 0 : Math.min(1, frameCount - 1);
    if (state === 'hurt') return Math.floor(actor.anim * 5) % frameCount;
    if (state === 'dead') {
      const progress = Math.max(0, Math.min(1, (2 - (actor.removeAt || 2)) / 2));
      return Math.min(frameCount - 1, Math.floor(progress * frameCount));
    }
    const progress = actor.attackDuration
      ? Math.max(0, Math.min(1, 1 - actor.attackTimer / actor.attackDuration))
      : 0;
    return Math.min(frameCount - 1, Math.floor(progress * frameCount));
  }

  spriteRenderer.draw = function drawRasterSprite(actor) {
    const type = actorType(actor);
    const state = actorState(actor);
    const count = art.frameCount(state);
    const frame = frameIndex(actor, state, count);
    const sprite = art.getSprite(type, state, frame);

    if (!sprite) {
      originalSpriteDraw(actor);
      return;
    }

    const scale = actor.boss
      ? 2.02
      : actor.mass > 1.45
        ? 1.72
        : actor.team === 'player'
          ? 1.66
          : 1.56;

    const drawWidth = art.frameWidth * scale;
    const drawHeight = art.frameHeight * scale;

    ctx.save();
    ctx.translate(Math.round(actor.x), Math.round(actor.y - actor.z));
    if (actor.dir < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;

    if (actor.flash > 0) {
      ctx.shadowColor = actor.team === 'player' ? '#63efff' : '#ffffff';
      ctx.shadowBlur = 14;
    }

    ctx.drawImage(sprite, -drawWidth * .5, -drawHeight + 6, drawWidth, drawHeight);
    ctx.restore();
  };

  if (typeof moveJoy === 'function') {
    moveJoy = function fasterJoystick(event) {
      const rect = joy.getBoundingClientRect();
      const centerX = rect.left + rect.width * .5;
      const centerY = rect.top + rect.height * .5;
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const maximum = rect.width * .235;
      const distance = Math.hypot(dx, dy);

      if (distance > maximum && distance > 0) {
        dx = dx / distance * maximum;
        dy = dy / distance * maximum;
      }

      const normalizedDistance = Math.min(1, Math.hypot(dx, dy) / maximum);
      const boosted = normalizedDistance < .055
        ? 0
        : .22 + .78 * ((normalizedDistance - .055) / .945);
      const directionLength = Math.hypot(dx, dy) || 1;

      input.x = dx / directionLength * boosted;
      input.y = dy / directionLength * boosted;
      stick.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    };

    joy.addEventListener('pointerrawupdate', event => {
      if (event.pointerId === joyPointer) {
        event.preventDefault();
        moveJoy(event);
      }
    }, { passive:false });
  }

  const originalPlayerUpdate = Player.prototype.update;
  Player.prototype.update = function responsivePlayerUpdate(dt) {
    this.speed = 372;
    originalPlayerUpdate.call(this, dt);
  };

  const originalGetAttackStats = Fighter.prototype.getAttackStats;
  Fighter.prototype.getAttackStats = function fasterPlayerAttacks(kind) {
    const stats = originalGetAttackStats.call(this, kind);
    if (!stats || this.team !== 'player') return stats;
    stats.duration *= .84;
    stats.range += 3;
    if (stats.active) {
      stats.active = [
        Math.max(.06, stats.active[0] * .92),
        Math.min(.78, stats.active[1] * 1.04)
      ];
    }
    return stats;
  };

  [
    ['btn-punch','punch'],
    ['btn-kick','kick'],
    ['btn-jump','jump'],
    ['btn-special','special']
  ].forEach(([id, prop]) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener('touchstart', event => {
      event.preventDefault();
      input[prop] = true;
      element.classList.add('active');
      audio.init();
    }, { passive:false, capture:true });

    element.addEventListener('touchend', event => {
      event.preventDefault();
      input[prop] = false;
      element.classList.remove('active');
    }, { passive:false, capture:true });

    element.addEventListener('touchcancel', () => {
      input[prop] = false;
      element.classList.remove('active');
    }, { passive:false, capture:true });
  });

  window.addEventListener('blur', () => {
    input.x = 0;
    input.y = 0;
    input.punch = false;
    input.kick = false;
    input.jump = false;
    input.special = false;
    if (stick) stick.style.transform = 'translate3d(0,0,0)';
  });

  document.documentElement.classList.add('raster-art-ready');
})();
