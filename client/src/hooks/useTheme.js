import { useCallback, useEffect, useState } from 'react';

const KEY = 'taji-theme';
const VALID = ['system', 'light', 'dark'];

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return VALID.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/**
 * Tema de la interfaz: 'system' | 'light' | 'dark'.
 * 'system' respeta la preferencia del sistema operativo.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(read);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const value = VALID.includes(next) ? next : 'system';
    setThemeState(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  return [theme, setTheme];
}

/** Aplica el tema guardado lo antes posible (llamar desde main.jsx). */
export function initTheme() {
  apply(read());
}

export default useTheme;
