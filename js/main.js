let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker()
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

registerServiceWorker = () => {

  if (!navigator.serviceWorker) {
    console.log("Cannot register servie worker. Service worker unavailable.")
    return
  }

  navigator.serviceWorker.register('/sw.js').then( (reg) => {

    // if (!navigator.serviceWorker.controller) {
    //   console.log("Service worker registered, but no controller available")
    //   return;
    // }

    if (reg.waiting) {
      console.log("Service worker update ready!")
      updateReady(reg.waiting);
      return;
    }

    if (reg.installing) {
      console.log("Service worker installing!")
      trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', () => {
      console.log("Service worker update found!")
      trackInstalling(reg.installing);
    });
    console.log("Service worker registration complete!")
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
};

updateReady = (worker) => {
  worker.postMessage({action: 'skipWaiting'});
};

trackInstalling = (worker) => {
  worker.addEventListener('statechange', () => {
    if (worker.state == 'installed') {
      updateReady(worker);
    }
  });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: '<your MAPBOX API KEY HERE>',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const list = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    list.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  let url = DBHelper.urlForRestaurant(restaurant)
  const restaurantArticle = document.createElement('article');

  const imageDiv = document.createElement('div');
  imageDiv.className = 'restaurant-image-div';
  const imageLink = document.createElement('a');
  imageLink.href = url;
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name
  imageLink.append(image);
  imageDiv.append(imageLink);
  
  const nameDiv = document.createElement('div');
  nameDiv.className = 'restaurant-name-div';
  nameDiv.innerHTML = `<h2>${restaurant.name}</h2>`;
  imageDiv.append(nameDiv)
  restaurantArticle.append(imageDiv);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  restaurantArticle.append(address);

  const hours = document.createElement('p');
  hours.innerHTML = todaysHours(restaurant.operating_hours);
  restaurantArticle.append(hours);
  
  const moreContainer = document.createElement('div');
  moreContainer.className = 'moreContainer'
  const more = document.createElement('button');
  more.innerHTML = 'More Details';
  more.onclick = () => {
    window.location = url;
  }
  moreContainer.append(more)
  restaurantArticle.append(moreContainer)

  return restaurantArticle
}

todaysHours = (operatingHours = self.restaurant.operating_hours) => {
  let today = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]
  let hours = operatingHours[today]
  return 'Today\'s Hours<br>' + hours
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
  });
} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

