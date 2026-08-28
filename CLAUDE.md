# CLAUDE.md

Guía para trabajar en este repositorio.

## Qué es

TAJI: juego de cartas digital sobre energías renovables, inspirado en *VIRUS!*. Proyecto de
investigación para acercar la ingeniería a niñas, niños y jóvenes. Multijugador en tiempo real
por Socket.io. A futuro se integrará dentro de una web llamada **LUDOENERGÍA** como un juego más.

## Estructura

Monorepo con dos paquetes:

- `client/` — React 18 + Vite + Tailwind + Zustand (`src/store/gameStore.js`) + framer-motion.
  Socket.io en `src/socket.js` + `src/hooks/useSocket.js`. Sin router: `App.jsx` elige pantalla
  según el estado (`LobbyScreen` o `GameBoard`).
- `server/` — Express + Socket.io. **Todo el estado vive en memoria** (no hay base de datos).
  - `handlers/` — listeners de socket (lobby, game, connection)
  - `managers/` — `RoomManager` y `GameManager` (singletons)
  - `models/` — `Room`, `Player`, `Game`, `Deck`
  - `utils/` — `deckBuilder`, `gameValidator`, `botAI`, `constants`, `logger`

Las constantes del juego están **duplicadas** en `client/src/utils/constants.js` y
`server/utils/constants.js`; hay que mantenerlas sincronizadas.

## Comandos

```bash
npm run install:all   # instala raíz + server + client
npm run dev           # levanta backend (:3001) y frontend (:5173) a la vez
npm run dev:server
npm run dev:client
npm --prefix client run build
npm --prefix client run lint
```

No hay pruebas automatizadas. Los lockfiles no se versionan (ver `.gitignore`).

## Convenciones

- Código y comentarios en **español**.
- El backend es la autoridad: valida toda jugada en `utils/gameValidator.js` y aplica efectos
  en `models/Game.js` (`applyCardEffect`). El cliente solo propone movimientos.
- Un "movimiento" es `{ origen?: {jugador, slot}, destino?: {jugador, slot} }`. El cliente manda
  ids de jugador; el servidor los resuelve a objetos `Player`.
- Errores hacia el usuario: usar el store `setNotification` (componente `Toast`), no `alert()`.
- Reglas de victoria: 4 plantas de tipos distintos, sin riesgos activos.
