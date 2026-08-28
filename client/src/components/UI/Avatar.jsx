import { getAvatarById } from '../../utils/avatars';

/**
 * Avatar de jugador — siempre un ícono SVG dentro de un círculo de color.
 */
export function Avatar({ id, size = 40, className = '' }) {
  const { Icon, color } = getAvatarById(id);

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
      }}
    >
      <Icon size={Math.round(size * 0.56)} strokeWidth={2.2} />
    </div>
  );
}

export default Avatar;
