import { io } from 'socket.io-client';
import { SERVER_URL } from './utils/constants';
import { crearServidorLocal } from './offline/servidorLocal.js';

/**
 * El canal por el que habla el cliente, con DOS transportes.
 *
 *   'red'   → Socket.io contra el servidor de verdad (multijugador).
 *   'local' → el servidor corriendo dentro del navegador (sin conexión).
 *
 * Todo el resto de la aplicación habla con este objeto y no sabe cuál de los
 * dos hay debajo: los eventos y las respuestas son los mismos porque el modo
 * sin conexión ejecuta literalmente los manejadores del servidor (ver
 * offline/servidorLocal.js).
 *
 * Es un intermediario y no el socket a secas porque los escuchas se registran
 * UNA vez en la vida de la aplicación (ver useSocket). Si al cambiar de modo
 * se sustituyera el objeto, esos escuchas quedarían colgando del transporte
 * viejo. Así se quedan colgando de aquí, y aquí se decide a dónde van.
 */

const real = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 4000,
  // Sin límite: en móvil la conexión se cae al bloquear la pantalla o cambiar
  // de app y debe recuperarse sola al volver.
  reconnectionAttempts: Infinity,
  timeout: 15000,
});

let modo = 'red';
let local = null;

/** Escuchas de la aplicación: evento -> funciones. */
const escuchas = new Map();

function entregar(evento, ...datos) {
  const lista = escuchas.get(evento);
  if (!lista) return;
  for (const fn of [...lista]) fn(...datos);
}

/* Lo que llegue del servidor de red se reparte por el mismo camino, pero solo
   cuando ese es el transporte activo: así un mensaje rezagado del socket no se
   cuela en una partida sin conexión. */
real.onAny((evento, ...datos) => {
  if (modo === 'red') entregar(evento, ...datos);
});
for (const propio of ['connect', 'disconnect', 'connect_error']) {
  real.on(propio, (...datos) => {
    if (modo === 'red') entregar(propio, ...datos);
  });
}

real.on('connect', () => console.log('✅ Conectado al servidor:', real.id));
real.on('disconnect', (motivo) => console.log('❌ Desconectado del servidor:', motivo));
real.on('connect_error', (e) => console.error('🔴 Error de conexión:', e.message));

const socket = {
  get id() { return modo === 'local' ? local?.id : real.id; },
  get connected() { return modo === 'local' ? true : real.connected; },
  get modo() { return modo; },

  on(evento, fn) {
    if (!escuchas.has(evento)) escuchas.set(evento, new Set());
    escuchas.get(evento).add(fn);
    if (modo === 'local') local?.on(evento, fn);
  },
  off(evento, fn) {
    escuchas.get(evento)?.delete(fn);
    if (modo === 'local') local?.off(evento, fn);
  },
  emit(evento, datos, callback) {
    if (modo === 'local') return local?.emitir(evento, datos, callback);
    return real.emit(evento, datos, callback);
  },

  connect() { if (modo === 'red') real.connect(); },
  disconnect() { if (modo === 'red') real.disconnect(); },
};

/**
 * Entra al modo sin conexión y arranca una partida contra bots.
 *
 * El servidor local se importa de forma ESTÁTICA, no diferida. Diferirlo
 * ahorraba unos kilobytes a quien juega en red, pero rompía justo el caso que
 * esto viene a resolver: si alguien abre la app con internet, nunca entra al
 * modo local y luego se queda sin cobertura, el trozo diferido no está
 * descargado y no hay forma de jugar. Comprobado cortando la red: la partida
 * no arrancaba. Vale más que viaje siempre.
 */
export async function iniciarModoLocal({ nombre, avatar, bots }) {
  real.disconnect();
  local = crearServidorLocal();
  modo = 'local';

  // Los escuchas ya registrados tienen que seguir recibiendo
  for (const [evento, lista] of escuchas) {
    for (const fn of lista) local.on(evento, fn);
  }

  entregar('connect');

  return new Promise((resolver) => {
    local.partidaRapida({ nombre, avatar, bots }, (r) => resolver(r));
  });
}

/** Vuelve al modo en red y deja limpia la partida local. */
export function salirDeModoLocal() {
  if (modo !== 'local') return;
  local?.desmontar();
  local = null;
  modo = 'red';
  real.connect();
}

export function enModoLocal() {
  return modo === 'local';
}

export default socket;
