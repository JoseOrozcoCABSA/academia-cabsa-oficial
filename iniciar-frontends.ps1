$projectRoot = $PSScriptRoot
$logsDirectory = Join-Path $projectRoot 'frontend-logs'

New-Item -ItemType Directory -Force -Path $logsDirectory | Out-Null

$frontends = @(
    @{
        Name = 'Portal académico'
        Directory = Join-Path $projectRoot 'frontend-academia'
        Port = 5007
        Output = Join-Path $logsDirectory 'academia.out.log'
        Error = Join-Path $logsDirectory 'academia.err.log'
    },
    @{
        Name = 'Administración'
        Directory = Join-Path $projectRoot 'frontend-administracion'
        Port = 5008
        Output = Join-Path $logsDirectory 'administracion.out.log'
        Error = Join-Path $logsDirectory 'administracion.err.log'
    }
)

foreach ($frontend in $frontends) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $frontend.Port -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host "$($frontend.Name) ya está disponible en http://localhost:$($frontend.Port)"
        continue
    }

    Start-Process `
        -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'dev') `
        -WorkingDirectory $frontend.Directory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $frontend.Output `
        -RedirectStandardError $frontend.Error

    Write-Host "Iniciando $($frontend.Name) en http://localhost:$($frontend.Port)"
}
