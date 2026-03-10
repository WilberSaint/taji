import { motion, AnimatePresence } from 'framer-motion';
import Button from '../UI/Button';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export function VictoryModal({ isOpen, winner, onClose, onNewGame, isWinner }) {

  useEffect(() => {
    if (isOpen && isWinner) {
      const end = Date.now() + 2500;

      const frame = () => {
        confetti({
          particleCount: 2,
          spread: 70,
          angle: 90,
          origin: { x: 0.5, y: 0.2 },
          colors: ['#facc15', '#22c55e', '#4ade80']
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };

      frame();
    }
  }, [isOpen, isWinner]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="
              relative w-full max-w-md
              rounded-[2.5rem]
              bg-slate-900/80 backdrop-blur-xl
              border-2 border-white/20
              shadow-2xl
              p-6
              text-white
            "
          >

            {/* TROFEO */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex justify-center mb-3"
            >
              <div className="relative">
                <Trophy size={72} className="text-yellow-400 drop-shadow-lg" />
                <div className="absolute inset-0 blur-xl bg-yellow-400/30 rounded-full" />
              </div>
            </motion.div>

            {/* TITULO */}
            <h2 className="text-center text-3xl font-black tracking-tight mb-1">
              {isWinner ? '¡VICTORIA!' : 'FIN DEL JUEGO'}
            </h2>

            {/* GANADOR */}
            <div className="text-center mb-4">
              <div className="text-sm uppercase tracking-widest text-white/60">
                {isWinner ? 'Has ganado' : 'Ganador'}
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {winner?.name || 'Jugador'}
              </div>
              {winner?.avatar && (
                <div className="text-5xl mt-1">{winner.avatar}</div>
              )}
            </div>

            {/* TABLERO FINAL */}
            {winner?.board && (
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-widest text-center text-white/50 mb-2">
                  Tablero Final
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(winner.board).map(([type, slot]) => (
                    <div
                      key={type}
                      className={`
                        h-14 rounded-xl border
                        flex items-center justify-center
                        text-xs font-bold uppercase
                        ${slot.plant
                          ? 'bg-emerald-500/20 border-emerald-400'
                          : 'bg-white/5 border-white/20'}
                      `}
                    >
                      {type.slice(0, 3)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MENSAJE */}
            <div className="text-center text-sm text-white/70 mb-6">
              {isWinner
                ? 'Completaste tu red de energía sin riesgos.'
                : 'Gran partida. La próxima será tuya.'}
            </div>

            {/* ACCIONES */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={onClose}
                icon={<Home size={18} />}
              >
                Lobby
              </Button>

              {onNewGame && (
                <Button
                  fullWidth
                  onClick={onNewGame}
                  icon={<RotateCcw size={18} />}
                >
                  Revancha
                </Button>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VictoryModal;
