'use strict';

(() => {
  if (typeof audio === 'undefined') return;

  const SAMPLE_RATE = 8000;
  const clips = new Map();
  let voice = null;
  let built = false;
  let lastPlayedAt = 0;

  audio.enabled = false;

  function clampSample(value) {
    return Math.max(-1, Math.min(1, value));
  }

  function square(frequency, time) {
    return Math.sin(Math.PI * 2 * frequency * time) >= 0 ? 1 : -1;
  }

  function noise(index, seed = 1) {
    const value = Math.sin((index + seed * 1543) * 12.9898) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  }

  function wavUrl(duration, generator) {
    const sampleCount = Math.max(1, Math.floor(SAMPLE_RATE * duration));
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);

    const write = (offset, text) => {
      for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index));
    };

    write(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    for (let index = 0; index < sampleCount; index++) {
      const time = index / SAMPLE_RATE;
      view.setInt16(44 + index * 2, Math.round(clampSample(generator(time, index, sampleCount)) * 32767), true);
    }

    return URL.createObjectURL(new Blob([buffer], { type:'audio/wav' }));
  }

  function buildClips() {
    if (built) return;
    built = true;

    clips.set('hit', wavUrl(.07, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .07), 2.2);
      return (noise(index, 4) * .55 + square(120, time) * .22) * envelope;
    }));

    clips.set('heavy', wavUrl(.105, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .105), 1.8);
      return (noise(index, 9) * .48 + square(78, time) * .38) * envelope;
    }));

    clips.set('jump', wavUrl(.08, time => {
      const envelope = Math.max(0, 1 - time / .08);
      return square(250 + time * 900, time) * envelope * .3;
    }));

    clips.set('pickup', wavUrl(.11, time => {
      const frequency = time < .055 ? 520 : 720;
      return square(frequency, time) * Math.max(0, 1 - time / .11) * .27;
    }));

    clips.set('ko', wavUrl(.15, (time, index) => {
      const envelope = Math.max(0, 1 - time / .15);
      return (square(86 - time * 120, time) * .42 + noise(index, 15) * .2) * envelope;
    }));

    voice = new Audio();
    voice.preload = 'auto';
    voice.volume = .62;
  }

  function play(name, minGap = 85) {
    if (!audio.enabled) return;
    const now = performance.now();
    if (now - lastPlayedAt < minGap) return;
    lastPlayedAt = now;

    buildClips();
    const src = clips.get(name);
    if (!src || !voice) return;

    voice.pause();
    voice.src = src;
    voice.currentTime = 0;
    const result = voice.play();
    if (result?.catch) result.catch(() => {});
  }

  audio.init = () => Promise.resolve(audio.enabled);
  audio.attack = () => {};
  audio.impact = (kind = 'punch1', strong = false, weapon = null) => {
    play(strong || weapon || /heavy|special|cyclone|twist|uppercut/i.test(kind) ? 'heavy' : 'hit');
  };
  audio.combo = () => {};
  audio.block = () => play('hit', 100);
  audio.hurt = () => {};
  audio.jump = () => play('jump', 120);
  audio.land = () => {};
  audio.pickup = () => play('pickup', 120);
  audio.save = () => {};
  audio.ko = () => play('ko', 150);
  audio.tone = () => {};
  audio.noise = () => {};

  const previous = document.getElementById('sound-toggle');
  if (previous) previous.remove();

  const button = document.createElement('button');
  button.id = 'sound-toggle';
  button.type = 'button';
  button.textContent = 'SFX OFF';
  button.setAttribute('aria-label', 'Toggle lightweight sound effects');
  button.title = 'Sound effects are off for maximum performance';
  document.getElementById('controls')?.appendChild(button);

  function updateButton() {
    button.textContent = audio.enabled ? 'SFX ON' : 'SFX OFF';
    button.classList.toggle('ready', audio.enabled);
    button.title = audio.enabled
      ? 'Lightweight sound effects enabled. Background music is disabled.'
      : 'Sound effects are off for maximum performance';
  }

  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    audio.enabled = !audio.enabled;
    if (audio.enabled) {
      buildClips();
      lastPlayedAt = 0;
      play('pickup', 0);
      if (typeof toast === 'function') toast('Lightweight SFX enabled');
    } else {
      voice?.pause();
      if (typeof toast === 'function') toast('Sound disabled for performance');
    }
    updateButton();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) voice?.pause();
  });

  updateButton();
})();
