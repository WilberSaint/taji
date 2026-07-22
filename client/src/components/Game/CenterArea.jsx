import { ENERGY_TYPES } from '../../utils/constants';
import PlayerSlot from './PlayerSlot';

/* ================= POSICIONES RELATIVAS ================= */
const PLANT_POSITIONS = {
  [ENERGY_TYPES.EOLICA]: {
    left: '10%',
    top: '53%',
    transform: 'translateY(-50%)',
  },
  [ENERGY_TYPES.SOLAR]: {
    left: '50%',
    top: '10%',
    transform: 'translateX(-50%)',
  },
  [ENERGY_TYPES.GEOTERMICA]: {
    right: '10%',
    top: '57%',
    transform: 'translateY(-50%)',
  },
  [ENERGY_TYPES.HIDROELECTRICA]: {
    left: '51%',
    bottom: '-4%',
    transform: 'translateX(-50%)',
  },
};

/* ================= TAMAÑOS (NO POSICIÓN) ================= */
const PLANT_SIZES = {
  [ENERGY_TYPES.EOLICA]: 'w-[32%] aspect-square z-20',
  [ENERGY_TYPES.SOLAR]: 'w-[32%] aspect-square',
  [ENERGY_TYPES.GEOTERMICA]: 'w-[32%] aspect-square',
  [ENERGY_TYPES.HIDROELECTRICA]: 'w-[33%] aspect-square',
};

const ENERGY_TYPES_LIST = [
  ENERGY_TYPES.EOLICA,
  ENERGY_TYPES.SOLAR,
  ENERGY_TYPES.GEOTERMICA,
  ENERGY_TYPES.HIDROELECTRICA,
];

export default function CenterArea({ currentPlayer }) {
  if (!currentPlayer) return null;

  return (
    <div
      className="
        relative
        w-[45%]
        max-w-[680px]
        aspect-[11/7]
        -translate-y-6
      "
    >
      {/* Fondo */}
      <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm border-2 border-white/10" />

      {/* Plantas */}
      {ENERGY_TYPES_LIST.map((slotType) => (
        <div
          key={slotType}
          className={`absolute ${PLANT_SIZES[slotType]}`}
          style={PLANT_POSITIONS[slotType]}
        >
          <PlayerSlot
            variant="center"
            slotType={slotType}
            slot={currentPlayer.board[slotType]}
            playerId={currentPlayer.id}
            isMySlot={true}
          />
        </div>
      ))}
    </div>
  );
}
