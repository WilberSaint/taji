import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';

/** Píldora de turno, flota sobre el tablero (fondo oscuro → texto claro). */
export default function TurnIndicator() {
  const { gameState, socketId } = useGameStore();

  if (!gameState || !gameState.currentPlayerId) return null;

  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId);
  if (!currentPlayer) return null;

  const isMyTurn = gameState.currentPlayerId === socketId;

  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur-md"
      style={
        isMyTurn
          ? { background: 'rgba(20,160,174,0.22)', borderColor: 'rgba(47,176,190,0.55)', color: '#CFF3F5' }
          : { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: '#E7ECEF' }
      }
      animate={{ scale: isMyTurn ? [1, 1.04, 1] : 1 }}
      transition={{ duration: isMyTurn ? 0.7 : 0, repeat: isMyTurn ? Infinity : 0, repeatDelay: 0.5 }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: isMyTurn ? '#2FB0BE' : currentPlayer.color || '#94A3B8' }}
      />
      <span>{isMyTurn ? 'Tu turno' : `Turno de ${currentPlayer.name}`}</span>
    </motion.div>
  );
}
