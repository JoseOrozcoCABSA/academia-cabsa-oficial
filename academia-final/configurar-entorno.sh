#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT}/.env"
EXAMPLE_FILE="${ROOT}/.env.example"

[[ -f "${EXAMPLE_FILE}" ]] || { echo "ERROR: no existe ${EXAMPLE_FILE}" >&2; exit 1; }

read_env() {
  local value
  value="$(sed -n "s/^$1=//p" "${ENV_FILE}" 2>/dev/null | tail -n 1 | tr -d '\r')"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "${value}"
}

set_env() {
  local key="$1" value="$2" escaped
  escaped="$(printf '%s' "${value}" | sed 's/[\\&|]/\\&/g')"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "${ENV_FILE}"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

secure_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 48
  else
    printf '%s:%s:%s:%s' "$(date +%s%N)" "$$" "${RANDOM}" "$(hostname)" | sha512sum | cut -d' ' -f1
  fi
}

if [[ ! -f "${ENV_FILE}" ]]; then
  cp -- "${EXAMPLE_FILE}" "${ENV_FILE}"
  echo "OK: se creó ${ENV_FILE} desde .env.example."
fi
chmod 600 "${ENV_FILE}" 2>/dev/null || true

db_password="${DB_PASSWORD:-$(read_env DB_PASSWORD)}"
if [[ -z "${db_password}" || "${db_password}" == CAMBIAR_* ]]; then
  if [[ -r /dev/tty ]]; then
    printf 'Contraseña MySQL para %s@%s: ' "$(read_env DB_USER)" "$(read_env DB_HOST)" >/dev/tty
    IFS= read -r -s db_password </dev/tty
    printf '\n' >/dev/tty
  else
    echo "ERROR: define DB_PASSWORD o ejecuta el script desde una terminal interactiva." >&2
    exit 2
  fi
fi
[[ -n "${db_password}" && "${db_password}" != CAMBIAR_* ]] || {
  echo "ERROR: DB_PASSWORD no puede quedar vacío ni conservar el valor de ejemplo." >&2
  exit 2
}
set_env DB_PASSWORD "${db_password}"

for key in JWT_SECRET INTERNAL_SERVICE_KEY; do
  value="$(read_env "${key}")"
  if [[ -z "${value}" || "${value}" == CAMBIAR_* || ${#value} -lt 32 ]]; then
    set_env "${key}" "$(secure_hex)"
    echo "OK: ${key} seguro generado automáticamente."
  fi
done

if (( EUID == 0 )) && [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != root ]]; then
  owner_group="$(id -gn "${SUDO_USER}")"
  chown "${SUDO_USER}:${owner_group}" "${ENV_FILE}" 2>/dev/null || true
fi
chmod 600 "${ENV_FILE}" 2>/dev/null || true
echo "OK: configuración preparada en ${ENV_FILE}."
