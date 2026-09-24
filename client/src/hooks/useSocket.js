import { useEffect, useCallback } from 'react';
import socket from '../socket';
import { useGameStore } from '../store/gameStore';
import { SOCKET_EVENTS, CARD_TYPES } from '../utils/constants';
import { describirJugada, TIPO_JUGADA } from '../utils/mensajesJugada';
import { reproducirSonido } from '../utils/sonido';
import { registrarPartida } from '../utils/estadisticas';

/**
 * Varios componentes llaman a useSocket() a la vez (App, GameBoard, PlayerHand
 * y cada PlayerSlot). Si cada uno enganchara los escuchas de la partida, el
 * mismo evento se procesaría tantas veces como componentes haya: se veía como
 * avisos repetidos en el registro de jugadas.
 *
 * Por eso se enganchan UNA sola vez y para toda la vida de la aplicación. El
 * socket y el store también son únicos, así que no hay nada que desenganchar;
 * llevar la cuenta de cuántos componentes los usan resultó frágil con el doble
 * montaje que hace React en desarrollo.
 */
let eventosDePartidaEnganchados = false;

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
    clearRoom,
    setMaintenanceMessage
    // Las demás acciones (setIsMyTurn, setAnimatingCard, toggleVictory,
    // agregarJugada) se leen con getState() dentro del efecto de eventos de
    // partida, que se registra una sola vez.
  } = useGameStore();

  const listRooms = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_LIST_ROOMS, {}, (response) => {
        if (response.success) {
          setPublicRooms(response.rooms);
          resolve(response.rooms);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, [setPublicRooms]);

  /**
   * Re-asocia este socket con su sala/partida tras una reconexión.
   * Necesario en móvil: al bloquear la pantalla o cambiar de app el socket se
   * cae y vuelve con un id nuevo; el servidor ya no sabe qué jugador es este.
   */
  const rejoinFromStorage = useCallback(() => {
    const roomCode = localStorage.getItem('tajiRoomCode');
    const playerName = localStorage.getItem('tajiPlayerName');
    if (!roomCode || !playerName) return;

    socket.emit(SOCKET_EVENTS.LOBBY_RECONNECT, { roomCode, playerName }, (response) => {
      if (response?.success) {
        setCurrentRoom(response.room);
        if (response.gameState) setGameState(response.gameState);
      } else {
        localStorage.removeItem('tajiRoomCode');
        localStorage.removeItem('tajiPlayerName');
      }
    });
  }, [setCurrentRoom, setGameState]);

  // ============ CONEXIÓN ============
  useEffect(() => {
    // Conectar socket
    if (!socket.connected) {
      socket.connect();
    }

    let hasConnectedBefore = false;

    const handleConnect = () => {
      setConnected(true, socket.id);
      listRooms().catch(() => {});

      // En reconexiones (no en la primera conexión) hay que volver a entrar
      // a la sala: el socket.id cambió y el servidor perdió la asociación.
      if (hasConnectedBefore) {
        rejoinFromStorage();
      }
      hasConnectedBefore = true;
    };

    const handleDisconnect = () => {
      setConnected(false, null);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Si ya estaba conectado al montar (p. ej. re-render), sincroniza el estado
    // sin disparar una reconexión.
    if (socket.connected) {
      setConnected(true, socket.id);
      hasConnectedBefore = true;
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [setConnected, listRooms, rejoinFromStorage]);

  // ============ AVISOS DE ADMINISTRADOR ============
  useEffect(() => {
    const handleAnnouncement = (state) => {
      setMaintenanceMessage(state?.enabled ? (state.message || 'El servidor entrará en mantenimiento pronto.') : null);
    };
    socket.on('admin:announcement', handleAnnouncement);
    return () => socket.off('admin:announcement', handleAnnouncement);
  }, [setMaintenanceMessage]);

  // ============ LOBBY EVENTS ============
  useEffect(() => {
    const handleRoomUpdated = (room) => {
      console.log('🏠 Sala actualizada:', room);

      if (!room || !room.players?.some((player) => player.id === socket.id)) {
        setCurrentRoom(null);
        return;
      }

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
    if (eventosDePartidaEnganchados) return;
    eventosDePartidaEnganchados = true;

    // Los manejadores leen del store con getState(), no de este render:
    // así no dependen de qué componente fue el primero en montarse.
    const { setGameState, setIsMyTurn, setNotification, setAnimatingCard,
            toggleVictory, agregarJugada, marcarEfecto } = useGameStore.getState();

    const handleGameStateUpdate = (state) => {
      setGameState(state);
      
      // Actualizar si es mi turno
      const isMyTurn = state.currentPlayerId === socket.id;
      setIsMyTurn(isMyTurn);
    };

    const handleTurnChanged = (data) => {
      const esMiTurno = data.currentPlayerId === socket.id;
      if (!esMiTurno) return;
      // Sin aviso emergente: el indicador de turno ya está siempre visible
      // arriba, y con varios rivales el aviso tapaba sus renglones.
      reproducirSonido('turno');
    };

    const SONIDO_POR_TIPO = {
      [TIPO_JUGADA.CONSTRUCCION]: 'construir',
      [TIPO_JUGADA.DEFENSA]: 'proteger',
      [TIPO_JUGADA.ATAQUE]: 'atacar',
      [TIPO_JUGADA.DESTRUCCION]: 'destruir',
      [TIPO_JUGADA.EVENTO]: 'evento',
    };

    const handleCardPlayed = (data) => {
      setAnimatingCard({
        type: 'play',
        card: data.card,
        from: data.playerId,
        to: data.target
      });

      // Contar qué pasó: sin esto el tablero cambia solo y no se entiende
      const estado = useGameStore.getState();
      const jugada = describirJugada(data, estado.gameState?.players || [], estado.socketId);
      if (jugada) {
        agregarJugada(jugada.texto, jugada.tipo);
        reproducirSonido(SONIDO_POR_TIPO[jugada.tipo]);
      }

      // Animación sobre la casilla afectada. Todo sale del mismo evento,
      // así no hay riesgo de que un efecto se dispare dos veces.
      const destino = data.target;
      if (destino?.playerId && destino?.slotType) {
        let tipoEfecto = null;
        if (data.card.type === CARD_TYPES.PLANTA) tipoEfecto = 'construir';
        // `cancelled` es la anulación mutua del servidor, pero significa dos
        // cosas distintas según quién la provocó, y cada una merece su
        // animación (antes las dos salían como 'anular', que no contaba nada):
        //   mantenimiento sobre planta dañada  → la REPARAN
        //   riesgo sobre planta protegida      → el escudo lo BLOQUEA
        else if (data.card.type === CARD_TYPES.MANTENIMIENTO) {
          tipoEfecto = data.effect?.cancelled ? 'reparar' : 'proteger';
        } else if (data.card.type === CARD_TYPES.RIESGO) {
          tipoEfecto = data.effect?.destroyed ? 'destruir'
            : data.effect?.cancelled ? 'bloquear' : 'dañar';
        }
        if (tipoEfecto) marcarEfecto(destino.playerId, destino.slotType, tipoEfecto);
      }

      setTimeout(() => setAnimatingCard(null), 1000);
    };

    const handleVictory = (data) => {
      setGameState(data.finalState);
      // `data.winner` puede venir vacío: si se acaban las cartas y hay empate
      // arriba, la partida termina sin ganador.
      toggleVictory(true, data.winner, {
        porAgotamiento: data.porAgotamiento,
        empate: data.empate,
        empatados: data.empatados,
      });
      setNotification({
        type: data.empate ? 'info' : 'success',
        message: data.empate
          ? 'Se acabaron las cartas: la partida queda en empate'
          : `¡${data.winner?.name ?? 'Alguien'} ganó la partida!`,
      });
      reproducirSonido('victoria');

      /* Se apunta el resultado en el propio dispositivo. Va aquí y no en el
         modal de victoria porque este escucha se engancha UNA sola vez en la
         vida de la app (ver la bandera de más arriba), así que la partida se
         cuenta exactamente una vez. Si se contara al pintar el modal, cada
         re-render podría sumar de más. */
      /* Un empate no cuenta como derrota: no se apunta. Contarlo como
         perdida castigaría a quien iba ganando en plantas. */
      if (!data.empate) {
        registrarPartida(data.winner?.id === socket.id);
      }
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
    socket.on(SOCKET_EVENTS.GAME_VICTORY, handleVictory);
    socket.on(SOCKET_EVENTS.GAME_ERROR, handleGameError);
    
  }, []);

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

    const handleYouWereKicked = (data) => {
      console.log('😹🫵 Has sido expulsado:', data);
      setNotification({
        type: 'error',
        message: data.reason || 'Has sido expulsado de la sala'
      });

      setCurrentRoom(null);
      clearRoom();
      localStorage.removeItem('tajiRoomCode');
      localStorage.removeItem('tajiPlayerName');

      listRooms().catch((error) => {
        console.error('Error al recargar salas públicas tras expulsión:', error);
      });
    };
    socket.on(SOCKET_EVENTS.YOU_WERE_KICKED, handleYouWereKicked);

    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
      socket.off(SOCKET_EVENTS.PLAYER_RECONNECTED, handlePlayerReconnected);
      socket.off(SOCKET_EVENTS.YOU_WERE_KICKED, handleYouWereKicked);
    };
  }, [setNotification, clearRoom]);

  // ============ ACCIONES ============
  
  /**
   * Crear una sala
   */
  const createRoom = useCallback((playerName, isPublic = true, avatar = null) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM,
        { playerName, isPublic, avatar },
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
  const joinRoom = useCallback((roomCode, playerName, avatar = null) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_JOIN_ROOM,
        { roomCode, playerName, avatar },
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

  const addBot = useCallback(() => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_ADD_BOT, {}, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const removeBot = useCallback((botId) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_REMOVE_BOT, { botId }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const kickPlayer = useCallback((playerId) => {
    return new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.LOBBY_KICK_PLAYER, { playerId }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  /**
   * Termina el turno reintentando si el servidor aún no está listo
   */
  const endTurnWithRetry = useCallback(async (maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const endResult = await new Promise((resolve) => {
        socket.emit(SOCKET_EVENTS.GAME_END_TURN, {}, resolve);
      });

      if (endResult?.success) return true;

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.error('No se pudo terminar el turno automáticamente');
    return false;
  }, []);

  /**
   * Jugar una carta y terminar el turno automáticamente
   */
  const playCard = useCallback(async (cardId, targetPlayerId, movements) => {
    const respuesta = await new Promise((resolve) => {
      socket.emit(SOCKET_EVENTS.GAME_PLAY_CARD,
        { cardId, targetPlayerId, movements },
        (res) => resolve(res)
      );
    });

    // Antes esto rechazaba la promesa y nadie la atrapaba: la jugada inválida
    // se perdía en silencio y el jugador no sabía por qué no pasaba nada.
    if (!respuesta?.success) {
      useGameStore.getState().setNotification({
        type: 'error',
        message: respuesta?.error || 'No se puede jugar esa carta ahí',
      });
      return { success: false, error: respuesta?.error };
    }
    const response = respuesta;

    // Esperar a que se propaguen las animaciones y el estado
    await new Promise((resolve) => setTimeout(resolve, 800));
    await endTurnWithRetry();

    return response;
  }, [endTurnWithRetry]);

  /**
   * Descartar cartas y terminar el turno automáticamente
   */
  const discardCards = useCallback(async (cardIds) => {
    const response = await new Promise((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.GAME_DISCARD_CARDS,
        { cardIds },
        (res) => {
          if (res.success) resolve(res);
          else reject(new Error(res.error));
        }
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 800));
    await endTurnWithRetry();

    return response;
  }, [endTurnWithRetry]);

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
    addBot,
    removeBot,
    kickPlayer,
    // Acciones de juego
    playCard,
    discardCards,
    endTurn
  };
}

export default useSocket;