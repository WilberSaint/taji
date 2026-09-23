import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw, Check, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Avatar from '../UI/Avatar';

const ENERGIAS = [
  { tipo: 'solar', etiqueta: 'Solar', cvar: '--solar' },
  { tipo: 'eolica', etiqueta: 'Eólica', cvar: '--wind' },
  { tipo: 'hidroelectrica', etiqueta: 'Hidro', cvar: '--hydro' },
  { tipo: 'geotermica', etiqueta: 'Geo', cvar: '--geo' },
];

/* Antes las etiquetas salían de ENERGY_NAMES recortado a 5 letras y se leía
   "EÓLIC" y "GEOTÉ". Estos nombres cortos ya caben enteros. */

function ResumenRed({ board, titulo, apagado = false }) {
  if (!board) return null;
  const completas = ENERGIAS.filter(({ tipo }) => !!board[tipo]?.plant).length;

  return (
    <div>
      <p className="mb-2 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        {titulo}
        <span className="rounded-full px-1.5 py-0.5" style={{ background: 'var(--surface-2)' }}>
          {completas}/4
        </span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {ENERGIAS.map(({ tipo, etiqueta, cvar }) => {
          const activa = !!board[tipo]?.plant;
          return (
            <div
              key={tipo}
              className="flex flex-col items-center gap-1 rounded-[var(--r-md)] border p-2 text-center"
              style={{
                background: activa && !apagado ? `color-mix(in srgb, var(${cvar}) 14%, transparent)` : 'var(--surface-2)',
                borderColor: activa && !apagado ? `color-mix(in srgb, var(${cvar}) 45%, transparent)` : 'var(--line)',
                opacity: apagado ? 0.75 : 1,
              }}
            >
              <span
                className="text-[10px] font-mono font-semibold uppercase tracking-wider"
                style={{ color: activa ? `var(${cvar})` : 'var(--ink-faint)' }}
              >
                {etiqueta}
              </span>
              {activa ? <Check size={16} /> : <Minus size={16} className="opacity-50" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VictoryModal({ isOpen, winner, onClose, onNewGame, isWinner, miTablero }) {
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

  /* Ganar y perder eran la misma tarjeta con otro título y otro ícono: se
     sentían igual. Ahora cada una tiene su franja de color arriba, su
     contenido y su remate. */
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnBackdrop={false} showClose={false}>
      <div className="text-center">
        {/* Franja de color: es lo primero que se ve y ya dice cómo te fue */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mx-auto mb-5 h-1.5 w-full rounded-full"
          style={{
            background: isWinner
              ? 'linear-gradient(90deg, var(--solar), var(--success), var(--accent-bright))'
              : 'var(--line-strong)',
          }}
        />

        {isWinner ? (
          <>
            <motion.div
              initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full"
              style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
            >
              <Trophy size={40} />
            </motion.div>

            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
              Completaste tu red
            </p>
            <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight">
              ¡Victoria!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Solar, eólica, hidroeléctrica y geotérmica funcionando a la vez, sin un solo
              riesgo encima. Tu comunidad quedó con luz.
            </p>

            <div className="mt-6">
              <ResumenRed board={winner?.board} titulo="Tu red" />
            </div>
          </>
        ) : (
          <>
            {/* Al perder lo importante es QUIÉN ganó y QUÉ TAN CERCA quedaste.
                Por eso manda el avatar del ganador y se enseñan las dos redes,
                no solo la suya: así la derrota dice algo. */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
              className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full border-2"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line-strong)' }}
            >
              <Avatar id={winner?.avatar} size={44} />
            </motion.div>

            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
              Fin de la partida
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
              Ganó {winner?.name || 'otro jugador'}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Conectó las cuatro fuentes sin riesgos antes que tú. En la próxima, guarda un
              mantenimiento para cuando te ataquen.
            </p>

            <div className="mt-6 space-y-4">
              <ResumenRed board={winner?.board} titulo={`Red de ${winner?.name || 'quien ganó'}`} />
              {miTablero && <ResumenRed board={miTablero} titulo="Tu red" apagado />}
            </div>
          </>
        )}

        <div className="mt-7 flex gap-3">
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
