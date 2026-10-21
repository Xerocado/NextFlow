# Executar: .\iniciar-dev.ps1
# Le valores literalmente: nao executa codigo nem expande $ ou expressoes.
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '.env'
$previousValues = @{}
$resultCode = 0

try {
    if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
        throw 'Crie o arquivo .env a partir de .env.example e preencha as credenciais localmente.'
    }
    $lineNumber = 0
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
        $lineNumber++
        $entry = $line.Trim()
        if ($entry.Length -eq 0 -or $entry.StartsWith('#')) { continue }
        if ($entry -notmatch '^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            throw "Formato invalido no .env, linha $lineNumber. Use NOME=valor."
        }
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if ($value.StartsWith('"') -or $value.StartsWith("'")) {
            $quote = $value.Substring(0, 1)
            if ($value.Length -lt 2 -or -not $value.EndsWith($quote)) {
                throw "Aspas invalidas no .env, linha $lineNumber."
            }
            $value = $value.Substring(1, $value.Length - 2)
        }
        $current = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ([string]::IsNullOrEmpty($current) -and $value.Length -gt 0) {
            if (-not $previousValues.ContainsKey($name)) { $previousValues[$name] = $current }
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
    foreach ($required in @('DB_USERNAME', 'DB_PASSWORD')) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($required, 'Process'))) {
            throw "Preencha $required no .env local ou no ambiente do terminal."
        }
    }
    if ([Environment]::GetEnvironmentVariable('SMTP_AUTH', 'Process') -eq 'true') {
        foreach ($required in @('SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_FROM')) {
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($required, 'Process'))) {
                throw "Preencha $required no .env local ou no ambiente do terminal para usar SMTP autenticado."
            }
        }
    }
    Push-Location -LiteralPath $PSScriptRoot
    try {
        Write-Host 'Iniciando NextFlow em http://localhost:8080. Para encerrar, use Ctrl+C.'
        & (Join-Path $PSScriptRoot 'mvnw.cmd') spring-boot:run
        $resultCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} catch {
    # Nao imprime objetos de erro, linhas do arquivo ou valores de variaveis.
    Write-Host $_.Exception.Message -ForegroundColor Red
    $resultCode = 1
} finally {
    foreach ($name in $previousValues.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process')
    }
}
exit $resultCode
