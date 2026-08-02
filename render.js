'use strict';

function drawImpactStar(particle, progress) {
  const outer = particle.size * (.72 + progress * .62);
  const inner = outer * .34;
  const spikes = particle.spikes || 8;
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(progress * .35);
  ctx.beginPath();
  for (let index = 0; index < spikes * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = index / (spikes * 2) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = particle.color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawParticle(particle) {
  const progress = 1 - particle.life / particle.max;
  const alpha = clamp(particle.life / particle.max, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (particle.type === 'line' || particle.type === 'shard') {
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = particle.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    const factor = particle.type === 'shard' ? .045 : .03;
    ctx.lineTo(particle.x - particle.vx * factor, particle.y - particle.vy * factor);
    ctx.stroke();
  } else if (particle.type === 'star') {
    drawImpactStar(particle, progress);
  } else if (particle.type === 'ring') {
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = Math.max(1, 4 * (1 - progress));
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (.25 + progress), 0, Math.PI * 2);
    ctx.stroke();
  } else if (particle.type === 'dust') {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha * .25;
    ctx.beginPath();
    ctx.ellipse(particle.x, particle.y, particle.size * (1 + progress), particle.size * .42, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size * .5, particle.y - particle.size * .5, particle.size, particle.size);
  }
  ctx.restore();
}

function drawFloatingText(label) {
  ctx.save();
  ctx.globalAlpha = clamp(label.life / label.max, 0, 1);
  ctx.translate(label.x, label.y);
  ctx.rotate(label.rotation || 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `1000 ${label.size || 22}px ui-sans-serif,system-ui,sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = label.impact ? 7 : 4;
  ctx.strokeStyle = '#111326';
  ctx.strokeText(label.text, 0, 0);
  ctx.fillStyle = label.color;
  ctx.fillText(label.text, 0, 0);
  ctx.restore();
}

function draw() {
  ctx.save();
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const shakeX = game.shake ? rand(-game.shake, game.shake) : 0;
  const shakeY = game.shake ? rand(-game.shake * .5, game.shake * .5) : 0;
  ctx.translate(shakeX, shakeY);
  drawBackground(Math.min(game.stage, stages.length - 1), game.elapsed);

  const actors = [...game.enemies, player].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    const airborneScale = clamp(1 - actor.z / 520, .5, 1);
    ctx.globalAlpha = actor.dead ? .24 : .30;
    ctx.fillStyle = '#02040a';
    ctx.beginPath();
    ctx.ellipse(actor.x, actor.y + 2, (actor.boss ? 48 : 32) * airborneScale, (actor.boss ? 13 : 9) * airborneScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  game.pickups.forEach(item => item.draw());
  actors.forEach(actor => spriteRenderer.draw(actor));

  const particleStart = Math.max(0, game.particles.length - (window.NEON_PERFORMANCE?.maxParticles || 70));
  for (let index = particleStart; index < game.particles.length; index++) drawParticle(game.particles[index]);
  const textStart = Math.max(0, game.texts.length - 7);
  for (let index = textStart; index < game.texts.length; index++) drawFloatingText(game.texts[index]);

  if (game.transition > 0) {
    const height = 55 * clamp(game.transition, 0, 1);
    ctx.fillStyle = '#03040a';
    ctx.fillRect(0, 0, W, height);
    ctx.fillRect(0, H - height, W, height);
  }
  ctx.restore();
}

let lastRender = 0;
function loop(now) {
  const dt = Math.min(.033, (now - game.last) / 1000 || 0);
  game.last = now;
  update(dt);
  game.transition = Math.max(0, game.transition - dt);

  const targetFrameMs = window.NEON_PERFORMANCE?.targetFrameMs || 16.7;
  if (now - lastRender >= targetFrameMs || game.state !== 'playing') {
    draw();
    lastRender = now - ((now - lastRender) % targetFrameMs);
  }
  requestAnimationFrame(loop);
}

const gameShell = document.getElementById('game-shell');
['gesturestart','gesturechange','gestureend'].forEach(type => document.addEventListener(type, event => event.preventDefault(), { passive:false }));
document.addEventListener('touchmove', event => { if (gameShell.contains(event.target)) event.preventDefault(); }, { passive:false });
let lastTouchEnd = 0;
document.addEventListener('touchend', event => {
  const now = Date.now();
  if (now - lastTouchEnd <= 350) event.preventDefault();
  lastTouchEnd = now;
}, { passive:false });
document.addEventListener('dblclick', event => event.preventDefault(), { passive:false });
addEventListener('contextmenu', event => event.preventDefault());

requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .catch(() => {});
}
if ('caches' in window) {
  caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(() => {});
}
