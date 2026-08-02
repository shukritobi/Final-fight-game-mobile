'use strict';

(() => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor || typeof audio === 'undefined') return;

  audio.master = null;
  audio.compressor = null;
  audio.unlocked = false;
  audio.unlockPromise = null;
  audio.pending = [];
  audio.maxPending = 24;

  audio.ensureGraph = function ensureGraph() {
    if (this.ctx && this.master && this.compressor) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioContextCtor({ latencyHint: 'interactive' });
      } catch (error) {
        this.ctx = new AudioContextCtor();
      }
    }

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = .003;
    this.compressor.release.value = .18;

    this.master = this.ctx.createGain();
    this.master.gain.value = 1.28;
    this.compressor.connect(this.master);
    this.master.connect(this.ctx.destination);
  };

  audio.output = function output() {
    return this.compressor || this.master || this.ctx.destination;
  };

  audio.flushPending = function flushPending() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    const queued = this.pending.splice(0);
    queued.forEach(item => {
      if (now - item.createdAt < 650) item.play();
    });
  };

  audio.queue = function queue(play) {
    this.pending.push({ play, createdAt: performance.now() });
    if (this.pending.length > this.maxPending) this.pending.shift();
  };

  audio.init = function init() {
    if (!this.enabled) return Promise.resolve(false);
    this.ensureGraph();

    if (this.ctx.state === 'running') {
      this.unlocked = true;
      this.flushPending();
      return Promise.resolve(true);
    }

    if (this.unlockPromise) return this.unlockPromise;

    this.unlockPromise = (async () => {
      try {
        await this.ctx.resume();

        const silentBuffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate || 44100);
        const silentSource = this.ctx.createBufferSource();
        const silentGain = this.ctx.createGain();
        silentSource.buffer = silentBuffer;
        silentGain.gain.value = .00001;
        silentSource.connect(silentGain).connect(this.output());
        silentSource.start(0);

        this.unlocked = this.ctx.state === 'running';
        if (this.unlocked) this.flushPending();
        updateSoundButton();
        return this.unlocked;
      } catch (error) {
        this.unlocked = false;
        updateSoundButton();
        return false;
      } finally {
        this.unlockPromise = null;
      }
    })();

    return this.unlockPromise;
  };

  audio.tone = function tone(freq, duration=.08, type='square', volume=.04, slide=0, delay=0) {
    if (!this.enabled) return;
    const play = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + delay;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(30, freq), now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
      gain.gain.setValueAtTime(Math.max(.0001, volume), now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(this.output());
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    };

    if (this.ctx?.state === 'running') play();
    else {
      this.queue(play);
      this.init();
    }
  };

  audio.noise = function noise(duration=.07, volume=.025, frequency=900, delay=0) {
    if (!this.enabled) return;
    const play = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime + delay;
      const frameCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, frameCount, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index++) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
      }
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(frequency, now);
      filter.Q.value = .8;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter).connect(gain).connect(this.output());
      source.start(now);
      source.stop(now + duration + .02);
    };

    if (this.ctx?.state === 'running') play();
    else {
      this.queue(play);
      this.init();
    }
  };

  const controls = document.getElementById('controls');
  const soundButton = document.createElement('button');
  soundButton.id = 'sound-toggle';
  soundButton.type = 'button';
  soundButton.setAttribute('aria-label', 'Toggle sound effects');
  controls.appendChild(soundButton);

  function updateSoundButton() {
    const ready = audio.enabled && audio.ctx?.state === 'running';
    soundButton.textContent = audio.enabled ? '🔊' : '🔇';
    soundButton.classList.toggle('ready', !!ready);
    soundButton.title = audio.enabled
      ? ready ? 'Sound effects on' : 'Tap to enable sound effects'
      : 'Sound effects off';
  }

  async function unlockAudio() {
    if (!audio.enabled) return;
    await audio.init();
    updateSoundButton();
  }

  soundButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
  });

  soundButton.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    audio.enabled = !audio.enabled;

    if (audio.enabled) {
      const ready = await audio.init();
      if (ready) {
        audio.tone(440, .07, 'square', .035, 150);
        audio.tone(690, .1, 'triangle', .028, 180, .055);
      }
    } else {
      audio.pending.length = 0;
    }
    updateSoundButton();
  });

  ['pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
    document.addEventListener(eventName, unlockAudio, { capture: true, passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audio.enabled) updateSoundButton();
  });

  window.addEventListener('pageshow', updateSoundButton);
  window.addEventListener('focus', updateSoundButton);
  updateSoundButton();
})();
