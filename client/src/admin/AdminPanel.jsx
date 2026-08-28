import { useCallback, useEffect, useState } from 'react';
import socket from '../socket';
import Button from '../components/UI/Button';
import Avatar from '../components/UI/Avatar';
import {
  ShieldAlert, RefreshCw, X, ArrowLeft, LogOut,
  AlertTriangle, RotateCcw, Save,
} from 'lucide-react';

const TOKEN_KEY = 'taji-admin-token';

function emit(event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

/* ---------- piezas ---------- */

function Field({ label, value, onChange, min = 1 }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-[var(--r-sm)] border-[1.5px] border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}

function Section({ title, hint, children, actions }) {
  return (
    <section className="rounded-[var(--r-lg)] border border-line bg-surface p-5 shadow-e1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/* ---------- login ---------- */

function TokenGate({ onAuthed }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!token.trim()) return;
    setChecking(true);
    setError('');
    if (!socket.connected) socket.connect();
    const res = await emit('admin:auth', { token: token.trim() });
    setChecking(false);
    if (res?.success) {
      sessionStorage.setItem(TOKEN_KEY, token.trim());
      onAuthed(token.trim());
    } else {
      setError('Token inválido o el panel no está habilitado (ADMIN_TOKEN sin definir en el servidor).');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
      <div className="w-full max-w-sm rounded-[var(--r-lg)] border border-line bg-surface p-8 shadow-e2">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
            <ShieldAlert size={20} />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold">Panel de administrador</h1>
            <p className="text-xs text-ink-soft">Acceso restringido</p>
          </div>
        </div>
        <input
          type="password"
          placeholder="Token de administrador"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
          className="mb-3 w-full rounded-[var(--r-sm)] border-[1.5px] border-line-strong bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-primary"
        />
        {error && <p className="mb-3 text-xs text-state-danger">{error}</p>}
        <Button fullWidth disabled={checking || !token.trim()} onClick={submit}>
          {checking ? 'Verificando…' : 'Entrar'}
        </Button>
        <a href="#/" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-soft hover:text-ink">
          <ArrowLeft size={13} /> Volver al juego
        </a>
      </div>
    </div>
  );
}

/* ---------- panel ---------- */

function AdminDashboard({ token, onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rulesDraft, setRulesDraft] = useState(null);
  const [deckDraft, setDeckDraft] = useState(null);
  const [maintMsg, setMaintMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await emit('admin:stats', { token });
    if (res?.success) {
      setData(res);
      setRulesDraft(res.rules);
      setDeckDraft(res.deckConfig);
      setMaintMsg(res.maintenance?.message || '');
      setError('');
    } else {
      setError(res?.error || 'No se pudo cargar el estado del servidor');
    }
  }, [token]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const run = async (fn) => {
    setBusy(true);
    await fn();
    await refresh();
    setBusy(false);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-center text-ink">
        <div>
          <p className="mb-3 text-sm text-state-danger">{error}</p>
          <Button variant="secondary" onClick={onLogout}>Volver a iniciar sesión</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="grid min-h-screen place-items-center bg-paper text-sm text-ink-soft">Cargando…</div>;
  }

  const { roomStats, gameStats, rooms, maintenance } = data;

  return (
    <div className="min-h-screen bg-paper p-4 text-ink sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
              <ShieldAlert size={20} />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold">Panel de administrador</h1>
              <p className="text-xs text-ink-soft">TAJI · configuración en vivo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} className={busy ? 'animate-spin' : ''} />} onClick={() => run(async () => {})}>
              Actualizar
            </Button>
            <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={onLogout}>Salir</Button>
          </div>
        </header>

        {maintenance?.enabled && (
          <div className="mb-6 flex items-center gap-2 rounded-[var(--r-md)] px-4 py-3 text-sm" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <AlertTriangle size={16} /> Mantenimiento activo — no se aceptan salas nuevas.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Salas activas', roomStats.totalRooms],
            ['Jugadores en sala', roomStats.totalPlayers],
            ['Partidas en curso', gameStats.playingGames],
            ['Turnos jugados', gameStats.totalTurns],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--r-md)] border border-line bg-surface p-4 shadow-e1">
              <div className="font-mono text-2xl font-semibold">{value}</div>
              <div className="text-xs text-ink-soft">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Salas en vivo" hint="Cerrar una sala expulsa a todos sus jugadores.">
            {rooms.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint">No hay salas activas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rooms.map((room) => (
                  <div key={room.code} className="rounded-[var(--r-md)] border border-line bg-surface-2 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-semibold">{room.code}</span>
                        <span className="ml-2 text-xs text-ink-soft">
                          {room.status} · {room.playersCount}/{room.maxPlayers} · {room.isPublic ? 'pública' : 'privada'}
                        </span>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => run(() => emit('admin:close_room', { token, roomCode: room.code }))}
                      >
                        Cerrar sala
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.players.map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-2 text-xs">
                          <Avatar id={p.avatar} size={20} />
                          <span className="max-w-[9rem] truncate">{p.name}{p.isBot ? ' (bot)' : ''}</span>
                          {!p.isBot && (
                            <button
                              type="button"
                              aria-label={`Expulsar a ${p.name}`}
                              disabled={busy}
                              onClick={() => run(() => emit('admin:kick_player', { token, roomCode: room.code, playerId: p.id }))}
                              className="text-ink-faint hover:text-state-danger"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Modo mantenimiento"
            hint="Cuando está activo, nadie puede crear ni unirse a salas nuevas. Ideal antes de un deploy."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Mensaje para los jugadores</span>
                <input
                  type="text"
                  value={maintMsg}
                  onChange={(e) => setMaintMsg(e.target.value)}
                  placeholder="Estamos actualizando TAJI, vuelve en unos minutos."
                  className="w-full rounded-[var(--r-sm)] border-[1.5px] border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              {maintenance?.enabled ? (
                <Button variant="secondary" disabled={busy} onClick={() => run(() => emit('admin:maintenance', { token, enabled: false }))}>
                  Desactivar
                </Button>
              ) : (
                <Button variant="warning" disabled={busy} onClick={() => run(() => emit('admin:maintenance', { token, enabled: true, message: maintMsg }))}>
                  Activar
                </Button>
              )}
            </div>
          </Section>

          {rulesDraft && (
            <Section
              title="Reglas del juego"
              hint="Se aplican a las salas nuevas; las que ya están en curso no cambian."
              actions={
                <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={busy} onClick={() => run(() => emit('admin:reset_rules', { token }))}>
                  Restablecer
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Jugadores mín." value={rulesDraft.MIN_PLAYERS} onChange={(v) => setRulesDraft({ ...rulesDraft, MIN_PLAYERS: v })} />
                <Field label="Jugadores máx." value={rulesDraft.MAX_PLAYERS} onChange={(v) => setRulesDraft({ ...rulesDraft, MAX_PLAYERS: v })} />
                <Field label="Cartas iniciales" value={rulesDraft.INITIAL_HAND_SIZE} onChange={(v) => setRulesDraft({ ...rulesDraft, INITIAL_HAND_SIZE: v })} />
                <Field label="Límite de mano" value={rulesDraft.HAND_LIMIT} onChange={(v) => setRulesDraft({ ...rulesDraft, HAND_LIMIT: v })} />
                <Field label="Plantas para ganar" value={rulesDraft.PLANTS_TO_WIN} onChange={(v) => setRulesDraft({ ...rulesDraft, PLANTS_TO_WIN: v })} />
                <Field label="Descarte mín." value={rulesDraft.DISCARD_MIN} onChange={(v) => setRulesDraft({ ...rulesDraft, DISCARD_MIN: v })} />
                <Field label="Descarte máx." value={rulesDraft.DISCARD_MAX} onChange={(v) => setRulesDraft({ ...rulesDraft, DISCARD_MAX: v })} />
              </div>
              <Button
                className="mt-4"
                size="sm"
                icon={<Save size={14} />}
                disabled={busy}
                onClick={() => run(() => emit('admin:update_rules', { token, rules: rulesDraft }))}
              >
                Guardar reglas
              </Button>
            </Section>
          )}

          {deckDraft && (
            <Section
              title="Composición del mazo"
              hint="Copias de cada carta. Solo afecta a las partidas que empiecen después de guardar."
              actions={
                <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} disabled={busy} onClick={() => run(() => emit('admin:reset_deck', { token }))}>
                  Restablecer
                </Button>
              }
            >
              <div className="flex flex-col gap-5">
                {[
                  ['PLANTAS', 'Plantas'],
                  ['MANTENIMIENTOS', 'Mantenimientos'],
                  ['RIESGOS', 'Riesgos'],
                  ['EVENTOS', 'Eventos'],
                ].map(([group, label]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {Object.entries(deckDraft[group]).map(([subtype, count]) => (
                        <Field
                          key={subtype}
                          label={subtype}
                          min={0}
                          value={count}
                          onChange={(v) => setDeckDraft({ ...deckDraft, [group]: { ...deckDraft[group], [subtype]: v } })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className="mt-4"
                size="sm"
                icon={<Save size={14} />}
                disabled={busy}
                onClick={() => run(() => emit('admin:update_deck', { token, deckConfig: deckDraft }))}
              >
                Guardar mazo
              </Button>
            </Section>
          )}
        </div>

        <a href="#/" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-soft hover:text-ink">
          <ArrowLeft size={13} /> Volver al juego
        </a>
      </div>
    </div>
  );
}

/* ---------- entrada ---------- */

export default function AdminPanel() {
  const [token, setTokenState] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });

  const logout = () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
    setTokenState('');
  };

  if (!token) {
    return <TokenGate onAuthed={setTokenState} />;
  }

  return <AdminDashboard token={token} onLogout={logout} />;
}
