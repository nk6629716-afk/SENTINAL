/**
 * SENTINEL PWA Service Worker (sentinel-shell-v1)
 * Provides offline application shell caching and offline reload capabilities.
 * Strictly adheres to Network-Only for /api/* and SSE endpoints so that
 * cached responses are NEVER returned as if they were fresh live telemetry.
 */

const CACHE_NAME = 'sentinel-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/terrain-default.png',
  '/assets/terrain-blue.png',
];

// Install: Cache application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(SHELL_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Pre-caching shell assets encountered warning:', err);
      })
  );
});

// Activate: Clean up old versioned caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch: Strategic handling per request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. NON-GET REQUESTS: Network-Only (Pass-through)
  if (req.method !== 'GET') {
    return;
  }

  // 2. API REQUESTS & SSE STREAM: Network-Only
  // Requirement: Ensure API requests do not return cached responses as if they were fresh live data
  if (url.pathname.startsWith('/api') || url.pathname.includes('/events')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'OFFLINE_MODE',
              message: 'Network offline. Using client IndexedDB tactical database.',
            },
            meta: {
              isOffline: true,
              timestamp: new Date().toISOString(),
              isSimulated: true,
            },
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. NAVIGATION REQUESTS: Network-First with Cache fallback (Offline Reload)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const shell = await caches.match('/index.html');
          return shell || caches.match('/');
        })
    );
    return;
  }

  // 4. STATIC ASSETS & VERSIONED CHUNKS: Cache-First with Network fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com')
  ) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-While-Revalidate in background for non-versioned assets
          fetch(req)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. DEFAULT: Network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
