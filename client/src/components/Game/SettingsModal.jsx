import { Monitor, Sun, Moon, Volume2, VolumeX, LogOut, BookOpen } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { useTheme } from '../../hooks/useTheme';
import { useSound } from '../../hooks/useSound';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

function Row({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="font-semibold text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-soft">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, onOpenRules, onLeaveGame }) {
  const [theme, setTheme] = useTheme();
  const [soundOn, setSoundOn] = useSound();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustes" size="md">
      <div className="divide-y divide-line">
        <Row label="Tema" hint="«Sistema» sigue la preferencia de tu dispositivo.">
          <div className="flex gap-1 rounded-[var(--r-sm)] bg-surface-2 p-1">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={`flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  theme === value
                    ? 'bg-surface text-ink shadow-e1'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Sonido" hint="Efectos de cartas y avisos de turno.">
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            aria-pressed={soundOn}
            className={`flex items-center gap-2 rounded-[var(--r-sm)] border-[1.5px] px-3 py-2 text-xs font-semibold transition-colors ${
              soundOn
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line-strong bg-surface text-ink-soft'
            }`}
          >
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {soundOn ? 'Activado' : 'Silenciado'}
          </button>
        </Row>

        <Row label="Reglas" hint="Repasa cómo se juega sin salir de la partida.">
          <Button variant="secondary" size="sm" icon={<BookOpen size={15} />} onClick={onOpenRules}>
            Ver reglas
          </Button>
        </Row>

        <Row label="Salir de la partida" hint="Dejarás tu lugar en la mesa.">
          <Button variant="danger" size="sm" icon={<LogOut size={15} />} onClick={onLeaveGame}>
            Salir
          </Button>
        </Row>
      </div>
    </Modal>
  );
}

export default SettingsModal;
