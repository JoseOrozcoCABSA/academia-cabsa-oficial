#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT}/.env"
IMPORT_FILE="${1:-}"

[[ -f "${ENV_FILE}" ]] || { echo "ERROR: no existe ${ENV_FILE}" >&2; exit 1; }

read_env() {
  local value
  value="$(sed -n "s/^$1=//p" "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "${value}"
}

MYSQL_HOST_EXTERNO="$(read_env MYSQL_HOST_EXTERNO)"
DB_PORT="$(read_env DB_PORT)"
DB_NAME="$(read_env DB_NAME)"
SOURCE_DB_NAME="$(read_env SOURCE_DB_NAME)"
SOURCE_DB_NAME="${SOURCE_DB_NAME:-academia_cabsa}"
DB_USER="$(read_env DB_USER)"
DB_PASSWORD="$(read_env DB_PASSWORD)"
MYSQL_DOCKER_ACTIVO="$(read_env MYSQL_DOCKER_ACTIVO)"

[[ -n "${DB_PORT}" && -n "${DB_NAME}" && -n "${DB_USER}" ]] || {
  echo "ERROR: completa DB_PORT, DB_NAME y DB_USER en .env" >&2; exit 1;
}
[[ "${MYSQL_DOCKER_ACTIVO,,}" == "true" || -n "${MYSQL_HOST_EXTERNO}" ]] || {
  echo "ERROR: define MYSQL_HOST_EXTERNO cuando MYSQL_DOCKER_ACTIVO=false" >&2; exit 1;
}
[[ "${DB_NAME}" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "ERROR: DB_NAME no es valido" >&2; exit 1; }
[[ "${SOURCE_DB_NAME}" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "ERROR: SOURCE_DB_NAME no es valido" >&2; exit 1; }

docker_host="${MYSQL_HOST_EXTERNO}"
[[ "${docker_host}" == "127.0.0.1" || "${docker_host}" == "localhost" ]] && docker_host="host.docker.internal"

if [[ "${MYSQL_DOCKER_ACTIVO,,}" == "true" ]]; then
  compose=(docker compose --env-file "${ENV_FILE}" -f "${ROOT}/docker-compose.yml" -f "${ROOT}/docker-compose.mysql.yml")
  (( EUID == 0 )) || docker info >/dev/null 2>&1 || compose=(sudo "${compose[@]}")
  echo "Iniciando MySQL privado..."
  "${compose[@]}" up -d --wait --wait-timeout 180 mysql
fi

mysql_query() {
  if [[ "${MYSQL_DOCKER_ACTIVO,,}" == "true" ]]; then
    "${compose[@]}" exec -T -e "MYSQL_PWD=${DB_PASSWORD}" mysql \
      mysql --host=127.0.0.1 --port="${DB_PORT}" --user="${DB_USER}" --batch --skip-column-names -e "$1"
  elif command -v mysql >/dev/null 2>&1; then
    MYSQL_PWD="${DB_PASSWORD}" mysql --host="${MYSQL_HOST_EXTERNO}" --port="${DB_PORT}" --user="${DB_USER}" \
      --batch --skip-column-names -e "$1"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm --add-host=host.docker.internal:host-gateway -e "MYSQL_PWD=${DB_PASSWORD}" mysql:8.4 \
      mysql --host="${docker_host}" --port="${DB_PORT}" --user="${DB_USER}" --batch --skip-column-names -e "$1"
  else
    echo "ERROR: instala mysql-client o Docker" >&2; return 127
  fi
}

echo "Comprobando MySQL seleccionado (puerto ${DB_PORT})..."
mysql_query "SELECT 1" >/dev/null
mysql_query "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
table_count="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_TYPE='BASE TABLE'")"

if [[ -z "${IMPORT_FILE}" && "${table_count}" -eq 0 ]]; then
  IMPORT_FILE="$(find "${ROOT}/mysql/backups" -maxdepth 1 -type f -name '*.sql' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2- || true)"
fi

if [[ -n "${IMPORT_FILE}" && "${table_count}" -eq 0 ]]; then
  [[ "${IMPORT_FILE}" = /* ]] || IMPORT_FILE="${ROOT}/${IMPORT_FILE}"
  [[ -f "${IMPORT_FILE}" ]] || { echo "ERROR: no existe el respaldo ${IMPORT_FILE}" >&2; exit 1; }
  echo "Importando respaldo: ${IMPORT_FILE}"
  if [[ "${MYSQL_DOCKER_ACTIVO,,}" == "true" ]]; then
    "${compose[@]}" exec -T -e "MYSQL_PWD=${DB_PASSWORD}" mysql \
      mysql --host=127.0.0.1 --port="${DB_PORT}" --user="${DB_USER}" \
      --default-character-set=utf8mb4 "${DB_NAME}" < "${IMPORT_FILE}"
  elif command -v mysql >/dev/null 2>&1; then
    MYSQL_PWD="${DB_PASSWORD}" mysql --host="${MYSQL_HOST_EXTERNO}" --port="${DB_PORT}" --user="${DB_USER}" \
      --default-character-set=utf8mb4 "${DB_NAME}" < "${IMPORT_FILE}"
  else
    docker run --rm -i --add-host=host.docker.internal:host-gateway -e "MYSQL_PWD=${DB_PASSWORD}" mysql:8.4 \
      mysql --host="${docker_host}" --port="${DB_PORT}" --user="${DB_USER}" --default-character-set=utf8mb4 \
      "${DB_NAME}" < "${IMPORT_FILE}"
  fi
elif [[ "${table_count}" -gt 0 ]]; then
  echo "La base ya contiene ${table_count} tablas; no se sobrescribira."
else
  echo "Base creada vacia; no se encontro un respaldo SQL para importar."
fi

source_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${SOURCE_DB_NAME}'")"
if [[ "${SOURCE_DB_NAME}" != "${DB_NAME}" && "${source_exists}" -gt 0 ]]; then
  echo "Sincronizando catalogos geograficos desde ${SOURCE_DB_NAME}..."
  geography_tables=(
    "estados:usuarios_estados"
    "municipios:usuarios_municipios"
    "ciudades:usuarios_ciudades"
    "codigos_postales:usuarios_codigos_postales"
    "colonias:usuarios_colonias"
  )
  for mapping in "${geography_tables[@]}"; do
    source_table="${mapping%%:*}"
    target_table="${mapping##*:}"
    source_table_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${SOURCE_DB_NAME}' AND TABLE_NAME='${source_table}'")"
    target_table_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='${target_table}'")"
    if [[ "${source_table_exists}" -gt 0 && "${target_table_exists}" -gt 0 ]]; then
      mysql_query "INSERT IGNORE INTO \`${DB_NAME}\`.\`${target_table}\` SELECT * FROM \`${SOURCE_DB_NAME}\`.\`${source_table}\`"
      catalog_count="$(mysql_query "SELECT COUNT(*) FROM \`${DB_NAME}\`.\`${target_table}\`")"
      echo "  ${target_table}: ${catalog_count} registros"
    else
      echo "  AVISO: no se pudo sincronizar ${target_table}; falta la tabla de origen o destino." >&2
    fi
  done
else
  echo "Catalogo historico ${SOURCE_DB_NAME} no disponible; se conservaron los datos actuales."
fi

# Las cuentas SOA usan UUID (CHAR(36)), mientras que `user_id` en la tabla
# FOMAQRO conserva identificadores numericos heredados. Se crea un vinculo
# separado e idempotente para que el registro no intente insertar un UUID en
# una columna BIGINT.
fomaqro_table_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='usuarios_fomaqro_registros'")"
if [[ "${fomaqro_table_exists}" -gt 0 ]]; then
  account_column_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='usuarios_fomaqro_registros' AND COLUMN_NAME='account_user_id'")"
  if [[ "${account_column_exists}" -eq 0 ]]; then
    mysql_query "ALTER TABLE \`${DB_NAME}\`.\`usuarios_fomaqro_registros\` ADD COLUMN account_user_id CHAR(36) NULL AFTER user_id"
    echo "Migracion: columna usuarios_fomaqro_registros.account_user_id creada."
  fi
  account_index_exists="$(mysql_query "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='usuarios_fomaqro_registros' AND INDEX_NAME='fomaqro_account_user_idx'")"
  if [[ "${account_index_exists}" -eq 0 ]]; then
    mysql_query "ALTER TABLE \`${DB_NAME}\`.\`usuarios_fomaqro_registros\` ADD INDEX fomaqro_account_user_idx (account_user_id)"
    echo "Migracion: indice fomaqro_account_user_idx creado."
  fi
fi

table_count="$(mysql_query "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_TYPE='BASE TABLE'")"
echo "OK: base ${DB_NAME} disponible con ${table_count} tablas."
