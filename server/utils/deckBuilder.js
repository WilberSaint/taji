import { v4 as uuidv4 } from 'uuid';
import { CARD_TYPES, ENERGY_TYPES, DECK_CONFIG as DEFAULT_DECK_CONFIG, EVENT_TYPES } from './constants.js';

/**
 * Construye el mazo completo del juego con todas las cartas
 * @param {object} [deckConfig] Configuración de cantidades por tipo (por defecto,
 *   la del panel de administrador si fue ajustada; si no, DECK_CONFIG estático)
 * @returns {Array} Array de objetos carta
 */
export function buildDeck(deckConfig = DEFAULT_DECK_CONFIG) {
  const deck = [];

  // Construir plantas
  Object.entries(deckConfig.PLANTAS).forEach(([subtype, count]) => {
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
  Object.entries(deckConfig.MANTENIMIENTOS).forEach(([subtype, count]) => {
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
  Object.entries(deckConfig.RIESGOS).forEach(([subtype, count]) => {
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

  //Construir eventos
  Object.entries(deckConfig.EVENTOS).forEach(([subtype, count]) => {
    for(let i = 0; i < count; i++){
      deck.push({
        id: uuidv4(),
        type: CARD_TYPES.EVENTO,
        subtype: subtype,
        name: getCardName(CARD_TYPES.EVENTO, subtype),
        description: getCardDescription(CARD_TYPES.EVENTO, subtype),
        image: `/assets/cards/eventos/${subtype}.png`
      })
    }
  })

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
    [ENERGY_TYPES.GEOTERMICA]: 'Geotérmica',
    [EVENT_TYPES.INTERCAMBIO_TERRENO]: 'Intercambio de Terreno',
    [EVENT_TYPES.INTERCAMBIO_PLANTA]: 'Intercambio de Planta',
  };

  const prefix = type === CARD_TYPES.PLANTA ? 'Planta' : (type === CARD_TYPES.EVENTO ? '' : capitalize(type));
  return `${prefix} ${names[subtype] || capitalize(subtype)}`;
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

  if(type === CARD_TYPES.EVENTO) {
    switch(subtype){
      case 'compra':
        return 'Compra una planta a uno de los otros jugadores';
      case 'intercambio_planta':
        return 'Intercambia una de tus plantas con la de otro jugador';
      case 'esparcimiento':
        return 'Esparce los riesgos de tus plantas a las plantas de otros jugadores';
      case 'descarte':
        return 'Haz que todos descarten sus cartas y vuelve a jugar';
      case 'intercambio_terreno':
        return 'Intercambia todas tus plantas con las de otro jugador';
    }
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
