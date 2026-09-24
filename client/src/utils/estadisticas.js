/**
 * Estadísticas de partidas, guardadas en el propio dispositivo.
 *
 * Son POR NAVEGADOR, no por persona: no hay cuentas ni servidor que las
 * guarde. Si alguien juega en otro teléfono, empieza de cero; si dos personas
 * comparten el mismo, las suman. Para un juego de taller está bien —la gracia
 * es ver tu racha, no tener un ranking— pero conviene tenerlo claro.
 *
 * Todo acceso va envuelto en try/catch: en navegación privada o con el
 * almacenamiento bloqueado, `localStorage` lanza excepción al leer o escribir.
 * Si falla, el juego sigue tal cual y simplemente no lleva la cuenta.
 */

const CLAVE = 'taji-estadisticas';

const VACIAS = {
  jugadas: 0,
  victorias: 0,
  derrotas: 0,
  rachaActual: 0,
  mejorRacha: 0,
};

/** Lee las estadísticas guardadas. Nunca lanza: si algo falla, devuelve ceros. */
export function leerEstadisticas() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...VACIAS };

    const guardado = JSON.parse(crudo);
    // Se reconstruye campo por campo por si el formato cambió entre versiones
    // o alguien editó el almacenamiento a mano.
    const limpio = { ...VACIAS };
    for (const campo of Object.keys(VACIAS)) {
      const valor = Number(guardado?.[campo]);
      limpio[campo] = Number.isFinite(valor) && valor >= 0 ? Math.floor(valor) : 0;
    }
    return limpio;
  } catch {
    return { ...VACIAS };
  }
}

/**
 * Apunta el resultado de una partida.
 * @param {boolean} gane
 * @returns {object} las estadísticas ya actualizadas
 */
export function registrarPartida(gane) {
  const previas = leerEstadisticas();
  const rachaActual = gane ? previas.rachaActual + 1 : 0;

  const nuevas = {
    jugadas: previas.jugadas + 1,
    victorias: previas.victorias + (gane ? 1 : 0),
    derrotas: previas.derrotas + (gane ? 0 : 1),
    rachaActual,
    mejorRacha: Math.max(previas.mejorRacha, rachaActual),
  };

  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevas));
  } catch {
    /* sin almacenamiento: se devuelve el conteo igual, solo no persiste */
  }

  return nuevas;
}

/** Vuelve todo a cero. */
export function borrarEstadisticas() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
  return { ...VACIAS };
}

/** Porcentaje de victorias, redondeado. 0 si no ha jugado nada. */
export function porcentajeVictorias(est) {
  if (!est?.jugadas) return 0;
  return Math.round((est.victorias / est.jugadas) * 100);
}

export default { leerEstadisticas, registrarPartida, borrarEstadisticas, porcentajeVictorias };
