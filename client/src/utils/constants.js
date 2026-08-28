// Constantes del juego (sincronizadas con el backend)

export const CARD_TYPES = {
  PLANTA: "planta",
  MANTENIMIENTO: "mantenimiento",
  RIESGO: "riesgo",
  EVENTO: "evento",
};

export const ENERGY_TYPES = {
  SOLAR: "solar",
  EOLICA: "eolica",
  HIDROELECTRICA: "hidroelectrica",
  GEOTERMICA: "geotermica",
  COMODIN: "comodin",
};

export const EVENT_TYPES = {
  COMPRA: 'compra',
  INTERCAMBIO_PLANTA: 'intercambio_planta',
  ESPARCIMIENTO: 'esparcimiento',
  INTERCAMBIO_TERRENO: 'intercambio_terreno',
  DESCARTE: 'descarte',
}

export const SLOT_STATUS = {
  EMPTY: "empty",
  NORMAL: "normal",
  AT_RISK: "at_risk",
  IMMUNIZED: "immunized",
  PROTECTED: "protected",
};

export const GAME_STATUS = {
  LOBBY: "lobby",
  PLAYING: "playing",
  FINISHED: "finished",
  PAUSED: "paused",
};

// Eventos de Socket.io
export const SOCKET_EVENTS = {
  // Lobby
  LOBBY_CREATE_ROOM: "lobby:create_room",
  LOBBY_JOIN_ROOM: "lobby:join_room",
  LOBBY_LEAVE_ROOM: "lobby:leave_room",
  LOBBY_LIST_ROOMS: "lobby:list_rooms",
  LOBBY_READY: "lobby:ready",
  LOBBY_START_GAME: "lobby:start_game",
  LOBBY_RECONNECT: "lobby:reconnect",
  LOBBY_ADD_BOT: "lobby:add_bot",
  LOBBY_REMOVE_BOT: "lobby:remove_bot",
  LOBBY_KICK_PLAYER: "lobby:kick_player",

  // Game
  GAME_DRAW_CARD: "game:draw_card",
  GAME_PLAY_CARD: "game:play_card",
  GAME_DISCARD_CARDS: "game:discard_cards",
  GAME_END_TURN: "game:end_turn",

  // Server -> Client
  YOU_WERE_KICKED: "game:you_were_kicked",
  GAME_STATE_UPDATE: "game:state_update",
  GAME_TURN_CHANGED: "game:turn_changed",
  GAME_CARD_PLAYED: "game:card_played",
  GAME_CARDS_DRAWN: "game:cards_drawn",
  GAME_PLANT_DESTROYED: "game:plant_destroyed",
  GAME_CARDS_CANCELLED: "game:cards_cancelled",
  GAME_PLANT_BOUGHT: "game:plant_bought",
  GAME_PLANTS_SWAPPED: "game:plants_swapped", 
  GAME_TERRAIN_SWAPPED: "game:terrain_swapped", 
  GAME_RISK_SPREAD: "game:risk_spread", 
  GAME_ALL_DISCARDED: "game:all_discarded", 
  GAME_VICTORY: "game:victory",
  GAME_ERROR: "game:error",
  ROOM_UPDATED: "room:updated",
  ROOM_LIST_UPDATE: "room:list_update",

  // Connection
  PLAYER_CONNECTED: "player:connected",
  PLAYER_DISCONNECTED: "player:disconnected",
  PLAYER_RECONNECTED: "player:reconnected",

  ERROR: "error",
};

// Colores de tipo de carta (alineados con el sistema de diseño)
export const CARD_TYPE_COLORS = {
  [CARD_TYPES.PLANTA]: "#3B9668",
  [CARD_TYPES.MANTENIMIENTO]: "#3C79BE",
  [CARD_TYPES.RIESGO]: "#B57F1C",
  [CARD_TYPES.EVENTO]: "#8E6FB8",
};

// Colores de energía (alineados con el sistema de diseño)
export const ENERGY_COLORS = {
  [ENERGY_TYPES.SOLAR]: "#DF9A34",
  [ENERGY_TYPES.EOLICA]: "#4F9FD2",
  [ENERGY_TYPES.HIDROELECTRICA]: "#3A6AAE",
  [ENERGY_TYPES.GEOTERMICA]: "#C55C3C",
  [ENERGY_TYPES.COMODIN]: "#8E6FB8",
};

// Iconos de energía (emojis)
export const ENERGY_ICONS = {
  [ENERGY_TYPES.SOLAR]: "",
  [ENERGY_TYPES.EOLICA]: "",
  [ENERGY_TYPES.HIDROELECTRICA]: "",
  [ENERGY_TYPES.GEOTERMICA]: "",
  [ENERGY_TYPES.COMODIN]: "",
};

// Nombres en español
export const ENERGY_NAMES = {
  [ENERGY_TYPES.SOLAR]: "Solar",
  [ENERGY_TYPES.EOLICA]: "Eólica",
  [ENERGY_TYPES.HIDROELECTRICA]: "Hidroeléctrica",
  [ENERGY_TYPES.GEOTERMICA]: "Geotérmica",
  [ENERGY_TYPES.COMODIN]: "Comodín",
};

// Colores de jugador (alineados con los acentos de energía del sistema de diseño)
export const PLAYER_COLORS = [
  "#DF9A34", // solar
  "#4F9FD2", // eólica
  "#C55C3C", // geotérmica
  "#8E6FB8", // violeta
];

// Reglas del juego
export const GAME_RULES = {
  HAND_LIMIT: 3,
  PLANTS_TO_WIN: 4,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  DISCARD_MIN: 1,
  DISCARD_MAX: 3,
};

// Configuración de servidor
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
