import {
  CARD_TYPES,
  ENERGY_TYPES,
  EVENT_TYPES,
  GAME_RULES,
  SLOT_STATUS,
} from "./constants.js";

/**
 * Valida si una carta puede ser jugada en un slot específico
 */
export function canPlayCard(card, currentPlayer, movements) {
  // CASO 1: JUGAR PLANTA
  if (card.type === CARD_TYPES.PLANTA) {
    return canPlayPlant(card, currentPlayer, movements);
  }

  // CASO 2: JUGAR MANTENIMIENTO
  if (card.type === CARD_TYPES.MANTENIMIENTO) {
    return canPlayMaintenance(card, currentPlayer, movements);
  }

  // CASO 3: JUGAR RIESGO
  if (card.type === CARD_TYPES.RIESGO) {
    return canPlayRisk(card, currentPlayer, movements);
  }

  if (card.type === CARD_TYPES.EVENTO) {
    return canPlayEvent(card, currentPlayer, movements);
  }

  return { valid: false, error: "Tipo de carta no válido" };
}

/**
 * Valida si se puede jugar una planta
 */
function canPlayPlant(card, currentPlayer, movements) {
  //Validar que solo sea un movimiento
  if (movements.length > 1) {
    return { valid: false, error: "Solo puedes jugar una planta por turno" };
  }

  const { jugador: targetPlayer, slot: slotType } = movements[0].destino;

  // Validar que sea el turno del jugador
  if (currentPlayer.id !== targetPlayer.id) {
    return {
      valid: false,
      error: "Solo puedes jugar plantas en tu propio tablero",
    };
  }

  const slot = targetPlayer.board[slotType];

  // Validar que el slot esté vacío
  if (slot.plant) {
    return { valid: false, error: "Ya hay una planta en este espacio" };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN && card.subtype !== slotType) {
    return {
      valid: false,
      error: `Esta planta solo puede ir en el espacio ${card.subtype}`,
    };
  }

  return { valid: true };
}

/**
 * Valida si se puede jugar un mantenimiento
 */
function canPlayMaintenance(card, currentPlayer, movements) {
  //Validar que solo sea un movimiento
  if (movements.length > 1) {
    return {
      valid: false,
      error: "Solo puedes jugar un mantenimiento por turno",
    };
  }

  const { jugador: targetPlayer, slot: slotType } = movements[0].destino;
  const slot = targetPlayer.board[slotType];

  // Validar que haya una planta
  if (!slot.plant) {
    return { valid: false, error: "No hay planta en este espacio" };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN) {
    // Si la planta es comodín, acepta cualquier mantenimiento
    if (
      slot.plant.subtype !== ENERGY_TYPES.COMODIN &&
      card.subtype !== slotType
    ) {
      return {
        valid: false,
        error: "El mantenimiento debe ser del mismo tipo que la planta",
      };
    }
  }

  // Validar que no esté inmunizada (2 mantenimientos)
  const maintenanceCount = slot.modifiers.filter(
    (m) => m.type === CARD_TYPES.MANTENIMIENTO,
  ).length;

  if (maintenanceCount >= 2) {
    return {
      valid: false,
      error: "Esta planta ya está inmunizada (máximo 2 mantenimientos)",
    };
  }

  return { valid: true };
}

/**
 * Valida si se puede jugar un riesgo
 */
function canPlayRisk(card, currentPlayer, movements) {
  //Validar que solo haya un movimiento
  if (movements.length > 1) {
    return { valid: false, error: "Solo puedes jugar un riesgo por turno" };
  }

  const { jugador: targetPlayer, slot: slotType } = movements[0].destino;
  const slot = targetPlayer.board[slotType];

  // Validar que haya una planta
  if (!slot.plant) {
    return { valid: false, error: "No hay planta en este espacio" };
  }

  // Validar compatibilidad de tipo (excepto comodín)
  if (card.subtype !== ENERGY_TYPES.COMODIN) {
    // Si la planta es comodín, acepta cualquier riesgo
    if (
      slot.plant.subtype !== ENERGY_TYPES.COMODIN &&
      card.subtype !== slotType
    ) {
      return {
        valid: false,
        error: "El riesgo debe ser del mismo tipo que la planta",
      };
    }
  }

  // Validar que no esté inmunizada
  const maintenanceCount = slot.modifiers.filter(
    (m) => m.type === CARD_TYPES.MANTENIMIENTO,
  ).length;

  if (maintenanceCount >= 2) {
    return {
      valid: false,
      error: "Esta planta está inmunizada, no se pueden agregar riesgos",
    };
  }

  // Validar que no tenga ya 2 riesgos (aunque esto no debería pasar)
  const riskCount = slot.modifiers.filter(
    (m) => m.type === CARD_TYPES.RIESGO,
  ).length;

  if (riskCount >= 2) {
    return {
      valid: false,
      error: "Esta planta ya tiene el máximo de riesgos",
    };
  }

  return { valid: true };
}

