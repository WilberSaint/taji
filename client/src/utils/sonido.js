/**
 * Sonidos del juego, generados con Web Audio.
 *
 * No se descarga ningún archivo de audio: los tonos se sintetizan en el
 * momento. Para un proyecto pensado en conexiones lentas eso importa — unos
 * pocos MP3 pesarían más que todo el resto del juego junto.
 *
 * La preferencia del jugador vive en localStorage bajo 'taji-sound'
 * (la misma que usa el hook useSound).
 */

const CLAVE_PREFERENCIA = 'taji-sound';

let contexto = null;
let desbloqueado = false;

function sonidoActivado() {
  try {
    return localStorage.getItem(CLAVE_PREFERENCIA) !== 'off';
  } catch {
    return true;
  }
}

function obtenerContexto() {
  if (contexto) return contexto;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    contexto = new AudioCtx();
  } catch {
    contexto = null;
  }
  return contexto;
}

/**
 * Los navegadores no dejan sonar nada hasta que la persona toca la pantalla.
 * Esto se engancha una sola vez al primer toque o tecla.
 */
export function prepararSonido() {
  if (desbloqueado) return;
  desbloqueado = true;
  const reanudar = () => {
    const ctx = obtenerContexto();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', reanudar, { once: true });
  window.addEventListener('keydown', reanudar, { once: true });
}

/**
 * Un tono con envolvente suave. Sin ataque brusco para que no moleste
 * después de escucharlo muchas veces en una partida.
 */
function tono(ctx, { frecuencia, inicio, duracion, volumen = 0.09, forma = 'sine', frecuenciaFinal = null }) {
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();

  osc.type = forma;
  osc.frequency.setValueAtTime(frecuencia, inicio);
  if (frecuenciaFinal) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(frecuenciaFinal, 1), inicio + duracion);
  }

  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.015);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

  osc.connect(ganancia);
  ganancia.connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

/** Ruido corto, para el golpe de una planta destruida. */
function golpe(ctx, inicio, volumen = 0.07) {
  const muestras = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < muestras; i++) {
    datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
  }
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(900, inicio);

  const ganancia = ctx.createGain();
  ganancia.gain.setValueAtTime(volumen, inicio);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.18);

  fuente.connect(filtro);
  filtro.connect(ganancia);
  ganancia.connect(ctx.destination);
  fuente.start(inicio);
}

/** Cada sonido descrito como una receta sobre el contexto de audio. */
const RECETAS = {
  // Construir una planta: dos notas que suben, sensación de logro
  construir: (ctx, t) => {
    tono(ctx, { frecuencia: 523.25, inicio: t, duracion: 0.12 });
    tono(ctx, { frecuencia: 783.99, inicio: t + 0.09, duracion: 0.18 });
  },
  // Proteger / reforzar: un toque cálido y breve
  proteger: (ctx, t) => {
    tono(ctx, { frecuencia: 440, inicio: t, duracion: 0.16, forma: 'triangle' });
  },
  // Atacar: baja de tono, sensación de amenaza
  atacar: (ctx, t) => {
    tono(ctx, { frecuencia: 330, inicio: t, duracion: 0.2, forma: 'sawtooth', volumen: 0.06, frecuenciaFinal: 165 });
  },
  // Destruir: golpe grave
  destruir: (ctx, t) => {
    golpe(ctx, t);
    tono(ctx, { frecuencia: 160, inicio: t, duracion: 0.26, forma: 'square', volumen: 0.05, frecuenciaFinal: 70 });
  },
  // Carta de evento: algo raro pasó
  evento: (ctx, t) => {
    tono(ctx, { frecuencia: 587.33, inicio: t, duracion: 0.1, forma: 'triangle' });
    tono(ctx, { frecuencia: 880, inicio: t + 0.08, duracion: 0.14, forma: 'triangle' });
  },
  // Te toca: campanita discreta
  turno: (ctx, t) => {
    tono(ctx, { frecuencia: 659.25, inicio: t, duracion: 0.14, volumen: 0.07 });
    tono(ctx, { frecuencia: 987.77, inicio: t + 0.11, duracion: 0.22, volumen: 0.07 });
  },
  // Victoria: arpegio corto
  victoria: (ctx, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tono(ctx, { frecuencia: f, inicio: t + i * 0.11, duracion: 0.3, volumen: 0.08 });
    });
  },
};

/**
 * Reproduce uno de los sonidos definidos arriba.
 * Si el jugador silenció el juego, o el navegador no deja, no pasa nada.
 */
export function reproducirSonido(nombre) {
  if (!sonidoActivado()) return;
  const receta = RECETAS[nombre];
  if (!receta) return;

  const ctx = obtenerContexto();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    receta(ctx, ctx.currentTime + 0.01);
  } catch {
    /* el audio nunca debe romper una partida */
  }
}

export default reproducirSonido;
