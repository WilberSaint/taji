# herramientas

Utilidades que **no** forman parte del juego: se corren a mano cuando hay que
regenerar algo. No se instalan con `npm run install:all` ni las necesita el
servidor.

## `arte/`

Los scripts con los que se armó el arte de las cartas.

| Script | Qué hace |
|---|---|
| `generar.mjs` | Arma las 21 cartas completas (marco + ilustración + nombre) |
| `carta.mjs` | El marco y la plantilla de una carta suelta |
| `dioramas.mjs` | Las escenas isométricas |
| `iconos.mjs` | Los íconos de energía |

```bash
cd herramientas/arte
npm install
node generar.mjs
```

**Las ilustraciones fuente (`arte/ilustraciones/`, 24 MB de PNG) no están en el
repo** — están gitignoreadas y viven en Drive, en `_recursos-originales`, junto
con los demás insumos. Sin esa carpeta los scripts no corren; hay que bajarla
primero. El arte final sí está versionado, ya en WebP, en
`client/public/assets/`.
