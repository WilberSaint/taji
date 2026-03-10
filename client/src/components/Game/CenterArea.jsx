import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { ENERGY_TYPES, CARD_TYPES } from '../../utils/constants';
import { Shield, AlertTriangle } from 'lucide-react';

/* ================= POSICIONES RELATIVAS ================= */
const PLANT_POSITIONS = {
  [ENERGY_TYPES.EOLICA]: {
    left: '4%',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  [ENERGY_TYPES.SOLAR]: {
    left: '50%',
    top: '-6%',
    transform: 'translateX(-50%)',
  },
  [ENERGY_TYPES.GEOTERMICA]: {
    right: '4%',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  [ENERGY_TYPES.HIDROELECTRICA]: {
    left: '50%',
    bottom: '-14%',
    transform: 'translateX(-50%)',
  },
};

/* ================= TAMAÑOS (NO POSICIÓN) ================= */
const PLANT_SIZES = {
  [ENERGY_TYPES.EOLICA]: 'w-[38%] aspect-square',
  [ENERGY_TYPES.SOLAR]: 'w-[38%] aspect-square',
  [ENERGY_TYPES.GEOTERMICA]: 'w-[38%] aspect-square',
  [ENERGY_TYPES.HIDROELECTRICA]: 'w-[56%] aspect-[4/3]',
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

export default function CenterArea({ currentPlayer }) {
  const { selectedCard, setSelectedCard, isMyTurn } = useGameStore();
  const { playCard } = useSocket();

  if (!currentPlayer) return null;

  const handleSlotClick = async (slotType) => {
    if (!selectedCard || !isMyTurn) return;

    const slot = currentPlayer.board[slotType];
    const maintenanceCount =
      slot?.modifiers?.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length || 0;

    const canPlay =
      (selectedCard.type === CARD_TYPES.PLANTA && !slot?.plant) ||
      (selectedCard.type === CARD_TYPES.MANTENIMIENTO &&
        slot?.plant &&
        maintenanceCount < 2);

    if (!canPlay) return;

    try {
      await playCard(selectedCard.id, currentPlayer.id, slotType);
      setSelectedCard(null);
    } catch (err) {
      console.error('❌ Error al jugar:', err.message);
    }
  };

  const energyTypes = [
    ENERGY_TYPES.EOLICA,
    ENERGY_TYPES.SOLAR,
    ENERGY_TYPES.GEOTERMICA,
    ENERGY_TYPES.HIDROELECTRICA,
  ];

  return (
    <div
  className="
    relative
    w-[45%]
    max-w-[620px]
    aspect-[3/2]
  "
    >
      {/* Fondo */}
      <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm border-2 border-white/20" />

      {/* Plantas */}
      {energyTypes.map((slotType) => {
        const slot = currentPlayer.board[slotType];
        const hasPlant = !!slot?.plant;
        const maintenanceCount =
          slot?.modifiers?.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length || 0;
        const riskCount =
          slot?.modifiers?.filter((m) => m.type === CARD_TYPES.RIESGO).length || 0;

        const isClickable =
          selectedCard &&
          isMyTurn &&
          ((selectedCard.type === CARD_TYPES.PLANTA && !hasPlant) ||
            (selectedCard.type === CARD_TYPES.MANTENIMIENTO &&
              hasPlant &&
              maintenanceCount < 2));

        return (
          <div
            key={slotType}
            className={`absolute ${PLANT_SIZES[slotType]} ${
              isClickable ? 'cursor-pointer' : ''
            }`}
            style={PLANT_POSITIONS[slotType]}
            onClick={() => isClickable && handleSlotClick(slotType)}
          >
            {/* Imagen */}
            <img
              src={
                hasPlant
                  ? PLANT_IMAGES[slotType].on
                  : PLANT_IMAGES[slotType].off
              }
              alt={slotType}
              className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
              style={{
                filter: hasPlant
                  ? 'brightness(1.15) contrast(1.1)'
                  : 'brightness(0.6) grayscale(0.6) opacity(0.75)',
              }}
            />

            {/* Ring clickeable */}
            {isClickable && (
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

            {/* Modificadores */}
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

            {/* Inmunidad */}
            {maintenanceCount === 2 && (
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
          </div>
        );
      })}
    </div>
  );
}
