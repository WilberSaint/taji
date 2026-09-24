import { ENERGY_TYPES } from '../../utils/constants';
import PlayerSlot from './PlayerSlot';

/* ================= GEOMETRÍA DEL LOTE =================
   El lote vacío del fondo es un ROMBO isométrico, no un rectángulo. Su caja
   envolvente mide 854 x 476 px en el dibujo (work/medir-lote.mjs), o sea
   proporción 1.794 — por eso el contenedor usa aspect-[854/476] y no 11/7,
   que lo dejaba 54 px más alto que el lote y tiraba todo hacia abajo.

   Un rombo se divide en cuatro rombos iguales: los centros de esos cuatro
   caen en (50%, 25%), (25%, 50%), (75%, 50%) y (50%, 75%) de la caja, y
   cada uno mide la mitad de ancho y la mitad de alto. Eso es exactamente un
   terreno por energía, sin huecos ni encimes. Nada de estos números está
   ajustado a ojo: salen de la figura. */

/** Centro de cada terreno dentro del rombo grande. */
const PLANT_POSITIONS = {
  [ENERGY_TYPES.SOLAR]: { left: '50%', top: '25%' },
  [ENERGY_TYPES.EOLICA]: { left: '25%', top: '50%' },
  [ENERGY_TYPES.GEOTERMICA]: { left: '75%', top: '50%' },
  [ENERGY_TYPES.HIDROELECTRICA]: { left: '50%', top: '75%' },
};

/* Las ocho imágenes de planta comparten lienzo cuadrado de 1024 px con el
   rombo del suelo midiendo 935 px (91.3%) y centrado en el lienzo
   (work/normalizar-plantas.mjs). Para que ese rombo ocupe la mitad de la caja
   —un cuarto del rombo grande— el lienzo tiene que medir 50 / 0.913 = 54.8%;
   se deja en 52.6% para que quede un pelo de tierra entre terrenos. */
const ANCHO_LIENZO = '52.6%';

/** Punta exterior del rombo grande que le toca a cada etiqueta. */
const POS_ETIQUETA = {
  [ENERGY_TYPES.SOLAR]: 'arriba',
  [ENERGY_TYPES.EOLICA]: 'izquierda',
  [ENERGY_TYPES.GEOTERMICA]: 'derecha',
  [ENERGY_TYPES.HIDROELECTRICA]: 'abajo',
};

/* Orden isométrico: lo que está al fondo se dibuja primero. La solar es la
   del norte (más lejos), la hidro la del sur (más cerca), así que la hidro
   tapa a las laterales y éstas a la solar. */
const CAPAS = {
  [ENERGY_TYPES.SOLAR]: 10,
  [ENERGY_TYPES.EOLICA]: 20,
  [ENERGY_TYPES.GEOTERMICA]: 20,
  [ENERGY_TYPES.HIDROELECTRICA]: 30,
};

const ENERGY_TYPES_LIST = [
  ENERGY_TYPES.SOLAR,
  ENERGY_TYPES.EOLICA,
  ENERGY_TYPES.GEOTERMICA,
  ENERGY_TYPES.HIDROELECTRICA,
];

/** Los cuatro terrenos acomodados en rombo. Igual en celular y en PC. */
function Terrenos({ currentPlayer }) {
  return ENERGY_TYPES_LIST.map((slotType) => (
    <div
      key={slotType}
      className="absolute aspect-square"
      style={{
        ...PLANT_POSITIONS[slotType],
        width: ANCHO_LIENZO,
        transform: 'translate(-50%, -50%)',
        zIndex: CAPAS[slotType],
        /* Transparente al dedo: este envoltorio es un CUADRADO y los cuatro
           se encima entre sí, así que se comía los toques de la planta
           vecina. Medido: tocar el centro de la solar activaba la geotérmica.
           Quien recibe el toque es la capa recortada al rombo que hay dentro
           de PlayerSlot (RECORTE_SUELO). */
        pointerEvents: 'none',
      }}
    >
      <PlayerSlot
        variant="center"
        slotType={slotType}
        slot={currentPlayer.board[slotType]}
        playerId={currentPlayer.id}
        isMySlot={true}
        /* Cada etiqueta a la punta exterior de su terreno: es el único
           lugar donde ninguna baldosa vecina la tapa. */
        posEtiqueta={POS_ETIQUETA[slotType]}
      />
    </div>
  ));
}

export default function CenterArea({ currentPlayer, className, vertical = false }) {
  if (!currentPlayer) return null;

  /* En celular era una rejilla 2x2 de cuadros sueltos: no se parecía en nada
     al tablero de PC y desperdiciaba media pantalla. Ahora es el mismo lote
     isométrico, sólo que ocupando todo el ancho.

     Aquí la caja NO usa la proporción del lote del fondo (854/476 = 1.794)
     sino la de las propias baldosas (1.542, medido con work/angulo.mjs). Las
     dos están dibujadas en ángulos isométricos distintos —14.1% de desfase—
     así que no pueden encajar una sobre otra. En PC da igual porque hay
     pueblo alrededor que disimula, pero en celular la tarjeta recorta pegada
     al lote y el desfase salta. Se resuelve no enseñando el lote del fondo
     aquí: los cuatro terrenos SON el lote, y sobre su propia proporción
     embaldosan exacto. El pueblo sigue de fondo a pantalla completa, con sus
     luces. */
  if (vertical) {
    return (
      /* --tablero-y-movil sube o baja la tarjeta ENTERA (con sus plantas)
         para hacerla coincidir con el lote de tierra que se asoma por detrás,
         en el pueblo del fondo. La otra mitad del ajuste es --pueblo-y-movil,
         que mueve el pueblo. Cualquiera de las dos sirve; están las dos
         porque una tiene tope (el lote del dibujo) y la otra no. */
      <div
        className="relative w-full"
        style={{ transform: 'translateY(var(--tablero-y-movil))' }}
      >
        <div className="relative mx-auto aspect-[1542/1000] w-full max-w-[640px]">
          <div
            className="absolute inset-0 rounded-3xl border-2 border-white/10"
            style={{ background: 'linear-gradient(180deg, rgba(40,48,58,0.88), rgba(22,29,36,0.92))' }}
          />
          {/* Los cuatro terrenos embaldosan la tarjeta exacto por geometría,
              pero a ojo se leen un pelín bajos porque los molinos y la
              chimenea cargan el dibujo hacia arriba. --plantas-y-movil es el
              ajuste de gusto, igual que --plantas-y en el acomodo de PC. */}
          <div
            className="absolute inset-0"
            style={{ transform: 'translateY(var(--plantas-y-movil))' }}
          >
            <Terrenos currentPlayer={currentPlayer} />
          </div>
        </div>
      </div>
    );
  }

  return (
    /* El contenedor cae 1.42% del alto del marco por debajo del lote porque
       arriba van el indicador de turno y el rival de enfrente. Se corrige con
       --plantas-y (globals.css), que es la única perilla de este ajuste. */
    <div
      className={`relative aspect-[854/476] ${className || 'w-[45%] max-w-[680px]'}`}
      style={className ? undefined : { transform: 'translateY(var(--plantas-y))' }}
    >
      <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-sm border-2 border-white/10" />
      <Terrenos currentPlayer={currentPlayer} />
    </div>
  );
}
