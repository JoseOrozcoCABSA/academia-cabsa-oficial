$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$units = @('academia-service', 'ai-service', 'analytics-service', 'api-gateway', 'content-service', 'notifications-service', 'users-service', 'frontend-academia', 'frontend-administracion')
foreach ($unit in $units) {
  Push-Location (Join-Path $root $unit)
  try {
    $scripts = (Get-Content -Raw package.json | ConvertFrom-Json).scripts
    if ($scripts.check) { npm run check; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
    npm test; if ($LASTEXITCODE) { exit $LASTEXITCODE }
    npm run build; if ($LASTEXITCODE) { exit $LASTEXITCODE }
  } finally { Pop-Location }
}
node (Join-Path $root 'scripts/auditar-dependencias.mjs'); if ($LASTEXITCODE) { exit $LASTEXITCODE }
docker compose --project-directory $root config --quiet; if ($LASTEXITCODE) { exit $LASTEXITCODE }
Write-Host 'Validación de calidad completada.' -ForegroundColor Green
