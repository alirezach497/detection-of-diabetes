// نام و نسخه کش — با هر تغییر در فایل‌ها، این نسخه را افزایش دهید
const CACHE_NAME = 'diabetes-app-v1';

// فایل‌هایی که باید کش شوند (مسیرهای نسبی برای GitHub Pages)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  './css/style.min.css',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-250.png',
  './fonts/font awesome/all.min.css',
  './fonts/font awesome/webfonts/fa-brands-400.woff2',
  './fonts/font awesome/webfonts/fa-regular-400.ttf',
  './fonts/font awesome/webfonts/fa-regular-400.woff2',
  './fonts/font awesome/webfonts/fa-solid-900.ttf',
  './fonts/font awesome/webfonts/fa-solid-900.woff2',
  './fonts/font awesome/webfonts/fa-v4compatibility.ttf',
  './fonts/font awesome/webfonts/fa-v4compatibility.woff2',
  './fonts/vazir/vazir.css',
  './fonts/vazir/Vazirmatn-Regular.ttf',
  './js/script.min.js'
];

// ========== مرحله نصب: کش کردن فایل‌ها ==========
self.addEventListener('install', (event) => {
  console.log('[SW] نصب...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] کش کردن فایل‌های اصلی');
        // از addAll استفاده می‌کنیم؛ اگر یکی از CDN ها خطا داد، کل کش نمی‌شکند
        return Promise.allSettled(
          ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => {
            console.warn('[SW] خطا در کش:', url, err);
          }))
        );
      })
      .then(() => self.skipWaiting()) // فعال‌سازی فوری نسخه جدید
  );
});

// ========== مرحله فعال‌سازی: پاک کردن کش‌های قدیمی ==========
self.addEventListener('activate', (event) => {
  console.log('[SW] فعال‌سازی...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] حذف کش قدیمی:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim()) // کنترل فوری همه تب‌ها
  );
});

// ========== مرحله Fetch: استراتژی Cache First با fallback ==========
self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET را مدیریت می‌کنیم
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ۱. اگر در کش بود → همان را برگردان
      if (cachedResponse) {
        return cachedResponse;
      }

      // ۲. اگر نبود → از شبکه بگیر و در کش ذخیره کن
      return fetch(event.request)
        .then((networkResponse) => {
          // فقط پاسخ‌های موفق را کش کن
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // ۳. اگر شبکه هم قطع بود و درخواست HTML بود → صفحه آفلاین
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./offline.html');
          }
          // برای سایر درخواست‌ها، خطا برمی‌گردانیم
          return new Response('آفلاین هستید', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    })
  );
});

// ========== (اختیاری) پیام از صفحه به SW ==========
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});