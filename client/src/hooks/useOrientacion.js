import { useEffect, useState } from 'react';

/**
 * Devuelve true cuando la pantalla es más alta que ancha (celular en vertical).
 * El tablero usa dos acomodos distintos: horizontal (16:9) y vertical (columna).
 */
export function useOrientacion() {
  const [esVertical, setEsVertical] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-aspect-ratio: 1/1)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-aspect-ratio: 1/1)');
    const alCambiar = (e) => setEsVertical(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  return esVertical;
}

export default useOrientacion;
