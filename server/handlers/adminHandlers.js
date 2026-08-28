import RoomManager from '../managers/RoomManager.js';
import GameManager from '../managers/GameManager.js';
import {
  getRules, updateRules, resetRules,
  getDeckConfig, updateDeckConfig, resetDeckConfig,
  getMaintenance, setMaintenance,
} from '../state/adminSettings.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Panel de administrador — todo protegido por un token compartido
 * (variable de entorno ADMIN_TOKEN). Sin ADMIN_TOKEN configurado, el panel
 * queda deshabilitado (checkToken siempre falla).
 */

function checkToken(data) {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && !!data?.token && data.token === expected;
}

function snapshot() {
  return {
    roomStats: RoomManager.getStats(),
    gameStats: GameManager.getStats(),
    rooms: RoomManager.getAllRooms(),
    maintenance: getMaintenance(),
    rules: getRules(),
    deckConfig: getDeckConfig(),
  };
}

export function setupAdminHandlers(io, socket) {
  socket.on('admin:auth', (data, callback) => {
    callback?.({ success: checkToken(data) });
  });

  socket.on('admin:stats', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });
    callback?.({ success: true, ...snapshot() });
  });

  socket.on('admin:close_room', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });

    const { roomCode } = data;
    const result = RoomManager.adminCloseRoom(roomCode);
    if (!result.success) return callback?.({ success: false, error: result.error });

    io.to(roomCode).emit(SOCKET_EVENTS.YOU_WERE_KICKED, { reason: 'La sala fue cerrada por un administrador' });
    GameManager.deleteGame(roomCode);
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());
    logger.warn(`[admin] sala ${roomCode} cerrada manualmente`);
    callback?.({ success: true });
  });

  socket.on('admin:kick_player', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });

    const { roomCode, playerId } = data;
    const result = RoomManager.adminRemovePlayer(roomCode, playerId);
    if (!result.success) return callback?.({ success: false, error: result.error });

    io.to(playerId).emit(SOCKET_EVENTS.YOU_WERE_KICKED, { reason: 'Fuiste expulsado por un administrador' });
    if (!result.roomDeleted) {
      io.to(roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, result.room.getState());
    }
    io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, RoomManager.getPublicRooms());
    logger.warn(`[admin] ${result.player.name} expulsado de ${roomCode}`);
    callback?.({ success: true });
  });

  socket.on('admin:maintenance', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });

    const state = setMaintenance(data.enabled, data.message);
    io.emit('admin:announcement', state);
    logger.warn(`[admin] modo mantenimiento ${state.enabled ? 'activado' : 'desactivado'}`);
    callback?.({ success: true, maintenance: state });
  });

  socket.on('admin:update_rules', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });
    callback?.({ success: true, rules: updateRules(data.rules) });
  });

  socket.on('admin:reset_rules', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });
    callback?.({ success: true, rules: resetRules() });
  });

  socket.on('admin:update_deck', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });
    callback?.({ success: true, deckConfig: updateDeckConfig(data.deckConfig) });
  });

  socket.on('admin:reset_deck', (data, callback) => {
    if (!checkToken(data)) return callback?.({ success: false, error: 'No autorizado' });
    callback?.({ success: true, deckConfig: resetDeckConfig() });
  });
}
