# Forja no Windows: aparição diária e lembrete das 21h

Dois scripts do PowerShell fazem o Forja aparecer sozinho no Chrome:

- **Abrir** (`abrir.ps1`): abre o Forja uma vez por dia do jogo, no primeiro uso do PC depois das 04:00. Roda ao fazer logon, ao desbloquear a sessão e a cada 30 min, então funciona mesmo quando o PC passou a noite ligado.
- **Lembrete** (`lembrete.ps1`): às 21:00, consulta `GET /api/status` e abre o Forja se o estudo de hoje não foi feito (`studyDone` falso) ou se a semana corre risco (`weekAtRisk` verdadeiro). Se a consulta falhar, abre também.

Funciona no Windows PowerShell 5.1 (o que já vem no Windows 10), sem módulos extras e sem administrador.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `forja.config.example.json` | Modelo da configuração |
| `forja.config.json` | Sua configuração, com o token. Fica fora do git |
| `abrir.ps1` | Abre o Forja uma vez por dia |
| `lembrete.ps1` | Lembrete das 21h |
| `comum.ps1` | Funções usadas pelos dois scripts (configuração, dia do jogo, ociosidade, Chrome, log) |
| `executar-oculto.vbs` | Lançador que roda o PowerShell sem piscar janela de console |
| `instalar.ps1` | Copia os arquivos e registra as tarefas |
| `desinstalar.ps1` | Remove as tarefas e os arquivos copiados |

## 1. Configurar

No PowerShell, dentro desta pasta:

```powershell
cd scripts\windows
Copy-Item .\forja.config.example.json .\forja.config.json
notepad .\forja.config.json
```

Preencha:

| Campo | O que pôr |
|---|---|
| `url` | O endereço do Forja na Vercel, por exemplo `https://forja-xyz.vercel.app` (sem `/` no fim) |
| `statusToken` | O mesmo valor da variável `FORJA_STATUS_TOKEN` configurada na Vercel |
| `chromeProfile` | A pasta do perfil do Chrome, por exemplo `Profile 4`. Para descobrir, abra `chrome://version` no perfil desejado e veja o fim do "Caminho do perfil". Deixe `""` para usar o perfil padrão |

## 2. Instalar

```powershell
powershell -ExecutionPolicy Bypass -File .\instalar.ps1
```

O instalador mostra o que vai fazer e pede confirmação (S/N). Para pular a pergunta, use `-Sim`. Para só conferir a configuração e ver as tarefas montadas, sem instalar nada, use `-Simular`.

Ele:

1. copia `abrir.ps1`, `lembrete.ps1`, `comum.ps1`, `executar-oculto.vbs` e `forja.config.json` para `%LOCALAPPDATA%\Forja`;
2. registra, na pasta `\Forja\` do Agendador de Tarefas, só para o seu usuário e sem elevação:

| Tarefa | Gatilhos | Ação |
|---|---|---|
| `\Forja\Abrir` | Logon (30 s depois); desbloqueio da sessão; todo dia às 04:05 repetindo a cada 30 min por 23h55 | `abrir.ps1` |
| `\Forja\Lembrete` | Todo dia às 21:00 | `lembrete.ps1` |

As duas rodam por `wscript.exe //B executar-oculto.vbs <script>`, que chama `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File <script>` com a janela oculta. Configurações: iniciar assim que possível se o horário passou, rodar na bateria, parar após 5 min, não abrir uma segunda instância e prioridade normal (no padrão do Agendador, um Chrome aberto pela tarefa herdaria prioridade baixa).

Rodar o instalador de novo substitui as tarefas e os arquivos copiados. **Mudou a URL, o token ou o perfil?** Edite `forja.config.json` aqui e rode o instalador outra vez.

Confira em `taskschd.msc` a pasta `Forja` com "Abrir" e "Lembrete".

## Como cada script decide

**Dia do jogo:** a data local de agora menos 4 horas. Às 03:59 de terça ainda é segunda; às 04:00 vira terça.

**`abrir.ps1`**

