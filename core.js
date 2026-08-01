'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = {
  overlay: document.getElementById('overlay'), start: document.getElementById('start'),
  continue: document.getElementById('continue'),
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
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize, { passive: true });
resize();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.25);
const easeOut = t => 1 - Math.pow(1 - t, 3);

class AudioEngine {
  constructor() { this.ctx = null; this.enabled = true; }
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, duration=.08, type='square', volume=.04, slide=0, delay=0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, freq), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  noise(duration=.07, volume=.025, frequency=900, delay=0) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const frameCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frameCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, now);
    filter.Q.value = .8;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }
  attack(kind='punch1') {
    const isKick = /kick|axe|dragon|twist/i.test(kind);
    const isPunch = /punch|hook|backfist/i.test(kind);
    if (kind === 'uppercut') {
      this.noise(.11, .035, 1500); this.tone(150, .16, 'sawtooth', .035, 520);
    } else if (kind === 'flyingKick') {
      this.noise(.14, .04, 980); this.tone(220, .18, 'triangle', .035, -95);
    } else if (kind === 'twistKick' || kind === 'cyclone') {
      this.noise(.19, .045, 1250); this.tone(260, .24, 'triangle', .04, -170); this.tone(430, .18, 'sawtooth', .025, 210, .04);
    } else if (kind === 'special') {
      this.noise(.2, .045, 1800); this.tone(115, .28, 'sawtooth', .055, 760); this.tone(420, .22, 'triangle', .026, -180, .04);
    } else if (isKick) {
      this.noise(.075, .028, 720); this.tone(170, .1, 'sine', .025, -65);
    } else if (isPunch) {
      this.noise(.045, .018, 1250); this.tone(250, .065, 'triangle', .018, 190);
    }
  }
  impact(kind='punch1', strong=false, weapon=null) {
    if (weapon) {
      this.noise(strong ? .13 : .09, strong ? .06 : .04, weapon === 'staff' ? 1150 : 1650);
      this.tone(weapon === 'bat' ? 105 : 145, strong ? .18 : .11, 'square', strong ? .065 : .042, -55);
      return;
    }
    const isKick = /kick|axe|dragon|twist/i.test(kind);
    if (isKick) {
      this.noise(strong ? .14 : .1, strong ? .065 : .045, 560);
      this.tone(strong ? 72 : 92, strong ? .2 : .13, 'sine', strong ? .08 : .055, -38);
    } else if (kind === 'uppercut') {
      this.noise(.13, .058, 1250); this.tone(90, .18, 'sawtooth', .07, 260);
    } else if (kind === 'special' || kind === 'cyclone') {
      this.noise(.18, .075, 1700); this.tone(64, .28, 'sawtooth', .085, -26); this.tone(360, .2, 'triangle', .035, 260, .02);
    } else {
      this.noise(strong ? .11 : .07, strong ? .05 : .035, 920);
      this.tone(strong ? 82 : 118, strong ? .16 : .095, 'square', strong ? .065 : .042, -34);
    }
  }
  combo(level=2) {
    this.tone(440 + level * 55, .07, 'square', .018, 120);
    if (level >= 4) this.tone(720, .11, 'triangle', .02, 240, .04);
  }
  block() { this.noise(.075, .035, 2100); this.tone(310, .09, 'square', .028, -120); }
  hurt(isPlayer=false) { this.tone(isPlayer ? 155 : 185, .13, 'sawtooth', isPlayer ? .04 : .025, -80, .015); }
  jump() { this.noise(.065, .015, 1500); this.tone(175, .11, 'triangle', .025, 170); }
  land(heavy=false) { this.noise(heavy ? .13 : .09, heavy ? .04 : .025, 260); this.tone(heavy ? 58 : 74, heavy ? .16 : .11, 'sine', heavy ? .055 : .032, -18); }
  pickup() { this.tone(520, .08, 'sine', .03, 280); this.tone(780, .12, 'sine', .025, 220, .06); }
  save() { this.tone(620,.055,'sine',.018,110); this.tone(840,.075,'sine',.015,120,.05); }
  ko() { this.noise(.2, .055, 420); this.tone(105, .34, 'sawtooth', .075, -65); }
}
const audio = new AudioEngine();

const input = { x:0, y:0, punch:false, kick:false, jump:false, special:false };
const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'escape') togglePause();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function bindButton(id, prop) {
  const el = document.getElementById(id);
  const set = value => {
    input[prop] = value;
    el.classList.toggle('active', value);
    if (value) audio.init();
  };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    set(true);
  });
  ['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(eventName => el.addEventListener(eventName, () => set(false)));
}
bindButton('btn-punch','punch');
bindButton('btn-kick','kick');
bindButton('btn-jump','jump');
bindButton('btn-special','special');

const joy = document.getElementById('joystick');
const stick = document.getElementById('stick');
let joyPointer = null;
function moveJoy(e) {
  const rect = joy.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = e.clientX - centerX;
  let dy = e.clientY - centerY;
  const max = rect.width * .29;
  const length = Math.hypot(dx, dy) || 1;
  if (length > max) { dx = dx / length * max; dy = dy / length * max; }
  input.x = dx / max;
  input.y = dy / max;
  stick.style.transform = `translate3d(${dx}px,${dy}px,0)`;
}
joy.addEventListener('pointerdown', e => {
  e.preventDefault(); joyPointer = e.pointerId; joy.setPointerCapture(e.pointerId); audio.init(); moveJoy(e);
});
joy.addEventListener('pointermove', e => { if (e.pointerId === joyPointer) moveJoy(e); });
function releaseJoy(e) {
  if (e.pointerId !== joyPointer) return;
  joyPointer = null; input.x = 0; input.y = 0; stick.style.transform = 'translate3d(0,0,0)';
}
joy.addEventListener('pointerup', releaseJoy);
joy.addEventListener('pointercancel', releaseJoy);
joy.addEventListener('lostpointercapture', releaseJoy);

const stages = [
  { name:'Neon Market', subtitle:'Jalan Tengah, 11:47 PM', sky:['#151a45','#7b2558','#ff7a5c'], ground:'#263043', accent:'#55f4ff', boss:'Chrome Tiger', bossType:'tiger', waves:[['brawler','brawler','kicker'],['knife','brawler','heavy'],['kicker','knife','knife','heavy']] },
  { name:'Monsoon Alley', subtitle:'Chow Kit, 1:18 AM', sky:['#071b32','#12395a','#2b6b7b'], ground:'#172c3b', accent:'#87f7ff', boss:'The Rainmaker', bossType:'rainmaker', waves:[['knife','kicker','brawler'],['heavy','heavy','knife'],['kicker','kicker','knife','heavy']] },
  { name:'Skyline Fortress', subtitle:'Bukit Bintang, 2:06 AM', sky:['#170c2d','#4f174e','#ff4a69'], ground:'#26213b', accent:'#ffbf57', boss:'Dato Vex', bossType:'vex', waves:[['heavy','kicker','knife'],['knife','knife','heavy','brawler'],['heavy','heavy','kicker','knife']] }
];

const game = {
  state:'title', stage:0, wave:0, score:0, cameraX:0, shake:0, slow:0,
  enemies:[], particles:[], texts:[], pickups:[], props:[], spawnQueue:[], objectiveTimer:0,
  last:performance.now(), elapsed:0, transition:0, saveAccumulator:0, resumed:false
};
