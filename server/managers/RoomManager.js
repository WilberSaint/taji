import Room from '../models/Room.js';
import Player from '../models/Player.js';
import logger from '../utils/logger.js';

/**
 * Gestor de salas del juego
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> Room
  }

  /**
   * Crea una nueva sala
   */
  createRoom(hostSocketId, hostName, isPublic = true) {
    // Crear jugador host
    const host = new Player(hostSocketId, hostName);
    
    // Crear sala
    const room = new Room(hostSocketId, isPublic);
    room.addPlayer(host);
    
    // Guardar sala
    this.rooms.set(room.code, room);
    
    logger.room(`Sala creada: ${room.code} por ${hostName}`, {
      isPublic,
      totalRooms: this.rooms.size
    });

    return room;
  }

  /**
   * Une un jugador a una sala existente
   */
  joinRoom(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      logger.warn(`Intento de unirse a sala inexistente: ${roomCode}`);
      return { success: false, error: 'Sala no encontrada' };
    }

    if (room.isFull()) {
      return { success: false, error: 'La sala está llena' };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'La partida ya comenzó' };
    }

    // Crear jugador
    const player = new Player(socketId, playerName);
    
    // Agregar a la sala
    const added = room.addPlayer(player);
    
    if (!added) {
      return { success: false, error: 'No se pudo unir a la sala' };
    }

    return { success: true, room: room };
  }

  /**
   * Remueve un jugador de una sala
   */
  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Sala no encontrada' };
    }

    const player = room.removePlayer(playerId);
    
    if (!player) {
      return { success: false, error: 'Jugador no encontrado en la sala' };
    }

    // Si la sala quedó vacía, eliminarla
    if (room.isEmpty()) {
      this.deleteRoom(roomCode);
    }

    return { success: true, player: player, roomDeleted: room.isEmpty() };
  }

  /**
   * Obtiene una sala por código
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  /**
   * Obtiene todas las salas públicas disponibles
   */
  getPublicRooms() {
    const publicRooms = [];
    
    this.rooms.forEach(room => {
      if (room.isPublic && room.status === 'lobby' && !room.isFull()) {
        publicRooms.push(room.getSummary());
      }
    });

    return publicRooms;
  }

  /**
   * Busca la sala en la que está un jugador
   */
  findRoomByPlayer(playerId) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.hasPlayer(playerId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Marca un jugador como listo/no listo
   */
  setPlayerReady(roomCode, playerId, ready) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Sala no encontrada' };
    }

    const success = room.setPlayerReady(playerId, ready);
    
    if (!success) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    return { success: true, room: room };
  }

  /**
   * Verifica si una sala puede iniciar
   */
  canStartRoom(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { can: false, error: 'Sala no encontrada' };
    }

    // Solo el host puede iniciar
    if (room.hostId !== requesterId) {
      return { can: false, error: 'Solo el host puede iniciar la partida' };
    }

    return room.canStart();
  }

  /**
   * Elimina una sala
   */
  deleteRoom(roomCode) {
    const deleted = this.rooms.delete(roomCode);
    
    if (deleted) {
      logger.room(`Sala eliminada: ${roomCode}`, {
        totalRooms: this.rooms.size
      });
    }

    return deleted;
  }

  /**
   * Obtiene estadísticas de las salas
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      publicRooms: 0,
      privateRooms: 0,
      playingRooms: 0,
      lobbyRooms: 0,
      totalPlayers: 0
    };

    this.rooms.forEach(room => {
      if (room.isPublic) stats.publicRooms++;
      else stats.privateRooms++;

      if (room.status === 'playing') stats.playingRooms++;
      if (room.status === 'lobby') stats.lobbyRooms++;

      stats.totalPlayers += room.players.length;
    });

    return stats;
  }

  /**
   * Limpia salas antiguas (opcional, para mantenimiento)
   */
  cleanupOldRooms(maxAgeMs = 3600000) { // 1 hora por defecto
    const now = Date.now();
    const roomsToDelete = [];

    this.rooms.forEach((room, code) => {
      const age = now - room.createdAt;
      if (age > maxAgeMs && room.status === 'lobby' && room.isEmpty()) {
        roomsToDelete.push(code);
      }
    });

    roomsToDelete.forEach(code => this.deleteRoom(code));

    if (roomsToDelete.length > 0) {
      logger.info(`Limpieza automática: ${roomsToDelete.length} salas eliminadas`);
    }

    return roomsToDelete.length;
  }
}

export default new RoomManager();
