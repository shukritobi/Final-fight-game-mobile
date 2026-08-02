'use strict';

(() => {
  const coarse = navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches;
  const bgImage = new Image();
  const atlasImage = new Image();
  bgImage.decoding = 'async';
  atlasImage.decoding = 'async';

  function loadWithFallback(image, localSource, remoteSource) {
    let usingRemote = false;
    image.addEventListener('error', () => {
      if (usingRemote) return;
      usingRemote = true;
      image.src = remoteSource;
    });
    image.src = localSource;
  }

  loadWithFallback(bgImage, './assets/stage-reference.png', 'https://at.adobe.com/jg1KIANaogevi36v');
  loadWithFallback(atlasImage, './assets/fighter-atlas.jpg', 'https://at.adobe.com/54DJBFBU2flCcOmz');

  const BG_W = 640;
  const BG_H = 360;
  const backgrounds = [];
  const frameCache = new Map();
  let artReady = false;

  const atlas = {
    width: 1280,
    height: 1330,
    cellWidth: 128,
    cellHeight: 190,
    cropX: 14,
    cropY: 16,
    cropWidth: 100,
    cropHeight: 158
  };

  function makeCanvas(width, height) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d', { alpha:true, desynchronized:true });
    context.imageSmoothingEnabled = false;
    return [surface, context];
  }

  function paintRoad(context, stage) {
    const top = 206;
    const gradient = context.createLinearGradient(0, top, 0, BG_H);
    if (stage === 0) {
      gradient.addColorStop(0, '#17273a');
      gradient.addColorStop(.48, '#101d2e');
      gradient.addColorStop(1, '#07101c');
    } else if (stage === 1) {
      gradient.addColorStop(0, '#14293a');
      gradient.addColorStop(.45, '#0d2030');
      gradient.addColorStop(1, '#06131e');
    } else {
      gradient.addColorStop(0, '#26203a');
      gradient.addColorStop(.5, '#18152a');
      gradient.addColorStop(1, '#0b0a17');
    }
    context.fillStyle = gradient;
    context.fillRect(0, top, BG_W, BG_H - top);

    context.fillStyle = stage === 2 ? '#392e46' : '#233443';
    context.fillRect(0, top, BG_W, 5);
    context.fillStyle = stage === 2 ? '#9c714f' : '#557181';
    context.fillRect(0, top + 5, BG_W, 2);

    const colors = stage === 2
      ? ['rgba(255,95,145,.20)','rgba(255,188,88,.18)','rgba(126,79,194,.14)']
      : ['rgba(48,208,231,.18)','rgba(255,78,140,.14)','rgba(246,175,73,.13)'];

    for (let index = 0; index < 28; index++) {
      const x = (index * 83 + stage * 41) % BG_W;
      const y = top + 16 + ((index * 47 + stage * 23) % 126);
      const width = 15 + (index * 17) % 52;
      context.fillStyle = colors[index % colors.length];
      context.fillRect(x, y, width, index % 4 === 0 ? 3 : 1);
    }

    context.fillStyle = 'rgba(255,255,255,.055)';
    for (let y = top + 12; y < BG_H; y += 18) context.fillRect(0, y, BG_W, 1);
    context.fillStyle = 'rgba(0,0,0,.16)';
    for (let x = 0; x < BG_W; x += 48) context.fillRect(x, top, 1, BG_H - top);

    context.strokeStyle = stage === 2 ? 'rgba(255,205,104,.26)' : 'rgba(179,221,232,.20)';
    context.lineWidth = 2;
    for (let x = -20; x < BG_W + 40; x += 112) {
      context.beginPath();
      context.moveTo(x, 336);
      context.lineTo(x + 47, 336);
      context.stroke();
    }
  }

  function buildBackground(stage) {
    const [surface, context] = makeCanvas(BG_W, BG_H);
    context.fillStyle = '#080d18';
    context.fillRect(0, 0, BG_W, BG_H);

    if (bgImage.complete && bgImage.naturalWidth) {
      context.save();
      if (stage === 1) context.filter = 'brightness(.68) saturate(.86) hue-rotate(18deg)';
      if (stage === 2) context.filter = 'brightness(.62) saturate(1.06) hue-rotate(295deg)';
      const sourceY = stage === 2 ? 86 : 138;
      const sourceHeight = stage === 2 ? 360 : 368;
      context.drawImage(
        bgImage,
        0, sourceY, bgImage.naturalWidth, sourceHeight,
        0, 0, BG_W, 223
      );
      context.restore();
    }

    if (stage === 2) {
      const night = context.createLinearGradient(0, 0, 0, 145);
      night.addColorStop(0, 'rgba(13,8,32,.52)');
      night.addColorStop(1, 'rgba(65,21,67,.08)');
      context.fillStyle = night;
      context.fillRect(0, 0, BG_W, 165);
      context.fillStyle = '#181323';
      context.fillRect(0, 192, BG_W, 17);
      context.strokeStyle = 'rgba(255,188,86,.34)';
      context.lineWidth = 1;
      for (let x = 0; x < BG_W; x += 30) {
        context.beginPath();
        context.moveTo(x, 192);
        context.lineTo(x + 13, 178);
        context.lineTo(x + 27, 192);
        context.stroke();
      }
    }

    paintRoad(context, stage);
    return surface;
  }

  function rebuildBackgrounds() {
    backgrounds.length = 0;
    for (let stage = 0; stage < 3; stage++) backgrounds.push(buildBackground(stage));
    artReady = atlasImage.complete && !!atlasImage.naturalWidth;
  }

  function setLightCanvasSize() {
    const width = coarse ? 640 : 960;
    const height = coarse ? 360 : 540;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    DPR = 1;
    ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  bgImage.addEventListener('load', rebuildBackgrounds, { once:true });
  atlasImage.addEventListener('load', () => { artReady = true; }, { once:true });
  if (bgImage.complete) rebuildBackgrounds();
  if (atlasImage.complete) artReady = true;

  addEventListener('resize', () => requestAnimationFrame(setLightCanvasSize), { passive:true });
  window.visualViewport?.addEventListener('resize', () => requestAnimationFrame(setLightCanvasSize), { passive:true });
  setLightCanvasSize();
  setTimeout(setLightCanvasSize, 60);

  const PLAYER = {
    idle:[[0,0],[2,0],[4,0],[6,0],[8,0]],
    walk:[[0,1],[1,1],[2,1],[3,1]],
    punch1:[[0,2],[1,2]], punch2:[[1,2],[2,2]], hook:[[2,2],[3,2]], heavyPunch:[[1,2],[2,2],[3,2]],
    kick1:[[0,3],[1,3]], roundKick:[[1,3],[2,3],[3,3]], axeKick:[[0,4],[1,4],[2,4]],
    dragonKick:[[0,3],[1,3],[2,3],[3,3]], spinningBackfist:[[4,4],[5,4],[6,4]],
    twistKick:[[0,3],[1,3],[2,3],[3,3],[0,4]], cyclone:[[4,4],[5,4],[6,4],[7,4]],
    uppercut:[[0,2],[1,2],[2,2],[3,2]], flyingKick:[[0,3],[1,3],[2,3],[3,3]],
    special:[[4,6],[5,6],[6,6]], jump:[[0,4],[3,3]], hurt:[[1,4],[2,4]], dead:[[2,5],[3,5]]
  };

  const TYPE_SETS = {
    brawler:{ idle:[[4,2],[5,2],[6,2]], walk:[[4,2],[5,2],[6,2]], attack:[[6,2],[7,2],[8,2]], hurt:[[1,5],[2,5]], dead:[[2,5],[3,5]] },
    kicker:{ idle:[[5,4],[6,4],[7,4]], walk:[[5,4],[6,4],[7,4]], attack:[[7,4],[8,4],[9,4]], hurt:[[1,4],[2,4]], dead:[[2,5],[3,5]] },
    knife:{ idle:[[6,5],[7,5]], walk:[[6,5],[7,5]], attack:[[6,5],[7,5],[8,5]], hurt:[[8,5],[9,5]], dead:[[2,5],[3,5]] },
    heavy:{ idle:[[0,5],[1,5]], walk:[[0,5],[1,5]], attack:[[1,5],[2,5],[3,5]], hurt:[[2,5],[3,5]], dead:[[2,5],[3,5]] },
    tiger:{ idle:[[1,6],[2,6]], walk:[[1,6],[2,6]], attack:[[2,6],[3,6],[4,6]], hurt:[[5,6],[6,6]], dead:[[2,5],[3,5]] },
    rainmaker:{ idle:[[7,5],[8,5]], walk:[[7,5],[8,5]], attack:[[7,5],[8,5],[9,5]], hurt:[[8,5],[9,5]], dead:[[2,5],[3,5]] },
    vex:{ idle:[[0,6],[1,6]], walk:[[0,6],[1,6]], attack:[[2,6],[3,6],[4,6]], hurt:[[5,6],[6,6]], dead:[[2,5],[3,5]] }
  };

  function actorState(actor) {
    if (actor.dead) return 'dead';
    if (actor.hurt > 0 && actor.attackTimer <= 0) return 'hurt';
    if (actor.state === 'walk') return 'walk';
    if (actor.state === 'jump') return 'jump';
    if (actor.attackTimer > 0) return actor.state;
    return 'idle';
  }

  function cellsFor(actor, state) {
    if (actor.team === 'player') return PLAYER[state] || PLAYER.idle;
    const set = TYPE_SETS[actor.type] || TYPE_SETS.brawler;
    if (state === 'dead') return set.dead;
    if (state === 'hurt') return set.hurt;
    if (state === 'walk') return set.walk;
    if (actor.attackTimer > 0) return set.attack;
    return set.idle;
  }

  function frameNumber(actor, state, cells) {
    if (cells.length <= 1) return 0;
    if (actor.attackTimer > 0) {
      const progress = clamp(1 - actor.attackTimer / Math.max(.001, actor.attackDuration), 0, .999);
      return Math.min(cells.length - 1, Math.floor(progress * cells.length));
    }
    if (state === 'walk') return Math.floor(actor.anim * .72) % cells.length;
    if (state === 'idle') return Math.floor(actor.anim * .34) % cells.length;
    return Math.floor(actor.anim * .55) % cells.length;
  }

  function getFrame(col, row) {
    const key = `${col}:${row}`;
    if (frameCache.has(key)) return frameCache.get(key);
    if (!artReady) return null;

    const [surface, context] = makeCanvas(112, 172);
    const sx = col * atlas.cellWidth + atlas.cropX;
    const sy = row * atlas.cellHeight + atlas.cropY;

    context.save();
    context.beginPath();
    context.roundRect(2, 1, 108, 168, 22);
    context.clip();
    context.fillStyle = '#101722';
    context.fillRect(0, 0, 112, 172);
    context.globalCompositeOperation = 'multiply';
    context.globalAlpha = .92;
    context.drawImage(atlasImage, sx, sy, atlas.cropWidth, atlas.cropHeight, 6, 6, 100, 158);
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = .52;
    context.filter = 'contrast(1.08) saturate(1.15)';
    context.drawImage(atlasImage, sx, sy, atlas.cropWidth, atlas.cropHeight, 6, 6, 100, 158);
    context.restore();

    context.globalCompositeOperation = 'destination-in';
    const mask = context.createRadialGradient(56, 88, 32, 56, 88, 88);
    mask.addColorStop(0, 'rgba(255,255,255,1)');
    mask.addColorStop(.72, 'rgba(255,255,255,.98)');
    mask.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = mask;
    context.fillRect(0, 0, 112, 172);
    context.globalCompositeOperation = 'source-over';

    frameCache.set(key, surface);
    return surface;
  }

  window.drawBackground = function drawStaticBackground(stageIndex, time) {
    const index = clamp(stageIndex | 0, 0, 2);
    const background = backgrounds[index];
    if (background) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(background, 0, 0, background.width, background.height, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#09111f';
      ctx.fillRect(0, 0, W, H);
    }

    if (index === 1) {
      ctx.strokeStyle = 'rgba(170,225,255,.15)';
      ctx.lineWidth = 2;
      const offset = (time * 380) % 84;
      for (let n = 0; n < 16; n++) {
        const x = (n * 83 + offset * .4) % (W + 80) - 40;
        const y = (n * 107 + offset) % H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 22);
        ctx.stroke();
      }
    }
  };

  window.spriteRenderer = {
    draw(actor) {
      const state = actorState(actor);
      const cells = cellsFor(actor, state);
      const cell = cells[frameNumber(actor, state, cells)] || cells[0];
      const frame = getFrame(cell[0], cell[1]);
      if (!frame) {
        ctx.fillStyle = actor.team === 'player' ? '#e7e3d2' : actor.color;
        ctx.fillRect(actor.x - 20, actor.y - actor.z - 88, 40, 88);
        return;
      }

      const scale = actor.boss ? 1.52 : actor.mass > 1.4 ? 1.36 : actor.team === 'player' ? 1.36 : 1.24;
      const width = frame.width * scale;
      const height = frame.height * scale;
      ctx.save();
      ctx.translate(Math.round(actor.x), Math.round(actor.y - actor.z));
      if (actor.dir < 0) ctx.scale(-1, 1);
      ctx.globalAlpha = actor.dead ? .72 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, -width * .5, -height + 12, width, height);
      ctx.restore();
    }
  };

  window.NEON_PERFORMANCE = {
    mobile: coarse,
    targetFrameMs: coarse ? 33.3 : 16.7,
    maxParticles: coarse ? 24 : 42,
    resize: setLightCanvasSize
  };
})();