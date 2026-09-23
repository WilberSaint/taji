// Las 8 piezas del tablero, dibujadas con código.
//
// El brief pide tres cosas que un modelo de imagen no cumple: fondo
// transparente de verdad, la MISMA base de tierra en la misma posición y
// tamaño en las ocho, y nada más que la parcela. Generadas con SDXL salieron
// con fondo opaco (ignoró el magenta), bases de distinto tamaño y rotación, y
// de regalo un pueblo con casitas y un volcán con chimeneas.
//
// Dibujadas aquí, la base es idéntica por construcción y el alfa es real.
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const L = 1024;                 // lienzo cuadrado que pide el brief
const CX = L / 2, CY = 560;     // centro de la base
const ANCHO = L * 0.70;         // la base ocupa ~70% del ancho, como pide el brief
const RX = ANCHO / 2, RY = RX / 2;  // rombo isométrico 2:1 (vista de 30°)
const GRUESO = 74;              // canto de tierra

const TINTA = "#16212A";
const ARENA = "#E8D3A8";
const ARENA_LADO = "#C9AE80";
const ARENA_CANTO = "#B08F63";
const VERDE = "#6F8F4E";
const AZUL = "#3A6AAE";
const AZUL_CLARO = "#4F9FD2";
const AMBAR = "#DF9A34";
const TERRACOTA = "#C55C3C";
const PANEL = "#2F4E86";
const PANEL_LUZ = "#4F79B8";
const GRIS = "#9AA3AA";
const BLANCO = "#F7F4EE";

// iso convierte coordenadas de la parcela (u,v de -1 a 1) a pantalla.
const iso = (u, v, alto = 0) => [CX + (u - v) * RX / 1.4142, CY + (u + v) * RY / 1.4142 - alto];

function poly(ctx, pts, relleno, borde = TINTA, grosor = 5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.lineJoin = "round"; ctx.stroke(); }
}

function linea(ctx, a, b, color = TINTA, grosor = 6) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.stroke();
}

function disco(ctx, [x, y], rx, ry, relleno, borde = TINTA, grosor = 5) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.stroke(); }
}

// La base: cara superior, dos caras laterales y el canto. Idéntica en las ocho.
function base(ctx, { apagado = false } = {}) {
  const arriba = [iso(-1, -1), iso(1, -1), iso(1, 1), iso(-1, 1)];
  const izq = [iso(-1, 1), iso(1, 1), [iso(1, 1)[0], iso(1, 1)[1] + GRUESO], [iso(-1, 1)[0], iso(-1, 1)[1] + GRUESO]];
  const der = [iso(1, 1), iso(1, -1), [iso(1, -1)[0], iso(1, -1)[1] + GRUESO], [iso(1, 1)[0], iso(1, 1)[1] + GRUESO]];
  poly(ctx, izq, apagado ? "#A99270" : ARENA_LADO);
  poly(ctx, der, apagado ? "#94805F" : ARENA_CANTO);
  poly(ctx, arriba, apagado ? "#D8C7A6" : ARENA);
}

// mezcla dos colores; se usa para apagar los tonos de las piezas "-off".
function mezcla(hex, hacia, cuanto) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = n(hex), [r2, g2, b2] = n(hacia);
  const m = (a, b) => Math.round(a + (b - a) * cuanto).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
const apagar = (c) => mezcla(c, "#9C968B", 0.55);

// --- elementos ---
function estacas(ctx, puntos) {
  for (const [u, v] of puntos) {
    const p = iso(u, v), alto = 46;
    linea(ctx, p, [p[0], p[1] - alto], TINTA, 7);
    poly(ctx, [[p[0], p[1] - alto], [p[0] + 26, p[1] - alto + 9], [p[0], p[1] - alto + 18]], AMBAR, TINTA, 4);
  }
}

function cimientos(ctx, puntos, r = 42) {
  for (const [u, v] of puntos) disco(ctx, iso(u, v), r, r / 2, GRIS, TINTA, 5);
}

function panel(ctx, u, v, { apagado = false } = {}) {
  const alto = 40, a = 0.30, b = 0.18;
  const p1 = iso(u - a, v - b, alto + 26), p2 = iso(u + a, v - b, alto + 26);
  const p3 = iso(u + a, v + b, alto), p4 = iso(u - a, v + b, alto);
  const base1 = iso(u, v, 0);
  linea(ctx, [(p3[0] + p4[0]) / 2, (p3[1] + p4[1]) / 2], base1, TINTA, 8);
  poly(ctx, [p1, p2, p3, p4], apagado ? apagar(PANEL) : PANEL);
  // brillo de dos tonos, como pide el estilo plano
  poly(ctx, [p1, p2, [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2], [(p1[0] + p4[0]) / 2, (p1[1] + p4[1]) / 2]],
    apagado ? apagar(PANEL_LUZ) : PANEL_LUZ, null);
  poly(ctx, [p1, p2, p3, p4], null, TINTA, 5);
}

function turbina(ctx, u, v, { apagado = false } = {}) {
  const pie = iso(u, v), alto = 250;
  const eje = [pie[0], pie[1] - alto];
  const color = apagado ? apagar(BLANCO) : BLANCO;
  linea(ctx, pie, eje, TINTA, 14);
  linea(ctx, pie, eje, color, 8);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 - Math.PI / 2;
    const punta = [eje[0] + Math.cos(a) * 92, eje[1] + Math.sin(a) * 92];
    linea(ctx, eje, punta, TINTA, 13);
    linea(ctx, eje, punta, color, 7);
  }
  disco(ctx, eje, 14, 14, TINTA, TINTA, 2);
}

