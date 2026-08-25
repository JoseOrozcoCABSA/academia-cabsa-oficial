#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
declare -a names=() results=() codes=()
enable_redis=0
domain=""
server_ip=""

for argument in "$@"; do
  case "${argument}" in
    --con-redis) enable_redis=1 ;;
    --dominio=*) domain="${argument#*=}"; server_ip=""; export DNS_ACTIVO=true ;;
    --ip-servidor=*) server_ip="${argument#*=}"; export DNS_ACTIVO=false ;;
    --detectar-ip) server_ip="auto"; export DNS_ACTIVO=false ;;
    -h|--help)
      echo "Uso: bash ejecutar-todo.sh [--con-redis] [--ip-servidor=172.16.17.2 | --dominio=academia.ejemplo.com]"
      echo "Redis se omite por defecto. --con-redis inicia el contenedor privado para probarlo."
      echo "--dominio configura URLs y proxy HTTPS; MySQL conserva DB_HOST del .env."
      echo "--ip-servidor configura las URLs con la IP interna y tiene prioridad sobre --dominio."
      echo "Sin argumentos respeta DNS_ACTIVO del .env; false detecta la IP de Ubuntu."
      exit 0
      ;;
    *) echo "ERROR: opción desconocida: ${argument}" >&2; exit 2 ;;
  esac
done

if [[ -n "${domain}" ]]; then
  if [[ ! "${domain}" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]]; then
    echo "ERROR: dominio no valido: ${domain}" >&2
    exit 2
  fi
  export PUBLIC_DOMAIN="${domain,,}"
  export DNS_PORTAL_HOST="usuarios.${PUBLIC_DOMAIN}"
  export DNS_ADMIN_HOST="administracion.${PUBLIC_DOMAIN}"
  export DNS_API_HOST="api.${PUBLIC_DOMAIN}"
fi
if [[ -n "${server_ip}" ]]; then
  export SERVER_IP="${server_ip}"
fi

echo "===== 0. Preparar configuración ====="
if ! bash "${ROOT}/configurar-entorno.sh"; then
  echo "ERROR: no fue posible preparar .env; no se ejecutarán pasos dependientes." >&2
  exit 1
fi

run_step() {
  local name="$1" script="$2" code
  shift 2
  echo
  echo "===== ${name} ====="
  if bash "${ROOT}/${script}" "$@"; then code=0; else code=$?; fi
  names+=("${name}"); codes+=("${code}")
  if (( code == 0 )); then
    results+=("OK")
  else
    results+=("FALLO")
    echo "AVISO: ${name} fallo con codigo ${code}; se continuara con el siguiente paso." >&2
  fi
}

declare -a docker_arguments=()
if (( enable_redis == 1 )); then
  docker_arguments+=(--con-redis)
  echo "INFO: Redis se iniciara dentro de Docker Compose para esta prueba."
else
  echo "INFO: Redis omitido. El API Gateway usara el limitador local en memoria."
fi
if [[ -n "${domain}" ]]; then
  docker_arguments+=(--dominio="${PUBLIC_DOMAIN}")
fi
run_step "1. Crear o verificar base de datos" "crear-base-datos.sh"
run_step "2. Crear y registrar respaldo" "crear-copia-seguridad.sh"
run_step "3. Levantar sitio con Docker Compose" "ejecutar-docker.sh" "${docker_arguments[@]}"

echo
echo "===== RESUMEN FINAL ====="
failed=0
for index in "${!names[@]}"; do
  printf '%-43s %s (codigo %s)\n' "${names[$index]}" "${results[$index]}" "${codes[$index]}"
  (( codes[$index] != 0 )) && failed=1
done
if (( failed != 0 )); then
  echo "Proceso terminado: todos los pasos fueron intentados, pero uno o mas fallaron." >&2
  exit 1
fi
echo "Proceso terminado correctamente."
