import { buildDeck, shuffleArray } from '../utils/deckBuilder.js';
import logger from '../utils/logger.js';

/**
 * Clase que representa el mazo de cartas del juego
 */
export default class Deck {
  constructor() {
    this.cards = [];
    this.initialize();
  }

  /**
   * Inicializa el mazo construyendo y mezclando las cartas
   */
  initialize() {
    this.cards = buildDeck();
    this.shuffle();
    logger.debug('Mazo inicializado', { totalCards: this.cards.length });
  }

  /**
   * Mezcla las cartas del mazo
   */
  shuffle() {
    this.cards = shuffleArray(this.cards);
    logger.debug('Mazo mezclado');
  }

  /**
   * Roba una carta del mazo
   * @returns {Object|null} La carta robada o null si el mazo está vacío
   */
  draw() {
    if (this.isEmpty()) {
      logger.warn('Intento de robar de un mazo vacío');
      return null;
    }

    const card = this.cards.pop();
    logger.debug('Carta robada', { cardId: card.id, cardName: card.name });
    return card;
  }

  /**
   * Roba múltiples cartas del mazo
   * @param {number} count - Cantidad de cartas a robar
   * @returns {Array} Array de cartas robadas
   */
  drawMultiple(count) {
    const drawnCards = [];
    
    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card) {
        drawnCards.push(card);
      } else {
        logger.warn(`Solo se pudieron robar ${i} de ${count} cartas solicitadas`);
        break;
      }
    }

    return drawnCards;
  }

  /**
   * Verifica si el mazo está vacío
   * @returns {boolean}
   */
  isEmpty() {
    return this.cards.length === 0;
  }

  /**
   * Rellena el mazo con cartas del descarte
   * @param {Array} discardPile - Pila de descarte
   */
  refillFromDiscard(discardPile) {
    if (discardPile.length === 0) {
      logger.warn('La pila de descarte está vacía, no se puede rellenar el mazo');
      return;
    }

    logger.info('Rellenando mazo desde descarte', { 
      cardsInDiscard: discardPile.length 
    });

    // Agregar todas las cartas del descarte al mazo
    this.cards = [...discardPile];
    
    // Mezclar el nuevo mazo
    this.shuffle();

    logger.success('Mazo rellenado y mezclado', { 
      totalCards: this.cards.length 
    });

    // Limpiar el descarte (se hace en Game.js)
    return true;
  }

  /**
   * Obtiene el número de cartas restantes en el mazo
   * @returns {number}
   */
  getCount() {
    return this.cards.length;
  }

  /**
   * Obtiene el estado del mazo (para enviar al cliente)
   * @returns {Object}
   */
  getState() {
    return {
      count: this.cards.length,
      isEmpty: this.isEmpty()
    };
  }

  /**
   * Resetea el mazo (para nuevas partidas)
   */
  reset() {
    this.initialize();
    logger.info('Mazo reseteado');
  }
}
