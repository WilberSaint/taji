// Generador del arte de TAJI, siguiendo el brief del 2026-09-20.
//
// Reparto del trabajo:
//   · el modelo (Stable Diffusion XL en Forge, local) dibuja SOLO la ilustración
//     cuadrada que va dentro de la ventana de la carta;
//   · carta.mjs dibuja el marco, los medallones y la placa, que son idénticos en
//     las 21 cartas.
// Así se cumple la regla de oro del brief —misma plantilla para toda la
// familia— sin depender de que el modelo repita un marco, cosa que no sabe
// hacer.
//
// Uso:  node generar.mjs [cartas|tablero|fondo|todo] [--solo nombre]
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { dibujaCarta, dibujaReverso } from "./carta.mjs";

const API = process.env.FORGE || "http://127.0.0.1:7860";
const MODELO = process.env.MODELO || "bluePencilXL_v700";
const FFMPEG = process.env.FFMPEG || "C:/Users/TheSaint/Documents/Proyectos/agente-video/bin/ffmpeg.exe";

const DRIVE = "C:/Users/TheSaint/Documents/Proyectos/taji/entregables/Drive-LUDO-ENERGIA/03 · Diseño gráfico";
const REVISION = join(DRIVE, "Cartas", "2 · Para revisión");
const TABLERO = join(DRIVE, "Tablero y fondos");
const CACHE = join(dirname(new URL(import.meta.url).pathname.slice(1)), "ilustraciones");

// Bloque de estilo AJUSTADO tras probarlo en esta máquina (2026-09-23): el del
// brief, tal cual, salía como pintura digital con degradados y cielo turquesa.
// Estas palabras —contorno grueso, dos tonos, sin degradado, formas
// geométricas— son las que de verdad producen plano vectorial en bluePencilXL,
// y de paso fijan la paleta del brief.
const ESTILO = [
  "flat vector illustration, 2d game asset, sticker art, thick uniform dark outlines,",
  "cel shading with two tones per color, flat colors, no gradients,",
  "bold simple geometric shapes, minimal detail, children's picture book,",
  "warm palette of sand beige, clear blue sky, amber and mezquite green,",
  "Sonoran desert of northwest Mexico, one big centered subject, simple background,",
  "high contrast, readable at thumbnail size, no text",
].join(" ");

const ESTILO_TABLERO = [
  "isometric diorama, 30 degree isometric view, miniature model on a square earth base,",
  "flat vector shading, rounded shapes, dark ink outlines #16212A, warm daylight,",
  "Sonoran desert materials, centered, isolated on a plain solid magenta background, no text",
].join(" ");

const NEGATIVO = [
  "text, letters, words, numbers, watermark, signature, logo, brand, photorealistic, photo, 3d render,",
  "glossy, blurry, noisy texture, cluttered background, extra limbs, deformed hands,",
  "snow, pine trees, skyscrapers, flags, weapons, blood, stereotype costume,",
  // añadidos tras medir: sin esto salen degradados, brillos y cielos turquesa
  "gradient, realistic lighting, painterly, fine detail, lens flare, depth of field,",
  "teal, turquoise, purple sky, neon",
].join(" ");

