import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import Toast from './components/UI/Toast';
import LobbyScreen from './components/Lobby/LobbyScreen';
import GameBoard from './components/Game/GameBoard';
import AdminPanel from './admin/AdminPanel';
import { AlertTriangle } from 'lucide-react';

function useIsAdminRoute() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith('#/admin'));

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash.startsWith('#/admin'));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return isAdmin;
}

/**
 * Componente principal de la aplicación
 */
function App() {
  const { gameState, isConnected, maintenanceMessage } = useGameStore();
  useSocket(); // Inicializar listeners de Socket.io
  const isAdminRoute = useIsAdminRoute();

  if (isAdminRoute) {
    return <AdminPanel />;
  }

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
      {/* Aviso de mantenimiento (del panel de administrador) */}
      {maintenanceMessage && (
        <div
          className="fixed inset-x-0 top-0 z-[999] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-white"
          style={{ background: 'var(--warning)' }}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>{maintenanceMessage}</span>
        </div>
      )}

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
