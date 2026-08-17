#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT}/.env"
[[ -f "${ENV_FILE}" ]] || { echo "ERROR: no existe ${ENV_FILE}" >&2; exit 1; }

read_env() {
  local value
  value="$(sed -n "s/^$1=//p" "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "${value}"
}

DB_HOST="$(read_env DB_HOST)"; DB_PORT="$(read_env DB_PORT)"
DB_NAME="$(read_env DB_NAME)"; DB_USER="$(read_env DB_USER)"; DB_PASSWORD="$(read_env DB_PASSWORD)"
BACKUP_NAME="$(read_env BACKUP_NAME)"; BACKUP_NAME="${BACKUP_NAME:-academia-final}"
BACKUP_DIRECTORY="$(read_env BACKUP_DIRECTORY)"; BACKUP_DIRECTORY="${BACKUP_DIRECTORY:-database-backups}"
[[ "${BACKUP_DIRECTORY}" = /* ]] || BACKUP_DIRECTORY="${ROOT}/${BACKUP_DIRECTORY}"
mkdir -p -- "${BACKUP_DIRECTORY}"

timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_path="${BACKUP_DIRECTORY}/${DB_NAME}-${timestamp}.sql"
partial_path="${backup_path}.partial"
trap 'rm -f -- "${partial_path}"' EXIT

docker_host="${DB_HOST}"
[[ "${docker_host}" == "127.0.0.1" || "${docker_host}" == "localhost" ]] && docker_host="host.docker.internal"
echo "Creando respaldo local de ${DB_NAME}..."
if command -v mysqldump >/dev/null 2>&1; then
  MYSQL_PWD="${DB_PASSWORD}" mysqldump --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" \
    --single-transaction --no-tablespaces --routines --triggers --events --default-character-set=utf8mb4 \
    --databases "${DB_NAME}" > "${partial_path}"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm --add-host=host.docker.internal:host-gateway -e "MYSQL_PWD=${DB_PASSWORD}" mysql:8.4 \
    mysqldump --host="${docker_host}" --port="${DB_PORT}" --user="${DB_USER}" --single-transaction \
    --no-tablespaces --routines --triggers --events --default-character-set=utf8mb4 --databases "${DB_NAME}" > "${partial_path}"
else
  echo "ERROR: instala mysql-client o Docker" >&2; exit 1
fi

[[ -s "${partial_path}" ]] || { echo "ERROR: el respaldo quedo vacio" >&2; exit 1; }
mv -- "${partial_path}" "${backup_path}"
trap - EXIT
echo "OK: respaldo local ${backup_path} ($(wc -c < "${backup_path}" | tr -d ' ') bytes)."

missing=()
for command_name in registrar-respaldo actualizar-respaldo ver-respaldos respaldar-gdrive; do
  command -v "${command_name}" >/dev/null 2>&1 || missing+=("${command_name}")
done
if (( ${#missing[@]} > 0 )); then
  echo "AVISO: respaldo local listo; no se envio a Google Drive porque faltan: ${missing[*]}"
  exit 0
fi

if ! ver-respaldos 2>/dev/null | grep -Fq -- "${BACKUP_NAME}"; then
  (cd -- "${BACKUP_DIRECTORY}" && registrar-respaldo "${BACKUP_NAME}")
fi
actualizar-respaldo "${BACKUP_NAME}" "${BACKUP_DIRECTORY}"
respaldar-gdrive "${BACKUP_NAME}"
echo "OK: respaldo ${BACKUP_NAME} enviado mediante el gestor de Google Drive."
