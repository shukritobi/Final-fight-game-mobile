const CACHE='neon-brawl-v13';
const ASSETS=[
  './','./index.html','./styles.css','./polish.css','./game-polish-v2.css','./performance.css',
  './core.js','./audio-disabled.js','./fighters.js','./gameplay.js','./scenes.js','./sprites.js',
  './art-backgrounds.js','./art-sprites.js','./enhancements.js','./game-polish-v2.js','./performance.js','./render.js','./manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.map(key=>caches.delete(key))))
      .then(()=>caches.open(CACHE))
      .then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const clone=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,clone));
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});
