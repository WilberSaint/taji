import Deck from './Deck.js';
import { 
  GAME_STATUS, 
  GAME_RULES, 
  CARD_TYPES 
} from '../utils/constants.js';
import { 
  canPlayCard, 
  checkVictoryCondition,
  canEndTurn,
  validateDiscard
} from '../utils/gameValidator.js';
import logger from '../utils/logger.js';

/**
 * Clase que representa una partida de TAJI
 */
export default class Game {
  constructor(roomCode, players) {
    this.id = roomCode;
    this.players = players;
    this.currentTurnIndex = 0;
    this.deck = new Deck();
    this.discardPile = [];
    this.status = GAME_STATUS.PLAYING;
    this.winner = null;
    this.turnCount = 0;
    this.startedAt = Date.now();
  }

  /**
   * Inicia la partida
   */
  start() {
    logger.game(`Iniciando partida ${this.id}`);
    
    // Determinar orden aleatorio de jugadores
    this.shufflePlayers();
    
    // Repartir cartas iniciales
    this.dealInitialCards();
    
    // Resetear estados de turnos
    this.players.forEach(p => p.resetTurnState());
    
    logger.success(`Partida ${this.id} iniciada`, {
      players: this.players.map(p => p.name),
      firstPlayer: this.getCurrentPlayer().name
    });
  }

