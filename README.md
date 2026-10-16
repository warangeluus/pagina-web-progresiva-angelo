# CineHub

Aplicación web progresiva para descubrir películas, consultar detalles y crear una colección de favoritas. Proyecto académico realizado con HTML, CSS y JavaScript Vanilla. CineHub es un catálogo informativo: no reproduce películas.

## Objetivo

Demostrar el consumo de una API REST con Fetch, almacenamiento estructurado en IndexedDB, caché de recursos con Cache API, instalación como PWA y funcionamiento offline.

## Tecnologías y API

- HTML5 semántico y CSS3 responsive, sin frameworks.
- JavaScript Vanilla con `async`/`await`.
- TMDB API v3 para películas populares, búsqueda y detalles.
- IndexedDB para favoritas, películas consultadas y listas de películas.
- Service Worker y Cache API para la interfaz, respuestas de API y pósteres visitados.
- Web App Manifest para instalación.

### Credenciales de TMDB

TMDB requiere una credencial para consultar su API. Solicita una API Key v3 desde los ajustes de API de tu cuenta de TMDB. Esta demo la envía desde el navegador, por lo que es visible para quien inspeccione la aplicación; no coloques aquí un secreto de servidor ni reutilices credenciales privadas.

1. Copia `config.example.js` como `config.js` en la raíz.
2. Reemplaza `COLOCAR_API_KEY_AQUI` con tu clave v3.
3. `config.js` está excluido mediante `.gitignore` y no debe subirse al repositorio.

Si no configuras la clave, CineHub muestra un mensaje de configuración y conserva su interfaz; la consulta de películas no puede realizarse.

## Ejecutar

Los Service Workers necesitan un contexto seguro. Sirve esta carpeta mediante `localhost`, por ejemplo con la extensión **Live Server** de Visual Studio Code, o publícala en un servidor HTTPS. No abras `index.html` con `file://`.

Con Live Server, abre `index.html` y elige **Open with Live Server**. Después de instalar `config.js`, recarga la pestaña.

## Publicar en GitHub Pages

El workflow `.github/workflows/pages.yml` publica automáticamente el sitio cuando se hace push a la rama `main`, o manualmente desde **Actions** con **Run workflow**.

1. En el repositorio de GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como origen de publicación.
2. Para habilitar el catálogo, abre **Settings → Secrets and variables → Actions**, crea el secreto `TMDB_API_KEY` y pega tu API Key v3 de TMDB. El workflow genera `config.js` durante la publicación; ese archivo no se añade al repositorio.
3. Sube el proyecto a la rama `main` o ejecuta el workflow manualmente. GitHub mostrará la URL publicada en **Actions** y en **Settings → Pages**.

La API Key v3 se envía desde el navegador a TMDB y, por tanto, cualquier visitante puede verla en las solicitudes de red. Guardarla como secreto evita incluirla en el código del repositorio, pero no la convierte en una credencial privada. Si no configuras `TMDB_API_KEY`, la página se publica igualmente, pero el catálogo mostrará el aviso de configuración de TMDB.

## Estructura

```text
index.html             Estructura y vistas de la aplicación
styles.css             Identidad visual y diseño responsive
app.js                 Interfaz, búsqueda, navegación y estados offline
api.js                 Funciones de acceso a TMDB mediante Fetch
db.js                  Base CineHubDB en IndexedDB
service-worker.js      Caché de interfaz, API e imágenes
manifest.json          Metadatos para instalar la PWA
config.example.js      Plantilla pública para la clave de TMDB
assets/icons/         Iconos SVG y PNG de 192×192 y 512×512
```

## Cómo funciona

### Fetch API

`api.js` contiene `tmdbFetch()`, que llama con `fetch()` a los endpoints REST de películas populares (`/movie/popular`), búsqueda (`/search/movie`) y detalles (`/movie/{id}`). Las funciones públicas `obtenerPeliculasPopulares()`, `buscarPeliculas(query)` y `obtenerDetallesPelicula(id)` usan `async`/`await`, comprueban `response.ok` y procesan `response.json()`.

