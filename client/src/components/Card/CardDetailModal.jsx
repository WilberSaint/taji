import Modal from '../UI/Modal';
import { CARD_TYPE_COLORS, CARD_TYPE_LABELS } from '../../utils/constants';

/**
 * Detalle de una carta: imagen grande + descripción completa.
 * Se abre desde el botón "i" de cada carta en la mano (ver PlayerHand) porque
 * en pantallas chicas el texto de la carta es ilegible a su tamaño normal.
 */
export function CardDetailModal({ card, isOpen, onClose }) {
  if (!card) return null;

  const typeColor = CARD_TYPE_COLORS[card.type] || '#0B7480';
  const typeLabel = CARD_TYPE_LABELS[card.type] || card.type;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-40 aspect-[7/10] overflow-hidden rounded-xl shadow-e2">
          <img src={card.image} alt={card.name} className="h-full w-full object-cover object-center" />
        </div>

        <div>
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ background: typeColor }}
          >
            {typeLabel}
          </span>
          <h3 className="mt-2 font-display text-lg font-bold text-ink">{card.name}</h3>
        </div>

        {card.description && (
          <p className="text-sm leading-relaxed text-ink-soft">{card.description}</p>
        )}
      </div>
    </Modal>
  );
}

export default CardDetailModal;
