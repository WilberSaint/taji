import { motion } from 'framer-motion';
import { Bot, Crown, User } from 'lucide-react';
import Avatar from '../UI/Avatar';

const PREFIJO_BOT = '[BOT] ';
function quitarPrefijoBot(nombre) {
  const n = String(nombre || '');
  return n.startsWith(PREFIJO_BOT) ? n.slice(PREFIJO_BOT.length) : n;
}

/**
 * Cabecera de un tablero de jugador (usada sobre el panel de vidrio del oponente).
 * Colores fijos claros: vive sobre vidrio traslúcido encima de la foto del tablero.
 */
export function PlayerFrame({ player, isMe = false, isHost = false, orientation = 'horizontal', compacto = false }) {
  const isEmpty = player?.isEmpty;
  const isCurrentTurn = player?.isCurrentTurn;
  const isVertical = orientation === 'vertical';
  const color = player?.color || '#0B7480';

  return (
    <motion.div
      whileHover={!isEmpty ? { scale: 1.02 } : undefined}
      className={`
        relative flex items-center rounded-lg py-1 transition-all
        ${compacto ? 'gap-1 px-1' : 'gap-2 px-2'}
        ${isVertical ? 'flex-col' : ''}
        ${isEmpty ? 'opacity-40 grayscale' : ''}
      `}
      style={
        isCurrentTurn && !isEmpty
          ? { boxShadow: `0 0 0 2px ${color}, 0 0 14px -2px ${color}` }
          : undefined
      }
    >
      {isEmpty ? (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400" style={{ background: 'rgba(255,255,255,0.7)' }}>
          <User size={14} />
        </div>
      ) : (
        <Avatar id={player?.avatar} size={compacto ? 20 : 28} />
      )}

      <div className={`min-w-0 ${isVertical ? 'text-center' : ''}`}>
        <div className={`flex items-center gap-1 truncate font-bold text-slate-800 ${compacto ? 'text-[11px]' : 'text-[13px]'}`}>
          <span className="truncate">{isEmpty ? 'Libre' : (compacto ? quitarPrefijoBot(player?.name) : player?.name)}</span>
          {isMe && !isEmpty && <span className="text-[10px] font-bold" style={{ color: '#0B7480' }}>(tú)</span>}
          {player?.isBot && <Bot size={12} className="shrink-0 text-slate-500" />}
          {isHost && !isEmpty && <Crown size={12} className="shrink-0" style={{ color: '#DF9A34' }} />}
        </div>
      </div>
    </motion.div>
  );
}

export default PlayerFrame;
