import { useCallback, useState } from 'react';

const KEY = 'taji-sound';

function read() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Preferencia de sonido (persistida). El sistema de audio se conectará más
 * adelante; por ahora solo guarda la elección del jugador.
 */
export function useSound() {
  const [enabled, setEnabledState] = useState(read);

  const setEnabled = useCallback((next) => {
    const value = !!next;
    setEnabledState(value);
    try {
      localStorage.setItem(KEY, value ? 'on' : 'off');
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  return [enabled, setEnabled];
}

export default useSound;
