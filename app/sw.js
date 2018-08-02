
var currentCacheName = 'restaurants-cache-0001';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(currentCacheName).then( (cache) => {
      return cache.addAll([
        '/js/dbhelper.js',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/css/styles.css',
        '/index.html',
        '/restaurant.html'
      ]);
    }).catch ( (error) => {
      console.log("Cache Error: ", error)
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then( (cacheNames) => {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurants-cache') &&
                 cacheName != currentCacheName;
        }).map( (cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  var url = new URL(event.request.url); 
  // console.log('Fetch caught', url); 


  let request = event.request 
  if (url.origin === location.origin) {
    if (url.pathname === '/restaurant.html') {
      request = '/restaurant.html'
    }
    if (url.pathname === '/') {
      request = '/index.html'
    }
  }
  event.respondWith(
    caches.match(request).then( (response) => {
      if (response) console.log('Serving response from cache', event.request.url);
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  console.log('Skip Waiting command sent')
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
