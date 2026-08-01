'use strict';

function segment(x1, y1, x2, y2, width, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = Math.max(2, width * .16);
  ctx.beginPath();
  ctx.moveTo(x1 - 2, y1 - 2);
  ctx.lineTo(x2 - 2, y2 - 2);
  ctx.stroke();
}

function hand(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
}

function foot(x, y, color, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  roundRect(-9, -3, 25, 10, 5, true);
  ctx.fillStyle = 'rgba(255,255,255,.38)';
  ctx.fillRect(4, -1, 8, 2);
  ctx.restore();
}

function drawActor(a) {
  const px = a.x;
  const py = a.y - a.z;
  const walking = a.state === 'walk';
  const striking = a.state === 'punch';
  const kicking = a.state === 'kick';
  const powered = a.state === 'special';
  const cycle = a.anim;
  const bob = walking ? Math.sin(cycle) * 3 : Math.sin(cycle * .5) * 1.5;
  const stride = walking ? Math.sin(cycle) * 12 : 0;
  const action = a.attackDuration ? 1 - a.attackTimer / a.attackDuration : 0;
  const reach = striking ? easeOut(clamp(action, 0, 1)) : 0;
  const kickArc = kicking ? Math.sin(clamp(action * 1.25, 0, 1) * Math.PI) : 0;
  const spin = powered ? Math.sin(action * Math.PI * 2) : 0;

  ctx.save();
  ctx.translate(px, py);
  if (a.dir < 0) ctx.scale(-1, 1);
  if (a.dead) ctx.rotate(-.55 - 1.15 * clamp(a.z / 100, 0, 1));
  ctx.translate(0, bob);
  if (a.hurt > 0) ctx.rotate(-.08);

  if (a.boss || powered) {
    const aura = ctx.createRadialGradient(0, -58, 8, 0, -58, a.boss ? 96 : 116);
    aura.addColorStop(0, a.accent);
    aura.addColorStop(1, 'transparent');
    ctx.globalAlpha = a.boss ? .17 : .27;
    ctx.fillStyle = aura;
    ctx.fillRect(-120, -180, 240, 225);
    ctx.globalAlpha = 1;
  }

  segment(-10 + stride * .35, -42, -18 - stride, -2, 19, '#18233c');
  foot(-18 - stride, -1, a.accent);

  const body = ctx.createLinearGradient(-28, -112, 30, -44);
  body.addColorStop(0, a.color);
  body.addColorStop(1, '#11172b');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-27, -106);
  ctx.quadraticCurveTo(0, -122, 28, -105);
  ctx.lineTo(23, -48);
  ctx.quadraticCurveTo(0, -35, -25, -49);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, -103);
  ctx.lineTo(-8, -53);
  ctx.stroke();

  ctx.fillStyle = a.accent;
  ctx.fillRect(-25, -55, 49, 7);
  ctx.fillStyle = 'rgba(255,255,255,.48)';
  ctx.fillRect(-2, -55, 8, 7);

  if (kicking || powered) {
    const ex = 45 + kickArc * 58 + Math.abs(spin) * 45;
    const ey = -36 - kickArc * 24;
    segment(12, -45, ex, ey, 20, '#22304a');
    foot(ex, ey, a.accent, 1.2);
  } else {
    segment(12 - stride * .2, -44, 18 + stride, -1, 20, '#22304a');
    foot(18 + stride, -1, a.accent);
  }

  if (striking) {
    segment(17, -93, 42 + reach * 56, -86 - reach * 5, 16, a.color);
    hand(44 + reach * 58, -86 - reach * 5, a.accent);
    segment(-18, -93, -30, -61, 15, a.color);
    hand(-31, -58, a.accent);
  } else if (powered) {
    segment(18, -94, 55 + spin * 45, -70, 16, a.color);
    hand(58 + spin * 45, -68, a.accent);
    segment(-18, -94, -50 - spin * 45, -72, 16, a.color);
    hand(-52 - spin * 45, -70, a.accent);
  } else {
    segment(17, -94, 29, -64 + Math.sin(cycle * .7) * 4, 16, a.color);
    hand(30, -61, a.accent);
    segment(-18, -94, -30, -67 - Math.sin(cycle * .7) * 4, 15, a.color);
    hand(-30, -63, a.accent);
  }

  if (a.weapon) {
    ctx.save();
    ctx.translate(30, -62);
    ctx.rotate(striking ? -.55 : -.2);
    ctx.fillStyle = a.weapon === 'staff' ? '#cda96b' : a.weapon === 'knife' ? '#d7f2ff' : a.weapon === 'pipe' ? '#a6bac4' : '#8c5a35';
    roundRect(0, -4, a.weapon === 'knife' ? 42 : 68, 8, 4, true);
    if (a.weapon === 'knife') {
      ctx.fillStyle = '#405060';
      ctx.fillRect(-10, -6, 14, 12);
    }
    ctx.restore();
  }

  ctx.fillStyle = '#b97754';
  ctx.beginPath();
  ctx.arc(0, -126, a.boss ? 22 : 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = a.type === 'vex' ? '#eee8d9' : '#10111b';
  ctx.beginPath();
  ctx.arc(0, -132, a.boss ? 23 : 20, Math.PI, Math.PI * 2);
  ctx.lineTo(18, -126);
  ctx.quadraticCurveTo(2, -136, -18, -126);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(7, -128, 7, 3);
  ctx.fillStyle = a.accent;
  ctx.fillRect(9, -128, 3, 2);

  if (a.boss) {
    ctx.fillStyle = a.accent;
    ctx.fillRect(-27, -112, 54, 5);
    ctx.globalAlpha = .6;
    ctx.fillRect(-13, -153, 26, 4);
    ctx.globalAlpha = 1;
  }
  if (a.flash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = .8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-100, -180, 220, 210);
  }
  ctx.restore();
}

function draw() {
  ctx.save();
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  const sx = game.shake ? rand(-game.shake, game.shake) : 0;
  const sy = game.shake ? rand(-game.shake * .5, game.shake * .5) : 0;
  ctx.translate(sx, sy);
  drawBackground(Math.min(game.stage, stages.length - 1), game.elapsed);

  const actors = [...game.enemies, player].sort((a, b) => a.y - b.y);
  for (const a of actors) {
    ctx.save();
    ctx.globalAlpha = a.dead ? .45 : .35;
    ctx.fillStyle = '#02040a';
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 2, a.boss ? 52 : 35, a.boss ? 15 : 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  game.pickups.forEach(item => item.draw());
  actors.forEach(drawActor);

  for (const p of game.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / .45, 0, 1);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.type === 'line') {
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * .035, p.y - p.vy * .035);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const label of game.texts) {
    ctx.save();
    ctx.globalAlpha = label.life / label.max;
    ctx.fillStyle = label.color;
    ctx.font = '1000 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText(label.text, label.x, label.y);
    ctx.restore();
  }

  if (game.transition > 0) {
    game.transition = Math.max(0, game.transition - 1 / 60);
    const h = 55 * clamp(game.transition, 0, 1);
    ctx.fillStyle = '#03040a';
    ctx.fillRect(0, 0, W, h);
    ctx.fillRect(0, H - h, W, h);
  }
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(.033, (now - game.last) / 1000 || 0);
  game.last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
addEventListener('contextmenu', event => event.preventDefault());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
