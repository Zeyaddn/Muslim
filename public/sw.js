/* هُدَى Service Worker — PWA v8 (Static Export: Offline First) */
const VERSION = 'huda-v8';
const STATIC_CACHE = VERSION + '-static';
const RUNTIME_CACHE = VERSION + '-runtime';
const IMAGE_CACHE = VERSION + '-images';
const AUDIO_CACHE = VERSION + '-audio';
const API_CACHE = VERSION + '-api';

const PRECACHE_URLS = [
  '/',
  '/offline/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.all(PRECACHE_URLS.map((u) =>
        cache.add(new Request(u, { cache: 'reload' })).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- strategies ---------- */

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((fresh) => {
    if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
      const cache = caches.open(cacheName).then((c) => c.put(request, fresh.clone()));
      return fresh;
    }
    return fresh;
  }).catch(() => null);
  return cached || (await fetchPromise) || Response.error();
}

async function navigationHandler(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline/');
    return offline || new Response(
      '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:sans-serif;text-align:center;padding:60px"><h1>لا يوجد اتصال بالإنترنت حالياً</h1><p>يمكنك الاستمرار في استخدام المحتوى المتاح بدون إنترنت.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

/* ---------- push notifications ---------- */

self.addEventListener('push', (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = {}; }

  const title = p.title || 'هُدَى';
  const options = {
    body: p.body || '',
    tag: p.tag || ('huda-' + Date.now()),
    renotify: !!p.renotify,
    requireInteraction: false,
    lang: 'ar',
    dir: 'rtl',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: Array.isArray(p.vibrate) ? p.vibrate : [120, 60, 120],
    silent: p.silent === true,
    data: { url: p.data?.url || '/', kind: p.kind || '', ...(p.data || {}) },
    actions: [{ action: 'open', title: 'افتح التطبيق' }],
  };
  if (p.sound) options.sound = p.sound;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        try { client.navigate(target); } catch {}
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* ---------- fetch ---------- */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Ignore Webpack, APIs that are proxied, and PDF workers
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('webpack-hmr') ||
    url.pathname.includes('_next/webpack') ||
    url.pathname.includes('.hot-update.') ||
    url.pathname === '/pdf.worker.min.js'
  ) return;

  // Pages
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Next.js static assets
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Next.js Data JSON
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/data/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Fonts
  if (/fonts.(googleapis|gstatic).com$/.test(url.hostname) || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Audio (gapless recitation)
  if (/everyayah.com|mp3quran.net|everyaya.com|verses.quran.com|download.quranicaudio.com/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, AUDIO_CACHE));
    return;
  }

  // Images
  if (request.destination === 'image' || url.hostname.endsWith('unsplash.com') || url.hostname.endsWith('archive.org')) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }
  
  // External APIs (Prayer times, Quran, Islamic App) - Stale while revalidate so they work offline
  if (url.hostname.includes('api.aladhan.com') || url.hostname.includes('api.quran.com') || url.hostname.includes('api.islamic.app') || url.hostname.includes('api.alquran.cloud')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Same origin misc
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
