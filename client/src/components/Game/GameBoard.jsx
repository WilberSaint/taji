import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { useOrientacion } from '../../hooks/useOrientacion';
import { Settings, HelpCircle, LogOut } from 'lucide-react';
import PlayerFrame from '../Player/PlayerFrame';
import Avatar from '../UI/Avatar';
import PlayerSlot from './PlayerSlot';
import PlayerHand from './PlayerHand';
import CenterArea from './CenterArea';
import VictoryModal from './VictoryModal';
import CardDetailModal from '../Card/CardDetailModal';
import RulesModal from './RulesModal';
import SettingsModal from './SettingsModal';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import TurnIndicator from '../UI/TurnIndicator';
import RegistroJugadas from './RegistroJugadas';
import LucesPueblo from './LucesPueblo';
import { ENERGY_TYPES, EVENT_TYPES } from '../../utils/constants';
import { useState } from 'react';

export default function GameBoard() {
  const {
    gameState,
    socketId,
    showRules,
    toggleRules,
    showSettings,
    toggleSettings,
    clearRoom,
    clearGameState,
    setNotification,
    specialPlay,
    clearSpecialPlay,
    setSelectedCard,
    showVictory,
    winner,
    finPartida,
    toggleVictory,
    showCardDetail,
    cardForDetail,
    closeCardDetail,
    currentRoom
  } = useGameStore();

  const { leaveRoom, playCard, pedirRevancha } = useSocket();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const esVertical = useOrientacion();

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === socketId);
  const opponents = gameState.players.filter(p => p.id !== socketId);

  const EMPTY_PLAYER = {
    id: 'empty',
    name: 'Esperando jugador',
    board: { SOLAR: null, EOLICA: null, HIDROELECTRICA: null, GEOTERMICA: null },
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

  /* ============ PIEZAS COMPARTIDAS ENTRE LOS DOS ACOMODOS ============ */

  const botonControl = 'rounded-full bg-white/95 shadow-e2 flex items-center justify-center transition-colors hover:bg-white';

  const controles = (
    <div className={`flex ${esVertical ? 'gap-1.5' : 'gap-2'}`}>
      <button
        aria-label="Reglas"
        onClick={() => toggleRules(true)}
        className={`${botonControl} text-slate-700 ${esVertical ? 'w-9 h-9' : 'w-11 h-11'}`}
      >
        <HelpCircle size={esVertical ? 17 : 20} />
      </button>
      <button
        aria-label="Ajustes"
        onClick={() => toggleSettings(true)}
        className={`${botonControl} text-slate-700 ${esVertical ? 'w-9 h-9' : 'w-11 h-11'}`}
      >
        <Settings size={esVertical ? 17 : 20} />
      </button>
      <button
        aria-label="Salir de la partida"
        onClick={() => setShowExitConfirm(true)}
        className={`${botonControl} ${esVertical ? 'w-9 h-9' : 'w-11 h-11'}`}
        style={{ color: 'var(--danger)' }}
      >
        <LogOut size={esVertical ? 17 : 20} />
      </button>
    </div>
  );

  const instruccionEspecial = specialPlay && (
    <div className={`absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-3 ${esVertical ? 'bottom-[38%] w-full' : 'bottom-1/5'}`}>
      {/* Las instrucciones dicen QUÉ hace la carta y QUÉ hay que tocar ahora.
          Antes el esparcimiento decía solo "Selecciona tu riesgo (0
          seleccionados)": ni explicaba que los riesgos se le pasan a otro, ni
          que se pueden mover varios, ni cómo terminar. */}
      <div className='max-w-[min(92vw,420px)] bg-black/85 text-white px-4 py-2.5 rounded-2xl text-center backdrop-blur-md border border-white/20 shadow-lg'>
        {(() => {
          const t = specialPlay.card.subtype;
          const paso = specialPlay.step;
          const n = specialPlay.movimientos.length;
          const linea = (titulo, detalle) => (
            <>
              <span className="block text-sm font-bold">{titulo}</span>
              <span className="mt-0.5 block text-xs leading-snug text-white/70">{detalle}</span>
            </>
          );

          if (t === EVENT_TYPES.COMPRA)
            return linea('Roba una planta', 'Toca la planta de un rival: pasa a tu tablero.');

          if (t === EVENT_TYPES.INTERCAMBIO_PLANTA)
            return paso === 'origen'
              ? linea('Intercambia una planta', 'Primero toca una planta TUYA, la que quieres dar.')
              : linea('¿Por cuál la cambias?', 'Ahora toca la planta del rival que quieres recibir.');

          if (t === EVENT_TYPES.INTERCAMBIO_TERRENO)
            return linea('Intercambia tableros enteros', 'Toca al rival con quien quieres cambiar todo tu tablero.');

          if (t === EVENT_TYPES.ESPARCIMIENTO)
            return paso === 'origen'
              ? linea(
                  n === 0 ? 'Pasa tus riesgos a los demás' : `Riesgo ${n} listo, ¿otro más?`,
                  n === 0
                    ? 'Toca una planta TUYA que esté dañada. Después elegirás a quién le pasas ese riesgo.'
                    : 'Toca otra planta tuya dañada, o pulsa el botón para mover los que ya elegiste.',
                )
              : linea('¿A quién se lo pasas?', 'Toca la planta de un rival: ahí se va ese riesgo.');

          if (t === EVENT_TYPES.DESCARTE)
            return linea('Todos tiran su mano', 'Los demás descartan sus cartas y roban de nuevo. Tú vuelves a jugar.');

          return null;
        })()}
      </div>

      {specialPlay.card.subtype === EVENT_TYPES.ESPARCIMIENTO && specialPlay.movimientos.length > 0 && (
        <button
          onClick={async () => {
            await playCard(specialPlay.card.id, socketId, specialPlay.movimientos);
            clearSpecialPlay();
            setSelectedCard(null);
          }}
          className='text-white font-bold px-6 py-2 rounded-full shadow-lg select-none transition-colors hover:brightness-110'
          style={{ background: '#14A0AE' }}
        >
          {/* "Contagio" era vocabulario del juego en que se inspira TAJI, no
              del nuestro: aquí se mueven riesgos entre plantas. */}
          Mover {specialPlay.movimientos.length}{' '}
          {specialPlay.movimientos.length === 1 ? 'riesgo' : 'riesgos'}
        </button>
      )}

      {specialPlay.card.subtype === EVENT_TYPES.DESCARTE && (
        <button
          onClick={async () => {
            await playCard(specialPlay.card.id, socketId, specialPlay.movimientos);
            clearSpecialPlay();
            setSelectedCard(null);
          }}
          className='text-white font-bold px-6 py-2 rounded-full shadow-lg select-none transition-colors hover:brightness-110'
          style={{ background: '#14A0AE' }}
        >
          Confirmar descarte
        </button>
      )}

      <button
        onClick={() => { clearSpecialPlay(); setSelectedCard(null); }}
        className="text-white/60 hover:text-white text-xs underline select-none"
      >
        Cancelar
      </button>
    </div>
  );

  const modales = (
    <>
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="¿Salir de la partida?"
        size="sm"
      >
        <p className="text-sm text-ink-soft">
          Perderás tu lugar en la mesa y no podrás volver a esta ronda.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setShowExitConfirm(false)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth onClick={handleLeaveGame}>
            Salir
          </Button>
        </div>
      </Modal>

      <RulesModal isOpen={showRules} onClose={() => toggleRules(false)} />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => toggleSettings(false)}
        onOpenRules={() => { toggleSettings(false); toggleRules(true); }}
        onLeaveGame={handleLeaveGame}
      />

      <VictoryModal
        isOpen={showVictory}
        winner={winner}
        isWinner={winner?.id === socketId}
        fin={finPartida}
        /* Al perder se enseñan las dos redes, la del ganador y la tuya, para
           ver qué tan cerca quedaste. */
        miTablero={currentPlayer?.board}
        /* El botón de revancha solo le sale a quien creó la sala: es quien
           puede iniciarla. Al resto no se le enseña un botón que le va a
           decir que no. */
        onNewGame={currentRoom?.hostId === socketId ? pedirRevancha : undefined}
        onClose={() => { toggleVictory(false); handleLeaveGame(); }}
      />

      <CardDetailModal
        card={cardForDetail}
        isOpen={showCardDetail}
        onClose={closeCardDetail}
      />
    </>
  );

  /* ============ ACOMODO VERTICAL (celular de pie) ============ */
  if (esVertical) {
    return (
      <div className="alto-pantalla margen-seguro-lados relative flex w-full flex-col overflow-hidden encuadre-pueblo fondo-pueblo fondo-movil">
        <LucesPueblo jugador={currentPlayer} />
        <div className="pointer-events-none absolute inset-0 bg-black/50" />

        {/* Barra superior */}
        <div className="margen-seguro-arriba relative z-40 flex shrink-0 items-center justify-between gap-2 px-2 pt-3 min-[380px]:px-3">
          {/* min-w-0 para que la píldora de turno pueda recortar su texto en
              vez de empujar los botones fuera de la pantalla. */}
          <div className="flex min-w-0 flex-1">
            <TurnIndicator />
          </div>
          <div className="flex shrink-0 items-center gap-2">{controles}</div>
        </div>

        {/* Oponentes en fila */}
        {/* Un renglón por rival: siempre se ven todos, sin deslizar, y deja
            mucho más tablero que la rejilla de tarjetas. */}
        {opponents.length > 0 && (
          /* min-h-0 + overflow-y-auto y SIN shrink-0: la lista de rivales es lo
             que cede si de plano no cabe (pantalla muy baja con seis
             jugadores), en vez de empujar el tablero y encimarse con él.
             Mientras quepa no se desliza nada, que era la idea original. */
          <div
            className="relative z-20 flex min-h-0 flex-col gap-2 overflow-y-auto px-2 py-2 min-[380px]:px-3"
            /* El tablero se sube con --tablero-y-movil, que es un transform y
               por tanto no ocupa lugar: en pantallas justas se montaba encima
               del último rival. Este margen reserva exactamente lo que el
               tablero va a subir, así las dos perillas no se pisan aunque se
               cambie el valor. */
            style={{ marginBottom: 'calc(-1 * var(--tablero-y-movil))' }}
          >
            {opponents.map(op => (
              <OpponentBoard key={op.id} player={op} fila alto={ALTO_RENGLON[opponents.length] || 'compacto'} />
            ))}
          </div>
        )}

        {/* Mi tablero */}
        {/* items-end y no items-center: el tablero se APOYA abajo, pegado a la
            mano. Centrado, cada rival de más lo empujaba 26px hacia abajo
            —104px de diferencia entre una partida de 2 y una de 6— y el
            tablero y las cartas se movían bajo el dedo según con cuántos
            jugaras. Los renglones se quedan arriba y el hueco que sobra va en
            medio; cuando hay pocos rivales sus renglones crecen para
            llenarlo (ver ALTO_RENGLON).

            grow + shrink-0 y no flex-1: crece para empujar el tablero abajo,
            pero NUNCA se encoge. Con flex-1 este hueco colapsaba en pantallas
            bajas y el tablero se desbordaba hacia arriba, encimándose con los
            renglones de rivales. Ahora el que cede es la lista de rivales,
            que para eso puede deslizarse. */}
        <div className="relative z-10 flex shrink-0 grow basis-auto items-end justify-center px-1 pb-2">
          <CenterArea currentPlayer={currentPlayer} vertical />
          <div className="pointer-events-none absolute inset-x-3 top-0 z-30">
            <RegistroJugadas compacto />
          </div>
        </div>

        {/* Mi mano */}
        {currentPlayer && (
          <div className="margen-seguro-abajo relative z-30 shrink-0 px-2 pb-3">
            <PlayerHand cards={currentPlayer.hand} vertical />
          </div>
        )}

        {instruccionEspecial}
        {modales}
      </div>
    );
  }

  /* ============ ACOMODO HORIZONTAL (escritorio / celular acostado) ============ */
  return (
    /* El fondo va DENTRO del marco 16:9, no sobre la ventana: así el pueblo
       y las plantas escalan como una sola pieza y no se despegan al cambiar
       el tamaño de la ventana. Antes el fondo llegaba a verse 41% más grande
       que el tablero en ventanas muy anchas o muy altas. */
    <div
      className="alto-pantalla margen-seguro-lados relative flex w-full items-center justify-center overflow-hidden"
      style={{ background: '#121820' }}
    >
      <div className="marco-16-9 encuadre-pueblo fondo-pueblo relative overflow-hidden">
        <LucesPueblo jugador={currentPlayer} />
        {/* Lienzo de diseno fijo: se escala completo para no encimarse */}
        <div className="lienzo-tablero">
          <div className="absolute inset-0 z-0 rounded-2xl bg-black/40" />

          <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2">
            <TurnIndicator />
          </div>

          {/* Lo que acaba de pasar en la mesa */}
          <div className="absolute left-4 top-4 z-40 max-w-[320px]">
            <RegistroJugadas />
          </div>

          <div className="absolute right-4 top-4 z-50">{controles}</div>

          {/* Oponente de arriba */}
          <div className="absolute left-1/2 top-[4%] z-20 -translate-x-1/2">
            <OpponentBoard player={visualOpponents[0]} orientation="portrait" />
          </div>

          {gameState.players.length > 2 && (
            <div className="absolute left-[8%] top-1/2 z-20 -translate-y-1/2">
              <OpponentBoard player={visualOpponents[1]} orientation="landscape" small />
            </div>
          )}

          {gameState.players.length > 3 && (
            <div className="absolute right-[8%] top-1/2 z-20 -translate-y-1/2">
              <OpponentBoard player={visualOpponents[2]} orientation="landscape" small />
            </div>
          )}

          {/* Mi tablero */}
          <div className="absolute inset-0 top-8 z-10 flex items-center justify-center">
            <CenterArea currentPlayer={currentPlayer} />
          </div>

          {/* Mi mano */}
          {currentPlayer && (
            <div className="absolute bottom-[4%] left-1/2 z-30 w-[75%] max-w-[900px] -translate-x-1/2">
              <PlayerHand cards={currentPlayer.hand} />
            </div>
          )}

          {instruccionEspecial}
        </div>
      </div>

      {modales}
    </div>
  );
}

