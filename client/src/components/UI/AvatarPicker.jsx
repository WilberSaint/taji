import { AVATARS } from '../../utils/avatars';
import Avatar from './Avatar';

/**
 * Selector de avatar — para que cada jugador pueda cambiar su ícono.
 */
export function AvatarPicker({ value, onChange, size = 40 }) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Elige tu avatar">
      {AVATARS.map((a) => {
        const selected = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Avatar ${a.id}`}
            onClick={() => onChange(a.id)}
            className={`grid place-items-center rounded-[var(--r-sm)] border-2 p-1.5 transition-colors ${
              selected ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-surface-2'
            }`}
          >
            <Avatar id={a.id} size={size} />
          </button>
        );
      })}
    </div>
  );
}

export default AvatarPicker;
