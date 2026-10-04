<#
.SYNOPSIS
    Instala a aparição diária do Forja no Agendador de Tarefas, só para o usuário atual.

.DESCRIPTION
    Copia os scripts e a configuração para %LOCALAPPDATA%\Forja e registra, na pasta \Forja\
    do Agendador de Tarefas, sem privilégios de administrador:
      - Abrir: ao fazer logon, ao desbloquear a sessão e a cada 30 min (a partir das 04:05);
      - Lembrete: todos os dias às 21:00.
    Rodar de novo substitui as tarefas e os arquivos copiados (o marcador do dia é mantido).

.PARAMETER Sim
    Não pergunta; instala direto.

.PARAMETER Simular
    Valida a configuração e monta as tarefas em memória, sem copiar nem registrar nada.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\instalar.ps1
#>
[CmdletBinding()]
param(
    [switch]$Sim,
    [switch]$Simular
)

$ErrorActionPreference = 'Stop'
$script:ForjaOrigem = 'instalar'

$origem = $PSScriptRoot
$destino = Join-Path $env:LOCALAPPDATA 'Forja'
$pastaTarefas = '\Forja\'
$arquivos = @('abrir.ps1', 'lembrete.ps1', 'comum.ps1', 'executar-oculto.vbs', 'forja.config.json')

function Confirmar {
    param([string]$Pergunta)
    $resposta = Read-Host $Pergunta
    return ($resposta -match '^\s*(s|sim)\s*$')
}

# O Windows Script Host existe e não foi desativado (chave Settings\Enabled = 0)?
function Test-ForjaWsh {
    $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
    if (-not (Test-Path -LiteralPath $wscript -PathType Leaf)) { return $false }
    foreach ($chave in @('HKCU:\SOFTWARE\Microsoft\Windows Script Host\Settings', 'HKLM:\SOFTWARE\Microsoft\Windows Script Host\Settings')) {
        try {
            $valor = (Get-Item -LiteralPath $chave -ErrorAction Stop).GetValue('Enabled')
            if (($null -ne $valor) -and ([string]$valor -eq '0')) { return $false }
        } catch {
            # Chave ausente: o padrão é ativado.
        }
    }
    return $true
}

