'use strict';

(() => {
  if (typeof audio === 'undefined') return;

  const SAMPLE_RATE = 11025;
  const clips = new Map();
  const pending = [];
  let unlocked = false;
  let unlocking = null;
  let music = null;
  let musicWanted = false;
  const voicePool = [];
  let voiceIndex = 0;

  function clampSample(value) {
    return Math.max(-1, Math.min(1, value));
  }

  function wavUrl(duration, generator) {
    const sampleCount = Math.max(1, Math.floor(SAMPLE_RATE * duration));
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);

    function writeString(offset, value) {
      for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    for (let index = 0; index < sampleCount; index++) {
      const time = index / SAMPLE_RATE;
      view.setInt16(44 + index * 2, Math.round(clampSample(generator(time, index, sampleCount)) * 32767), true);
    }

    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  }

  function square(frequency, time) {
    return Math.sin(Math.PI * 2 * frequency * time) >= 0 ? 1 : -1;
  }

  function triangle(frequency, time) {
    return 2 * Math.asin(Math.sin(Math.PI * 2 * frequency * time)) / Math.PI;
  }

  function noise(index, seed = 1) {
    const value = Math.sin((index + seed * 7919) * 12.9898) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  }

  function addClip(name, duration, generator, volume = .65) {
    const element = new Audio(wavUrl(duration, generator));
    element.preload = 'auto';
    element.volume = volume;
    clips.set(name, { element, volume });
  }

  function buildClips() {
    addClip('unlock', .14, (time) => {
      const envelope = Math.max(0, 1 - time / .14);
      return triangle(time < .07 ? 520 : 760, time) * envelope * .45;
    }, .55);

    addClip('punch', .105, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .105), 2.2);
      return (noise(index, 3) * .56 + square(135 - time * 420, time) * .26) * envelope;
    }, .68);

    addClip('kick', .15, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .15), 1.8);
      return (noise(index, 7) * .38 + triangle(92 - time * 180, time) * .55) * envelope;
    }, .78);

    addClip('heavy', .22, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .22), 1.45);
      return (noise(index, 12) * .46 + square(70 - time * 95, time) * .5) * envelope;
    }, .82);

    addClip('whoosh', .17, (time, index) => {
      const envelope = Math.sin(Math.min(1, time / .17) * Math.PI);
      return (noise(index, 18) * .25 + triangle(190 + time * 580, time) * .35) * envelope;
    }, .58);

    addClip('uppercut', .23, (time, index) => {
      const envelope = Math.max(0, 1 - time / .23);
      return (noise(index, 21) * .22 + triangle(145 + time * 720, time) * .62) * envelope;
    }, .74);

    addClip('hurt', .17, (time) => {
      const envelope = Math.max(0, 1 - time / .17);
      return square(175 - time * 520, time) * envelope * .45;
    }, .48);

    addClip('jump', .13, (time, index) => {
      const envelope = Math.max(0, 1 - time / .13);
      return (triangle(210 + time * 430, time) * .46 + noise(index, 30) * .08) * envelope;
    }, .52);

    addClip('land', .12, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .12), 2);
      return (noise(index, 33) * .5 + triangle(66, time) * .42) * envelope;
    }, .58);

    addClip('pickup', .22, (time) => {
      const note = time < .08 ? 520 : time < .15 ? 690 : 880;
      const envelope = Math.max(0, 1 - time / .22);
      return triangle(note, time) * envelope * .45;
    }, .55);

    addClip('ko', .42, (time, index) => {
      const envelope = Math.max(0, 1 - time / .42);
      return (noise(index, 39) * .25 + square(112 - time * 160, time) * .6) * envelope;
    }, .8);

    addClip('block', .11, (time, index) => {
      const envelope = Math.pow(Math.max(0, 1 - time / .11), 2);
      return (noise(index, 42) * .42 + square(320, time) * .38) * envelope;
    }, .58);

    addClip('save', .16, (time) => {
      const note = time < .075 ? 640 : 860;
      return triangle(note, time) * Math.max(0, 1 - time / .16) * .36;
    }, .42);
  }

  function buildMusic() {
    const duration = 8;
    const melody = [659, 784, 880, 784, 659, 587, 523, 587, 659, 784, 988, 880, 784, 659, 587, 523,
      587, 659, 784, 659, 523, 587, 659, 784, 880, 784, 659, 587, 523, 494, 523, 587];
    const bass = [82.4, 82.4, 110, 110, 73.4, 73.4, 98, 98];
    const url = wavUrl(duration, (time, index) => {
      const beat = .25;
      const melodyIndex = Math.floor(time / beat) % melody.length;
      const bassIndex = Math.floor(time / 1) % bass.length;
      const beatTime = time % beat;
      const melodyEnvelope = Math.pow(Math.max(0, 1 - beatTime / beat), .8);
      const bassTime = time % 1;
      const bassEnvelope = Math.max(0, 1 - bassTime);
      const kickPhase = time % .5;
      const kick = kickPhase < .08 ? Math.sin(Math.PI * 2 * (92 - kickPhase * 700) * kickPhase) * (1 - kickPhase / .08) : 0;
      const snarePhase = (time + .25) % .5;
      const snare = snarePhase < .055 ? noise(index, 55) * (1 - snarePhase / .055) : 0;
      const melodySignal = square(melody[melodyIndex], time) * melodyEnvelope * .085;
      const harmonySignal = triangle(melody[melodyIndex] / 2, time) * melodyEnvelope * .045;
      const bassSignal = square(bass[bassIndex], time) * bassEnvelope * .075;
      return melodySignal + harmonySignal + bassSignal + kick * .12 + snare * .055;
    });

    music = new Audio(url);
    music.loop = true;
    music.preload = 'auto';
    music.volume = .28;
  }

  buildClips();
  buildMusic();
  for (let index = 0; index < 10; index++) {
    const voice = new Audio(clips.get('unlock').element.src);
    voice.preload = 'auto';
    voicePool.push(voice);
  }

  function playClip(name, volume = 1, rate = 1) {
    if (!audio.enabled) return;
    const clip = clips.get(name);
    if (!clip) return;

    const play = () => {
      const instance = voicePool[voiceIndex++ % voicePool.length];
      instance.pause();
      instance.src = clip.element.src;
      instance.currentTime = 0;
      instance.volume = Math.max(0, Math.min(1, clip.volume * volume));
      instance.playbackRate = rate;
      const promise = instance.play();
      if (promise?.catch) promise.catch(() => {});
    };

    if (unlocked) play();
    else {
      pending.push(play);
      if (pending.length > 16) pending.shift();
      unlock();
    }
  }

  function flushPending() {
    while (pending.length) pending.shift()();
  }

  function syncMusic() {
    musicWanted = audio.enabled && typeof game !== 'undefined' && game.state === 'playing';
    if (!music) return;

    if (musicWanted && unlocked) {
      if (music.paused) {
        const promise = music.play();
        if (promise?.catch) promise.catch(() => {});
      }
    } else if (!music.paused) {
      music.pause();
    }
  }

  function unlock() {
    if (!audio.enabled) return Promise.resolve(false);
    if (unlocked) {
      syncMusic();
      return Promise.resolve(true);
    }
    if (unlocking) return unlocking;

    const unlockSource = clips.get('unlock').element.src;
    const attempts = voicePool.map((voice, index) => {
      voice.src = unlockSource;
      voice.currentTime = 0;
      voice.volume = index === 0 ? .42 : .001;
      return Promise.resolve(voice.play()).then(() => {
        if (index !== 0) { voice.pause(); voice.currentTime = 0; }
      });
    });

    music.volume = .001;
    attempts.push(Promise.resolve(music.play()).then(() => {
      music.pause();
      music.currentTime = 0;
      music.volume = .28;
    }));

    unlocking = Promise.allSettled(attempts)
      .then((results) => {
        unlocked = results.some((result) => result.status === 'fulfilled');
        if (unlocked) {
          flushPending();
          syncMusic();
        }
        updateButton();
        return unlocked;
      })
      .finally(() => { unlocking = null; });
    return unlocking;
  }

  audio.init = unlock;
  audio.attack = function attack(kind = 'punch1') {
    if (/uppercut/i.test(kind)) playClip('uppercut', 1);
    else if (/kick|axe|dragon|twist|cyclone/i.test(kind)) playClip('whoosh', .9, /flying|twist|cyclone/i.test(kind) ? .88 : 1);
    else playClip('whoosh', .62, 1.22);
  };
  audio.impact = function impact(kind = 'punch1', strong = false, weapon = null) {
    if (weapon || strong || /heavy|special|cyclone|twist/i.test(kind)) playClip('heavy', 1);
    else if (/kick|axe|dragon/i.test(kind)) playClip('kick', 1);
    else playClip('punch', 1);
  };
  audio.combo = function combo(level = 2) { playClip('pickup', .38, .9 + Math.min(6, level) * .035); };
  audio.block = () => playClip('block');
  audio.hurt = (isPlayer = false) => playClip('hurt', isPlayer ? 1 : .7, isPlayer ? .92 : 1.08);
  audio.jump = () => playClip('jump');
  audio.land = (heavy = false) => playClip('land', heavy ? 1 : .72, heavy ? .82 : 1);
  audio.pickup = () => playClip('pickup');
  audio.save = () => playClip('save');
  audio.ko = () => playClip('ko');
  audio.tone = () => {};
  audio.noise = () => {};

  const oldButton = document.getElementById('sound-toggle');
  if (oldButton) oldButton.remove();
  const controls = document.getElementById('controls');
  const soundButton = document.createElement('button');
  soundButton.id = 'sound-toggle';
  soundButton.type = 'button';
  soundButton.setAttribute('aria-label', 'Toggle sound and music');
  controls.appendChild(soundButton);

  function updateButton() {
    soundButton.textContent = audio.enabled ? 'SFX' : 'OFF';
    soundButton.classList.toggle('ready', audio.enabled && unlocked);
    soundButton.title = audio.enabled
      ? unlocked ? 'Sound and music enabled' : 'Tap to enable sound and music'
      : 'Sound and music disabled';
  }

  soundButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (audio.enabled && unlocked) {
      audio.enabled = false;
      music.pause();
      updateButton();
      return;
    }
    audio.enabled = true;
    unlock().then((ready) => {
      if (ready) playClip('pickup', .75);
      else if (typeof toast === 'function') toast('Sound blocked. Tap SFX again and raise media volume.');
      updateButton();
    });
  });

  ['click', 'touchend', 'pointerup', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (audio.enabled && !unlocked) unlock();
    }, { capture: true, passive: true, once: false });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music?.pause();
    else syncMusic();
  });

  setInterval(syncMusic, 350);
  updateButton();
})();
