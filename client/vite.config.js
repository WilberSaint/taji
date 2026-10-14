import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En producción el juego vive en ludoenergia.com/taji/ (el sitio ocupa la
  // raíz). En desarrollo se queda en la raíz de :5173. Las rutas a public/
  // desde el código pasan por rutaPublica() (utils/constants.js).
  base: command === 'build' ? '/taji/' : '/',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    // Sin sourcemaps en producción: el doble de archivos que subir y nadie
    // los consulta en el servidor.
    sourcemap: false
  }
}));
