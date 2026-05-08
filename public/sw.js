// Wash Depot — Customer PWA service worker
const CACHE = 'wd-customer-v1';
const ASSETS = [
  '/customer-app',
  '/customer-app.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.13.10/dist/cdn.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network-first for the app shell, cache fallback when offline
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/customer-app.html')))
  );
});

// Future: handle push notifications for line alerts
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = (() => { try { return e.data.json(); } catch { return { title: 'Wash Depot', body: e.data.text() }; } })();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Wash Depot', {
      body: data.body || 'The line just got shorter — come on in!',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: data.tag || 'wd-line-alert',
      data: data
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow('/customer-app'));
});
