import { 
  CARD_TYPES, 
  ENERGY_TYPES, 
  GAME_RULES,
  SLOT_STATUS 
} from './constants.js';

/**
 * Valida si una carta puede ser jugada en un slot específico
 */
export function canPlayCard(card, targetPlayer, slotType, currentPlayer) {
  // Validar que sea el turno del jugador
  if (currentPlayer.id !== targetPlayer.id && card.type === CARD_TYPES.PLANTA) {
    return { valid: false, error: 'Solo puedes jugar plantas en tu propio tablero' };
  }

  const slot = targetPlayer.board[slotType];

  // CASO 1: JUGAR PLANTA
  if (card.type === CARD_TYPES.PLANTA) {
    return canPlayPlant(card, slot, slotType);
  }

  // CASO 2: JUGAR MANTENIMIENTO
  if (card.type === CARD_TYPES.MANTENIMIENTO) {
    return canPlayMaintenance(card, slot, slotType);
  }

  // CASO 3: JUGAR RIESGO
  if (card.type === CARD_TYPES.RIESGO) {
    return canPlayRisk(card, slot, slotType);
  }

  return { valid: false, error: 'Tipo de carta no válido' };
}

/**
 * Valida si se puede jugar una planta
 */
function canPlayPlant(card, slot, slotType) {
  // Validar que el slot esté vacío
  if (slot.plant) {
    return { valid: false, error: 'Ya hay una planta en este espacio' };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN && card.subtype !== slotType) {
    return { 
      valid: false, 
      error: `Esta planta solo puede ir en el espacio ${card.subtype}` 
    };
  }

  return { valid: true };
}

/**
 * Valida si se puede jugar un mantenimiento
 */
function canPlayMaintenance(card, slot, slotType) {
  // Validar que haya una planta
  if (!slot.plant) {
    return { valid: false, error: 'No hay planta en este espacio' };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN) {
    // Si la planta es comodín, acepta cualquier mantenimiento
    if (slot.plant.subtype !== ENERGY_TYPES.COMODIN && card.subtype !== slotType) {
      return { 
        valid: false, 
        error: 'El mantenimiento debe ser del mismo tipo que la planta' 
      };
    }
  }

  // Validar que no esté inmunizada (2 mantenimientos)
  const maintenanceCount = slot.modifiers.filter(
    m => m.type === CARD_TYPES.MANTENIMIENTO
  ).length;

  if (maintenanceCount >= 2) {
    return { 
      valid: false, 
      error: 'Esta planta ya está inmunizada (máximo 2 mantenimientos)' 
    };
  }

  return { valid: true };
}

/**
 * Valida si se puede jugar un riesgo
 */
function canPlayRisk(card, slot, slotType) {
  // Validar que haya una planta
  if (!slot.plant) {
    return { valid: false, error: 'No hay planta en este espacio' };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN) {
    // Si la planta es comodín, acepta cualquier riesgo
    if (slot.plant.subtype !== ENERGY_TYPES.COMODIN && card.subtype !== slotType) {
      return { 
        valid: false, 
        error: 'El riesgo debe ser del mismo tipo que la planta' 
      };
    }
  }

  // Validar que no esté inmunizada
  const maintenanceCount = slot.modifiers.filter(
    m => m.type === CARD_TYPES.MANTENIMIENTO
  ).length;

  if (maintenanceCount >= 2) {
    return { 
      valid: false, 
      error: 'Esta planta está inmunizada, no se pueden agregar riesgos' 
    };
  }

  // Validar que no tenga ya 2 riesgos (aunque esto no debería pasar)
  const riskCount = slot.modifiers.filter(
    m => m.type === CARD_TYPES.RIESGO
  ).length;

  if (riskCount >= 2) {
    return { 
      valid: false, 
      error: 'Esta planta ya tiene el máximo de riesgos' 
    };
  }

  return { valid: true };
}

/**
 * Determina el estado de un slot basado en sus modificadores
 */
export function getSlotStatus(slot) {
  if (!slot.plant) {
    return SLOT_STATUS.EMPTY;
  }

  const maintenanceCount = slot.modifiers.filter(
    m => m.type === CARD_TYPES.MANTENIMIENTO
  ).length;

  const riskCount = slot.modifiers.filter(
    m => m.type === CARD_TYPES.RIESGO
  ).length;

  if (maintenanceCount === 2) {
    return SLOT_STATUS.IMMUNIZED;
  }

  if (maintenanceCount === 1 && riskCount === 0) {
    return SLOT_STATUS.PROTECTED;
  }

  if (riskCount === 1) {
    return SLOT_STATUS.AT_RISK;
  }

  return SLOT_STATUS.NORMAL;
}

/**
 * Verifica si un jugador cumple la condición de victoria
 */
export function checkVictoryCondition(player) {
  const slots = Object.values(player.board);
  
  // Debe tener exactamente 4 plantas
  const plantsCount = slots.filter(slot => slot.plant).length;
  if (plantsCount !== GAME_RULES.PLANTS_TO_WIN) {
    return false;
  }

  // Las 4 plantas deben ser de tipos diferentes
  const plantTypes = new Set();
  for (const slot of slots) {
    if (slot.plant) {
      // Los comodines cuentan como el tipo del slot donde están
      const type = slot.plant.subtype === ENERGY_TYPES.COMODIN 
        ? slot.type 
        : slot.plant.subtype;
      plantTypes.add(type);
    }
  }

  if (plantTypes.size !== GAME_RULES.PLANTS_TO_WIN) {
    return false;
  }

  // Ninguna planta puede tener riesgos activos
  for (const slot of slots) {
    if (slot.plant) {
      const hasRisks = slot.modifiers.some(m => m.type === CARD_TYPES.RIESGO);
      if (hasRisks) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Valida si un jugador puede terminar su turno
 */
export function canEndTurn(player, hasPlayedCard, hasDiscarded) {
  // El jugador debe haber realizado una acción (jugar carta o descartar)
  if (!hasPlayedCard && !hasDiscarded) {
    return { 
      valid: false, 
      error: 'Debes jugar 1 carta o descartar cartas antes de terminar tu turno' 
    };
  }

  // El jugador debe tener exactamente 3 cartas (límite)
  if (player.hand.length !== GAME_RULES.HAND_LIMIT) {
    return { 
      valid: false, 
      error: `Debes tener exactamente ${GAME_RULES.HAND_LIMIT} cartas para terminar tu turno` 
    };
  }

  return { valid: true };
}

/**
 * Valida la acción de descarte
 */
export function validateDiscard(cardsToDiscard, playerHand) {
  if (cardsToDiscard.length < GAME_RULES.DISCARD_MIN || 
      cardsToDiscard.length > GAME_RULES.DISCARD_MAX) {
    return { 
      valid: false, 
      error: `Debes descartar entre ${GAME_RULES.DISCARD_MIN} y ${GAME_RULES.DISCARD_MAX} cartas` 
    };
  }

  // Validar que las cartas existan en la mano del jugador
  for (const cardId of cardsToDiscard) {
    if (!playerHand.find(c => c.id === cardId)) {
      return { 
        valid: false, 
        error: 'Una de las cartas a descartar no está en tu mano' 
      };
    }
  }

  return { valid: true };
}
