const global = {
  // Normalise "/shows", "/shows.html" and "/" so routing works with pretty URLs
  currentPage: window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/",
  search: {
    term: "",
    type: "",
    page: 1,
    totalPages: 1,
    totalResults: 0,
  },
};

const IMG_URL = "https://image.tmdb.org/t/p/";
const NO_IMAGE = "images/no-image.jpg";

// ---------- Helpers ----------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function poster(path, size = "w500") {
  return path ? `${IMG_URL}${size}${path}` : NO_IMAGE;
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString() : "N/A";
}

function formatMoney(n) {
  return n ? `$${n.toLocaleString("en-US")}` : "N/A";
}

function showSpinner() {
  document.querySelector(".spinner")?.classList.add("show");
}

function hideSpinner() {
  document.querySelector(".spinner")?.classList.remove("show");
}

function showAlert(message, className = "error") {
  let container = document.querySelector("#alert");
  if (!container) {
    container = document.createElement("div");
    container.id = "alert";
    document.querySelector("main, section.container, body").prepend(container);
  }
  const div = document.createElement("div");
  div.classList.add("alert", `alert-${className}`);
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function cardHTML({ id, type, title, image, dateLabel, date }) {
  return `
    <a href="${type}-details.html?id=${id}">
      <img src="${poster(image)}" class="card-img-top" alt="${escapeHTML(title)}" loading="lazy" />
    </a>
    <div class="card-body">
      <h5 class="card-title">${escapeHTML(title)}</h5>
      <p class="card-text">
        <small class="text-muted">${dateLabel}: ${formatDate(date)}</small>
      </p>
    </div>`;
}

function renderCard(container, item) {
  const div = document.createElement("div");
  div.classList.add("card");
  div.innerHTML = cardHTML(item);
  container.appendChild(div);
}

// ---------- API (through our server so the key stays private) ----------

async function fetchAPIData(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  showSpinner();
  try {
    const response = await fetch(`/api/tmdb/${endpoint}${qs ? `?${qs}` : ""}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.status_message || data.error || "Request failed");
    return data;
  } finally {
    hideSpinner();
  }
}

// ---------- Home page ----------

async function displayPopularMovies() {
  const container = document.querySelector("#popular-movies");
  const { results } = await fetchAPIData("movie/popular");
  container.innerHTML = "";
  results.forEach((movie) =>
    renderCard(container, {
      id: movie.id,
      type: "movie",
      title: movie.title,
      image: movie.poster_path,
      dateLabel: "Release",
      date: movie.release_date,
    }),
  );
}

async function displaySlider() {
  const wrapper = document.querySelector(".swiper-wrapper");
  const { results } = await fetchAPIData("movie/now_playing");
  results.forEach((movie) => {
    const div = document.createElement("div");
    div.classList.add("swiper-slide");
    div.innerHTML = `
      <a href="movie-details.html?id=${movie.id}">
        <img src="${poster(movie.poster_path)}" alt="${escapeHTML(movie.title)}" />
      </a>
      <h4 class="swiper-rating">
        <i class="fas fa-star text-secondary"></i> ${movie.vote_average.toFixed(1)} / 10
      </h4>`;
    wrapper.appendChild(div);
  });
  initSwiper();
}

function initSwiper() {
  if (typeof Swiper === "undefined") return;
  new Swiper(".swiper", {
    slidesPerView: 1,
    spaceBetween: 30,
    freeMode: true,
    loop: true,
    autoplay: { delay: 4000, disableOnInteraction: false },
    breakpoints: {
      500: { slidesPerView: 2 },
      700: { slidesPerView: 3 },
      1200: { slidesPerView: 4 },
    },
  });
}

// ---------- TV shows page ----------

async function displayPopularShows() {
  const container = document.querySelector("#popular-shows");
  const { results } = await fetchAPIData("tv/popular");
  container.innerHTML = "";
  results.forEach((show) =>
    renderCard(container, {
      id: show.id,
      type: "tv",
      title: show.name,
      image: show.poster_path,
      dateLabel: "Air Date",
      date: show.first_air_date,
    }),
  );
}

// ---------- Details pages ----------

function backdrop(path) {
  if (!path) return;
  const div = document.createElement("div");
  Object.assign(div.style, {
    backgroundImage: `url(${IMG_URL}original${path})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    height: "100vh",
    width: "100vw",
    position: "absolute",
    top: "0",
    left: "0",
    zIndex: "-1",
    opacity: "0.1",
  });
  document.body.appendChild(div);
}

function detailsTop(item, title, date, dateLabel, homepageLabel) {
  return `
    <div class="details-top">
      <div>
        <img src="${poster(item.poster_path)}" class="card-img-top" alt="${escapeHTML(title)}" />
      </div>
      <div>
        <h2>${escapeHTML(title)}</h2>
        <p><i class="fas fa-star text-primary"></i> ${item.vote_average.toFixed(1)} / 10</p>
        <p class="text-muted">${dateLabel}: ${formatDate(date)}</p>
        <p>${escapeHTML(item.overview) || "No overview available."}</p>
        <h5>Genres</h5>
        <ul class="list-group">
          ${item.genres.map((g) => `<li>${escapeHTML(g.name)}</li>`).join("")}
        </ul>
        ${item.homepage ? `<a href="${escapeHTML(item.homepage)}" target="_blank" rel="noopener" class="btn">${homepageLabel}</a>` : ""}
      </div>
    </div>`;
}

function companies(item) {
  return item.production_companies.map((c) => escapeHTML(c.name)).join(", ") || "N/A";
}

async function displayMovieDetails() {
  const id = new URLSearchParams(window.location.search).get("id");
  const container = document.querySelector("#movie-details");
  if (!id || !/^\d+$/.test(id)) {
    container.innerHTML = "<p>Movie not found.</p>";
    return;
  }
  const movie = await fetchAPIData(`movie/${id}`);
  backdrop(movie.backdrop_path);
  document.title = `${movie.title} | AaqiFlix`;
  container.innerHTML = `
    ${detailsTop(movie, movie.title, movie.release_date, "Release Date", "Visit Movie Homepage")}
    <div class="details-bottom">
      <h2>Movie Info</h2>
      <ul>
        <li><span class="text-secondary">Budget:</span> ${formatMoney(movie.budget)}</li>
        <li><span class="text-secondary">Revenue:</span> ${formatMoney(movie.revenue)}</li>
        <li><span class="text-secondary">Runtime:</span> ${movie.runtime ? `${movie.runtime} minutes` : "N/A"}</li>
        <li><span class="text-secondary">Status:</span> ${escapeHTML(movie.status)}</li>
      </ul>
      <h4>Production Companies</h4>
      <div class="list-group">${companies(movie)}</div>
    </div>`;
}

async function displayShowDetails() {
  const id = new URLSearchParams(window.location.search).get("id");
  const container = document.querySelector("#show-details");
  if (!id || !/^\d+$/.test(id)) {
    container.innerHTML = "<p>Show not found.</p>";
    return;
  }
  const show = await fetchAPIData(`tv/${id}`);
  backdrop(show.backdrop_path);
  document.title = `${show.name} | AaqiFlix`;
  container.innerHTML = `
    ${detailsTop(show, show.name, show.first_air_date, "First Air Date", "Visit Show Homepage")}
    <div class="details-bottom">
      <h2>Show Info</h2>
      <ul>
        <li><span class="text-secondary">Number Of Episodes:</span> ${show.number_of_episodes ?? "N/A"}</li>
        <li><span class="text-secondary">Last Episode To Air:</span> ${escapeHTML(show.last_episode_to_air?.name) || "N/A"}</li>
        <li><span class="text-secondary">Status:</span> ${escapeHTML(show.status)}</li>
      </ul>
      <h4>Production Companies</h4>
      <div class="list-group">${companies(show)}</div>
    </div>`;
}

// ---------- Search page ----------

async function search() {
  const params = new URLSearchParams(window.location.search);
  global.search.type = params.get("type") === "tv" ? "tv" : "movie";
  global.search.term = (params.get("search-term") || "").trim();

  // Keep the form in sync with the current search
  const termInput = document.querySelector("#search-term");
  if (termInput) termInput.value = global.search.term;
  const radio = document.querySelector(`#${global.search.type}`);
  if (radio) radio.checked = true;

  const resultsEl = document.querySelector("#search-results");
  resultsEl.innerHTML = "";
  document.querySelector("#pagination").innerHTML = "";

  if (!global.search.term) {
    showAlert("Please enter a search term");
    return;
  }
  await runSearch();
}

async function runSearch() {
  const { results, total_pages, page, total_results } = await fetchAPIData(
    `search/${global.search.type}`,
    { query: global.search.term, page: global.search.page },
  );
  global.search.page = page;
  global.search.totalPages = total_pages;
  global.search.totalResults = total_results;

  if (!results.length) {
    document.querySelector("#search-results-heading").innerHTML = "";
    showAlert("No results found");
    return;
  }
  displaySearchResults(results);
}

function displaySearchResults(results) {
  const container = document.querySelector("#search-results");
  container.innerHTML = "";
  const isMovie = global.search.type === "movie";

  results.forEach((item) =>
    renderCard(container, {
      id: item.id,
      type: global.search.type,
      title: isMovie ? item.title : item.name,
      image: item.poster_path,
      dateLabel: isMovie ? "Release" : "Air Date",
      date: isMovie ? item.release_date : item.first_air_date,
    }),
  );

  document.querySelector("#search-results-heading").innerHTML = `
    <h2>${results.length} of ${global.search.totalResults} results for "${escapeHTML(global.search.term)}"</h2>`;

  displayPagination();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function displayPagination() {
  const { page, totalPages } = global.search;
  const el = document.querySelector("#pagination");
  el.innerHTML = `
    <div class="pagination">
      <button class="btn btn-primary" id="prev" ${page <= 1 ? "disabled" : ""}>Prev</button>
      <button class="btn btn-primary" id="next" ${page >= totalPages ? "disabled" : ""}>Next</button>
      <div class="page-counter">Page ${page} of ${totalPages}</div>
    </div>`;

  el.querySelector("#prev").addEventListener("click", () => {
    global.search.page--;
    runSearch().catch(handleError);
  });
  el.querySelector("#next").addEventListener("click", () => {
    global.search.page++;
    runSearch().catch(handleError);
  });
}

// ---------- Navigation & routing ----------

function highlightActiveLink() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href").replace(/\.html$/, "").replace(/\/$/, "") || "/";
    if (href === global.currentPage) link.classList.add("active");
  });
}

function handleError(err) {
  console.error(err);
  hideSpinner();
  showAlert(`Could not load data: ${err.message}`);
}

const routes = {
  "/": () => Promise.all([displaySlider(), displayPopularMovies()]),
  "/index": () => Promise.all([displaySlider(), displayPopularMovies()]),
  "/shows": displayPopularShows,
  "/movie-details": displayMovieDetails,
  "/tv-details": displayShowDetails,
  "/search": search,
};

function init() {
  highlightActiveLink();
  const route = routes[global.currentPage];
  if (route) Promise.resolve(route()).catch(handleError);
}

document.addEventListener("DOMContentLoaded", init);
