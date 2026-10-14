import RoomManager from '../managers/RoomManager.js';
import { SOCKET_EVENTS } from './constants.js';

/**
 * Lista de salas públicas en vivo — solo para quien la está viendo.
 *
 * Antes cada crear/unirse/salir/iniciar mandaba la lista completa con
 * `io.emit` a TODOS los conectados, incluidos los que ya están a media
 * partida y nunca la ven. Eso crece con el cuadrado de la gente: con 300
 * personas, cada vez que alguien entra a una sala salen 300 mensajes. En un
 * taller, cuando un grupo entero se une a la vez, se juntan decenas de esas
 * ráfagas en un par de segundos.
 *
 * Ahora:
 *  - Solo reciben la lista los sockets en la sala de Socket.io SALA_ESPERA:
 *    todo socket entra al conectarse, sale al entrar a una sala de juego y
 *    vuelve al salir de ella (o al pedir la lista, que es lo que hace el
 *    cliente al regresar a la pantalla de salas, incluso tras una expulsión).
 *  - Los avisos se agrupan: varios cambios seguidos producen UN envío.
 */
export const SALA_ESPERA = 'sala-de-espera';

const ESPERA_MS = 300;
let pendiente = null;

export function emitirListaSalas(io) {
  if (pendiente) return;
  pendiente = setTimeout(() => {
    pendiente = null;
    io.to(SALA_ESPERA).emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());
  }, ESPERA_MS);
}

export function entrarAEspera(socket) {
  socket.join(SALA_ESPERA);
}

export function salirDeEspera(socket) {
  socket.leave(SALA_ESPERA);
}
