import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import Toast from './components/UI/Toast';
import LobbyScreen from './components/Lobby/LobbyScreen';
import GameBoard from './components/Game/GameBoard';

/**
 * Componente principal de la aplicación
 */
function App() {
  const { gameState, isConnected } = useGameStore();
  useSocket(); // Inicializar listeners de Socket.io

  // Determinar qué pantalla mostrar
  const renderScreen = () => {
    // Si no hay estado de juego, mostrar lobby
    if (!gameState) {
      return <LobbyScreen />;
    }

    // Si hay estado de juego, mostrar tablero
    return <GameBoard />;
  };

  return (
    <div className="min-h-screen">
      {/* Indicador de conexión */}
      {!isConnected && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold">Conectando...</span>
        </div>
      )}

      {/* Notificaciones Toast */}
      <Toast />

      {/* Pantalla principal */}
      {renderScreen()}
    </div>
  );
}

export default App;
