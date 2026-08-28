import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Modal base del sistema de diseño.
 * - Overlay con blur, cierre por Escape / clic fuera / botón X.
 * - `title` opcional pinta la cabecera; si se omite, el contenido manda.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className={`
              relative w-full ${SIZES[size] || SIZES.md}
              bg-surface text-ink border border-line rounded-[var(--r-lg)] shadow-e3
              max-h-[90vh] overflow-y-auto
            `}
          >
            {showClose && (
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <X size={18} />
              </button>
            )}

            {title && (
              <div className="px-6 pt-6 pb-3 pr-14">
                <h2 className="font-display text-xl font-bold">{title}</h2>
              </div>
            )}

            <div className={title ? 'px-6 pb-6' : 'p-6'}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
