/* Comunicación con The Movie Database (TMDB). */
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/";
const TMDB_LANGUAGE = "es-ES";

function requireApiKey() {
  const key = typeof CONFIG !== "undefined" ? CONFIG.API_KEY : null;
  if (!key || key === "COLOCAR_API_KEY_AQUI") {
    throw new Error("Falta configurar la API Key de TMDB. Copia config.example.js como config.js y añade tu clave.");
  }
  return key;
}

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.search = new URLSearchParams({ api_key: requireApiKey(), language: TMDB_LANGUAGE, ...params });
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) throw new Error("TMDB rechazó la clave. Revisa config.js.");
    throw new Error(`TMDB respondió con un error (${response.status}).`);
  }
  return response.json();
}

async function obtenerPeliculasPopulares() {
  return tmdbFetch("/movie/popular", { page: "1", region: "US" });
}

async function buscarPeliculas(query) {
  const term = String(query || "").trim();
  if (!term) return { results: [] };
  return tmdbFetch("/search/movie", { query: term, include_adult: "false", page: "1" });
}

async function obtenerDetallesPelicula(id) {
  return tmdbFetch(`/movie/${encodeURIComponent(id)}`);
}

function urlPoster(path, size = "w500") {
  return path ? `${TMDB_IMAGE_URL}${size}${path}` : "";
}

function urlBackdrop(path, size = "w1280") {
  return path ? `${TMDB_IMAGE_URL}${size}${path}` : "";
}
