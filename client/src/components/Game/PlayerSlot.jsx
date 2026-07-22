import { motion } from 'framer-motion';
import { ENERGY_TYPES, CARD_TYPES, EVENT_TYPES } from '../../utils/constants';
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

const PLANT_IMAGES = {
  [ENERGY_TYPES.EOLICA]: {
    on: '/assets/plants/eolica-on.png',
    off: '/assets/plants/eolica-off.png',
  },
  [ENERGY_TYPES.SOLAR]: {
    on: '/assets/plants/solar-on.png',
    off: '/assets/plants/solar-off.png',
  },
  [ENERGY_TYPES.GEOTERMICA]: {
    on: '/assets/plants/geotermica-on.png',
    off: '/assets/plants/geotermica-off.png',
  },
  [ENERGY_TYPES.HIDROELECTRICA]: {
    on: '/assets/plants/hidroelectrica-on.png',
    off: '/assets/plants/hidroelectrica-off.png',
  },
};

export default function PlayerSlot({
  slotType,
  slot,
  playerId,
  isMySlot,
  size = 'normal',
  orientation = 'portrait',
  variant = 'opponent'
}) {
  const { selectedCard, setSelectedCard, isMyTurn, specialPlay, clearSpecialPlay, setSpecialPlay } = useGameStore();
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
    if (!isMyTurn) return false;

    if (selectedCard && !specialPlay) {
      if (selectedCard.type === CARD_TYPES.PLANTA)
        return isMySlot && isEmpty;

      if (selectedCard.type === CARD_TYPES.MANTENIMIENTO)
        return isMySlot && !isEmpty;

      if (selectedCard.type === CARD_TYPES.RIESGO)
        return !isMySlot && !isEmpty;

      return false;
    }

    if (specialPlay) {
      const { card, step, pendiente, movimientos} = specialPlay;
      switch (card.subtype) {
        case EVENT_TYPES.COMPRA:
          return !isMySlot && !isEmpty;
        case EVENT_TYPES.INTERCAMBIO_PLANTA:
          if (step === 'origen') return isMySlot && !isEmpty;
          if (step === 'destino') return !isMySlot && !isEmpty;
          return false;
        case EVENT_TYPES.ESPARCIMIENTO:
          if (step === 'origen') {
            return isMySlot && riskCount > 0 && movimientos.find(m => m.origen.slot === slotType) === undefined;
          }
          if (step === 'destino') return !isMySlot && !isEmpty && pendiente.slot === slotType;
          return false;
        default:
          return false;
      }
      return false;
    }
  };

  const clickable = canPlayHere();

  const handleClick = async () => {
    if (!isMyTurn) return;

    if (selectedCard && !specialPlay && clickable) {
      const movements = [{ destino: { jugador: playerId, slot: slotType } }];
      await playCard(selectedCard.id, playerId, movements);
      setSelectedCard(null);
      return;
    }

    //Flujo especial
    if (specialPlay && clickable) {
      const slotRef = { jugador: playerId, slot: slotType };
      const { card, step, movimientos, pendiente } = specialPlay;

      switch (card.subtype) {
        case EVENT_TYPES.COMPRA: {
          await playCard(card.id, playerId, [{ destino: slotRef }]);
          clearSpecialPlay();
          setSelectedCard(null);
          break;
        }
        case EVENT_TYPES.INTERCAMBIO_PLANTA: {
          if (step === 'origen') {
            setSpecialPlay({ ...specialPlay, step: 'destino', pendiente: slotRef });
          } else if (step === 'destino') {
            const movements = [
              { origen: pendiente, destino: slotRef },
            ];
            await playCard(card.id, playerId, movements);
            clearSpecialPlay();
            setSelectedCard(null);
          }
          break;
        }
        case EVENT_TYPES.ESPARCIMIENTO: {
          if (step === 'origen') {
            setSpecialPlay({ ...specialPlay, step: 'destino', pendiente: slotRef });
          } else if (step === 'destino') {
            const nuevosMovimientos = [...movimientos, { origen: pendiente, destino: slotRef }];
            //Vuelve a pedir más virus o el usuario confirma manualmente
            setSpecialPlay({
              ...specialPlay,
              step: 'origen',
              movimientos: nuevosMovimientos,
              pendiente: null,
            });
          }
          break;
        }

      }
    }
  };

  if (variant === 'center') {
    return (
      <motion.div
        onClick={handleClick}
        whileHover={clickable ? { y: -12, zIndex: 50 } : {}}
        animate={
          isDoubleRisk
            ? { opacity: 0.3, filter: 'grayscale(1) brightness(0.5)' }
            : { opacity: 1 }
        }
        transition={{ duration: 0.4 }}
        className={`
          relative w-full h-full
          ${clickable ? 'cursor-pointer' : ''}
        `}
      >
        <img
          src={isActive ? PLANT_IMAGES[slotType].on : PLANT_IMAGES[slotType].off}
          alt={slotType}
          className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
          style={{
            filter: isActive ? 'brightness(1.15)' : 'brightness(0.8)',
          }}
        />

        {clickable && (
          <motion.div
            className="absolute inset-[18%] rounded-2xl ring-4 ring-yellow-400 pointer-events-none"
            animate={{
              opacity: [0.5, 1, 0.5],
              boxShadow: [
                '0 0 0 0px rgba(250,204,21,0.4)',
                '0 0 0 10px rgba(250,204,21,0.1)',
                '0 0 0 0px rgba(250,204,21,0.4)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {(maintenanceCount > 0 || riskCount > 0) && (
          <div className="absolute top-16 right-16 flex gap-1 z-10">
            {maintenanceCount > 0 && (
              <div className="bg-blue-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-xl">
                <Shield size={16} />
              </div>
            )}
            {riskCount > 0 && (
              <div className="bg-red-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-xl">
                <AlertTriangle size={16} />
              </div>
            )}
          </div>
        )}

        {isImmune && (
          <motion.div
            className="absolute inset-[22%] rounded-full pointer-events-none z-20"
            style={{
              transform: 'translateY(40px)',
              boxShadow: `
                0 0 25px rgba(96,165,250,0.9),
                0 0 45px rgba(96,165,250,0.7),
                0 0 70px rgba(96,165,250,0.5)
              `,
            }}
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    );
  }

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
        ${orientation === 'portrait'
          ? 'flex-col items-center justify-center gap-1 p-1.5'
          : 'flex-row items-center justify-start gap-2 px-2'
        }
        ${isActive
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
