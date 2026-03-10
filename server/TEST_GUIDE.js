// TEST_GUIDE.js
// Guía de testing manual para el servidor TAJI

/**
 * PASO 1: Instalar e iniciar el servidor
 * 
 * Terminal:
 * $ npm install
 * $ npm run dev
 * 
 * Deberías ver:
 * ╔════════════════════════════════════════╗
 * ║     🌱 TAJI SERVER RUNNING 🌱          ║
 * ╚════════════════════════════════════════╝
 */

/**
 * PASO 2: Verificar el servidor con curl
 */

// Health check
// $ curl http://localhost:3001/health
// Respuesta: {"status":"ok","message":"TAJI Server is running","timestamp":"..."}

// Ver estadísticas
// $ curl http://localhost:3001/stats
// Respuesta: {"rooms":{...},"games":{...},"timestamp":"..."}

// Listar salas públicas
// $ curl http://localhost:3001/rooms
// Respuesta: {"rooms":[]}

/**
 * PASO 3: Testing con Socket.io desde el navegador
 * 
 * Abre la consola del navegador (F12) en cualquier página y ejecuta:
 */

// Instalar Socket.io client en consola (para testing rápido)
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
document.head.appendChild(script);

// Esperar a que cargue, luego:
const socket = io('http://localhost:3001');

// Verificar conexión
socket.on('connect', () => {
  console.log('✅ Conectado:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado');
});

// Test de ping
socket.emit('ping', (response) => {
  console.log('🏓 Pong:', response);
});

/**
 * PASO 4: Testing de Lobby
 */

// CREAR SALA
socket.emit('lobby:create_room', {
  playerName: 'Jugador Prueba',
  isPublic: true
}, (response) => {
  console.log('🏠 Sala creada:', response);
  window.roomCode = response.room.code; // Guardar para usar después
});

// LISTAR SALAS PÚBLICAS
socket.emit('lobby:list_rooms', {}, (response) => {
  console.log('📋 Salas públicas:', response.rooms);
});

// UNIRSE A SALA (en otra pestaña/navegador)
socket.emit('lobby:join_room', {
  roomCode: 'TAJI-XXXX', // Usar el código de la sala creada
  playerName: 'Jugador 2'
}, (response) => {
  console.log('👋 Unido a sala:', response);
});

// MARCAR COMO LISTO
socket.emit('lobby:ready', {
  ready: true
}, (response) => {
  console.log('✅ Listo:', response);
});

// SALIR DE SALA
socket.emit('lobby:leave_room', {}, (response) => {
  console.log('👋 Saliste de la sala:', response);
});

/**
 * PASO 5: Testing de Partida
 * (Requiere al menos 2 jugadores listos)
 */

// INICIAR PARTIDA (solo el host)
socket.emit('lobby:start_game', {}, (response) => {
  console.log('🎮 Partida iniciada:', response);
});

// Escuchar actualización del estado
socket.on('game:state_update', (state) => {
  console.log('🔄 Estado actualizado:', state);
  window.gameState = state; // Guardar para inspeccionar
});

// Escuchar cambio de turno
socket.on('game:turn_changed', (data) => {
  console.log('🔃 Turno de:', data.currentPlayerName);
});

// JUGAR CARTA
// Primero obtén el ID de una carta de tu mano:
// console.log(window.gameState.players[0].hand);

socket.emit('game:play_card', {
  cardId: 'card-uuid-aqui',
  targetPlayerId: 'tu-socket-id',
  slotType: 'solar' // o 'eolica', 'hidroelectrica', 'geotermica'
}, (response) => {
  console.log('🃏 Carta jugada:', response);
});

// DESCARTAR CARTAS
socket.emit('game:discard_cards', {
  cardIds: ['card-uuid-1', 'card-uuid-2']
}, (response) => {
  console.log('🗑️ Cartas descartadas:', response);
});

// TERMINAR TURNO
socket.emit('game:end_turn', {}, (response) => {
  console.log('✋ Turno terminado:', response);
  if (response.victory) {
    console.log('🎉 ¡VICTORIA!', response.winner.name);
  }
});

/**
 * PASO 6: Escuchar eventos del servidor
 */

// Sala actualizada
socket.on('room:updated', (room) => {
  console.log('🏠 Sala actualizada:', room);
});

// Lista de salas actualizada
socket.on('room:list_update', (rooms) => {
  console.log('📋 Lista actualizada:', rooms);
});

// Carta jugada (para animaciones)
socket.on('game:card_played', (data) => {
  console.log('🎴 Carta jugada por', data.playerId, ':', data.card.name);
});

// Cartas robadas
socket.on('game:cards_drawn', (data) => {
  console.log('📥 Robaste:', data.cards);
});

// Planta destruida
socket.on('game:plant_destroyed', (data) => {
  console.log('💥 Planta destruida:', data);
});

// Anulación mutua
socket.on('game:cards_cancelled', (data) => {
  console.log('⚖️ Anulación mutua:', data);
});

// Victoria
socket.on('game:victory', (data) => {
  console.log('🏆 GANADOR:', data.winner.name);
});