# Ação da tarefa: wscript + executar-oculto.vbs (sem janela). Sem o wscript, chama o PowerShell direto.
function New-ForjaAcao {
    param([string]$Script)
    $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
    if (Test-ForjaWsh) {
        $vbs = Join-Path $destino 'executar-oculto.vbs'
        return New-ScheduledTaskAction -Execute $wscript `
            -Argument ('//B //Nologo "{0}" "{1}"' -f $vbs, $Script) -WorkingDirectory $destino
    }
    $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    return New-ScheduledTaskAction -Execute $powershell `
        -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $Script) `
        -WorkingDirectory $destino
}

# Monta as duas tarefas em memória (New-ScheduledTask não registra nada).
function New-ForjaTarefas {
    param([string]$Usuario)

    $principal = New-ScheduledTaskPrincipal -UserId $Usuario -LogonType Interactive -RunLevel Limited
    # Prioridade 4 (normal): no padrão (7, abaixo do normal) o Chrome aberto pela tarefa herdaria a prioridade baixa.
    $ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -Priority 4 -Compatibility Win8

    # Abrir: logon do usuário (30 s depois, para a área de trabalho carregar).
    $gatilhoLogon = New-ScheduledTaskTrigger -AtLogOn -User $Usuario
    $gatilhoLogon.Delay = 'PT30S'

    # Abrir: desbloqueio da sessão (StateChange 8 = TASK_SESSION_UNLOCK).
    $classeSessao = Get-CimClass -Namespace 'ROOT\Microsoft\Windows\TaskScheduler' -ClassName 'MSFT_TaskSessionStateChangeTrigger'
    $gatilhoDesbloqueio = New-CimInstance -CimClass $classeSessao -ClientOnly -Property @{
        StateChange = [uint32]8
        UserId      = $Usuario
        Enabled     = $true
    }

    # Abrir: todo dia às 04:05, repetindo a cada 30 min por 23h55 (cobre o PC que passou a noite ligado).
    $hoje = [datetime]::Today
    $gatilhoDiario = New-ScheduledTaskTrigger -Daily -At $hoje.AddHours(4).AddMinutes(5)
    $repeticao = New-ScheduledTaskTrigger -Once -At $hoje.AddHours(4).AddMinutes(5) `
        -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Hours 23 -Minutes 55)
    $gatilhoDiario.Repetition = $repeticao.Repetition
    # Horário local sem fuso (o -At gera UTC): continua 04:05 mesmo se o horário de verão voltar.
    $gatilhoDiario.StartBoundary = $hoje.AddHours(4).AddMinutes(5).ToString('yyyy-MM-ddTHH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture)

    $abrir =New-ScheduledTask -Action (New-ForjaAcao -Script (Join-Path $destino 'abrir.ps1')) `
        -Trigger @($gatilhoLogon, $gatilhoDesbloqueio, $gatilhoDiario) -Principal $principal -Settings $ajustes `
        -Description 'Forja: abre o app no Chrome uma vez por dia, no primeiro uso do PC depois das 04:00.'

    # Lembrete: todo dia às 21:00.
    $gatilhoLembrete = New-ScheduledTaskTrigger -Daily -At $hoje.AddHours(21)
    $gatilhoLembrete.StartBoundary = $hoje.AddHours(21).ToString('yyyy-MM-ddTHH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture)
    $lembrete = New-ScheduledTask -Action (New-ForjaAcao -Script (Join-Path $destino 'lembrete.ps1')) `
        -Trigger @($gatilhoLembrete) -Principal $principal -Settings $ajustes `
        -Description 'Forja: às 21h, abre o app se o estudo do dia não foi feito ou se a semana corre risco.'

    return [ordered]@{ Abrir = $abrir; Lembrete = $lembrete }
}

Write-Host ''
Write-Host 'Forja: instalação da aparição diária no Windows' -ForegroundColor Cyan
Write-Host ''

# 1. Configuração
$caminhoConfig = Join-Path $origem 'forja.config.json'
if (-not (Test-Path -LiteralPath $caminhoConfig -PathType Leaf)) {
    Write-Host "Não encontrei o arquivo de configuração: $caminhoConfig" -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Crie-o a partir do exemplo, nesta pasta:'
    Write-Host '  Copy-Item .\forja.config.example.json .\forja.config.json'
    Write-Host '  notepad .\forja.config.json'
    Write-Host ''
    Write-Host 'Preencha:'
    Write-Host '  "url"           endereço do Forja na Vercel (https://...);'
    Write-Host '  "statusToken"   o mesmo valor de FORJA_STATUS_TOKEN configurado na Vercel;'
    Write-Host '  "chromeProfile" a pasta do perfil do Chrome (veja em chrome://version, "Caminho do perfil").'
    Write-Host ''
    Write-Host 'Depois rode o instalador de novo. Nada foi alterado.'
    exit 1
}

foreach ($arquivo in $arquivos) {
    if (-not (Test-Path -LiteralPath (Join-Path $origem $arquivo) -PathType Leaf)) {
        Write-Host "Arquivo ausente na pasta do instalador: $arquivo. Nada foi alterado." -ForegroundColor Red
        exit 1
    }
}

. (Join-Path $origem 'comum.ps1')
try {
    $config = Read-ForjaConfig -Pasta $origem -ExigirToken
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Nada foi alterado.'
    exit 1
}

$usuario = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$chrome = Find-ForjaChrome
$perfilTexto = $config.PerfilChrome
if (-not $perfilTexto) { $perfilTexto = '(perfil padrão do Chrome)' }
$navegadorTexto = $chrome
if (-not $navegadorTexto) { $navegadorTexto = 'Chrome não encontrado: será usado o navegador padrão' }

# 2. Plano
Write-Host "O que será feito, só para o usuário $usuario e sem privilégios de administrador:"
Write-Host ''
Write-Host "  1. Copiar $($arquivos -join ', ')"
Write-Host "     para $destino"
Write-Host ''
Write-Host "  2. Criar a pasta $pastaTarefas no Agendador de Tarefas com duas tarefas:"
Write-Host ''
Write-Host "     Abrir     ao fazer logon, ao desbloquear a sessão e a cada 30 min (a partir das 04:05)."
Write-Host "               Abre o Forja uma vez por dia (o dia vira às 04:00), se você usou o teclado"
Write-Host "               ou o mouse nos últimos 5 min."
Write-Host ''
Write-Host "     Lembrete  todos os dias às 21:00. Consulta $($config.Url)/api/status e abre o Forja"
Write-Host "               se o estudo de hoje não foi feito ou se a semana corre risco."
Write-Host ''
Write-Host "  Endereço:  $($config.Url)"
Write-Host "  Navegador: $navegadorTexto"
Write-Host "  Perfil:    $perfilTexto"
Write-Host ''
Write-Host '  As tarefas rodam escondidas (sem janela), mesmo na bateria, e param após 5 min.'
Write-Host '  Se já existirem, serão substituídas. Para remover tudo: desinstalar.ps1.'
Write-Host ''

if ($Simular) {
    try {
        $tarefas = New-ForjaTarefas -Usuario $usuario
    } catch {
        Write-Host ("[simulação] Falha ao montar as tarefas: {0}" -f $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
    foreach ($nome in $tarefas.Keys) {
        $t = $tarefas[$nome]
        Write-Host ("[simulação] {0}{1}" -f $pastaTarefas, $nome) -ForegroundColor Cyan
        Write-Host ("  Ação:      {0} {1}" -f $t.Actions[0].Execute, $t.Actions[0].Arguments)
        foreach ($g in $t.Triggers) {
            $detalhe = $g.CimClass.CimClassName
            if ($g.StartBoundary) { $detalhe += ' início ' + $g.StartBoundary }
            if ($g.Delay) { $detalhe += ' atraso ' + $g.Delay }
            if ($g.CimClass.CimClassName -eq 'MSFT_TaskSessionStateChangeTrigger') { $detalhe += ' StateChange ' + $g.StateChange }
            if ($g.Repetition -and $g.Repetition.Interval) {
                $detalhe += ' repete ' + $g.Repetition.Interval + ' por ' + $g.Repetition.Duration
            }
            Write-Host ("  Gatilho:   {0}" -f $detalhe)
        }
        Write-Host ("  Principal: {0} ({1}, {2})" -f $t.Principal.UserId, $t.Principal.LogonType, $t.Principal.RunLevel)
        Write-Host ("  Ajustes:   StartWhenAvailable={0}, bateria={1}, limite={2}, instâncias={3}, prioridade={4}" -f `
            $t.Settings.StartWhenAvailable, (-not $t.Settings.DisallowStartIfOnBatteries), `
            $t.Settings.ExecutionTimeLimit, $t.Settings.MultipleInstances, $t.Settings.Priority)
    }
    Write-Host ''
    Write-Host '[simulação] Nada foi copiado nem registrado.'
    exit 0
}

if (-not $Sim) {
    if (-not (Confirmar 'Continuar? (S/N)')) {
        Write-Host 'Instalação cancelada. Nada foi alterado.'
        exit 0
    }
}

# 3. Instalação
try {
    if (-not (Test-Path -LiteralPath $destino -PathType Container)) {
        New-Item -ItemType Directory -Path $destino -Force | Out-Null
    }
    foreach ($arquivo in $arquivos) {
        $alvo = Join-Path $destino $arquivo
        Copy-Item -LiteralPath (Join-Path $origem $arquivo) -Destination $alvo -Force
        try { Unblock-File -LiteralPath $alvo } catch { }
    }
    Write-Host "Arquivos copiados para $destino." -ForegroundColor Green

    $tarefas = New-ForjaTarefas -Usuario $usuario
    foreach ($nome in $tarefas.Keys) {
        Register-ScheduledTask -TaskName $nome -TaskPath $pastaTarefas -InputObject $tarefas[$nome] -Force | Out-Null
        Write-Host "Tarefa $pastaTarefas$nome registrada." -ForegroundColor Green
    }
} catch {
    Write-Host ''
    Write-Host ("Falha na instalação: {0}" -f $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Rode o instalador de novo depois de corrigir, ou desinstalar.ps1 para limpar o que foi criado.'
    exit 1
}

Write-Host ''
foreach ($nome in $tarefas.Keys) {
    try {
        $info = Get-ScheduledTaskInfo -TaskPath $pastaTarefas -TaskName $nome
        Write-Host ("  {0}{1}: próxima execução {2}" -f $pastaTarefas, $nome, $info.NextRunTime)
    } catch { }
}
Write-Host ''
Write-Host 'Pronto. Para testar agora sem esperar os gatilhos:'
Write-Host "  Start-ScheduledTask -TaskPath '$pastaTarefas' -TaskName 'Abrir'"
Write-Host "O registro do que as tarefas fazem fica em $(Join-Path $destino 'forja.log')."
exit 0
