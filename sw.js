// SMILE Bot Service Worker
const CACHE_NAME = 'smile-bot-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/core/config.js',
  '/src/core/db.js',
  '/src/core/app.js',
  '/src/utils/walletManager.js',
  '/src/utils/apiClient.js',
  '/src/utils/executor.js',
  '/src/utils/cascadeFunding.js',
  '/src/utils/taskParser.js',
  '/src/ui/ui.js'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
