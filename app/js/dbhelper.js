import idb from 'idb';

var dbPromise = idb.open('mws-restaurant-app', 3, (upgrade) => {
  switch (upgrade.oldVersion) {
    case 0:
      upgrade.createObjectStore('restaurants');
    case 1:
      upgrade.createObjectStore('reviews');
    case 2:
      upgrade.createObjectStore("queuedRequests", {
        keyPath: "id",
        autoIncrement: true
      });
  }
});

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(`${DBHelper.DATABASE_URL}/restaurants`)
      .then( response => response.json())
      .then( json => callback(null, json))
      .catch( error => callback(error, null));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}`)
      .then( response => response.json())
      .then( json => callback(null, json))
      .catch( error => callback(error, null));
  }

  /**
   * Fetch all reviews for a restaurant.
   */
  static fetchRestaurantReviewsById(id, callback) {
    fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`)
      .then( response => response.json())
      .then( json => callback(null, json))
      .catch( error => callback(error, null));
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Post a review.
   */
  static postReview(restaurant_id, name, rating, review, callback) {
    const data = {
      'restaurant_id': restaurant_id,
      'name': name,
      'rating': rating,
      'comments': review,
      'createdAt': Date.now()
    }

    DBHelper.addReviewToCache(data, restaurant_id, () => {
          fetch(`${DBHelper.DATABASE_URL}/reviews/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(data)
      })
      .then( response => response.json())
      .then( json => callback(null, json))
      .catch( error => callback(error, null));
    });
  }

  /**
   * Add review to cache.
   */
   static addReviewToCache(data, restaurant_id, callback) {
    dbPromise.then(db => {
      const tx = db.transaction('reviews', 'readwrite')
      tx.objectStore('reviews').get(restaurant_id)
      .then(reviews => {
        reviews.push(data);
        tx.objectStore('reviews').put(reviews, restaurant_id);
        tx.complete;
        callback()
      })
      .catch(error => {
        console.log('Error adding review to cache:', error)
        callback()
      });  
    });
   }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, size) {
    if (!restaurant.photograph) return `/img/generic_restaurant${size || ''}.jpg`;
    return (`/img/${restaurant.photograph}${size || ''}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

window.DBHelper = DBHelper;
