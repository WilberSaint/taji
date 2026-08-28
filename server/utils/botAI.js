import { canPlayCard } from './gameValidator.js';
import { CARD_TYPES, ENERGY_TYPES, EVENT_TYPES } from './constants.js';

function getSlotValue(player, slotType) {
  const slot = player.board[slotType];
  if (!slot) return 0;

  const riskCount = slot.modifiers.filter((m) => m.type === CARD_TYPES.RIESGO).length;
  const maintenanceCount = slot.modifiers.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length;

  if (!slot.plant) return 18;
  if (riskCount > 0) return 28 + maintenanceCount * 10;
  if (maintenanceCount > 0) return 20 + maintenanceCount * 6;
  return 12;
}

function scorePlantCard(game, player, card) {
  const results = [];

  Object.keys(player.board).forEach((slotType) => {
    const slot = player.board[slotType];
    if (slot.plant) return;

    const compatible = card.subtype === ENERGY_TYPES.COMODIN || card.subtype === slotType;
    if (!compatible) return;

    const utility = 55 + getSlotValue(player, slotType) + (player.board[slotType].plant ? 0 : 10);
    results.push({
      utility,
      type: 'play',
      cardId: card.id,
      targetPlayerId: player.id,
      movements: [{ destino: { jugador: player.id, slot: slotType } }],
    });
  });

  return results;
}

function scoreMaintenanceCard(game, player, card) {
  const results = [];

  Object.keys(player.board).forEach((slotType) => {
    const slot = player.board[slotType];
    if (!slot.plant) return;

    const riskCount = slot.modifiers.filter((m) => m.type === CARD_TYPES.RIESGO).length;
    if (riskCount === 0) return;

    const compatible = card.subtype === ENERGY_TYPES.COMODIN || slot.plant.subtype === ENERGY_TYPES.COMODIN || card.subtype === slotType;
    if (!compatible) return;

    const utility = 80 + riskCount * 30 + getSlotValue(player, slotType);
    results.push({
      utility,
      type: 'play',
      cardId: card.id,
      targetPlayerId: player.id,
      movements: [{ destino: { jugador: player.id, slot: slotType } }],
    });
  });

  return results;
}

function scoreRiskCard(game, player, card) {
  const results = [];

  game.players.forEach((targetPlayer) => {
    if (targetPlayer.id === player.id) return;

    Object.keys(targetPlayer.board).forEach((slotType) => {
      const slot = targetPlayer.board[slotType];
      if (!slot.plant) return;

      const maintenanceCount = slot.modifiers.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length;
      if (maintenanceCount >= 2) return;

      const compatible = card.subtype === ENERGY_TYPES.COMODIN || slot.plant.subtype === ENERGY_TYPES.COMODIN || card.subtype === slotType;
      if (!compatible) return;

      const utility = 72 + (slot.modifiers.filter((m) => m.type === CARD_TYPES.RIESGO).length * 18) + (slot.plant ? 8 : 0);
      results.push({
        utility,
        type: 'play',
        cardId: card.id,
        targetPlayerId: targetPlayer.id,
        movements: [{ destino: { jugador: targetPlayer.id, slot: slotType } }],
      });
    });
  });

  return results;
}

