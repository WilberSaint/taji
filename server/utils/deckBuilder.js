import { v4 as uuidv4 } from 'uuid';
import { CARD_TYPES, ENERGY_TYPES, DECK_CONFIG } from './constants.js';

/**
 * Construye el mazo completo del juego con todas las cartas
 * @returns {Array} Array de objetos carta
 */
export function buildDeck() {
  const deck = [];

  // Construir plantas
  Object.entries(DECK_CONFIG.PLANTAS).forEach(([subtype, count]) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: uuidv4(),
        type: CARD_TYPES.PLANTA,
        subtype: subtype,
        name: getCardName(CARD_TYPES.PLANTA, subtype),
        description: getCardDescription(CARD_TYPES.PLANTA, subtype),
        image: `/assets/cards/plantas/${subtype}.png`
      });
    }
  });

  // Construir mantenimientos
  Object.entries(DECK_CONFIG.MANTENIMIENTOS).forEach(([subtype, count]) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: uuidv4(),
        type: CARD_TYPES.MANTENIMIENTO,
        subtype: subtype,
        name: getCardName(CARD_TYPES.MANTENIMIENTO, subtype),
        description: getCardDescription(CARD_TYPES.MANTENIMIENTO, subtype),
        image: `/assets/cards/mantenimientos/${subtype}.png`
      });
    }
  });

  // Construir riesgos
  Object.entries(DECK_CONFIG.RIESGOS).forEach(([subtype, count]) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: uuidv4(),
        type: CARD_TYPES.RIESGO,
        subtype: subtype,
        name: getCardName(CARD_TYPES.RIESGO, subtype),
        description: getCardDescription(CARD_TYPES.RIESGO, subtype),
        image: `/assets/cards/riesgos/${subtype}.png`
      });
    }
  });

  return deck;
}

/**
 * Obtiene el nombre de la carta según su tipo y subtipo
 */
function getCardName(type, subtype) {
  if (subtype === ENERGY_TYPES.COMODIN) {
    return `${capitalize(type)} Comodín`;
  }

  const names = {
    [ENERGY_TYPES.SOLAR]: 'Solar',
    [ENERGY_TYPES.EOLICA]: 'Eólica',
    [ENERGY_TYPES.HIDROELECTRICA]: 'Hidroeléctrica',
    [ENERGY_TYPES.GEOTERMICA]: 'Geotérmica'
  };

  const prefix = type === CARD_TYPES.PLANTA ? 'Planta' : capitalize(type);
  return `${prefix} ${names[subtype] || subtype}`;
}

/**
 * Obtiene la descripción de la carta
 */
function getCardDescription(type, subtype) {
  if (type === CARD_TYPES.PLANTA) {
    return subtype === ENERGY_TYPES.COMODIN
      ? 'Puede colocarse en cualquier espacio vacío'
      : 'Construye tu sistema de energía renovable';
  }

  if (type === CARD_TYPES.MANTENIMIENTO) {
    return subtype === ENERGY_TYPES.COMODIN
      ? 'Protege cualquier planta de tu sistema'
      : 'Protege tu planta contra riesgos';
  }

  if (type === CARD_TYPES.RIESGO) {
    return subtype === ENERGY_TYPES.COMODIN
      ? 'Afecta cualquier planta enemiga'
      : 'Amenaza la estabilidad de plantas enemigas';
  }

  return '';
}

/**
 * Capitaliza la primera letra de un string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Mezcla un array usando Fisher-Yates shuffle
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
