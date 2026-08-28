# CLAUDE.md

Guía para trabajar en este repositorio.

## Qué es

**TAJI**: juego de cartas digital sobre energías renovables, inspirado en *VIRUS!*. Es el juego
de cartas de **LudoEnergía**, un proyecto de divulgación científica del Instituto Tecnológico de
Sonora (ITSON) financiado por SECIHTI — ver [[project-context]] en memoria para los detalles del
proyecto (equipo, financiamiento, el segundo juego "de estrategia" aún no construido, los 4
idiomas). Multijugador en tiempo real por Socket.io.

## Estructura (monorepo, 3 paquetes + 1 compartido)

- `client/` — el juego TAJI. React 18 + Vite + Tailwind + Zustand (`src/store/gameStore.js`) +
  framer-motion. Socket.io en `src/socket.js` + `src/hooks/useSocket.js`. Sin router de verdad:
  `App.jsx` elige pantalla según el estado (`LobbyScreen`, `GameBoard`, o `AdminPanel` si el hash
  es `#/admin`).
- `server/` — Express + Socket.io. **Todo el estado vive en memoria** (no hay base de datos).
  - `handlers/` — listeners de socket (lobby, game, connection, **admin**)
  - `managers/` — `RoomManager` y `GameManager` (singletons)
  - `models/` — `Room`, `Player`, `Game`, `Deck`
  - `state/adminSettings.js` — reglas y composición del mazo **ajustables en caliente** (ver
    "Panel de administrador" abajo); todo lo demás lee de aquí, no de las constantes estáticas
  - `utils/` — `deckBuilder`, `gameValidator`, `botAI`, `constants`, `logger`
- `site/` — el sitio de acceso abierto de LudoEnergía (portada, "Conoce TAJI", descargas, equipo).
  Vite vanilla (sin framework), a propósito: tiene que ser ligero para conexiones lentas.
- `packages/design/tokens.css` — tokens de diseño (color/tipografía/sombra, claro y oscuro),
  fuente única compartida por `site/`. `client/src/styles/globals.css` tiene su propia copia
  todavía sin unificar con este archivo — pendiente.

Las constantes del juego están **duplicadas** en `client/src/utils/constants.js` y
`server/utils/constants.js`; hay que mantenerlas sincronizadas.

## Comandos

```bash
npm run install:all   # instala raíz + server + client + site
npm run dev           # levanta server (:3001) + client (:5173) + site (:5175)
npm run dev:game      # solo server + client (sin el sitio)
npm --prefix client run build
npm --prefix client run lint
```

No hay pruebas automatizadas. Los lockfiles no se versionan (ver `.gitignore`).

## Panel de administrador

Oculto en el propio juego: `client` en la ruta `#/admin` (ej. `http://localhost:5173/#/admin`).
Protegido por un token compartido — variable `ADMIN_TOKEN` en `server/.env` (sin definirla, el
panel queda deshabilitado, no hay acceso de reserva). El token se guarda en `sessionStorage` del
navegador, no en el repo.

Permite: ver salas/partidas en vivo y cerrarlas o expulsar jugadores, activar un **modo
mantenimiento** (bloquea salas nuevas + banner a todos los conectados — útil antes de un deploy),
y ajustar en caliente `GAME_RULES` (límite de mano, jugadores min/max, plantas para ganar,
descarte) y `DECK_CONFIG` (cuántas copias de cada carta) sin redeploy. Los cambios de reglas solo
afectan salas **nuevas**; una partida en curso no cambia. Todo vive en memoria
(`server/state/adminSettings.js`) — se resetea si el servidor se reinicia.

## Convenciones

- Código y comentarios en **español**.
- El backend es la autoridad: valida toda jugada en `utils/gameValidator.js` y aplica efectos
  en `models/Game.js` (`applyCardEffect`). El cliente solo propone movimientos.
- Un "movimiento" es `{ origen?: {jugador, slot}, destino?: {jugador, slot} }`. El cliente manda
  ids de jugador; el servidor los resuelve a objetos `Player`.
- Errores hacia el usuario: usar el store `setNotification` (componente `Toast`), no `alert()`.
- Reglas de victoria: 4 plantas de tipos distintos, sin riesgos activos (cantidad configurable
  desde el panel de administrador, ver arriba).
- Avatares de jugador son **íconos SVG** (`client/src/utils/avatars.js`, ids como `"sun"`,
  `"wind"`...), no emoji. El servidor solo guarda el id; se resuelve a ícono en el cliente
  (`components/UI/Avatar.jsx`).
