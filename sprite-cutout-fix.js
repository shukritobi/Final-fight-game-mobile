'use strict';

(() => {
  const atlasImage = new Image();
  atlasImage.decoding = 'async';
  atlasImage.crossOrigin = 'anonymous';

  const CELL_WIDTH = 128;
  const CELL_HEIGHT = 190;
  const frameCache = new Map();
  let ready = false;

  const PLAYER = {
    idle:[[4,2],[5,2],[6,2],[7,2],[8,2]],
    walk:[[4,3],[5,3],[6,3],[7,3],[8,3]],
    punch1:[[4,2],[5,5]], punch2:[[5,5],[6,2]], hook:[[6,2],[7,2]], heavyPunch:[[7,2],[8,2]],
    kick1:[[9,2],[0,3]], roundKick:[[0,3],[4,6]], axeKick:[[4,6],[5,6]],
    dragonKick:[[9,2],[0,3],[4,6]], spinningBackfist:[[5,4],[6,4]],
    twistKick:[[9,2],[0,3],[4,6],[5,6]], cyclone:[[5,4],[6,4],[5,4],[6,4]],
    uppercut:[[4,2],[5,5],[6,2]], flyingKick:[[9,2],[0,3]],
    special:[[5,5],[9,2]], jump:[[9,2]], hurt:[[5,4],[6,4]], dead:[[9,5]]
  };

  const TYPE_SETS = {
    brawler:{ idle:[[4,1]], walk:[[4,1],[5,1]], attack:[[5,1],[8,1]], hurt:[[5,4]], dead:[[9,5]] },
    kicker:{ idle:[[1,6],[2,6]], walk:[[1,6],[2,6]], attack:[[3,6],[4,6]], hurt:[[5,4]], dead:[[9,5]] },
    knife:{ idle:[[6,5]], walk:[[6,5]], attack:[[6,5]], hurt:[[5,4]], dead:[[9,5]] },
    heavy:{ idle:[[1,5]], walk:[[1,5]], attack:[[3,4],[4,4]], hurt:[[1,5]], dead:[[2,5]] },
    tiger:{ idle:[[1,6],[2,6]], walk:[[1,6],[2,6]], attack:[[3,6],[4,6]], hurt:[[5,4]], dead:[[9,5]] },
    rainmaker:{ idle:[[7,5]], walk:[[7,5]], attack:[[7,5]], hurt:[[8,5]], dead:[[9,5]] },
    vex:{ idle:[[0,6]], walk:[[0,6]], attack:[[0,6]], hurt:[[8,5]], dead:[[9,5]] }
  };

  function makeCanvas(width, height) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d', { alpha:true, desynchronized:true });
    context.imageSmoothingEnabled = false;
    return [surface, context];
  }

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

  function median(values) {
    if (!values.length) return 72;
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length * .5)];
  }

  function estimateBackgroundRows(data, width, height) {
    const rows = new Array(height);
    let fallback = [76, 73, 77];

    for (let y = 0; y < height; y++) {
      const red = [], green = [], blue = [];
      const sample = x => {
        const index = (y * width + x) * 4;
        const r = data[index], g = data[index + 1], b = data[index + 2];
        const maximum = Math.max(r, g, b);
        const minimum = Math.min(r, g, b);
        const chroma = maximum - minimum;
        const luminance = r * .2126 + g * .7152 + b * .0722;
        if (luminance > 24 && luminance < 165 && chroma < 42) {
          red.push(r); green.push(g); blue.push(b);
        }
      };

      for (let x = 5; x < 25; x += 2) sample(x);
      for (let x = width - 25; x < width - 5; x += 2) sample(x);
      if (red.length >= 5) fallback = [median(red), median(green), median(blue)];
      rows[y] = fallback.slice();
    }

    return rows.map((_, y) => {
      let r = 0, g = 0, b = 0, count = 0;
      for (let offset = -3; offset <= 3; offset++) {
        const row = rows[clamp(y + offset, 0, height - 1)];
        r += row[0]; g += row[1]; b += row[2]; count++;
      }
      return [r / count, g / count, b / count];
    });
  }

  function recolorPlayerGi(data, width, height) {
    for (let y = 32; y < Math.min(122, height); y++) {
      for (let x = 22; x < Math.min(width - 18, 108); x++) {
        const index = (y * width + x) * 4;
        if (data[index + 3] < 70) continue;
        const r = data[index], g = data[index + 1], b = data[index + 2];
        const maximum = Math.max(r, g, b);
        const minimum = Math.min(r, g, b);
        const chroma = maximum - minimum;
        const luminance = r * .2126 + g * .7152 + b * .0722;
        if (chroma < 34 && luminance > 28 && luminance < 118) {
          const value = clamp(166 + luminance * .58, 178, 238);
          data[index] = value;
          data[index + 1] = value - 4;
          data[index + 2] = value - 12;
        }
      }
    }
  }

  function isolateDominantFighter(imageData, width, height, playerGi) {
    const data = imageData.data;
    const backgroundRows = estimateBackgroundRows(data, width, height);

    for (let y = 0; y < height; y++) {
      const background = backgroundRows[y];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index], g = data[index + 1], b = data[index + 2];
        const dr = r - background[0], dg = g - background[1], db = b - background[2];
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        const luminance = r * .2126 + g * .7152 + b * .0722;
        const maximum = Math.max(r, g, b);
        const minimum = Math.min(r, g, b);
        const chroma = maximum - minimum;
        let alpha = clamp((distance - 16) / 34 * 255, 0, 255);

        if (luminance < 8) alpha = 0;
        if (chroma < 15 && distance < 52) alpha *= .48;
        if (y < 17 && (x < 45 || luminance < 25)) alpha = 0;
        data[index + 3] = alpha;
      }
    }

    const count = width * height;
    const visited = new Uint8Array(count);
    const labels = new Int16Array(count);
    const queue = new Int32Array(count);
    const components = [];
    let label = 0;

    for (let start = 0; start < count; start++) {
      if (visited[start] || data[start * 4 + 3] < 82) continue;
      label++;
      let head = 0, tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      let area = 0, sumX = 0, sumY = 0;
      let minX = width, minY = height, maxX = 0, maxY = 0;

      while (head < tail) {
        const point = queue[head++];
        labels[point] = label;
        const x = point % width;
        const y = (point / width) | 0;
        area++; sumX += x; sumY += y;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);

        const neighbours = [point - 1, point + 1, point - width, point + width];
        for (let n = 0; n < 4; n++) {
          const next = neighbours[n];
          if (next < 0 || next >= count || visited[next]) continue;
          const nextX = next % width;
          if ((n === 0 || n === 1) && Math.abs(nextX - x) !== 1) continue;
          if (data[next * 4 + 3] < 82) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }

      const centreX = sumX / area;
      const centreY = sumY / area;
      const sideTouch = minX < 3 || maxX > width - 4 || minY < 3;
      const centreBias = 1 / (1 + Math.abs(centreX - width * .5) / width * 2.6);
      const verticalBias = 1 / (1 + Math.abs(centreY - height * .56) / height);
      const score = area * centreBias * verticalBias * (sideTouch ? .14 : 1);
      components.push({ label, area, minX, minY, maxX, maxY, sideTouch, score });
    }

    components.sort((a, b) => b.score - a.score);
    if (!components.length) return null;

    const primary = components[0];
    const keepLabels = new Set([primary.label]);
    for (let index = 1; index < components.length; index++) {
      const component = components[index];
      const nearby = !(
        component.maxX < primary.minX - 11 || component.minX > primary.maxX + 11 ||
        component.maxY < primary.minY - 11 || component.minY > primary.maxY + 11
      );
      if (nearby && component.area > 12 && !component.sideTouch) keepLabels.add(component.label);
    }

    const keep = new Uint8Array(count);
    for (let index = 0; index < count; index++) {
      if (keepLabels.has(labels[index])) keep[index] = 1;
    }

    const dilated = new Uint8Array(count);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const point = y * width + x;
        if (!keep[point]) continue;
        for (let oy = -2; oy <= 2; oy++) {
          const py = y + oy;
          if (py < 0 || py >= height) continue;
          for (let ox = -2; ox <= 2; ox++) {
            const px = x + ox;
            if (px < 0 || px >= width) continue;
            dilated[py * width + px] = 1;
          }
        }
      }
    }

    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let index = 0; index < count; index++) {
      if (!dilated[index]) {
        data[index * 4 + 3] = 0;
        continue;
      }
      if (data[index * 4 + 3] < 8) continue;
      const x = index % width;
      const y = (index / width) | 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }

    if (playerGi) recolorPlayerGi(data, width, height);
    if (maxX < minX || maxY < minY) return null;
    return { minX, minY, maxX, maxY };
  }

  function getFrame(cell, playerGi) {
    const col = cell[0], row = cell[1];
    const key = `${col}:${row}:${playerGi ? 'p' : 'e'}`;
    if (frameCache.has(key)) return frameCache.get(key);
    if (!ready) return null;

    const [raw, rawContext] = makeCanvas(CELL_WIDTH, CELL_HEIGHT);
    rawContext.drawImage(
      atlasImage,
      col * CELL_WIDTH, row * CELL_HEIGHT,
      CELL_WIDTH, CELL_HEIGHT,
      0, 0, CELL_WIDTH, CELL_HEIGHT
    );

    let imageData;
    try {
      imageData = rawContext.getImageData(0, 0, raw.width, raw.height);
    } catch (error) {
      console.warn('Sprite cutout unavailable', error);
      return null;
    }

    const bounds = isolateDominantFighter(imageData, raw.width, raw.height, playerGi);
    if (!bounds) return null;
    rawContext.clearRect(0, 0, raw.width, raw.height);
    rawContext.putImageData(imageData, 0, 0);

    const [surface, context] = makeCanvas(112, 172);
    const sourceWidth = bounds.maxX - bounds.minX + 1;
    const sourceHeight = bounds.maxY - bounds.minY + 1;
    const scale = Math.min(104 / sourceWidth, 164 / sourceHeight);
    const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
    const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
    const drawX = Math.round((surface.width - drawWidth) * .5);
    const drawY = Math.round(surface.height - drawHeight - 3);
    context.drawImage(
      raw,
      bounds.minX, bounds.minY, sourceWidth, sourceHeight,
      drawX, drawY, drawWidth, drawHeight
    );

    frameCache.set(key, surface);
    return surface;
  }

  atlasImage.addEventListener('load', () => {
    ready = true;
    frameCache.clear();
  }, { once:true });
  atlasImage.src = './assets/fighter-atlas.jpg';
  if (atlasImage.complete && atlasImage.naturalWidth) ready = true;

  window.spriteRenderer = {
    draw(actor) {
      if (!ready) return;
      const state = actorState(actor);
      const cells = cellsFor(actor, state);
      const cell = cells[frameNumber(actor, state, cells)] || cells[0];
      const frame = getFrame(cell, actor.team === 'player');
      if (!frame) return;

      const scale = actor.boss ? 1.48 : actor.mass > 1.4 ? 1.34 : actor.team === 'player' ? 1.34 : 1.22;
      const width = frame.width * scale;
      const height = frame.height * scale;
      const walkingBob = state === 'walk' ? Math.sin(actor.anim * 1.7) * 2 : 0;
      ctx.save();
      ctx.translate(Math.round(actor.x), Math.round(actor.y - actor.z + walkingBob));
      if (actor.dir < 0) ctx.scale(-1, 1);
      ctx.globalAlpha = actor.dead ? .72 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, -width * .5, -height + 12, width, height);
      ctx.restore();
    }
  };
})();
