import { CARD_TYPES, ENERGY_TYPES } from './constants';

/**
 * Cómo va cada quien en la carrera por las cuatro plantas.
 *
 * Se gana con cuatro plantas de tipos distintos y SIN riesgos encima, así que
 * eso es exactamente lo que se cuenta: una planta dañada no suma, igual que
 * no suma para ganar. Si contáramos las plantas a secas, el marcador diría
 * que alguien va 4/4 cuando en realidad no ha ganado, que es peor que no
 * poner marcador.
 */

const ENERGIAS = [
  ENERGY_TYPES.SOLAR,
  ENERGY_TYPES.EOLICA,
  ENERGY_TYPES.HIDROELECTRICA,
  ENERGY_TYPES.GEOTERMICA,
];

/** Plantas construidas y sin riesgos de un jugador. 0 a 4. */
export function plantasSanas(player) {
  if (!player?.board) return 0;
  return ENERGIAS.filter((tipo) => {
    const slot = player.board[tipo];
    if (!slot?.plant) return false;
    return !slot.modifiers?.some((m) => m.type === CARD_TYPES.RIESGO);
  }).length;
}

/**
 * Color del marcador según lo cerca que esté de ganar. La idea es que el ojo
 * encuentre solo a quién hay que atacar, sin leer números.
 */
export function colorProgreso(n) {
  if (n >= 4) return 'var(--danger)';
  if (n === 3) return 'var(--warning)';
  if (n === 2) return 'var(--primary)';
  return 'var(--ink-faint)';
}

export default { plantasSanas, colorProgreso };
