import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5175,
    host: true,
  },
  build: {
    outDir: 'dist',
    // Sitio ligero: sin sourcemaps en producción.
    sourcemap: false,
  },
});
