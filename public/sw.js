/**
 * Service Worker — الإقفال | AL EQFAL
 * Security & Cache Isolation Policy:
 * - Strictly same-origin GET requests ONLY.
 * - Never intercepts or caches Firebase Auth, Firestore, OAuth, or Google Drive API traffic.
 * - Never intercepts non-GET requests (POST/PUT/PATCH/DELETE).
 * - Never stores sensitive user credentials, tokens, or financial API responses.
 * - Network-First for HTML navigation so application updates appear immediately.
 * - Safe Cache-First only for immutable same-origin hashed static assets (/assets/).
 */

const CACHE_VERSION = 'aleqfal-shell-v1';
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '');
const SHELL_URL = `${BASE_PATH}index.html`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll([BASE_PATH, SHELL_URL]).catch(() => {
        // Ignore individual precache failures during dev or partial offline boot
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only handle GET requests; never touch POST/PUT/DELETE/PATCH
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 2. Bypass ALL cross-origin requests (Firebase, Google Auth, Google Drive API, Google UserInfo, Fonts, CDN)
  if (url.origin !== self.location.origin) return;

  // 3. Bypass Firebase Auth helper paths, API routes, manifest, sw.js, and Vite dev modules
  if (
    url.pathname.startsWith('/__/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('/sw.js') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.includes('/@vite') ||
    url.pathname.includes('/@react-refresh') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/src/')
  ) {
    return;
  }

  // 4. Navigation requests (HTML pages): Network-First so updates appear immediately without stale data
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(SHELL_URL, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedShell = await caches.match(SHELL_URL);
          if (cachedShell) return cachedShell;
          const cachedBase = await caches.match(BASE_PATH);
          return cachedBase || Response.error();
        })
    );
    return;
  }

  // 5. Immutable Vite hashed static assets & static icons only: Cache-First with network fallback
  const isHashedAsset = url.pathname.startsWith(`${BASE_PATH}assets/`);
  const isStaticIcon = url.pathname.startsWith(`${BASE_PATH}icons/`);

  if (isHashedAsset || isStaticIcon) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
