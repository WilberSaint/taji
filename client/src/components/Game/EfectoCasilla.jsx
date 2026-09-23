import { motion } from 'framer-motion';

/**
 * Animaciones cortas sobre una casilla del tablero: construir, proteger,
 * dañar, destruir, bloquear (el escudo aguanta), reparar (curan un riesgo)
 * y anular.
 *
 * Sin imágenes ni sonidos externos: todo son formas y color, para no sumar
 * peso de descarga. Son breves a propósito — se van a ver muchas veces por
 * partida y no deben estorbar.
 */

const FUEGO = '#E0655B';
const BRASA = '#F5A742';
const ESCUDO = '#3C79BE';
const VIDA = '#3B9668';
const HUMO = 'rgba(210,215,220,0.55)';

const TROZOS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 8;
  return { x: Math.cos(a), y: Math.sin(a), tam: i % 2 ? 5 : 7 };
});

export function EfectoCasilla({ tipo, compacto = false }) {
  const g = (grande, chico) => (compacto ? chico : grande);
  const capa = 'pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-visible';

  /* ---------- CONSTRUIR: la planta se enciende ---------- */
  if (tipo === 'construir') {
    return (
      <div className={capa}>
        {/* Destello verde de "encendido" */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: g(80, 38), height: g(80, 38),
            background: `radial-gradient(circle, #fff 0%, ${VIDA}CC 35%, ${VIDA}00 70%)`,
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.3, 1.8], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.6, times: [0, 0.3, 1], ease: 'easeOut' }}
        />
        {/* Aro que baja y se asienta, como si la planta aterrizara */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: g(70, 34), height: g(24, 12), border: `2px solid ${VIDA}` }}
          initial={{ scale: 1.9, opacity: 0 }}
          animate={{ scale: [1.9, 0.9, 1], opacity: [0, 0.95, 0] }}
          transition={{ duration: 0.7, times: [0, 0.55, 1], ease: 'easeOut' }}
        />
        {/* Chispas subiendo */}
        {[-1, 0, 1].map((d) => (
          <motion.span
            key={d}
            className="absolute rounded-full"
            style={{ width: g(5, 3), height: g(5, 3), background: BRASA }}
            initial={{ x: d * g(16, 8), y: g(14, 7), opacity: 0 }}
            animate={{ y: g(-26, -13), opacity: [0, 1, 0] }}
            transition={{ duration: 0.75, delay: 0.1 + Math.abs(d) * 0.08, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  /* ---------- PROTEGER: se forma el escudo ---------- */
  if (tipo === 'proteger') {
    return (
      <div className={capa}>
        {/* Aro que viene de fuera y se cierra sobre la planta */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: g(76, 36), height: g(76, 36), border: `2.5px solid ${ESCUDO}` }}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: [2.2, 0.92, 1.02], opacity: [0, 1, 0] }}
          transition={{ duration: 0.75, times: [0, 0.6, 1], ease: 'easeOut' }}
        />
        {/* Brillo azul que recorre la cúpula */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: g(72, 34), height: g(72, 34),
            background: `radial-gradient(circle at 50% 60%, ${ESCUDO}55 0%, ${ESCUDO}00 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 0.95, 0], scale: [0.85, 1.08, 1] }}
          transition={{ duration: 0.85, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
        {/* Destellos en el borde del escudo */}
        {[0, 120, 240].map((ang) => (
          <motion.span
            key={ang}
            className="absolute rounded-full"
            style={{
              width: g(6, 3), height: g(6, 3), background: '#DCEBFA',
              transform: `rotate(${ang}deg) translateY(${g(-30, -15)}px)`,
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.6] }}
            transition={{ duration: 0.6, delay: 0.22 + ang / 1200, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  /* ---------- DAÑAR: golpe leve, la planta aguanta ---------- */
  if (tipo === 'dañar') {
    return (
      <div className={capa}>
        {/* Destello rojo corto */}
        <motion.div
          className="absolute inset-0"
          style={{ background: `${FUEGO}44` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.38, times: [0, 0.2, 1] }}
        />
        {/* Marca de impacto */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: g(34, 18), height: g(34, 18), border: `2px solid ${FUEGO}` }}
          initial={{ scale: 0.4, opacity: 1 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        {/* Tres chispas cayendo: el golpe fue, pero la planta sigue */}
        {[-1, 0, 1].map((d) => (
          <motion.span
            key={d}
            className="absolute rounded-[1px]"
            style={{ width: g(4, 2.5), height: g(4, 2.5), background: FUEGO }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: d * g(18, 9), y: g(20, 10), opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          />
        ))}
      </div>
    );
  }

  /* ---------- BLOQUEAR: el escudo aguanta el golpe ----------
     Pasa cuando le tiran un riesgo a una planta protegida: el servidor
     cancela las dos cartas y la planta queda intacta. Se cuenta como un
     impacto que rebota en la cúpula, no como un daño. */
  if (tipo === 'bloquear') {
    return (
      <div className={capa}>
        {/* La cúpula se enciende de golpe al recibir el impacto */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: g(78, 37), height: g(78, 37),
            background: `radial-gradient(circle at 50% 50%, ${ESCUDO}00 45%, ${ESCUDO}AA 78%, ${ESCUDO}00 100%)`,
            border: `2.5px solid ${ESCUDO}`,
          }}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: [0.92, 1.12, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.55, times: [0, 0.22, 1], ease: 'easeOut' }}
        />
        {/* Chispa roja que llega y rebota hacia arriba */}
        <motion.span
          className="absolute rounded-full"
          style={{ width: g(9, 5), height: g(9, 5), background: FUEGO }}
          initial={{ y: g(-34, -17), opacity: 0, scale: 0.6 }}
          animate={{ y: [g(-34, -17), g(-6, -3), g(-30, -15)], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.5] }}
          transition={{ duration: 0.5, times: [0, 0.4, 1], ease: 'easeOut' }}
        />
        {/* Esquirlas del golpe saliendo de lado: no entró nada */}
        {[-1, 1].map((d) => (
          <motion.span
            key={d}
            className="absolute rounded-[1px]"
            style={{ width: g(4, 2.5), height: g(4, 2.5), background: BRASA }}
            initial={{ x: 0, y: g(-6, -3), opacity: 0 }}
            animate={{ x: d * g(26, 13), y: g(-22, -11), opacity: [0, 1, 0] }}
            transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  /* ---------- REPARAR: el mantenimiento cura un riesgo ----------
     Pasa cuando le juegan un mantenimiento a una planta dañada: se anulan
     entre sí y la planta vuelve a producir. Es la única animación que va
     de abajo hacia arriba — se lee como "se recupera". */
  if (tipo === 'reparar') {
    return (
      <div className={capa}>
        {/* Onda verde que sube y limpia la casilla */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: g(74, 35), height: g(74, 35),
            background: `radial-gradient(circle at 50% 70%, ${VIDA}88 0%, ${VIDA}00 68%)`,
          }}
          initial={{ opacity: 0, scale: 0.7, y: g(14, 7) }}
          animate={{ opacity: [0, 0.95, 0], scale: [0.7, 1.15, 1.25], y: [g(14, 7), g(-6, -3)] }}
          transition={{ duration: 0.8, times: [0, 0.4, 1], ease: 'easeOut' }}
        />
        {/* El humo del daño se disipa: una bocanada gris que se va */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: g(40, 20), height: g(40, 20), background: HUMO, filter: 'blur(6px)' }}
          initial={{ opacity: 0.7, scale: 1, y: 0 }}
          animate={{ opacity: 0, scale: 1.9, y: g(-30, -15) }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* Cuatro destellos subiendo, como chispas de soldadura al revés */}
        {[-1.5, -0.5, 0.5, 1.5].map((d) => (
          <motion.span
            key={d}
            className="absolute rounded-full"
            style={{ width: g(5, 3), height: g(5, 3), background: '#9BE3BE' }}
            initial={{ x: d * g(13, 7), y: g(20, 10), opacity: 0 }}
            animate={{ y: g(-24, -12), opacity: [0, 1, 0] }}
            transition={{ duration: 0.7, delay: 0.1 + Math.abs(d) * 0.07, ease: 'easeOut' }}
          />
        ))}
      </div>
    );
  }

  /* ---------- ANULAR: las dos cartas se cancelan ----------
     Queda para los casos que no son ni bloqueo ni reparación (eventos). */
  if (tipo === 'anular') {
    return (
      <div className={capa}>
        <motion.div
          className="absolute rounded-full"
          style={{ width: g(56, 28), height: g(56, 28), border: '2px solid rgba(255,255,255,0.85)' }}
          initial={{ scale: 0.5, opacity: 1, rotate: 0 }}
          animate={{ scale: 1.6, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute"
          style={{ width: g(34, 17), height: 2, background: 'rgba(255,255,255,0.9)' }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    );
  }

  /* ---------- DESTRUIR: el "pum" ---------- */
  const alcance = g(52, 26);
  return (
    <div className={capa}>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: g(70, 34), height: g(70, 34),
          background: `radial-gradient(circle, #fff 0%, ${BRASA} 40%, ${FUEGO}00 70%)`,
        }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.5, 2.2], opacity: [0, 1, 0] }}
        transition={{ duration: 0.5, times: [0, 0.25, 1], ease: 'easeOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: g(54, 26), height: g(54, 26), border: `2.5px solid ${FUEGO}` }}
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.8, opacity: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />
      {TROZOS.map((t, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ width: g(t.tam, 3), height: g(t.tam, 3), background: i % 3 === 0 ? BRASA : FUEGO }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: t.x * alcance, y: t.y * alcance + g(16, 8), opacity: 0, rotate: 180 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute rounded-full"
        style={{ width: g(46, 22), height: g(46, 22), background: HUMO, filter: 'blur(6px)' }}
        initial={{ scale: 0.5, opacity: 0, y: 0 }}
        animate={{ scale: [0.5, 1.4, 1.8], opacity: [0, 0.75, 0], y: g(-34, -18) }}
        transition={{ duration: 1.1, times: [0, 0.35, 1], ease: 'easeOut' }}
      />
    </div>
  );
}

export default EfectoCasilla;
