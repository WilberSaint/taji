import { useEffect, useCallback } from 'react';
import socket from '../socket';
import { useGameStore } from '../store/gameStore';
import { SOCKET_EVENTS } from '../utils/constants';

/**
 * Hook personalizado para manejar Socket.io
 */
export function useSocket() {
  const {
    setConnected,
    setCurrentRoom,
    setGameState,
    setPublicRooms,
    setNotification,
    setIsMyTurn,
    setAnimatingCard,
    toggleVictory,
    clearRoom
  } = useGameStore();

  // ============ CONEXIÓN ============
  useEffect(() => {
    // Conectar socket
    if (!socket.connected) {
      socket.connect();
    }

    // Event listeners de conexión
    const handleConnect = () => {
      setConnected(true, socket.id);
      console.log('✅ Socket conectado:', socket.id);
    };

    const handleDisconnect = () => {
      setConnected(false, null);
      console.log('❌ Socket desconectado');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [setConnected]);

  // ============ LOBBY EVENTS ============
  useEffect(() => {
    const handleRoomUpdated = (room) => {
      console.log('🏠 Sala actualizada:', room);
      setCurrentRoom(room);
    };

    const handleRoomListUpdate = (rooms) => {
      console.log('📋 Lista de salas actualizada:', rooms);
      setPublicRooms(rooms);
    };

    socket.on(SOCKET_EVENTS.ROOM_UPDATED, handleRoomUpdated);
    socket.on(SOCKET_EVENTS.ROOM_LIST_UPDATE, handleRoomListUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_UPDATED, handleRoomUpdated);
      socket.off(SOCKET_EVENTS.ROOM_LIST_UPDATE, handleRoomListUpdate);
    };
  }, [setCurrentRoom, setPublicRooms]);

  // ============ GAME EVENTS ============
  useEffect(() => {
    const handleGameStateUpdate = (state) => {
      console.log('🎮 Estado del juego actualizado:', state);
      setGameState(state);
      
      // Actualizar si es mi turno
      const isMyTurn = state.currentPlayerId === socket.id;
      setIsMyTurn(isMyTurn);
    };

    const handleTurnChanged = (data) => {
      console.log('🔄 Cambio de turno:', data);
      setNotification({
        type: 'info',
        message: data.currentPlayerId === socket.id 
          ? '✨ ¡Es tu turno!' 
          : `Turno de ${data.currentPlayerName}`
      });
    };

    const handleCardPlayed = (data) => {
      console.log('🃏 Carta jugada:', data);
      setAnimatingCard({
        type: 'play',
        card: data.card,
        from: data.playerId,
        to: data.target
      });

      setTimeout(() => setAnimatingCard(null), 1000);
    };

    const handleCardsDrawn = (data) => {
      console.log('📥 Cartas robadas:', data);
      if (data.cards && data.cards.length > 0) {
        setNotification({
          type: 'success',
          message: `Robaste ${data.cards.length} carta${data.cards.length > 1 ? 's' : ''}`
        });
      }
    };

    const handlePlantDestroyed = (data) => {
      console.log('💥 Planta destruida:', data);
      setNotification({
        type: 'warning',
        message: '💥 ¡Planta destruida!'
      });
    };

    const handleCardsCancelled = (data) => {
      console.log('⚖️ Anulación mutua:', data);
      setNotification({
        type: 'info',
        message: '⚖️ Anulación mutua'
      });
    };

    const handleVictory = (data) => {
      console.log('🏆 Victoria:', data);
      setGameState(data.finalState);
      toggleVictory(true, data.winner);
      setNotification({
        type: 'success',
        message: `🏆 ${data.winner.name} ha ganado!`
      });
    };

    const handleGameError = (data) => {
      console.error('❌ Error del juego:', data);
      setNotification({
        type: 'error',
        message: data.error || 'Error en el juego'
      });
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
    socket.on(SOCKET_EVENTS.GAME_TURN_CHANGED, handleTurnChanged);
    socket.on(SOCKET_EVENTS.GAME_CARD_PLAYED, handleCardPlayed);
    socket.on(SOCKET_EVENTS.GAME_CARDS_DRAWN, handleCardsDrawn);
    socket.on(SOCKET_EVENTS.GAME_PLANT_DESTROYED, handlePlantDestroyed);
    socket.on(SOCKET_EVENTS.GAME_CARDS_CANCELLED, handleCardsCancelled);
    socket.on(SOCKET_EVENTS.GAME_VICTORY, handleVictory);
    socket.on(SOCKET_EVENTS.GAME_ERROR, handleGameError);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleGameStateUpdate);
      socket.off(SOCKET_EVENTS.GAME_TURN_CHANGED, handleTurnChanged);
      socket.off(SOCKET_EVENTS.GAME_CARD_PLAYED, handleCardPlayed);
      socket.off(SOCKET_EVENTS.GAME_CARDS_DRAWN, handleCardsDrawn);
      socket.off(SOCKET_EVENTS.GAME_PLANT_DESTROYED, handlePlantDestroyed);
      socket.off(SOCKET_EVENTS.GAME_CARDS_CANCELLED, handleCardsCancelled);
      socket.off(SOCKET_EVENTS.GAME_VICTORY, handleVictory);
      socket.off(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    };
  }, [setGameState, setNotification, setIsMyTurn, setAnimatingCard, toggleVictory]);

  // ============ PLAYER EVENTS ============
  useEffect(() => {
    const handlePlayerDisconnected = (data) => {
      console.log('🔌 Jugador desconectado:', data);
      setNotification({
        type: 'warning',
        message: `${data.playerName} se desconectó`
      });
    };

    const handlePlayerReconnected = (data) => {
      console.log('🔄 Jugador reconectado:', data);
      setNotification({
        type: 'success',
        message: `${data.playerName} se reconectó`
      });
    };

    socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
    socket.on(SOCKET_EVENTS.PLAYER_RECONNECTED, handlePlayerReconnected);

    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
      socket.off(SOCKET_EVENTS.PLAYER_RECONNECTED, handlePlayerReconnected);
    };
  }, [setNotification]);

  // ============ ACCIONES ============
  
  /**
   * Crear una sala
   */
  const createRoom = useCallback((playerName, isPublic = true) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, 
        { playerName, isPublic },
        (response) => {
          if (response.success) {
            setCurrentRoom(response.room);
            // Guardar para reconexión
            localStorage.setItem('tajiRoomCode', response.room.code);
            localStorage.setItem('tajiPlayerName', playerName);
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }, []);

  /**
   * Unirse a una sala
   */
  const joinRoom = useCallback((roomCode, playerName) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_JOIN_ROOM,
        { roomCode, playerName },
        (response) => {
          if (response.success) {
            setCurrentRoom(response.room);
            // Guardar para reconexión
            localStorage.setItem('tajiRoomCode', roomCode);
            localStorage.setItem('tajiPlayerName', playerName);
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }, []);

  /**
   * Salir de una sala
   */
  const leaveRoom = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, {}, (response) => {
        if (response.success) {
          clearRoom();
          localStorage.removeItem('tajiRoomCode'); // Limpiar reconexión
          localStorage.removeItem('tajiPlayerName');
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  /**
   * Reconectar a una sala
   */
  const reconnect = useCallback((roomCode, playerName) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_RECONNECT,
        { roomCode, playerName },
        (response) => {
          if (response.success) {
            setCurrentRoom(response.room);
            if (response.gameState) {
              setGameState(response.gameState);
            }
            resolve(response);
          } else {
            // Si falla la reconexión, limpiar localStorage
            localStorage.removeItem('tajiRoomCode');
            localStorage.removeItem('tajiPlayerName');
            reject(new Error(response.error));
          }
        }
      );
    });
  }, []);

  /**
   * Listar salas públicas
   */
  const listRooms = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_LIST_ROOMS, {}, (response) => {
        if (response.success) {
          resolve(response.rooms);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  /**
   * Marcar como listo
   */
  const setReady = useCallback((ready = true) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_READY, { ready }, (response) => {
        if (response.success) {
          resolve(response.room);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  /**
   * Iniciar partida
   */
  const startGame = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_START_GAME, {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  /**
   * Jugar una carta
   */
  const playCard = useCallback(async (cardId, targetPlayerId, slotType) => {
    try {
      // Jugar la carta
      const response = await new Promise((resolve, reject) => {
        socket.emit(SOCKET_EVENTS.GAME_PLAY_CARD,
          { cardId, targetPlayerId, slotType },
          (response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      });

      // Esperar tiempo para animaciones y sincronización
      await new Promise(resolve => setTimeout(resolve, 800));

      // Intentar terminar turno (con retry si falla)
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        const endResult = await new Promise((resolve) => {
          socket.emit(SOCKET_EVENTS.GAME_END_TURN, {}, (endResponse) => {
            resolve(endResponse);
          });
        });

        if (endResult.success) {
          console.log(`✅ Turno terminado automáticamente (intento ${attempts})`);
          break;
        } else {
          console.warn(`⚠️ Intento ${attempts} falló:`, endResult.error);
          
          if (attempts < maxAttempts) {
            // Esperar 1 segundo antes de reintentar
            console.log(`🔄 Reintentando en 0.5 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('❌ No se pudo terminar turno después de', maxAttempts, 'intentos');
          }
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Descartar cartas
   */
  const discardCards = useCallback(async (cardIds) => {
    try {
      // Descartar las cartas
      const response = await new Promise((resolve, reject) => {
        socket.emit(SOCKET_EVENTS.GAME_DISCARD_CARDS,
          { cardIds },
          (response) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      });

      // Esperar tiempo para animaciones y sincronización
      await new Promise(resolve => setTimeout(resolve, 800));

      // Intentar terminar turno (con retry si falla)
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        const endResult = await new Promise((resolve) => {
          socket.emit(SOCKET_EVENTS.GAME_END_TURN, {}, (endResponse) => {
            resolve(endResponse);
          });
        });

        if (endResult.success) {
          console.log(`✅ Turno terminado automáticamente (intento ${attempts})`);
          break;
        } else {
          console.warn(`⚠️ Intento ${attempts} falló:`, endResult.error);
          
          if (attempts < maxAttempts) {
            // Esperar 1 segundo antes de reintentar
            console.log(`🔄 Reintentando en 0.5 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('❌ No se pudo terminar turno después de', maxAttempts, 'intentos');
          }
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Terminar turno
   */
  const endTurn = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.GAME_END_TURN, {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  return {
    socket,
    // Acciones de lobby
    createRoom,
    joinRoom,
    leaveRoom,
    reconnect,
    listRooms,
    setReady,
    startGame,
    // Acciones de juego
    playCard,
    discardCards,
    endTurn
  };
}

export default useSocket;