// --- las 20 cartas, tal como vienen en el brief ---
export const CARTAS = [
  { archivo: "plantas/solar.png", tipo: "planta", energia: "solar", escena: "a small solar farm of blue photovoltaic panels on a sandy desert plain, bright sun, saguaro cactus in the background, clear sky, amber #DF9A34 accents" },
  { archivo: "plantas/eolica.png", tipo: "planta", energia: "eolica", escena: "three white wind turbines spinning on a gentle hill with desert shrubs, light breeze lines, sky blue #4F9FD2 background" },
  { archivo: "plantas/hidroelectrica.png", tipo: "planta", energia: "hidroelectrica", escena: "a concrete dam wall across a rocky canyon seen from the front, three open spillway gates with white water rushing out, deep blue reservoir behind, sierra mountains, sunny" },
  { archivo: "plantas/geotermica.png", tipo: "planta", energia: "geotermica", escena: "a geothermal power station with white steam rising from a volcanic landscape, pipes and cooling towers, terracotta #C55C3C rocks" },
  { archivo: "plantas/comodin.png", tipo: "planta", energia: "comodin", escena: "a round platform seen from above divided into four equal quadrants, one quadrant with a small solar panel, one with a small white wind turbine, one with a small dam wall, one with a steaming pipe, teal accents, simple flat icons, plain sand background" },

  { archivo: "mantenimientos/solar.png", tipo: "mantenimiento", energia: "solar", escena: "a woman technician with helmet cleaning a solar panel with a soft brush, a checklist clipboard, sunny desert" },
  { archivo: "mantenimientos/eolica.png", tipo: "mantenimiento", energia: "eolica", escena: "two technicians in orange safety vests and white helmets with climbing harnesses standing on the service platform of a wind turbine, one holding a large wrench, close view, blue sky" },
  { archivo: "mantenimientos/hidroelectrica.png", tipo: "mantenimiento", energia: "hidroelectrica", escena: "a technician adjusting a valve wheel at a dam control station, water flowing calmly, protective gloves" },
  { archivo: "mantenimientos/geotermica.png", tipo: "mantenimiento", energia: "geotermica", escena: "an older man technician in a white helmet and blue work shirt checking a round pressure gauge on a thick metal pipe, white steam behind him, close view, desert ground" },
  { archivo: "mantenimientos/comodin.png", tipo: "mantenimiento", energia: "comodin", escena: "a large open toolbox with a wrench, screwdriver and shield symbol glowing softly, teal #0B7480 accents" },

  { archivo: "riesgos/solar.png", tipo: "riesgo", energia: "solar", escena: "a dust storm covering solar panels with sand, dim orange sky, panels half buried, no people" },
  { archivo: "riesgos/eolica.png", tipo: "riesgo", energia: "eolica", escena: "a wind turbine bending in a strong gust with swirling wind lines and a flock of birds nearby, stormy grey-blue sky" },
  { archivo: "riesgos/hidroelectrica.png", tipo: "riesgo", energia: "hidroelectrica", escena: "a hydroelectric dam with a nearly empty reservoir, cracked dry earth, low water line, hot sun" },
  { archivo: "riesgos/geotermica.png", tipo: "riesgo", energia: "geotermica", escena: "a thick metal pipe with a broken joint shooting a jet of white steam sideways, an orange warning triangle sign beside it, volcanic rocks, no people" },
  { archivo: "riesgos/comodin.png", tipo: "riesgo", energia: "comodin", escena: "a dark storm cloud with one big yellow lightning bolt striking down toward a small wind turbine and a solar panel below, ochre glow, desert ground, no smoke, no chimneys" },

  { archivo: "eventos/compra.png", tipo: "evento", energia: "comodin", escena: "a woman and a man in work clothes shaking hands in the center of the frame, between them a table with a small model of a solar panel, desert background, friendly" },
  { archivo: "eventos/intercambio_planta.png", tipo: "evento", energia: "comodin", escena: "a miniature white wind turbine on the left and a miniature blue solar panel on the right, two big curved arrows swapping their places between them, plain sand background" },
  { archivo: "eventos/intercambio_terreno.png", tipo: "evento", energia: "comodin", escena: "two small isometric plots of land swapping places with large curved arrows between them, desert terrain" },
  { archivo: "eventos/esparcimiento.png", tipo: "evento", energia: "comodin", escena: "one dark storm cloud in the center splitting into three smaller clouds that move along dotted arrows toward three small power plants below, plain sky" },
  { archivo: "eventos/descarte.png", tipo: "evento", energia: "comodin", escena: "five blank rectangular cards with completely empty faces flying upward in a spiral above a wooden table, motion lines, plain background, no symbols" },
];

export const REVERSO = "symmetrical card back design, four quadrants in amber #DF9A34, sky blue #4F9FD2, deep blue #3A6AAE and terracotta #C55C3C meeting in a central teal #0B7480 diamond, subtle geometric pattern inspired by Sonoran indigenous textile motifs, abstract and respectful, no text, perfectly centered";

export const TABLERO_PIEZAS = [
  { archivo: "solar-off.png", escena: "empty square desert plot prepared for construction, survey stakes and foundation outlines, muted colors" },
  { archivo: "solar-on.png", escena: "same square desert plot with rows of blue solar panels and a small inverter box, bright sunny colors" },
  { archivo: "eolica-off.png", escena: "empty square hill plot with three concrete turbine foundations, muted colors" },
  { archivo: "eolica-on.png", escena: "same hill plot with three white wind turbines, bright colors" },
  { archivo: "hidroelectrica-off.png", escena: "empty square canyon plot with a dry riverbed and a marked dam site, muted colors" },
  { archivo: "hidroelectrica-on.png", escena: "same canyon plot with a small dam, flowing water and a turbine house, bright colors" },
  { archivo: "geotermica-off.png", escena: "empty square volcanic rock plot with a capped well marker, muted colors" },
  { archivo: "geotermica-on.png", escena: "same volcanic plot with a geothermal station, pipes and white steam, bright colors" },
];

export const FONDO = "wide aerial map of a whole desert region seen from high above, several small villages with a few houses each, long dirt roads crossing the plain, a winding river, a low sierra ridge along the top, the sea coast along the right edge, a few tiny solar farms and wind turbines spread out, large empty sandy areas in the middle, dusk light, calm muted colors, flat vector map illustration, no labels";

// --- llamada al modelo ---
// El modelo no interpreta los códigos hex del brief y solo despistan; la
// paleta ya va fijada en el bloque de estilo.
const sinHex = (t) => t.replace(new RegExp('#[0-9A-Fa-f]{6}\s*', 'g'), '');

