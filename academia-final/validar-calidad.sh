#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for unit in academia-service ai-service analytics-service api-gateway content-service notifications-service users-service frontend-academia frontend-administracion; do
  echo "===== ${unit} ====="
  (cd "${ROOT}/${unit}" && npm run check --if-present && npm test && npm run build)
done
node "${ROOT}/scripts/auditar-dependencias.mjs"
docker compose --project-directory "${ROOT}" config --quiet
echo 'Validación de calidad completada.'
