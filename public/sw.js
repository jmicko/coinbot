// SERVICE WORKER

const CACHE_NAME = 'coinbot-cache-v1.2.6';

const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  // '/static/js/bundle.js', 
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Let the browser do its default thing
  // for non-GET requests.
  if (event.request.method !== "GET") return;
  // Skip caching for /api requests
  if (event.request.url.includes('/api')) {
    return;
  }

  // Prevent the default, and handle the request ourselves.
  event.respondWith(
    (async () => {
      // Try to get the response from a cache.
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        // If we found a match in the cache, return it, but also
        // update the entry in the cache in the background.
        event.waitUntil(cache.add(event.request));
        return cachedResponse;
      }

      // If we didn't find a match in the cache, use the network.
      return fetch(event.request);
    })()
  );
});


// handle notification click event
self.addEventListener('notificationclick', function (event) {
  console.log('notification received: ', event);
});

// listen for notification events
self.addEventListener('message', function (event) {
  if (event.data) {
    const message = JSON.parse(event.data);
    console.log('message received: ', message);
    if (message.type === 'show-notification') {
      const { title, body, icon } = message;
      console.log('showing notification: ', title, body);
      self.registration.showNotification(title, {
        body: body,
        icon: icon,
      });
    }
  }
});
let count = 0;

// listen for push events
self.addEventListener('push', function (event) {
  console.log('push received: ', event);
  count++;
  self.registration.showNotification('Push Notification', {
    body: 'Push Notification Received: ' + count,
  });
});