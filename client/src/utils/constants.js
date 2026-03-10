// Constantes del juego (sincronizadas con el backend)

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

export const SLOT_STATUS = {
  EMPTY: 'empty',
  NORMAL: 'normal',
  AT_RISK: 'at_risk',
  IMMUNIZED: 'immunized',
  PROTECTED: 'protected'
};

export const GAME_STATUS = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
  PAUSED: 'paused'
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
  
  ERROR: 'error'
};

// Colores de tipo de carta
export const CARD_TYPE_COLORS = {
  [CARD_TYPES.PLANTA]: '#2ecc71',
  [CARD_TYPES.MANTENIMIENTO]: '#3498db',
  [CARD_TYPES.RIESGO]: '#f1c40f'
};

// Colores de energía
export const ENERGY_COLORS = {
  [ENERGY_TYPES.SOLAR]: '#F39C12',
  [ENERGY_TYPES.EOLICA]: '#3498DB',
  [ENERGY_TYPES.HIDROELECTRICA]: '#1ABC9C',
  [ENERGY_TYPES.GEOTERMICA]: '#E67E22',
  [ENERGY_TYPES.COMODIN]: '#9B59B6'
};

// Iconos de energía (emojis)
export const ENERGY_ICONS = {
  [ENERGY_TYPES.SOLAR]: '',
  [ENERGY_TYPES.EOLICA]: '',
  [ENERGY_TYPES.HIDROELECTRICA]: '',
  [ENERGY_TYPES.GEOTERMICA]: '',
  [ENERGY_TYPES.COMODIN]: ''
};

// Nombres en español
export const ENERGY_NAMES = {
  [ENERGY_TYPES.SOLAR]: 'Solar',
  [ENERGY_TYPES.EOLICA]: 'Eólica',
  [ENERGY_TYPES.HIDROELECTRICA]: 'Hidroeléctrica',
  [ENERGY_TYPES.GEOTERMICA]: 'Geotérmica',
  [ENERGY_TYPES.COMODIN]: 'Comodín'
};

// Colores de jugador
export const PLAYER_COLORS = [
  '#F4C430', // Amarillo
  '#4A90E2', // Azul
  '#E74C3C', // Rojo
  '#9B59B6'  // Púrpura
];

// Reglas del juego
export const GAME_RULES = {
  HAND_LIMIT: 3,
  PLANTS_TO_WIN: 4,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  DISCARD_MIN: 1,
  DISCARD_MAX: 3
};

// Configuración de servidor
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://134.209.5.40';
