// Plantilla de carta TAJI, dibujada con código.
//
// El brief manda que las 21 cartas compartan marco, medallones y placa: «la
// consistencia importa más que que una carta suelta quede espectacular». Un
// modelo de imagen no puede garantizar eso —cada carta le sale un marco
// distinto, como pasó en la versión anterior, donde una es amarilla, otra azul
// y otra roja—, así que aquí la ilustración la pone el modelo y TODO lo demás
// lo dibuja este archivo. Así el marco es idéntico al píxel.
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

export const W = 1500, H = 2100;          // 5:7, lo que pide el brief
export const RADIO = 60;                   // esquinas redondeadas
export const MARCO = 60;                   // grosor del marco de color
const BANDA_SUP = 260;                     // franja de los medallones
const VENTANA_FIN = 1640;                  // donde termina la ilustración
const PLACA_FIN = 2040;                    // donde termina la placa de nombre

// Colores del brief, tal cual.
export const TIPO = {
  planta: "#3B9668",
  mantenimiento: "#3C79BE",
  riesgo: "#B57F1C",
  evento: "#8E6FB8",
};
export const ENERGIA = {
  solar: "#DF9A34",
  eolica: "#4F9FD2",
  hidroelectrica: "#3A6AAE",
  geotermica: "#C55C3C",
  comodin: "#0B7480",
};
export const TINTA = "#16212A";
export const CREMA = "#F4EFE6";

// mezcla sirve para «suavizar» un color de energía hacia la crema, que es como
// el brief describe el fondo de la ventana.
export function mezcla(hex, hacia, cuanto) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = n(hex), [r2, g2, b2] = n(hacia);
  const m = (a, b) => Math.round(a + (b - a) * cuanto).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

function rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// dibujaCarta arma una carta completa. ilustracion es la ruta del PNG cuadrado
// que salió del modelo; va dentro de la ventana y nada más.
export async function dibujaCarta({ destino, tipo, energia, ilustracion }) {
  const colorTipo = TIPO[tipo];
  const colorEnergia = ENERGIA[energia] || ENERGIA.comodin;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fuera de las esquinas va blanco: el brief lo pide así para que al imprimir
  // el troquel no deje un borde de color.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Marco del tipo de carta.
  rect(ctx, 0, 0, W, H, RADIO);
  ctx.fillStyle = colorTipo;
  ctx.fill();

  // Interior: crema, para que el marco se lea como marco.
  rect(ctx, MARCO, MARCO, W - MARCO * 2, H - MARCO * 2, RADIO - 18);
  ctx.fillStyle = CREMA;
  ctx.fill();

  // --- ventana de ilustración ---
  const vx = MARCO, vy = BANDA_SUP, vw = W - MARCO * 2, vh = VENTANA_FIN - BANDA_SUP;
  ctx.save();
  rect(ctx, vx, vy, vw, vh, 28);
  ctx.clip();
  ctx.fillStyle = mezcla(colorEnergia, CREMA, 0.72); // el color de energía suavizado
  ctx.fillRect(vx, vy, vw, vh);
  if (ilustracion) {
    const img = await loadImage(ilustracion);
    // La ilustración es cuadrada y la ventana también, pero por si acaso se
    // recorta al centro en vez de deformarse.
    const escala = Math.max(vw / img.width, vh / img.height);
    const iw = img.width * escala, ih = img.height * escala;
    ctx.drawImage(img, vx + (vw - iw) / 2, vy + (vh - ih) / 2, iw, ih);
  }
  ctx.restore();
  // Filo de color de energía alrededor de la ventana: es lo que distingue solar
  // de eólica de un vistazo, incluso en miniatura.
  rect(ctx, vx + 5, vy + 5, vw - 10, vh - 10, 24);
  ctx.strokeStyle = colorEnergia;
  ctx.lineWidth = 10;
  ctx.stroke();

  // --- medallones vacíos ---
  // Van vacíos a propósito: el juego dibuja encima el ícono del tipo y el de la
  // energía, y así la misma carta sirve en los cuatro idiomas.
  const r = 88, cy = BANDA_SUP / 2 + 12;
  for (const cx of [MARCO + 40 + r, W - MARCO - 40 - r]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = colorTipo;
    ctx.stroke();
  }

  // --- placa de nombre vacía ---
  // Ancha y alta a propósito: en yoreme y yoeme el nombre es más largo que en
  // español y tiene que caber sin achicar la tipografía.
  const px = MARCO + 40, py = VENTANA_FIN + 34;
  const pw = W - (MARCO + 40) * 2, ph = PLACA_FIN - py - 10;
  rect(ctx, px, py, pw, ph, 34);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = colorTipo;
  ctx.stroke();

  writeFileSync(destino, canvas.toBuffer("image/png"));
  return destino;
}

// dibujaReverso: sin medallones ni placa, mismo tamaño y esquinas.
export async function dibujaReverso({ destino, ilustracion }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  rect(ctx, 0, 0, W, H, RADIO);
  ctx.fillStyle = TINTA;
  ctx.fill();
  ctx.save();
  rect(ctx, MARCO / 2, MARCO / 2, W - MARCO, H - MARCO, RADIO - 12);
  ctx.clip();
  const img = await loadImage(ilustracion);
  const escala = Math.max((W - MARCO) / img.width, (H - MARCO) / img.height);
  const iw = img.width * escala, ih = img.height * escala;
  ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  ctx.restore();
  writeFileSync(destino, canvas.toBuffer("image/png"));
  return destino;
}
