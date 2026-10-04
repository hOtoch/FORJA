<#
.SYNOPSIS
    Remove a aparição diária do Forja: as tarefas \Forja\Abrir e \Forja\Lembrete, a pasta \Forja\
    do Agendador de Tarefas e a pasta %LOCALAPPDATA%\Forja.

.PARAMETER Sim
    Não pergunta; remove direto.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\desinstalar.ps1
#>
[CmdletBinding()]
param(
    [switch]$Sim
)

$ErrorActionPreference = 'Stop'

$pastaTarefas = '\Forja\'
$nomes = @('Abrir', 'Lembrete')
$dados = Join-Path $env:LOCALAPPDATA 'Forja'

function Confirmar {
    param([string]$Pergunta)
    $resposta = Read-Host $Pergunta
    return ($resposta -match '^\s*(s|sim)\s*$')
}

Write-Host ''
Write-Host 'Forja: desinstalação da aparição diária no Windows' -ForegroundColor Cyan
Write-Host ''
Write-Host 'O que será feito:'
Write-Host "  1. Remover as tarefas $($pastaTarefas)Abrir e $($pastaTarefas)Lembrete do Agendador de Tarefas."
Write-Host "  2. Remover a pasta $pastaTarefas do Agendador (se não sobrar outra tarefa nela)."
Write-Host "  3. Apagar a pasta $dados"
Write-Host '     (scripts copiados, configuração com o token, marcadores do dia e log).'
Write-Host ''
Write-Host 'Os arquivos desta pasta (scripts\windows do repositório) não são tocados.'
Write-Host ''

if (-not $Sim) {
    if (-not (Confirmar 'Continuar? (S/N)')) {
        Write-Host 'Desinstalação cancelada. Nada foi alterado.'
        exit 0
    }
}

$falhas = 0

# 1. Tarefas
foreach ($nome in $nomes) {
    $tarefa = Get-ScheduledTask -TaskPath $pastaTarefas -TaskName $nome -ErrorAction SilentlyContinue
    if (-not $tarefa) {
        Write-Host "Tarefa $pastaTarefas$nome não existia."
        continue
    }
    try {
        Stop-ScheduledTask -TaskPath $pastaTarefas -TaskName $nome -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskPath $pastaTarefas -TaskName $nome -Confirm:$false
        Write-Host "Tarefa $pastaTarefas$nome removida." -ForegroundColor Green
    } catch {
        $falhas++
        Write-Host ("Não foi possível remover {0}{1}: {2}" -f $pastaTarefas, $nome, $_.Exception.Message) -ForegroundColor Red
    }
}

# 2. Pasta do Agendador (via COM; o módulo ScheduledTasks não remove pastas)
try {
    $servico = New-Object -ComObject 'Schedule.Service'
    $servico.Connect()
    $pasta = $null
    try { $pasta = $servico.GetFolder($pastaTarefas.TrimEnd('\')) } catch { $pasta = $null }

    if (-not $pasta) {
        Write-Host "Pasta $pastaTarefas do Agendador não existia."
    } elseif (($pasta.GetTasks(1).Count -gt 0) -or ($pasta.GetFolders(0).Count -gt 0)) {
        Write-Host "A pasta $pastaTarefas do Agendador ainda tem outras tarefas; ela foi mantida." -ForegroundColor Yellow
    } else {
        $servico.GetFolder('\').DeleteFolder($pastaTarefas.Trim('\'), 0)
        Write-Host "Pasta $pastaTarefas do Agendador removida." -ForegroundColor Green
    }
} catch {
    $falhas++
    Write-Host ("Não foi possível remover a pasta {0} do Agendador: {1}" -f $pastaTarefas, $_.Exception.Message) -ForegroundColor Red
    Write-Host '  Ela está vazia e não faz nada; pode ser apagada à mão no Agendador de Tarefas (taskschd.msc).'
}

# 3. Pasta de dados
if (Test-Path -LiteralPath $dados -PathType Container) {
    try {
        if ((Get-Location).Path -like ($dados + '*')) { Set-Location -LiteralPath $env:USERPROFILE }
        Remove-Item -LiteralPath $dados -Recurse -Force
        Write-Host "Pasta $dados apagada." -ForegroundColor Green
    } catch {
        $falhas++
        Write-Host ("Não foi possível apagar {0}: {1}" -f $dados, $_.Exception.Message) -ForegroundColor Red
    }
} else {
    Write-Host "Pasta $dados não existia."
}

Write-Host ''
if ($falhas -gt 0) {
    Write-Host "Desinstalação concluída com $falhas falha(s). Veja as mensagens acima." -ForegroundColor Yellow
    exit 1
}
Write-Host 'Pronto. O Forja não abre mais sozinho neste PC.'
exit 0