// Jugador desconectado
socket.on('player:disconnected', (data) => {
  console.log('🔌 Desconectado:', data.playerName);
});

/**
 * PASO 7: Testing de casos especiales
 */

// Intentar jugar carta cuando no es tu turno
socket.emit('game:play_card', {
  cardId: 'cualquier-id',
  targetPlayerId: 'cualquier-id',
  slotType: 'solar'
}, (response) => {
  console.log('❌ Error esperado:', response.error);
  // Debería responder: "No es tu turno"
});

// Intentar terminar turno sin jugar
socket.emit('game:end_turn', {}, (response) => {
  console.log('❌ Error esperado:', response.error);
  // Debería responder: "Debes jugar 1 carta o descartar..."
});

// Intentar unirse a sala llena
socket.emit('lobby:join_room', {
  roomCode: 'TAJI-XXXX',
  playerName: 'Jugador 5' // Si la sala ya tiene 4 jugadores
}, (response) => {
  console.log('❌ Error esperado:', response.error);
  // Debería responder: "La sala está llena"
});

/**
 * PASO 8: Helper functions para testing
 */

// Función para simular una partida completa
async function simularPartida() {
  console.log('🎮 Iniciando simulación de partida...');
  
  // Crear sala
  socket.emit('lobby:create_room', {
    playerName: 'Bot 1',
    isPublic: false
  }, async (response) => {
    if (!response.success) {
      console.error('Error al crear sala');
      return;
    }
    
    console.log('✅ Sala creada:', response.room.code);
    
    // Aquí necesitarías conectar más clientes para probar
    // la partida completa
  });
}

// Función para inspeccionar estado del juego
function verEstado() {
  if (!window.gameState) {
    console.log('⚠️ No hay partida activa');
    return;
  }
  
  const state = window.gameState;
  
  console.log('═══════════════════════════════════');
  console.log('📊 ESTADO DE LA PARTIDA');
  console.log('═══════════════════════════════════');
  console.log('Sala:', state.id);
  console.log('Turno #:', state.turnCount);
  console.log('Jugador actual:', state.currentPlayerId);
  console.log('Cartas en mazo:', state.deck.count);
  console.log('Cartas en descarte:', state.discardPile.count);
  console.log('');
  
  state.players.forEach((player, index) => {
    console.log(`Jugador ${index + 1}: ${player.name}`);
    console.log('  Cartas en mano:', player.handCount);
    console.log('  Tablero:');
    Object.entries(player.board).forEach(([type, slot]) => {
      if (slot.plant) {
        console.log(`    ${type}: ✅ ${slot.plant.name}`);
        if (slot.modifiers.length > 0) {
          console.log(`      Modificadores: ${slot.modifiers.length}`);
        }
      } else {
        console.log(`    ${type}: ⬜ Vacío`);
      }
    });
    console.log('');
  });
  
  console.log('═══════════════════════════════════');
}

// Función para ver tus cartas
function verMano() {
  if (!window.gameState) {
    console.log('⚠️ No hay partida activa');
    return;
  }
  
  const myPlayer = window.gameState.players.find(p => p.id === socket.id);
  if (!myPlayer) {
    console.log('⚠️ No se encontró tu jugador');
    return;
  }
  
  console.log('🃏 TUS CARTAS:');
  console.log('═══════════════════════════════════');
  myPlayer.hand.forEach((card, index) => {
    console.log(`${index + 1}. ${card.name} (${card.type} - ${card.subtype})`);
    console.log(`   ID: ${card.id}`);
  });
  console.log('═══════════════════════════════════');
}

/**
 * PASO 9: Comandos rápidos
 * 
 * Puedes copiar y pegar estos comandos en la consola para testing rápido:
 */

// Ver estado completo
window.ver = verEstado;

// Ver tus cartas
window.mano = verMano;

// Desconectar
window.salir = () => socket.disconnect();

// Reconectar
window.entrar = () => socket.connect();

console.log(`
╔════════════════════════════════════════╗
║                                        ║
║   🧪 TESTING GUIDE LOADED              ║
║                                        ║
║   Comandos disponibles:                ║
║   • ver()    - Ver estado del juego    ║
║   • mano()   - Ver tus cartas          ║
║   • salir()  - Desconectar             ║
║   • entrar() - Reconectar              ║
║                                        ║
╚════════════════════════════════════════╝
`);

/**
 * NOTAS IMPORTANTES:
 * 
 * 1. Para probar multijugador, necesitas abrir múltiples pestañas/navegadores
 * 2. Cada pestaña necesita su propia conexión socket
 * 3. El primer jugador que crea la sala es el host
 * 4. Solo el host puede iniciar la partida
 * 5. Mínimo 2 jugadores para iniciar
 * 6. Todos deben marcar "ready" antes de iniciar
 * 7. El límite de mano es siempre 3 cartas
 * 8. Debes jugar O descartar antes de terminar turno
 * 
 * DEBUGGING:
 * 
 * - Si algo falla, revisa la consola del servidor
 * - Los logs tienen colores para identificar eventos
 * - Usa DEBUG=true en .env para más detalles
 * - Revisa Network tab en DevTools para ver eventos de Socket.io
 */
