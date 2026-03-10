import { motion } from 'framer-motion';
import { ENERGY_TYPES, CARD_TYPES } from '../../utils/constants';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import {
  Sun,
  Wind,
  Waves,
  Flame,
  AlertTriangle,
  Shield
} from 'lucide-react';

/* ================= ICONOS ================= */
const ENERGY_ICONS = {
  [ENERGY_TYPES.SOLAR]: <Sun className="w-4 h-4" />,
  [ENERGY_TYPES.EOLICA]: <Wind className="w-4 h-4" />,
  [ENERGY_TYPES.HIDROELECTRICA]: <Waves className="w-4 h-4" />,
  [ENERGY_TYPES.GEOTERMICA]: <Flame className="w-4 h-4" />
};

/* ================= LABELS ================= */
const ENERGY_LABELS = {
  [ENERGY_TYPES.SOLAR]: 'SOLAR',
  [ENERGY_TYPES.EOLICA]: 'EÓLICA',
  [ENERGY_TYPES.HIDROELECTRICA]: 'HIDRO',
  [ENERGY_TYPES.GEOTERMICA]: 'GEOTÉRMICA'
};

/* ================= COLORES ================= */
const ENERGY_ACTIVE = {
  [ENERGY_TYPES.SOLAR]:
    'from-yellow-400 to-amber-500 shadow-yellow-400/40',
  [ENERGY_TYPES.EOLICA]:
    'from-cyan-400 to-sky-500 shadow-cyan-400/40',
  [ENERGY_TYPES.HIDROELECTRICA]:
    'from-blue-500 to-indigo-600 shadow-blue-500/40',
  [ENERGY_TYPES.GEOTERMICA]:
    'from-orange-400 to-red-500 shadow-orange-400/40'
};

const ENERGY_INACTIVE =
  'from-slate-700/40 to-slate-800/60 border-sky-400/30';

/* ================= TAMAÑOS AJUSTADOS ================= */
/* Más compactos para evitar invasión vertical */
const SIZE_CLASSES = {
  portrait: {
    tiny: 'w-[55px] aspect-[3/4]',
    small: 'w-[65px] aspect-[3/4]',
    normal: 'w-[75px] aspect-[3/4]',
    large: 'w-[85px] aspect-[3/4]'
  },
  landscape: {
    tiny: 'h-[55px] aspect-[4/3]',
    small: 'h-[65px] aspect-[4/3]',
    normal: 'h-[75px] aspect-[4/3]',
    large: 'h-[85px] aspect-[4/3]'
  }
};

export default function PlayerSlot({
  slotType,
  slot,
  playerId,
  isMySlot,
  size = 'normal',
  orientation = 'portrait'
}) {
  const { selectedCard, setSelectedCard, isMyTurn } = useGameStore();
  const { playCard } = useSocket();

  const isEmpty = !slot?.plant;
  const isActive = !!slot?.plant;

  const maintenanceCount =
    slot?.modifiers?.filter(m => m.type === CARD_TYPES.MANTENIMIENTO)
      .length || 0;

  const riskCount =
    slot?.modifiers?.filter(m => m.type === CARD_TYPES.RIESGO).length || 0;

  const isImmune = maintenanceCount === 2;
  const isDoubleRisk = riskCount === 2;

  const canPlayHere = () => {
    if (!selectedCard || !isMyTurn) return false;

    if (selectedCard.type === CARD_TYPES.PLANTA)
      return isMySlot && isEmpty;

    if (selectedCard.type === CARD_TYPES.MANTENIMIENTO)
      return isMySlot && !isEmpty;

    if (selectedCard.type === CARD_TYPES.RIESGO)
      return !isMySlot && !isEmpty;

    return false;
  };

  const clickable = canPlayHere();

  const handleClick = async () => {
    if (!clickable || !selectedCard) return;
    await playCard(selectedCard.id, playerId, slotType);
    setSelectedCard(null);
  };

  return (
    <motion.div
      onClick={handleClick}
      whileHover={clickable ? { scale: 1.05 } : {}}
      animate={
        isDoubleRisk
          ? { opacity: 0.3, filter: 'grayscale(1) brightness(0.5)' }
          : { opacity: 1 }
      }
      transition={{ duration: 0.4 }}
      className={`
        relative
        ${SIZE_CLASSES[orientation][size]}
        rounded-lg
        border
        bg-gradient-to-br
        transition-all
        flex
        ${
          orientation === 'portrait'
            ? 'flex-col items-center justify-center gap-1 p-1.5'
            : 'flex-row items-center justify-start gap-2 px-2'
        }
        ${
          isActive
            ? `${ENERGY_ACTIVE[slotType]} border-white/40 shadow-md`
            : ENERGY_INACTIVE
        }
        ${clickable ? 'cursor-pointer ring-2 ring-yellow-300' : ''}
      `}
    >
      {/* ICONO */}
      <div className={isActive ? 'text-white' : 'text-white/40'}>
        {ENERGY_ICONS[slotType]}
      </div>

      {/* TEXTO */}
      <span
        className={`
          font-black uppercase tracking-wider text-center
          text-[8px]
          ${isActive ? 'text-white' : 'text-white/50'}
        `}
      >
        {ENERGY_LABELS[slotType]}
      </span>

      {/* MODIFICADORES */}
      {(maintenanceCount > 0 || riskCount > 0) && (
        <div className="absolute bottom-1 right-1 flex gap-1 z-20">
          {maintenanceCount > 0 && (
            <div className="bg-blue-500 p-[2px] rounded-full border border-white shadow">
              <Shield size={8} />
            </div>
          )}
          {riskCount > 0 && (
            <div className="bg-red-500 p-[2px] rounded-full border border-white shadow">
              <AlertTriangle size={8} />
            </div>
          )}
        </div>
      )}

      {/* INMUNE OVERLAY */}
      {isImmune && (
        <div className="
          absolute inset-0
          flex flex-col items-center justify-center
          bg-blue-500/20
          backdrop-blur-[1px]
          rounded-lg
          z-30
          pointer-events-none
        ">
          <Shield className="w-6 h-6 text-white/80" />
          <span className="text-[8px] font-black text-white tracking-widest mt-1">
            INMUNE
          </span>
        </div>
      )}
    </motion.div>
  );
}
