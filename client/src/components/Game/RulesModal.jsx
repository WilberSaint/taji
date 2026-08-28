import Modal from '../UI/Modal';

const CARD_RULES = [
  ['Planta', 'Va en un espacio vacío de tu tablero del tipo correcto. El comodín entra en cualquiera.'],
  ['Mantenimiento', 'Sobre una planta tuya. Uno la protege; dos la vuelven inmune.'],
  ['Riesgo', 'Sobre una planta rival. Dos riesgos la destruyen. No se puede sobre plantas inmunes.'],
  ['Anulación mutua', 'Jugar un mantenimiento sobre un riesgo (o al revés) cancela ambas cartas.'],
];

const EVENT_RULES = [
  ['Compra', 'Te llevas una planta de otro jugador a un hueco tuyo.'],
  ['Intercambio de planta', 'Cambias una de tus plantas por la de un rival.'],
  ['Intercambio de terreno', 'Intercambias todo tu tablero con el de otro jugador.'],
  ['Esparcimiento', 'Mueves tus riesgos a las plantas de los rivales.'],
  ['Descarte', 'Todos descartan su mano y roban de nuevo; tú vuelves a jugar.'],
];

export function RulesModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cómo se juega" size="lg">
      <div className="space-y-5 text-sm leading-relaxed">
        <section>
          <h3 className="font-display text-base font-bold text-ink">Objetivo</h3>
          <p className="mt-1 text-ink-soft">
            Sé el primero en tener las <b>cuatro plantas</b> —solar, eólica, hidroeléctrica y
            geotérmica— en tu tablero, <b>sin ningún riesgo activo</b> sobre ellas.
          </p>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">Tu turno</h3>
          <p className="mt-1 text-ink-soft">
            Juega <b>una</b> carta <i>o</i> descarta entre 1 y 3 cartas. Después robas hasta
            tener 3 en la mano y el turno pasa al siguiente jugador.
          </p>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">Cartas</h3>
          <dl className="mt-2 space-y-2">
            {CARD_RULES.map(([term, desc]) => (
              <div key={term} className="rounded-[var(--r-md)] bg-surface-2 p-3">
                <dt className="font-semibold text-ink">{term}</dt>
                <dd className="text-ink-soft">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="font-display text-base font-bold text-ink">Eventos</h3>
          <dl className="mt-2 space-y-2">
            {EVENT_RULES.map(([term, desc]) => (
              <div key={term} className="rounded-[var(--r-md)] bg-surface-2 p-3">
                <dt className="font-semibold text-ink">{term}</dt>
                <dd className="text-ink-soft">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Modal>
  );
}

export default RulesModal;
