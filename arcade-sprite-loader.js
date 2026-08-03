'use strict';

(() => {
  const FRAME_W = 96;
  const FRAME_H = 112;
  const SPRITE_URL = './assets/sprites/rafi.webp?v=arcade2';
  const sprite = new Image();
  sprite.decoding = 'async';
  const frameCache = new Map();
  let retried = false;

  const palettes = {
    player: null,
    brawler: '#b72d35',
    kicker: '#7047c8',
    knife: '#2b824c',
    heavy: '#d57224',
    tiger: '#d83a31',
    rainmaker: '#315baf',
    vex: '#342847'
  };

  const playerFrames = {
    idle:[[0,0],[1,0],[2,0],[3,0]],
    walk:[[0,0],[1,0],[2,0],[3,0]],
    jump:[[1,3]],
    punch1:[[0,1],[1,1]], punch2:[[1,1],[3,1]], hook:[[2,1],[3,1]], heavyPunch:[[1,1],[3,1]],
    kick1:[[0,2]], roundKick:[[1,2]], axeKick:[[2,2]], dragonKick:[[0,2],[3,2]],
    spinningBackfist:[[1,2],[2,2]], twistKick:[[0,2],[1,2],[3,2]], cyclone:[[0,2],[1,2],[3,2],[1,2]],
    uppercut:[[0,1],[2,2]], flyingKick:[[1,3],[3,2]], special:[[0,1],[1,2],[2,2],[3,2]],
    hurt:[[2,3]], dead:[[3,3]]
  };

  const enemyFrames = {
    idle:[[0,0],[1,0]],
    walk:[[0,0],[1,0],[2,0],[3,0]],
    attack:[[0,1],[1,1],[2,1],[3,1]],
    kick:[[0,2],[1,2],[2,2]],
    hurt:[[2,3]],
    dead:[[3,3]],
    special:[[0,1],[1,2],[2,2],[3,2]]
  };

  function stateFor(actor) {
    if (actor.dead) return 'dead';
    if (actor.hurt > 0 && actor.attackTimer <= 0) return 'hurt';
    if (actor.attackTimer > 0) return actor.state;
    if (actor.state === 'walk') return 'walk';
    if (actor.state === 'jump' || actor.z > 8) return 'jump';
    return 'idle';
  }

  function keyFor(actor) {
    return actor.team === 'player' ? 'player' : (palettes[actor.type] !== undefined ? actor.type : 'brawler');
  }

  function framesFor(actor, state) {
    if (actor.team === 'player') return playerFrames[state] || playerFrames.idle;
    if (state === 'dead') return enemyFrames.dead;
    if (state === 'hurt') return enemyFrames.hurt;
    if (state === 'walk') return enemyFrames.walk;
    if (state === 'special') return enemyFrames.special;
    if (actor.attackTimer > 0) return /kick|axe|dragon|twist|flying/i.test(state) ? enemyFrames.kick : enemyFrames.attack;
    return enemyFrames.idle;
  }

  function frameNumber(actor, state, frames) {
    if (frames.length <= 1) return 0;
    if (actor.attackTimer > 0) {
      const progress = clamp(1 - actor.attackTimer / Math.max(.001, actor.attackDuration), 0, .999);
      return Math.min(frames.length - 1, Math.floor(progress * frames.length));
    }
    const rate = state === 'walk' ? .72 : .28;
    return Math.floor(actor.anim * rate) % frames.length;
  }

  function cachedFrame(type, col, row) {
    const cacheKey = `${type}:${col}:${row}`;
    if (frameCache.has(cacheKey)) return frameCache.get(cacheKey);

    const surface = document.createElement('canvas');
    surface.width = FRAME_W;
    surface.height = FRAME_H;
    const context = surface.getContext('2d', { alpha:true, desynchronized:true });
    context.imageSmoothingEnabled = true;
    context.drawImage(sprite, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);

    const tint = palettes[type];
    if (tint) {
      context.globalCompositeOperation = 'source-atop';
      context.globalAlpha = type === 'heavy' ? .30 : .23;
      context.fillStyle = tint;
      context.fillRect(0, 0, FRAME_W, FRAME_H);
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
    }

    frameCache.set(cacheKey, surface);
    return surface;
  }

  function draw(actor) {
    if (!sprite.complete || !sprite.naturalWidth) return;
    const type = keyFor(actor);
    const state = stateFor(actor);
    const frames = framesFor(actor, state);
    const cell = frames[frameNumber(actor, state, frames)] || frames[0];
    const frame = cachedFrame(type, cell[0], cell[1]);

    const baseScale = actor.team === 'player' ? 1.72 : 1.58;
    const scale = actor.boss ? 1.16 : actor.mass > 1.4 ? 1.10 : 1;
    const width = FRAME_W * baseScale * scale;
    const height = FRAME_H * baseScale * scale;
    const bob = state === 'walk' ? Math.sin(actor.anim * 1.65) * 2 : 0;

    ctx.save();
    ctx.translate(Math.round(actor.x), Math.round(actor.y - actor.z + bob));
    if (actor.dir < 0) ctx.scale(-1, 1);
    ctx.globalAlpha = actor.dead ? .72 : 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, -width * .5, -height + 9, width, height);
    if (actor.flash > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp(actor.flash * 4, 0, .5);
      ctx.drawImage(frame, -width * .5, -height + 9, width, height);
    }
    ctx.restore();
  }

  function unlockMenu() {
    document.body.classList.add('clean-sprites-ready', 'arcade-art-ready');
    if (ui.start) {
      ui.start.disabled = false;
      ui.start.textContent = 'New game';
    }
    if (ui.continue) ui.continue.disabled = false;
    if (typeof updateContinueButton === 'function') updateContinueButton();
  }

  sprite.addEventListener('load', () => {
    frameCache.clear();
    if (window.ArcadeArt) {
      Object.keys(window.ArcadeArt.sheets || {}).forEach(key => {
        window.ArcadeArt.sheets[key].x = 0;
        window.ArcadeArt.sheets[key].y = 0;
      });
      if (window.ArcadeArt.atlas && window.ArcadeArt.atlas.src !== sprite.src) {
        window.ArcadeArt.atlas.src = sprite.src;
      }
    }
    window.spriteRenderer = { draw };
    window.NEON_SPRITE_READY = true;
    unlockMenu();
  }, { once:true });

  sprite.addEventListener('error', () => {
    if (!retried) {
      retried = true;
      sprite.src = `./assets/sprites/rafi.webp?v=arcade2-retry-${Date.now()}`;
      return;
    }
    console.error('Clean fighter sprite sheet failed to load after retry.');
    if (ui.start) {
      ui.start.disabled = false;
      ui.start.textContent = 'New game';
    }
  });

  sprite.src = SPRITE_URL;
  if (window.ArcadeArt?.atlas) window.ArcadeArt.atlas.src = SPRITE_URL;
})();
