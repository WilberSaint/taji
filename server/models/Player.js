import { PLAYER_STATUS, ENERGY_TYPES, DEFAULT_AVATARS } from '../utils/constants.js';
import { checkVictoryCondition } from '../utils/gameValidator.js';
import logger from '../utils/logger.js';

/**
 * Clase que representa un jugador
 */
export default class Player {
  constructor(socketId, name, avatar = null, color = null) {
    this.id = socketId;
    this.name = name || `Jugador ${socketId.substring(0, 4)}`;
    this.avatar = avatar || this.getRandomAvatar();
    this.color = color;
    this.hand = [];
    this.board = this.initializeBoard();
    this.status = PLAYER_STATUS.CONNECTED;
    this.isReady = false;
    this.hasPlayedThisTurn = false;
    this.hasDiscardedThisTurn = false;
  }

  /**
   * Inicializa el tablero del jugador con 4 espacios vacíos
   */
  initializeBoard() {
    return {
      [ENERGY_TYPES.SOLAR]: {
        type: ENERGY_TYPES.SOLAR,
        plant: null,
        modifiers: []
      },
      [ENERGY_TYPES.EOLICA]: {
        type: ENERGY_TYPES.EOLICA,
        plant: null,
        modifiers: []
      },
      [ENERGY_TYPES.HIDROELECTRICA]: {
        type: ENERGY_TYPES.HIDROELECTRICA,
        plant: null,
        modifiers: []
      },
      [ENERGY_TYPES.GEOTERMICA]: {
        type: ENERGY_TYPES.GEOTERMICA,
        plant: null,
        modifiers: []
      }
    };
  }

  /**
   * Obtiene un avatar aleatorio
   */
  getRandomAvatar() {
    return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  }

  /**
   * Agrega una carta a la mano del jugador
   */
  addCard(card) {
    if (!card) {
      logger.warn('Intento de agregar carta null a la mano');
      return false;
    }

    this.hand.push(card);
    logger.debug(`Carta agregada a ${this.name}`, { 
      cardId: card.id, 
      handSize: this.hand.length 
    });
    return true;
  }

  /**
   * Agrega múltiples cartas a la mano
   */
  addCards(cards) {
    cards.forEach(card => this.addCard(card));
  }

  /**
   * Remueve una carta de la mano del jugador
   */
  removeCard(cardId) {
    const cardIndex = this.hand.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) {
      logger.warn(`Carta ${cardId} no encontrada en la mano de ${this.name}`);
      return null;
    }

    const [removedCard] = this.hand.splice(cardIndex, 1);
    logger.debug(`Carta removida de ${this.name}`, { 
      cardId: removedCard.id,
      handSize: this.hand.length 
    });
    return removedCard;
  }

  /**
   * Remueve múltiples cartas de la mano
   */
  removeCards(cardIds) {
    return cardIds.map(id => this.removeCard(id)).filter(card => card !== null);
  }

  /**
   * Obtiene una carta de la mano por ID
   */
  getCard(cardId) {
    return this.hand.find(c => c.id === cardId);
  }

  /**
   * Juega una planta en un slot
   */
  playPlant(card, slotType) {
    const slot = this.board[slotType];
    
    if (!slot) {
      logger.error(`Slot ${slotType} no existe en el tablero de ${this.name}`);
      return false;
    }

    if (slot.plant) {
      logger.warn(`Ya hay una planta en ${slotType} de ${this.name}`);
      return false;
    }

    slot.plant = card;
    this.hasPlayedThisTurn = true;
    logger.game(`${this.name} jugó planta ${card.name} en ${slotType}`);
    return true;
  }

  /**
   * Agrega un modificador (mantenimiento o riesgo) a un slot
   */
  addModifier(slotType, card) {
    const slot = this.board[slotType];
    
    if (!slot || !slot.plant) {
      logger.error(`No se puede agregar modificador a slot ${slotType} sin planta`);
      return false;
    }

    slot.modifiers.push(card);
    logger.game(`${card.name} agregado a ${slotType} de ${this.name}`);
    return true;
  }

  /**
   * Destruye una planta y todos sus modificadores
   */
  destroyPlant(slotType) {
    const slot = this.board[slotType];
    
    if (!slot || !slot.plant) {
      logger.warn(`No hay planta para destruir en ${slotType} de ${this.name}`);
      return [];
    }

    const destroyedCards = [slot.plant, ...slot.modifiers];
    slot.plant = null;
    slot.modifiers = [];

    logger.game(`Planta destruida en ${slotType} de ${this.name}`, {
      cardsDestroyed: destroyedCards.length
    });

    return destroyedCards;
  }

  /**
   * Limpia los modificadores de un slot (para anulación mutua)
   */
  clearModifiers(slotType) {
    const slot = this.board[slotType];
    
    if (!slot) {
      return [];
    }

    const removedModifiers = [...slot.modifiers];
    slot.modifiers = [];

    logger.game(`Modificadores limpiados en ${slotType} de ${this.name}`);
    return removedModifiers;
  }

  /**
   * Verifica si el jugador ha ganado
   */
  hasWon() {
    return checkVictoryCondition(this);
  }

  /**
   * Marca al jugador como listo
   */
  setReady(ready) {
    this.isReady = ready;
    logger.info(`${this.name} ${ready ? 'está listo' : 'no está listo'}`);
  }

  /**
   * Resetea el estado del turno
   */
  resetTurnState() {
    this.hasPlayedThisTurn = false;
    this.hasDiscardedThisTurn = false;
  }

  /**
   * Obtiene el estado del jugador (para enviar al cliente)
   * @param {boolean} hideHand - Si es true, oculta las cartas de la mano (para otros jugadores)
   */
  getState(hideHand = false) {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      color: this.color,
      hand: hideHand ? this.hand.map(() => ({ id: 'hidden', hidden: true })) : this.hand,
      handCount: this.hand.length,
      board: this.board,
      status: this.status,
      isReady: this.isReady,
      hasPlayedThisTurn: this.hasPlayedThisTurn,
      hasDiscardedThisTurn: this.hasDiscardedThisTurn
    };
  }

  /**
   * Obtiene estadísticas del jugador
   */
  getStats() {
    const plantsCount = Object.values(this.board).filter(slot => slot.plant).length;
    const immunizedCount = Object.values(this.board).filter(slot => {
      return slot.modifiers.filter(m => m.type === 'mantenimiento').length === 2;
    }).length;
    const atRiskCount = Object.values(this.board).filter(slot => {
      return slot.modifiers.some(m => m.type === 'riesgo');
    }).length;

    return {
      plantsCount,
      immunizedCount,
      atRiskCount,
      handCount: this.hand.length
    };
  }
}