function canPlayEvent(card, currentPlayer, movements) {
  if (card.subtype === EVENT_TYPES.COMPRA) {
    return canPlayPurchase(card, currentPlayer, movements);
  }

  if (card.subtype === EVENT_TYPES.INTERCAMBIO_PLANTA) {
    return canPlayExchangePlant(card, currentPlayer, movements);
  }

  if (card.subtype === EVENT_TYPES.ESPARCIMIENTO) {
    return canPlaySpreading(card, currentPlayer, movements);
  }

  if (card.subtype === EVENT_TYPES.INTERCAMBIO_TERRENO) {
    return canPlayExchangeTerrain(card, currentPlayer, movements);
  }

  if (card.subtype === EVENT_TYPES.DESCARTE) {
    return { valid: true }; // No hay validación específica para descartar
  }

  return { valid: false, error: "Tipo de evento no válido" };
}

/**
 * Determina si se puede comprar una planta de otro jugador
 * @param {*} card Carta de evento de compra
 * @param {*} currentPlayer Jugador que intenta robar
 * @param {*} movements Movimientos realizados por el jugador
 * @returns true si puede, false si no
 */
function canPlayPurchase(card, currentPlayer, movements) {
  //Validar que solo sea un movimiento
  if (movements.length > 1) {
    return { valid: false, error: "Solo puedes comprar una planta por turno" };
  }

  const { jugador: targetPlayer, slot: slotType } = movements[0].destino;

  const slot = targetPlayer.board[slotType];
  if (targetPlayer.id === currentPlayer.id) {
    return { valid: false, error: "No puedes comprar tus propias plantas" };
  }

  if (getSlotStatus(slot) === SLOT_STATUS.EMPTY) {
    return {
      valid: false,
      error: "No hay planta en este espacio para comprar",
    };
  }

  if (getSlotStatus(slot) === SLOT_STATUS.IMMUNIZED) {
    return { valid: false, error: "No puedes comprar una planta inmune" };
  }

  //Validar que no tenga ya el tipo
  if (!targetPlayer.hasPlant(slot.type)) {
    return { valid: false, error: "El jugador no tiene esta planta." };
  }

  if (currentPlayer.hasPlant(slot.type)) {
    return { valid: false, error: "Ya tienes una planta de este tipo" };
  }

  return { valid: true };
}

/**
 * Determina si se puede intercambiar de plantas con otro jugador
 * @param {*} card Carta de evento de intercambio
 * @param {*} currentPlayer Jugador que intercambia
 * @param {*} movements Movimientos realizados por el jugador
 */
function canPlayExchangePlant(card, currentPlayer, movements) {
  //Validar que solo sea un movimiento
  if (movements.length > 1) {
    return {
      valid: false,
      error: "Solo puedes intercambiar una planta por turno",
    };
  }

  const currentSlot = currentPlayer.board[movements[0].origen.slot];
  const { jugador: targetPlayer, slot: targetSlotType } =
    movements[0].destino;
  const targetSlot = targetPlayer.board[targetSlotType];

  //Validar el intercambio con otro jugador
  if (targetPlayer.id === currentPlayer.id) {
    return {
      valid: false,
      error: "No puedes intercambiar tus propias plantas",
    };
  }

  //Validar si las plantas existen
  if (
    getSlotStatus(currentSlot) === SLOT_STATUS.EMPTY ||
    getSlotStatus(targetSlot) === SLOT_STATUS.EMPTY
  ) {
    return {
      valid: false,
      error: "No hay planta en este espacio para intercambiar",
    };
  }

  //Validar si una de las plantas es inmune
  if (
    getSlotStatus(currentSlot) === SLOT_STATUS.IMMUNIZED ||
    getSlotStatus(targetSlot) === SLOT_STATUS.IMMUNIZED
  ) {
    return {
      valid: false,
      error: "No puedes intercambiar una planta inmune",
    };
  }

  //Validar que si tengan las plantas que se desean intercambiar
  if (
    !currentPlayer.hasPlant(currentSlot.type) ||
    !targetPlayer.hasPlant(targetSlot.type)
  ) {
    return {
      valid: false,
      error: "Uno de los jugadores no tiene la planta que deseas intercambiar",
    };
  }

  //Validar que no queden con plantas repetidas
  if (!(currentSlot.type === targetSlot.type)) {
    if (
      currentPlayer.hasPlant(targetSlot.type) ||
      targetPlayer.hasPlant(currentSlot.type)
    ) {
      return {
        valid: false,
        error: "No pueden quedar jugadores con dos plantas del mismo tipo",
      };
    }
  }

  return {valid: true};
}

