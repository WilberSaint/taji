import { GAME_RULES as DEFAULT_RULES, DECK_CONFIG as DEFAULT_DECK } from '../utils/constants.js';

/**
 * Configuración del juego ajustable en caliente desde el panel de
 * administrador, sin necesidad de redeploy. Vive en memoria: se reinicia si
 * el servidor se reinicia.
 */

const ADJUSTABLE_RULES = [
  'INITIAL_HAND_SIZE',
  'HAND_LIMIT',
  'MIN_PLAYERS',
  'MAX_PLAYERS',
  'PLANTS_TO_WIN',
  'DISCARD_MIN',
  'DISCARD_MAX',
];

const DECK_GROUPS = ['PLANTAS', 'MANTENIMIENTOS', 'RIESGOS', 'EVENTOS'];

let rules = { ...DEFAULT_RULES };
let deckConfig = cloneDeckConfig(DEFAULT_DECK);
let maintenance = { enabled: false, message: '' };

function cloneDeckConfig(config) {
  const clone = {};
  for (const group of DECK_GROUPS) {
    clone[group] = { ...(config[group] || {}) };
  }
  return clone;
}

export function getRules() {
  return rules;
}

export function updateRules(partial = {}) {
  for (const key of ADJUSTABLE_RULES) {
    const value = partial[key];
    if (Number.isFinite(value)) {
      rules[key] = Math.max(1, Math.floor(value));
    }
  }
  return rules;
}

export function resetRules() {
  rules = { ...DEFAULT_RULES };
  return rules;
}

export function getDeckConfig() {
  return deckConfig;
}

export function updateDeckConfig(partial = {}) {
  for (const group of DECK_GROUPS) {
    const groupUpdates = partial[group];
    if (!groupUpdates) continue;
    for (const [subtype, value] of Object.entries(groupUpdates)) {
      if (Number.isFinite(value) && value >= 0 && subtype in deckConfig[group]) {
        deckConfig[group][subtype] = Math.floor(value);
      }
    }
  }
  return deckConfig;
}

export function resetDeckConfig() {
  deckConfig = cloneDeckConfig(DEFAULT_DECK);
  return deckConfig;
}

export function getMaintenance() {
  return maintenance;
}

export function setMaintenance(enabled, message = '') {
  maintenance = { enabled: !!enabled, message: String(message || '').slice(0, 300) };
  return maintenance;
}
