import RoomManager from '../managers/RoomManager.js';
import GameManager from '../managers/GameManager.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Maneja todos los eventos relacionados con el lobby
 */
export function setupLobbyHandlers(io, socket) {
  
  /**
   * Intentar reconectar a una sala existente
   */
  socket.on(SOCKET_EVENTS.LOBBY_RECONNECT, (data, callback) => {
    try {
      const { roomCode, playerName } = data;

      logger.info(`${socket.id} intentando reconectar a ${roomCode} como ${playerName}`);

      const room = RoomManager.getRoom(roomCode);

      if (!room) {
        if (callback) {
          callback({ success: false, error: 'Sala no encontrada o expirada' });
        }
        return;
      }

      // Buscar jugador por nombre
      const player = room.players.find(p => p.name === playerName);

      if (!player) {
        if (callback) {
          callback({ success: false, error: 'No estabas en esta sala' });
        }
        return;
      }

      // Guardar el ID anterior
      const oldSocketId = player.id;

      // Actualizar socket ID del jugador
      player.id = socket.id;
      player.status = 'connected';

      // Unir al socket a la sala
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.playerName = player.name;

      // Notificar reconexión
      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
        playerId: socket.id,
        playerName: player.name
      });

      // Actualizar según estado de la sala
      if (room.status === 'playing') {
        const game = GameManager.getGame(roomCode);
        if (game) {
          // Actualizar ID en el juego
          const gamePlayer = game.getPlayer(oldSocketId);
          if (gamePlayer) {
            gamePlayer.id = socket.id;
          }

          // Enviar estado a todos
          room.players.forEach(p => {
            const playerState = game.getStateForPlayer(p.id);
            io.to(p.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
          });

          if (callback) {
            callback({ 
              success: true, 
              room: room.getState(),
              gameState: game.getStateForPlayer(socket.id),
              reconnected: true
            });
          }
        }
      } else {
        // En lobby
        io.to(roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, room.getState());

        if (callback) {
          callback({ 
            success: true, 
            room: room.getState(),
            reconnected: true
          });
        }
      }

      logger.success(`${player.name} reconectado a ${roomCode}`);

    } catch (error) {
      logger.error('Error en reconexión', error);
      if (callback) {
        callback({ success: false, error: 'Error al reconectar' });
      }
    }
  });
  
  /**
   * Crear una nueva sala
   */
  socket.on(SOCKET_EVENTS.LOBBY_CREATE_ROOM, (data, callback) => {
    try {
      const { playerName, isPublic = true } = data;

      logger.info(`${socket.id} creando sala`, { playerName, isPublic });

      // Crear sala
      const room = RoomManager.createRoom(socket.id, playerName, isPublic);

      // Unir al jugador a la sala de Socket.io
      socket.join(room.code);

      // Almacenar código de sala en el socket
      socket.roomCode = room.code;
      socket.playerName = playerName;

      // Emitir lista actualizada de salas públicas
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());

      // Responder al cliente
      if (callback) {
        callback({ success: true, room: room.getState() });
      }

      logger.success(`Sala ${room.code} creada por ${playerName}`);
    } catch (error) {
      logger.error('Error al crear sala', error);
      if (callback) {
        callback({ success: false, error: 'Error al crear sala' });
      }
    }
  });

  /**
   * Unirse a una sala existente
   */
  socket.on(SOCKET_EVENTS.LOBBY_JOIN_ROOM, (data, callback) => {
    try {
      const { roomCode, playerName } = data;

      logger.info(`${socket.id} uniéndose a sala ${roomCode}`, { playerName });

      // Unirse a la sala
      const result = RoomManager.joinRoom(roomCode, socket.id, playerName);

      if (!result.success) {
        logger.warn(`${socket.id} no pudo unirse a ${roomCode}: ${result.error}`);
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Unir al jugador a la sala de Socket.io
      socket.join(roomCode);

      // Almacenar información en el socket
      socket.roomCode = roomCode;
      socket.playerName = playerName;

      // Notificar a todos en la sala
      io.to(roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, result.room.getState());

      // Actualizar lista de salas públicas
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());

      // Responder al cliente
      if (callback) {
        callback({ success: true, room: result.room.getState() });
      }

      logger.success(`${playerName} se unió a sala ${roomCode}`);
    } catch (error) {
      logger.error('Error al unirse a sala', error);
      if (callback) {
        callback({ success: false, error: 'Error al unirse a sala' });
      }
    }
  });

  /**
   * Salir de una sala
   */
  socket.on(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, (data, callback) => {
    try {
      const { roomCode } = data || {};
      const code = roomCode || socket.roomCode;

      if (!code) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna sala' });
        }
        return;
      }

      logger.info(`${socket.id} saliendo de sala ${code}`);

      // Salir de la sala
      const result = RoomManager.leaveRoom(code, socket.id);

      if (!result.success) {
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Salir de la sala de Socket.io
      socket.leave(code);

      // Limpiar datos del socket
      delete socket.roomCode;
      delete socket.playerName;

      // Si la sala no fue eliminada, notificar a los demás
      if (!result.roomDeleted) {
        const room = RoomManager.getRoom(code);
        if (room) {
          io.to(code).emit(SOCKET_EVENTS.ROOM_UPDATED, room.getState());
        }
      }

      // Actualizar lista de salas públicas
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());

      // Responder al cliente
      if (callback) {
        callback({ success: true });
      }

      logger.info(`${result.player.name} salió de sala ${code}`);
    } catch (error) {
      logger.error('Error al salir de sala', error);
      if (callback) {
        callback({ success: false, error: 'Error al salir de sala' });
      }
    }
  });

  /**
   * Listar salas públicas disponibles
   */
  socket.on(SOCKET_EVENTS.LOBBY_LIST_ROOMS, (data, callback) => {
    try {
      const publicRooms = RoomManager.getPublicRooms();

      if (callback) {
        callback({ success: true, rooms: publicRooms });
      }
    } catch (error) {
      logger.error('Error al listar salas', error);
      if (callback) {
        callback({ success: false, error: 'Error al listar salas' });
      }
    }
  });

  /**
   * Marcar jugador como listo/no listo
   */
  socket.on(SOCKET_EVENTS.LOBBY_READY, (data, callback) => {
    try {
      const { ready = true } = data;
      const roomCode = socket.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna sala' });
        }
        return;
      }

      logger.info(`${socket.id} marcándose como ${ready ? 'listo' : 'no listo'}`);

      // Marcar como listo
      const result = RoomManager.setPlayerReady(roomCode, socket.id, ready);

      if (!result.success) {
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Notificar a todos en la sala
      io.to(roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, result.room.getState());

      // Responder al cliente
      if (callback) {
        callback({ success: true, room: result.room.getState() });
      }
    } catch (error) {
      logger.error('Error al marcar como listo', error);
      if (callback) {
        callback({ success: false, error: 'Error al cambiar estado' });
      }
    }
  });
}