import { motion } from 'framer-motion';
import Card from '../Card/Card';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Trash2, Info, Check } from 'lucide-react';
import { useState } from 'react';
import { CARD_TYPES } from '../../utils/constants';

export default function PlayerHand({ cards = [], vertical = false }) {
  const {
    selectedCard,
    setSelectedCard,
    selectedCardsForDiscard,
    toggleCardForDiscard,
    clearSelectedCardsForDiscard,
    isMyTurn,
    setSpecialPlay,
    clearSpecialPlay,
    openCardDetail,
    gameState
  } = useGameStore();

  const { discardCards } = useSocket();
  const [discardMode, setDiscardMode] = useState(false);
  // Sin cartas elegidas el botón no hace nada, así que se ve apagado
  const hayParaDescartar = selectedCardsForDiscard.length > 0;

  // El servidor ya mandaba estos datos; antes no se mostraban en ningún lado
  const mazoRestante = gameState?.deck?.count ?? 0;
  const descarteTotal = gameState?.discardPile?.count ?? 0;
  const ultimaDescartada = gameState?.discardPile?.topCard || null;

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

      <div className={`flex items-end justify-center ${vertical ? "gap-3" : "gap-28"}`}>

        {/* ===== MANO CENTRAL ===== */}
        <div className="flex justify-center pointer-events-auto">
          <div
            className={`flex items-end ${vertical ? "gap-1" : "gap-12 lg:gap-6"}`}
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
                  <div className={`relative aspect-[7/10] ${vertical ? "w-[clamp(58px,17vw,82px)]" : "w-[112px]"}`}>

                    {(
                      // El desplazamiento y giro van en el envoltorio para que
                      // el boton de detalle acompañe a la carta.
                      <motion.div
                        className={`absolute inset-0 ${rotations[index]} ${vertical ? (index == 1 ? '-translate-y-4' : '-translate-y-3') : (index == 1 ? '-translate-y-12' : '-translate-y-10')}`}
                        animate={{ opacity: isRevealed ? 1 : 1 }}
                      >
                        <Card
                          card={card}
                          selected={isSelected}
                          disabled={!isMyTurn}
                        />
                        {/* Boton de detalle: la carta es muy chica para leer su texto */}
                        <button
                          type="button"
                          aria-label={`Ver detalle de ${card.name}`}
                          onClick={(e) => { e.stopPropagation(); openCardDetail(card); }}
                          className={`absolute right-0.5 top-0.5 z-10 grid place-items-center rounded-full bg-black/55 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/75 ${
                            vertical ? 'h-7 w-7' : 'h-5 w-5'
                          }`}
                        >
                          <Info size={vertical ? 15 : 12} />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ===== BLOQUE MAZO + DESCARTE ===== */}
        <div className={`relative pointer-events-auto flex-shrink-0 ${vertical ? "w-[122px]" : "w-[18%] max-w-[240px]"}`}>

          {/* INDICADOR DE TURNO */}
          <div className={`absolute -top-[35%] left-1/2 -translate-x-1/2 w-full justify-center ${vertical ? "hidden" : "flex"}`}>
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
          <div
            className="rounded-3xl border p-2.5 shadow-2xl backdrop-blur-md"
            style={{ background: 'var(--board-panel)', borderColor: 'var(--board-panel-borde)' }}
          >
            <div className="grid grid-cols-2 gap-2.5">

              {/* MAZO — con las cartas que quedan, que el juego ya sabía pero no mostraba */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative w-full">
                  {/* Dos capas detrás: se ve como un montón, no como una carta suelta */}
                  <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-xl border border-white/20 bg-slate-800/70" />
                  <div className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-xl border border-white/25 bg-slate-700/70" />
                  <div className="relative aspect-[7/10] w-full rounded-xl border-2 border-white/70 bg-card-back bg-cover bg-center shadow-lg" />
                  <span
                    className="absolute -right-1.5 -top-1.5 grid min-w-[22px] place-items-center rounded-full px-1 py-0.5 text-[10px] font-extrabold text-white shadow"
                    style={{ background: 'var(--primary)', border: '1.5px solid rgba(255,255,255,0.6)' }}
                  >
                    {mazoRestante}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--board-texto-suave)' }}>
                  Mazo
                </span>
              </div>

              {/* DESCARTE — muestra la última carta tirada en vez de un hueco vacío */}
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  whileHover={isMyTurn ? { scale: 1.04 } : {}}
                  whileTap={isMyTurn ? { scale: 0.96 } : {}}
                  onClick={() => {
                    if (!isMyTurn) return;
                    if (discardMode) handleDiscard();
                    else {
                      setDiscardMode(true);
                      setSelectedCard(null);
                    }
                  }}
                  role="button"
                  aria-label={discardMode ? 'Confirmar descarte' : 'Descartar cartas'}
                  className={`relative aspect-[7/10] w-full overflow-hidden rounded-xl transition-colors ${
                    isMyTurn ? 'cursor-pointer' : 'opacity-70'
                  }`}
                  /* En modo descarte esto deja de ser un hueco y pasa a ser
                     EL botón de la jugada. Antes era rojo translúcido con
                     texto rojo de 9px: en celular no se leía y no parecía
                     pulsable. Ahora es sólido, con texto blanco, y late si
                     ya hay cartas elegidas. */
                  animate={
                    discardMode && hayParaDescartar
                      ? { scale: [1, 1.045, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    discardMode && hayParaDescartar
                      ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                  style={{
                    border: discardMode
                      ? `2px solid ${hayParaDescartar ? '#F0908A' : '#E0655B'}`
                      : '2px dashed var(--board-hueco-borde)',
                    background: discardMode
                      ? (hayParaDescartar
                          ? 'linear-gradient(160deg, #D4564C, #A83B33)'
                          : 'rgba(201,74,64,0.32)')
                      : 'var(--board-hueco)',
                    boxShadow: discardMode && hayParaDescartar
                      ? '0 4px 16px -4px rgba(201,74,64,0.9)'
                      : undefined,
                  }}
                >
                  {ultimaDescartada && !discardMode ? (
                    <img
                      src={ultimaDescartada.image}
                      alt={ultimaDescartada.name}
                      draggable={false}
                      className="h-full w-full object-cover opacity-70"
                    />
                  ) : null}

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    {discardMode ? (
                      <>
                        <Check
                          size={26}
                          strokeWidth={3}
                          style={{ color: hayParaDescartar ? '#fff' : '#E0655B' }}
                        />
                        {/* Dos renglones cortos en vez de "Confirmar" en uno:
                            la casilla es angosta y la palabra no cabía. El
                            número dice cuántas se van, que es lo que uno
                            quiere confirmar. */}
                        <span
                          className="text-[11px] font-extrabold uppercase leading-none tracking-wide"
                          style={{ color: hayParaDescartar ? '#fff' : '#E0655B' }}
                        >
                          Tirar
                        </span>
                        <span
                          className="text-[10px] font-bold leading-none"
                          style={{ color: hayParaDescartar ? 'rgba(255,255,255,0.85)' : 'var(--board-texto-suave)' }}
                        >
                          {hayParaDescartar ? `${selectedCardsForDiscard.length} carta${selectedCardsForDiscard.length > 1 ? 's' : ''}` : 'elige'}
                        </span>
                      </>
                    ) : (
                      !ultimaDescartada && (
                        <>
                          <Trash2 size={20} style={{ color: 'var(--board-texto-suave)' }} />
                          <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--board-texto-suave)' }}>Vacío</span>
                        </>
                      )
                    )}
                  </div>

                  {descarteTotal > 0 && !discardMode && (
                    <span
                      className="absolute -right-1.5 -top-1.5 grid min-w-[22px] place-items-center rounded-full px-1 py-0.5 text-[10px] font-extrabold text-white shadow"
                      style={{ background: 'var(--ink-soft)', border: '1.5px solid rgba(255,255,255,0.6)' }}
                    >
                      {descarteTotal}
                    </span>
                  )}
                </motion.div>

                {discardMode ? (
                  <button
                    onClick={cancelDiscard}
                    className="text-[9px] font-bold uppercase tracking-tight text-[#E0655B] underline"
                  >
                    Cancelar
                  </button>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--board-texto-suave)' }}>
                    Descarte
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
