import { setupLobbyHandlers } from '../../../server/handlers/lobbyHandlers.js';
import { setupGameHandlers } from '../../../server/handlers/gameHandlers.js';
import RoomManager from '../../../server/managers/RoomManager.js';
import GameManager from '../../../server/managers/GameManager.js';
/* Las constantes del SERVIDOR, no las del cliente: son las que hablan los
   manejadores que se ejecutan aquí, y además el archivo del cliente lee
   import.meta.env, que ata este módulo a Vite y lo vuelve imposible de probar
   fuera del navegador. */
import { SOCKET_EVENTS } from '../../../server/utils/constants.js';

/**
 * El servidor de TAJI, corriendo dentro del navegador.
 *
 * No es una reimplementación: importa y ejecuta los MISMOS manejadores, el
 * mismo gestor de salas y el mismo gestor de partidas que usa el servidor de
 * verdad. Lo único que se finge son las dos piezas de Socket.io que esos
 * manejadores tocan, y resultaron ser mínimas: del socket usan `id`, `join`,
 * `leave`, `on`, `playerName` y `roomCode`; de `io`, solo `to(destino).emit()`
 * y `emit()`.
 *
 * Por qué así y no reescribiendo las reglas en el cliente: una copia se
 * desincroniza con el servidor a la primera corrección: la partida sin
 * conexión empezaría a jugar distinto que la de red, y nadie se enteraría
 * hasta un taller. Con esto, cada arreglo del servidor —los congelamientos,
 * la conservación de cartas, el fin por agotamiento— vale igual aquí sin
 * tocar una línea.
 *
 * Lo que NO hace: multijugador entre aparatos. Aquí solo hay una persona y
 * sus bots; no hay red que cruzar.
 */

const MI_ID = 'local-jugador';

export function crearServidorLocal() {
  /** Escuchas del cliente, por evento. */
  const alCliente = new Map();
  /** Manejadores del servidor, por evento (los registra setup*Handlers). */
  const delServidor = new Map();

  function entregar(evento, ...datos) {
    const lista = alCliente.get(evento);
    if (!lista) return;
    // Copia: un manejador puede darse de baja mientras se recorre
    for (const fn of [...lista]) {
      try {
        fn(...datos);
      } catch (e) {
        console.error('[local] error en el escucha de ' + evento, e);
      }
    }
  }

  /* `io` de mentira. Los manejadores mandan a una sala (el código) o a un
     jugador (su id). Solo nos interesa lo que va a la sala o a esta persona;
     lo dirigido a un bot se tira, que no hay nadie al otro lado. */
  const io = {
    to(destino) {
      return {
        emit(evento, datos) {
          if (destino === MI_ID || destino === socketFalso.roomCode) {
            entregar(evento, datos);
          }
        },
      };
    },
    emit(evento, datos) {
      // Difusión general (la lista de salas públicas). Sin conexión no hay
      // salas de nadie más, pero se entrega igual por no silenciar eventos.
      entregar(evento, datos);
    },
  };

  const socketFalso = {
    id: MI_ID,
    roomCode: null,
    playerName: null,
    join(sala) { this.roomCode = sala; },
    leave() { this.roomCode = null; },
    on(evento, manejador) { delServidor.set(evento, manejador); },
  };

  // Aquí se registra el código real del servidor
  setupLobbyHandlers(io, socketFalso);
  setupGameHandlers(io, socketFalso);

  return {
    id: MI_ID,

    /** Lo que el cliente le pide al "servidor". */
    emitir(evento, datos, callback) {
      const manejador = delServidor.get(evento);
      if (!manejador) {
        // Eventos que sin conexión no tienen sentido (listar salas públicas)
        if (callback) callback({ success: true, rooms: [] });
        return;
      }
      manejador(datos ?? {}, callback);
    },

    /** Suscripción del cliente a los eventos del "servidor". */
    on(evento, fn) {
      if (!alCliente.has(evento)) alCliente.set(evento, new Set());
      alCliente.get(evento).add(fn);
    },
    off(evento, fn) {
      alCliente.get(evento)?.delete(fn);
    },

    /** Deja la mesa limpia al salir del modo sin conexión. */
    desmontar() {
      const sala = socketFalso.roomCode;
      if (sala) {
        GameManager.deleteGame(sala);
        RoomManager.leaveRoom(sala, MI_ID);
      }
      alCliente.clear();
      socketFalso.roomCode = null;
    },

    /**
     * Arranca una partida de una sentada: crea la sala, mete los bots, marca
     * a todos listos y empieza. Sin conexión no hay a quién esperar, así que
     * no tiene sentido pasar por la antesala.
     */
    partidaRapida({ nombre, avatar, bots }, callback) {
      this.emitir(
        SOCKET_EVENTS.LOBBY_CREATE_ROOM,
        { playerName: nombre, isPublic: false, avatar },
        (respuesta) => {
          if (!respuesta?.success) return callback?.(respuesta);

          for (let i = 0; i < bots; i++) {
            this.emitir(SOCKET_EVENTS.LOBBY_ADD_BOT, {}, () => {});
          }
          this.emitir(SOCKET_EVENTS.LOBBY_READY, { ready: true }, () => {});
          this.emitir(SOCKET_EVENTS.LOBBY_START_GAME, {}, (inicio) => {
            callback?.(inicio?.success ? { success: true, room: respuesta.room } : inicio);
          });
        },
      );
    },
  };
}

export default crearServidorLocal;
