/**
 * Prueba de carga de TAJI — ¿cuánta gente aguanta el servidor?
 *
 * Simula salas completas de jugadores "de verdad": cada uno es un socket
 * propio que crea o se une a una sala, se marca listo, y el anfitrión inicia.
 * En su turno cada jugador "piensa" unos segundos, descarta una carta y
 * termina el turno — el mismo camino caro del servidor que una jugada normal
 * (validar, mover cartas, mandar el estado completo a todos los de la sala).
 *
 * Mide lo que importa para decidir:
 *  - latencia de respuesta (lo que siente el jugador al tocar una carta)
 *  - CPU y memoria del proceso de Node (vía /stats)
 *
 * Uso:
 *   cd herramientas/carga && npm install
 *   node carga.mjs --url http://localhost:3001 --salas 50 --jugadores 4 --pensar 5 --duracion 90
 *
 *   --salas      cuántas partidas a la vez                      (20)
 *   --jugadores  personas por sala, 2 a 6                       (4)
 *   --pensar     segundos promedio que tarda cada quien en jugar (5)
 *   --duracion   segundos que dura la prueba ya con todos dentro (60)
 *   --ritmo      salas nuevas por segundo al arrancar           (10)
 *
 * Correr el generador en la MISMA máquina que el servidor da números
 * pesimistas (compiten por la CPU). Está bien: mejor quedarse cortos.
 */
import { io } from 'socket.io-client';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const URL = args.url || 'http://localhost:3001';
const SALAS = Number(args.salas || 20);
const JUGADORES = Number(args.jugadores || 4);
const PENSAR_MS = Number(args.pensar || 5) * 1000;
const DURACION_S = Number(args.duracion || 60);
const RITMO = Number(args.ritmo || 10);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const latencias = [];
let turnos = 0;
let errores = 0;
let estados = 0;
let bytesEstados = 0;
let terminando = false;
const sockets = [];

function pedir(socket, evento, datos) {
  const t0 = performance.now();
  return new Promise((resolve) => {
    socket.timeout(10000).emit(evento, datos, (err, r) => {
      latencias.push(performance.now() - t0);
      if (err || !r?.success) errores++;
      resolve(err ? { success: false, error: 'timeout' } : r);
    });
  });
}

function conectar() {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'], reconnection: false, forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
    sockets.push(s);
  });
}

/** Un jugador: reacciona a los estados y juega cuando le toca. */
function jugar(socket) {
  let mano = [];
  let jugando = false;
  socket.on('game:state_update', (estado) => {
    estados++;
    bytesEstados += JSON.stringify(estado).length;
    const yo = estado.players?.find((p) => p.id === socket.id);
    if (!yo) return;
    mano = yo.hand || [];
    if (yo.isCurrentTurn && !jugando && !terminando) {
      jugando = true;
      const piensa = PENSAR_MS * (0.5 + Math.random());
      setTimeout(async () => {
        if (terminando) return;
        if (mano[0]) await pedir(socket, 'game:discard_cards', { cardIds: [mano[0].id] });
        await pedir(socket, 'game:end_turn', {});
        turnos++;
        jugando = false;
      }, piensa);
    }
  });
}

async function armarSala(n) {
  const anfitrion = await conectar();
  jugar(anfitrion);
  const r = await pedir(anfitrion, 'lobby:create_room', {
    playerName: `Carga${n}-0`, isPublic: n % 4 === 0, avatar: 'sun',
  });
  if (!r.success) throw new Error(`crear sala: ${r.error}`);
  const codigo = r.room.code;

  for (let j = 1; j < JUGADORES; j++) {
    const s = await conectar();
    jugar(s);
    const u = await pedir(s, 'lobby:join_room', { roomCode: codigo, playerName: `Carga${n}-${j}`, avatar: 'wind' });
    if (!u.success) throw new Error(`unirse: ${u.error}`);
    await pedir(s, 'lobby:ready', { ready: true });
  }
  await pedir(anfitrion, 'lobby:ready', { ready: true });
  const i = await pedir(anfitrion, 'lobby:start_game', {});
  if (!i.success) throw new Error(`iniciar: ${i.error}`);
}

async function stats() {
  try {
    const r = await fetch(`${URL}/stats`);
    return (await r.json()).proceso || {};
  } catch {
    return {};
  }
}

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const o = [...arr].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))];
};

async function main() {
  console.log(`TAJI carga → ${URL}: ${SALAS} salas × ${JUGADORES} = ${SALAS * JUGADORES} jugadores, ` +
    `pensar ~${PENSAR_MS / 1000}s, ${DURACION_S}s\n`);
  await stats(); // arranca el contador de CPU

  const t0 = Date.now();
  const armadas = [];
  for (let n = 0; n < SALAS; n++) {
    armadas.push(armarSala(n).catch((e) => { errores++; console.error(`sala ${n}:`, e.message); }));
    await espera(1000 / RITMO);
  }
  await Promise.all(armadas);
  console.log(`Salas listas en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  latencias.length = 0;
  const muestras = [];
  const inicio = Date.now();
  await stats();
  while ((Date.now() - inicio) / 1000 < DURACION_S) {
    await espera(5000);
    const p = await stats();
    muestras.push(p);
    console.log(
      `t=${String(Math.round((Date.now() - inicio) / 1000)).padStart(3)}s  ` +
      `conexiones=${p.conexiones}  turnos=${turnos}  ` +
      `lat p50=${pct(latencias, 50).toFixed(0)}ms p95=${pct(latencias, 95).toFixed(0)}ms max=${Math.max(0, ...latencias).toFixed(0)}ms  ` +
      `CPU=${p.cpuPct}%  RAM=${p.rssMB}MB  errores=${errores}`,
    );
  }

  terminando = true;
  const cpu = muestras.map((m) => m.cpuPct || 0);
  const ram = muestras.map((m) => m.rssMB || 0);
  const seg = (Date.now() - inicio) / 1000;
  console.log('\n===== Resumen =====');
  console.log(`Jugadores simultáneos: ${SALAS * JUGADORES} en ${SALAS} salas`);
  console.log(`Turnos: ${turnos} (${(turnos / seg).toFixed(1)}/s) · estados enviados: ${estados} ` +
    `(~${(bytesEstados / Math.max(1, estados) / 1024).toFixed(1)} KB c/u)`);
  console.log(`Latencia: p50 ${pct(latencias, 50).toFixed(0)} ms · p95 ${pct(latencias, 95).toFixed(0)} ms · ` +
    `p99 ${pct(latencias, 99).toFixed(0)} ms · max ${Math.max(0, ...latencias).toFixed(0)} ms`);
  console.log(`CPU del servidor: prom ${(cpu.reduce((a, b) => a + b, 0) / Math.max(1, cpu.length)).toFixed(1)}% · ` +
    `máx ${Math.max(0, ...cpu)}% (de un núcleo)`);
  console.log(`RAM del servidor: máx ${Math.max(0, ...ram)} MB`);
  console.log(`Errores: ${errores}`);

  sockets.forEach((s) => s.close());
  setTimeout(() => process.exit(0), 500);
}

main();
