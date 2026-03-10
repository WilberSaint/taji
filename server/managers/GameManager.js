import Game from '../models/Game.js';
import { GAME_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Gestor de partidas del juego
 */
class GameManager {
  constructor() {
    this.games = new Map(); // roomCode -> Game
  }

  /**
   * Crea y inicia una nueva partida
   */
  createGame(room) {
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
  playCard(roomCode, playerId, cardId, targetPlayerId, slotType) {
    const game = this.games.get(roomCode);

    if (!game) {
      return { success: false, error: 'Partida no encontrada' };
    }

    if (game.status !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'La partida no está en curso' };
    }

    const result = game.playCard(playerId, cardId, targetPlayerId, slotType);

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
