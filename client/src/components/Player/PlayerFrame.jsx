import { motion } from 'framer-motion';

export function PlayerFrame({
  player,
  isMe = false,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
}) {
  const isEmpty = player?.isEmpty;
  const isCurrentTurn = player?.isCurrentTurn;

  const isVertical = orientation === 'vertical';

  return (
    <motion.div
      whileHover={!isEmpty ? { scale: 1.02 } : {}}
      className={`
        relative
        flex ${isVertical ? 'flex-col items-center' : 'items-center'}
        gap-1
        px-2 py-[4px]
        transition-all
        ${isEmpty ? 'opacity-40 grayscale' : ''}
      `}
    >
      {/* === AVATAR + NOMBRE === */}
      <div
        className={`
          flex items-center
          gap-1
          ${isVertical ? 'flex-col' : ''}
        `}
      >
        {/* Avatar */}
        <div className="text-xl leading-none">
          {isEmpty ? '👤' : player?.avatar || '🧑'}
        </div>

        {/* Nombre */}
        <div className="font-black text-[13px] text-gray-800 leading-none">
          {isEmpty ? 'Esperando' : player?.name}
          {isMe && !isEmpty && (
            <span className="ml-1 text-[9px] text-emerald-600 font-black">
              (Tú)
            </span>
          )}
        </div>
      </div>

      {/* === MINI BOARD === */}
      {!isEmpty && (
        <div
          className={`
            flex ${isVertical ? 'flex-col' : 'flex-row'}
            gap-[3px] mt-[3px]
          `}
        >
          {(player?.board
            ? Object.values(player.board)
            : new Array(4).fill(null)
          ).map((slot, i) => (
            <div
              key={i}
              className={`
                w-3.5 h-3.5 rounded-sm
                transition-all
                ${slot?.plant
                  ? 'bg-emerald-400/90 shadow-sm'
                  : 'border border-gray-400/40'}
              `}
            />
          ))}
        </div>
      )}

      {/* === TURNO ACTUAL (GLOW) === */}
      {isCurrentTurn && !isEmpty && (
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute -inset-1 rounded-lg "
        />
      )}
    </motion.div>
  );
}

export default PlayerFrame;
