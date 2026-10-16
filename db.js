/* Persistencia local: favoritas y copias consultables sin conexión. */
const DB_NAME = "CineHubDB";
const DB_VERSION = 1;
let databasePromise;

function abrirBaseDatos() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("favorites")) db.createObjectStore("favorites", { keyPath: "id" });
      if (!db.objectStoreNames.contains("movies")) db.createObjectStore("movies", { keyPath: "id" });
      if (!db.objectStoreNames.contains("lists")) db.createObjectStore("lists", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

// Alias con nombre didáctico para inicializar la base CineHubDB.
function inicializarDB() { return abrirBaseDatos(); }

async function operar(storeName, mode, action) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const agregarFavorito = movie => operar("favorites", "readwrite", store => store.put(movie));
const guardarFavorito = agregarFavorito;
const eliminarFavorito = id => operar("favorites", "readwrite", store => store.delete(Number(id)));
const quitarFavorito = eliminarFavorito;
const obtenerFavoritos = () => operar("favorites", "readonly", store => store.getAll());
const obtenerFavorito = id => operar("favorites", "readonly", store => store.get(Number(id)));
async function esFavorito(id) { return Boolean(await obtenerFavorito(id)); }
const guardarPelicula = movie => operar("movies", "readwrite", store => store.put(movie));
const obtenerPeliculaGuardada = id => operar("movies", "readonly", store => store.get(Number(id)));
const guardarLista = (key, movies) => operar("lists", "readwrite", store => store.put({ key, movies, savedAt: Date.now() }));
const obtenerLista = key => operar("lists", "readonly", store => store.get(key));
