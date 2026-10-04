# Funções compartilhadas pelos scripts do Forja no Windows.
# Carregado com ". (Join-Path $PSScriptRoot 'comum.ps1')". Compatível com o Windows PowerShell 5.1.

# Valores do forja.config.example.json; o instalador recusa a configuração se eles não forem trocados.
$script:ForjaExemploUrl = 'https://seu-forja.vercel.app'
$script:ForjaExemploToken = 'cole-aqui-o-FORJA_STATUS_TOKEN'

if (-not $script:ForjaOrigem) { $script:ForjaOrigem = 'forja' }

# Pasta de dados: marcadores, log e (depois de instalado) os próprios scripts.
function Get-ForjaPastaDados {
    return (Join-Path $env:LOCALAPPDATA 'Forja')
}

# Escreve no console e, se a pasta de dados existir, em %LOCALAPPDATA%\Forja\forja.log.
function Write-ForjaLog {
    param([string]$Mensagem)

    $linha = '{0} [{1}] {2}' -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'), $script:ForjaOrigem, $Mensagem
    Write-Host $linha

    $pasta = Get-ForjaPastaDados
    if (-not (Test-Path -LiteralPath $pasta -PathType Container)) { return }
    $log = Join-Path $pasta 'forja.log'
    try {
        if ((Test-Path -LiteralPath $log -PathType Leaf) -and ((Get-Item -LiteralPath $log).Length -gt 262144)) {
            Move-Item -LiteralPath $log -Destination (Join-Path $pasta 'forja.log.1') -Force
        }
        Add-Content -LiteralPath $log -Value $linha -Encoding UTF8
    } catch {
        # O log é só para diagnóstico; falhar aqui não pode impedir o Forja de abrir.
    }
}

# Lê e valida forja.config.json da pasta informada.
function Read-ForjaConfig {
    param(
        [Parameter(Mandatory = $true)][string]$Pasta,
        [switch]$ExigirToken
    )

    $caminho = Join-Path $Pasta 'forja.config.json'
    if (-not (Test-Path -LiteralPath $caminho -PathType Leaf)) {
        throw "Configuração não encontrada: $caminho. Copie forja.config.example.json para forja.config.json e preencha os campos."
    }

    try {
        $dados = Get-Content -LiteralPath $caminho -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        throw "O arquivo $caminho não é um JSON válido: $($_.Exception.Message)"
    }

    $url = ([string]$dados.url).Trim().TrimEnd('/')
    if ($url -notmatch '^https?://[^\s"]+$') {
        throw "O campo ""url"" de $caminho precisa ser um endereço começando com https:// (veio ""$url"")."
    }
    if ($url -eq $script:ForjaExemploUrl) {
        throw "O campo ""url"" de $caminho ainda é o do exemplo. Troque pelo endereço do Forja na Vercel."
    }

    $token = ([string]$dados.statusToken).Trim()
    if ($ExigirToken -and (($token -eq '') -or ($token -eq $script:ForjaExemploToken))) {
        throw "O campo ""statusToken"" de $caminho está vazio ou ainda é o do exemplo. Use o mesmo valor de FORJA_STATUS_TOKEN da Vercel."
    }

    $perfil = ([string]$dados.chromeProfile).Trim()
    if ($perfil -match '"') {
        throw "O campo ""chromeProfile"" de $caminho não pode conter aspas."
    }

    return [pscustomobject]@{
        Url          = $url
        StatusToken  = $token
        PerfilChrome = $perfil
        Caminho      = $caminho
    }
}

