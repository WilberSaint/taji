#!/usr/bin/env bash
# Paso único en el servidor (con sudo): registra el servicio de TAJI y agrega
# ludoenergia.com a Caddy. Se puede correr las veces que sea: si algo ya está
# hecho, lo deja igual.
#
#   sudo bash /opt/taji/deploy/instalar-servidor.sh
#
# Si el Caddyfile nuevo no es válido, regresa solo el respaldo y no recarga
# Caddy: los otros sitios nunca se quedan sin servicio.
set -euo pipefail

SERVICIO=taji
UNIDAD=/opt/taji/deploy/taji.service
BLOQUE=/opt/taji/deploy/Caddyfile.snippet
DOMINIO=ludoenergia.com
SALUD=http://127.0.0.1:3001/health
CADDYFILE=/etc/caddy/Caddyfile

[ "$(id -u)" = 0 ] || { echo "Hay que correrlo con sudo: sudo bash $0"; exit 1; }

echo "==> Servicio $SERVICIO"
install -m 644 "$UNIDAD" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICIO" >/dev/null 2>&1
systemctl restart "$SERVICIO"
# Esperar a que conteste (hasta 20 s) en vez de revisar una sola vez
for _ in $(seq 20); do curl -fsS "$SALUD" >/dev/null 2>&1 && break; sleep 1; done
if curl -fsS "$SALUD" >/dev/null; then
  echo "    activo y respondiendo"
else
  echo "    NO responde. Últimas líneas del log:"
  journalctl -u "$SERVICIO" -n 30 --no-pager
  exit 1
fi

echo "==> Caddy ($DOMINIO)"
RESPALDO=""
if grep -q "^$DOMINIO {" "$CADDYFILE"; then
  echo "    el bloque ya estaba en $CADDYFILE"
else
  RESPALDO="$CADDYFILE.antes-$SERVICIO-$(date +%F-%H%M%S)"
  cp "$CADDYFILE" "$RESPALDO"
  printf '\n' >> "$CADDYFILE"
  cat "$BLOQUE" >> "$CADDYFILE"
  echo "    bloque agregado (respaldo: $RESPALDO)"
fi

# Regresa el Caddyfile a como estaba, solo si este script lo cambió
regresar() {
  if [ -n "$RESPALDO" ]; then
    cp "$RESPALDO" "$CADDYFILE"
    echo "    Se regresó el Caddyfile anterior."
  else
    echo "    OJO: el bloque de $DOMINIO sigue en $CADDYFILE y Caddy no lo acepta;"
    echo "    un reinicio de Caddy fallaría. Quitarlo o usar un respaldo $CADDYFILE.antes-*"
  fi
}

# Los logs del bloque deben ser del usuario caddy. Si los crea root (por
# ejemplo un `caddy validate` corrido con sudo), Caddy no puede abrirlos y la
# recarga falla con "permission denied".
for LOG in $(grep -o 'output file [^ ]*' "$BLOQUE" | awk '{print $3}'); do
  touch "$LOG"
  chown caddy:caddy "$LOG"
  chmod 600 "$LOG"
done

# Validar como el usuario caddy: igual que la recarga real, y sin dejar
# archivos de root en el camino.
if ! sudo -u caddy caddy validate --config "$CADDYFILE" --adapter caddyfile >/tmp/caddy-validar.log 2>&1; then
  echo "    El Caddyfile no es válido. Detalle:"
  tail -n 5 /tmp/caddy-validar.log
  regresar
  exit 1
fi

if systemctl reload caddy; then
  echo "    Caddy recargado"
else
  echo "    Caddy no aceptó la configuración. Detalle:"
  journalctl -u caddy -n 5 --no-pager | grep -o '"error":"[^"]*' | tail -n 2
  regresar
  # Deja el Caddyfile en disco igual a lo que Caddy tiene cargado, para que
  # un reinicio del servidor no lo encuentre roto
  systemctl reload caddy || true
  exit 1
fi

echo
echo "Listo. En uno o dos minutos (lo que tarda el certificado): https://$DOMINIO"
