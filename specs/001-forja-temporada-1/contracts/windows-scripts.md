# Contract: Scripts do Windows

Pasta `scripts/windows/`. Compatíveis com o Windows PowerShell 5.1, sem módulos externos.

| Arquivo | Função |
|---|---|
| `forja.config.example.json` | Modelo: `{ "url": "https://...", "statusToken": "...", "chromeProfile": "Profile 4" }`. O real, `forja.config.json`, fica fora do git |
| `abrir.ps1` | Se ainda não abriu hoje (dia do jogo, virada às 04:00, marcador em `%LOCALAPPDATA%\Forja\ultimo-dia.txt`) e o usuário mexeu no teclado ou mouse nos últimos 5 min, abre a URL no Chrome com o perfil configurado e grava o marcador |
| `lembrete.ps1` | Chama `GET {url}/api/status` com o token. Se `studyDone` for falso ou `weekAtRisk` for verdadeiro, abre a URL. Em erro de rede, abre a URL (melhor sobrar que faltar) |
| `instalar.ps1` | Mostra o que vai criar e pede confirmação (S/N). Registra duas tarefas na pasta `\Forja\` do Agendador, só para o usuário atual e sem elevação |
| `desinstalar.ps1` | Remove as duas tarefas e a pasta `%LOCALAPPDATA%\Forja` |

**Tarefas registradas:**

| Tarefa | Gatilhos | Ação |
|---|---|---|
| `\Forja\Abrir` | Logon do usuário; desbloqueio da sessão; repetição a cada 30 min | `abrir.ps1` |
| `\Forja\Lembrete` | Diariamente às 21:00 | `lembrete.ps1` |

As duas rodam com `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File <script>`.
