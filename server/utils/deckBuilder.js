import { v4 as uuidv4 } from 'uuid';
import { CARD_TYPES, ENERGY_TYPES, DECK_CONFIG as DEFAULT_DECK_CONFIG, EVENT_TYPES } from './constants.js';

/* Las cuatro energías. Los comodines y los eventos NO escalan: un comodín de
   más desequilibra, y los eventos son cartas fuertes —más de ellas vuelven la
   partida un caos. */
const ENERGIAS = [
  ENERGY_TYPES.SOLAR,
  ENERGY_TYPES.EOLICA,
  ENERGY_TYPES.HIDROELECTRICA,
  ENERGY_TYPES.GEOTERMICA,
];

/**
 * Ajusta las copias del mazo al número de jugadores.
 *
 * El mazo era fijo: 52 cartas, las mismas para 2 que para 6. Con 14 plantas y
 * 6 jugadores no alcanzan ni para que todos llenen su tablero (harían falta
 * 24), y además todas esas cartas quedan "aparcadas" en los tableros y no
 * vuelven al mazo: el mazo y el descarte se vacían y la partida se atasca.
 *
 * La regla es una sola y se explica en una línea: **al menos una copia de cada
 * energía por jugador**. Con 2 y 3 jugadores no cambia nada respecto al mazo
 * de siempre; de 4 en adelante crece.
 *
 *   jugadores   copias/energía   plantas   mantenim.   riesgos   total
 *       2             3             14        14         14       52
 *       3             3             14        14         14       52
 *       4             4             18        18         18       64
 *       5             5             22        22         22       76
 *       6             6             26        26         26       88
 *
 * (Los comodines suman 2 a cada bloque y los eventos se quedan en 10.)
 */
export function escalarConfigPorJugadores(deckConfig, numJugadores) {
  const jugadores = Number(numJugadores);
  if (!Number.isFinite(jugadores) || jugadores < 2) return deckConfig;

  const escalarBloque = (bloque) => {
    if (!bloque) return bloque;
    const salida = { ...bloque };
    for (const energia of ENERGIAS) {
      if (typeof salida[energia] === 'number') {
        salida[energia] = Math.max(salida[energia], jugadores);
      }
    }
    return salida;
  };

  return {
    ...deckConfig,
    PLANTAS: escalarBloque(deckConfig.PLANTAS),
    MANTENIMIENTOS: escalarBloque(deckConfig.MANTENIMIENTOS),
    RIESGOS: escalarBloque(deckConfig.RIESGOS),
  };
}

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
        image: `/assets/cards/plantas/${subtype}.webp`
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
        image: `/assets/cards/mantenimientos/${subtype}.webp`
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
        image: `/assets/cards/riesgos/${subtype}.webp`
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
        image: `/assets/cards/eventos/${subtype}.webp`
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
