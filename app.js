/* Interfaz y flujo de CineHub. Los datos se guardan en IndexedDB para usarlos offline. */
const $ = selector => document.querySelector(selector);
const grid = $("#movie-grid");
const dialog = $("#movie-dialog");
const detailContent = $("#detail-content");
const emptyState = $("#empty-state");
let currentView = "home";
let toastTimer;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function setConnectionState(online, announce = false) {
  document.body.classList.toggle("is-offline", !online);
  $("#connection-label").textContent = online ? "Conectado" : "Sin conexión";
  $(".header-status").setAttribute("aria-label", online ? "Conectado a Internet" : "Sin conexión a Internet");
  if (announce) showToast(online ? "Conexión restaurada" : "Sin conexión a Internet. Puedes consultar tus favoritas.");
}

window.addEventListener("online", () => { setConnectionState(true, true); if (currentView === "home") cargarPopulares(); });
window.addEventListener("offline", () => setConnectionState(false, true));

function placeholder(label = "Póster no disponible") {
  return `<div class="poster-placeholder" role="img" aria-label="${escapeHTML(label)}"><span>CH</span><small>CINEHUB</small></div>`;
}

function renderPoster(path, title, className = "") {
  if (!path) return placeholder(`Póster no disponible para ${title}`);
  const safeTitle = escapeHTML(title);
  return `<img class="${className}" data-poster="true" src="${urlPoster(path)}" alt="Póster de ${safeTitle}" loading="lazy">`;
}

document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.matches("img[data-poster]")) return;
  const fallback = document.createElement("div");
  fallback.className = "poster-placeholder";
  fallback.setAttribute("role", "img");
  fallback.setAttribute("aria-label", `Póster no disponible para ${image.alt.replace(/^Póster de /, "")}`);
  fallback.innerHTML = "<span>CH</span><small>CINEHUB</small>";
  image.replaceWith(fallback);
}, true);

function mapMovie(movie) {
  return {
    id: Number(movie.id), title: movie.title || movie.name || "Sin título",
    original_title: movie.original_title || "", poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null, overview: movie.overview || "Descripción no disponible.",
    vote_average: Number(movie.vote_average) || 0, release_date: movie.release_date || "",
    genre_ids: movie.genre_ids || [], genres: movie.genres || [], runtime: movie.runtime || null,
    original_language: movie.original_language || "", popularity: movie.popularity || 0
  };
}

function loadingCards() {
  emptyState.hidden = true;
  grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-card"><div class="skeleton-poster"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>').join("");
}

async function renderMovies(movies) {
  const favorites = await obtenerFavoritos().catch(error => { console.error("No se pudieron leer las favoritas para marcar tarjetas:", error); return []; });
  const favoriteIds = new Set(favorites.map(movie => Number(movie.id)));
  grid.innerHTML = "";
  if (!movies.length) { emptyState.hidden = false; return; }
  emptyState.hidden = true;
  grid.innerHTML = movies.map(rawMovie => {
    const movie = mapMovie(rawMovie);
    const favorite = favoriteIds.has(movie.id);
    return `<article class="movie-card">
      <button class="poster-button" data-details="${movie.id}" aria-label="Ver detalles de ${escapeHTML(movie.title)}">${renderPoster(movie.poster_path, movie.title)}<span class="poster-rating">★ ${movie.vote_average.toFixed(1)}</span></button>
      <div class="card-info"><h3 title="${escapeHTML(movie.title)}">${escapeHTML(movie.title)}</h3><div class="card-meta"><span>${escapeHTML(movie.release_date.slice(0, 4) || "Fecha desconocida")}</span><span>★ ${movie.vote_average.toFixed(1)}</span></div>
      <div class="card-actions"><button class="text-button" data-details="${movie.id}">Detalles <span aria-hidden="true">→</span></button><button class="favorite-button ${favorite ? "is-favorite" : ""}" data-favorite="${movie.id}" aria-label="${favorite ? "Quitar de favoritos" : "Agregar a favoritos"}: ${escapeHTML(movie.title)}" aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button></div></div></article>`;
  }).join("");
}