  /**
   * Mezcla aleatoriamente el orden de los jugadores
   */
  shufflePlayers() {
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }
  }

  /**
   * Reparte cartas iniciales a todos los jugadores
   */
  dealInitialCards() {
    this.players.forEach(player => {
      const cards = this.deck.drawMultiple(GAME_RULES.INITIAL_HAND_SIZE);
      player.addCards(cards);
      logger.debug(`Cartas iniciales repartidas a ${player.name}`, {
        count: cards.length
      });
    });
  }

  /**
   * Obtiene el jugador actual
   */
  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  /**
   * Obtiene un jugador por ID
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Pasa al siguiente turno
   */
  nextTurn() {
    // Resetear estado del turno del jugador actual
    this.getCurrentPlayer().resetTurnState();
    
    // Incrementar turno
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    this.turnCount++;
    
    const newCurrentPlayer = this.getCurrentPlayer();
    logger.game(`Turno ${this.turnCount}: ${newCurrentPlayer.name}`);
    
    return newCurrentPlayer;
  }

  /**
   * Roba una carta del mazo
   */
  drawCard(playerId) {
    const player = this.getPlayer(playerId);
    
    if (!player) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    // Verificar si el mazo está vacío
    if (this.deck.isEmpty()) {
      logger.warn('Mazo vacío, rellenando desde descarte');
      
      if (this.discardPile.length === 0) {
        return { success: false, error: 'No hay cartas disponibles' };
      }

      // Rellenar mazo desde descarte
      this.deck.refillFromDiscard(this.discardPile);
      this.discardPile = [];
    }

    const card = this.deck.draw();
    
    if (!card) {
      return { success: false, error: 'No se pudo robar carta' };
    }

    player.addCard(card);
    
    return { 
      success: true, 
      card: card,
      deckCount: this.deck.getCount()
    };
  }

  /**
   * Roba múltiples cartas
   */
  drawMultipleCards(playerId, count) {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const result = this.drawCard(playerId);
      if (result.success) {
        results.push(result.card);
      } else {
        logger.warn(`Solo se pudieron robar ${i} de ${count} cartas`);
        break;
      }
    }

    return results;
  }

  /**
   * Juega una carta
   */
  playCard(playerId, cardId, targetPlayerId, slotType) {
    const player = this.getPlayer(playerId);
    const targetPlayer = this.getPlayer(targetPlayerId);
    
    // Validaciones básicas
    if (!player) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    if (!targetPlayer) {
      return { success: false, error: 'Jugador objetivo no encontrado' };
    }

    if (player.id !== this.getCurrentPlayer().id) {
      return { success: false, error: 'No es tu turno' };
    }

    if (player.hasPlayedThisTurn) {
      return { success: false, error: 'Ya jugaste una carta en este turno' };
    }

    // Obtener carta de la mano
    const card = player.getCard(cardId);
    if (!card) {
      return { success: false, error: 'Carta no encontrada en tu mano' };
    }

    // Validar si la carta se puede jugar
    const validation = canPlayCard(card, targetPlayer, slotType, player);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Remover carta de la mano
    player.removeCard(cardId);

    // Aplicar efectos de la carta
    const effect = this.applyCardEffect(card, targetPlayer, slotType);

    // Robar 1 carta después de jugar
    const drawnCard = this.drawCard(playerId);

    // Marcar que el jugador ya jugó en este turno
    player.hasPlayedThisTurn = true;

    logger.game(`${player.name} jugó ${card.name} en ${slotType} de ${targetPlayer.name}`);

    return {
      success: true,
      card: card,
      target: { playerId: targetPlayerId, slotType },
      effect: effect,
      drawnCard: drawnCard.success ? drawnCard.card : null,
      gameState: this.getState()
    };
  }

  /**
   * Aplica el efecto de una carta jugada
   */
  applyCardEffect(card, targetPlayer, slotType) {
    const slot = targetPlayer.board[slotType];
    const effect = {
      type: card.type,
      cancelled: false,
      destroyed: false,
      cardsToDiscard: []
    };

    // CASO 1: JUGAR PLANTA
    if (card.type === CARD_TYPES.PLANTA) {
      targetPlayer.playPlant(card, slotType);
      return effect;
    }

    // CASO 2: JUGAR MANTENIMIENTO
    if (card.type === CARD_TYPES.MANTENIMIENTO) {
      // Revisar si hay riesgos para anulación mutua
      const risks = slot.modifiers.filter(m => m.type === CARD_TYPES.RIESGO);
      
      if (risks.length > 0) {
        // ANULACIÓN MUTUA: el mantenimiento cancela 1 riesgo
        effect.cancelled = true;
        effect.cardsToDiscard.push(card, risks[0]);
        
        // Remover el riesgo
        slot.modifiers = slot.modifiers.filter(m => m.id !== risks[0].id);
        
        logger.game(`¡Anulación mutua! Mantenimiento canceló riesgo en ${slotType}`);
      } else {
        // Agregar mantenimiento normalmente
        targetPlayer.addModifier(slotType, card);
      }
      
      return effect;
    }

    // CASO 3: JUGAR RIESGO
    if (card.type === CARD_TYPES.RIESGO) {
      // Revisar si hay mantenimientos para anulación mutua
      const maintenances = slot.modifiers.filter(m => m.type === CARD_TYPES.MANTENIMIENTO);
      
      if (maintenances.length > 0) {
        // ANULACIÓN MUTUA: el riesgo cancela 1 mantenimiento
        effect.cancelled = true;
        effect.cardsToDiscard.push(card, maintenances[0]);
        
        // Remover el mantenimiento
        slot.modifiers = slot.modifiers.filter(m => m.id !== maintenances[0].id);
        
        logger.game(`¡Anulación mutua! Riesgo canceló mantenimiento en ${slotType}`);
      } else {
        // Agregar riesgo
        targetPlayer.addModifier(slotType, card);
        
        // Revisar si se alcanzaron 2 riesgos (DESTRUCCIÓN)
        const riskCount = slot.modifiers.filter(m => m.type === CARD_TYPES.RIESGO).length;
        
        if (riskCount >= 2) {
          effect.destroyed = true;
          const destroyedCards = targetPlayer.destroyPlant(slotType);
          effect.cardsToDiscard.push(...destroyedCards);
          
          logger.game(`¡Planta destruida! ${slotType} de ${targetPlayer.name}`);
        }
      }
      
      return effect;
    }

    return effect;
  }

  /**
   * Descarta cartas y roba la misma cantidad
   */
  discardCards(playerId, cardIds) {
    const player = this.getPlayer(playerId);
    
    if (!player) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    if (player.id !== this.getCurrentPlayer().id) {
      return { success: false, error: 'No es tu turno' };
    }

    if (player.hasDiscardedThisTurn) {
      return { success: false, error: 'Ya descartaste cartas en este turno' };
    }

    // Validar descarte
    const validation = validateDiscard(cardIds, player.hand);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Remover cartas de la mano
    const discardedCards = player.removeCards(cardIds);
    
    // Agregar al descarte
    this.discardPile.push(...discardedCards);

    // Robar la misma cantidad
    const drawnCards = this.drawMultipleCards(playerId, discardedCards.length);

    player.hasDiscardedThisTurn = true;

    logger.game(`${player.name} descartó ${discardedCards.length} cartas y robó ${drawnCards.length}`);

    return {
      success: true,
      discardedCards: discardedCards,
      drawnCards: drawnCards,
      gameState: this.getState()
    };
  }

  /**
   * Termina el turno del jugador actual
   */
  endTurn(playerId) {
    const player = this.getPlayer(playerId);
    
    if (!player) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    if (player.id !== this.getCurrentPlayer().id) {
      return { success: false, error: 'No es tu turno' };
    }

    // Validar que puede terminar el turno
    const validation = canEndTurn(player, player.hasPlayedThisTurn, player.hasDiscardedThisTurn);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Revisar condición de victoria ANTES de pasar turno
    if (player.hasWon()) {
      this.endGame(player);
      return {
        success: true,
        victory: true,
        winner: player.getState(),
        gameState: this.getState()
      };
    }

    // Pasar al siguiente turno
    const nextPlayer = this.nextTurn();

    return {
      success: true,
      victory: false,
      nextPlayer: nextPlayer.getState(),
      gameState: this.getState()
    };
  }

  /**
   * Termina el juego con un ganador
   */
  endGame(winner) {
    this.status = GAME_STATUS.FINISHED;
    this.winner = winner;
    logger.success(`¡${winner.name} ha ganado la partida ${this.id}!`);
  }

  /**
   * Obtiene el estado completo del juego
   */
  getState() {
    return {
      id: this.id,
      players: this.players.map((p, index) => ({
        ...p.getState(true), // Ocultar manos de otros jugadores
        isCurrentTurn: index === this.currentTurnIndex
      })),
      currentTurnIndex: this.currentTurnIndex,
      currentPlayerId: this.getCurrentPlayer().id,
      deck: {
        count: this.deck.getCount(),
        isEmpty: this.deck.isEmpty()
      },
      discardPile: {
        count: this.discardPile.length,
        topCard: this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null
      },
      status: this.status,
      winner: this.winner ? this.winner.getState() : null,
      turnCount: this.turnCount,
      startedAt: this.startedAt
    };
  }

  /**
   * Obtiene el estado del juego para un jugador específico (incluye su mano)
   */
  getStateForPlayer(playerId) {
    const state = this.getState();
    const player = this.getPlayer(playerId);
    
    if (player) {
      // Reemplazar el estado del jugador con uno que incluya su mano completa
      const playerIndex = this.players.findIndex(p => p.id === playerId);
      state.players[playerIndex] = {
        ...player.getState(false), // NO ocultar su propia mano
        isCurrentTurn: playerIndex === this.currentTurnIndex
      };
    }

    return state;
  }
}