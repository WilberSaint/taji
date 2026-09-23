import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

/**
 * Componente Toast para notificaciones
 */
export function Toast() {
  const { notification, setNotification } = useGameStore();

  if (!notification) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  // Colores del sistema de diseño, no los de Tailwind: así el aviso combina
  // con el resto del juego y respeta el tema claro/oscuro.
  const colors = {
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--info)'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        // Centrado con inset-x + justify-center: con `left-1/2` el ancho
        // disponible era medio viewport y el texto se partía letra por letra.
        className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
      >
        <div
          className="pointer-events-auto flex max-w-[min(92vw,420px)] items-center gap-3 rounded-xl px-5 py-3 text-white shadow-2xl"
          style={{ background: colors[notification.type] || colors.info }}
        >
          {icons[notification.type]}
          <span className="flex-1 font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Toast;
