<#
.SYNOPSIS
    Lembrete das 21h: abre o Forja se o estudo de hoje não foi feito ou se a semana corre risco.

.DESCRIPTION
    Chamado pela tarefa \Forja\Lembrete (todo dia às 21:00).
    1. Só age entre 21:00 e 03:59 (se o PC estava desligado às 21h e ligou de manhã, não abre
       por causa do dia anterior) e no máximo uma vez por dia do jogo
       (marcador %LOCALAPPDATA%\Forja\ultimo-lembrete.txt).
    2. Chama GET {url}/api/status com "Authorization: Bearer {statusToken}".
    3. Abre a URL no Chrome se studyDone for falso ou weekAtRisk for verdadeiro.
       Em erro de rede, token recusado ou resposta inesperada, abre também (melhor sobrar que faltar).

.PARAMETER Forcar
    Ignora o horário e o marcador e não grava o marcador. Para testar à mão.

.PARAMETER Simular
    Consulta o status e decide, mas só mostra o que abriria. Não abre nada nem grava o marcador.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\lembrete.ps1 -Forcar -Simular
#>
[CmdletBinding()]
param(
    [switch]$Forcar,
    [switch]$Simular
)

$ErrorActionPreference = 'Stop'
$script:ForjaOrigem = 'lembrete'
. (Join-Path $PSScriptRoot 'comum.ps1')

$marcador = 'ultimo-lembrete.txt'

try {
    $config = Read-ForjaConfig -Pasta $PSScriptRoot -ExigirToken
    $dia = Get-ForjaDiaDoJogo

    if (-not $Forcar) {
        $hora = (Get-Date).Hour
        if (($hora -ge 4) -and ($hora -lt 21)) {
            Write-ForjaLog ("Fora da janela do lembrete (agora são {0:HH:mm}; vale das 21:00 às 03:59). Nada a fazer." -f (Get-Date))
            exit 0
        }
        if ((Read-ForjaMarcador -Nome $marcador) -eq $dia) {
            Write-ForjaLog "O lembrete já abriu o Forja no dia do jogo $dia. Nada a fazer."
            exit 0
        }
    }

    $abrir = $false
    $endereco = $config.Url + '/api/status'
    try {
        # O Windows PowerShell 5.1 pode não oferecer TLS 1.2 por padrão.
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

        $cabecalhos = @{ Authorization = 'Bearer ' + $config.StatusToken }
        $status = Invoke-RestMethod -Uri $endereco -Method Get -Headers $cabecalhos -TimeoutSec 30 -UseBasicParsing

        if (($status.studyDone -isnot [bool]) -or ($status.weekAtRisk -isnot [bool])) {
            $abrir = $true
            Write-ForjaLog 'Resposta inesperada de /api/status (sem studyDone ou weekAtRisk). Abrindo por precaução.'
        } elseif ((-not $status.studyDone) -or $status.weekAtRisk) {
            $abrir = $true
            $motivos = @($status.reasons | Where-Object { $_ }) -join ' | '
            Write-ForjaLog ("Dia {0}: studyDone={1}, weekAtRisk={2}. {3}" -f $status.today, $status.studyDone, $status.weekAtRisk, $motivos)
        } else {
            Write-ForjaLog ("Dia {0}: estudo feito e semana fora de risco. Nada a fazer." -f $status.today)
        }
    } catch {
        $abrir = $true
        Write-ForjaLog ("Falha ao consultar {0}: {1}. Abrindo por precaução." -f $endereco, $_.Exception.Message.Trim().TrimEnd('.'))
    }

    if (-not $abrir) { exit 0 }

    Open-ForjaUrl -Url $config.Url -Perfil $config.PerfilChrome -Simular:$Simular

    if ($Forcar -or $Simular) {
        Write-ForjaLog 'Marcador não gravado (modo -Forcar ou -Simular).'
    } else {
        Write-ForjaMarcador -Nome $marcador -Valor $dia
    }
    exit 0
} catch {
    Write-ForjaLog ("Erro: {0}" -f $_.Exception.Message)
    exit 1
}
