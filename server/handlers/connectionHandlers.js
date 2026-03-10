import RoomManager from '../managers/RoomManager.js';
import GameManager from '../managers/GameManager.js';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Maneja eventos de conexión y desconexión
 */
export function setupConnectionHandlers(io, socket) {

  /**
   * Cuando un jugador se conecta
   */
  socket.on('connection', () => {
    logger.info(`Cliente conectado: ${socket.id}`);
  });

  /**
   * Cuando un jugador se desconecta
   */
  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });

  /**
   * Cuando un jugador se desconecta intencionalmente
   */
  socket.on('disconnecting', () => {
    logger.warn(`Cliente desconectándose: ${socket.id}`);
  });
}

/**
 * Maneja la desconexión de un jugador
 */
function handleDisconnect(io, socket) {
  logger.warn(`Cliente desconectado: ${socket.id}`);

  const roomCode = socket.roomCode;
  
  if (!roomCode) {
    // No estaba en ninguna sala
    return;
  }

  const room = RoomManager.getRoom(roomCode);
  
  if (!room) {
    // La sala ya no existe
    return;
  }

  const player = room.getPlayer(socket.id);
  
  if (!player) {
    // El jugador no estaba en la sala
    return;
  }

  // Cambiar estado del jugador
  player.status = PLAYER_STATUS.DISCONNECTED;

  // Si la partida está en lobby, remover al jugador
  if (room.status === 'lobby') {
    const result = RoomManager.leaveRoom(roomCode, socket.id);
    
    if (result.success) {
      // Notificar a los demás si la sala aún existe
      if (!result.roomDeleted) {
        io.to(roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, room.getState());
        io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
          playerId: socket.id,
          playerName: player.name
        });
      }

      // Actualizar lista de salas públicas
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());
    }

    logger.info(`${player.name} removido del lobby ${roomCode}`);
    return;
  }

  // Si la partida está en curso, pausarla o manejar la desconexión
  if (room.status === 'playing') {
    const game = GameManager.getGame(roomCode);
    
    if (game) {
      // Notificar a los demás jugadores
      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
        playerId: socket.id,
        playerName: player.name,
        canReconnect: true,
        timeoutSeconds: 60
      });

      // Actualizar estado del juego
      room.players.forEach(p => {
        const playerState = game.getStateForPlayer(p.id);
        io.to(p.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
      });

      logger.warn(`${player.name} desconectado de partida ${roomCode}`);

      // TODO: Implementar lógica de reconexión o IA temporal
      // Por ahora, solo marcamos al jugador como desconectado
      // En una versión futura, se podría:
      // 1. Pausar el juego por 60 segundos
      // 2. Permitir reconexión
      // 3. Si no regresa, AI toma el control o pierde automáticamente
    }
  }
}

/**
 * Intenta reconectar a un jugador
 */
export function handleReconnect(io, socket, roomCode, playerId) {
  const room = RoomManager.getRoom(roomCode);
  
  if (!room) {
    return { success: false, error: 'Sala no encontrada' };
  }

  const player = room.getPlayer(playerId);
  
  if (!player) {
    return { success: false, error: 'Jugador no encontrado en la sala' };
  }

  // Actualizar socket ID del jugador
  player.id = socket.id;
  player.status = PLAYER_STATUS.CONNECTED;

  // Unir al nuevo socket a la sala
  socket.join(roomCode);
  socket.roomCode = roomCode;
  socket.playerName = player.name;

  // Notificar reconexión
  io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
    playerId: socket.id,
    playerName: player.name
  });

  // Si hay partida en curso, enviar estado actualizado
  if (room.status === 'playing') {
    const game = GameManager.getGame(roomCode);
    if (game) {
      const playerState = game.getStateForPlayer(socket.id);
      io.to(socket.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
    }
  } else {
    // Si está en lobby, enviar estado de la sala
    io.to(socket.id).emit(SOCKET_EVENTS.ROOM_UPDATED, room.getState());
  }

  logger.success(`${player.name} reconectado a sala ${roomCode}`);

  return { success: true, room: room };
}
