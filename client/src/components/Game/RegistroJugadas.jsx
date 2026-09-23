import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, ShieldCheck, Swords, Zap, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TIPO_JUGADA } from '../../utils/mensajesJugada';

/**
 * Burbujas con lo que acaba de pasar en la mesa: quién jugó qué y contra
 * quién. Sin esto, cuando juegan los bots el tablero cambia solo y no se
 * entiende por qué.
 */

const ESTILOS = {
  [TIPO_JUGADA.CONSTRUCCION]: { Icono: Hammer,       fondo: 'rgba(59,150,104,0.92)' },
  [TIPO_JUGADA.DEFENSA]:      { Icono: ShieldCheck,  fondo: 'rgba(60,121,190,0.92)' },
  [TIPO_JUGADA.ATAQUE]:       { Icono: Swords,       fondo: 'rgba(181,127,28,0.94)' },
  [TIPO_JUGADA.DESTRUCCION]:  { Icono: Zap,          fondo: 'rgba(201,74,64,0.94)' },
  [TIPO_JUGADA.EVENTO]:       { Icono: Sparkles,     fondo: 'rgba(142,111,184,0.92)' },
};

export function RegistroJugadas({ compacto = false }) {
  const registroJugadas = useGameStore((s) => s.registroJugadas);

  return (
    <div
      className={`pointer-events-none flex flex-col gap-1.5 ${compacto ? 'items-stretch' : 'items-start'}`}
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {registroJugadas.map((jugada) => {
          const { Icono, fondo } = ESTILOS[jugada.tipo] || ESTILOS[TIPO_JUGADA.EVENTO];
          return (
            <motion.div
              key={jugada.id}
              layout
              initial={{ opacity: 0, x: -14, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={`flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm ${
                compacto ? 'text-[11px]' : 'text-[13px]'
              }`}
              style={{ background: fondo }}
            >
              <Icono size={compacto ? 12 : 14} className="shrink-0" />
              <span className="font-semibold leading-tight">{jugada.texto}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default RegistroJugadas;
