// Definiciones de todas las cartas del juego
export const CARD_TYPES = {
  PLANTA: 'planta',
  MANTENIMIENTO: 'mantenimiento',
  RIESGO: 'riesgo'
};

export const ENERGY_TYPES = {
  SOLAR: 'solar',
  EOLICA: 'eolica',
  HIDROELECTRICA: 'hidroelectrica',
  GEOTERMICA: 'geotermica',
  COMODIN: 'comodin'
};

export const GAME_STATUS = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
  PAUSED: 'paused'
};

export const PLAYER_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  READY: 'ready',
  NOT_READY: 'not_ready'
};

export const SLOT_STATUS = {
  EMPTY: 'empty',
  NORMAL: 'normal',           // Solo planta
  AT_RISK: 'at_risk',         // Planta + 1 riesgo
  IMMUNIZED: 'immunized',      // Planta + 2 mantenimientos
  PROTECTED: 'protected'       // Planta + 1 mantenimiento
};

// Configuración del mazo
export const DECK_CONFIG = {
  // Cantidad de copias de cada carta
  PLANTAS: {
    solar: 3,
    eolica: 3,
    hidroelectrica: 3,
    geotermica: 3,
    comodin: 2
  },
  MANTENIMIENTOS: {
    solar: 3,
    eolica: 3,
    hidroelectrica: 3,
    geotermica: 3,
    comodin: 2
  },
  RIESGOS: {
    solar: 3,
    eolica: 3,
    hidroelectrica: 3,
    geotermica: 3,
    comodin: 2
  }
};

// Reglas del juego
export const GAME_RULES = {
  INITIAL_HAND_SIZE: 3,
  HAND_LIMIT: 3,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  SLOTS_PER_PLAYER: 4,
  MAX_MODIFIERS_PER_SLOT: 2,
  PLANTS_TO_WIN: 4,
  DISCARD_MIN: 1,
  DISCARD_MAX: 3
};

// Eventos de Socket.io
export const SOCKET_EVENTS = {
  // Lobby
  LOBBY_CREATE_ROOM: 'lobby:create_room',
  LOBBY_JOIN_ROOM: 'lobby:join_room',
  LOBBY_LEAVE_ROOM: 'lobby:leave_room',
  LOBBY_LIST_ROOMS: 'lobby:list_rooms',
  LOBBY_READY: 'lobby:ready',
  LOBBY_START_GAME: 'lobby:start_game',
  LOBBY_RECONNECT: 'lobby:reconnect',
  
  // Game
  GAME_DRAW_CARD: 'game:draw_card',
  GAME_PLAY_CARD: 'game:play_card',
  GAME_DISCARD_CARDS: 'game:discard_cards',
  GAME_END_TURN: 'game:end_turn',
  
  // Server -> Client
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_TURN_CHANGED: 'game:turn_changed',
  GAME_CARD_PLAYED: 'game:card_played',
  GAME_CARDS_DRAWN: 'game:cards_drawn',
  GAME_PLANT_DESTROYED: 'game:plant_destroyed',
  GAME_CARDS_CANCELLED: 'game:cards_cancelled',
  GAME_VICTORY: 'game:victory',
  GAME_ERROR: 'game:error',
  ROOM_UPDATED: 'room:updated',
  ROOM_LIST_UPDATE: 'room:list_update',
  
  // Connection
  PLAYER_CONNECTED: 'player:connected',
  PLAYER_DISCONNECTED: 'player:disconnected',
  PLAYER_RECONNECTED: 'player:reconnected',
  
  // Errors
  ERROR: 'error'
};

// Colores de jugadores (para el frontend)
export const PLAYER_COLORS = [
  '#F4C430', // Amarillo
  '#4A90E2', // Azul
  '#E74C3C', // Rojo
  '#9B59B6'  // Púrpura
];

// Avatares por defecto
export const DEFAULT_AVATARS = ['👤', '🤖', '🎮', '🎯'];