function setEmpty(title, copy) {
  grid.innerHTML = "";
  $("#empty-title").textContent = title;
  $("#empty-copy").textContent = copy;
  emptyState.hidden = false;
}

async function cargarPopulares() {
  currentView = "home";
  $("#list-eyebrow").textContent = "LO MÁS VISTO";
  $("#list-title").textContent = "Películas populares";
  $("#result-count").textContent = "";
  loadingCards();
  try {
    if (!navigator.onLine) throw new Error("offline");
    const data = await obtenerPeliculasPopulares();
    const movies = (data.results || []).map(mapMovie);
    await guardarLista("popular", movies).catch(error => console.error("No se pudo guardar el catálogo offline:", error));
    await Promise.all(movies.map(movie => guardarPelicula(movie).catch(error => console.error("No se pudo guardar una película offline:", error))));
    if (movies[0]) renderHero(movies[0]);
    await renderMovies(movies);
    $("#result-count").textContent = `${movies.length} películas`;
  } catch (error) {
    console.error("No se pudieron cargar las películas populares:", error);
    const saved = await obtenerLista("popular").catch(() => null);
    if (saved?.movies?.length) {
      await renderMovies(saved.movies);
      if (saved.movies[0]) renderHero(saved.movies[0]);
      showToast(navigator.onLine ? "Mostrando películas guardadas" : "Sin conexión: mostrando el catálogo guardado");
    } else {
      if (error.message.includes("API Key")) setEmpty("Configura tu acceso a TMDB", "Copia config.example.js como config.js y añade tu API Key v3 de TMDB para cargar el catálogo.");
      else setEmpty(navigator.onLine ? "No pudimos cargar las películas" : "Sin conexión a Internet", navigator.onLine ? "Comprueba tu conexión e inténtalo nuevamente." : "No hay catálogo guardado todavía. Puedes consultar tus películas favoritas.");
    }
  }
}

function renderHero(movie) {
  const backdrop = urlBackdrop(movie.backdrop_path);
  const hero = $("#hero");
  hero.style.backgroundImage = backdrop ? `url("${backdrop}")` : "";
  $("#hero-content").innerHTML = `<span class="eyebrow">SELECCIÓN CINEHUB · ★ ${movie.vote_average.toFixed(1)}</span><h1>${escapeHTML(movie.title)}</h1><p>${escapeHTML(movie.overview || "Una historia para descubrir.")}</p><button class="button button-primary" data-details="${movie.id}">Ver detalles <span aria-hidden="true">→</span></button>`;
  $("#hero-credit").textContent = movie.release_date ? `ESTRENO · ${movie.release_date.slice(0, 4)}` : "UNA HISTORIA PARA DESCUBRIR";
}

async function buscar(query) {
  const term = query.trim();
  if (!term) { showToast("Escribe el título de una película para buscar."); $("#search-input").focus(); return; }
  currentView = "search";
  $("#list-eyebrow").textContent = "RESULTADOS DE BÚSQUEDA";
  $("#list-title").textContent = `Resultados para “${term}”`;
  $("#result-count").textContent = "";
  loadingCards();
  if (!navigator.onLine) {
    setEmpty("No tienes conexión a Internet", "No tienes conexión a Internet. Puedes consultar tus películas favoritas guardadas.");
    return;
  }
  try {
    const data = await buscarPeliculas(term);
    const movies = (data.results || []).map(mapMovie);
    await Promise.all(movies.map(movie => guardarPelicula(movie).catch(error => console.error("No se pudo guardar una película de búsqueda:", error))));
    await guardarLista(`search:${term.toLocaleLowerCase()}`, movies).catch(error => console.error("No se pudo guardar la búsqueda:", error));
    await renderMovies(movies);
    $("#result-count").textContent = `${movies.length} resultados`;
    if (!movies.length) setEmpty("No encontramos esa película", "Prueba con otro título.");
  } catch (error) {
    console.error("Error al buscar películas:", error);
    setEmpty("No pudimos realizar la búsqueda", "Comprueba tu conexión e inténtalo nuevamente.");
  }
}

