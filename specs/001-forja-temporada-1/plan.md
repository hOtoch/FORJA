# Implementation Plan: Forja, Temporada 1

**Branch**: `001-forja-temporada-1` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-forja-temporada-1/spec.md`

## Summary

App web pessoal de hábitos com ambientação de forja medieval de RPG. Um único Next.js na Vercel, com:

- páginas que leem os dados no servidor e Server Actions para as gravações;
- Postgres no Neon com duas tabelas genéricas, e um arquivo JSON local em desenvolvimento;
- um motor de regras em funções puras que calcula todo o estado do jogo a partir dos registros.

Fora do app, dois scripts PowerShell abrem o Forja todo dia e às 21h quando há risco. Detalhes das decisões em [research.md](research.md).

## Technical Context

| Item | Valor |
|---|---|
| **Language/Version** | TypeScript (versão fixada pelo `create-next-app`), Node 20+ |
| **Primary Dependencies** | Next.js 16 (App Router), React 19, Tailwind CSS 4, `@neondatabase/serverless`. Nada além disso em produção |
| **Storage** | Postgres (Neon) com as tabelas `records` e `kv`; sem `DATABASE_URL`, arquivo `.data/forja.json` |
| **Testing** | Vitest para o motor de regras; verificação visual manual |
| **Target Platform** | Vercel (plano gratuito); Chrome no Windows (1920 × 919, tema claro); celular secundário |
| **Project Type** | Aplicação web única (frontend e backend no mesmo Next.js) |
| **Performance Goals** | Painel pronto em menos de 1 s depois que o app aparece; gravações confirmadas em menos de 500 ms percebidos |
| **Constraints** | Gratuito; um usuário; regras 100% configuráveis; virada do dia às 04:00 em America/Sao_Paulo; painel sem rolagem em 1920 × 919 |
| **Scale/Scope** | 1 usuário, cerca de 1.000 registros por temporada, 3 telas, 241 aulas no catálogo |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constitution do projeto (`.specify/memory/constitution.md`) ainda é o modelo sem ratificar. Os gates abaixo vêm das diretrizes explícitas do usuário e do DESIGN.md:

| Gate | Situação |
|---|---|
| **Simplicidade**: uma aplicação, sem ORM, sem biblioteca de autenticação, sem biblioteca de datas | ✅ Passa |
| **Publicação na Vercel** sem custo | ✅ Passa (Vercel Hobby e Neon gratuito) |
| **Regras configuráveis** (Temporada 2 sem reescrever) | ✅ Passa (tudo em `season1.ts` e `courses.json`) |
| **Regras testadas**: o motor é puro e os cenários de aceite viram testes | ✅ Passa |
| **Visual do DESIGN.md**, com a ambientação medieval pedida | ✅ Passa (o DESIGN.md é atualizado para a temática medieval nesta fase) |

**Re-check pós-design:** passa. O modelo de dados tem 2 tabelas e o app 3 telas. Não há violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-forja-temporada-1/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── server-actions.md
│   ├── http-api.md
│   └── windows-scripts.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                # fontes, tema, metadados
│   ├── globals.css               # tokens do DESIGN.md (claro/escuro) e base
│   ├── page.tsx                  # painel (lê store + motor no servidor)
│   ├── entrar/page.tsx           # senha
│   ├── cursos/page.tsx           # mapa dos cursos
│   ├── actions.ts                # Server Actions (contracts/server-actions.md)
│   └── api/
│       ├── status/route.ts
│       └── export/route.ts
├── proxy.ts                      # sessão por cookie assinado (Next 16: antigo middleware)
├── components/                   # um arquivo por região do painel
│   ├── SeasonBar.tsx             # a barra de 80 dias
│   ├── TodayPanel.tsx            # "Hoje" e timer (client)
│   ├── BossPanel.tsx
│   ├── CharacterPanel.tsx
│   ├── GradeMark.tsx             # a marca do ferreiro
│   ├── FundPanel.tsx
│   ├── CoursesPanel.tsx
│   ├── ChestsPanel.tsx
│   ├── DayDrawer.tsx
│   ├── dialogs/                  # cardio, encerrar sessão, registro manual, cliente
│   └── icons.tsx                 # escudo heráldico, baú, bigorna, chama, selo
├── config/
│   ├── season1.ts                # SeasonConfig
│   └── courses.json              # catálogo (cópia de docs/courses.json)
└── lib/
    ├── types.ts                  # tipos de data-model.md
    ├── time.ts                   # gameDay, semanas, now() com FORJA_NOW em dev
    ├── auth.ts                   # assinar e verificar o token (Web Crypto)
    ├── store.ts                  # interface + adaptadores Neon e arquivo JSON
    ├── timer.ts                  # transições do TimerState (puras)
    └── game/
        ├── index.ts              # computeGameState
        ├── days.ts, weeks.ts, streak.ts, xp.ts, grade.ts, fund.ts,
        ├── chests.ts, courses.ts, status.ts
        └── *.test.ts             # Vitest
scripts/
├── db-setup.mjs                  # cria as tabelas no Neon
└── windows/                      # contracts/windows-scripts.md
```

**Structure Decision**: um único projeto Next.js na raiz do repositório. O motor de regras (`src/lib/game`) e as transições do timer (`src/lib/timer.ts`) não dependem de React nem do banco, para serem testados isolados. O armazenamento fica atrás de `src/lib/store.ts`, para alternar entre Neon e arquivo sem tocar no resto.

### Paralelização da implementação

Depois da fundação (scaffold, tipos, configuração, tokens de design), quatro frentes independentes rodam em paralelo, cada uma num worktree:

| Frente | Arquivos | Depende de |
|---|---|---|
| A. Motor de regras e testes | `src/lib/game/*`, `src/lib/timer.ts` | `types.ts`, `season1.ts`, `courses.json` |
| B. Dados, acesso e APIs | `store.ts`, `auth.ts`, `proxy.ts`, `actions.ts`, `api/*`, `entrar/`, `scripts/db-setup.mjs` | `types.ts`, contratos |
| C. Interface medieval | `components/*`, `globals.css`, `cursos/page.tsx`, com um GameState de exemplo | `types.ts`, DESIGN.md |
| D. Scripts do Windows | `scripts/windows/*` | `contracts/windows-scripts.md` |

A integração (ligar a interface ao motor e às ações, rodar os testes, o build e a verificação visual) é feita depois, no branch principal.

## Complexity Tracking

Nenhuma violação dos gates.
