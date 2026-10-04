# Contract: HTTP

Rotas fora das Server Actions. Todas respondem JSON, exceto onde indicado.

## `GET /api/status`

Usada pelo lembrete das 21h no Windows. Só leitura.

- **Autenticação:** cabeçalho `Authorization: Bearer <FORJA_STATUS_TOKEN>`. Sem token ou com token inválido, responde `401 { "error": "unauthorized" }`. Não usa o cookie de sessão.
- **200:**

```json
{
  "today": "2026-10-17",
  "phase": "active",
  "studyMinutes": 35,
  "studyDone": false,
  "weekAtRisk": true,
  "reasons": ["Faltam 25 min de estudo hoje.", "Faltam 2 treinos e restam 2 dias na semana."]
}
```

## `GET /api/export`

- **Autenticação:** cookie de sessão. Sem sessão, responde `401`.
- **200:** `Content-Disposition: attachment; filename="forja-s1-AAAA-MM-DD.json"`

```json
{ "exportedAt": "ISO", "seasonId": "s1", "records": [ /* ForjaRecord[] */ ], "timer": null }
```

## Páginas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/entrar` | Pública | Formulário de senha |
| `/` | Sessão | Painel |
| `/cursos` | Sessão | Mapa dos cursos e previsão |

## Middleware

Toda rota, exceto `/entrar`, `/api/status`, `/_next/*`, `/favicon.ico` e arquivos estáticos, exige o cookie `forja_session` válido.

- **Páginas:** sem sessão, redireciona para `/entrar`.
- **APIs:** sem sessão, responde `401`.
