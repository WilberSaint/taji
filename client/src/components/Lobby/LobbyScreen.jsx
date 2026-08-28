import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { useTheme } from '../../hooks/useTheme';
import Button from '../UI/Button';
import Avatar from '../UI/Avatar';
import AvatarPicker from '../UI/AvatarPicker';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Lock, Globe, LogIn, Plus, Bot, X, Crown,
  Copy, Check, RefreshCw, ArrowLeft, Loader2, Monitor, Sun, Moon,
} from 'lucide-react';

/* ---------- piezas compartidas ---------- */

function Brand({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <svg width={big ? 40 : 30} height={big ? 40 : 30} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" style={{ fill: 'var(--primary)' }} />
        <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
          <circle cx="11" cy="12" r="2.6" />
          <circle cx="22" cy="10" r="2.6" />
          <circle cx="16" cy="22" r="2.6" />
          <path d="M12.4 13.8 14.6 20M20.6 12 17.4 20M13 10.8 20 9.8" />
        </g>
      </svg>
      <div className="leading-tight">
        <div className={`font-display font-extrabold tracking-tight ${big ? 'text-3xl' : 'text-xl'}`}>TAJI</div>
        {big && <div className="text-sm text-ink-soft">Energías renovables · juego de cartas</div>}
      </div>
    </div>
  );
}

const THEME_CYCLE = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

function ThemeButton() {
  const [theme, setTheme] = useTheme();
  const Icon = THEME_ICON[theme];
  return (
    <button
      type="button"
      onClick={() => setTheme(THEME_CYCLE[theme])}
      aria-label={`Tema: ${theme}. Cambiar.`}
      title={`Tema: ${theme}`}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:text-ink hover:border-line-strong"
    >
      <Icon size={17} />
    </button>
  );
}

function Shell({ children, center = false }) {
  return (
    <div className={`min-h-screen bg-paper text-ink ${center ? 'flex items-center justify-center' : ''} p-4 sm:p-6`}>
      {children}
    </div>
  );
}

const panelBase =
  'bg-surface border border-line rounded-[var(--r-lg)] shadow-e1';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

/* ---------- pantalla ---------- */

