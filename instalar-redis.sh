#!/usr/bin/env bash
# Instala y verifica Redis Open Source como servicio local en Ubuntu/Debian.
set -Eeuo pipefail

if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 ping 2>/dev/null | grep -qx PONG; then
  echo "OK: Redis local ya está instalado y responde en 127.0.0.1:6379."
  exit 0
fi

if [[ ! -r /etc/os-release ]]; then
  echo "ERROR: no se pudo identificar el sistema operativo." >&2
  exit 1
fi
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ;;
  *)
    echo "ERROR: instalación automática disponible sólo para Ubuntu/Debian (detectado: ${ID:-desconocido})." >&2
    exit 1
    ;;
esac

command -v sudo >/dev/null 2>&1 || { echo "ERROR: se necesita sudo para instalar Redis." >&2; exit 1; }

echo "Instalando Redis desde el repositorio oficial packages.redis.io..."
sudo apt-get update
sudo apt-get install -y lsb-release curl gpg ca-certificates
curl -fsSL https://packages.redis.io/gpg \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
release="$(lsb_release -cs)"
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb ${release} main" \
  | sudo tee /etc/apt/sources.list.d/redis.list >/dev/null
sudo apt-get update
sudo apt-get install -y redis
sudo systemctl enable --now redis-server

redis-cli -h 127.0.0.1 ping | grep -qx PONG \
  || { echo "ERROR: Redis se instaló pero no responde." >&2; exit 1; }
echo "OK: Redis local instalado, habilitado al arranque y escuchando en 127.0.0.1:6379."
