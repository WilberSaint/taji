import { useState } from 'react';
import { motion } from 'framer-motion';
import { ENERGY_TYPES, CARD_TYPES, EVENT_TYPES } from '../../utils/constants';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import { Sun, Wind, Waves, Flame, AlertTriangle, Shield, ShieldCheck } from 'lucide-react';
import EfectoCasilla from './EfectoCasilla';
import { puedeJugarseEn } from '../../utils/jugadasValidas';

/* ===== DONDE VA EL SUELO DENTRO DEL LIENZO DE UNA BALDOSA =====
   Cada imagen de planta es un lienzo cuadrado de 1024 px, pero el rombo de
   tierra solo ocupa 935 x 606 px de ese lienzo (91.3% de ancho y 59.2% de
   alto), centrado — ver work/angulo.mjs. Los aros y elipses de estado se
   dibujaban contra el lienzo ENTERO y por eso se salían de la tarjeta por
   los lados y por abajo. Estas dos cajas los mantienen sobre la tierra. */
const SUELO_HOLGADO = { top: '24%', bottom: '24%', left: '8%', right: '8%' };

/* El mismo rombo, pero como recorte para el ÁREA DE TOQUE.
   Cada planta ocupaba, para efectos del dedo, todo su lienzo cuadrado, y esos
   cuadrados se encima entre sí: medido, tocar el centro de la SOLAR activaba
   la geotérmica, y la eólica y la geo activaban las dos la hidroeléctrica.
   Tres de cuatro plantas no respondían en su propio centro y había que
   apuntar más arriba. Con el recorte, cada una solo recibe toques sobre su
   rombo, y los cuatro rombos embaldosan sin encimarse. */
const RECORTE_SUELO = 'polygon(50% 20.4%, 95.65% 50%, 50% 79.6%, 4.35% 50%)';

/* ================= ENERGÍA =================
   `color` es fijo y lo usa el TABLERO CENTRAL, que siempre es oscuro (es el
   escenario, no cambia con el tema).

   `token` es el mismo color pero como variable de diseño, y lo usan los chips
   y renglones de RIVAL, que sí siguen el tema claro/oscuro. Hacía falta
   porque la hidro (#3A6AAE, azul oscuro) quedaba casi ilegible sobre el
   panel oscuro de los rivales: texto azul marino sobre fondo azul marino.
   Los tokens ya traen su versión aclarada para modo oscuro (globals.css),
   así que con esto las cuatro energías se leen bien en los dos temas.

   El relleno de fondo se queda con el hexadecimal y su transparencia: al ser
   un tinte muy suave funciona igual sobre claro que sobre oscuro, y así no
   hace falta color-mix() (que pide navegadores más nuevos). */
/* `corto` es para los chips de rival en celular. Medido a 393px de ancho —un
   iPhone normal—: el chip queda en 49px y "Eólica" con su ícono necesita unos
   61px, así que se cortaba y solo se leía la primera letra. Cuatro etiquetas
   completas más la columna del nombre no caben en esa pantalla, se muevan a
   donde se muevan. Tres letras sí, y con el ícono al lado no hay confusión
   posible. En pantallas anchas se usa el nombre completo. */
const ENERGY = {
  [ENERGY_TYPES.SOLAR]: { color: '#DF9A34', token: 'var(--solar)', Icon: Sun, label: 'Solar', corto: 'Sol' },
  [ENERGY_TYPES.EOLICA]: { color: '#4F9FD2', token: 'var(--wind)', Icon: Wind, label: 'Eólica', corto: 'Eól' },
  [ENERGY_TYPES.HIDROELECTRICA]: { color: '#3A6AAE', token: 'var(--hydro)', Icon: Waves, label: 'Hidro', corto: 'Hid' },
  [ENERGY_TYPES.GEOTERMICA]: { color: '#C55C3C', token: 'var(--geo)', Icon: Flame, label: 'Geo', corto: 'Geo' },
};

const SHIELD_COLOR = '#3C79BE';
const RISK_COLOR = '#C94A40';
const TARGET_COLOR = '#F5C042';