function scoreEventCard(game, player, card) {
  const results = [];

  if (card.subtype === EVENT_TYPES.COMPRA) {
    game.players.forEach((targetPlayer) => {
      if (targetPlayer.id === player.id) return;
      Object.keys(targetPlayer.board).forEach((slotType) => {
        const slot = targetPlayer.board[slotType];
        if (!slot.plant) return;

        const hasSameType = Object.values(player.board).some((pSlot) => pSlot.plant && pSlot.plant.subtype === slot.plant.subtype);
        if (hasSameType) return;

        results.push({
          utility: 68 + getSlotValue(targetPlayer, slotType),
          type: 'play',
          cardId: card.id,
          targetPlayerId: targetPlayer.id,
          movements: [{ destino: { jugador: targetPlayer.id, slot: slotType } }],
        });
      });
    });
  }

  if (card.subtype === EVENT_TYPES.INTERCAMBIO_PLANTA) {
    game.players.forEach((targetPlayer) => {
      if (targetPlayer.id === player.id) return;
      Object.keys(player.board).forEach((sourceSlot) => {
        const sourceSlotData = player.board[sourceSlot];
        if (!sourceSlotData.plant) return;

        Object.keys(targetPlayer.board).forEach((targetSlot) => {
          const targetSlotData = targetPlayer.board[targetSlot];
          if (!targetSlotData.plant) return;
          if (sourceSlotData.plant.subtype === targetSlotData.plant.subtype) return;

          results.push({
            utility: 46 + getSlotValue(player, sourceSlot) + getSlotValue(targetPlayer, targetSlot),
            type: 'play',
            cardId: card.id,
            targetPlayerId: targetPlayer.id,
            movements: [{ origen: { jugador: player.id, slot: sourceSlot }, destino: { jugador: targetPlayer.id, slot: targetSlot } }],
          });
        });
      });
    });
  }

  if (card.subtype === EVENT_TYPES.DESCARTE) {
    const opponents = game.players.filter((p) => p.id !== player.id && p.hand.length > 0);
    if (opponents.length > 0) {
      results.push({
        utility: 30 + opponents.reduce((sum, p) => sum + p.hand.length, 0),
        type: 'play',
        cardId: card.id,
        targetPlayerId: opponents[0].id,
        movements: [],
      });
    }
  }

  if (card.subtype === EVENT_TYPES.ESPARCIMIENTO) {
    Object.keys(player.board).forEach((sourceSlot) => {
      const sourceSlotData = player.board[sourceSlot];
      if (!sourceSlotData.modifiers.some((m) => m.type === CARD_TYPES.RIESGO)) return;
      game.players.forEach((targetPlayer) => {
        if (targetPlayer.id === player.id) return;
        Object.keys(targetPlayer.board).forEach((targetSlot) => {
          const targetSlotData = targetPlayer.board[targetSlot];
          if (!targetSlotData.plant) return;
          if (sourceSlotData.plant && sourceSlotData.plant.subtype !== targetSlotData.plant.subtype) return;
          results.push({
            utility: 52 + getSlotValue(targetPlayer, targetSlot),
            type: 'play',
            cardId: card.id,
            targetPlayerId: targetPlayer.id,
            movements: [{ origen: { jugador: player.id, slot: sourceSlot }, destino: { jugador: targetPlayer.id, slot: targetSlot } }],
          });
        });
      });
    });
  }

  return results;
}

function chooseDiscard(game, player) {
  const cards = [...player.hand]
    .map((card) => ({
      card,
      score: card.type === CARD_TYPES.RIESGO ? 4 : card.type === CARD_TYPES.EVENTO ? 5 : card.type === CARD_TYPES.MANTENIMIENTO ? 7 : 9,
    }))
    .sort((a, b) => a.score - b.score);

  const discardCount = Math.min(3, Math.max(1, cards.length > 3 ? 1 : 0));
  if (discardCount === 0) return [];

  return cards.slice(0, discardCount).map(({ card }) => card.id);
}

export function selectBotAction(game, botPlayer) {
  const candidates = [];

  botPlayer.hand.forEach((card) => {
    let options = [];

    if (card.type === CARD_TYPES.PLANTA) {
      options = scorePlantCard(game, botPlayer, card);
    }

    if (card.type === CARD_TYPES.MANTENIMIENTO) {
      options = scoreMaintenanceCard(game, botPlayer, card);
    }

    if (card.type === CARD_TYPES.RIESGO) {
      options = scoreRiskCard(game, botPlayer, card);
    }

    if (card.type === CARD_TYPES.EVENTO) {
      options = scoreEventCard(game, botPlayer, card);
    }

    options.forEach((option) => {
      const validation = canPlayCard({ ...card }, botPlayer, option.movements.map((movement) => ({
        origen: movement.origen ? { jugador: game.getPlayer(movement.origen.jugador), slot: movement.origen.slot } : null,
        destino: movement.destino ? { jugador: game.getPlayer(movement.destino.jugador), slot: movement.destino.slot } : null,
      })));

      if (validation.valid) {
        candidates.push({ ...option, cardType: card.type });
      }
    });
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.utility - a.utility);
    return candidates[0];
  }

  const toDiscard = chooseDiscard(game, botPlayer);
  if (toDiscard.length > 0) {
    return { type: 'discard', cardIds: toDiscard };
  }

  return { type: 'end_turn' };
}
