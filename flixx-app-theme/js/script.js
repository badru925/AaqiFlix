const global = {
  currentPage: window.location.pathname,
};

async function popularMovies() {
  const { results } = await fetchAPIData("movie/popular");
  results.forEach((movie) => {
    const div = document.createElement("div");
    div.classList("card");
    div.innerHTML = `<a href="movie-details.html?id=1">
            <img
              src="images/no-image.jpg"
              class="card-img-top"
              alt="Movie Title"
            />
          </a>
          <div class="card-body">
            <h5 class="card-title">Movie Title</h5>
            <p class="card-text">
              <small class="text-muted">Release: XX/XX/XXXX</small>
            </p>
          </div>`;
  });
}

// Fetch data from TMDB API
async function fetchAPIData(endpoint) {
  // Register your key at https://www.themoviedb.org/settings/api and enter here
  // Only use this for development or very small projects. You should store your key and make requests from a server
  const API_KEY = "";
  const API_URL = "https://api.themoviedb.org/3/";

  const response = await fetch(
    `${API_URL}${endpoint}?api_key=${API_KEY}&language=en-US`,
  );

  const data = await response.json();

  return data;
}

function highlightActiveLink() {
  const links = document.querySelectorAll(".nav-link");
  links.forEach((link) => {
    if (link.getAttribute("href") === global.currentPage) {
      link.classList.add("active");
    }
  });
}

function init() {
  switch (global.currentPage) {
    case "/":
    case "/index.html":
      console.log("Home");
      break;
    case "/movie-details.html":
      console.log("Movie details");
      break;
    case "/search.html":
      console.log("Search");
      break;
    case "/shows.html":
      console.log("Shows");
      break;
    case "/tv-details.html":
      console.log("Tv Details");
      break;
  }
  highlightActiveLink();
}

document.addEventListener("DOMContentLoaded", init);
