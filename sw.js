// Service worker: guarda o app (e o SDK do Firebase) para abrir sem internet.
// Os dados em si ficam no cache do próprio Firestore (IndexedDB), não aqui.
// Ao publicar uma versão nova, aumente VERSAO para forçar a atualização.
const VERSAO = 'v4';
const CACHE = `meus-gastos-${VERSAO}`;
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('meus-gastos-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: rede primeiro (pega atualizações), cache se estiver offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copia = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copia)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Arquivos do app e SDK do Firebase (versão fixa na URL): cache primeiro.
  const mesmoSite = url.origin === self.location.origin;
  const sdkFirebase = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!mesmoSite && !sdkFirebase) return; // Firestore, Auth etc. passam direto.

  e.respondWith(
    caches.match(req).then((hit) => {
      const rede = fetch(req).then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      });
      return hit || rede;
    })
  );
});
