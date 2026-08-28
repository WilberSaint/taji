import Room from "../models/Room.js";
import Player from "../models/Player.js";
import logger from "../utils/logger.js";
import { PLAYER_COLORS } from "../utils/constants.js";

/**
 * Gestor de salas del juego
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> Room
    this.botNames = [
      "Robo-Tesla",
      "Ada Voltios",
      "Capitán Solaris",
      "Doña Eólica",
      "Chispa",
      "Ingeniera Marie",
      "Turbina Turbo",
      "Profe Fotón",
      "Geo la Geóloga",
      "Kilovatio Kid",
    ];
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
      totalRooms: this.rooms.size,
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
      return { success: false, error: "Sala no encontrada" };
    }

    if (room.isFull()) {
      return { success: false, error: "La sala está llena" };
    }

    if (room.status !== "lobby") {
      return { success: false, error: "La partida ya comenzó" };
    }

    // Crear jugador
    const player = new Player(socketId, playerName);

    // Agregar a la sala
    const added = room.addPlayer(player);

    if (!added) {
      return { success: false, error: "No se pudo unir a la sala" };
    }

    return { success: true, room: room };
  }

  /**
   * Remueve un jugador de una sala
   */
  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { success: false, error: "Sala no encontrada" };
    }

    const player = room.removePlayer(playerId);

    if (!player) {
      return { success: false, error: "Jugador no encontrado en la sala" };
    }

    // Si la sala quedó vacía, eliminarla
    if (room.isEmpty()) {
      this.deleteRoom(roomCode);
    } else {
      // Reasignar colores si la sala sigue activa
      this.reassignColors(room);
    }

    return { success: true, player: player, roomDeleted: room.isEmpty() };
  }

  /**
   * Obtiene un nombre chistoso único para un bot
   */
  getUniqueBotName(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return "[BOT] Desconocido";
    }

    // Obtener todos los nombres de bots actuales en la sala
    const existingBotNames = new Set(
      room.players
        .filter((p) => p.isBot)
        .map((p) => {
          const match = p.name.match(/\[BOT\]\s+(.+)/);
          return match ? match[1] : null;
        })
        .filter((name) => name !== null),
    );

    // Obtener nombres disponibles
    const availableBotNames = this.botNames.filter(
      (name) => !existingBotNames.has(name),
    );

    if (availableBotNames.length === 0) {
      // Si todos los nombres están usados, generar uno único
      return `[BOT] ${this.botNames[0]}_${Date.now()}`;
    }

    // Seleccionar un nombre aleatorio de los disponibles
    const randomName =
      availableBotNames[Math.floor(Math.random() * availableBotNames.length)];
    return `[BOT] ${randomName}`;
  }

  /**
   * Reasigna los colores a todos los jugadores en una sala
   */
  reassignColors(room) {
    if (!room) return;

    room.players.forEach((player, index) => {
      player.color = PLAYER_COLORS[index % PLAYER_COLORS.length];
    });
  }

  /**
   * Agrega un bot a la sala
   */
  addBot(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { success: false, error: "Sala no encontrada" };
    }

    if (room.hostId !== requesterId) {
      return { success: false, error: "Solo el host puede agregar bots" };
    }

    if (room.isFull()) {
      return { success: false, error: "La sala está llena" };
    }

    const botName = this.getUniqueBotName(roomCode);
    const botId = `bot_${Date.now()}`;

    const bot = new Player(botId, botName, "🤖", null, true);
    bot.setReady(true);

    const added = room.addPlayer(bot);
    if (!added) {
      return { success: false, error: "No se pudo agregar el bot" };
    }

    logger.info(`Bot ${botName} agregado a la sala ${roomCode}`);
    return { success: true, room };
  }

  /**
   * Remueve un bot de la sala
   */
  removeBot(roomCode, botId, requesterId) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { success: false, error: "Sala no encontrada" };
    }

    if (room.hostId !== requesterId) {
      return { success: false, error: "Solo el host puede remover bots" };
    }

    const bot = room.getPlayer(botId);
    if (!bot || !bot.isBot) {
      return { success: false, error: "Jugador no es un bot" };
    }

    const removed = room.removePlayer(botId);
    if (!removed) {
      return { success: false, error: "No se pudo remover el bot" };
    }

    // Reasignar colores después de remover un bot
    this.reassignColors(room);

    logger.info(`Bot ${bot.name} removido de la sala ${roomCode}`);
    return { success: true, room };
  }

  kickPlayer(roomCode, playerIdToKick, requesterId) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { success: false, error: "Sala no encontrada" };
    }

    if (room.hostId !== requesterId) {
      return { success: false, error: "Solo el host puede expulsar jugadores" };
    }

    if (playerIdToKick === requesterId) {
      return { success: false, error: "No te puedes expulsar a ti mismo" };
    }

    const playerToKick = room.getPlayer(playerIdToKick);
    if (!playerToKick) {
      return { success: false, error: "Jugador no encontrado" };
    }

    const removed = room.removePlayer(playerIdToKick);
    if (!removed) {
      return { success: false, error: "No se pudo expulsar al jugador" };
    }

    // Reasignar colores después de expulsar un jugador
    this.reassignColors(room);

    logger.info(
      `Jugador ${playerToKick.name} expulsado de la sala ${roomCode} por el host`,
    );
    return { success: true, room, kickedPlayer: playerToKick };
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

    this.rooms.forEach((room) => {
      if (room.isPublic && room.status === "lobby" && !room.isFull()) {
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
      return { success: false, error: "Sala no encontrada" };
    }

    const success = room.setPlayerReady(playerId, ready);

    if (!success) {
      return { success: false, error: "Jugador no encontrado" };
    }

    return { success: true, room: room };
  }

  /**
   * Verifica si una sala puede iniciar
   */
  canStartRoom(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return { can: false, error: "Sala no encontrada" };
    }

    // Solo el host puede iniciar
    if (room.hostId !== requesterId) {
      return { can: false, error: "Solo el host puede iniciar la partida" };
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
        totalRooms: this.rooms.size,
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
      totalPlayers: 0,
    };

    this.rooms.forEach((room) => {
      if (room.isPublic) stats.publicRooms++;
      else stats.privateRooms++;

      if (room.status === "playing") stats.playingRooms++;
      if (room.status === "lobby") stats.lobbyRooms++;

      stats.totalPlayers += room.players.length;
    });

    return stats;
  }

  /**
   * Limpia salas antiguas (opcional, para mantenimiento)
   */
  cleanupOldRooms(maxAgeMs = 3600000) {
    // 1 hora por defecto
    const now = Date.now();
    const roomsToDelete = [];

    this.rooms.forEach((room, code) => {
      const age = now - room.createdAt;
      if (age > maxAgeMs && room.status === "lobby" && room.isEmpty()) {
        roomsToDelete.push(code);
      }
    });

    roomsToDelete.forEach((code) => this.deleteRoom(code));

    if (roomsToDelete.length > 0) {
      logger.info(
        `Limpieza automática: ${roomsToDelete.length} salas eliminadas`,
      );
    }

    return roomsToDelete.length;
  }
}

export default new RoomManager();