function caja(ctx, u, v, ancho, fondo, alto, color, { apagado = false } = {}) {
  const c = apagado ? apagar(color) : color;
  const a = ancho / 2, b = fondo / 2;
  const t = [iso(u - a, v - b, alto), iso(u + a, v - b, alto), iso(u + a, v + b, alto), iso(u - a, v + b, alto)];
  const f1 = [t[3], t[2], iso(u + a, v + b, 0), iso(u - a, v + b, 0)];
  const f2 = [t[2], t[1], iso(u + a, v - b, 0), iso(u + a, v + b, 0)];
  poly(ctx, f1, mezcla(c, "#000000", 0.18));
  poly(ctx, f2, mezcla(c, "#000000", 0.32));
  poly(ctx, t, c);
}

function agua(ctx, pts, { apagado = false } = {}) {
  poly(ctx, pts.map(([u, v]) => iso(u, v)), apagado ? apagar(AZUL) : AZUL);
}

function vapor(ctx, [x, y], { apagado = false } = {}) {
  if (apagado) return;
  for (let k = 0; k < 3; k++) {
    disco(ctx, [x + (k % 2 ? 18 : -14), y - 60 - k * 62], 40 - k * 5, 30 - k * 4, BLANCO, TINTA, 5);
  }
}

// --- las ocho piezas ---
const PIEZAS = {
  "solar-off": (ctx) => {
    estacas(ctx, [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]);
    ctx.setLineDash([22, 16]);
    for (const v of [-0.35, 0.15]) {
      poly(ctx, [iso(-0.62, v - 0.16), iso(0.62, v - 0.16), iso(0.62, v + 0.16), iso(-0.62, v + 0.16)], null, TINTA, 5);
    }
    ctx.setLineDash([]);
  },
  "solar-on": (ctx) => {
    for (const v of [-0.38, 0.12]) for (const u of [-0.42, 0.06, 0.54]) panel(ctx, u, v);
    caja(ctx, -0.55, 0.62, 0.28, 0.2, 60, BLANCO);
  },
  "eolica-off": (ctx) => cimientos(ctx, [[-0.55, 0.15], [0.35, -0.15], [0.0, 0.6]]),
  "eolica-on": (ctx) => {
    cimientos(ctx, [[-0.55, 0.15], [0.35, -0.15], [0.0, 0.6]], 34);
    [[-0.55, 0.15], [0.35, -0.15], [0.0, 0.6]].forEach(([u, v]) => turbina(ctx, u, v));
  },
  "hidroelectrica-off": (ctx) => {
    agua(ctx, [[-0.9, -0.15], [-0.2, -0.3], [0.5, 0.1], [0.9, 0.35], [0.9, 0.6], [0.4, 0.4], [-0.25, 0.02], [-0.9, 0.15]]);
    ctx.setLineDash([20, 14]);
    linea(ctx, iso(0.1, -0.55), iso(0.1, 0.75), TINTA, 6);
    ctx.setLineDash([]);
  },
  "hidroelectrica-on": (ctx) => {
    agua(ctx, [[-0.95, -0.55], [-0.05, -0.6], [-0.05, 0.55], [-0.95, 0.6]]);
    caja(ctx, 0.02, 0.0, 0.14, 1.25, 110, GRIS);
    caja(ctx, 0.5, 0.55, 0.3, 0.26, 70, BLANCO);
    agua(ctx, [[0.12, -0.18], [0.95, -0.12], [0.95, 0.22], [0.12, 0.2]]);
  },
  "geotermica-off": (ctx) => {
    for (const [u, v, r] of [[-0.55, -0.4, 34], [0.35, -0.55, 26], [0.6, 0.5, 30], [-0.3, 0.6, 22]]) {
      disco(ctx, iso(u, v), r, r * 0.62, apagar(TERRACOTA));
    }
    disco(ctx, iso(0.05, 0.05), 46, 24, GRIS);
    linea(ctx, iso(-0.1, 0.05), iso(0.2, 0.05), TINTA, 8);
  },
  "geotermica-on": (ctx) => {
    for (const [u, v, r] of [[-0.62, -0.45, 34], [0.62, 0.55, 30]]) {
      disco(ctx, iso(u, v), r, r * 0.62, TERRACOTA);
    }
    caja(ctx, -0.25, 0.18, 0.5, 0.42, 90, BLANCO);
    linea(ctx, iso(0.02, 0.18), iso(0.62, -0.12), GRIS, 16);
    linea(ctx, iso(0.02, 0.18), iso(0.62, -0.12), TINTA, 4);
    caja(ctx, 0.62, -0.30, 0.18, 0.18, 150, GRIS);
    vapor(ctx, iso(0.62, -0.30, 150));
  },
};

export function dibujaPieza(nombre, destino) {
  const canvas = createCanvas(L, L);
  const ctx = canvas.getContext("2d");
  const apagado = nombre.endsWith("-off");
  base(ctx, { apagado });
  PIEZAS[nombre](ctx, { apagado });
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, canvas.toBuffer("image/png"));
  return destino;
}

const DESTINO = process.argv[2] ||
  "C:/Users/TheSaint/Documents/Proyectos/taji/entregables/Drive-LUDO-ENERGIA/03 · Diseño gráfico/Tablero y fondos/plants";
for (const nombre of Object.keys(PIEZAS)) {
  console.log("ok", dibujaPieza(nombre, join(DESTINO, nombre + ".png")));
}
