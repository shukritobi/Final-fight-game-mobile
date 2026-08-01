'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = {
  overlay: document.getElementById('overlay'), start: document.getElementById('start'),
  health: document.getElementById('health-fill'), energy: document.getElementById('energy-fill'),
  score: document.getElementById('score'), lives: document.getElementById('lives'),
  combo: document.getElementById('combo'), objective: document.getElementById('objective'),
  stageLabel: document.getElementById('stage-label'), bossCard: document.getElementById('boss-card'),
  bossFill: document.getElementById('boss-fill'), bossName: document.getElementById('boss-name'),
  toast: document.getElementById('toast'), pause: document.getElementById('pause')
};

const W = 1280, H = 720;
let DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * DPR);
  canvas.height = Math.floor(innerHeight * DPR);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
addEventListener('resize', resize, { passive: true }); resize();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.25);
const easeOut = t => 1 - Math.pow(1 - t, 3);

class AudioEngine {
  constructor() { this.ctx = null; this.enabled = true; }
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); }
  tone(freq, duration=.08, type='square', volume=.04, slide=0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    g.gain.setValueAtTime(volume, now); g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    o.connect(g).connect(this.ctx.destination); o.start(now); o.stop(now + duration);
  }
  hit(strong=false) { this.tone(strong ? 92 : 145, strong ? .13 : .07, 'sawtooth', strong ? .07 : .035, strong ? -42 : -20); }
  whoosh() { this.tone(260, .09, 'triangle', .025, 220); }
  pickup() { this.tone(520,.08,'sine',.03,280); setTimeout(()=>this.tone(780,.12,'sine',.025,220),60); }
  ko() { this.tone(110,.28,'sawtooth',.07,-55); }
}
const audio = new AudioEngine();

const input = { x:0, y:0, punch:false, kick:false, jump:false, special:false };
const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'escape') togglePause();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function bindButton(id, prop) {
  const el = document.getElementById(id);
  const set = v => { input[prop] = v; el.classList.toggle('active', v); if (v) audio.init(); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); set(true); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev => el.addEventListener(ev, () => set(false)));
}
bindButton('btn-punch','punch'); bindButton('btn-kick','kick'); bindButton('btn-jump','jump'); bindButton('btn-special','special');

const joy = document.getElementById('joystick'), stick = document.getElementById('stick');
let joyPointer = null;
function moveJoy(e) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const max = r.width*.29, len = Math.hypot(dx,dy) || 1;
  if (len > max) { dx = dx/len*max; dy = dy/len*max; }
  input.x = dx/max; input.y = dy/max; stick.style.transform = `translate3d(${dx}px,${dy}px,0)`;
}
joy.addEventListener('pointerdown', e => { joyPointer=e.pointerId; joy.setPointerCapture(e.pointerId); audio.init(); moveJoy(e); });
joy.addEventListener('pointermove', e => { if(e.pointerId===joyPointer) moveJoy(e); });
function releaseJoy(e){ if(e.pointerId!==joyPointer) return; joyPointer=null; input.x=input.y=0; stick.style.transform='translate3d(0,0,0)'; }
joy.addEventListener('pointerup',releaseJoy); joy.addEventListener('pointercancel',releaseJoy);

const stages = [
  { name:'Neon Market', subtitle:'Jalan Tengah, 11:47 PM', sky:['#151a45','#7b2558','#ff7a5c'], ground:'#263043', accent:'#55f4ff', boss:'Chrome Tiger', bossType:'tiger', waves:[['brawler','brawler','kicker'],['knife','brawler','heavy'],['kicker','knife','knife','heavy']] },
  { name:'Monsoon Alley', subtitle:'Chow Kit, 1:18 AM', sky:['#071b32','#12395a','#2b6b7b'], ground:'#172c3b', accent:'#87f7ff', boss:'The Rainmaker', bossType:'rainmaker', waves:[['knife','kicker','brawler'],['heavy','heavy','knife'],['kicker','kicker','knife','heavy']] },
  { name:'Skyline Fortress', subtitle:'Bukit Bintang, 2:06 AM', sky:['#170c2d','#4f174e','#ff4a69'], ground:'#26213b', accent:'#ffbf57', boss:'Dato Vex', bossType:'vex', waves:[['heavy','kicker','knife'],['knife','knife','heavy','brawler'],['heavy','heavy','kicker','knife']] }
];

const game = {
  state:'title', stage:0, wave:0, score:0, cameraX:0, shake:0, slow:0,
  enemies:[], particles:[], texts:[], pickups:[], props:[], spawnQueue:[], objectiveTimer:0,
  last:performance.now(), elapsed:0, transition:0
};
