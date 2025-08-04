self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('expense-tracker-v1').then(cache => {
      return cache.addAll([
        '/expense-tracker/',
        '/expense-tracker/index.html',
        '/expense-tracker/style.css',
        '/expense-tracker/script.js',
        '/expense-tracker/manifest.json',
        '/expense-tracker/icon-192.png',
        '/expense-tracker/icon-512.png'
      ]);
    })
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== 'expense-tracker-v1').map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request))
  );
});
