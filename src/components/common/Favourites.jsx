function isFavourite(address) {
  const favourites = loadFavourites();
  return favourites.includes(address);
}

function addFavourite(address) {
  const favourites = loadFavourites();
  if (!favourites.includes(address)) {
    favourites.push(address);
    saveFavourites(favourites);
  }
}

function removeFavourite(address) {
  let favourites = loadFavourites();
  favourites = favourites.filter((fav) => fav !== address);
  saveFavourites(favourites);
}

function saveFavourites(favourites) {
  localStorage.setItem('favourites', JSON.stringify(favourites));
}

function loadFavourites() {
  return JSON.parse(localStorage.getItem('favourites')) || [];
}

export { isFavourite, addFavourite, removeFavourite, loadFavourites };
