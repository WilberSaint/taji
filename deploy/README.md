# Despliegue de LudoEnergía + TAJI

Un solo dominio, un solo proceso de Node:

| URL | Qué es | Lo sirve |
|---|---|---|
| `ludoenergia.com/` | Sitio de LudoEnergía (`site/`) | Caddy, desde disco |
| `ludoenergia.com/taji/` | Juego TAJI, PWA (`client/`) | Caddy, desde disco |
| `ludoenergia.com/socket.io/` | Tiempo real del juego | Node (`taji.service`, 127.0.0.1:3001) |
| `ludoenergia.com/<juego2>/` | Segundo juego, cuando exista | otro `handle_path` en el Caddyfile |

Servidor: `wilber@172.16.13.216` (Ubuntu 22.04, 2 vCPU, 4 GB), junto a
`linkmeqr` y `ucrmservice`. Todo vive en `/opt/taji`; Node va incluido en
`/opt/taji/runtime` y no se instala nada en el sistema.

## Paso único (requiere sudo, se hace una vez)

Los archivos ya se suben con `deploy/desplegar.sh`. Falta registrar el
servicio y el dominio:

```bash
# 1. Servicio
sudo cp /opt/taji/deploy/taji.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now taji
curl 127.0.0.1:3001/health

# 2. Dominio (cuando ludoenergia.com ya apunte a este servidor)
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.antes-ludoenergia-$(date +%F)
cat /opt/taji/deploy/Caddyfile.snippet | sudo tee -a /etc/caddy/Caddyfile >/dev/null
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

DNS: registros `A` de `ludoenergia.com` y `www.ludoenergia.com` a la IP
pública que ya usan los otros dominios. Caddy saca el certificado solo. Si se
usa Cloudflare con proxy, los WebSocket funcionan sin configurar nada.

La clave del panel de administrador (`/taji/#/admin`) se generó sola en
`/opt/taji/.env` (`ADMIN_TOKEN`); verla con `cat /opt/taji/.env`.

## Desplegar una versión nueva

1. En el panel (`/taji/#/admin`) activar **modo mantenimiento** — las
   partidas viven en memoria y el reinicio las corta.
2. Desde la máquina de desarrollo: `bash deploy/desplegar.sh`
   (compila, sube, instala y reinicia; pide la contraseña de sudo al final).
3. Regresar: la versión anterior queda en `/opt/taji/.anterior`.

Operación: `journalctl -u taji -f` (log) · `curl 127.0.0.1:3001/stats`
(salas, partidas, conexiones, CPU y RAM del proceso; solo desde el servidor,
no se publica).

## ¿Cuánta gente aguanta?

Medido con `herramientas/carga/carga.mjs` (salas completas de jugadores
simulados, cada uno con su propio socket, jugando turnos de verdad):

| Dónde | Jugadores simultáneos | CPU de Node | RAM | Latencia p95 |
|---|---|---|---|---|
| Este servidor | 300 (75 salas × 4) | 6 % de un núcleo | 114 MB | 4 ms |
| Máquina de desarrollo (CPU equivalente) | 500 (125 × 4) | 4 % | 91 MB | 2 ms |
| Máquina de desarrollo, estrés | 1,000 (250 × 4) | 11–14 % | 116 MB | 2 ms |

En reposo el proceso usa ~75 MB. Conclusiones:

- **El CPU y la RAM no son el límite.** Con 1,000 personas jugando a la vez,
  Node usa ~15 % de uno de los dos núcleos. Extrapolando, varios miles antes
  de que el CPU importe; los topes del servicio (`MemoryMax=320M`,
  `CPUQuota=100%`) garantizan que TAJI nunca le quite recursos a las otras
  apps.
- **Lo que sí cuenta es la red.** Cada jugada manda el estado (~3.4 KB) a
  cada jugador de la sala: unos **5–6 kbps por jugador** durante la partida
  (≈ 5 Mbps de subida para 1,000 jugadores).
- **La primera carga pesa más que jugar**: el juego son ~140 KB de código
  comprimido más el arte de las cartas (hasta ~3 MB en WebP). Se cachea en el
  teléfono, así que solo pesa la primera vez. En un taller con 30 personas en
  el mismo WiFi, eso es lo que más se nota.

## Qué se ajustó para que fuera ligero

- Caddy sirve todos los archivos estáticos con compresión y caché; Node solo
  atiende el socket.
- La lista de salas en vivo ya no se manda a **todos** los conectados en cada
  cambio (crecía con el cuadrado de la gente): solo a quienes están en la
  pantalla de salas, y agrupada (`server/utils/listaSalas.js`).
- Socket.io con mensajes de máximo 64 KB, sin compresión por mensaje, y Node
  escuchando solo en 127.0.0.1. En producción el logger no escribe nada salvo
  errores.
- El cliente se compila con base `/taji/` y se conecta al socket del mismo
  dominio: el mismo build sirve para `ludoenergia.com` o para una IP.
