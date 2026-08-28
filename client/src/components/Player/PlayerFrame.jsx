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
        <div className="font-black text-[13px] text-slate-200 leading-none">
          {isEmpty ? 'Esperando' : player?.name}
          {isMe && !isEmpty && (
            <span className="ml-1 text-[9px] text-emerald-600 font-black">
              (Tú)
            </span>
          )}
        </div>
      </div>

      {/* === TURNO ACTUAL (GLOW) === */}
      {isCurrentTurn && !isEmpty && (
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute -inset-1 rounded-lg"
        />
      )}
    </motion.div>
  );
}

export default PlayerFrame;
