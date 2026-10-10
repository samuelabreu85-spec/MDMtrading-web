/* MDM móvil · service worker: app instalable, arranque sin red y avisos push */
const CACHE = 'mdm-m-v2';
const SHELL = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest',
  'img/icon-192.png', 'img/icon-512.png', 'img/badge-96.png',
  'fonts/cinzel-latin-700-normal.woff2', 'fonts/cinzel-latin-900-normal.woff2',
  'fonts/dm-sans-latin-400-normal.woff2', 'fonts/dm-sans-latin-500-normal.woff2', 'fonts/dm-sans-latin-700-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// La app (html/js/css) se pide primero a la red para que las actualizaciones lleguen al momento;
// sin red, se sirve lo guardado. La API nunca se cachea aquí.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'MDM', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    // Si la app está abierta y a la vista, ya lo enseña ella: no duplicamos
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.some(c => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.title || 'MDM', {
      body: d.body || '', tag: d.tag || 'mdm', renotify: true,
      icon: 'img/icon-192.png', badge: 'img/badge-96.png', vibrate: [120, 60, 120]
    });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.length) return cs[0].focus();
    return self.clients.openWindow('./');
  })());
});