export function LobbyScreen() {
  const { playerName, setPlayerName, playerAvatar, setPlayerAvatar, currentRoom, publicRooms, setNotification } = useGameStore();
  const { createRoom, joinRoom, listRooms, leaveRoom, setReady, startGame, reconnect, addBot, kickPlayer } = useSocket();
  const [view, setView] = useState('home'); // home | create | join | room
  const [nameInput, setNameInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cargar salas públicas al inicio
  useEffect(() => {
    if (view === 'home') {
      listRooms();
    }
  }, [view, listRooms]);

  // Intentar reconexión automática al cargar
  useEffect(() => {
    const attemptReconnect = async () => {
      const savedRoomCode = localStorage.getItem('tajiRoomCode');
      const savedPlayerName = localStorage.getItem('tajiPlayerName');

      if (savedRoomCode && savedPlayerName && !currentRoom) {
        setReconnecting(true);
        try {
          await reconnect(savedRoomCode, savedPlayerName);
        } catch (error) {
          localStorage.removeItem('tajiRoomCode');
          localStorage.removeItem('tajiPlayerName');
        }
        setReconnecting(false);
      }
    };

    if (playerName) {
      attemptReconnect();
    }
  }, [playerName, currentRoom, reconnect]);

  // Si estamos en una sala, mostrar waiting room
  useEffect(() => {
    if (currentRoom) {
      setView('room');
    } else {
      setView('home');
    }
  }, [currentRoom]);

  const handleJoinByCode = async () => {
    if (!roomCode.trim() || loading) return;
    setLoading(true);
    try {
      await joinRoom(roomCode.trim(), playerName, playerAvatar);
    } catch (error) {
      setNotification({ type: 'error', message: error.message });
    }
    setLoading(false);
  };

  const handleJoinPublic = async (code) => {
    setLoading(true);
    try {
      await joinRoom(code, playerName, playerAvatar);
    } catch (error) {
      setNotification({ type: 'error', message: error.message });
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await listRooms();
    } catch (error) {
      /* la lista simplemente no se actualiza */
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotification({ type: 'info', message: `Código: ${currentRoom.code}` });
    }
  };

  /* ===== pantalla de nombre ===== */
  if (!playerName) {
    return (
      <Shell center>
        <motion.div {...fade} className={`${panelBase} w-full max-w-md p-8`}>
          <div className="mb-6 flex flex-col items-center text-center">
            <Brand size="lg" />
          </div>
          <label htmlFor="name" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            ¿Cómo te llamas?
          </label>
          <input
            id="name"
            type="text"
            placeholder="Tu nombre"
            maxLength={20}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nameInput.trim()) setPlayerName(nameInput.trim());
            }}
            autoFocus
            className="mb-5 w-full rounded-[var(--r-sm)] border-[1.5px] border-line-strong bg-surface px-4 py-3 text-lg text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Elige tu avatar</p>
          <div className="mb-6">
            <AvatarPicker value={playerAvatar} onChange={setPlayerAvatar} />
          </div>

          <Button fullWidth disabled={!nameInput.trim()} onClick={() => nameInput.trim() && setPlayerName(nameInput.trim())}>
            Entrar
          </Button>
        </motion.div>
      </Shell>
    );
  }

  /* ===== reconexión ===== */
  if (reconnecting) {
    return (
      <Shell center>
        <motion.div {...fade} className={`${panelBase} w-full max-w-md p-8 text-center`}>
          <Loader2 size={40} className="mx-auto mb-4 animate-spin text-primary" />
          <h2 className="font-display text-xl font-bold">Reconectando…</h2>
          <p className="mt-1 text-sm text-ink-soft">Volviendo a tu partida</p>
        </motion.div>
      </Shell>
    );
  }

  /* ===== home ===== */
  if (view === 'home') {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl">
          <motion.header {...fade} className={`${panelBase} mb-6 flex items-center justify-between gap-4 p-5`}>
            <div className="flex items-center gap-3">
              <Avatar id={playerAvatar} size={44} />
              <div>
                <Brand />
                <p className="mt-1 text-sm text-ink-soft">Hola, <span className="font-semibold text-ink">{playerName}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeButton />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPlayerName(''); localStorage.removeItem('playerName'); }}
              >
                Cambiar nombre y avatar
              </Button>
            </div>
          </motion.header>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <motion.button
              {...fade}
              transition={{ delay: 0.05 }}
              onClick={() => setView('create')}
              className={`${panelBase} flex flex-col items-start gap-3 p-6 text-left transition-transform hover:-translate-y-0.5 hover:shadow-e2`}
              style={{ borderColor: 'color-mix(in srgb, var(--primary) 35%, var(--line))' }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-[var(--r-md)] bg-primary-soft text-primary">
                <Plus size={22} />
              </span>
              <span className="font-display text-lg font-bold">Crear sala</span>
              <span className="text-sm text-ink-soft">Inicia una partida nueva, pública o privada.</span>
            </motion.button>

            <motion.button
              {...fade}
              transition={{ delay: 0.1 }}
              onClick={() => setView('join')}
              className={`${panelBase} flex flex-col items-start gap-3 p-6 text-left transition-transform hover:-translate-y-0.5 hover:shadow-e2`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-[var(--r-md)] bg-surface-2 text-ink-soft">
                <LogIn size={22} />
              </span>
              <span className="font-display text-lg font-bold">Unirse con código</span>
              <span className="text-sm text-ink-soft">Entra a una sala privada con su código.</span>
            </motion.button>
          </div>

          <motion.section {...fade} transition={{ delay: 0.15 }} className={`${panelBase} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Globe size={20} className="text-ink-faint" /> Salas públicas
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-ink-faint">
                <Users size={40} className="opacity-50" />
                <p className="text-sm">No hay salas públicas ahora mismo.</p>
                <p className="text-xs">Crea una y espera a que se unan.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {publicRooms.map((room) => (
                  <li
                    key={room.code}
                    className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border border-line bg-surface-2 p-4"
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold tracking-wider">{room.code}</div>
                      <div className="text-xs text-ink-soft">{room.playersCount}/{room.maxPlayers} jugadores</div>
                    </div>
                    <Button
                      size="sm"
                      variant={room.isFull ? 'secondary' : 'primary'}
                      onClick={() => handleJoinPublic(room.code)}
                      disabled={loading || room.isFull}
                    >
                      {room.isFull ? 'Llena' : 'Unirse'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      </Shell>
    );
  }

  /* ===== crear sala ===== */
  if (view === 'create') {
    return (
      <Shell center>
        <motion.div {...fade} className={`${panelBase} w-full max-w-md p-8`}>
          <button
            onClick={() => setView('home')}
            className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="mb-5 font-display text-2xl font-bold">Crear sala</h2>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Tipo de sala</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {[
              { pub: true, Icon: Globe, label: 'Pública', hint: 'Aparece en la lista' },
              { pub: false, Icon: Lock, label: 'Privada', hint: 'Solo con código' },
            ].map(({ pub, Icon, label, hint }) => {
              const active = isPublic === pub;
              return (
                <button
                  key={label}
                  onClick={() => setIsPublic(pub)}
                  className={`flex flex-col items-center gap-1 rounded-[var(--r-md)] border-[1.5px] p-4 transition-colors ${
                    active ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong text-ink-soft hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[11px] opacity-80">{hint}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setView('home')}>Cancelar</Button>
            <Button
              fullWidth
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await createRoom(playerName, isPublic, playerAvatar);
                } catch (error) {
                  setNotification({ type: 'error', message: `Error al crear sala: ${error.message}` });
                }
                setLoading(false);
              }}
            >
              {loading ? 'Creando…' : 'Crear sala'}
            </Button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  /* ===== unirse con código ===== */
  if (view === 'join') {
    return (
      <Shell center>
        <motion.div {...fade} className={`${panelBase} w-full max-w-md p-8`}>
          <button
            onClick={() => { setView('home'); setRoomCode(''); }}
            className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="mb-5 font-display text-2xl font-bold">Unirse con código</h2>

          <input
            type="text"
            placeholder="TAJI-XXXX"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={9}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && roomCode.trim()) handleJoinByCode(); }}
            className="mb-4 w-full rounded-[var(--r-sm)] border-[1.5px] border-line-strong bg-surface px-4 py-3 text-center font-mono text-lg tracking-[0.2em] text-ink outline-none transition-colors placeholder:text-ink-faint placeholder:tracking-normal focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setView('home'); setRoomCode(''); }}>Cancelar</Button>
            <Button fullWidth onClick={handleJoinByCode} disabled={loading || !roomCode.trim()}>
              {loading ? 'Uniéndose…' : 'Unirse'}
            </Button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  /* ===== sala de espera ===== */
  if (view === 'room' && currentRoom) {
    const myPlayer = currentRoom.players.find((p) => p.name === playerName);
    const isHost = currentRoom.hostId === myPlayer?.id;
    const canStart = currentRoom.canStart.can;
    const emptySlots = currentRoom.maxPlayers - currentRoom.playersCount;

    return (
      <Shell>
        <div className="mx-auto max-w-3xl">
          <motion.header {...fade} className={`${panelBase} mb-5 p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">Sala de espera</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 rounded-[var(--r-sm)] border border-line bg-surface-2 px-3 py-1.5 font-mono text-sm font-semibold tracking-widest text-ink transition-colors hover:border-line-strong"
                  >
                    {currentRoom.code}
                    {copied ? <Check size={14} className="text-state-success" /> : <Copy size={14} className="text-ink-faint" />}
                  </button>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-ink-soft"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    {currentRoom.isPublic ? <Globe size={13} /> : <Lock size={13} />}
                    {currentRoom.isPublic ? 'Pública' : 'Privada'}
                  </span>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => leaveRoom()}>Salir</Button>
            </div>

            {!canStart && (
              <div
                className="mt-4 rounded-[var(--r-sm)] px-3 py-2 text-sm"
                style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
              >
                {currentRoom.canStart.reason}
              </div>
            )}
          </motion.header>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {currentRoom.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.16, delay: index * 0.03 }}
                  className={`flex items-center gap-3 rounded-[var(--r-md)] border bg-surface p-4 shadow-e1 ${
                    player.isReady ? 'border-state-success' : 'border-line'
                  }`}
                  style={{ borderLeftColor: player.color, borderLeftWidth: 4 }}
                >
                  <Avatar id={player.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate font-semibold">
                      <span className="truncate">{player.name}</span>
                      {player.isBot && (
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'var(--info-soft)', color: 'var(--info)' }}
                        >
                          <Bot size={11} /> Bot
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                      {player.id === currentRoom.hostId
                        ? <><Crown size={12} style={{ color: 'var(--solar)' }} /> Anfitrión</>
                        : player.isReady ? 'Listo' : 'Esperando…'}
                    </div>
                  </div>

                  {player.isReady && !player.isBot && (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                      <Check size={14} />
                    </span>
                  )}

                  {isHost && player.id !== myPlayer.id && (
                    <button
                      type="button"
                      aria-label={`Sacar a ${player.name} de la sala`}
                      onClick={() => kickPlayer(player.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-state-danger hover:text-state-danger"
                    >
                      <X size={15} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {Array.from({ length: Math.max(0, emptySlots) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-line p-4 text-sm text-ink-faint"
              >
                <Users size={18} className="opacity-60" /> Esperando jugador…
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {myPlayer && !myPlayer.isBot && (
              <Button
                fullWidth
                variant={myPlayer.isReady ? 'secondary' : 'primary'}
                onClick={() => setReady(!myPlayer.isReady)}
              >
                {myPlayer.isReady ? 'No estoy listo' : 'Estoy listo'}
              </Button>
            )}

            {isHost && (
              <>
                <Button
                  fullWidth
                  variant="secondary"
                  icon={<Bot size={16} />}
                  onClick={addBot}
                  disabled={currentRoom.players.length >= currentRoom.maxPlayers}
                >
                  Agregar bot
                </Button>
                <Button
                  fullWidth
                  disabled={!canStart || loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await startGame();
                    } catch (error) {
                      setNotification({ type: 'error', message: error.message });
                    }
                    setLoading(false);
                  }}
                >
                  {loading ? 'Iniciando…' : 'Iniciar partida'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

export default LobbyScreen;
