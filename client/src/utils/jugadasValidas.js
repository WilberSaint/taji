import { CARD_TYPES, ENERGY_TYPES } from './constants';

/**
 * Dónde se puede jugar cada carta.
 *
 * Es un ESPEJO de las reglas del servidor (`server/utils/gameValidator.js`),
 * y existe solo para la interfaz: encender la casilla donde sí se puede jugar
 * y avisar cuando una carta no tiene dónde ir. La autoridad sigue siendo el
 * servidor; si las dos se separan alguna vez, manda el servidor y esto se
 * corrige.
 *
 * Vive aparte para que PlayerSlot (qué casilla se enciende) y PlayerHand (qué
 * carta se puede jugar) usen la MISMA regla. Teniéndola duplicada era
 * cuestión de tiempo que una dijera una cosa y la otra la contraria.
 */

/** ¿La energía de la carta encaja con la de la casilla? */
function energiaCompatible(carta, slot, slotType) {
  // El comodín entra en cualquier lado...
  if (carta.subtype === ENERGY_TYPES.COMODIN) return true;
  // ...y sobre una planta comodín entra cualquier carta.
  if (slot?.plant?.subtype === ENERGY_TYPES.COMODIN) return true;
  return carta.subtype === slotType;
}

function cuenta(slot, tipo) {
  return slot?.modifiers?.filter((m) => m.type === tipo).length || 0;
}

/**
 * ¿Se puede jugar esta carta en esta casilla concreta?
 * @param {object} carta
 * @param {object} slot        la casilla (con plant y modifiers)
 * @param {string} slotType    la energía de la casilla
 * @param {boolean} esMia      si la casilla es del propio jugador
 */
export function puedeJugarseEn(carta, slot, slotType, esMia) {
  if (!carta) return false;

  const vacia = !slot?.plant;
  const mantenimientos = cuenta(slot, CARD_TYPES.MANTENIMIENTO);
  const riesgos = cuenta(slot, CARD_TYPES.RIESGO);

  if (carta.type === CARD_TYPES.PLANTA) {
    // En hueco propio y vacío; el comodín vale para cualquier hueco
    return (
      esMia &&
      vacia &&
      (carta.subtype === ENERGY_TYPES.COMODIN || carta.subtype === slotType)
    );
  }

  if (carta.type === CARD_TYPES.MANTENIMIENTO) {
    // Sobre planta propia, del mismo tipo, y que no esté ya inmune
    return (
      esMia &&
      !vacia &&
      energiaCompatible(carta, slot, slotType) &&
      mantenimientos < 2
    );
  }

  if (carta.type === CARD_TYPES.RIESGO) {
    // Sobre planta ajena, del mismo tipo, ni inmune ni con dos riesgos ya
    return (
      !esMia &&
      !vacia &&
      energiaCompatible(carta, slot, slotType) &&
      mantenimientos < 2 &&
      riesgos < 2
    );
  }

  return false;
}

const ENERGIAS = [
  ENERGY_TYPES.SOLAR,
  ENERGY_TYPES.EOLICA,
  ENERGY_TYPES.HIDROELECTRICA,
  ENERGY_TYPES.GEOTERMICA,
];

/**
 * ¿Esta carta tiene ALGÚN sitio donde jugarse ahora mismo?
 *
 * Sirve para marcar en la mano las cartas que no van a ninguna parte: sin
 * esto, el jugador con un mantenimiento solar y ninguna planta solar toca
 * cuatro casillas, no se enciende ninguna y no entiende por qué.
 *
 * Los eventos se dan siempre por jugables: sus condiciones dependen del
 * estado de los demás y las valida el servidor al confirmarlos. Vale más
 * dejarlos disponibles que marcarlos como imposibles por error.
 */
export function tieneDondeJugarse(carta, gameState, socketId) {
  if (!carta || !gameState?.players) return true;
  if (carta.type === CARD_TYPES.EVENTO) return true;

  return gameState.players.some((jugador) => {
    const esMia = jugador.id === socketId;
    return ENERGIAS.some((slotType) =>
      puedeJugarseEn(carta, jugador.board?.[slotType], slotType, esMia),
    );
  });
}

export default { puedeJugarseEn, tieneDondeJugarse };
