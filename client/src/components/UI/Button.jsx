import { motion } from 'framer-motion';

/**
 * Componente Button reutilizable con variantes
 */
export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  fullWidth = false,
  icon = null,
  className = ''
}) {
  const baseClasses = 'font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg';
  
  const variants = {
    primary: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400',
    secondary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400',
    outline: 'bg-white hover:bg-gray-100 text-gray-800 border-2 border-gray-300 disabled:bg-gray-100',
    ghost: 'bg-transparent hover:bg-white/10 text-white disabled:opacity-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </motion.button>
  );
}

export default Button;
