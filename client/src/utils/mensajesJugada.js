import { CARD_TYPES, ENERGY_TYPES, EVENT_TYPES } from './constants';

/**
 * Arma el texto de lo que acaba de pasar en la mesa, en lenguaje llano:
 * "Chispa atacó tu planta Solar", "Destruiste la planta Eólica de Ada".
 *
 * El servidor ya manda quién jugó, qué carta y contra quién
 * (evento GAME_CARD_PLAYED); aquí solo se traduce a una frase.
 */

const NOMBRE_ENERGIA = {
  [ENERGY_TYPES.SOLAR]: 'Solar',
  [ENERGY_TYPES.EOLICA]: 'Eólica',
  [ENERGY_TYPES.HIDROELECTRICA]: 'Hidroeléctrica',
  [ENERGY_TYPES.GEOTERMICA]: 'Geotérmica',
  [ENERGY_TYPES.COMODIN]: 'Comodín',
};

/** Tipos de aviso: definen el color de la burbuja. */
export const TIPO_JUGADA = {
  CONSTRUCCION: 'construccion',
  DEFENSA: 'defensa',
  ATAQUE: 'ataque',
  DESTRUCCION: 'destruccion',
  EVENTO: 'evento',
};

function nombreDe(jugadores, id) {
  const jugador = jugadores.find((j) => j.id === id);
  if (!jugador) return 'Alguien';
  // En el registro los bots no necesitan su prefijo
  return String(jugador.name || '').replace(/^\[BOT\]\s*/, '');
}

function energiaDe(slotType, card) {
  // El comodín toma el nombre del espacio donde cae
  if (card && card.subtype && card.subtype !== ENERGY_TYPES.COMODIN) {
    return NOMBRE_ENERGIA[card.subtype] || '';
  }
  return NOMBRE_ENERGIA[slotType] || '';
}

/** "tu planta Solar" o "la planta Solar de Chispa" */
function planta(jugadores, objetivoId, esObjetivoMio, energia, actorId) {
  const conEnergia = energia ? ` ${energia}` : '';
  if (esObjetivoMio) return `tu planta${conEnergia}`;
  if (objetivoId === actorId) return `su planta${conEnergia}`;
  return `la planta${conEnergia} de ${nombreDe(jugadores, objetivoId)}`;
}

/**
 * @param {object} datos  payload de GAME_CARD_PLAYED
 * @param {array}  jugadores  gameState.players
 * @param {string} socketId  mi id, para hablar en segunda persona
 * @returns {{texto: string, tipo: string}|null}
 */
export function describirJugada(datos, jugadores = [], socketId = null) {
  if (!datos || !datos.card) return null;

  const { card, target, effect } = datos;
  const actorId = datos.playerId;
  const objetivoId = target?.playerId;
  const slotType = target?.slotType;

  const esMio = actorId === socketId;
  const esObjetivoMio = objetivoId === socketId;
  // En segunda persona el sujeto sobra: "Construiste", no "Tú construiste"
  const actor = esMio ? '' : nombreDe(jugadores, actorId);
  const energia = energiaDe(slotType, card);

  // Elige la conjugación según quien actúa
  const verbo = (tercera, segunda) => (esMio ? segunda : tercera);
  // Junta los espacios que deja el sujeto vacío y pone mayúscula inicial
  const frase = (texto, tipo) => {
    const exclamacion = texto.startsWith('¡');
    const cuerpo = (exclamacion ? texto.slice(1) : texto).split(' ').filter(Boolean).join(' ');
    const conMayuscula = cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1);
    return { texto: (exclamacion ? '¡' : '') + conMayuscula, tipo };
  };

  /* ---- PLANTA ---- */
  if (card.type === CARD_TYPES.PLANTA) {
    return frase(
      `${actor} ${verbo('construyó', 'construiste')} una planta ${energia}`,
      TIPO_JUGADA.CONSTRUCCION
    );
  }

  /* ---- MANTENIMIENTO ---- */
  if (card.type === CARD_TYPES.MANTENIMIENTO) {
    if (effect?.cancelled) {
      return frase(
        `${actor} ${verbo('anuló', 'anulaste')} un riesgo en ${planta(jugadores, objetivoId, esObjetivoMio, energia, actorId)}`,
        TIPO_JUGADA.DEFENSA
      );
    }
    return frase(
      `${actor} ${verbo('reforzó', 'reforzaste')} ${planta(jugadores, objetivoId, esObjetivoMio, energia, actorId)}`,
      TIPO_JUGADA.DEFENSA
    );
  }

  /* ---- RIESGO ---- */
  if (card.type === CARD_TYPES.RIESGO) {
    if (effect?.destroyed) {
      return frase(
        `¡${actor} ${verbo('destruyó', 'destruiste')} ${planta(jugadores, objetivoId, esObjetivoMio, energia, actorId)}!`,
        TIPO_JUGADA.DESTRUCCION
      );
    }
    if (effect?.cancelled) {
      return frase(
        `${actor} ${verbo('anuló', 'anulaste')} un mantenimiento en ${planta(jugadores, objetivoId, esObjetivoMio, energia, actorId)}`,
        TIPO_JUGADA.ATAQUE
      );
    }
    return frase(
      `${actor} ${verbo('atacó', 'atacaste')} ${planta(jugadores, objetivoId, esObjetivoMio, energia, actorId)}`,
      TIPO_JUGADA.ATAQUE
    );
  }

  /* ---- EVENTOS ---- */
  if (card.type === CARD_TYPES.EVENTO) {
    switch (card.subtype) {
      case EVENT_TYPES.COMPRA: {
        const victimaId = effect?.stolen?.from ?? objetivoId;
        const esVictimaMia = victimaId === socketId;
        const energiaRobada = NOMBRE_ENERGIA[effect?.stolen?.slot] || energia;
        return frase(
          esVictimaMia
            ? `${actor} te ${verbo('compró', 'compraste')} la planta ${energiaRobada}`
            : `${actor} le ${verbo('compró', 'compraste')} la planta ${energiaRobada} a ${nombreDe(jugadores, victimaId)}`,
          TIPO_JUGADA.ATAQUE
        );
      }
      case EVENT_TYPES.INTERCAMBIO_PLANTA:
        return frase(
          `${actor} ${verbo('intercambió', 'intercambiaste')} una planta ${esObjetivoMio ? 'contigo' : `con ${nombreDe(jugadores, objetivoId)}`}`,
          TIPO_JUGADA.EVENTO
        );
      case EVENT_TYPES.INTERCAMBIO_TERRENO:
        return frase(
          `${actor} ${verbo('intercambió', 'intercambiaste')} todo el tablero ${esObjetivoMio ? 'contigo' : `con ${nombreDe(jugadores, objetivoId)}`}`,
          TIPO_JUGADA.EVENTO
        );
      case EVENT_TYPES.ESPARCIMIENTO: {
        const n = effect?.spreads?.length || 0;
        return frase(
          `${actor} ${verbo('esparció', 'esparciste')} ${n} riesgo${n === 1 ? '' : 's'} a los demás`,
          TIPO_JUGADA.ATAQUE
        );
      }
      case EVENT_TYPES.DESCARTE:
        return frase(
          `${actor} ${verbo('hizo', 'hiciste')} que todos cambiaran su mano`,
          TIPO_JUGADA.EVENTO
        );
      default:
        return frase(`${actor} ${verbo('jugó', 'jugaste')} ${card.name}`, TIPO_JUGADA.EVENTO);
    }
  }

  return frase(`${actor} ${verbo('jugó', 'jugaste')} ${card.name}`, TIPO_JUGADA.EVENTO);
}

export default describirJugada;
