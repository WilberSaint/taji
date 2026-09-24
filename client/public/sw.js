/* Service worker de TAJI — DELIBERADAMENTE SIN CACHÉ.
 *
 * Existe por una sola razón: Chrome en Android no ofrece "Instalar
 * aplicación" si el sitio no registra un service worker con un manejador de
 * `fetch`. Con esto el juego se instala como app de verdad, con su ícono y su
 * nombre corto. (iOS no lo necesita: "Añadir a pantalla de inicio" funciona
 * solo con el manifiesto y las etiquetas apple-* del index.html.)
 *
 * NO guarda nada en caché, y es a propósito:
 *  - TAJI es multijugador en tiempo real contra un socket; servir una versión
 *    vieja del cliente contra un servidor nuevo rompe la partida de formas
 *    difíciles de diagnosticar.
 *  - Los despliegues son manuales (git pull + build + pm2 restart). Una caché
 *    obligaría a versionarla y purgarla en cada despliegue, y olvidarlo deja
 *    a la gente con una versión vieja pegada en el teléfono.
 *
 * Si algún día se quiere que funcione sin conexión, hay que hacerlo en serio:
 * precargar los assets con su hash de build e invalidar en cada versión.
 */

// Tomar el control de inmediato, sin esperar a que se cierren las pestañas:
// así una versión nueva nunca queda atrapada detrás de la anterior.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      // Por si alguna versión anterior llegó a dejar cachés, se limpian.
      const nombres = await caches.keys();
      await Promise.all(nombres.map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// Manejador de paso: todo va a la red tal cual. Es lo mínimo que pide Chrome
// para considerar la app instalable.
self.addEventListener('fetch', (evento) => {
  evento.respondWith(fetch(evento.request));
});
