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
    printf 'Contraseña MySQL para el usuario %s: ' "$(read_env DB_USER)" >/dev/tty
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

# Selecciona MySQL privado en Docker o un servidor externo.
mysql_docker_active="${MYSQL_DOCKER_ACTIVO:-$(read_env MYSQL_DOCKER_ACTIVO)}"
mysql_docker_active="$(printf '%s' "${mysql_docker_active}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
case "${mysql_docker_active}" in
  true|1|yes|si|sí) mysql_docker_active="true" ;;
  false|0|no|"") mysql_docker_active="false" ;;
  *) echo "ERROR: MYSQL_DOCKER_ACTIVO debe ser true o false." >&2; exit 2 ;;
esac
set_env MYSQL_DOCKER_ACTIVO "${mysql_docker_active}"

if [[ "${mysql_docker_active}" == "true" ]]; then
  set_env MYSQL_HOST_CONTENEDORES "mysql"
  echo "OK: MySQL privado de Docker seleccionado."
else
  db_host="${MYSQL_HOST_EXTERNO:-$(read_env MYSQL_HOST_EXTERNO)}"
  [[ -n "${db_host}" ]] || {
    echo "ERROR: define MYSQL_HOST_EXTERNO con la IP o DNS de MySQL externo." >&2
    exit 2
  }
  set_env MYSQL_HOST_EXTERNO "${db_host}"
  db_docker_host="${MYSQL_HOST_CONTENEDORES:-$(read_env MYSQL_HOST_CONTENEDORES)}"
  if [[ -z "${db_docker_host}" || "${db_docker_host}" == "auto" || "${db_docker_host}" == "mysql" ]]; then
  if [[ "${db_host}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    db_docker_host="${db_host}"
  elif [[ "${db_host}" == "localhost" || "${db_host}" == "127.0.0.1" ]]; then
    db_docker_host="host.docker.internal"
  elif command -v getent >/dev/null 2>&1; then
    db_docker_host="$(getent ahostsv4 "${db_host}" 2>/dev/null | awk 'NR==1 {print $1}')"
  fi
  [[ -n "${db_docker_host}" ]] || {
    echo "ERROR: ${db_host} funciona en Ubuntu pero no se pudo resolver para Docker." >&2
    echo "Define MYSQL_HOST_CONTENEDORES con la IP de MySQL en .env." >&2
    exit 2
  }
  set_env MYSQL_HOST_CONTENEDORES "${db_docker_host}"
  echo "OK: MySQL para Docker: ${db_host} -> ${db_docker_host}."
  fi
fi

# Solo cambia URLs publicas; la configuracion de MySQL se conserva.
https_active="${HTTPS_ACTIVO:-$(read_env HTTPS_ACTIVO)}"
https_active="$(printf '%s' "${https_active}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
case "${https_active}" in
  true|1|yes|si|sí|"") https_active="true" ;;
  false|0|no) https_active="false" ;;
  *)
    echo "ERROR: HTTPS_ACTIVO debe ser true o false (valor recibido: ${https_active})." >&2
    exit 2
    ;;
esac
set_env HTTPS_ACTIVO "${https_active}"

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
  if [[ "${https_active}" == "true" ]]; then
    portal_url="https://${portal_host}"
    admin_url="https://${admin_host}"
    api_url="https://${api_host}"
  else
    portal_url="http://${portal_host}:$(read_env PORT_FRONTEND_ACADEMIA)"
    admin_url="http://${admin_host}:$(read_env PORT_FRONTEND_ADMIN)"
    api_url="http://${api_host}:$(read_env PORT_GATEWAY)"
  fi
  set_env DNS_CORS_ORIGINS "${portal_url},${admin_url}"
  set_env DNS_API_PUBLIC_URL "${api_url}"
  set_env DNS_PORTAL_PUBLIC_URL "${portal_url}"
  set_env DNS_FRONTEND_URL "${portal_url}"
  set_env CORS_ORIGINS "${portal_url},${admin_url}"
  set_env API_PUBLIC_URL "${api_url}"
  set_env PORTAL_PUBLIC_URL "${portal_url}"
  set_env FRONTEND_URL "${portal_url}"
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
  if [[ "${https_active}" == "true" ]]; then
    api_url="https://${server_ip}:9443"
    portal_url="https://${server_ip}:6007"
    admin_url="https://${server_ip}:6008"
  else
    api_url="http://${server_ip}:$(read_env PORT_GATEWAY)"
    portal_url="http://${server_ip}:$(read_env PORT_FRONTEND_ACADEMIA)"
    admin_url="http://${server_ip}:$(read_env PORT_FRONTEND_ADMIN)"
  fi
  set_env API_PUBLIC_URL "${api_url}"
  set_env PORTAL_PUBLIC_URL "${portal_url}"
  set_env FRONTEND_URL "${portal_url}"
  set_env CORS_ORIGINS "${portal_url},${admin_url}"
  echo "OK: modo IP activo; URLs publicas configuradas para ${server_ip}."
fi
if [[ "${https_active}" == "true" ]]; then
  set_env TRUST_PROXY_HOPS "1"
  echo "OK: HTTPS activo; se usara el proxy TLS y su certificado."
else
  set_env TRUST_PROXY_HOPS "0"
  echo "OK: HTTPS desactivado; se publicaran los puertos HTTP sin certificado."
fi
chmod 600 "${ENV_FILE}" 2>/dev/null || true
echo "OK: configuración preparada en ${ENV_FILE}."
