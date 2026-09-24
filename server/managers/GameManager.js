import Game from '../models/Game.js';
import RoomManager from './RoomManager.js';
import { GAME_STATUS, PLAYER_STATUS, SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { selectBotAction } from '../utils/botAI.js';

/**
 * Gestor de partidas del juego
 */
class GameManager {
  constructor() {
    this.games = new Map(); // roomCode -> Game
    this.botTurnTimers = new Map(); // roomCode -> timeoutId
    this.botWatchdogs = new Map(); // roomCode -> timeoutId (turnos atascados)
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

  clearWatchdog(roomCode) {
    const timer = this.botWatchdogs.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.botWatchdogs.delete(roomCode);
    }
  }

  /**
   * Cierra el turno del jugador y deja la mesa lista para el siguiente.
   *
   * Existe porque antes cada rama del turno del bot cerraba por su cuenta con
   * `if (result.success) { ... }` y SIN else: seis caminos distintos en los
   * que, si `endTurn` fallaba, no se avisaba a nadie y la partida se quedaba
   * congelada para siempre. Tres de esas ramas además se tragaban la victoria
   * (`if (fallback.success && !fallback.victory)`), o sea que ganar por esa
   * vía tampoco terminaba la partida.
   *
   * Aquí hay un solo camino y SIEMPRE termina en una de dos: se anuncia la
   * victoria, o pasa el turno. Si `endTurn` no se puede completar se fuerza
   * con `forceEndTurn`, que no valida nada. Vale mil veces más un turno
   * pasado a la fuerza que una mesa trabada.
   */
  resolverTurno(roomCode, io, playerId) {
    const game = this.games.get(roomCode);
    if (!game || game.status !== GAME_STATUS.PLAYING) {
      return;
    }

    let resultado = game.endTurn(playerId);

    if (!resultado.success) {
      logger.warn(
        `No se pudo cerrar el turno en ${roomCode} (${resultado.error}); se fuerza el paso`,
      );
      resultado = game.forceEndTurn(playerId);
    }

    if (!resultado.success) {
      logger.error(`Turno atascado sin remedio en ${roomCode}: ${resultado.error}`);
      return;
    }

    if (resultado.victory) {
      this.clearBotTimer(roomCode);
      this.clearWatchdog(roomCode);
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_VICTORY, {
        winner: resultado.winner,
        finalState: resultado.gameState,
      });
      return;
    }

    this.emitTurnChanged(io, roomCode, resultado.nextPlayer, game.turnCount);
    this.emitGameState(io, roomCode);
    this.scheduleBotTurn(roomCode, io);
  }

  /**
   * Vigilante de turnos atascados.
   *
   * Red de seguridad por si alguna vez vuelve a aparecer un camino sin salida
   * que no previmos: si pasado un rato sigue siendo el turno del mismo
   * jugador, se le pasa el turno a la fuerza. Vigila turnos de BOT (12s) y de
   * personas DESCONECTADAS (45s, por si vuelven). A una persona conectada
   * nunca se le apura: puede estar pensando.
   */
  armarWatchdog(roomCode, io, playerId, turnoAlArmar, espera = 12000) {
    this.clearWatchdog(roomCode);

    const timer = setTimeout(() => {
      this.botWatchdogs.delete(roomCode);
      const game = this.games.get(roomCode);
      if (!game || game.status !== GAME_STATUS.PLAYING) return;

      const actual = game.getCurrentPlayer();
      // Si ya avanzó, no hay nada que destrabar
      if (!actual || actual.id !== playerId || game.turnCount !== turnoAlArmar) return;

      /* Y si volvió, tampoco. Al reconectarse se le asigna un socket nuevo,
         así que la comparación de arriba ya lo descartaría, pero esto lo deja
         explícito: a una persona conectada no se le quita el turno por haber
         tardado. Solo se destraban bots y ausentes. */
      if (!actual.isBot && actual.status !== PLAYER_STATUS.DISCONNECTED) return;

      logger.error(
        `Turno atascado en ${roomCode} (${actual.name}); el vigilante lo destraba`,
      );
      this.resolverTurno(roomCode, io, playerId);
    }, espera);

    this.botWatchdogs.set(roomCode, timer);
  }

  scheduleBotTurn(roomCode, io) {
    this.clearBotTimer(roomCode);
    this.clearWatchdog(roomCode);

    const game = this.games.get(roomCode);
    if (!game || game.status !== GAME_STATUS.PLAYING) {
      return;
    }

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) {
      return;
    }

    /* Si al jugador en turno se le cayó la conexión, NADIE puede cerrar ese
       turno y la mesa se queda trabada para todos. No hay reconexión todavía
       (ver el TODO en connectionHandlers), así que al menos no dejamos la
       partida muerta: se le da un rato por si vuelve y luego se le pasa el
       turno. En un taller con celulares esto pasa seguido — se bloquea la
       pantalla, parpadea el wifi, se cambian de app. */
    if (!currentPlayer.isBot) {
      if (currentPlayer.status === PLAYER_STATUS.DISCONNECTED) {
        this.armarWatchdog(roomCode, io, currentPlayer.id, game.turnCount, 45000);
      }
      return;
    }

    this.armarWatchdog(roomCode, io, currentPlayer.id, game.turnCount);

    const timer = setTimeout(() => {
      this.botTurnTimers.delete(roomCode);

      const liveGame = this.games.get(roomCode);
      if (!liveGame || liveGame.status !== GAME_STATUS.PLAYING) {
        return;
      }

      const activePlayer = liveGame.getCurrentPlayer();
      if (!activePlayer || !activePlayer.isBot) {
        return;
      }

      try {
        const action = selectBotAction(liveGame, activePlayer);

        if (action && action.type === 'discard') {
          const result = liveGame.discardCards(activePlayer.id, action.cardIds);
          if (result.success) {
            io.to(activePlayer.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, {
              cards: result.drawnCards,
            });
            this.emitGameState(io, roomCode);
          }
        } else if (action && action.type !== 'end_turn') {
          const result = liveGame.playCard(
            activePlayer.id,
            action.cardId,
            action.targetPlayerId,
            action.movements || [],
          );

          if (result.success) {
            io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARD_PLAYED, {
              playerId: activePlayer.id,
              card: result.card,
              target: result.target,
              effect: result.effect,
            });

            if (result.effect.cancelled) {
              io.to(roomCode).emit(SOCKET_EVENTS.GAME_CARDS_CANCELLED, {
                slotType: action.movements?.[0]?.destino?.slot,
                targetPlayerId: action.targetPlayerId,
                cardsDiscarded: result.effect.cardsToDiscard,
              });
            }

            if (result.effect.destroyed) {
              io.to(roomCode).emit(SOCKET_EVENTS.GAME_PLANT_DESTROYED, {
                slotType: action.movements?.[0]?.destino?.slot,
                playerId: action.targetPlayerId,
                cardsDiscarded: result.effect.cardsToDiscard,
              });
            }

            if (result.drawnCard) {
              io.to(activePlayer.id).emit(SOCKET_EVENTS.GAME_CARDS_DRAWN, {
                cards: [result.drawnCard],
              });
            }

            this.emitGameState(io, roomCode);
          }
        }
      } catch (error) {
        logger.error(`Error ejecutando turno del bot en ${roomCode}`, error);
      }

      // Pase lo que pase arriba —jugada buena, jugada rechazada, excepción o
      // ninguna jugada posible— el turno se cierra aquí. Una sola salida.
      this.resolverTurno(roomCode, io, activePlayer.id);
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
    // El vigilante también, o queda un temporizador suelto apuntando a una
    // partida que ya no existe.
    this.clearWatchdog(roomCode);
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