export async function genera({ prompt, destino, ancho = 1024, alto = 1024, semilla = 11, pasos = 28, cfg = 7.0, negativo = NEGATIVO }) {
  // Dos pasadas. Medido en esta máquina el 2026-09-23:
  //   · pedir 1024 de una vez con Juggernaut: más de 15 minutos, sin terminar;
  //   · base 640 sola: 31 s, pero el modelo dibuja el sujeto pequeñito;
  //   · base 640 + segunda pasada a 1024: 47 s y el sujeto sale grande.
  // El denoise de la segunda pasada va en 0,20: con 0,35 REINTERPRETA el dibujo
  // y lo devuelve pintado y lleno de detalle, justo lo contrario del brief.
  const base = 640;
  const cuerpo = {
    prompt, negative_prompt: negativo, seed: semilla, steps: pasos, cfg_scale: cfg,
    width: base, height: Math.round((base * alto) / ancho / 8) * 8,
    sampler_name: "DPM++ 2M", scheduler: "karras",
    enable_hr: true, hr_resize_x: ancho, hr_resize_y: alto,
    hr_second_pass_steps: 12, hr_upscaler: "4x-UltraSharp",
    denoising_strength: 0.2, hr_additional_modules: [],
    override_settings: { sd_model_checkpoint: MODELO },
    override_settings_restore_afterwards: true,
  };
  const r = await fetch(`${API}/sdapi/v1/txt2img`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Forge respondió ${r.status}`);
  const { images } = await r.json();
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, Buffer.from(images[0], "base64"));
  return destino;
}

// --- flujos ---
async function hazCartas(solo) {
  for (const c of CARTAS) {
    if (solo && !c.archivo.includes(solo)) continue;
    const ilustracion = join(CACHE, c.archivo);
    const t0 = Date.now();
    if (!existsSync(ilustracion)) {
      await genera({ prompt: `${sinHex(c.escena)}, ${ESTILO}`, destino: ilustracion });
    }
    const destino = join(REVISION, c.archivo);
    mkdirSync(dirname(destino), { recursive: true });
    await dibujaCarta({ destino, tipo: c.tipo, energia: c.energia, ilustracion });
    console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s  ${c.archivo}`);
  }
  if (!solo || "card-back".includes(solo)) {
    const ilustracion = join(CACHE, "card-back.png");
    if (!existsSync(ilustracion)) {
      await genera({ prompt: `${sinHex(REVERSO)}, ${ESTILO}`, destino: ilustracion, ancho: 1024, alto: 1024 });
    }
    await dibujaReverso({ destino: join(REVISION, "card-back.png"), ilustracion });
    console.log("card-back.png");
  }
}

// El brief pide las 8 piezas con fondo transparente. SDXL no sabe generar alfa,
// así que se dibujan sobre magenta y ese color se convierte en transparencia.
// El magenta se eligió porque no existe en un paisaje del desierto: con blanco
// se habrían borrado el vapor y los reflejos de los paneles.
async function recortaMagenta(origen, destino) {
  const { spawnSync } = await import("node:child_process");
  mkdirSync(dirname(destino), { recursive: true });
  const r = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", origen,
    "-vf", "colorkey=0xFF00FF:0.30:0.10,format=rgba", destino], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg no pudo recortar " + origen);
}

async function hazTablero(solo) {
  for (const p of TABLERO_PIEZAS) {
    if (solo && !p.archivo.includes(solo)) continue;
    const crudo = join(CACHE, "plants", p.archivo);
    if (!existsSync(crudo)) {
      await genera({ prompt: `${sinHex(p.escena)}, ${ESTILO_TABLERO}`, destino: crudo, ancho: 1024, alto: 1024 });
    }
    await recortaMagenta(crudo, join(TABLERO, "plants", p.archivo));
    console.log("pieza", p.archivo);
  }
}

async function hazFondo() {
  // SDXL no da 3840x2160 de una pieza en 6 GB; se genera en 16:9 grande y el
  // escalado final lo hace ffmpeg, que para un fondo que se ve al 40-50% de
  // brillo es de sobra.
  const base = join(CACHE, "background-base.png");
  if (!existsSync(base)) {
    await genera({ prompt: `${sinHex(FONDO)}, ${ESTILO}`, destino: base, ancho: 1344, alto: 768, pasos: 34 });
  }
  // A 3840x2160 con lanczos. Ampliar arte plano no lo estropea —no hay textura
  // que inventar— y el fondo se ve al 40-50% de brillo detrás de todo.
  const { spawnSync } = await import("node:child_process");
  const destino = join(TABLERO, "backgrounds", "background.png");
  mkdirSync(dirname(destino), { recursive: true });
  spawnSync(FFMPEG, ["-v", "error", "-y", "-i", base,
    "-vf", "scale=3840:2160:flags=lanczos", destino], { stdio: "inherit" });
  console.log("fondo listo:", destino);
}

const que = process.argv[2] || "todo";
const solo = process.argv.includes("--solo") ? process.argv[process.argv.indexOf("--solo") + 1] : null;
if (que === "cartas" || que === "todo") await hazCartas(solo);
if (que === "tablero" || que === "todo") await hazTablero(solo);
if (que === "fondo" || que === "todo") await hazFondo();
