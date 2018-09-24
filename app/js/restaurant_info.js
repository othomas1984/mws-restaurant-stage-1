let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
  DBHelper.sendQueuedNetworkRequests()
});

/**
 * Initialize leaflet map
 */
let initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoib3Rob21hczE5ODQiLCJhIjoiY2ppYjh6a2M2MDQyNDNwcXJxdWNybjQ1YyJ9.LlwJqcW68IZ9HEoDmR64Kw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
      fetchRestaurantReviewsFromURL( (error, reviews) => {
        fillRestaurantHTML(); 
      });
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
let fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      callback(null, restaurant)
    });
  }
}

/**
 * Get current restaurant reviews from page URL.
 */
let fetchRestaurantReviewsFromURL = (callback) => {
  if (!self.restaurant) { // restaurant not yet fetched
    error = 'Restaurant not yet fetched'
    callback(error, null);
    return
  }
  if (self.restaurant && self.restaurant.reviews) { // reviews already fetched!
    callback(null, self.restaurant.reviews)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantReviewsById(id, (error, reviews) => {
      self.restaurant.reviews = reviews;
      if (!restaurant.reviews) {
        console.error(error);
        return;
      }
      callback(null, restaurant.reviews)
    });
  }
}

/**
 * Submit new review.
 */
let submitReview = () => {
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    const nameElement = document.getElementById('add-review-form-full-name');
    const name = nameElement.value
    const ratingElement = document.getElementById('add-review-form-rating');
    const ratingIndex = ratingElement.selectedIndex;
    const rating = ratingElement[ratingIndex].value;
    const reviewElement = document.getElementById('add-review-form-review');
    const review = reviewElement.value

    nameElement.value = null;
    reviewElement.value = null;
    ratingElement.selectedIndex = 0;
    toggleReviewFormVisibility(false);

    DBHelper.postReview(id, name, rating, review, (error, response) => {
      if(error) {
        alert('Error saving review. Please try again');
      } else {
        self.restaurant.reviews = null
        fetchRestaurantReviewsFromURL( (error, reviews) => {
          fillReviewsHTML(); 
        });
      }
    });
  }
}

/**
 * Submit new review.
 */
let toggleFavorite = () => {
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    const favoriteElement = document.getElementById('restaurant-favorite');
    let currentlySelected = (favoriteElement.className == 'favorite-selected')
    let newSelectedState = !currentlySelected

    DBHelper.setFavorite(id, newSelectedState, (error, response) => {
      if(error) {
        alert('Error saving favorite. Please try again');
      } else {
        self.restaurant.is_favorite = newSelectedState
        favoriteElement.className = newSelectedState ? 'favorite-selected' : 'favorite-unselected';
        favoriteElement.title = newSelectedState ? 'Is a favorite' : 'Is not a favorite';
      }
    });
  }
}

/**
 * Toggle Review Form Visibility
 */
let toggleReviewFormVisibility = (open = null) => {
  const favoriteElement = document.getElementById('add-review-form');
  let currentlyOpen = (favoriteElement.className == 'open')
  let newOpenState = open || !currentlyOpen
  favoriteElement.className = newOpenState ? 'open' : 'closed';
}

/**
 * Create restaurant HTML and add it to the webpage
 */
let fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant, '_2x');
  image.alt = restaurant.name

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  const favorite = document.getElementById('restaurant-favorite');
  favorite.title = restaurant.is_favorite ? 'Is a favorite' : 'Is not a favorite';
  favorite.className = restaurant.is_favorite ? 'favorite-selected' : 'favorite-unselected';

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    day.className = 'day'
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    time.className = 'times'
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
let fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  container.innerHTML = '<div id="reviews-list"></div>';
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
let createReviewHTML = (review) => {
  const reviewArticle = document.createElement('article');
  const rating = document.createElement('span');
  rating.innerHTML = `${review.rating} of 5 stars`;
  rating.className = 'reviewRating'
  rating.classList.add(`rating${review.rating}`);
  reviewArticle.appendChild(rating);

  const name = document.createElement('span');
  name.innerHTML = review.name;
  name.className = 'reviewerName'
  reviewArticle.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = new Date(review.createdAt).toDateString();
  date.className = 'reviewDate'
  reviewArticle.appendChild(date);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'reviewBody'
  reviewArticle.appendChild(comments);

  return reviewArticle;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
let fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
let getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
