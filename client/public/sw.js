/* Service worker de TAJI.
 *
 * Guarda el juego entero para que funcione sin conexión. Antes no guardaba
 * nada a propósito —solo existía para que Chrome ofreciera "Instalar
 * aplicación"— porque servir una versión vieja contra un servidor nuevo rompe
 * una partida en red de formas difíciles de diagnosticar. Eso sigue siendo
 * cierto, y por eso la caché va VERSIONADA: cada compilación estrena caché y
 * borra las anteriores, así que una versión vieja no sobrevive a un
 * despliegue más que lo que tarde la siguiente carga.
 *
 * Qué hace posible: abrir el juego una vez con internet y después jugar
 * contra bots en modo avión, que es el caso de los talleres en comunidades sin
 * cobertura. La partida corre entera en el navegador (ver
 * src/offline/servidorLocal.js); aquí solo se asegura de que los archivos
 * estén disponibles.
 */

/* Nombre de la caché derivado de la lista de archivos: como los nombres
   llevan hash de contenido, si cambia cualquier cosa cambia la lista y por
   tanto la caché. No hace falta acordarse de subir un número a mano, que es
   justo lo que siempre se olvida. */
let NOMBRE_CACHE = 'taji-v0';

async function listaDeArchivos() {
  const r = await fetch('./precache.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('no se pudo leer precache.json');
  const datos = await r.json();
  return datos.archivos || [];
}

function versionDe(archivos) {
  // Suma sencilla sobre los nombres: basta para distinguir compilaciones
  let h = 0;
  for (const a of archivos.join('|')) h = (h * 31 + a.charCodeAt(0)) | 0;
  return 'taji-' + (h >>> 0).toString(36);
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      try {
        const archivos = await listaDeArchivos();
        NOMBRE_CACHE = versionDe(archivos);
        const cache = await caches.open(NOMBRE_CACHE);
        /* Uno por uno y tolerando fallos: si un archivo suelto no se puede
           traer, vale más tener el resto guardado que quedarse sin nada, que
           es lo que hace cache.addAll(). */
        await Promise.all(
          archivos.map((a) => cache.add(new Request(a, { cache: 'reload' })).catch(() => {})),
        );
      } catch (e) {
        // Sin lista no hay precarga, pero el service worker sigue sirviendo
        // lo que se vaya pidiendo (ver fetch).
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const archivos = await listaDeArchivos().catch(() => []);
      if (archivos.length) NOMBRE_CACHE = versionDe(archivos);
      // Fuera las cachés de compilaciones anteriores
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((n) => n.startsWith('taji-') && n !== NOMBRE_CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Solo lecturas del propio sitio. El socket y cualquier API van directos.
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/socket.io/')) return;

  evento.respondWith(
    (async () => {
      const cache = await caches.open(NOMBRE_CACHE);

      /* La navegación va primero a la red: así quien tenga conexión recibe la
         versión nueva en cuanto se despliega. Si no hay red, se sirve el
         index guardado, que es lo que permite abrir el juego en modo avión. */
      if (peticion.mode === 'navigate') {
        try {
          const deRed = await fetch(peticion);
          cache.put('./index.html', deRed.clone());
          return deRed;
        } catch {
          return (await cache.match('./index.html')) || Response.error();
        }
      }

      /* El resto va primero a la caché: los nombres llevan hash de contenido,
         así que lo guardado nunca está desactualizado — si cambia el archivo,
         cambia el nombre. */
      const guardado = await cache.match(peticion);
      if (guardado) return guardado;

      try {
        const deRed = await fetch(peticion);
        if (deRed.ok) cache.put(peticion, deRed.clone());
        return deRed;
      } catch (e) {
        return Response.error();
      }
    })(),
  );
});
