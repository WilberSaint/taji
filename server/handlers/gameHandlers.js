import GameManager from '../managers/GameManager.js';
import RoomManager from '../managers/RoomManager.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Maneja todos los eventos relacionados con la partida
 */
export function setupGameHandlers(io, socket) {

  /**
   * Iniciar partida (solo el host)
   */
  socket.on(SOCKET_EVENTS.LOBBY_START_GAME, (data, callback) => {
    try {
      const roomCode = socket.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna sala' });
        }
        return;
      }

      logger.info(`${socket.id} iniciando partida en sala ${roomCode}`);

      // Obtener sala
      const room = RoomManager.getRoom(roomCode);
      if (!room) {
        if (callback) {
          callback({ success: false, error: 'Sala no encontrada' });
        }
        return;
      }

      // Verificar si puede iniciar
      const canStart = RoomManager.canStartRoom(roomCode, socket.id);
      if (!canStart.can) {
        if (callback) {
          callback({ success: false, error: canStart.error || canStart.reason });
        }
        return;
      }

      // Crear y iniciar partida
      const game = GameManager.createGame(room);
      if (!game) {
        if (callback) {
          callback({ success: false, error: 'No se pudo iniciar la partida' });
        }
        return;
      }

      // Enviar estado inicial del juego a todos los jugadores
      room.players.forEach(player => {
        const playerState = game.getStateForPlayer(player.id);
        io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
      });

      // Notificar cambio de turno
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_TURN_CHANGED, {
        currentPlayerId: game.getCurrentPlayer().id,
        currentPlayerName: game.getCurrentPlayer().name,
        turnCount: game.turnCount
      });

      // Actualizar lista de salas públicas (la sala ya no aparecerá)
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());

      // Responder al cliente
      if (callback) {
        callback({ success: true });
      }

      logger.success(`Partida iniciada en sala ${roomCode}`);
    } catch (error) {
      logger.error('Error al iniciar partida', error);
      if (callback) {
        callback({ success: false, error: 'Error al iniciar partida' });
      }
    }
  });

  /**
   * Jugar una carta
   */
  socket.on(SOCKET_EVENTS.GAME_PLAY_CARD, (data, callback) => {
    try {
      const { cardId, targetPlayerId, slotType } = data;
      const roomCode = socket.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna partida' });
        }
        return;
      }

      logger.game(`${socket.id} jugando carta ${cardId}`);

      // Jugar carta
      const result = GameManager.playCard(
        roomCode,
        socket.id,
        cardId,
        targetPlayerId,
        slotType
      );

      if (!result.success) {
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Obtener partida para enviar estados actualizados
      const game = GameManager.getGame(roomCode);
      const room = RoomManager.getRoom(roomCode);

      // Enviar evento de carta jugada (con animación)
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARD_PLAYED, {
        playerId: socket.id,
        card: result.card,
        target: result.target,
        effect: result.effect
      });

      // Si hubo anulación mutua
      if (result.effect.cancelled) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARDS_CANCELLED, {
          slotType: slotType,
          targetPlayerId: targetPlayerId,
          cardsDiscarded: result.effect.cardsToDiscard
        });
      }

      // Si hubo destrucción
      if (result.effect.destroyed) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANT_DESTROYED, {
          slotType: slotType,
          playerId: targetPlayerId,
          cardsDiscarded: result.effect.cardsToDiscard
        });
      }

      // Enviar carta robada al jugador
      if (result.drawnCard) {
        io.to(socket.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, {
          cards: [result.drawnCard]
        });
      }

      // Actualizar estado del juego para todos
      room.players.forEach(player => {
        const playerState = game.getStateForPlayer(player.id);
        io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
      });

      // Responder al cliente
      if (callback) {
        callback({ success: true, drawnCard: result.drawnCard });
      }
    } catch (error) {
      logger.error('Error al jugar carta', error);
      if (callback) {
        callback({ success: false, error: 'Error al jugar carta' });
      }
    }
  });

  /**
   * Descartar cartas
   */
  socket.on(SOCKET_EVENTS.GAME_DISCARD_CARDS, (data, callback) => {
    try {
      const { cardIds } = data;
      const roomCode = socket.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna partida' });
        }
        return;
      }

      logger.game(`${socket.id} descartando ${cardIds.length} cartas`);

      // Descartar cartas
      const result = GameManager.discardCards(roomCode, socket.id, cardIds);

      if (!result.success) {
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Obtener partida
      const game = GameManager.getGame(roomCode);
      const room = RoomManager.getRoom(roomCode);

      // Enviar cartas robadas al jugador
      io.to(socket.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, {
        cards: result.drawnCards
      });

      // Actualizar estado del juego para todos
      room.players.forEach(player => {
        const playerState = game.getStateForPlayer(player.id);
        io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
      });

      // Responder al cliente
      if (callback) {
        callback({ 
          success: true, 
          discardedCount: result.discardedCards.length,
          drawnCards: result.drawnCards
        });
      }
    } catch (error) {
      logger.error('Error al descartar cartas', error);
      if (callback) {
        callback({ success: false, error: 'Error al descartar cartas' });
      }
    }
  });

  /**
   * Terminar turno
   */
  socket.on(SOCKET_EVENTS.GAME_END_TURN, (data, callback) => {
    try {
      const roomCode = socket.roomCode;

      if (!roomCode) {
        if (callback) {
          callback({ success: false, error: 'No estás en ninguna partida' });
        }
        return;
      }

      logger.game(`${socket.id} terminando turno`);

      // Terminar turno
      const result = GameManager.endTurn(roomCode, socket.id);

      if (!result.success) {
        if (callback) {
          callback({ success: false, error: result.error });
        }
        return;
      }

      // Obtener partida y sala
      const game = GameManager.getGame(roomCode);
      const room = RoomManager.getRoom(roomCode);

      // Si hay victoria
      if (result.victory) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_VICTORY, {
          winner: result.winner,
          finalState: result.gameState
        });

        logger.success(`¡${result.winner.name} ganó la partida en sala ${roomCode}!`);
      } else {
        // Notificar cambio de turno
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_TURN_CHANGED, {
          currentPlayerId: result.nextPlayer.id,
          currentPlayerName: result.nextPlayer.name,
          turnCount: game.turnCount
        });
      }

      // Actualizar estado del juego para todos
      room.players.forEach(player => {
        const playerState = game.getStateForPlayer(player.id);
        io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
      });

      // Responder al cliente
      if (callback) {
        callback({ 
          success: true, 
          victory: result.victory,
          nextPlayer: result.nextPlayer
        });
      }
    } catch (error) {
      logger.error('Error al terminar turno', error);
      if (callback) {
        callback({ success: false, error: 'Error al terminar turno' });
      }
    }
  });
}
