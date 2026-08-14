import Game from '../models/Game.js';
import RoomManager from './RoomManager.js';
import { GAME_STATUS, SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { selectBotAction } from '../utils/botAI.js';

/**
 * Gestor de partidas del juego
 */
class GameManager {
  constructor() {
    this.games = new Map(); // roomCode -> Game
    this.botTurnTimers = new Map(); // roomCode -> timeoutId
  }

  emitGameState(io, roomCode) {
    const game = this.games.get(roomCode);
    if (!game || !roomCode) {
      return;
    }

    const room = RoomManager.getRoom(roomCode);
    if (!room) {
      return;
    }

    room.players.forEach((player) => {
      const playerState = game.getStateForPlayer(player.id);
      io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATE, playerState);
    });
  }

  emitTurnChanged(io, roomCode, nextPlayer, turnCount) {
    const game = this.games.get(roomCode);
    if (!game) {
      return;
    }

    io.to(roomCode).emit(SOCKET_EVENTS.GAME_TURN_CHANGED, {
      currentPlayerId: nextPlayer.id,
      currentPlayerName: nextPlayer.name,
      turnCount: turnCount ?? game.turnCount
    });
  }

  clearBotTimer(roomCode) {
    const timer = this.botTurnTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.botTurnTimers.delete(roomCode);
    }
  }

  scheduleBotTurn(roomCode, io) {
    this.clearBotTimer(roomCode);

    const game = this.games.get(roomCode);
    if (!game || game.status !== GAME_STATUS.PLAYING) {
      return;
    }

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot) {
      return;
    }

    const timer = setTimeout(() => {
      const liveGame = this.games.get(roomCode);
      if (!liveGame || liveGame.status !== GAME_STATUS.PLAYING) {
        return;
      }

      const activePlayer = liveGame.getCurrentPlayer();
      if (!activePlayer || !activePlayer.isBot) {
        return;
      }

      const action = selectBotAction(liveGame, activePlayer);

      try {
        if (!action || action.type === 'end_turn') {
          const result = liveGame.endTurn(activePlayer.id);
          if (result.success) {
            if (result.victory) {
              io.to(roomCode).emit(SOCKET_EVENTS.GAME_VICTORY, {
                winner: result.winner,
                finalState: result.gameState
              });
              return;
            }

            this.emitTurnChanged(io, roomCode, result.nextPlayer, liveGame.turnCount);
            this.emitGameState(io, roomCode);
            this.scheduleBotTurn(roomCode, io);
          }
          return;
        }

        if (action.type === 'discard') {
          const result = liveGame.discardCards(activePlayer.id, action.cardIds);
          if (!result.success) {
            const fallback = liveGame.endTurn(activePlayer.id);
            if (fallback.success && !fallback.victory) {
              this.emitTurnChanged(io, roomCode, fallback.nextPlayer, liveGame.turnCount);
              this.emitGameState(io, roomCode);
              this.scheduleBotTurn(roomCode, io);
            }
            return;
          }

          io.to(activePlayer.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, { cards: result.drawnCards });
          this.emitGameState(io, roomCode);

          const endResult = liveGame.endTurn(activePlayer.id);
          if (endResult.success) {
            if (endResult.victory) {
              io.to(roomCode).emit(SOCKET_EVENTS.GAME_VICTORY, {
                winner: endResult.winner,
                finalState: endResult.gameState
              });
              return;
            }

            this.emitTurnChanged(io, roomCode, endResult.nextPlayer, liveGame.turnCount);
            this.emitGameState(io, roomCode);
            this.scheduleBotTurn(roomCode, io);
          }
          return;
        }

        const result = liveGame.playCard(
          activePlayer.id,
          action.cardId,
          action.targetPlayerId,
          action.movements || []
        );

        if (!result.success) {
          const fallback = liveGame.endTurn(activePlayer.id);
          if (fallback.success && !fallback.victory) {
            this.emitTurnChanged(io, roomCode, fallback.nextPlayer, liveGame.turnCount);
            this.emitGameState(io, roomCode);
            this.scheduleBotTurn(roomCode, io);
          }
          return;
        }

        io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARD_PLAYED, {
          playerId: activePlayer.id,
          card: result.card,
          target: result.target,
          effect: result.effect
        });

        if (result.effect.cancelled) {
          io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARDS_CANCELLED, {
            slotType: action.movements?.[0]?.destino?.slot,
            targetPlayerId: action.targetPlayerId,
            cardsDiscarded: result.effect.cardsToDiscard
          });
        }

        if (result.effect.destroyed) {
          io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANT_DESTROYED, {
            slotType: action.movements?.[0]?.destino?.slot,
            playerId: action.targetPlayerId,
            cardsDiscarded: result.effect.cardsToDiscard
          });
        }

        if (result.drawnCard) {
          io.to(activePlayer.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, { cards: [result.drawnCard] });
        }

        this.emitGameState(io, roomCode);

        const endResult = liveGame.endTurn(activePlayer.id);
        if (endResult.success) {
          if (endResult.victory) {
            io.to(roomCode).emit(SOCKET_EVENTS.GAME_VICTORY, {
              winner: endResult.winner,
              finalState: endResult.gameState
            });
            return;
          }

          this.emitTurnChanged(io, roomCode, endResult.nextPlayer, liveGame.turnCount);
          this.emitGameState(io, roomCode);
          this.scheduleBotTurn(roomCode, io);
        }
      } catch (error) {
        logger.error(`Error ejecutando turno del bot en ${roomCode}`, error);
        const fallback = liveGame.endTurn(activePlayer.id);
        if (fallback.success && !fallback.victory) {
          this.emitTurnChanged(io, roomCode, fallback.nextPlayer, liveGame.turnCount);
          this.emitGameState(io, roomCode);
          this.scheduleBotTurn(roomCode, io);
        }
      }
    }, 800 + Math.random() * 500);

    this.botTurnTimers.set(roomCode, timer);
  }

  /**
   * Crea y inicia una nueva partida
   */
  createGame(room, io = null) {
    if (!room) {
      logger.error('Intento de crear partida sin sala');
      return null;
    }

    // Verificar que la sala puede iniciar
    const canStart = room.canStart();
    if (!canStart.can) {
      logger.warn(`Sala ${room.code} no puede iniciar: ${canStart.reason}`);
      return null;
    }

    // Crear partida
    const game = new Game(room.code, room.players);
    game.start();

    // Guardar partida
    this.games.set(room.code, game);

    // Actualizar estado de la sala
    room.setStatus(GAME_STATUS.PLAYING);
    room.game = game;

    if (io) {
      this.emitGameState(io, room.code);
      this.emitTurnChanged(io, room.code, game.getCurrentPlayer(), game.turnCount);
      this.scheduleBotTurn(room.code, io);
    }

    logger.success(`Partida iniciada en sala ${room.code}`);

    return game;
  }

  /**
   * Obtiene una partida por código de sala
   */
  getGame(roomCode) {
    return this.games.get(roomCode);
  }

  /**
   * Maneja una jugada de carta
   */
  playCard(roomCode, playerId, cardId, targetPlayerId, movements) {
    const game = this.games.get(roomCode);

    if (!game) {
      return { success: false, error: 'Partida no encontrada' };
    }

    if (game.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'La partida no está en curso' };
    }

    const result = game.playCard(playerId, cardId, targetPlayerId, movements);

    // Si hubo cartas descartadas (anulación o destrucción), agregarlas a la pila
    if (result.success && result.effect && result.effect.cardsToDiscard.length > 0) {
      game.discardPile.push(...result.effect.cardsToDiscard);
    }

    return result;
  }

  /**
   * Maneja el descarte de cartas
   */
  discardCards(roomCode, playerId, cardIds) {
    const game = this.games.get(roomCode);

    if (!game) {
      return { success: false, error: 'Partida no encontrada' };
    }

    if (game.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'La partida no está en curso' };
    }

    return game.discardCards(playerId, cardIds);
  }

  /**
   * Maneja el fin de turno
   */
  endTurn(roomCode, playerId) {
    const game = this.games.get(roomCode);

    if (!game) {
      return { success: false, error: 'Partida no encontrada' };
    }

    if (game.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'La partida no está en curso' };
    }

    return game.endTurn(playerId);
  }

  /**
   * Obtiene el estado de la partida para un jugador específico
   */
  getGameStateForPlayer(roomCode, playerId) {
    const game = this.games.get(roomCode);

    if (!game) {
      return null;
    }

    return game.getStateForPlayer(playerId);
  }

  /**
   * Obtiene el estado general de la partida
   */
  getGameState(roomCode) {
    const game = this.games.get(roomCode);

    if (!game) {
      return null;
    }

    return game.getState();
  }

  /**
   * Pausa una partida (por desconexión, etc)
   */
  pauseGame(roomCode) {
    const game = this.games.get(roomCode);

    if (!game) {
      return false;
    }

    game.status = GAME_STATUS.PAUSED;
    logger.warn(`Partida ${roomCode} pausada`);
    return true;
  }

  /**
   * Reanuda una partida pausada
   */
  resumeGame(roomCode) {
    const game = this.games.get(roomCode);

    if (!game) {
      return false;
    }

    if (game.status !== GAME_STATUS.PAUSED) {
      return false;
    }

    game.status = GAME_STATUS.PLAYING;
    logger.info(`Partida ${roomCode} reanudada`);
    return true;
  }

  /**
   * Termina una partida prematuramente
   */
  endGame(roomCode, reason = 'ended') {
    const game = this.games.get(roomCode);

    if (!game) {
      return false;
    }

    game.status = GAME_STATUS.FINISHED;
    logger.info(`Partida ${roomCode} terminada: ${reason}`);
    return true;
  }

  /**
   * Elimina una partida (después de terminada)
   */
  deleteGame(roomCode) {
    this.clearBotTimer(roomCode);
    const deleted = this.games.delete(roomCode);

    if (deleted) {
      logger.info(`Partida ${roomCode} eliminada`);
    }

    return deleted;
  }

  /**
   * Obtiene estadísticas de las partidas
   */
  getStats() {
    const stats = {
      totalGames: this.games.size,
      playingGames: 0,
      pausedGames: 0,
      finishedGames: 0,
      totalTurns: 0,
      avgTurnsPerGame: 0
    };

    this.games.forEach(game => {
      if (game.status === GAME_STATUS.PLAYING) stats.playingGames++;
      if (game.status === GAME_STATUS.PAUSED) stats.pausedGames++;
      if (game.status === GAME_STATUS.FINISHED) stats.finishedGames++;
      stats.totalTurns += game.turnCount;
    });

    if (stats.totalGames > 0) {
      stats.avgTurnsPerGame = Math.round(stats.totalTurns / stats.totalGames);
    }

    return stats;
  }

  /**
   * Limpia partidas terminadas (mantenimiento)
   */
  cleanupFinishedGames(maxAgeMs = 1800000) { // 30 minutos
    const now = Date.now();
    const gamesToDelete = [];

    this.games.forEach((game, code) => {
      if (game.status === GAME_STATUS.FINISHED) {
        const age = now - game.startedAt;
        if (age > maxAgeMs) {
          gamesToDelete.push(code);
        }
      }
    });

    gamesToDelete.forEach(code => this.deleteGame(code));

    if (gamesToDelete.length > 0) {
      logger.info(`Limpieza automática: ${gamesToDelete.length} partidas eliminadas`);
    }

    return gamesToDelete.length;
  }
}

export default new GameManager();