### IndexedDB

`db.js` abre la base `CineHubDB` y crea los almacenes `favorites`, `movies` y `lists`. Los favoritos conservan ID, título, póster, descripción, calificación, fecha y géneros. También se guardan listas populares, búsquedas recientes en el flujo de consulta y detalles solicitados; con ello se puede volver a ver el catálogo y la información previamente abierta sin Internet. Funciones centrales: `inicializarDB()`, `agregarFavorito()`, `eliminarFavorito()`, `obtenerFavoritos()` y `esFavorito()`.

### Cache API y Service Worker

`service-worker.js` precarga la aplicación (HTML, CSS, JavaScript, manifest e icono) en `cinehub-shell-v1`. Las imágenes vistas se guardan en `cinehub-images-v1`. Las llamadas correctas a TMDB se guardan como respuesta HTTP en Cache API y se sirven desde allí si la red falla. El Service Worker se registra desde `app.js` bajo localhost o HTTPS. Cache API almacena respuestas y recursos; IndexedDB almacena objetos de películas fáciles de consultar.

### Manifest e instalación

`manifest.json` define nombre, icono, colores, orientación, alcance y modo `standalone`. En Chrome/Edge de escritorio usa el icono de instalación de la barra de direcciones o el menú **Instalar CineHub**. En Android, usa **Añadir a pantalla de inicio**. La disponibilidad y el texto del menú dependen del navegador.

### Modo offline y conectividad

El Service Worker carga el shell sin red. `app.js` escucha los eventos `online` y `offline` y refleja el estado en el indicador del encabezado con una notificación temporal. Las favoritas siempre se consultan desde IndexedDB y no necesitan conexión. El catálogo popular usa la última lista guardada. Las búsquedas nuevas requieren red; offline se muestra una explicación amigable. Los detalles se muestran desde la copia guardada o la favorita si ya se consultaron.

## Prueba manual de la presentación

1. Abre CineHub con conexión y muestra las películas populares.
2. Busca “Interstellar” (o un título disponible) y abre **Detalles**.
3. Explica que `api.js` usa Fetch API y procesa JSON.
4. Pulsa el corazón para guardar la película.
5. En DevTools → **Application** → **IndexedDB** → `CineHubDB` → `favorites`, muestra el registro.
6. En DevTools → **Application** → **Service Workers**, muestra el worker activo. En **Cache Storage**, revisa los recursos e imágenes guardados.
7. En DevTools → **Network**, activa **Offline** y recarga.
8. Abre **Favoritos** para demostrar que el registro está disponible offline. Las películas populares también se muestran si ya cargaron antes.
9. Desactiva **Offline**; CineHub indica **Conexión restaurada**.

## ¿Cómo defender CineHub?

### ¿Qué es Fetch API?

Es una función del navegador que realiza solicitudes HTTP desde JavaScript y devuelve una respuesta que se puede procesar como JSON. En CineHub se usa en `api.js`, dentro de `tmdbFetch()`.

### ¿Qué es IndexedDB?

Es una base de datos del navegador para guardar información estructurada que persiste entre visitas. CineHub la utiliza en `db.js` para favoritos, películas consultadas y listas del catálogo.

### ¿Qué es un Service Worker?

Es un script que el navegador ejecuta aparte de la página y que puede interceptar solicitudes. `service-worker.js` precarga la interfaz y permite responder con caché cuando falla la red.

### ¿Qué es el Manifest?

`manifest.json` describe la identidad, el icono y el modo de apertura de la aplicación para que el navegador pueda instalarla.

### ¿Por qué CineHub es una PWA?

1. Se puede instalar con el manifest y el icono.
2. Usa un Service Worker registrado bajo HTTPS o localhost.
3. Carga la interfaz y muestra información guardada offline.
4. Tiene diseño adaptable a móvil, tablet y escritorio.
5. Conserva datos localmente en IndexedDB.

## Atribución

Este producto utiliza la API de TMDB, pero no está respaldado ni certificado por TMDB. Las películas e imágenes pertenecen a sus respectivos titulares.
