// Service worker mínimo — necesario para que Chrome permita instalar esta página como app.
// No cachea nada de forma agresiva: simplemente deja pasar las peticiones normales,
// para no interferir con los datos en tiempo real de Firestore.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
