import { motion } from 'framer-motion';
import { ENERGY_TYPES } from '../../utils/constants';

/**
 * El pueblo del fondo se enciende con tus plantas.
 *
 * Cada planta alimenta un barrio. Si la planta está sana, ese barrio tiene
 * luz; si la dañan o la destruyen, se apaga. Es la idea del juego hecha
 * imagen: tus energías renovables electrifican tu comunidad.
 *
 * Las cinco imágenes salieron del mismo archivo, así que encajan exactas.
 * Se colocan con el mismo encuadre que el fondo (clase .encuadre-pueblo)
 * para que no se despeguen al cambiar el tamaño de la pantalla.
 */

const BARRIOS = [
  { zona: 'arriba', energia: ENERGY_TYPES.SOLAR },
  { zona: 'abajo', energia: ENERGY_TYPES.HIDROELECTRICA },
  { zona: 'izquierda', energia: ENERGY_TYPES.EOLICA },
  { zona: 'derecha', energia: ENERGY_TYPES.GEOTERMICA },
];

/** Una planta da luz si está construida y no tiene riesgos encima. */
function daLuz(slot) {
  if (!slot?.plant) return false;
  return !slot.modifiers?.some((m) => m.type === 'riesgo');
}

export function LucesPueblo({ jugador }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BARRIOS.map(({ zona, energia }) => (
        <motion.div
          key={zona}
          className="absolute inset-0 encuadre-pueblo"
          style={{ backgroundImage: `url('/assets/backgrounds/luces-${zona}.webp')` }}
          initial={false}
          animate={{ opacity: daLuz(jugador?.board?.[energia]) ? 1 : 0 }}
          // Lento al encender y al apagar: se siente como luz de verdad,
          // no como un interruptor
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default LucesPueblo;
