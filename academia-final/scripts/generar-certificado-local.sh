#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
domain="${1:-}"
[[ -n "${domain}" ]] || { echo "Uso: $0 academia.ejemplo.com" >&2; exit 2; }
command -v openssl >/dev/null 2>&1 || { echo "ERROR: se necesita openssl" >&2; exit 1; }

certificate="${ROOT}/certificados/academia-local.crt"
private_key="${ROOT}/certificados/academia-local.key"
if [[ -f "${certificate}" && -f "${private_key}" ]] \
  && openssl x509 -in "${certificate}" -noout -checkhost "${domain}" >/dev/null 2>&1; then
  echo "OK: el certificado existente incluye ${domain}."
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
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 825 \
  -keyout "${private_key}" -out "${certificate}" \
  -subj "/CN=${domain}/O=Academia CABSA" \
  -addext "subjectAltName=DNS:${domain}"
chmod 600 "${private_key}"
chmod 644 "${certificate}"
echo "OK: certificado autofirmado generado para ${domain}."
echo "AVISO: para Internet reemplazalo por uno valido de Let's Encrypt."
