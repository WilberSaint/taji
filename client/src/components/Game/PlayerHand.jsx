import { motion } from 'framer-motion';
import Card from '../Card/Card';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function PlayerHand({ cards = [] }) {
  const {
    selectedCard,
    setSelectedCard,
    selectedCardsForDiscard,
    toggleCardForDiscard,
    clearSelectedCardsForDiscard,
    isMyTurn,
    gameState
  } = useGameStore();

  const { discardCards } = useSocket();
  const [discardMode, setDiscardMode] = useState(false);
  const [hoverHand, setHoverHand] = useState(false);

  /* ===== ACCIONES ===== */
  const handleCardClick = (card) => {
    if (!isMyTurn) return;

    if (discardMode) {
      toggleCardForDiscard(card.id);
    } else {
      setSelectedCard(selectedCard?.id === card.id ? null : card);
    }
  };

  const handleDiscard = async () => {
    if (selectedCardsForDiscard.length === 0) return;

    try {
      await discardCards(selectedCardsForDiscard);
      clearSelectedCardsForDiscard();
      setDiscardMode(false);
      setSelectedCard(null);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelDiscard = () => {
    setDiscardMode(false);
    clearSelectedCardsForDiscard();
    setSelectedCard(null);
  };

  return (
    <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
      
      <div className="flex justify-center items-end gap-[3%]">

        {/* ===== MANO CENTRAL ===== */}
        <div className="flex justify-center pointer-events-auto">
          <div
            className="flex items-end gap-6"
            onMouseEnter={() => setHoverHand(true)}
            onMouseLeave={() => setHoverHand(false)}
          >
            {cards.map((card, index) => {
              const isSelected = discardMode
                ? selectedCardsForDiscard.includes(card.id)
                : selectedCard?.id === card.id;

              const isRevealed = isMyTurn && hoverHand;

              return (
                <motion.div
                  key={card.id}
                  className="relative cursor-pointer"
                  style={{ zIndex: isSelected ? 50 : index }}
                  onClick={() => handleCardClick(card)}
                  animate={{ y: hoverHand ? (isSelected ? -22 : -12) : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                >
<div className="w-[clamp(70px,7vw,110px)] aspect-[7/10] relative">
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-card-back bg-cover bg-center border-2 border-white shadow-xl"
                      animate={{ opacity: isRevealed ? 0 : 1 }}
                    />

                    {isMyTurn && (
                      <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: isRevealed ? 1 : 0 }}
                      >
                        <Card
                          card={card}
                          selected={isSelected}
                          disabled={!isMyTurn}
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ===== BLOQUE MAZO + DESCARTE ===== */}
        <div className="relative pointer-events-auto w-[18%] max-w-[240px] flex-shrink-0">

          {/* INDICADOR DE TURNO */}
          <div className="absolute -top-[35%] left-1/2 -translate-x-1/2 w-full flex justify-center">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`px-[8%] py-[3%] rounded-xl font-black italic shadow-xl border whitespace-nowrap text-[0.75rem] tracking-tight ${
                isMyTurn
                  ? 'bg-emerald-500/90 text-white border-emerald-300'
                  : 'bg-slate-800/80 text-slate-400 border-slate-600'
              }`}
            >
              {isMyTurn ? '¡TU TURNO!' : 'ESPERANDO...'}
            </motion.div>
          </div>

          {/* CONTENEDOR */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-500/40 rounded-[2rem] p-[6%] shadow-2xl">
            <div className="grid grid-cols-2 gap-[8%]">

              {/* MAZO */}
              <div className="flex flex-col items-center gap-[4%]">
                <div className="w-[70%] aspect-[7/10] rounded-2xl border-2 border-white/80 shadow-lg bg-card-back bg-cover bg-center" />
                <span className="text-[0.65rem] text-white/70 font-black uppercase tracking-widest">
                  TAJI
                </span>
              </div>

              {/* DESCARTE */}
              <div className="flex flex-col items-center gap-[4%]">
                <motion.div
                  whileHover={isMyTurn ? { scale: 1.05 } : {}}
                  whileTap={isMyTurn ? { scale: 0.95 } : {}}
                  onClick={() => {
                    if (!isMyTurn) return;

                    if (discardMode) handleDiscard();
                    else {
                      setDiscardMode(true);
                      setSelectedCard(null);
                    }
                  }}
                  className={`w-[70%] aspect-[7/10] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-colors ${
                    discardMode
                      ? 'border-red-400 bg-red-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Trash2
                    size={24}
                    className={discardMode ? 'text-red-400' : 'text-white/30'}
                  />
                  <span className="mt-1 text-[0.55rem] font-bold text-white/40 uppercase">
                    {discardMode ? 'Confirmar' : 'Vacío'}
                  </span>
                </motion.div>

                {discardMode && (
                  <button
                    onClick={cancelDiscard}
                    className="text-[0.55rem] font-bold text-red-400 underline uppercase tracking-tight"
                  >
                    Cancelar
                  </button>
                )}

                <span className="text-[0.65rem] text-white/70 font-black uppercase tracking-widest">
                  DESCARTE
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
