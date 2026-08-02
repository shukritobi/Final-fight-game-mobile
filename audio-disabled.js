'use strict';

(() => {
  const noSound = () => {};
  const noSoundAsync = () => Promise.resolve(false);

  function stopEveryAudioSource() {
    document.querySelectorAll('audio, video').forEach(element => {
      try {
        element.pause();
        element.removeAttribute('src');
        element.load();
      } catch (error) {}
      element.remove();
    });

    if (typeof audio !== 'undefined') {
      try {
        audio.enabled = false;
        audio.pending = [];
        if (audio.ctx && audio.ctx.state !== 'closed') audio.ctx.close();
      } catch (error) {}

      audio.ctx = null;
      audio.enabled = false;
      audio.init = noSoundAsync;
      audio.tone = noSound;
      audio.noise = noSound;
      audio.attack = noSound;
      audio.impact = noSound;
      audio.combo = noSound;
      audio.block = noSound;
      audio.hurt = noSound;
      audio.jump = noSound;
      audio.land = noSound;
      audio.pickup = noSound;
      audio.save = noSound;
      audio.ko = noSound;
    }

    document.getElementById('sound-toggle')?.remove();

    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'none'; } catch (error) {}
    }
  }

  stopEveryAudioSource();
  queueMicrotask(stopEveryAudioSource);
  addEventListener('pageshow', stopEveryAudioSource, { passive:true });
  document.addEventListener('visibilitychange', stopEveryAudioSource, { passive:true });

  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== 'neon-brawl-v13').map(key => caches.delete(key))
    )).catch(() => {});
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.update());
    }).catch(() => {});
  }
})();
