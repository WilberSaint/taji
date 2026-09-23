import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import Toast from './components/UI/Toast';
import LobbyScreen from './components/Lobby/LobbyScreen';
import GameBoard from './components/Game/GameBoard';
import AdminPanel from './admin/AdminPanel';
import { prepararSonido } from './utils/sonido';
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
  const { gameState, isConnected, huboConexion, maintenanceMessage } = useGameStore();
  useSocket(); // Inicializar listeners de Socket.io
  const isAdminRoute = useIsAdminRoute();

  // El navegador no deja sonar nada hasta el primer toque: dejarlo listo
  useEffect(() => { prepararSonido(); }, []);

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

      {/* Indicador de conexión: neutro mientras conecta por primera vez
          (es normal), en alerta solo si se cae una conexión que ya existía */}
      {!isConnected && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg"
          style={{ background: huboConexion ? "var(--danger)" : "var(--ink-soft)" }}
        >
          <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
          <span>{huboConexion ? "Se perdió la conexión..." : "Conectando..."}</span>
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
