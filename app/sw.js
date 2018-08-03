import idb from 'idb';

var dbPromise = idb.open('mws-restaurant-app', 1, (upgrade) => {
  switch (upgrade.oldVersion) {
    case 0:
      upgrade.createObjectStore('restaurants');
  }
});

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
        '/restaurant.html',
        'img/1.jpg',
        'img/2.jpg',
        'img/3.jpg',
        'img/4.jpg',
        'img/5.jpg',
        'img/6.jpg',
        'img/7.jpg',
        'img/8.jpg',
        'img/9.jpg'
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
  if (url.port == 1337) {
    handleRestaurantDataRequest(event, url.pathname)
    return
  }

  if (url.origin === location.origin) {
    if (url.pathname === '/restaurant.html') {
      request = '/restaurant.html'
    }
    if (url.pathname === '/') {
      request = '/index.html'
    }
    if (url.pathname === '/img/undefined.jpg') {
      request = '/img/1.jpg'
    }
  }
  event.respondWith(
    caches.match(request).then( (response) => {
      if (response) console.log('Serving response from cache', event.request.url);
      return response || fetch(event.request).then( response => {
        if (response.status == 404) {
          return fetch(new URL('http://localhost:9000/img/1.jpg'))
        }
        return response;
      }).catch( error => {
        console.log("Fetch Error:", error)
      })
    })
  );
});

var handleRestaurantDataRequest = (event, key) => {
  event.respondWith(
    dbPromise.then(db => {
      return db.transaction('restaurants').objectStore('restaurants').get(key).then( cachedResponse => {
        if (cachedResponse) console.log('Serving response from cache', event.request.url);
        return cachedResponse || fetch(event.request).then(fetchResonse => {
          return fetchResonse.json().then( json => {
            const tx = db.transaction('restaurants', 'readwrite');
            tx.objectStore('restaurants').put(json, key);
            tx.complete;
            return json
          })
        });
      });
    }).then( json => {
      let response = new Response(JSON.stringify(json));
      return response
    }).catch(error => {
      console.log("IndexedDB Error:", error);
    })
  );
}

self.addEventListener('message', (event) => {
  console.log('Skip Waiting command sent')
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
