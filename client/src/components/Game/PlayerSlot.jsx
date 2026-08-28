import { motion } from 'framer-motion';
import { ENERGY_TYPES, CARD_TYPES, EVENT_TYPES } from '../../utils/constants';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Sun, Wind, Waves, Flame, AlertTriangle, Shield } from 'lucide-react';

/* ================= ENERGÍA (colores fijos: el tablero es su propio mundo) ================= */
const ENERGY = {
  [ENERGY_TYPES.SOLAR]: { color: '#DF9A34', Icon: Sun, label: 'Solar' },
  [ENERGY_TYPES.EOLICA]: { color: '#4F9FD2', Icon: Wind, label: 'Eólica' },
  [ENERGY_TYPES.HIDROELECTRICA]: { color: '#3A6AAE', Icon: Waves, label: 'Hidro' },
  [ENERGY_TYPES.GEOTERMICA]: { color: '#C55C3C', Icon: Flame, label: 'Geo' },
};

const SHIELD_COLOR = '#3C79BE';
const RISK_COLOR = '#C94A40';
const TARGET_COLOR = '#F5C042';

const SIZE_CLASSES = {
  portrait: {
    small: 'w-[58px] aspect-[3/4]',
    normal: 'w-[70px] aspect-[3/4]',
  },
  landscape: {
    small: 'h-[58px] aspect-[4/3]',
    normal: 'h-[70px] aspect-[4/3]',
  },
};

const PLANT_IMAGES = {
  [ENERGY_TYPES.EOLICA]: { on: '/assets/plants/eolica-on.png', off: '/assets/plants/eolica-off.png' },
  [ENERGY_TYPES.SOLAR]: { on: '/assets/plants/solar-on.png', off: '/assets/plants/solar-off.png' },
  [ENERGY_TYPES.GEOTERMICA]: { on: '/assets/plants/geotermica-on.png', off: '/assets/plants/geotermica-off.png' },
  [ENERGY_TYPES.HIDROELECTRICA]: { on: '/assets/plants/hidroelectrica-on.png', off: '/assets/plants/hidroelectrica-off.png' },
};

