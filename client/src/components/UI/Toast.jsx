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

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -50, x: '-50%' }}
        className="fixed top-4 left-1/2 z-50"
      >
        <div className={`${colors[notification.type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px]`}>
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
