import { motion } from 'framer-motion';
import {
  CARD_TYPE_COLORS,
  ENERGY_COLORS,
  ENERGY_ICONS,
  ENERGY_NAMES
} from '../../utils/constants';

export function Card({
  card,
  size = 'normal',
  variant = 'default',
  onClick,
  selected = false,
  disabled = false,
  faceDown = false,
  className = ''
}) {
  const sizes = {
    small: 'w-20 h-26',
    normal: 'w-36 h-50',
    large: 'w-44 h-64'
  };

  const borderColor = CARD_TYPE_COLORS[card.type] || '#2ecc71';
  const energyColor = ENERGY_COLORS[card.subtype] || borderColor;
  const isSlot = variant === 'slot';

  return (
<motion.div
  className={`
    ${sizes[size]}
    relative
    overflow-hidden
    transition-all
    ${isSlot ? '' : 'rounded-2xl bg-white shadow-xl'}
    ${selected && !isSlot ? 'ring-4 ring-yellow-400' : ''}
    ${disabled ? 'opacity-50 grayscale' : ''}
    ${className}
  `}
  style={!isSlot ? { borderWidth: '4px', borderColor } : {}}
>
      {/* HEADER */}
      {!isSlot && (
  <div
    className={`
      flex items-center justify-center text-white font-bold text-center
      ${size === 'small' ? 'h-5 text-[8px]' : 'h-9 text-[10px]'}
    `}
    style={{ backgroundColor: energyColor }}
  >
    {card.name}
  </div>
)}

      {/* ILUSTRACIÓN */}
<div
  className={`
    ${isSlot
      ? 'absolute inset-0'
      : 'flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50'}
  `}
>
  <img
    src={card.image}
    alt={card.name}
    className={`
      w-full h-full
      ${isSlot ? 'object-cover' : 'object-contain scale-x-[1.06]'}
    `}
    onError={(e) => (e.target.style.display = 'none')}
  />
</div>
    </motion.div>
  );
}

export default Card;
