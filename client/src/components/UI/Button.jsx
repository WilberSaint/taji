import { motion } from 'framer-motion';

/**
 * Botón del sistema de diseño TAJI.
 * Variantes: primary | secondary | ghost | danger | warning  (outline y success son alias)
 * Tamaños: sm | md | lg
 */
const VARIANTS = {
  primary:
    'bg-primary text-[var(--on-primary)] border-transparent shadow-e1 hover:bg-primary-hover',
  secondary:
    'bg-surface text-ink border-line-strong shadow-e1 hover:bg-surface-2',
  ghost:
    'bg-transparent text-ink-soft border-transparent hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-state-danger text-white border-transparent shadow-e1 hover:brightness-95',
  warning:
    'bg-state-warning text-white border-transparent shadow-e1 hover:brightness-95',
};

const ALIASES = { outline: 'secondary', success: 'primary' };

const SIZES = {
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-[18px] py-3 text-sm gap-2',
  lg: 'px-6 py-[15px] text-base gap-2',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  icon = null,
  type = 'button',
  className = '',
}) {
  const resolved = ALIASES[variant] || variant;
  const variantClasses = VARIANTS[resolved] || VARIANTS.primary;

  return (
    <motion.button
      type={type}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { y: 0, scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-semibold font-body leading-none
        rounded-[var(--r-sm)] border-[1.5px] transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${SIZES[size] || SIZES.md}
        ${variantClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}

export default Button;
