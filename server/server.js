import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupLobbyHandlers } from './handlers/lobbyHandlers.js';
import { setupGameHandlers } from './handlers/gameHandlers.js';
import { setupConnectionHandlers } from './handlers/connectionHandlers.js';
import RoomManager from './managers/RoomManager.js';
import GameManager from './managers/GameManager.js';
import logger from './utils/logger.js';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Crear aplicación Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.io con CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Permitir todas las conexiones en desarrollo
    methods: ['GET', 'POST'],
    credentials: false // Cambiar a false cuando origin es '*'
  }
});

// Middleware
app.use(cors({
  origin: '*', // Permitir todas las conexiones en desarrollo
  credentials: false
}));
app.use(express.json());

// ============================================
// RUTAS HTTP (API REST - OPCIONAL)
// ============================================

/**
 * Ruta de health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TAJI Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Obtener estadísticas del servidor
 */
app.get('/stats', (req, res) => {
  const roomStats = RoomManager.getStats();
  const gameStats = GameManager.getStats();

  res.json({
    rooms: roomStats,
    games: gameStats,
    timestamp: new Date().toISOString()
  });
});

/**
 * Listar salas públicas disponibles
 */
app.get('/rooms', (req, res) => {
  const publicRooms = RoomManager.getPublicRooms();
  res.json({ rooms: publicRooms });
});

/**
 * Ruta 404
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ============================================
// SOCKET.IO - CONEXIONES Y EVENTOS
// ============================================

io.on('connection', (socket) => {
  logger.info(`✨ Cliente conectado: ${socket.id}`);

  // Configurar todos los handlers
  setupConnectionHandlers(io, socket);
  setupLobbyHandlers(io, socket);
  setupGameHandlers(io, socket);

  /**
   * Evento de prueba para verificar conexión
   */
  socket.on('ping', (callback) => {
    if (callback) {
      callback({ success: true, message: 'pong', timestamp: Date.now() });
    }
  });

  /**
   * Manejo de errores del socket
   */
  socket.on('error', (error) => {
    logger.error(`Error en socket ${socket.id}`, error);
  });
});

// ============================================
// TAREAS DE MANTENIMIENTO
// ============================================

/**
 * Limpieza periódica de salas y partidas antiguas
 */
setInterval(() => {
  const roomsDeleted = RoomManager.cleanupOldRooms(3600000); // 1 hora
  const gamesDeleted = GameManager.cleanupFinishedGames(1800000); // 30 minutos

  if (roomsDeleted > 0 || gamesDeleted > 0) {
    logger.info(`Mantenimiento: ${roomsDeleted} salas y ${gamesDeleted} partidas eliminadas`);
  }
}, 600000); // Cada 10 minutos

// ============================================
// INICIAR SERVIDOR
// ============================================

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.success(`
  ╔════════════════════════════════════════╗
  ║                                        ║
  ║     🌱 TAJI SERVER RUNNING 🌱          ║
  ║                                        ║
  ║  Port: ${PORT}                            ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║  Listening on: 0.0.0.0 (todas las IPs) ║
  ║                                        ║
  ╚════════════════════════════════════════╝
  `);
});

// ============================================
// MANEJO DE ERRORES Y SEÑALES
// ============================================

/**
 * Manejo de errores no capturados
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

/**
 * Manejo de señales de terminación
 */
process.on('SIGTERM', () => {
  logger.warn('SIGTERM recibido, cerrando servidor...');
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.warn('SIGINT recibido, cerrando servidor...');
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
});

export default httpServer;