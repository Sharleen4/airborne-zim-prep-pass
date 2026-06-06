// Service worker for Zamaai — offline-first app shell
// Strategy:
//   - HTML (navigation): network-first, fall back to cached index.html when offline
//   - Static assets (JS/CSS/fonts/images): cache-first, populated on first fetch
//   - API calls (/api/, /functions/): always network (IndexedDB handles offline data layer)

const VERSION = 'v11';
const SHELL_CACHE = `zamaai-shell-${VERSION}`;
const ASSET_CACHE = `zamaai-assets-${VERSION}`;
const IS_LOCAL_PREVIEW = ['localhost', '127.0.0.1', '::1'].includes(self.location.hostname);

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests entirely
  if (url.origin !== self.location.origin) return;

  // NEVER cache API calls — let the app's IndexedDB layer handle offline data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) {
    return;
  }

  // Navigation requests (HTML): network-first, fall back to cached index.html
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Update the cached index.html for next offline use
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): cache-first, populate on first fetch
  if (IS_LOCAL_PREVIEW && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache successful, basic (same-origin) responses
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
