#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
declare -a identities=("$@")
[[ ${#identities[@]} -gt 0 ]] || { echo "Uso: $0 academia.ejemplo.com [admin.ejemplo.com api.ejemplo.com]" >&2; exit 2; }
command -v openssl >/dev/null 2>&1 || { echo "ERROR: se necesita openssl" >&2; exit 1; }

certificate="${ROOT}/certificados/academia-local.crt"
private_key="${ROOT}/certificados/academia-local.key"
declare -a san_entries=()
certificate_matches=1
for identity in "${identities[@]}"; do
  if [[ "${identity}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    san_entries+=("IP:${identity}")
    check_identity=(-checkip "${identity}")
  else
    san_entries+=("DNS:${identity}")
    check_identity=(-checkhost "${identity}")
  fi
  if [[ ! -f "${certificate}" || ! -f "${private_key}" ]] \
    || ! openssl x509 -in "${certificate}" -noout "${check_identity[@]}" >/dev/null 2>&1; then
    certificate_matches=0
  fi
done
if (( certificate_matches == 1 )); then
  echo "OK: el certificado existente incluye: ${identities[*]}."
  exit 0
fi

mkdir -p -- "${ROOT}/certificados"
if [[ -f "${certificate}" || -f "${private_key}" ]]; then
  backup_directory="${ROOT}/certificados/respaldo-$(date +%Y%m%d-%H%M%S)"
  mkdir -p -- "${backup_directory}"
  [[ -f "${certificate}" ]] && cp -- "${certificate}" "${backup_directory}/"
  [[ -f "${private_key}" ]] && cp -- "${private_key}" "${backup_directory}/"
  echo "OK: certificado anterior respaldado en ${backup_directory}."
fi
san_value="$(IFS=,; echo "${san_entries[*]}")"
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 825 \
  -keyout "${private_key}" -out "${certificate}" \
  -subj "/CN=${identities[0]}/O=Academia CABSA" \
  -addext "subjectAltName=${san_value}"
chmod 600 "${private_key}"
chmod 644 "${certificate}"
echo "OK: certificado autofirmado generado para: ${identities[*]}."
echo "AVISO: para Internet reemplazalo por uno valido de Let's Encrypt."
