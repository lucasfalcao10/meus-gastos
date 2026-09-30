// Service worker do PWA. O Firestore mantém os dados em IndexedDB; este cache
// contém somente o shell local do aplicativo e assets estáticos.
const VERSAO = 'v3';
const CACHE = `meus-gastos-${VERSAO}`;
const SHELL = [
  './',
  'index.html',
  'config.js',
  'manifest.json',
  'assets/css/app.css',
  'assets/js/theme.js',
  'assets/js/core.js',
  'assets/js/firebase.js',
  'assets/js/data.js',
  'assets/js/banking.js',
  'assets/js/ui.js',
  'assets/js/theme-manager.js',
  'assets/js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('meus-gastos-') && key !== CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameSite = url.origin === self.location.origin;
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');

  if (!sameSite && !firebaseSdk) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('index.html', copy));
          return response;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return hit || network;
    })
  );
});