export default function PlayerSlot({
  slotType,
  slot,
  playerId,
  isMySlot,
  size = 'normal',
  orientation = 'portrait',
  variant = 'opponent',
}) {
  const { selectedCard, setSelectedCard, isMyTurn, specialPlay, clearSpecialPlay, setSpecialPlay } = useGameStore();
  const { playCard } = useSocket();

  const isEmpty = !slot?.plant;
  const isActive = !!slot?.plant;

  const maintenanceCount =
    slot?.modifiers?.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length || 0;

  const riskCount =
    slot?.modifiers?.filter((m) => m.type === CARD_TYPES.RIESGO).length || 0;

  const isImmune = maintenanceCount === 2;
  const isDoubleRisk = riskCount === 2;

  const energy = ENERGY[slotType] || ENERGY[ENERGY_TYPES.SOLAR];

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
      const { card, step, pendiente, movimientos } = specialPlay;
      switch (card.subtype) {
        case EVENT_TYPES.COMPRA:
          return !isMySlot && !isEmpty;
        case EVENT_TYPES.INTERCAMBIO_PLANTA:
          if (step === 'origen') return isMySlot && !isEmpty;
          if (step === 'destino') return !isMySlot && !isEmpty;
          return false;
        case EVENT_TYPES.ESPARCIMIENTO:
          if (step === 'origen') {
            return isMySlot && riskCount > 0 && movimientos.find((m) => m.origen.slot === slotType) === undefined;
          }
          if (step === 'destino') return !isMySlot && !isEmpty && pendiente.slot === slotType;
          return false;
        default:
          return false;
      }
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

  /* ================= ESTADO (badges) ================= */
  const StateBadges = ({ big = false }) => {
    if (!isActive || (maintenanceCount === 0 && riskCount === 0)) return null;
    const s = big ? 14 : 9;
    return (
      <div className={`absolute ${big ? '-top-1.5 -right-1.5' : '-top-1 -right-1'} flex items-center gap-0.5`}>
        {isImmune ? (
          <span
            className="grid place-items-center rounded-full border border-white text-white shadow"
            style={{ background: SHIELD_COLOR, width: s + 6, height: s + 6 }}
          >
            <Shield size={s} />
          </span>
        ) : (
          <>
            {maintenanceCount > 0 && (
              <span
                className="grid place-items-center rounded-full border border-white text-white shadow"
                style={{ background: SHIELD_COLOR, width: s + 4, height: s + 4 }}
              >
                <Shield size={s - 1} />
              </span>
            )}
            {riskCount > 0 && (
              <span
                className="grid place-items-center rounded-full border border-white text-white shadow"
                style={{ background: RISK_COLOR, width: s + 4, height: s + 4 }}
              >
                <AlertTriangle size={s - 1} />
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  /* ================= VARIANTE CENTRO (mi tablero) ================= */
  if (variant === 'center') {
    return (
      <motion.div
        onClick={handleClick}
        whileHover={clickable ? { y: -10 } : undefined}
        animate={isDoubleRisk ? { opacity: 0.3, filter: 'grayscale(1) brightness(0.5)' } : { opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`relative h-full w-full ${clickable ? 'cursor-pointer' : ''}`}
      >
        <img
          src={isActive ? PLANT_IMAGES[slotType].on : PLANT_IMAGES[slotType].off}
          alt={energy.label}
          draggable={false}
          className="h-full w-full object-contain drop-shadow-xl pointer-events-none"
          style={{ filter: isActive ? 'brightness(1.08)' : 'brightness(0.78) saturate(0.7)' }}
        />

        {clickable && (
          <motion.div
            className="pointer-events-none absolute inset-[16%] rounded-2xl"
            style={{ boxShadow: `0 0 0 3px ${TARGET_COLOR}` }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        {isImmune && (
          <motion.div
            className="pointer-events-none absolute inset-[24%] rounded-full"
            style={{ boxShadow: `0 0 22px 4px ${SHIELD_COLOR}` }}
            animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.95, 1.04, 0.95] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <StateBadges big />
      </motion.div>
    );
  }

  /* ================= VARIANTE OPONENTE (chip de energía) ================= */
  const sizeClass = SIZE_CLASSES[orientation]?.[size] || SIZE_CLASSES.portrait.normal;
  const landscape = orientation === 'landscape';
  const iconPx = size === 'small' ? 13 : 16;

  return (
    <motion.div
      onClick={handleClick}
      whileHover={clickable ? { scale: 1.06 } : undefined}
      animate={isDoubleRisk ? { opacity: 0.25, filter: 'grayscale(1)' } : { opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={`
        relative flex ${sizeClass} items-center justify-center rounded-lg border transition-colors
        ${landscape ? 'flex-row gap-1.5 px-1.5' : 'flex-col gap-0.5 p-1'}
        ${isActive ? 'bg-white/92 border-2' : 'bg-white/10 border border-white/25'}
        ${clickable ? 'cursor-pointer' : ''}
      `}
      style={{
        borderColor: isActive ? energy.color : undefined,
        boxShadow: clickable ? `0 0 0 2px ${TARGET_COLOR}` : undefined,
      }}
    >
      <energy.Icon
        size={iconPx}
        className="shrink-0"
        style={{ color: isActive ? energy.color : 'rgba(255,255,255,0.5)' }}
      />
      <span
        className="text-[7px] font-bold uppercase leading-none tracking-wide"
        style={{ color: isActive ? '#334155' : 'rgba(255,255,255,0.55)' }}
      >
        {energy.label}
      </span>

      <StateBadges />

      {isImmune && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ boxShadow: `inset 0 0 0 2px ${SHIELD_COLOR}` }}
        />
      )}
    </motion.div>
  );
}
