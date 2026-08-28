import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw, Sparkles, Check, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Avatar from '../UI/Avatar';
import { ENERGY_NAMES } from '../../utils/constants';

const ENERGY_VARS = {
  solar: '--solar',
  eolica: '--wind',
  hidroelectrica: '--hydro',
  geotermica: '--geo',
};

function BoardSummary({ board }) {
  if (!board) return null;

  return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(board).map(([type, slot]) => {
        const cvar = ENERGY_VARS[type] || '--primary';
        const active = !!slot?.plant;
        return (
          <div
            key={type}
            className="flex flex-col items-center gap-1 rounded-[var(--r-md)] border p-2 text-center"
            style={{
              background: active ? `color-mix(in srgb, var(${cvar}) 14%, transparent)` : 'var(--surface-2)',
              borderColor: active ? `color-mix(in srgb, var(${cvar}) 45%, transparent)` : 'var(--line)',
            }}
          >
            <span
              className="text-[10px] font-mono font-semibold uppercase tracking-wider"
              style={{ color: active ? `var(${cvar})` : 'var(--ink-faint)' }}
            >
              {(ENERGY_NAMES[type] || type).slice(0, 5)}
            </span>
            {active ? <Check size={16} /> : <Minus size={16} className="opacity-50" />}
          </div>
        );
      })}
    </div>
  );
}

export function VictoryModal({ isOpen, winner, onClose, onNewGame, isWinner }) {
  useEffect(() => {
    if (!isOpen || !isWinner) return;

    const end = Date.now() + 2200;
    let raf;
    const frame = () => {
      confetti({
        particleCount: 2,
        spread: 75,
        angle: 90,
        origin: { x: 0.5, y: 0.25 },
        colors: ['#DF9A34', '#4F9FD2', '#3B9668', '#C55C3C'],
      });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => raf && cancelAnimationFrame(raf);
  }, [isOpen, isWinner]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      closeOnBackdrop={false}
      showClose={false}
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full"
          style={{
            background: isWinner ? 'var(--success-soft)' : 'var(--surface-2)',
            color: isWinner ? 'var(--success)' : 'var(--ink-soft)',
          }}
        >
          {isWinner ? <Trophy size={32} /> : <Sparkles size={28} />}
        </motion.div>

        <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
          {isWinner ? 'Completaste tu red' : 'Fin de la partida'}
        </p>
        <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          {isWinner ? '¡Victoria!' : `Ganó ${winner?.name || 'otro jugador'}`}
        </h2>

        {!isWinner && winner?.name && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-ink-soft">
            {winner.avatar && <Avatar id={winner.avatar} size={20} />}
            {winner.name} conectó las cuatro fuentes sin riesgos.
          </p>
        )}
        {isWinner && (
          <p className="mt-2 text-sm text-ink-soft">
            Solar, eólica, hidroeléctrica y geotérmica: red limpia y estable.
          </p>
        )}

        {winner?.board && (
          <div className="mt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Red ganadora
            </p>
            <BoardSummary board={winner.board} />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} icon={<Home size={18} />}>
            Volver al lobby
          </Button>
          {onNewGame && (
            <Button fullWidth onClick={onNewGame} icon={<RotateCcw size={18} />}>
              Revancha
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default VictoryModal;
