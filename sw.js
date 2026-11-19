// =============================================
// NIKE ACTIONS - SERVICE WORKER (sw.js)
// Progressive Web App Native Support v1.0
// =============================================

const CACHE_NAME = 'nike-actions-pwa-v1.0';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/dashboard.html',
  '/vip-plans.html',
  '/withdraw.html',
  '/referral.html',
  '/login.html',
  '/register.html',
  '/admin/index.html',
  '/admin/users.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/admin/css/admin.css',
  '/js/utils.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/vip.js',
  '/js/pwa.js',
  '/admin/js/admin.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Ne jamais mettre en cache les appels API ou exports dynamiques
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/php/')) {
    return;
  }

  // Stratégie Network-First avec repli sur le cache puis sur /offline.html
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && url.origin === self.location.origin) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match(OFFLINE_URL) || caches.match('/dashboard.html') || caches.match('/index.html');
          }
        });
      })
  );
});