# Dia do jogo: a data local de agora menos 4 horas (o dia vira às 04:00), no formato yyyy-MM-dd.
function Get-ForjaDiaDoJogo {
    param([datetime]$Instante = (Get-Date))
    return $Instante.AddHours(-4).ToString('yyyy-MM-dd', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Read-ForjaMarcador {
    param([Parameter(Mandatory = $true)][string]$Nome)

    $caminho = Join-Path (Get-ForjaPastaDados) $Nome
    if (-not (Test-Path -LiteralPath $caminho -PathType Leaf)) { return '' }
    try {
        return ([string](Get-Content -LiteralPath $caminho -Raw -ErrorAction Stop)).Trim()
    } catch {
        return ''
    }
}

function Write-ForjaMarcador {
    param(
        [Parameter(Mandatory = $true)][string]$Nome,
        [Parameter(Mandatory = $true)][string]$Valor
    )

    $pasta = Get-ForjaPastaDados
    if (-not (Test-Path -LiteralPath $pasta -PathType Container)) {
        New-Item -ItemType Directory -Path $pasta -Force | Out-Null
    }
    Set-Content -LiteralPath (Join-Path $pasta $Nome) -Value $Valor -Encoding ASCII
}

# Milissegundos desde a última entrada de teclado ou mouse nesta sessão (GetLastInputInfo).
# Devolve -1 se não for possível medir; quem chama trata isso como "usuário presente".
function Get-ForjaMsOcioso {
    try {
        if (-not ('Forja.Entrada' -as [type])) {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace Forja
{
    public static class Entrada
    {
        [StructLayout(LayoutKind.Sequential)]
        private struct LASTINPUTINFO
        {
            public uint cbSize;
            public uint dwTime;
        }

        [DllImport("user32.dll")]
        private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        public static long MsDesdeUltimaEntrada()
        {
            LASTINPUTINFO info = new LASTINPUTINFO();
            info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
            if (!GetLastInputInfo(ref info))
            {
                return -1;
            }
            // Aritmética sem sinal: continua certa quando o contador de 32 bits dá a volta (49,7 dias).
            uint agora = unchecked((uint)Environment.TickCount);
            return (long)unchecked(agora - info.dwTime);
        }
    }
}
'@
        }
        return [long][Forja.Entrada]::MsDesdeUltimaEntrada()
    } catch {
        Write-ForjaLog ("Não foi possível medir a ociosidade: {0}" -f $_.Exception.Message)
        return [long]-1
    }
}

# Caminho do chrome.exe: registro (App Paths) e depois os locais padrão. Devolve $null se não achar.
function Find-ForjaChrome {
    $chaves = @(
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    )
    foreach ($chave in $chaves) {
        try {
            $item = Get-Item -LiteralPath $chave -ErrorAction Stop
            $valor = [string]$item.GetValue('')
            if ($valor) {
                $valor = [Environment]::ExpandEnvironmentVariables($valor.Trim().Trim('"'))
                if (Test-Path -LiteralPath $valor -PathType Leaf) { return $valor }
            }
        } catch {
            # Chave ausente: tenta a próxima.
        }
    }

    $bases = @(
        $env:ProgramFiles,
        $env:ProgramW6432,
        [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'),
        $env:LOCALAPPDATA
    )
    foreach ($base in $bases) {
        if (-not $base) { continue }
        $candidato = Join-Path $base 'Google\Chrome\Application\chrome.exe'
        if (Test-Path -LiteralPath $candidato -PathType Leaf) { return $candidato }
    }
    return $null
}

# Abre a URL no Chrome com o perfil configurado; sem Chrome, usa o navegador padrão.
function Open-ForjaUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [string]$Perfil,
        [switch]$Simular
    )

    $chrome = Find-ForjaChrome
    if ($chrome) {
        $argumentos = @()
        if ($Perfil) { $argumentos += ('--profile-directory="{0}"' -f $Perfil) }
        $argumentos += ('"{0}"' -f $Url)
        $linha = $argumentos -join ' '

        if ($Simular) {
            Write-ForjaLog ("[simulação] Abriria: ""{0}"" {1}" -f $chrome, $linha)
            return
        }
        # Uma única string: o Start-Process do 5.1 não põe aspas nos itens de uma lista.
        Start-Process -FilePath $chrome -ArgumentList $linha -WindowStyle Normal
        Write-ForjaLog ("Forja aberto no Chrome ({0})." -f $(if ($Perfil) { "perfil $Perfil" } else { 'perfil padrão' }))
        return
    }

    if ($Simular) {
        Write-ForjaLog ("[simulação] Chrome não encontrado; abriria {0} no navegador padrão." -f $Url)
        return
    }
    Start-Process -FilePath $Url
    Write-ForjaLog 'Chrome não encontrado; Forja aberto no navegador padrão.'
}