/* ================= TABLERO DE OPONENTE ================= */

/* ===== ALTO DEL RENGLÓN DE RIVAL EN CELULAR =====
   Los renglones viven arriba y el tablero abajo; lo que sobra queda en medio.
   Con pocos rivales ese hueco era enorme, así que sus renglones crecen para
   llenarlo: con uno solo se ve su tablero en grande, y a partir de cuatro se
   van a la versión compacta para que los cinco quepan sin tapar nada.
   Es por número de rivales, no de jugadores: 1 rival = partida de 2. */
const ALTO_RENGLON = {
  1: 'grande',
  2: 'medio',
  3: 'medio',
};

function OpponentBoard({ player, small, orientation, compacto, fila, alto = 'compacto' }) {
  const { specialPlay, clearSpecialPlay, setSelectedCard } = useGameStore();
  const { playCard } = useSocket();

  const isClickableForTerrainSwap =
    specialPlay?.card?.subtype === EVENT_TYPES.INTERCAMBIO_TERRENO && !player?.isEmpty;

  const handleBoardClick = async () => {
    if (!isClickableForTerrainSwap) return;
    await playCard(specialPlay.card.id, player.id, [{ destino: { jugador: player.id } }]);
    clearSpecialPlay();
    setSelectedCard(null);
  };

  const BOARD_ENERGIES = [
    ENERGY_TYPES.SOLAR,
    ENERGY_TYPES.EOLICA,
    ENERGY_TYPES.HIDROELECTRICA,
    ENERGY_TYPES.GEOTERMICA
  ];

  const isEmpty = player?.isEmpty;

  const slots = BOARD_ENERGIES.map(type => (
    <PlayerSlot
      key={type}
      variant="opponent"
      slotType={type}
      slot={player.board?.[type]}
      isMySlot={false}
      playerId={player.id}
      size={compacto || small ? 'small' : 'normal'}
      orientation={compacto ? 'portrait' : orientation}
    />
  ));

  const slotsFila = BOARD_ENERGIES.map(type => (
    <PlayerSlot
      key={type}
      variant="fila"
      slotType={type}
      slot={player.board?.[type]}
      isMySlot={false}
      playerId={player.id}
      alto={alto}
    />
  ));

  /* Renglón: avatar + nombre + las 4 energías en barra. Se usa en celular
     cuando hay varios rivales y la rejilla ya no cabe. */
  if (fila) {
    return (
      <div
        onClick={handleBoardClick}
        className={`flex items-center rounded-xl border backdrop-blur-md transition-colors
          ${{
            grande: 'gap-2 px-2 py-3 min-[380px]:gap-3 min-[380px]:px-3',
            medio: 'gap-1.5 px-2 py-2 min-[380px]:gap-2.5 min-[380px]:px-2.5',
            compacto: 'gap-1.5 px-1.5 py-1.5 min-[360px]:gap-2 min-[360px]:px-2',
          }[alto]}
          ${isEmpty ? 'opacity-30 grayscale' : ''}
          ${isClickableForTerrainSwap ? 'cursor-pointer ring-2 ring-purple-400' : ''}`}
        style={{
          background: player?.isCurrentTurn ? 'var(--board-turno)' : 'var(--board-panel)',
          borderColor: player?.isCurrentTurn ? 'var(--board-turno-borde)' : 'var(--board-panel-borde)',
        }}
      >
        <Avatar id={player?.avatar} size={{ grande: 26, medio: 22, compacto: 18 }[alto]} />
        <span
          /* El ancho del nombre es lo PRIMERO que se encoge en pantallas
             angostas. Fijo en 74px, a 320 px de ancho (iPhone con "Pantalla
             ampliada") el último chip se salía de la pantalla y GEO quedaba
             cortado: todo el apretón caía en los chips, que son lo que hay
             que poder leer y tocar. */
          /* El ancho del nombre es el MISMO en los tres tamaños: no depende de
             cuán alto sea el renglón sino de que quepa un nombre. Antes el
             renglón "grande" le daba 92px y dejaba los chips en 49px, más
             estrechos que con seis jugadores — al revés de lo razonable, y
             ahí es donde se cortaban las etiquetas de energía. Solo cambia el
             tamaño de letra. */
          className={`shrink-0 truncate font-bold leading-tight w-[52px] min-[360px]:w-[64px] min-[392px]:w-[74px] ${{
            grande: 'text-[12px]',
            medio: 'text-[11px]',
            compacto: 'text-[10px]',
          }[alto]}`}
          style={{ color: 'var(--board-texto)' }}
        >
          {String(player?.name || '').replace('[BOT] ', '')}
        </span>
        {/* min-w-0: sin esto un contenedor flex no baja de su contenido y los
            chips empujan el renglón fuera de la pantalla. */}
        <div className={`flex min-w-0 flex-1 ${alto === 'grande' ? 'gap-2 min-[380px]:gap-2.5' : 'gap-1.5 min-[360px]:gap-2'}`}>{slotsFila}</div>
      </div>
    );
  }

  return (
    <div
      onClick={handleBoardClick}
      className={`
        rounded-2xl border border-white/40 bg-white/30 p-2 shadow-xl backdrop-blur-xl
        ${isEmpty ? 'opacity-30 grayscale' : ''}
        ${small && !compacto ? 'scale-95' : ''}
        ${compacto ? 'min-w-0' : ''}
        ${isClickableForTerrainSwap ? 'cursor-pointer ring-2 ring-purple-400' : ''}
      `}
    >
      <PlayerFrame player={player} compacto={compacto} />

      {compacto ? (
        /* 2x2: cabe de sobra en pantalla de celular */
        <div className="mt-1 grid grid-cols-2 justify-items-center gap-1">{slots}</div>
      ) : (
        /* items-center: en columna las casillas se estiraban a todo el ancho
           del panel y quedaban como barras vacías */
        <div className={`mt-1 flex gap-1 ${orientation === 'landscape' ? 'flex-col items-center' : 'flex-row'}`}>
          {slots}
        </div>
      )}
    </div>
  );
}
