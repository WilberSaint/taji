// Las cuatro ilustraciones que el modelo no supo dibujar.
//
// No es un problema de prompt: son DIAGRAMAS, no escenas. «Una plataforma
// dividida en cuatro cuadrantes», «dos cosas intercambiándose con flechas»,
// «una nube que se parte en tres». Pedidas al modelo salieron, dos veces cada
// una, como una brújula, un ventilador de casa y un paisaje sin nubes. Un
// diagrama se dibuja, no se sortea.
//
// Salen cuadradas (1024) para entrar en la ventana de la carta como cualquier
// otra ilustración.
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const L = 1024;
const TINTA = "#16212A";
const ARENA = "#E8D3A8";
const CREMA = "#F4EFE6";
const AMBAR = "#DF9A34";
const CIELO = "#4F9FD2";
const AZUL = "#3A6AAE";
const TERRACOTA = "#C55C3C";
const TEAL = "#0B7480";
const VERDE = "#6F8F4E";
const BLANCO = "#F7F4EE";
const GRIS = "#9AA3AA";

function poly(ctx, pts, relleno, borde = TINTA, grosor = 7) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.lineJoin = "round"; ctx.stroke(); }
}
function linea(ctx, a, b, color = TINTA, grosor = 8, punteada = false) {
  ctx.save();
  if (punteada) ctx.setLineDash([22, 18]);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = "round"; ctx.stroke();
  ctx.restore();
}
function disco(ctx, x, y, rx, ry, relleno, borde = TINTA, grosor = 7) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.stroke(); }
}
// Flecha curva: el gesto de «esto se cambia por esto».
function flecha(ctx, x1, y1, x2, y2, curva, color = TINTA, grosor = 14) {
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + curva;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = "round"; ctx.stroke();
  const a = Math.atan2(y2 - cy, x2 - cx);
  poly(ctx, [[x2, y2],
             [x2 - Math.cos(a - 0.5) * 42, y2 - Math.sin(a - 0.5) * 42],
             [x2 - Math.cos(a + 0.5) * 42, y2 - Math.sin(a + 0.5) * 42]], color, color, 2);
}
function nube(ctx, x, y, r, color = BLANCO) {
  disco(ctx, x - r * 0.7, y + r * 0.15, r * 0.7, r * 0.6, color);
  disco(ctx, x + r * 0.7, y + r * 0.15, r * 0.65, r * 0.55, color);
  disco(ctx, x, y - r * 0.2, r * 0.9, r * 0.8, color);
}

// --- los cuatro dibujos ---
function panelSolar(ctx, x, y, s, { poste = true } = {}) {
  poly(ctx, [[x - s, y - s * 0.55], [x + s, y - s * 0.55], [x + s * 0.85, y + s * 0.4], [x - s * 0.85, y + s * 0.4]], AZUL);
  for (let k = -1; k <= 1; k++) linea(ctx, [x + k * s * 0.5, y - s * 0.55], [x + k * s * 0.43, y + s * 0.4], CREMA, 5);
  if (poste) linea(ctx, [x, y + s * 0.4], [x, y + s * 0.95], TINTA, 10);
}
function turbinaIcono(ctx, x, y, s) {
  linea(ctx, [x, y + s], [x, y - s * 0.5], TINTA, 12);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 - Math.PI / 2;
    linea(ctx, [x, y - s * 0.5], [x + Math.cos(a) * s * 0.75, y - s * 0.5 + Math.sin(a) * s * 0.75], TINTA, 11);
  }
  disco(ctx, x, y - s * 0.5, 11, 11, TINTA);
}
function presaIcono(ctx, x, y, s) {
  poly(ctx, [[x - s, y - s * 0.7], [x - s * 0.2, y - s * 0.7], [x - s * 0.2, y + s * 0.6], [x - s, y + s * 0.6]], AZUL);
  poly(ctx, [[x - s * 0.2, y - s * 0.8], [x + s * 0.1, y - s * 0.8], [x + s * 0.1, y + s * 0.7], [x - s * 0.2, y + s * 0.7]], GRIS);
  poly(ctx, [[x + s * 0.1, y - s * 0.1], [x + s, y - s * 0.1], [x + s, y + s * 0.35], [x + s * 0.1, y + s * 0.35]], AZUL);
}
function vaporIcono(ctx, x, y, s) {
  poly(ctx, [[x - s * 0.35, y + s * 0.8], [x + s * 0.35, y + s * 0.8], [x + s * 0.25, y - s * 0.1], [x - s * 0.25, y - s * 0.1]], TERRACOTA);
  for (let k = 0; k < 3; k++) disco(ctx, x + (k % 2 ? 26 : -22), y - s * 0.35 - k * s * 0.32, s * 0.3 - k * 12, s * 0.24 - k * 10, BLANCO);
}