1. Se `%LOCALAPPDATA%\Forja\ultimo-dia.txt` já tem o dia do jogo de hoje, sai.
2. Se ninguém mexeu no teclado ou no mouse nos últimos 5 min, espera até 90 s por algum uso. Se continuar ocioso, sai sem gravar nada e tenta de novo na próxima execução (no máximo 30 min depois, ou ao desbloquear).
3. Abre a URL no Chrome com `--profile-directory="<perfil>"` e grava o dia no marcador. O Chrome é procurado no registro (App Paths) e nos locais padrão; se não for achado, a URL abre no navegador padrão.

**`lembrete.ps1`**

1. Só age entre 21:00 e 03:59. Se o PC estava desligado às 21h e só ligou de manhã, a execução atrasada não abre nada.
2. Abre no máximo uma vez por dia do jogo (marcador `%LOCALAPPDATA%\Forja\ultimo-lembrete.txt`).
3. Chama `GET {url}/api/status` com `Authorization: Bearer {statusToken}` (TLS 1.2, 30 s de limite). Abre se `studyDone` for falso ou `weekAtRisk` for verdadeiro. Erro de rede, token recusado (401) ou resposta inesperada também abrem.

Tudo o que as tarefas fazem fica registrado em `%LOCALAPPDATA%\Forja\forja.log` (o log só é gravado depois de instalado).

## 3. Testar à mão

Os dois scripts aceitam:

- `-Simular`: faz as checagens e mostra o que abriria, sem abrir nada nem gravar marcador;
- `-Forcar`: ignora marcador, ociosidade e horário, e não grava marcador (não atrapalha a execução real do dia).

Nesta pasta, com o `forja.config.json` preenchido:

```powershell
# Abrir: o que aconteceria agora?
powershell -ExecutionPolicy Bypass -File .\abrir.ps1 -Simular

# Abrir: abre o Forja no Chrome agora, sem checagens
powershell -ExecutionPolicy Bypass -File .\abrir.ps1 -Forcar

# Lembrete: consulta /api/status e diz se abriria (a qualquer hora)
powershell -ExecutionPolicy Bypass -File .\lembrete.ps1 -Forcar -Simular

# Lembrete: consulta e abre se houver pendência
powershell -ExecutionPolicy Bypass -File .\lembrete.ps1 -Forcar
```

Depois de instalado, para testar as tarefas de verdade:

```powershell
# Esquece que o Forja já abriu hoje e roda a tarefa Abrir agora
Remove-Item "$env:LOCALAPPDATA\Forja\ultimo-dia.txt" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskPath '\Forja\' -TaskName 'Abrir'

# Veja o que aconteceu
Get-Content "$env:LOCALAPPDATA\Forja\forja.log" -Tail 20
Get-ScheduledTaskInfo -TaskPath '\Forja\' -TaskName 'Abrir'   # LastTaskResult 0 = ok
```

A tarefa Lembrete fora do horário só registra "Fora da janela do lembrete" no log; para testar a decisão dela, use `lembrete.ps1 -Forcar` como acima.

## 4. Desinstalar

```powershell
powershell -ExecutionPolicy Bypass -File .\desinstalar.ps1
```

Pede confirmação (S/N, ou `-Sim` para pular) e remove as tarefas `\Forja\Abrir` e `\Forja\Lembrete`, a pasta `\Forja\` do Agendador e a pasta `%LOCALAPPDATA%\Forja` (scripts copiados, configuração, marcadores e log). Os arquivos desta pasta do repositório ficam.

## Limitações conhecidas

- **Janela em segundo plano:** como a tarefa roda escondida, o Windows pode não deixar o Chrome tomar o foco; nesse caso o ícone pisca na barra de tarefas em vez de a janela vir para a frente.
- **Tela bloqueada às 21h:** o lembrete abre o Forja mesmo assim; ele aparece quando você desbloquear.
- **PC suspenso ou desligado:** as tarefas não acordam o PC. O Abrir roda no logon, no desbloqueio ou na próxima repetição de 30 min; o Lembrete atrasado só vale até 03:59.
- **Windows Script Host:** o lançador usa o `wscript.exe`. Se ele não existir ou estiver desativado no PC na hora da instalação, o instalador registra as tarefas chamando o `powershell.exe` direto (com `-WindowStyle Hidden`), e uma janela de console pode piscar por um instante. A Microsoft anunciou a remoção gradual do VBScript em versões futuras do Windows; no Windows 10 ele continua disponível.
- **Fuso horário:** o dia do jogo usa o relógio do Windows. O PC precisa estar no horário de Brasília para bater com o app.
