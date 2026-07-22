import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Settings, HelpCircle, LogOut } from 'lucide-react';
import PlayerFrame from '../Player/PlayerFrame';
import PlayerSlot from './PlayerSlot';
import PlayerHand from './PlayerHand';
import CenterArea from './CenterArea';
import VictoryModal from './VictoryModal';
import Button from '../UI/Button';
import { ENERGY_TYPES, EVENT_TYPES } from '../../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function GameBoard() {
  const {
    gameState,
    socketId,
    toggleRules,
    toggleSettings,
    clearRoom,
    clearGameState,
    setNotification,
    specialPlay,
    setSpecialPlay,
    clearSpecialPlay,
    setSelectedCard,
    showVictory,
    winner,
    toggleVictory
  } = useGameStore();

  const { leaveRoom, playCard } = useSocket();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === socketId);
  const opponents = gameState.players.filter(p => p.id !== socketId);

  const EMPTY_PLAYER = {
    id: 'empty',
    name: 'Esperando jugador',
    board: {
      SOLAR: null,
      EOLICA: null,
      HIDROELECTRICA: null,
      GEOTERMICA: null
    },
    isEmpty: true
  };

  const visualOpponents = [...opponents];
  while (visualOpponents.length < 3) {
    visualOpponents.push(EMPTY_PLAYER);
  }

  const handleLeaveGame = async () => {
    await leaveRoom();
    clearRoom();
    clearGameState();
    localStorage.removeItem('tajiRoomCode');
    localStorage.removeItem('tajiPlayerName');
    setNotification({ type: 'info', message: 'Has salido de la partida' });
  };

  return (
    <div className="w-full h-screen bg-game-bg bg-cover bg-center flex items-center justify-center overflow-hidden">

      {/* CONTENEDOR PRINCIPAL RESPONSIVO */}
      <div className="relative w-full max-w-[1600px] aspect-[16/9]">

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 rounded-2xl z-0" />

        {/* BOTONES */}
        <div className="absolute top-4 right-4 flex gap-3 z-50">
          <button
            onClick={() => toggleRules(true)}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
          >
            <HelpCircle />
          </button>

          <button
            onClick={() => toggleSettings(true)}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
          >
            <Settings />
          </button>

          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500"
          >
            <LogOut />
          </button>
        </div>


        {/* OPONENTE SUPERIOR */}
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 z-20">
          <OpponentBoard
            player={visualOpponents[0]}
            orientation="portrait"
          />
        </div>

        {gameState.players.length > 2 && (
          /* OPONENTE IZQUIERDO */
          <div className="absolute top-1/2 left-[18%] -translate-y-1/2 z-20">
            <OpponentBoard
              player={visualOpponents[1]}
              orientation="landscape"
              small
            />
          </div>)};

        {gameState.players.length > 3 && (
          /* OPONENTE DERECHO (SIMÉTRICO REAL) */
          <div className="absolute top-1/2 right-[18%] -translate-y-1/2 z-20">
            <OpponentBoard
              player={visualOpponents[2]}
              orientation="landscape"
              small
            />
          </div>)};

        {/* CENTRO */}
        <div className="absolute inset-0 flex items-center justify-center z-10 top-8">
          <CenterArea currentPlayer={currentPlayer} />
        </div>

        {/* PLAYER HAND */}
        {currentPlayer && (
          <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[75%] max-w-[900px] z-30">
            <PlayerHand cards={currentPlayer.hand} />
          </div>
        )}

        {/* OVERLAY CARTA ESPECIAL*/ }

        {specialPlay && console.log('🎭 Overlay specialPlay renderizando')}
        {specialPlay && (
          <div className="absolute bottom-1/5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
            {/* Instrucción actual */}
            <div className='bg-black/80 text-white px-4 py-2 rounded-xl font-bold text-sm text-center backdrop-blur-sm border border-white/20'>
              {specialPlay.card.subtype === EVENT_TYPES.COMPRA && 'Selecciona la planta que quieres comprar'}
              {specialPlay.card.subtype === EVENT_TYPES.INTERCAMBIO_PLANTA && specialPlay.step === 'origen' && 'Selecciona tu planta'}
              {specialPlay.card.subtype === EVENT_TYPES.INTERCAMBIO_PLANTA && specialPlay.step === 'destino' && 'Selecciona la planta del oponente'}
              {specialPlay.card.subtype === EVENT_TYPES.INTERCAMBIO_TERRENO && 'Selecciona al jugador con quien intercambiar'}
              {specialPlay.card.subtype === EVENT_TYPES.ESPARCIMIENTO && specialPlay.step === 'origen' && `Selecciona tu riesgo (${specialPlay.movimientos.length} seleccionados)`}
              {specialPlay.card.subtype === EVENT_TYPES.ESPARCIMIENTO && specialPlay.step === 'destino' && 'Selecciona la planta del oponente'}
              {specialPlay.card.subtype === EVENT_TYPES.DESCARTE && 'Harás que todos los jugadores descarten sus cartas'}
            </div>

            {/* Botón para confirmar (solo contagio con al menos 1 par) */}
            {specialPlay.card.subtype === EVENT_TYPES.ESPARCIMIENTO && specialPlay.movimientos.length > 0 && (
              <button
                onClick={ async () => {
                  await playCard(
                    specialPlay.card.id,
                    socketId,
                    specialPlay.movimientos
                  );
                  clearSpecialPlay();
                  setSelectedCard(null);
                }}
                className='bg-emerald-500 hover:bg-emerald-400 text-white font-black px-6 py-2 rounded-xl shadow-lg'
              >
                Confirmar contagio ({specialPlay.movimientos.length})
              </button>
            )}

            {/* Botón para confirmar descarte */}
            {specialPlay.card.subtype === EVENT_TYPES.DESCARTE && (
              <button
                onClick={ async () => {
                  await playCard(
                    specialPlay.card.id,
                    socketId,
                    specialPlay.movimientos
                  );
                  clearSpecialPlay();
                  setSelectedCard(null);
                }}
                className='bg-emerald-500 hover:bg-emerald-400 text-white font-black px-6 py-2 rounded-xl shadow-lg'
              >
                Confirmar descarte
              </button>
            )}

            {/* Botón para cancelar */}
            <button
              onClick={() => {
                clearSpecialPlay();
                setSelectedCard(null);
              }}
              className="text-white/60 hover:text-white text-xs underline"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* MODAL SALIR */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="font-black text-xl mb-4">
                ¿Salir de la partida?
              </h3>

              <div className="flex gap-3">
                <Button fullWidth onClick={() => setShowExitConfirm(false)}>
                  Cancelar
                </Button>

                <Button variant="danger" fullWidth onClick={handleLeaveGame}>
                  Salir
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <VictoryModal
        isOpen={showVictory}
        winner={winner}
        isWinner={winner?.id === socketId}
        onClose={() => {
          toggleVictory(false);
          handleLeaveGame();
        }}
      />
    </div>
  );
}

/* ================= OPONENT BOARD ================= */

function OpponentBoard({ player, small, orientation }) {
  const { specialPlay, setSpecialPlay, clearSpecialPlay, setSelectedCard, socketId } = useGameStore();
  const { playCard } = useSocket();

  const isClickableForTerrainSwap =
    specialPlay?.card?.subtype === EVENT_TYPES.INTERCAMBIO_TERRENO &&
    !player?.isEpmty;

  const handleBoardClick = async () => {
    if(!isClickableForTerrainSwap) return;
    await playCard(
      specialPlay.card.id,
      player.id,
      [{destino: { jugador: player.id } }]
    );
    clearSpecialPlay();
    setSelectedCard(null);
  }
  const BOARD_ENERGIES = [
    ENERGY_TYPES.SOLAR,
    ENERGY_TYPES.EOLICA,
    ENERGY_TYPES.HIDROELECTRICA,
    ENERGY_TYPES.GEOTERMICA
  ];

  const isEmpty = player?.isEmpty;

  return (
    <div
      onClick={handleBoardClick}
      className={`
        bg-white/30 backdrop-blur-xl rounded-2xl p-2 shadow-xl
        border border-white/40
        ${isEmpty ? 'opacity-30 grayscale' : ''}
        ${small ? 'scale-95' : ''}
        ${isClickableForTerrainSwap ? 'cursor-pointer ring-2 ring-purple-400': ''}
      `}
    >
      <PlayerFrame player={player} />

      <div
        className={`mt-1 flex gap-1 ${orientation === 'landscape' ? 'flex-col' : 'flex-row'
          }`}
      >
        {BOARD_ENERGIES.map(type => (
          <PlayerSlot
            key={type}
            variant="opponent"
            slotType={type}
            slot={player.board?.[type]}
            isMySlot={false}
            playerId={player.id}
            size={small ? 'small' : 'normal'}
            orientation={orientation}
          />
        ))}
      </div>
    </div>
  );
}