const DIBUJOS = {
  // Comodín: la plataforma partida en cuatro, una energía por cuadrante.
  "plantas/comodin.png": (ctx) => {
    ctx.fillStyle = ARENA; ctx.fillRect(0, 0, L, L);
    disco(ctx, L / 2, L / 2, 400, 400, CREMA, TINTA, 12);
    linea(ctx, [L / 2, 112], [L / 2, L - 112], TINTA, 9);
    linea(ctx, [112, L / 2], [L - 112, L / 2], TINTA, 9);
    panelSolar(ctx, 320, 330, 130, { poste: false });
    turbinaIcono(ctx, 700, 330, 150);
    presaIcono(ctx, 320, 700, 150);
    vaporIcono(ctx, 700, 700, 150);
    disco(ctx, L / 2, L / 2, 74, 74, TEAL, TINTA, 10);
  },
  // Fuga de vapor: tubo roto, chorro y triángulo de advertencia. Sin gente.
  "riesgos/geotermica.png": (ctx) => {
    ctx.fillStyle = ARENA; ctx.fillRect(0, 0, L, L);
    poly(ctx, [[0, 700], [L, 640], [L, L], [0, L]], TERRACOTA);
    poly(ctx, [[90, 470], [430, 470], [430, 600], [90, 600]], GRIS);
    poly(ctx, [[600, 470], [940, 470], [940, 600], [600, 600]], GRIS);
    // la junta rota
    poly(ctx, [[430, 450], [470, 470], [470, 600], [430, 620]], TINTA, TINTA, 2);
    poly(ctx, [[560, 450], [600, 470], [600, 600], [560, 620]], TINTA, TINTA, 2);
    for (let k = 0; k < 4; k++) disco(ctx, 515 + k * 12, 400 - k * 90, 90 - k * 12, 70 - k * 10, BLANCO);
    // triángulo de alerta, sin texto
    poly(ctx, [[820, 250], [930, 440], [710, 440]], AMBAR, TINTA, 10);
    linea(ctx, [820, 310], [820, 380], TINTA, 14);
    disco(ctx, 820, 410, 9, 9, TINTA);
  },
  // Intercambio: las dos plantas y dos flechas que se cruzan.
  "eventos/intercambio_planta.png": (ctx) => {
    ctx.fillStyle = ARENA; ctx.fillRect(0, 0, L, L);
    poly(ctx, [[0, 780], [L, 740], [L, L], [0, L]], mezcla(ARENA, TINTA, 0.12));
    turbinaIcono(ctx, 250, 560, 210);
    panelSolar(ctx, 770, 520, 180);
    flecha(ctx, 380, 300, 660, 300, -150, TEAL);
    flecha(ctx, 660, 800, 380, 800, 150, TEAL);
  },
  // Esparcimiento: una nube que se parte en tres y va hacia tres plantas.
  "eventos/esparcimiento.png": (ctx) => {
    ctx.fillStyle = CIELO; ctx.fillRect(0, 0, L, L);
    poly(ctx, [[0, 780], [L, 740], [L, L], [0, L]], ARENA);
    nube(ctx, L / 2, 220, 150, "#6E7C88");
    [220, 512, 800].forEach((x, i) => {
      nube(ctx, x, 470, 78, "#93A1AC");
      linea(ctx, [L / 2 + (x - L / 2) * 0.25, 330], [x, 410], TINTA, 7, true);
    });
    panelSolar(ctx, 220, 760, 105);
    turbinaIcono(ctx, 512, 700, 150);
    vaporIcono(ctx, 800, 690, 110);
  },
};

function mezcla(hex, hacia, cuanto) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = n(hex), [r2, g2, b2] = n(hacia);
  const m = (a, b) => Math.round(a + (b - a) * cuanto).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

const CACHE = join(dirname(new URL(import.meta.url).pathname.slice(1)), "ilustraciones");
for (const [archivo, dibuja] of Object.entries(DIBUJOS)) {
  const canvas = createCanvas(L, L);
  const ctx = canvas.getContext("2d");
  dibuja(ctx);
  const destino = join(CACHE, archivo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, canvas.toBuffer("image/png"));
  console.log("ok", archivo);
}