const GENRES = { 28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia", 80: "Crimen", 99: "Documental", 18: "Drama", 10751: "Familiar", 14: "Fantasía", 36: "Historia", 27: "Terror", 10402: "Música", 9648: "Misterio", 10749: "Romance", 878: "Ciencia ficción", 10770: "Película de TV", 53: "Suspenso", 10752: "Bélica", 37: "Western" };

async function abrirDetalles(id) {
  detailContent.innerHTML = '<div class="detail-loading"><span class="spinner"></span><p>Cargando detalles…</p></div>';
  dialog.showModal();
  let movie;
  try {
    if (!navigator.onLine) throw new Error("offline");
    movie = mapMovie(await obtenerDetallesPelicula(id));
    await guardarPelicula(movie).catch(error => console.error("No se pudieron guardar los detalles para uso offline:", error));
  } catch (error) {
    console.error("No se pudieron consultar los detalles:", error);
    movie = await obtenerPeliculaGuardada(id).catch(() => null) || await obtenerFavorito(id).catch(() => null);
    if (!movie) {
      detailContent.innerHTML = '<div class="detail-loading"><h2 id="detail-title">Detalles no disponibles</h2><p>No hay información guardada para consultar sin conexión.</p></div>';
      return;
    }
    showToast("Mostrando información guardada en este dispositivo");
  }
  const favorite = await esFavorito(movie.id);
  const genres = movie.genres?.length ? movie.genres.map(genre => genre.name) : (movie.genre_ids || []).map(id => GENRES[id]).filter(Boolean);
  const release = movie.release_date ? new Date(`${movie.release_date}T12:00:00`).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "Fecha desconocida";
  detailContent.innerHTML = `<div class="detail-layout">${renderPoster(movie.poster_path, movie.title, "detail-poster")}<div class="detail-copy"><span class="eyebrow">DETALLES DE LA PELÍCULA</span><h2 id="detail-title">${escapeHTML(movie.title)}</h2>${movie.original_title && movie.original_title !== movie.title ? `<p class="original-title">${escapeHTML(movie.original_title)}</p>` : ""}<div class="detail-stats"><span class="score">★ ${movie.vote_average.toFixed(1)} <small>/ 10</small></span><span>${escapeHTML(release)}</span>${movie.runtime ? `<span>${movie.runtime} min</span>` : ""}</div><div class="genre-list">${genres.map(genre => `<span>${escapeHTML(genre)}</span>`).join("") || "Géneros no disponibles"}</div><p class="detail-overview">${escapeHTML(movie.overview || "Descripción no disponible.")}</p><div class="extra-info"><span>Idioma original <b>${escapeHTML((movie.original_language || "—").toUpperCase())}</b></span>${movie.popularity ? `<span>Popularidad <b>${movie.popularity.toFixed(0)}</b></span>` : ""}</div><button class="button favorite-detail ${favorite ? "is-favorite" : ""}" data-favorite="${movie.id}" aria-pressed="${favorite}">${favorite ? "♥ En tus favoritos" : "♡ Agregar a favoritos"}</button></div></div>`;
}

async function toggleFavorite(id) {
  const movie = await obtenerPeliculaGuardada(id);
  const card = grid.querySelector(`[data-favorite="${id}"]`);
  const detailButton = detailContent.querySelector(`[data-favorite="${id}"]`);
  const favorite = await esFavorito(id);
  if (favorite) {
    await eliminarFavorito(id);
    showToast("Película quitada de tus favoritos");
  } else if (movie) {
    await agregarFavorito(movie);
    showToast("Película guardada en tus favoritos");
  } else {
    const cached = await obtenerPeliculaGuardada(id);
    if (cached) await agregarFavorito(cached);
  }
  const nowFavorite = !favorite;
  [card, detailButton].filter(Boolean).forEach(button => {
    button.classList.toggle("is-favorite", nowFavorite);
    button.setAttribute("aria-pressed", String(nowFavorite));
    if (button.classList.contains("favorite-button")) {
      button.textContent = nowFavorite ? "♥" : "♡";
      button.setAttribute("aria-label", `${nowFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}: ${movie?.title || "película"}`);
    } else button.textContent = nowFavorite ? "♥ En tus favoritos" : "♡ Agregar a favoritos";
  });
  if (currentView === "favorites") await verFavoritos();
}

async function verFavoritos() {
  currentView = "favorites";
  $("#list-eyebrow").textContent = "TU COLECCIÓN PERSONAL";
  $("#list-title").textContent = "♡ Mis favoritos";
  $("#result-count").textContent = "";
  loadingCards();
  try {
    const favorites = await obtenerFavoritos();
    await renderMovies(favorites);
    if (!favorites.length) setEmpty("Todavía no tienes favoritos", "Guarda películas con el corazón y aparecerán aquí, incluso sin conexión.");
    $("#result-count").textContent = `${favorites.length} guardadas`;
  } catch (error) {
    console.error("Error al leer favoritos:", error);
    setEmpty("No pudimos leer tus favoritos", "Intenta recargar CineHub.");
  }
}

function showAbout() {
  currentView = "about";
  $("#list-eyebrow").textContent = "EL PROYECTO";
  $("#list-title").textContent = "Acerca de CineHub";
  $("#result-count").textContent = "";
  grid.innerHTML = `<article class="about-card"><span class="about-symbol">C</span><div><p>CineHub es una aplicación web progresiva desarrollada como proyecto académico para demostrar el consumo de APIs mediante Fetch API, almacenamiento local con IndexedDB y funcionamiento offline mediante Service Workers.</p><h3>Tecnologías</h3><p>HTML5 · CSS3 · JavaScript Vanilla · Fetch API · IndexedDB · Cache API · Service Worker · Web App Manifest</p><h3>API</h3><p>The Movie Database (TMDB), catálogo público de películas.</p></div></article>`;
  emptyState.hidden = true;
  grid.querySelector(".about-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("click", event => {
  const detail = event.target.closest("[data-details]");
  const favorite = event.target.closest("[data-favorite]");
  if (detail) abrirDetalles(Number(detail.dataset.details));
  if (favorite) toggleFavorite(Number(favorite.dataset.favorite)).catch(error => { console.error("Error al actualizar favoritos:", error); showToast("No pudimos actualizar tus favoritos."); });
});

$("#search-form").addEventListener("submit", event => { event.preventDefault(); buscar($("#search-input").value); });
$(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  document.querySelectorAll(".nav-link").forEach(item => item.classList.toggle("active", item === link));
  const view = link.dataset.view;
  if (view === "favorites") verFavoritos();
  else if (view === "about") showAbout();
  else if (view === "movies") { $("#peliculas").scrollIntoView({ behavior: "smooth" }); if (currentView !== "home") cargarPopulares(); }
  else { currentView = "home"; window.scrollTo({ top: 0, behavior: "smooth" }); cargarPopulares(); }
}));

async function iniciar() {
  setConnectionState(navigator.onLine);
  try { await inicializarDB(); } catch (error) { console.error("IndexedDB no está disponible:", error); showToast("El almacenamiento local no está disponible en este navegador."); }
  cargarPopulares();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("service-worker.js").then(() => console.info("Service Worker registrado.")).catch(error => console.error("No se pudo registrar el Service Worker:", error));
  }
}

iniciar();
