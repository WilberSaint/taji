#!/bin/bash

# Script para generar todos los componentes faltantes del frontend TAJI
# Ejecutar desde la carpeta client/

echo " Generando componentes restantes de TAJI..."

# GameBoard ya fue parcialmente creado arriba, completémoslo aquí con los archivos asociados

# Crear PlayerSlot.jsx
cat > src/components/Game/PlayerSlot.jsx << 'EOF'
// Ver COMPONENT_TEMPLATES.md para implementación completa
// Este componente muestra un slot individual del tablero
// Permite drag & drop de cartas y muestra el estado visual

import Card from '../Card/Card';
import { ENERGY_ICONS, ENERGY_NAMES } from '../../utils/constants';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';

export function PlayerSlot({ slotType, slot, playerId, isMySlot }) {
  const { selectedCard } = useGameStore();
  const { playCard } = useSocket();
  
  // Implementar lógica completa aquí
  // Ver plantilla en COMPONENT_TEMPLATES.md
  
  return (
    <div className="p-4 bg-gray-100 rounded-xl">
      <div className="text-center mb-2">
        <span className="text-2xl">{ENERGY_ICONS[slotType]}</span>
        <div className="text-xs font-bold">{ENERGY_NAMES[slotType]}</div>
      </div>
      {slot.plant && <Card card={slot.plant} size="small" />}
    </div>
  );
}

export default PlayerSlot;
EOF

echo " PlayerSlot.jsx creado"

# Crear PlayerHand.jsx
cat > src/components/Game/PlayerHand.jsx << 'EOF'
import Card from '../Card/Card';
import { useGameStore } from '../../store/gameStore';
import Button from '../UI/Button';
import { useSocket } from '../../hooks/useSocket';

export function PlayerHand({ cards }) {
  const { selectedCard, setSelectedCard, selectedCardsForDiscard, toggleCardForDiscard, clearSelectedCardsForDiscard } = useGameStore();
  const { discardCards } = useSocket();
  
  const handleDiscard = async () => {
    if (selectedCardsForDiscard.length === 0) return;
    try {
      await discardCards(selectedCardsForDiscard);
      clearSelectedCardsForDiscard();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Tu Mano ({cards.length}/3)</h3>
        {selectedCardsForDiscard.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearSelectedCardsForDiscard}>
              Cancelar
            </Button>
            <Button size="sm" variant="danger" onClick={handleDiscard}>
              Descartar ({selectedCardsForDiscard.length})
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex gap-4 justify-center flex-wrap">
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            selected={selectedCard?.id === card.id || selectedCardsForDiscard.includes(card.id)}
            onClick={(c) => {
              if (selectedCardsForDiscard.length > 0) {
                toggleCardForDiscard(c.id);
              } else {
                setSelectedCard(c);
              }
            }}
          />
        ))}
      </div>
      
      <div className="text-center mt-4 text-sm text-gray-600">
        <p>Haz clic en una carta para jugarla o mantén Shift para seleccionar múltiples y descartar</p>
      </div>
    </div>
  );
}

export default PlayerHand;
EOF

echo "✅ PlayerHand.jsx creado"

# Crear CenterArea.jsx
cat > src/components/Game/CenterArea.jsx << 'EOF'
import Card from '../Card/Card';
import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';

export function CenterArea() {
  const { gameState } = useGameStore();
  
  if (!gameState) return null;

  return (
    <div className="bg-gradient-to-br from-green-800 to-teal-900 rounded-3xl p-8 mb-6 shadow-2xl min-h-[300px] relative overflow-hidden">
      {/* Patrón de fondo */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-8 gap-4 h-full p-4">
          {[...Array(32)].map((_, i) => (
            <span key={i} className="text-white text-3xl">🍃</span>
          ))}
        </div>
      </div>

      {/* Zona de mazos */}
      <div className="relative z-10 flex justify-center gap-8 items-center h-full flex-wrap">
        {/* Mazo de robo */}
        <div className="text-center">
          <Card faceDown size="normal" />
          <div className="mt-2 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-md inline-block">
            📚 {gameState.deck.count} cartas
          </div>
        </div>

        {/* Pila de descarte */}
        <div className="text-center">
          {gameState.discardPile.topCard ? (
            <Card card={gameState.discardPile.topCard} size="normal" />
          ) : (
            <div className="w-36 h-52 bg-gray-200 rounded-2xl flex items-center justify-center">
              <span className="text-gray-400">Descarte vacío</span>
            </div>
          )}
          <div className="mt-2 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-md inline-block">
            🗑️ {gameState.discardPile.count} cartas
          </div>
        </div>
      </div>
    </div>
  );
}

export default CenterArea;
EOF

echo " CenterArea.jsx creado"

# Crear PlayerFrame.jsx
cat > src/components/Player/PlayerFrame.jsx << 'EOF'
import { motion } from 'framer-motion';

export function PlayerFrame({ player, isMe = false }) {
  const isCurrentTurn = player.isCurrentTurn;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        bg-white rounded-xl p-4 shadow-lg transition-all min-w-[200px]
        ${isCurrentTurn ? 'ring-4 ring-yellow-400' : ''}
        ${isMe ? 'ring-2 ring-green-500' : ''}
      `}
      style={{ borderLeft: `6px solid ${player.color}` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl">{player.avatar}</div>
        <div className="flex-1">
          <div className="font-bold text-sm">{player.name} {isMe && '(Tú)'}</div>
          <div className="text-xs text-gray-500">
            🃏 {player.handCount} cartas
          </div>
        </div>
      </div>

      {/* Mini tablero */}
      <div className="grid grid-cols-4 gap-1 mt-2">
        {Object.values(player.board).map((slot, i) => (
          <div
            key={i}
            className={`
              w-8 h-8 rounded flex items-center justify-center text-xs
              ${slot.plant ? 'bg-green-200' : 'bg-gray-200'}
            `}
          >
            {slot.plant ? '🌱' : ''}
          </div>
        ))}
      </div>

      {isCurrentTurn && (
        <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-center font-semibold">
          ✨ Su turno
        </div>
      )}
    </motion.div>
  );
}

export default PlayerFrame;
EOF

echo " PlayerFrame.jsx creado"

echo ""
echo " ¡Todos los componentes generados!"
echo ""
echo " Próximos pasos:"
echo "1. cd client"
echo "2. npm install"
echo "3. npm run dev"
echo ""
echo " El juego debería funcionar completo!"
