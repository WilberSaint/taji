#!/usr/bin/env bash
# Despliega TAJI + sitio de LudoEnergía al servidor.
#
# Se corre desde la máquina de desarrollo (Git Bash en Windows sirve):
#   bash deploy/desplegar.sh
#
# Qué hace:
#   1. Compila client/ y site/ aquí (el servidor no necesita Vite ni React).
#   2. Sube un paquete con server/, client/dist y site/dist.
#   3. En el servidor, bajo /opt/taji: instala un Node propio la primera vez,
#      instala solo las dependencias de producción del servidor y cambia la
#      versión (la anterior queda en /opt/taji/.anterior para regresar).
#   4. Reinicia el servicio (pide la contraseña de sudo).
#
# Nada de esto toca las otras apps del servidor.
#
# Variables opcionales: SERVIDOR, LLAVE, NO_REINICIAR=1
set -euo pipefail

SERVIDOR="${SERVIDOR:-wilber@172.16.13.216}"
LLAVE="${LLAVE:-$HOME/.ssh/id_ed25519_apps}"
DESTINO=/opt/taji
NODE_LINEA=latest-v24.x   # LTS vigente

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
SSH=(ssh -i "$LLAVE" -o BatchMode=yes "$SERVIDOR")

echo "==> Compilando juego y sitio"
npm --prefix client run build
npm --prefix site run build

echo "==> Empaquetando"
PAQUETE="$(mktemp -d)/taji.tgz"
tar czf "$PAQUETE" \
  --exclude='server/node_modules' --exclude='server/.env' \
  server client/dist site/dist deploy
du -h "$PAQUETE" | cut -f1

echo "==> Subiendo a $SERVIDOR"
scp -i "$LLAVE" -o BatchMode=yes -q "$PAQUETE" "$SERVIDOR:/tmp/taji.tgz"

# Las variables van por la entrada del ssh, NO como argumentos: Git Bash en
# Windows convierte los argumentos que parecen rutas (/opt/...) en rutas de
# Windows (C:/Program Files/Git/opt/...) antes de pasarlos al ssh.
{
printf 'DESTINO=%s\nNODE_LINEA=%s\n' "$DESTINO" "$NODE_LINEA"
cat <<'REMOTO'
set -euo pipefail
mkdir -p "$DESTINO"
cd "$DESTINO"

# --- Node propio (solo la primera vez, o si se borra runtime/) ------------
if [ ! -x runtime/bin/node ]; then
  echo "==> Instalando Node ($NODE_LINEA) en $DESTINO/runtime"
  BASE="https://nodejs.org/dist/$NODE_LINEA"
  ARCHIVO="$(curl -fsSL "$BASE/SHASUMS256.txt" | grep 'linux-x64.tar.xz' | awk '{print $2}')"
  curl -fsSL "$BASE/SHASUMS256.txt" | grep " $ARCHIVO\$" > /tmp/node.sha
  curl -fsSL -o "/tmp/$ARCHIVO" "$BASE/$ARCHIVO"
  (cd /tmp && sha256sum -c node.sha)
  rm -rf runtime && mkdir runtime
  tar xJf "/tmp/$ARCHIVO" -C runtime --strip-components=1
  rm -f "/tmp/$ARCHIVO" /tmp/node.sha
fi
export PATH="$DESTINO/runtime/bin:$PATH"
echo "    node $(node -v)"

# --- Configuración (solo la primera vez; después no se toca) --------------
if [ ! -f .env ]; then
  echo "==> Creando $DESTINO/.env"
  cat > .env <<ENV
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
DEBUG=false
# Clave del panel /taji/#/admin
ADMIN_TOKEN=$(head -c 18 /dev/urandom | base64 | tr -d '/+=')
ENV
  chmod 600 .env
fi

# --- Versión nueva en .nuevo, luego se cambia de lugar --------------------
rm -rf .nuevo && mkdir .nuevo
tar xzf /tmp/taji.tgz -C .nuevo
rm -f /tmp/taji.tgz
echo "==> Instalando dependencias de producción"
(cd .nuevo/server && npm install --omit=dev --no-audit --no-fund --no-update-notifier --loglevel=error)

rm -rf .anterior && mkdir .anterior
for d in server client site deploy; do
  [ -e "$d" ] && mv "$d" .anterior/
  mv ".nuevo/$d" "$d"
done
rm -rf .nuevo
echo "==> Archivos listos en $DESTINO (versión anterior en $DESTINO/.anterior)"
REMOTO
} | "${SSH[@]}" bash -s

if [ "${NO_REINICIAR:-}" = "1" ]; then
  echo "==> Sin reiniciar (NO_REINICIAR=1)."
  exit 0
fi

echo "==> Reiniciando taji.service (pide la contraseña de sudo)"
ssh -t -i "$LLAVE" "$SERVIDOR" \
  'if systemctl list-unit-files taji.service >/dev/null 2>&1 && [ -f /etc/systemd/system/taji.service ]; then
     sudo systemctl restart taji && sleep 1 && curl -fsS 127.0.0.1:3001/health && echo;
   else
     echo "taji.service aún no está instalado: ver deploy/README.md (paso único).";
   fi'
