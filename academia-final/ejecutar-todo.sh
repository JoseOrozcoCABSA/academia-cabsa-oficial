#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
declare -a names=() results=() codes=()
enable_redis=0

for argument in "$@"; do
  case "${argument}" in
    --con-redis) enable_redis=1 ;;
    -h|--help)
      echo "Uso: bash ejecutar-todo.sh [--con-redis]"
      echo "Redis se omite por defecto. --con-redis inicia el contenedor privado para probarlo."
      exit 0
      ;;
    *) echo "ERROR: opción desconocida: ${argument}" >&2; exit 2 ;;
  esac
done

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
