import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import Button from '../UI/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Lock, Globe, LogIn, Plus } from 'lucide-react';

export function LobbyScreen() {
  const { playerName, setPlayerName, currentRoom, publicRooms } = useGameStore();
  const { createRoom, joinRoom, listRooms, leaveRoom, setReady, startGame, reconnect } = useSocket();
  const [view, setView] = useState('home'); // home | create | join | room
  const [roomCode, setRoomCode] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Cargar salas públicas al inicio
  useEffect(() => {
    if (view === 'home') {
      listRooms();
    }
  }, [view, listRooms]);

  // Intentar reconexión automática al cargar
  useEffect(() => {
    const attemptReconnect = async () => {
      const savedRoomCode = localStorage.getItem('tajiRoomCode');
      const savedPlayerName = localStorage.getItem('tajiPlayerName');

      if (savedRoomCode && savedPlayerName && !currentRoom) {
        setReconnecting(true);
        try {
          console.log('🔄 Intentando reconectar a', savedRoomCode, 'como', savedPlayerName);
          await reconnect(savedRoomCode, savedPlayerName);
          console.log('✅ Reconexión exitosa!');
        } catch (error) {
          console.log('❌ No se pudo reconectar:', error.message);
          // Limpiar datos guardados si falla
          localStorage.removeItem('tajiRoomCode');
          localStorage.removeItem('tajiPlayerName');
        }
        setReconnecting(false);
      }
    };

    if (playerName) {
      attemptReconnect();
    }
  }, [playerName, currentRoom, reconnect]);

  // Si estamos en una sala, mostrar waiting room
  useEffect(() => {
    if (currentRoom) {
      setView('room');
    }
  }, [currentRoom]);

  // Pantalla de ingreso de nombre
  if (!playerName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
        >
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold text-green-800 mb-2">🌱 TAJI</h1>
            <p className="text-gray-600">Juego de Energías Renovables</p>
          </div>
          
          <input
            type="text"
            placeholder="Ingresa tu nombre"
            maxLength={20}
            className="w-full p-3 border-2 border-gray-300 rounded-xl mb-4 text-center text-lg focus:border-green-500 focus:outline-none"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                setPlayerName(e.target.value.trim());
              }
            }}
            autoFocus
          />
          
          <Button 
            fullWidth
            onClick={() => {
              const input = document.querySelector('input');
              if (input.value.trim()) {
                setPlayerName(input.value.trim());
              }
            }}
          >
            Continuar
          </Button>
        </motion.div>
      </div>
    );
  }

  // Pantalla de reconexión
  if (reconnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4 animate-bounce">🔄</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reconectando...</h2>
          <p className="text-gray-600">Intentando volver a tu partida</p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Vista principal (home)
  if (view === 'home') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-green-800">🌱 TAJI</h1>
                <p className="text-gray-600">Bienvenido, {playerName}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setPlayerName('');
                  localStorage.removeItem('playerName');
                }}
              >
                Cambiar nombre
              </Button>
            </div>
          </motion.div>

          {/* Botones principales */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setView('create')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <Plus size={48} className="mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Crear Sala</h2>
                <p className="text-green-100">Inicia una nueva partida</p>
              </button>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setView('join')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                <LogIn size={48} className="mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Unirse con Código</h2>
                <p className="text-blue-100">Entra a una sala privada</p>
              </button>
            </motion.div>
          </div>

          {/* Salas públicas */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Globe size={24} className="text-green-600" />
                Salas Públicas
              </h2>
              <button
                onClick={listRooms}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                🔄 Actualizar
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p>No hay salas públicas disponibles</p>
                <p className="text-sm">¡Sé el primero en crear una!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicRooms.map((room) => (
                  <motion.div
                    key={room.code}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{room.code}</div>
                      <div className="text-sm text-gray-600">
                        {room.playersCount}/{room.maxPlayers} jugadores
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await joinRoom(room.code, playerName);
                        } catch (error) {
                          console.error(error);
                        }
                        setLoading(false);
                      }}
                      disabled={loading || room.isFull}
                    >
                      {room.isFull ? 'Llena' : 'Unirse'}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Vista crear sala
  if (view === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Crear Sala</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de sala
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPublic(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isPublic
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Globe className="mx-auto mb-2" />
                <div className="font-semibold">Pública</div>
                <div className="text-xs text-gray-600">Visible para todos</div>
              </button>

              <button
                onClick={() => setIsPublic(false)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  !isPublic
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Lock className="mx-auto mb-2" />
                <div className="font-semibold">Privada</div>
                <div className="text-xs text-gray-600">Solo con código</div>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setView('home')}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={async () => {
                setLoading(true);
                try {
                  const room = await createRoom(playerName, isPublic);
                  console.log('✅ Sala creada:', room);
                  // El useEffect detectará currentRoom y cambiará a vista 'room'
                } catch (error) {
                  console.error('❌ Error al crear sala:', error);
                  alert('Error al crear sala: ' + error.message);
                }
                setLoading(false);
              }}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Sala'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Vista unirse con código
  if (view === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Unirse a Sala</h2>

          <input
            type="text"
            placeholder="TAJI-XXXX"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={9}
            className="w-full p-3 border-2 border-gray-300 rounded-xl mb-4 text-center text-lg font-mono focus:border-blue-500 focus:outline-none"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && roomCode.trim()) {
                document.querySelector('button[type="submit"]').click();
              }
            }}
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setView('home');
                setRoomCode('');
              }}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              type="submit"
              onClick={async () => {
                if (!roomCode.trim()) return;
                setLoading(true);
                try {
                  await joinRoom(roomCode.trim(), playerName);
                } catch (error) {
                  console.error(error);
                  alert(error.message);
                }
                setLoading(false);
              }}
              disabled={loading || !roomCode.trim()}
            >
              {loading ? 'Uniéndose...' : 'Unirse'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Vista sala de espera
  if (view === 'room' && currentRoom) {
    const isHost = currentRoom.hostId === currentRoom.players.find(p => p.name === playerName)?.id;
    const myPlayer = currentRoom.players.find(p => p.name === playerName);
    const canStart = currentRoom.canStart.can;

    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header de sala */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Sala de Espera</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-lg font-mono bg-gray-100 px-4 py-2 rounded-lg">
                    {currentRoom.code}
                  </span>
                  {currentRoom.isPublic ? (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Globe size={16} /> Pública
                    </span>
                  ) : (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Lock size={16} /> Privada
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await leaveRoom();
                  setView('home');
                }}
              >
                Salir
              </Button>
            </div>

            {!canStart && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                {currentRoom.canStart.reason}
              </div>
            )}
          </motion.div>

          {/* Jugadores */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {currentRoom.players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl p-6 shadow-lg ${
                  player.isReady ? 'ring-4 ring-green-400' : ''
                }`}
                style={{ borderLeft: `8px solid ${player.color}` }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{player.avatar}</div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{player.name}</div>
                    <div className="text-sm text-gray-600">
                      {player.id === currentRoom.hostId && '👑 Host'}
                    </div>
                  </div>
                  {player.isReady && (
                    <div className="text-3xl">✅</div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Slots vacíos */}
            {[...Array(currentRoom.maxPlayers - currentRoom.playersCount)].map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-gray-50 rounded-xl p-6 shadow-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
              >
                <div className="text-center text-gray-400">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <div>Esperando jugador...</div>
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex gap-4">
            {myPlayer && (
              <Button
                fullWidth
                variant={myPlayer.isReady ? 'outline' : 'primary'}
                onClick={async () => {
                  await setReady(!myPlayer.isReady);
                }}
              >
                {myPlayer.isReady ? 'No estoy listo' : 'Estoy listo'}
              </Button>
            )}

            {isHost && (
              <Button
                fullWidth
                variant="secondary"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await startGame();
                  } catch (error) {
                    console.error(error);
                    alert(error.message);
                  }
                  setLoading(false);
                }}
                disabled={!canStart || loading}
              >
                {loading ? 'Iniciando...' : '🎮 Iniciar Partida'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default LobbyScreen;