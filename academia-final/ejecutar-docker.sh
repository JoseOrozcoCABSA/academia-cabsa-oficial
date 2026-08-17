#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "${ROOT}"

enable_redis=0
for argument in "$@"; do
  case "${argument}" in
    --con-redis) enable_redis=1 ;;
    -h|--help)
      echo "Uso: bash ejecutar-docker.sh [--con-redis]"
      echo "Redis se omite por defecto. --con-redis inicia el perfil redis."
      exit 0
      ;;
    *) echo "ERROR: opcion desconocida: ${argument}" >&2; exit 2 ;;
  esac
done

[[ -f .env ]] || { echo "ERROR: no existe ${ROOT}/.env" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker no esta instalado" >&2; exit 1; }

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  echo "ERROR: Docker no esta iniciado o el usuario no tiene permisos" >&2
  exit 1
fi

"${DOCKER[@]}" compose version >/dev/null
if (( enable_redis == 1 )); then
  export REDIS_URL="${REDIS_URL:-redis://redis:6379}"
  compose=("${DOCKER[@]}" compose --env-file .env --profile redis)
else
  # La variable del proceso prevalece sobre .env y fuerza el modo sin Redis.
  export REDIS_URL=""
  compose=("${DOCKER[@]}" compose --env-file .env)
  redis_compose=("${DOCKER[@]}" compose --env-file .env --profile redis)
  if [[ -n "$("${redis_compose[@]}" ps -q redis 2>/dev/null || true)" ]]; then
    echo "Deteniendo el contenedor Redis existente mientras su uso esta pospuesto..."
    if ! "${redis_compose[@]}" stop redis; then
      echo "AVISO: no fue posible detener Redis; se continuara con los demas servicios." >&2
    fi
  fi
fi
up_options=(-d --build --remove-orphans)
if "${DOCKER[@]}" compose up --help 2>/dev/null | grep -q -- '--wait'; then
  up_options+=(--wait --wait-timeout 240)
fi

# La version anterior guardaba las evidencias de soporte dentro del contenedor.
# Antes de recrearlo se rescatan y, al terminar, se copian al volumen persistente.
support_backup=""
old_notifications_container="$("${compose[@]}" ps -q notifications-service 2>/dev/null || true)"
if [[ -n "${old_notifications_container}" ]] \
  && "${DOCKER[@]}" exec "${old_notifications_container}" sh -c \
    "find /app/src/storage/support -type f ! -name .gitkeep -print -quit 2>/dev/null | grep -q ."; then
  support_backup="$(mktemp -d "${TMPDIR:-/tmp}/academia-support.XXXXXX")"
  "${DOCKER[@]}" cp "${old_notifications_container}:/app/src/storage/support/." "${support_backup}/"
  echo "Respaldo temporal de evidencias de soporte preparado."
fi

cleanup_support_backup() {
  if [[ -n "${support_backup}" && -d "${support_backup}" \
    && "${support_backup}" == "${TMPDIR:-/tmp}"/academia-support.* ]]; then
    rm -rf -- "${support_backup}"
  fi
}
trap cleanup_support_backup EXIT

echo "Construyendo e iniciando Academia Final..."
set +e
"${compose[@]}" up "${up_options[@]}"
up_code=$?
set -e

if (( up_code != 0 )); then
  echo "ERROR: Docker Compose no pudo iniciar todos los servicios (codigo ${up_code})." >&2
  echo "Estado de los contenedores:" >&2
  "${compose[@]}" ps -a || true
  echo "Últimos registros de los servicios:" >&2
  services=(academia-service ai-service content-service analytics-service users-service notifications-service api-gateway)
  (( enable_redis == 1 )) && services+=(redis)
  for service in "${services[@]}"; do
    echo "===== ${service} =====" >&2
    "${compose[@]}" logs --no-color --tail=120 "${service}" >&2 || true
  done
  exit "${up_code}"
fi

if [[ -n "${support_backup}" ]]; then
  new_notifications_container="$("${compose[@]}" ps -q notifications-service)"
  if [[ -n "${new_notifications_container}" ]]; then
    "${DOCKER[@]}" cp "${support_backup}/." "${new_notifications_container}:/app/runtime-support/"
    echo "Evidencias de soporte migradas al volumen persistente."
  else
    echo "AVISO: no se encontro el nuevo contenedor para restaurar las evidencias." >&2
  fi
fi

"${compose[@]}" ps
echo "OK: plataforma iniciada. Los puertos publicos se toman del archivo .env."
