// SERVICE WORKER

const CACHE_NAME = 'v1.1';

const urlsToCache = [
  '/',
  '/index.html',
  // '/index.js',
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

self.addEventListener('fetch', (event) => {

  // Skip caching for /api requests
  if (event.request.url.includes('/api')) {
    return;
  }
  

    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Clone the request
          const fetchRequest = event.request.clone();

          return fetch(fetchRequest)
            .then((response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            });
        })
    );
});

// handle notification click event
self.addEventListener('notificationclick', function (event) {
  console.log('notification received: ', event);
});

// In your service worker file:
self.addEventListener('message', function(event) {
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