import { io } from 'socket.io-client';
import { SERVER_URL } from './utils/constants';

// Crear instancia de Socket.io
const socket = io(SERVER_URL, {
  autoConnect: false, // No conectar automáticamente
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Event listeners para debugging
socket.on('connect', () => {
  console.log('✅ Conectado al servidor:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Desconectado del servidor:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔴 Error de conexión:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
});

socket.on('reconnect_error', (error) => {
  console.error('🔴 Error al reconectar:', error.message);
});

socket.on('reconnect_failed', () => {
  console.error('🔴 No se pudo reconectar al servidor');
});

export default socket;
