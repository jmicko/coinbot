// SERVICE WORKER

const CACHE_NAME = 'coinbot-cache-v1.3.0';

const urlsToCache = [
  '/',
  '/index.html',
  '/favicon/favicon.ico',
  '/manifest.json',
  // '/static/js/bundle.js', 
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log(err, '< error caching');
      })
  );
});

// self.addEventListener('install', (event) => {
//   self.skipWaiting();
//   event.waitUntil(
//     caches.open(CACHE_NAME)
//       .then((cache) => {
//         console.log('Opened cache');
//         return Promise.all(
//           urlsToCache.map((url) =>
//             cache.add(url).catch((error) => console.log(`Error caching ${url}: ${error}`))
//           )
//         );
//       })
//   );
// });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('DELETING OLD CACHES');
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
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
self.addEventListener('message', async function (event) {
  if (event.data) {
    const message = JSON.parse(event.data);
    console.log('message received: ', message);
    if (message.type === 'show-notification') {
      const { title, body, icon } = message;
      console.log('showing notification: ', title, body);
      // self.registration.showNotification(title, {
      //   body: body,
      //   icon: icon,
      // });

    }
  }
});
let count = 0;

// listen for push events
self.addEventListener('push', async function (event) {
  console.log('push received: ', event);
  count++;
  // display whatever notification was received
  const { title, body, icon, type } = event.data.json();
  // event.waitUntil(
  //   self.registration.showNotification(title, {
  //     body: body,
  //     icon: icon,
  //   })
  // );


  // if the window is open and active, show a notification that says the user is online
  // if it is closed, show a notification that says the user is offline
  const allClients = await clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });

  // check if the tab is the active tab
  const activeClient = allClients.find((client) => client.focused);

  if (type === 'update') {
    // always show update notification
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
    })

  } else if (activeClient) {
    // any notification that is received while the user is online will be displayed in this block

    // show notification that user is online
    // self.registration.showNotification('User is online', {
    //   body: 'User is online',
    //   icon: icon,
    // });


  } else {
    // this block will be executed if the window is closed or the user is not active on the tab

    // show notification that user is offline
    // self.registration.showNotification('User is offline', {
    //   body: 'User is offline',
    //   icon: icon,
    // });



  }
});