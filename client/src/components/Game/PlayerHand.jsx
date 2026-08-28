import { motion } from 'framer-motion';
import Card from '../Card/Card';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CARD_TYPES } from '../../utils/constants';

export default function PlayerHand({ cards = [] }) {
  const {
    selectedCard,
    setSelectedCard,
    selectedCardsForDiscard,
    toggleCardForDiscard,
    clearSelectedCardsForDiscard,
    isMyTurn,
    setSpecialPlay,
    clearSpecialPlay
  } = useGameStore();

  const { discardCards } = useSocket();
  const [discardMode, setDiscardMode] = useState(false);

  const rotations = [
    '-rotate-6',
    '',
    'rotate-6'
  ]
  /* ===== ACCIONES ===== */
  const handleCardClick = (card) => {
    if (!isMyTurn) return;

    if (discardMode) {
      toggleCardForDiscard(card.id);
      return;
    }

    //Si ya está seleccionada la misma carta, deseleccionar
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
      clearSpecialPlay();
      return;
    }

    if (card.type === CARD_TYPES.EVENTO) {
      setSpecialPlay({
        card,
        step: 'origen',
        movimientos: [],
        pendiente: null,
      });
      setSelectedCard(card);
      return;
    }

    setSelectedCard(card);
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
    <div className="relative w-full pointer-events-none">

      <div className="flex justify-center items-end gap-28">

        {/* ===== MANO CENTRAL ===== */}
        <div className="flex justify-center pointer-events-auto">
          <div
            className="flex items-end gap-12 lg:gap-6"
          >
            {cards.map((card, index) => {
              const isSelected = discardMode
                ? selectedCardsForDiscard.includes(card.id)
                : selectedCard?.id === card.id;

              const isRevealed = isMyTurn;

              return (
                <motion.div
                  key={card.id}
                  className='relative cursor-pointer'
                  style={{ zIndex: isSelected ? 50 : index }}
                  onClick={() => handleCardClick(card)}
                  whileHover={{
                    y: isSelected ? -22 : -12,
                    zIndex: 50,
                  }}
                  animate={{ y: isSelected ? -22 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <div className="w-[clamp(70px,7vw,110px)] aspect-[7/10] relative">

                    {(
                      <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: isRevealed ? 1 : 1 }}
                      >
                        <Card
                          card={card}
                          selected={isSelected}
                          disabled={!isMyTurn}
                          className={`${rotations[index]} ${index == 1 ? '-translate-y-12' : '-translate-y-10'}`}
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
              className="px-[9%] py-[3.5%] rounded-full font-display font-extrabold uppercase shadow-lg border whitespace-nowrap text-[0.7rem] tracking-wide"
              style={
                isMyTurn
                  ? { background: 'rgba(20,160,174,0.95)', color: '#fff', borderColor: 'rgba(207,243,245,0.7)' }
                  : { background: 'rgba(30,41,59,0.85)', color: '#94A3B8', borderColor: 'rgba(100,116,139,0.5)' }
              }
            >
              {isMyTurn ? 'Tu turno' : 'Esperando'}
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
                  className={`w-[70%] aspect-[7/10] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-colors ${discardMode
                    ? 'border-[#E0655B] bg-[#C94A40]/25'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                >
                  <Trash2
                    size={24}
                    className={discardMode ? 'text-[#E0655B]' : 'text-white/30'}
                  />
                  <span className="mt-1 text-[0.55rem] font-bold text-white/40 uppercase select-none">
                    {discardMode ? 'Confirmar' : 'Vacío'}
                  </span>
                </motion.div>

                {discardMode && (
                  <button
                    onClick={cancelDiscard}
                    className="text-[0.55rem] font-bold text-[#E0655B] underline uppercase tracking-tight select-none"
                  >
                    Cancelar
                  </button>
                )}

                <span className="text-[0.65rem] text-white/70 font-black uppercase tracking-widest select-none">
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
