import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');

/* Ruta exacta del logger del servidor. Se compara por ruta ya resuelta y no
   por el texto del import, porque cada pieza del motor lo pide con una ruta
   relativa distinta según dónde viva. */
const LOGGER_DEL_SERVIDOR = path.resolve(raiz, 'server/utils/logger.js');
const LOGGER_PARA_NAVEGADOR = path.resolve(aqui, 'src/offline/loggerNavegador.js');

/**
 * El modo sin conexión corre las MISMAS reglas que el servidor: el cliente
 * importa directamente `server/models/*` y `server/utils/*` en vez de tener
 * una copia. Son 2 400 líneas de JavaScript puro —sin fs, sin path, sin
 * require— así que funcionan igual en el navegador. Una copia aparte se
 * desincronizaría con el servidor a la primera corrección de reglas, y
 * entonces la partida sin conexión jugaría distinto que la de red.
 *
 * Lo único que no cruza es el logger, que usa `util` y `process.env`. Este
 * complemento lo cambia por uno de navegador.
 */
function motorParaNavegador() {
  return {
    name: 'motor-para-navegador',
    enforce: 'pre',
    async resolveId(origen, quienImporta) {
      if (!quienImporta) return null;
      const resuelto = await this.resolve(origen, quienImporta, { skipSelf: true });
      if (resuelto && path.resolve(resuelto.id) === LOGGER_DEL_SERVIDOR) {
        return LOGGER_PARA_NAVEGADOR;
      }
      return null;
    },
  };
}

/**
 * Deja escrita la lista de todo lo que el build produce, para que el service
 * worker la precargue y el juego funcione sin conexión.
 *
 * Hace falta porque los nombres llevan hash (index-BjBfzIV9.js) y cambian en
 * cada compilación: el service worker no puede traerlos escritos a mano. Se
 * recorre dist/ al terminar, que además recoge lo de public/ (el arte de las
 * cartas y las plantas), que no pasa por el grafo de dependencias.
 *
 * Las rutas se guardan RELATIVAS ("./assets/…") a propósito: en producción el
 * juego vive bajo /taji/, y así el service worker las resuelve contra su
 * propia ubicación sin tener que saber dónde está montado.
 */
function listaParaCache() {
  return {
    name: 'lista-para-cache',
    apply: 'build',
    closeBundle() {
      const salida = path.resolve(aqui, 'dist');
      const archivos = [];
      const recorrer = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const completo = path.join(dir, e.name);
          if (e.isDirectory()) { recorrer(completo); continue; }
          // Los mapas de depuración no los necesita nadie sin conexión
          if (e.name.endsWith('.map') || e.name === 'precache.json') continue;
          archivos.push('./' + path.relative(salida, completo).split(path.sep).join('/'));
        }
      };
      recorrer(salida);
      fs.writeFileSync(
        path.join(salida, 'precache.json'),
        JSON.stringify({ generado: new Date().toISOString(), archivos }, null, 2),
      );
      const peso = archivos.reduce((n, a) => n + fs.statSync(path.join(salida, a)).size, 0);
      this.warn(`precache.json: ${archivos.length} archivos, ${(peso / 1048576).toFixed(1)} MB`);
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [motorParaNavegador(), react(), listaParaCache()],
  // En producción el juego vive en ludoenergia.com/taji/ (el sitio ocupa la
  // raíz). En desarrollo se queda en la raíz de :5173. Las rutas a public/
  // desde el código pasan por rutaPublica() (utils/constants.js).
  base: command === 'build' ? '/taji/' : '/',
  server: {
    port: 5173,
    host: true,
    fs: {
      // Permite servir el motor, que vive fuera de client/
      allow: [raiz],
    },
  },
  build: {
    outDir: 'dist',
    // Sin sourcemaps en producción: el doble de archivos que subir y nadie
    // los consulta en el servidor.
    sourcemap: false,
  },
}));