function canPlaySpreading(card, currentPlayer, movements) {
  for (const movement of movements) {
    const currentSlotType = movement.origen.slot;
    const { jugador: targetPlayer, slot: slotType } = movement.destino;
    const currentSlot = currentPlayer.board[currentSlotType];
    const targetSlot = targetPlayer.board[slotType];

    //Validar que el slot de origen tenga planta
    if (getSlotStatus(currentSlot) === SLOT_STATUS.EMPTY) {
      return {
        valid: false,
        error: "No hay planta en el espacio de origen para esparcir",
      };
    }

    //Validar que el slot de destino tenga planta
    if (getSlotStatus(targetSlot) === SLOT_STATUS.EMPTY) {
      return {
        valid: false,
        error: "El espacio de destino ya tiene una planta",
      };
    }

    //Validar que el slot de destino es del mismo tipo que el de origen
    if (currentSlot.type !== targetSlot.type) {
      return {
        valid: false,
        error: "La planta de destino debe ser del mismo tipo que el de origen",
      };
    }

    //Validar que el slot de destino no esté inmunizado
    if (getSlotStatus(targetSlot) === SLOT_STATUS.IMMUNIZED) {
      return {
        valid: false,
        error: "No puedes esparcir a un espacio inmunizado",
      };
    }
  }

  return { valid: true };
}

function canPlayExchangeTerrain(card, currentPlayer, movements) {
  //Validar que solo sea un movimiento
  if (movements.length > 1) {
    return {
      valid: false,
      error: "Solo puedes intercambiar un terreno por turno",
    };
  }

  const { jugador: targetPlayer, slotRef: slotType } = movements[0].destino;

  //Validar el intercambio
  if (currentPlayer === targetPlayer) {
    return {
      valid: false,
      error: "No puedes intercambiar tu propio terreno",
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
    (m) => m.type === CARD_TYPES.MANTENIMIENTO,
  ).length;

  const riskCount = slot.modifiers.filter(
    (m) => m.type === CARD_TYPES.RIESGO,
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
  const plantsCount = slots.filter((slot) => slot.plant).length;
  if (plantsCount !== GAME_RULES.PLANTS_TO_WIN) {
    return false;
  }

  // Las 4 plantas deben ser de tipos diferentes
  const plantTypes = new Set();
  for (const slot of slots) {
    if (slot.plant) {
      // Los comodines cuentan como el tipo del slot donde están
      const type =
        slot.plant.subtype === ENERGY_TYPES.COMODIN
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
      const hasRisks = slot.modifiers.some((m) => m.type === CARD_TYPES.RIESGO);
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
      error:
        "Debes jugar 1 carta o descartar cartas antes de terminar tu turno",
    };
  }

  // El jugador debe tener exactamente 3 cartas (límite)
  if (player.hand.length !== GAME_RULES.HAND_LIMIT) {
    return {
      valid: false,
      error: `Debes tener exactamente ${GAME_RULES.HAND_LIMIT} cartas para terminar tu turno`,
    };
  }

  return { valid: true };
}

/**
 * Valida la acción de descarte
 */
export function validateDiscard(cardsToDiscard, playerHand) {
  if (
    cardsToDiscard.length < GAME_RULES.DISCARD_MIN ||
    cardsToDiscard.length > GAME_RULES.DISCARD_MAX
  ) {
    return {
      valid: false,
      error: `Debes descartar entre ${GAME_RULES.DISCARD_MIN} y ${GAME_RULES.DISCARD_MAX} cartas`,
    };
  }

  // Validar que las cartas existan en la mano del jugador
  for (const cardId of cardsToDiscard) {
    if (!playerHand.find((c) => c.id === cardId)) {
      return {
        valid: false,
        error: "Una de las cartas a descartar no está en tu mano",
      };
    }
  }

  return { valid: true };
}
