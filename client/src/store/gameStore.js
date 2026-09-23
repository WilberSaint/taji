import { create } from 'zustand';
import { DEFAULT_AVATAR_ID } from '../utils/avatars';

/**
 * Store principal del juego con Zustand
 */
export const useGameStore = create((set, get) => ({
  // ============ ESTADO DE CONEXIÓN ============
  isConnected: false,
  socketId: null,
  // Si alguna vez conectamos, una desconexion posterior si es un problema;
  // el primer intento no lo es y no debe alarmar al jugador.
  huboConexion: false,

  setConnected: (connected, socketId = null) => set((estado) => ({
    isConnected: connected,
    socketId,
    huboConexion: estado.huboConexion || connected,
  })),

  // ============ ESTADO DE USUARIO ============
  playerName: localStorage.getItem('playerName') || '',
  playerAvatar: localStorage.getItem('playerAvatar') || DEFAULT_AVATAR_ID,
  
  setPlayerName: (name) => {
    localStorage.setItem('playerName', name);
    set({ playerName: name });
  },
  
  setPlayerAvatar: (avatar) => {
    localStorage.setItem('playerAvatar', avatar);
    set({ playerAvatar: avatar });
  },

  // ============ ESTADO DEL LOBBY ============
  currentRoom: null,
  publicRooms: [],
  
  setCurrentRoom: (room) => set({ currentRoom: room }),
  
  setPublicRooms: (rooms) => set({ publicRooms: rooms }),
  
  updateRoom: (room) => set({ currentRoom: room }),
  
  clearRoom: () => set({ currentRoom: null }),

  // ============ ESTADO DEL JUEGO ============
  gameState: null,
  
  setGameState: (state) => set({ gameState: state }),
  
  updateGameState: (updates) => set((state) => ({
    gameState: state.gameState ? { ...state.gameState, ...updates } : null
  })),
  
  clearGameState: () => set({ gameState: null }),

  // ============ ESTADO DE UI ============
  selectedCard: null,
  targetSelection: null,
  showCardDetail: false,
  cardForDetail: null,
  showRules: false,
  showSettings: false,
  showVictory: false,
  winner: null,
  notification: null,
  isMyTurn: false,
  maintenanceMessage: null,
  
  setSelectedCard: (card) => set({ selectedCard: card }),
  
  setTargetSelection: (target) => set({ targetSelection: target }),
  
  openCardDetail: (card) => set({ showCardDetail: true, cardForDetail: card }),

  closeCardDetail: () => set({ showCardDetail: false }),
  
  toggleRules: (show) => set({ showRules: show }),
  
  toggleSettings: (show) => set({ showSettings: show }),
  
  toggleVictory: (show, winner = null) => set({ showVictory: show, winner }),
  
  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => set({ notification: null }), 3000);
    }
  },

  // ============ REGISTRO DE JUGADAS ============
  // Lo que acaba de hacer cada quien, en burbujas cortas. A diferencia del
  // Toast (uno a la vez, se pisa), aquí se apilan varias: en un turno pueden
  // pasar dos cosas juntas (ataque + destrucción) y ambas deben verse.
  registroJugadas: [],

  agregarJugada: (texto, tipo) => {
    if (!texto) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((estado) => ({
      // Solo las últimas 4: más que eso tapa el tablero en celular
      registroJugadas: [...estado.registroJugadas, { id, texto, tipo }].slice(-4),
    }));
    setTimeout(() => {
      set((estado) => ({
        registroJugadas: estado.registroJugadas.filter((j) => j.id !== id),
      }));
    }, 5000);
  },

  limpiarRegistroJugadas: () => set({ registroJugadas: [] }),

  // ============ EFECTOS SOBRE LAS CASILLAS ============
  // Qué acaba de pasarle a cada casilla, para animarlo: construir, proteger,
  // dañar, destruir o anular. Se limpian solos y pueden ser varios a la vez
  // (la carta de esparcimiento toca varias plantas de golpe).
  efectos: [],

  marcarEfecto: (playerId, slotType, tipo) => {
    if (!playerId || !slotType || !tipo) return;
    const clave = `${playerId}:${slotType}`;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((estado) => ({ efectos: [...estado.efectos, { clave, tipo, id }] }));
    const duracion = tipo === 'destruir' ? 1200 : 900;
    setTimeout(() => {
      set((estado) => ({ efectos: estado.efectos.filter((e) => e.id !== id) }));
    }, duracion);
  },
  
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),

  setMaintenanceMessage: (maintenanceMessage) => set({ maintenanceMessage }),

  // ============ ACCIONES DE CARTAS ============
  selectedCardsForDiscard: [],
  
  toggleCardForDiscard: (cardId) => set((state) => {
    const selected = state.selectedCardsForDiscard;
    if (selected.includes(cardId)) {
      return { selectedCardsForDiscard: selected.filter(id => id !== cardId) };
    }
    // El máximo lo manda el servidor con el estado de la partida: si el panel
    // de administrador lo sube, el cliente lo respeta sin tocar código.
    const maximo = state.gameState?.rules?.DISCARD_MAX ?? 3;
    if (selected.length < maximo) {
      return { selectedCardsForDiscard: [...selected, cardId] };
    }
    return state;
  }),
  
  clearSelectedCardsForDiscard: () => set({ selectedCardsForDiscard: [] }),

  // ============ ACCIONES ESPECIALES ============
  specialPlay: null,
  setSpecialPlay: (play) => set({ specialPlay: play }),
  clearSpecialPlay: () => set({ specialPlay: null }),


  // ============ ESTADO DE ANIMACIONES ============
  animatingCard: null,
  
  setAnimatingCard: (animation) => set({ animatingCard: animation }),

  // ============ HELPERS ============
  getCurrentPlayer: () => {
    const { gameState, socketId } = get();
    if (!gameState || !socketId) return null;
    return gameState.players.find(p => p.id === socketId);
  },
  
  isCurrentPlayerTurn: () => {
    const { gameState, socketId } = get();
    if (!gameState || !socketId) return false;
    return gameState.currentPlayerId === socketId;
  },
  
  getPlayerById: (playerId) => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players.find(p => p.id === playerId);
  },

  // ============ RESET ============
  reset: () => set({
    currentRoom: null,
    gameState: null,
    selectedCard: null,
    targetSelection: null,
    showCardDetail: false,
    cardForDetail: null,
    showVictory: false,
    notification: null,
    registroJugadas: [],
    selectedCardsForDiscard: [],
    animatingCard: null,
    isMyTurn: false,
    specialPlay: null,
  })
}));

// Solo en desarrollo: permite armar estados de tablero a mano (plantas
// protegidas, inmunes, en riesgo) para revisar el diseño sin depender de
// lo que salga en el mazo. En la compilación de producción no existe.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__taji = useGameStore;
}

export default useGameStore;