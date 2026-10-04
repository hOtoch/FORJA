<#
.SYNOPSIS
    Abre o Forja no Chrome uma vez por dia do jogo, no primeiro uso do PC depois das 04:00.

.DESCRIPTION
    Chamado pela tarefa \Forja\Abrir (logon, desbloqueio e a cada 30 min).
    1. Calcula o dia do jogo (data local de agora menos 4 horas).
    2. Se %LOCALAPPDATA%\Forja\ultimo-dia.txt já tem esse dia, sai.
    3. Se ninguém mexeu no teclado ou mouse nos últimos 5 min, espera até -EsperaSegundos
       por algum uso; se continuar ocioso, sai sem gravar (tenta na próxima execução).
    4. Abre a URL no Chrome com o perfil configurado e grava o marcador.

.PARAMETER Forcar
    Ignora o marcador e a ociosidade e não grava o marcador. Para testar à mão.

.PARAMETER Simular
    Faz todas as checagens, mas só mostra o que abriria. Não abre nada nem grava o marcador.

.PARAMETER EsperaSegundos
    Quanto tempo esperar por uso do teclado ou mouse quando o PC está ocioso (padrão 90).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\abrir.ps1 -Simular
#>
[CmdletBinding()]
param(
    [switch]$Forcar,
    [switch]$Simular,
    [ValidateRange(0, 240)][int]$EsperaSegundos = 90
)

$ErrorActionPreference = 'Stop'
$script:ForjaOrigem = 'abrir'
. (Join-Path $PSScriptRoot 'comum.ps1')

$limiteOciosoMs = 5 * 60 * 1000
$marcador = 'ultimo-dia.txt'

try {
    $config = Read-ForjaConfig -Pasta $PSScriptRoot
    $dia = Get-ForjaDiaDoJogo

    if (-not $Forcar) {
        if ((Read-ForjaMarcador -Nome $marcador) -eq $dia) {
            Write-ForjaLog "O Forja já abriu no dia do jogo $dia. Nada a fazer."
            exit 0
        }

        $ocioso = Get-ForjaMsOcioso
        $prazo = (Get-Date).AddSeconds($EsperaSegundos)
        while (($ocioso -ge $limiteOciosoMs) -and ((Get-Date) -lt $prazo)) {
            Start-Sleep -Seconds 5
            $ocioso = Get-ForjaMsOcioso
        }

        if ($ocioso -ge $limiteOciosoMs) {
            Write-ForjaLog ("Sem uso do teclado ou mouse há {0} min. Tento na próxima execução." -f [math]::Floor($ocioso / 60000))
            exit 0
        }
        if ($ocioso -lt 0) {
            Write-ForjaLog 'Ociosidade desconhecida; considero que o usuário está presente.'
        }

        # A espera pode ter atravessado as 04:00.
        $dia = Get-ForjaDiaDoJogo
    }

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
