import { motion } from 'framer-motion';
import { CARD_TYPES, CARD_TYPE_COLORS } from '../../utils/constants';

/**
 * Carta de la mano.
 *
 * Las plantas, mantenimientos y riesgos ya vienen con su marco dibujado en la
 * imagen: solo se recorta y se muestra. Los eventos llegan como ilustración sin
 * marco, así que se les añade uno (borde + franja con el nombre).
 */
export function Card({
  card,
  selected = false,
  disabled = false,
  className = '',
}) {
  const isEvent = card.type === CARD_TYPES.EVENTO;
  const typeColor = CARD_TYPE_COLORS[card.type] || '#0B7480';

  return (
    <motion.div
      className={`
        relative h-full w-full overflow-hidden rounded-[10px]
        shadow-[0_8px_18px_-6px_rgba(16,33,42,.45)]
        ${selected ? 'ring-[3px] ring-[#14A0AE] ring-offset-1 ring-offset-transparent' : ''}
        ${disabled ? 'brightness-[.7] saturate-[.75]' : ''}
        ${className}
      `}
      style={isEvent ? { border: `3px solid ${typeColor}`, background: '#0b1220' } : undefined}
    >
      <img
        src={card.image}
        alt={card.name}
        draggable={false}
        className="h-full w-full object-cover object-center"
        onError={(e) => { e.currentTarget.style.opacity = '0'; }}
      />

      {isEvent && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-1.5 pb-1 pt-4">
          <span
            className="block text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,.6)' }}
          >
            {card.name}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default Card;
