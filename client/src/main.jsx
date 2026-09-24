import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTheme } from './hooks/useTheme';
import './styles/globals.css';

initTheme();

/* Service worker: solo en producción. En desarrollo estorbaría al recargado
   en caliente de Vite. La ruta va relativa para que funcione igual servido en
   la raíz que bajo /taji/ — ver el comentario de rutas en index.html.
   Lo que hace (y lo que a propósito NO hace) está explicado en public/sw.js. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch((e) => console.warn('No se pudo registrar el service worker:', e));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
