import { v4 as uuidv4 } from 'uuid';
import { GAME_STATUS, GAME_RULES, PLAYER_COLORS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Clase que representa una sala de juego
 */
export default class Room {
  constructor(hostId, isPublic = true) {
    this.code = this.generateRoomCode();
    this.hostId = hostId;
    this.isPublic = isPublic;
    this.players = [];
    this.maxPlayers = GAME_RULES.MAX_PLAYERS;
    this.status = GAME_STATUS.LOBBY;
    this.game = null;
    this.createdAt = Date.now();
  }

  /**
   * Genera un código único para la sala
   */
  generateRoomCode() {
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TAJI-${randomPart}`;
  }

  /**
   * Agrega un jugador a la sala
   */
  addPlayer(player) {
    if (this.isFull()) {
      logger.warn(`Sala ${this.code} está llena`);
      return false;
    }

    if (this.hasPlayer(player.id)) {
      logger.warn(`Jugador ${player.name} ya está en la sala ${this.code}`);
      return false;
    }

    // Asignar color al jugador
    player.color = PLAYER_COLORS[this.players.length];
    
    this.players.push(player);
    logger.room(`${player.name} se unió a la sala ${this.code}`, {
      playersCount: this.players.length
    });
    
    return true;
  }

  /**
   * Remueve un jugador de la sala
   */
  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      logger.warn(`Jugador ${playerId} no encontrado en sala ${this.code}`);
      return null;
    }

    const [removedPlayer] = this.players.splice(playerIndex, 1);
    logger.room(`${removedPlayer.name} salió de la sala ${this.code}`, {
      playersCount: this.players.length
    });

    // Si el host se fue, asignar nuevo host
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
      logger.room(`Nuevo host de sala ${this.code}: ${this.players[0].name}`);
    }

    return removedPlayer;
  }

  /**
   * Obtiene un jugador por ID
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Verifica si un jugador está en la sala
   */
  hasPlayer(playerId) {
    return this.players.some(p => p.id === playerId);
  }

  /**
   * Verifica si la sala está llena
   */
  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  /**
   * Verifica si la sala está vacía
   */
  isEmpty() {
    return this.players.length === 0;
  }

  /**
   * Verifica si todos los jugadores están listos
   */
  allPlayersReady() {
    if (this.players.length < GAME_RULES.MIN_PLAYERS) {
      return false;
    }
    return this.players.every(p => p.isReady);
  }

  /**
   * Verifica si la partida puede iniciar
   */
  canStart() {
    // Mínimo de jugadores
    if (this.players.length < GAME_RULES.MIN_PLAYERS) {
      return { 
        can: false, 
        reason: `Se necesitan al menos ${GAME_RULES.MIN_PLAYERS} jugadores` 
      };
    }

    // Todos deben estar listos
    if (!this.allPlayersReady()) {
      return { 
        can: false, 
        reason: 'Todos los jugadores deben estar listos' 
      };
    }

    return { can: true };
  }

  /**
   * Marca a un jugador como listo/no listo
   */
  setPlayerReady(playerId, ready) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.setReady(ready);
    return true;
  }

  /**
   * Cambia el estado de la sala
   */
  setStatus(status) {
    this.status = status;
    logger.room(`Sala ${this.code} cambió a estado: ${status}`);
  }

  /**
   * Obtiene el estado de la sala (para enviar al cliente)
   */
  getState() {
    return {
      code: this.code,
      hostId: this.hostId,
      isPublic: this.isPublic,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isReady: p.isReady,
        status: p.status
      })),
      playersCount: this.players.length,
      maxPlayers: this.maxPlayers,
      status: this.status,
      canStart: this.canStart(),
      createdAt: this.createdAt
    };
  }

  /**
   * Obtiene información resumida de la sala (para lista pública)
   */
  getSummary() {
    return {
      code: this.code,
      playersCount: this.players.length,
      maxPlayers: this.maxPlayers,
      status: this.status,
      isPublic: this.isPublic,
      isFull: this.isFull()
    };
  }
}
