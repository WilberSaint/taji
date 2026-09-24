import GameManager from '../managers/GameManager.js';
import RoomManager from '../managers/RoomManager.js';
import { SOCKET_EVENTS, GAME_STATUS } from '../utils/constants.js';
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
      const game = GameManager.createGame(room, io);
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
   * Revancha: otra partida con la misma gente, sin volver al lobby.
   *
   * En un taller esto es lo que más tiempo ahorra: al terminar una ronda,
   * antes había que salir al lobby, volver a crear la sala, repartir el
   * código y esperar a que todos entraran otra vez.
   *
   * Solo la pide el anfitrión, y solo si la partida ya terminó — si no,
   * cualquiera podría reiniciar una partida en curso.
   */
  socket.on(SOCKET_EVENTS.GAME_REMATCH, (data, callback) => {
    try {
      const roomCode = socket.roomCode;
      const responder = (r) => { if (callback) callback(r); };

      if (!roomCode) return responder({ success: false, error: 'No estás en ninguna sala' });

      const room = RoomManager.getRoom(roomCode);
      if (!room) return responder({ success: false, error: 'Sala no encontrada' });

      if (room.hostId !== socket.id) {
        return responder({ success: false, error: 'Solo quien creó la sala puede pedir revancha' });
      }

      const partida = GameManager.getGame(roomCode);
      if (!partida) return responder({ success: false, error: 'No hay partida que repetir' });
      if (partida.status !== GAME_STATUS.FINISHED) {
        return responder({ success: false, error: 'La partida todavía no termina' });
      }

      logger.info(`Revancha pedida en ${roomCode} por ${socket.id}`);

      // Fuera la partida vieja y sus temporizadores, y a limpiar los tableros
      GameManager.deleteGame(roomCode);
      room.players.forEach((p) => p.prepararNuevaPartida());
      room.setStatus(GAME_STATUS.LOBBY);

      const nueva = GameManager.createGame(room, io);
      if (!nueva) {
        return responder({ success: false, error: 'No se pudo iniciar la revancha' });
      }

      /* Avisar a todos para que cierren la pantalla de fin de partida. El
         estado nuevo ya viaja por su cuenta desde createGame. */
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_REMATCH, { roomCode });

      responder({ success: true });
      logger.success(`Revancha iniciada en ${roomCode}`);
    } catch (error) {
      logger.error('Error al iniciar la revancha', error);
      if (callback) callback({ success: false, error: 'Error al iniciar la revancha' });
    }
  });

  /**
   * Jugar una carta
   */
  socket.on(SOCKET_EVENTS.GAME_PLAY_CARD, (data, callback) => {
    try {
      const { cardId, targetPlayerId, movements } = data;
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
        movements
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

      const slotType = movements?.[0]?.destino?.slot;

      // Si hubo anulación mutua
      if (result.effect.cancelled) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARDS_CANCELLED, {
          slotType,
          targetPlayerId: targetPlayerId,
          cardsDiscarded: result.effect.cardsToDiscard
        });
      }

      // Si hubo destrucción
      if (result.effect.destroyed) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANT_DESTROYED, {
          slotType,
          playerId: targetPlayerId,
          cardsDiscarded: result.effect.cardsToDiscard
        });
      }

      //EFECTOS DE EVENTOS ESPECIALES
      
      if (result.effect.stolen) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANT_BOUGHT, {
          fromPlayer: result.effect.stolen.from,
          slotType: result.effect.stolen.slot,
          toPlayer: socket.id
        });
      }

      if (result.effect.allDiscarded) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_ALL_DISCARDED, {
          hands: result.effect.handsDiscarded
        });
      }

      if (result.effect.swapped) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANTS_SWAPPED, {
          swapped: result.effect.swapped
        });
      }

      if (result.effect.swappedBoards) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_TERRAIN_SWAPPED, {
          playerId: targetPlayerId,
        });
      }

      if (result.effect.spreads.length > 0) {
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_RISK_SPREAD, {
          spreads: result.effect.spreads
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

      if (!result.victory && result.nextPlayer && result.nextPlayer.isBot) {
        GameManager.scheduleBotTurn(roomCode, io);
      }

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
