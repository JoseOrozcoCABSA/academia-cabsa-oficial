#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${CONFIG_ENV_FILE:-${ROOT}/.env}"
[[ "${ENV_FILE}" = /* ]] || ENV_FILE="${ROOT}/${ENV_FILE}"
EXAMPLE_FILE="${ROOT}/.env.example"

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

detect_server_ip() {
  local detected=""
  if command -v ip >/dev/null 2>&1; then
    detected="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n 1)"
  fi
  if [[ -z "${detected}" ]] && command -v hostname >/dev/null 2>&1; then
    detected="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v '^127\.' | head -n 1)"
  fi
  [[ -n "${detected}" ]] || {
    echo "ERROR: no fue posible detectar la IP interna del servidor." >&2
    return 1
  }
  printf '%s' "${detected}"
}

if [[ ! -f "${ENV_FILE}" ]]; then
  [[ -f "${EXAMPLE_FILE}" ]] || {
    echo "ERROR: no existe ${ENV_FILE} ni la plantilla ${EXAMPLE_FILE}." >&2
    exit 1
  }
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

# Solo cambia URLs publicas; las conexiones internas y DB_HOST se conservan.
dns_active="${DNS_ACTIVO:-$(read_env DNS_ACTIVO)}"
dns_active="$(printf '%s' "${dns_active}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
case "${dns_active}" in
  true|1|yes|si|sí) dns_active="true" ;;
  false|0|no|"") dns_active="false" ;;
  *)
    echo "ERROR: DNS_ACTIVO debe ser true o false (valor recibido: ${dns_active})." >&2
    exit 2
    ;;
esac
set_env DNS_ACTIVO "${dns_active}"

if [[ "${dns_active}" == "true" ]]; then
  portal_host="${DNS_PORTAL_HOST:-$(read_env DNS_PORTAL_HOST)}"
  admin_host="${DNS_ADMIN_HOST:-$(read_env DNS_ADMIN_HOST)}"
  api_host="${DNS_API_HOST:-$(read_env DNS_API_HOST)}"
  [[ -n "${portal_host}" && -n "${admin_host}" && -n "${api_host}" ]] || {
    echo "ERROR: configura DNS_PORTAL_HOST, DNS_ADMIN_HOST y DNS_API_HOST en .env." >&2
    exit 2
  }
  set_env PUBLIC_DOMAIN "${portal_host}"
  set_env DNS_CORS_ORIGINS "https://${portal_host},https://${admin_host}"
  set_env DNS_API_PUBLIC_URL "https://${api_host}"
  set_env DNS_PORTAL_PUBLIC_URL "https://${portal_host}"
  set_env DNS_FRONTEND_URL "https://${portal_host}"
  set_env CORS_ORIGINS "https://${portal_host},https://${admin_host}"
  set_env API_PUBLIC_URL "https://${api_host}"
  set_env PORTAL_PUBLIC_URL "https://${portal_host}"
  set_env FRONTEND_URL "https://${portal_host}"
  public_host="${portal_host}"
  echo "OK: modo DNS activo: portal=${portal_host}, admin=${admin_host}, api=${api_host}."
else
  server_ip="${SERVER_IP:-auto}"
  if [[ "${server_ip}" == "auto" ]]; then
    server_ip="$(detect_server_ip)" || exit 2
    echo "OK: IP interna detectada: ${server_ip}."
  fi
  if [[ ! "${server_ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "ERROR: IP interna no valida: ${server_ip}" >&2
    exit 2
  fi
  IFS=. read -r o1 o2 o3 o4 <<<"${server_ip}"
  for octet in "${o1}" "${o2}" "${o3}" "${o4}"; do
    (( octet >= 0 && octet <= 255 )) || { echo "ERROR: IP interna no valida: ${server_ip}" >&2; exit 2; }
  done
  set_env SERVER_IP "${server_ip}"
  public_host="${server_ip}"
  set_env API_PUBLIC_URL "https://${server_ip}:9443"
  set_env PORTAL_PUBLIC_URL "https://${server_ip}:6007"
  set_env FRONTEND_URL "https://${server_ip}:6007"
  set_env CORS_ORIGINS "https://${server_ip}:6007,https://${server_ip}:6008"
  echo "OK: modo IP activo; URLs publicas configuradas para ${server_ip}."
fi
set_env TRUST_PROXY_HOPS "1"
chmod 600 "${ENV_FILE}" 2>/dev/null || true
echo "OK: configuración preparada en ${ENV_FILE}."