const SIZE_CLASSES = {
  portrait: {
    small: 'w-[58px] aspect-[3/4]',
    normal: 'w-[70px] aspect-[3/4]',
  },
  // Ancho explícito: con aspect-[4/3] el contenedor en columna los estiraba
  // a todo lo ancho del panel y quedaban como barras casi vacías.
  landscape: {
    small: 'h-[52px] w-[74px]',
    normal: 'h-[62px] w-[88px]',
  },
};

const PLANT_IMAGES = {
  [ENERGY_TYPES.EOLICA]: { on: '/assets/plants/eolica-on.webp', off: '/assets/plants/eolica-off.webp' },
  [ENERGY_TYPES.SOLAR]: { on: '/assets/plants/solar-on.webp', off: '/assets/plants/solar-off.webp' },
  [ENERGY_TYPES.GEOTERMICA]: { on: '/assets/plants/geotermica-on.webp', off: '/assets/plants/geotermica-off.webp' },
  [ENERGY_TYPES.HIDROELECTRICA]: { on: '/assets/plants/hidroelectrica-on.webp', off: '/assets/plants/hidroelectrica-off.webp' },
};

export default function PlayerSlot({
  slotType,
  slot,
  playerId,
  isMySlot,
  size = 'normal',
  orientation = 'portrait',
  variant = 'opponent',
  posEtiqueta = 'abajo',
  alto = 'compacto',
}) {
  const { selectedCard, setSelectedCard, isMyTurn, specialPlay, clearSpecialPlay, setSpecialPlay } = useGameStore();
  const { playCard } = useSocket();

  // ¿Qué le acaba de pasar a esta casilla? (construir, proteger, dañar...)
  const efecto = useGameStore(
    (s) => s.efectos.find((e) => e.clave === `${playerId}:${slotType}`)?.tipo || null
  );
  const destruyendo = efecto === 'destruir';

  // Solo para el realce al pasar el ratón en escritorio; en táctil no aplica
  const [encima, setEncima] = useState(false);

  const isEmpty = !slot?.plant;
  const isActive = !!slot?.plant;

  const maintenanceCount =
    slot?.modifiers?.filter((m) => m.type === CARD_TYPES.MANTENIMIENTO).length || 0;

  const riskCount =
    slot?.modifiers?.filter((m) => m.type === CARD_TYPES.RIESGO).length || 0;

  const isImmune = maintenanceCount === 2;
  const isDoubleRisk = riskCount === 2;

  const energy = ENERGY[slotType] || ENERGY[ENERGY_TYPES.SOLAR];

  /* Qué es esta casilla, en palabras. Un lector de pantalla solo ve el
     dibujo de la planta, que no dice nada: sin esto anunciaba "imagen" y ya.
     También es lo que lee el navegador al llegar con el tabulador. */
  const descripcionAccesible = () => {
    const dueno = isMySlot ? 'tu' : 'del rival';
    if (isEmpty) return `Espacio ${energy.label} ${isMySlot ? 'tuyo' : 'del rival'}, vacío`;
    let estado = 'funcionando';
    if (isImmune) estado = 'inmune, con dos mantenimientos';
    else if (riskCount >= 2) estado = 'destruida';
    else if (riskCount === 1) estado = 'dañada';
    else if (maintenanceCount === 1) estado = 'protegida';
    return `Planta ${energy.label} ${dueno}, ${estado}`;
  };

  const canPlayHere = () => {
    if (!isMyTurn) return false;

    if (selectedCard && !specialPlay) {
      /* La regla vive en utils/jugadasValidas.js, compartida con la mano de
         cartas: así lo que se enciende en el tablero y lo que se marca como
         jugable en la mano no pueden contradecirse. Es un espejo de
         server/utils/gameValidator.js; la autoridad sigue siendo el servidor. */
      return puedeJugarseEn(selectedCard, slot, slotType, isMySlot);
    }

    if (specialPlay) {
      const { card, step, pendiente, movimientos } = specialPlay;
      switch (card.subtype) {
        case EVENT_TYPES.COMPRA:
          return !isMySlot && !isEmpty;
        case EVENT_TYPES.INTERCAMBIO_PLANTA:
          if (step === 'origen') return isMySlot && !isEmpty;
          if (step === 'destino') return !isMySlot && !isEmpty;
          return false;
        case EVENT_TYPES.ESPARCIMIENTO:
          if (step === 'origen') {
            return isMySlot && riskCount > 0 && movimientos.find((m) => m.origen.slot === slotType) === undefined;
          }
          // pendiente?. y no pendiente.: si llegara nulo, esto se ejecuta en
          // pleno render y tumbaba el tablero completo en pantalla blanca.
          if (step === 'destino') return !isMySlot && !isEmpty && pendiente?.slot === slotType;
          return false;
        default:
          return false;
      }
    }
  };

  const clickable = canPlayHere();

  const handleClick = async () => {
    if (!isMyTurn) return;

    if (selectedCard && !specialPlay && clickable) {
      const movements = [{ destino: { jugador: playerId, slot: slotType } }];
      const resultado = await playCard(selectedCard.id, playerId, movements);
      // Si no se pudo, la carta sigue elegida para intentar en otro espacio
      if (resultado?.success !== false) setSelectedCard(null);
      return;
    }

    //Flujo especial
    if (specialPlay && clickable) {
      const slotRef = { jugador: playerId, slot: slotType };
      const { card, step, movimientos, pendiente } = specialPlay;

      switch (card.subtype) {
        case EVENT_TYPES.COMPRA: {
          await playCard(card.id, playerId, [{ destino: slotRef }]);
          clearSpecialPlay();
          setSelectedCard(null);
          break;
        }
        case EVENT_TYPES.INTERCAMBIO_PLANTA: {
          if (step === 'origen') {
            setSpecialPlay({ ...specialPlay, step: 'destino', pendiente: slotRef });
          } else if (step === 'destino') {
            const movements = [
              { origen: pendiente, destino: slotRef },
            ];
            await playCard(card.id, playerId, movements);
            clearSpecialPlay();
            setSelectedCard(null);
          }
          break;
        }
        case EVENT_TYPES.ESPARCIMIENTO: {
          if (step === 'origen') {
            setSpecialPlay({ ...specialPlay, step: 'destino', pendiente: slotRef });
          } else if (step === 'destino') {
            const nuevosMovimientos = [...movimientos, { origen: pendiente, destino: slotRef }];
            //Vuelve a pedir más virus o el usuario confirma manualmente
            setSpecialPlay({
              ...specialPlay,
              step: 'origen',
              movimientos: nuevosMovimientos,
              pendiente: null,
            });
          }
          break;
        }
      }
    }
  };

  /* ================= ESTADO =================
     El color solo no alcanza: el azul de "protegida" se perdía sobre las
     energías eólica e hidro, y el rojo de "en riesgo" se confundía con la
     geotérmica. Por eso cada estado tiene además su propia FORMA:
       · protegida → un escudo
       · inmune    → escudo con paloma y doble aro
       · en riesgo → rayas diagonales de peligro sobre la casilla
     Así se distinguen aunque alguien no vea bien los colores. */

  const RAYAS_RIESGO =
    `repeating-linear-gradient(45deg, rgba(201,74,64,0) 0 5px, rgba(201,74,64,0.34) 5px 10px)`;

  const StateBadges = ({ big = false }) => {
    if (!isActive || (maintenanceCount === 0 && riskCount === 0)) return null;
    const s = big ? 13 : 9;
    const caja = (fondo, contenido, clave) => (
      <span
        key={clave}
        className="grid place-items-center rounded-full text-white shadow-md"
        style={{
          background: fondo,
          width: s + 9,
          height: s + 9,
          // Aro blanco: despega la insignia de cualquier color de energía
          border: '1.6px solid rgba(255,255,255,0.95)',
        }}
      >
        {contenido}
      </span>
    );

    return (
      <div className={`absolute ${big ? '-top-1 -right-1' : '-top-1.5 -right-1.5'} z-10 flex items-center gap-0.5`}>
        {isImmune
          ? caja(SHIELD_COLOR, <ShieldCheck size={s} />, 'inmune')
          : (
            <>
              {maintenanceCount > 0 && caja(SHIELD_COLOR, <Shield size={s - 1} />, 'protegida')}
              {riskCount > 0 && caja(RISK_COLOR, <AlertTriangle size={s - 1} />, 'riesgo')}
            </>
          )}
      </div>
    );
  };

  /** Capa de rayas + aro que marca el estado sobre la casilla. */
  const CapaEstado = ({ radio }) => (
    <>
      {riskCount > 0 && !isImmune && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: RAYAS_RIESGO,
            boxShadow: `inset 0 0 0 2px ${RISK_COLOR}, 0 0 10px -1px ${RISK_COLOR}AA`,
            borderRadius: radio,
          }}
          // Late despacio: el bloque se ve "con problema" aunque esté quieto
          animate={{ opacity: [0.78, 1, 0.78] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Protegida con UN escudo. Antes este estado no se pintaba en los
          chips de rival: solo salía la insignia chiquita y no se notaba. */}
      {maintenanceCount === 1 && !isImmune && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            // Sin relleno: esta capa va encima del texto del chip y cualquier
            // tinte lo lavaba (la hidro quedaba ilegible en tema claro). El
            // aro solo ya distingue el estado.
            boxShadow: `inset 0 0 0 2px ${SHIELD_COLOR}, 0 0 10px -2px ${SHIELD_COLOR}99`,
            borderRadius: radio,
          }}
        />
      )}
      {isImmune && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            // Doble aro: se distingue de "protegida" sin depender del tono
            boxShadow: `inset 0 0 0 2px ${SHIELD_COLOR}, inset 0 0 0 4px rgba(255,255,255,0.5), 0 0 14px -2px ${SHIELD_COLOR}`,
            borderRadius: radio,
          }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </>
  );

  /* ================= VARIANTE CENTRO (mi tablero) ================= */
  if (variant === 'center') {
    return (
      /* pointer-events-none aquí y el toque en la capa recortada del final:
         así el lienzo cuadrado no le roba los toques a la planta vecina. */
      <motion.div
        animate={destruyendo
          ? { x: [0, -6, 6, -4, 4, 0], scale: [1, 1.06, 0.94, 1] }
          : { opacity: 1, x: 0, scale: 1, y: clickable && encima ? -10 : 0 }}
        transition={{ duration: destruyendo ? 0.5 : 0.4 }}
        className="pointer-events-none relative h-full w-full"
      >
        <img
          src={isActive ? PLANT_IMAGES[slotType].on : PLANT_IMAGES[slotType].off}
          alt={energy.label}
          draggable={false}
          className="h-full w-full object-contain drop-shadow-xl pointer-events-none"
          style={{
            filter: !isActive
              ? 'brightness(0.78) saturate(0.7)'
              : riskCount > 0 && !isImmune
                // Dañada: deja de generar. Antes 0.62/0.45 y se confundía con
                // una planta sana en penumbra; ahora se apaga de verdad y se
                // va a gris frío, que es lo que se lee de lejos.
                ? 'brightness(0.44) saturate(0.22) contrast(1.05)'
                : 'brightness(1.08)',
            transition: 'filter 0.5s ease',
          }}
        />

        {clickable && (
          <motion.div
            className="pointer-events-none absolute"
            style={{ ...SUELO_HOLGADO, borderRadius: '50%', boxShadow: `0 0 0 3px ${TARGET_COLOR}` }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        {/* Protegida con UN mantenimiento: halo azul suave. Antes este estado
            no se veía en el tablero — solo lo decía la insignia de la
            etiqueta — y el escudo es justo lo que uno quiere presumir. */}
        {maintenanceCount === 1 && !isImmune && (
          <motion.div
            className="pointer-events-none absolute"
            style={{
              ...SUELO_HOLGADO,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at 50% 50%, ${SHIELD_COLOR}66 0%, ${SHIELD_COLOR}26 52%, ${SHIELD_COLOR}00 76%)`,
              // El aro le da FORMA al halo: solo con brillo se perdía sobre
              // el dibujo de la planta y no se notaba que estaba protegida.
              border: `1.5px solid ${SHIELD_COLOR}B0`,
              boxShadow: `0 0 16px 2px ${SHIELD_COLOR}55`,
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Inmune (dos mantenimientos): la misma cúpula pero más fuerte, con
            un segundo aro que sale latiendo. Así se distingue de la de uno. */}
        {isImmune && (
          <>
            <motion.div
              className="pointer-events-none absolute"
              style={{
                ...SUELO_HOLGADO,
                borderRadius: '50%',
                /* Antes 2E (18% de opacidad) y apenas se notaba sobre el dibujo.
                   El escudo es el estado bueno: que se vea que brilla. */
                background: `radial-gradient(ellipse at 50% 50%, ${SHIELD_COLOR}7A 0%, ${SHIELD_COLOR}2E 45%, ${SHIELD_COLOR}00 72%)`,
                boxShadow: `0 0 18px 2px ${SHIELD_COLOR}66`,
                border: `1.5px solid ${SHIELD_COLOR}99`,
              }}
              animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1.04, 0.97] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="pointer-events-none absolute"
              style={{ ...SUELO_HOLGADO, borderRadius: '50%', border: `2px solid ${SHIELD_COLOR}` }}
              animate={{ scale: [1, 1.22], opacity: [0.7, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}

        {/* Dañada. Antes eran rayas encima (tapaban el dibujo) y luego un aro
            rojo en la base (competía con el humo y ensuciaba la lectura).
            Ahora se cuenta SOLO con la planta misma: se apaga y le sale humo.
            El estado exacto se lee en la insignia de la etiqueta. */}
        {riskCount > 0 && !isImmune && (
          <>
            {/* Humo saliendo de la planta. Cuatro bocanadas y no tres, más
                grandes y más oscuras: con tres se perdía sobre el fondo. */}
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute rounded-full"
                style={{
                  left: `${45 + i * 3.5}%`,
                  top: '34%',
                  width: '16%',
                  height: '16%',
                  background: 'rgba(122,132,142,0.72)',
                  filter: 'blur(5px)',
                }}
                animate={{
                  y: ['0%', '-135%'],
                  x: ['0%', `${(i - 1.5) * 42}%`],
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1.7],
                }}
                transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.62, ease: 'easeOut' }}
              />
            ))}

            {/* Brasa roja parpadeando: la avería. Es chica y va sobre el
                cuerpo de la planta, no un aro alrededor — así se nota sin
                taparle el dibujo ni salirse de la baldosa. */}
            <motion.span
              className="pointer-events-none absolute rounded-full"
              style={{
                left: '46%',
                top: '40%',
                width: '9%',
                height: '9%',
                background: `radial-gradient(circle, #FFD9A0 0%, ${RISK_COLOR} 45%, ${RISK_COLOR}00 72%)`,
              }}
              // Respiración lenta, no parpadeo. A 1.5s con doble destello
              // cansaba la vista: esto se ve muchísimas veces por partida.
              animate={{ opacity: [0.3, 0.95, 0.3], scale: [0.85, 1.3, 0.85] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        {/* Etiqueta + estado juntos: antes la insignia flotaba en la esquina
            de la casilla, lejos del dibujo, y no se sabía de qué planta era.

            Cada etiqueta va en la punta EXTERIOR de su terreno: la solar
            arriba, la hidro abajo, la eólica a la izquierda y la geotérmica a
            la derecha. No es capricho — las cuatro baldosas se encima
            (la de adelante tapa a la de atrás) y en cualquier otra posición
            la baldosa vecina se comía la etiqueta. En las puntas exteriores
            no hay nada encima.

            24%: el rombo del suelo ocupa el 50.9% central del lienzo, así que
            sus vértices caen al 24.6% de cada borde. */}
        <div
          className={`pointer-events-none absolute flex ${
            {
              arriba: 'inset-x-0 top-[24%] justify-center',
              abajo: 'inset-x-0 bottom-[24%] justify-center',
              izquierda: 'left-[4%] top-1/2 -translate-y-1/2 justify-start',
              derecha: 'right-[4%] top-1/2 -translate-y-1/2 justify-end',
            }[posEtiqueta]
          }`}
        >
          <span
            className="inline-flex items-center gap-1 rounded-full py-[3px] pl-2 pr-1 text-[10px] font-bold uppercase leading-none tracking-wide backdrop-blur-sm"
            style={{
              background: isActive ? energy.color : 'rgba(12,20,26,0.78)',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
              border: `1px solid ${isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)'}`,
            }}
          >
            <energy.Icon size={11} />
            {energy.label}
            {isActive && (maintenanceCount > 0 || riskCount > 0) && (
              <span
                className="ml-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full text-white"
                style={{
                  background: isImmune || maintenanceCount > 0 ? SHIELD_COLOR : RISK_COLOR,
                  border: '1.4px solid rgba(255,255,255,0.95)',
                }}
              >
                {isImmune
                  ? <ShieldCheck size={9} />
                  : maintenanceCount > 0
                    ? <Shield size={9} />
                    : <AlertTriangle size={9} />}
              </span>
            )}
            {/* Protegida y en riesgo a la vez: se muestran las dos marcas */}
            {isActive && !isImmune && maintenanceCount > 0 && riskCount > 0 && (
              <span
                className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full text-white"
                style={{ background: RISK_COLOR, border: '1.4px solid rgba(255,255,255,0.95)' }}
              >
                <AlertTriangle size={9} />
              </span>
            )}
          </span>
        </div>

        {/* El estado ya va pegado a la etiqueta de arriba; una segunda
            insignia suelta en la esquina solo confundía. */}

        {efecto && <EfectoCasilla tipo={efecto} />}

        {/* Área de toque, recortada al rombo del suelo. Va la última para
            quedar por encima del dibujo; las etiquetas y los aros no
            estorban porque todos son pointer-events-none. */}
        <div
          /* role + tabIndex + teclado: sin esto la casilla solo respondía al
             ratón o al dedo. En una computadora del salón, quien no pueda usar
             el ratón no podía jugar, y un lector de pantalla no anunciaba
             nada. Solo entra en el recorrido del tabulador cuando de verdad se
             puede jugar aquí: tabular por 24 casillas muertas no ayuda. */
          role="button"
          tabIndex={clickable ? 0 : -1}
          aria-label={
            clickable
              ? `Jugar aquí: ${descripcionAccesible()}`
              : descripcionAccesible()
          }
          aria-disabled={!clickable}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
          }}
          className={`pointer-events-auto absolute inset-0 outline-none ${clickable ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F5C042]' : ''}`}
          style={{ clipPath: RECORTE_SUELO }}
          onClick={handleClick}
          onMouseEnter={() => setEncima(true)}
          onMouseLeave={() => setEncima(false)}
        />
      </motion.div>
    );
  }

  /* ================= VARIANTE RENGLÓN (celular con varios rivales) =================
     Un bloque ancho y bajo por energía. Ocupa poco alto, así caben muchos
     rivales sin comerse el tablero, y se ve de un golpe quién va a punto de
     completar sus cuatro plantas. */
  if (variant === 'fila') {
    return (
      <motion.div
        onClick={handleClick}
        whileTap={clickable ? { scale: 0.94 } : undefined}
        animate={isDoubleRisk ? { opacity: 0.3, filter: 'grayscale(1)' } : { opacity: 1 }}
        transition={{ duration: 0.3 }}
        /* El alto lo manda el renglón, que a su vez depende de cuántos
           rivales haya: con pocos sobra espacio arriba y conviene usarlo. */
        /* min-w-0 y overflow-hidden: el chip tiene que poder encogerse por
           debajo de su contenido. Sin eso, en pantallas angostas empujaba el
           renglón y el último se salía de la pantalla. */
        className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md
          /* Alturas pensadas para el dedo: Apple pide 44pt mínimo. El tamaño
             lo manda cuántos rivales hay, PERO también cuánta pantalla hay:
             en un iPhone SE (667px de alto) con seis jugadores, los renglones
             altos se encimaban con el tablero. Por debajo de 720px de alto se
             usa la versión baja; encima, la cómoda. */
          ${{
            grande: 'h-10 gap-1.5 px-0.5 [@media(min-height:720px)]:h-12',
            medio: 'h-9 gap-1 px-0.5 [@media(min-height:720px)]:h-11',
            compacto: 'h-8 gap-0.5 px-0.5 min-[360px]:gap-1 [@media(min-height:720px)]:h-10',
          }[alto]}
          ${clickable ? 'cursor-pointer' : ''}`}
        style={{
          background: isActive
            ? `linear-gradient(160deg, ${energy.color}47, ${energy.color}1C)`
            : 'var(--board-hueco)',
          border: isActive ? `1.5px solid ${energy.token}` : '1.5px dashed var(--board-hueco-borde)',
          boxShadow: clickable ? `0 0 0 2px ${TARGET_COLOR}` : undefined,
        }}
      >
        <energy.Icon
          size={{ grande: 18, medio: 15, compacto: 13 }[alto]}
          className="shrink-0"
          style={{ color: isActive ? energy.token : 'var(--board-texto-suave)' }}
        />
        {/* En el renglón sobra ancho: con la etiqueta se sabe qué columna es
            cuál sin tener que reconocer el ícono. */}
        {/* El texto NO va del color de la energía: el panel del rival es
            blanco translúcido sobre el pueblo oscuro, así que queda gris
            medio en los dos temas y ningún azul contrasta ahí (la hidro,
            #3A6AAE, era ilegible). El color de la energía se queda en el
            ícono y el borde, que sí se leen; la etiqueta usa el token de
            texto del tablero, que está hecho para contrastar con el panel. */}
        <span
          /* Por debajo de 340px de ancho la etiqueta desaparece y se queda el
             ícono, que es lo que de verdad identifica la energía. Vale más
             eso que verla cortada o que empuje el chip fuera de pantalla. */
          className={`truncate font-bold uppercase leading-none tracking-wide ${{ grande: 'text-[11px]', medio: 'text-[10px]', compacto: 'text-[9px]' }[alto]}`}
          style={{ color: isActive ? 'var(--board-texto)' : 'var(--board-texto-suave)' }}
        >
          {/* Tres letras en pantalla angosta, nombre completo de 430px en
              adelante. Dos nodos y no un corte con CSS porque "Eólica"
              recortada a tres letras por overflow se lee "Eól…" con puntos. */}
          <span className="min-[430px]:hidden">{energy.corto}</span>
          <span className="hidden min-[430px]:inline">{energy.label}</span>
        </span>

        <StateBadges big={alto === 'grande'} />
        <CapaEstado radio="6px" />
        {efecto && <EfectoCasilla tipo={efecto} compacto />}
      </motion.div>
    );
  }

  /* ================= VARIANTE OPONENTE (chip de energía) ================= */
  const sizeClass = SIZE_CLASSES[orientation]?.[size] || SIZE_CLASSES.portrait.normal;
  const landscape = orientation === 'landscape';
  const iconPx = size === 'small' ? 13 : 16;

  return (
    <motion.div
      onClick={handleClick}
      whileHover={clickable ? { scale: 1.06 } : undefined}
      animate={isDoubleRisk ? { opacity: 0.25, filter: 'grayscale(1)' } : { opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={`
        relative flex ${sizeClass} items-center justify-center rounded-xl transition-all
        ${landscape ? 'flex-row gap-1.5 px-1.5' : 'flex-col gap-1 p-1'}
        ${clickable ? 'cursor-pointer' : ''}
      `}
      style={{
        // Construida: se pinta del color de su energía, para saber de un
        // vistazo qué tiene cada rival. Vacía: hueco punteado y apagado.
        background: isActive
          ? `linear-gradient(160deg, ${energy.color}3D, ${energy.color}17)`
          : 'var(--board-hueco)',
        border: isActive
          ? `1.5px solid ${energy.token}`
          : '1.5px dashed var(--board-hueco-borde)',
        boxShadow: clickable
          ? `0 0 0 2px ${TARGET_COLOR}`
          : isActive
            ? `0 3px 12px -6px ${energy.color}`
            : 'none',
      }}
    >
      <energy.Icon
        size={iconPx}
        className="shrink-0"
        style={{ color: isActive ? energy.token : 'var(--board-texto-suave)' }}
      />
      {/* Mismo motivo que en la variante de renglón: ver la nota de arriba. */}
      <span
        className="text-[8px] font-bold uppercase leading-none tracking-wide"
        style={{ color: isActive ? 'var(--board-texto)' : 'var(--board-texto-suave)' }}
      >
        {energy.label}
      </span>

      <StateBadges />
      <CapaEstado radio="12px" />
      {efecto && <EfectoCasilla tipo={efecto} compacto />}
    </motion.div>
  );
}
