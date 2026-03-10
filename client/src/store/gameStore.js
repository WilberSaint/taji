import { create } from 'zustand';

/**
 * Store principal del juego con Zustand
 */
export const useGameStore = create((set, get) => ({
  // ============ ESTADO DE CONEXIÓN ============
  isConnected: false,
  socketId: null,
  
  setConnected: (connected, socketId = null) => set({ 
    isConnected: connected, 
    socketId 
  }),

  // ============ ESTADO DE USUARIO ============
  playerName: localStorage.getItem('playerName') || '',
  playerAvatar: localStorage.getItem('playerAvatar') || '👤',
  
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
  showRules: false,
  showSettings: false,
  showVictory: false,
  winner: null,
  notification: null,
  isMyTurn: false,
  
  setSelectedCard: (card) => set({ selectedCard: card }),
  
  setTargetSelection: (target) => set({ targetSelection: target }),
  
  toggleCardDetail: (show) => set({ showCardDetail: show }),
  
  toggleRules: (show) => set({ showRules: show }),
  
  toggleSettings: (show) => set({ showSettings: show }),
  
  toggleVictory: (show, winner = null) => set({ showVictory: show, winner }),
  
  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => set({ notification: null }), 3000);
    }
  },
  
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),

  // ============ ACCIONES DE CARTAS ============
  selectedCardsForDiscard: [],
  
  toggleCardForDiscard: (cardId) => set((state) => {
    const selected = state.selectedCardsForDiscard;
    if (selected.includes(cardId)) {
      return { selectedCardsForDiscard: selected.filter(id => id !== cardId) };
    } else if (selected.length < 3) {
      return { selectedCardsForDiscard: [...selected, cardId] };
    }
    return state;
  }),
  
  clearSelectedCardsForDiscard: () => set({ selectedCardsForDiscard: [] }),

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
    showVictory: false,
    notification: null,
    selectedCardsForDiscard: [],
    animatingCard: null,
    isMyTurn: false
  })
}));

export default useGameStore;