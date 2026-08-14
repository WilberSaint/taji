import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';

export default function TurnIndicator() {
  const { gameState, socketId } = useGameStore();

  if (!gameState || !gameState.currentPlayerId) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
  if (!currentPlayer) return null;

  const isMyTurn = gameState.currentPlayerId === socketId;

  return (
    <motion.div
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border ${
        isMyTurn
          ? 'bg-green-500/20 text-green-200 border-green-400/50'
          : 'bg-blue-500/20 text-blue-200 border-blue-400/50'
      }`}
      animate={{
        scale: isMyTurn ? [1, 1.05, 1] : 1,
      }}
      transition={{
        duration: isMyTurn ? 0.6 : 0,
        repeat: isMyTurn ? Infinity : 0,
        repeatDelay: 0.4,
      }}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isMyTurn ? 'bg-green-400' : 'bg-blue-400'
        }`}
      />
      <span>
        {isMyTurn ? '🎮 Tu turno' : `Turno: ${currentPlayer.name}`}
      </span>
    </motion.div>
  );
}
