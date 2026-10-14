import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupLobbyHandlers } from './handlers/lobbyHandlers.js';
import { setupGameHandlers } from './handlers/gameHandlers.js';
import { setupConnectionHandlers } from './handlers/connectionHandlers.js';
import { setupAdminHandlers } from './handlers/adminHandlers.js';
import RoomManager from './managers/RoomManager.js';
import GameManager from './managers/GameManager.js';
import logger from './utils/logger.js';
import { entrarAEspera } from './utils/listaSalas.js';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3001;
const EN_PRODUCCION = process.env.NODE_ENV === 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear aplicación Express
const app = express();
const httpServer = createServer(app);

/* CORS: en producción el sitio, el juego y el socket viven en el MISMO
   dominio (ludoenergia.com, ludoenergia.com/taji, ludoenergia.com/socket.io),
   así que no hace falta abrir nada. En desarrollo el cliente corre en otro
   puerto (:5173) y sí lo necesita. Si algún día el juego se sirve desde otro
   dominio, ponerlo en CORS_ORIGIN. */
const CORS_ORIGIN = process.env.CORS_ORIGIN || (EN_PRODUCCION ? false : '*');

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: false },
  // Los mensajes del cliente son diminutos (ids de carta y de jugador). El
  // tope por defecto es 1 MB; bajarlo evita que alguien sature la memoria
  // mandando paquetes enormes.
  maxHttpBufferSize: 64 * 1024,
  // Sin compresión por mensaje (ya es el valor por defecto; se deja explícito):
  // comprimir cada estado cuesta más CPU de lo que ahorra en mensajes de pocos KB.
  perMessageDeflate: false,
});

// Middleware
if (CORS_ORIGIN) app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
app.use(express.json({ limit: '16kb' }));

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
let cpuAnterior = { uso: process.cpuUsage(), t: process.hrtime.bigint() };

app.get('/stats', (req, res) => {
  const roomStats = RoomManager.getStats();
  const gameStats = GameManager.getStats();

  // CPU del proceso desde la consulta anterior, en % de UN núcleo
  const ahora = { uso: process.cpuUsage(), t: process.hrtime.bigint() };
  const cpuMicros = (ahora.uso.user - cpuAnterior.uso.user) + (ahora.uso.system - cpuAnterior.uso.system);
  const pasadoMicros = Number(ahora.t - cpuAnterior.t) / 1000;
  cpuAnterior = ahora;
  const mem = process.memoryUsage();

  res.json({
    rooms: roomStats,
    games: gameStats,
    proceso: {
      conexiones: io.engine.clientsCount,
      rssMB: Math.round(mem.rss / 1048576),
      heapMB: Math.round(mem.heapUsed / 1048576),
      cpuPct: pasadoMicros > 0 ? Math.round((cpuMicros / pasadoMicros) * 1000) / 10 : 0,
      uptimeMin: Math.round(process.uptime() / 60),
    },
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

// ============================================
// ARCHIVOS ESTÁTICOS (client/dist y site/dist)
// Solo si ya se compilaron con `npm run build`. En desarrollo cada uno corre
// su propio servidor de Vite (client:5173, site:5175) y esto no se usa —
// permite tener todo (sitio + juego + API) en un solo proceso y un solo
// dominio en producción, sin CORS entre ellos.
// ============================================
const clientDist = path.join(__dirname, '../client/dist');
const siteDist = path.join(__dirname, '../site/dist');

/* En el servidor de producción los estáticos los sirve Caddy
   (deploy/Caddyfile), con menos memoria y CPU que Node; este proceso queda
   solo para el socket. Esto se conserva para levantar todo con un solo
   `npm start`, por ejemplo en una laptop durante un taller sin internet.
   El HTML, el manifiesto y el service worker nunca se cachean (si no, la
   gente se queda con una versión vieja); lo demás, un día. */
const estaticos = {
  maxAge: '1d',
  setHeaders(res, ruta) {
    if (/\.(html|webmanifest)$|sw\.js$/.test(ruta)) res.setHeader('Cache-Control', 'no-cache');
  },
};

if (fs.existsSync(clientDist)) {
  app.use('/taji', express.static(clientDist, estaticos));
  app.get('/taji/*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  logger.info('Sirviendo client/dist (TAJI) en /taji');
}

if (fs.existsSync(siteDist)) {
  app.use('/', express.static(siteDist, estaticos));
  app.get('*', (req, res) => res.sendFile(path.join(siteDist, 'index.html')));
  logger.info('Sirviendo site/dist (LudoEnergía) en /');
}

/**
 * Ruta 404 — solo se alcanza si no hay builds estáticos que servir
 * (por ejemplo, en un entorno solo-API).
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ============================================
// SOCKET.IO - CONEXIONES Y EVENTOS
// ============================================

io.on('connection', (socket) => {
  logger.info(`✨ Cliente conectado: ${socket.id}`);

  // Todo socket empieza viendo la lista de salas (ver utils/listaSalas.js)
  entrarAEspera(socket);

  // Configurar todos los handlers
  setupConnectionHandlers(io, socket);
  setupLobbyHandlers(io, socket);
  setupGameHandlers(io, socket);
  setupAdminHandlers(io, socket);

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
  try {
    const roomsDeleted = RoomManager.cleanupOldRooms(3600000); // 1 hora
    const gamesDeleted = GameManager.cleanupFinishedGames(1800000); // 30 minutos

    if (roomsDeleted > 0 || gamesDeleted > 0) {
      logger.info(`Mantenimiento: ${roomsDeleted} salas y ${gamesDeleted} partidas eliminadas`);
    }
  } catch (err) {
    logger.error('Error en tarea de mantenimiento (ignorado):');
    console.error(err);
  }
}, 600000); // Cada 10 minutos

// ============================================
// INICIAR SERVIDOR
// ============================================

// Un fallo al arrancar (puerto ocupado, permisos, etc.) sí debe terminar el
// proceso: un servidor "vivo" pero que nunca llegó a escuchar es peor que uno
// caído (pm2/systemd no se enteran de que no sirve para nada). Esto se separa
// a propósito del `uncaughtException` de abajo, que solo tolera errores en
// tiempo de ejecución, no de arranque.
httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`El puerto ${PORT} ya está en uso. Cierra el otro proceso o cambia PORT.`);
  } else {
    logger.error('No se pudo iniciar el servidor:');
    console.error(error);
  }
  process.exit(1);
});

// En el servidor va HOST=127.0.0.1: solo Caddy habla con Node, nadie de fuera.
// En desarrollo 0.0.0.0 permite probar desde un teléfono en la misma red.
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  // El logger calla en producción; esta línea sí debe quedar en el journal.
  if (EN_PRODUCCION) console.log(`TAJI escuchando en ${HOST}:${PORT}`);
  logger.success(`
  ╔════════════════════════════════════════╗
  ║                                        ║
  ║     🌱 TAJI SERVER RUNNING 🌱          ║
  ║                                        ║
  ║  Port: ${PORT}                            ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║  Listening on: ${HOST.padEnd(24)}║
  ║                                        ║
  ╚════════════════════════════════════════╝
  `);
});

// ============================================
// MANEJO DE ERRORES Y SEÑALES
// ============================================

/**
 * Manejo de errores no capturados.
 * NO cerramos el proceso: un paquete raro de un cliente (típico en móvil con
 * conexión intermitente) no debe tumbar la partida de todos. Se registra y sigue.
 */
process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada (el servidor sigue en pie):');
  console.error(error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada sin manejar (ignorada):');
  console.error(reason);
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