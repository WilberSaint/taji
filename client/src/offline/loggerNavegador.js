/**
 * El logger del servidor, pero para el navegador.
 *
 * El motor del juego (Game, Deck, Player…) se comparte tal cual entre el
 * servidor y el modo sin conexión, y todas esas piezas importan el logger. El
 * del servidor usa `util.inspect` y `process.env`, que no existen en el
 * navegador: sin esto, la primera importación revienta.
 *
 * El build del cliente lo sustituye por este (ver el complemento
 * "motor-para-navegador" en vite.config.js). Aquí no hay colores ANSI ni
 * marcas de tiempo: eso es para una terminal. En desarrollo va a la consola
 * del navegador y en producción se calla, que una partida genera decenas de
 * mensajes por minuto.
 */

const enDesarrollo = import.meta.env.DEV;

function escribir(metodo, mensaje, datos) {
  if (!enDesarrollo) return;
  if (datos === undefined || datos === null) console[metodo](mensaje);
  else console[metodo](mensaje, datos);
}

export const logger = {
  info: (m, d) => escribir('log', m, d),
  success: (m, d) => escribir('log', m, d),
  warn: (m, d) => escribir('warn', m, d),
  error: (m, d) => escribir('error', m, d),
  debug: (m, d) => escribir('debug', m, d),
  game: (m, d) => escribir('log', m, d),
  room: (m, d) => escribir('log', m, d),
  socket: (m, d) => escribir('log', m, d),
};

export default logger;
