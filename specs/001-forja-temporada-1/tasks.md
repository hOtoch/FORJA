# Tasks: Forja, Temporada 1

**Input**: Design documents from `specs/001-forja-temporada-1/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: o motor de regras tem testes (Vitest), porque o critério SC-005 do spec exige que todas as regras de cálculo deem o resultado esperado nos cenários de aceite. A interface é verificada visualmente.

**Organization**: tarefas agrupadas por user story. Os rótulos A, B, C e D entre parênteses indicam a frente de trabalho paralela do plano (A motor, B dados e APIs, C interface, D Windows).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: a user story a que a tarefa pertence (US1 a US7)

## Path Conventions

Projeto Next.js único na raiz: `src/app`, `src/components`, `src/lib`, `src/config`, `scripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Criar o app Next.js na raiz com `create-next-app` (TypeScript, Tailwind, ESLint, App Router, pasta `src/`, alias `@/*`), preservando `docs/`, `specs/`, `.specify/`, `.claude/`, `DESIGN.md` e `.gitignore`
- [ ] T002 Adicionar `@neondatabase/serverless` às dependências e `vitest` às de desenvolvimento, com os scripts `"test": "vitest run"` e `"db:setup": "node scripts/db-setup.mjs"` em package.json
- [ ] T003 [P] Criar .env.example com `FORJA_PASSWORD`, `FORJA_SECRET`, `FORJA_STATUS_TOKEN`, `DATABASE_URL` (opcional; vazio = arquivo local) e `FORJA_NOW` (opcional, só em desenvolvimento), e adicionar `.data/` ao .gitignore
- [ ] T004 [P] Copiar docs/courses.json para src/config/courses.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [ ] T005 Escrever todos os tipos de data-model.md (`ForjaRecord` e variantes, `TimerState`, `SeasonConfig`, `DayInfo`, `WeekInfo`, `GameState`, `Heat`, `ActionResult`) em src/lib/types.ts
- [ ] T006 Escrever a configuração da Temporada 1 conforme data-model.md em src/config/season1.ts, incluindo:
  - `plannedBreaks` "2026-10-10" a "2026-10-13";
  - `initialCompleted` do primeiro curso: `[1037,975,976,977,978,979,986,987,984,985,990]`;
  - `lessonUrl` = `https://plataforma.pythonando.com.br/membros/curso/${slug}?atual_aula_curso=${id}`;
  - os 5 baús, os títulos e `levelXp(n) = 50*n*(n+1)`.
- [ ] T007 Implementar em src/lib/time.ts:
  - `gameDay(instant)`: data em America/Sao_Paulo de instante − 4h, via `Intl.DateTimeFormat`;
  - `addDays`, `weekdayOf` (1=seg … 7=dom), `daysBetween`;
  - `seasonDays(config)`: os 80 dias;
  - `seasonWeeks(config)`: as 12 semanas, a 12ª de 21 a 23/12;
  - `now()`: usa `FORJA_NOW` se definido e `NODE_ENV !== 'production'`.
- [ ] T008 [P] Testar src/lib/time.ts em src/lib/time.test.ts:
  - 2026-10-06T03:59-03:00 é o dia 2026-10-05;
  - 80 dias e 12 semanas;
  - a semana 1 é de 05/10 a 11/10.
- [ ] T009 (B) Implementar src/lib/store.ts com a interface `Store` (`listRecords(seasonId)`, `addRecord(r)`, `deleteRecord(id)`, `getTimer()`, `setTimer(t | null)`) e dois adaptadores:
  - Neon, com `@neondatabase/serverless`, tabelas `records` e `kv` de data-model.md, quando houver `DATABASE_URL`;
  - arquivo `.data/forja.json` com `{ records: [], kv: {} }`, quando não houver.
- [ ] T010 [P] (B) Criar scripts/db-setup.mjs, que roda o SQL de data-model.md (`create table if not exists records`, índice e `kv`) usando `DATABASE_URL`
- [ ] T011 [P] (B) Implementar `signSession()` e `verifySession(token)` em src/lib/auth.ts: HMAC-SHA256 via Web Crypto com `FORJA_SECRET`, payload com a expiração em 1 ano
- [ ] T012 (B) Implementar src/middleware.ts conforme contracts/http-api.md (rotas públicas `/entrar` e `/api/status`; páginas sem sessão vão para `/entrar`; APIs sem sessão recebem 401)
- [ ] T013 (B) Criar src/app/entrar/page.tsx e as actions `login` e `logout` em src/app/actions.ts. O cookie `forja_session` é httpOnly, secure em produção, sameSite lax e dura 1 ano; o erro é "Senha incorreta. Confira e tente de novo."
- [ ] T014 [P] (C) Implementar em src/app/globals.css os tokens de DESIGN.md seção 3 (claro, escuro por `prefers-color-scheme` e `data-theme`), a textura de pergaminho a 4% e os tokens de tipografia. Em src/app/layout.tsx: Grenze Gotisch, Grenze e Alegreya Sans via `next/font/google`, `lang="pt-BR"` e título "Forja"
- [ ] T015 [P] (C) Criar os ícones de traço 1,5 px em src/components/icons.tsx: brasão, baú trancado, baú aberto, bigorna, martelo, chama e selo de cera
- [ ] T016 (A) Criar src/lib/game/index.ts com `computeGameState(records, timer, config, now)` montando o `GameState` a partir dos módulos das tarefas seguintes, e um GameState de exemplo em src/lib/game/fixture.ts para a interface trabalhar em paralelo

**Checkpoint**: fundação pronta; as frentes A, B, C e D podem seguir em paralelo.

---

## Phase 3: User Story 1 - Estudar a partir do painel do dia (Priority: P1) 🎯 MVP

**Goal**: entrar, clicar em "Estudar agora", estudar com o timer e encerrar confirmando a aula.

**Independent Test**: quickstart.md, passos 1 e 2.

### Tests for User Story 1

- [ ] T017 [P] [US1] (A) Testar as transições do timer em src/lib/timer.test.ts:
  - presença aos 50 min, com e sem `countGap`;
  - pausa e retomada;
  - teto de 180 min;
  - o dia da sessão é o dia de `startedAt`;
  - os minutos usam `floor`.
- [ ] T018 [P] [US1] (A) Testar os dias em src/lib/game/days.test.ts:
  - estudo somado por dia;
  - `studyMet` com 60 ou mais;
  - calor 0 a 4 pelos pontos (estudo ≥ 120, treino, cardio);
  - hoje sem nada é `null`.

### Implementation for User Story 1

- [ ] T019 [P] [US1] (A) Implementar as funções puras de src/lib/timer.ts conforme data-model.md "Timer em andamento": `creditedMs`, `awaitingPresence`, `start`, `pause`, `resume`, `confirmPresence(countGap)`, `stop(lessonIds, countGap)` → `StudyRecord | null`
- [ ] T020 [US1] (A) Implementar `buildDays()` em src/lib/game/days.ts: `DayInfo` dos 80 dias com estudo, treino, cardio, folga, calor, `isToday` e `isFuture`
- [ ] T021 [US1] (A) Implementar em src/lib/game/courses.ts:
  - aulas concluídas (`initialCompleted` ∪ `lessonIds`);
  - progresso por módulo e curso;
  - `currentCourseSlug` e `nextLesson` com a URL;
  - aula de 0 min conta como 8 nos totais de minutos.
- [ ] T022 [US1] (B) Implementar em src/app/actions.ts as actions `startTimer`, `pauseTimer`, `resumeTimer`, `confirmPresence`, `stopTimer`, `discardTimer`, `addStudy` e `deleteRecord`, conforme contracts/server-actions.md. Regras:
  - "Só dá para registrar hoje ou ontem";
  - `lessonIds` pertencem ao `courseSlug`.
- [ ] T023 [P] [US1] (C) Criar src/components/SeasonBar.tsx conforme DESIGN.md seção 6 "Barra da temporada":
  - 80 segmentos com vão de 8 px a cada segunda;
  - folga listrada, faixa de escudo e contorno de hoje;
  - legendas de meses, "metade", "fim" e "Réveillon em 28/12";
  - navegação por setas e `aria-label` por dia;
  - `onSelectDay`.
- [ ] T024 [P] [US1] (C) Criar src/components/TodayPanel.tsx (client), conforme DESIGN.md seção 6 "Hoje" e "Timer":
  - frase de status, trilho de 12 marcas e "Estudar agora", que abre `nextLesson.url` com `window.open` e chama `startTimer`;
  - timer com algarismos tabulares;
  - aos 50 min, a faixa e a notificação "Ainda estudando?" pela Notification API, além de "Contar N min" e "Não contar";
  - Pomodoro opcional de 25/5;
  - "Pausar" e "Encerrar sessão".
- [ ] T025 [P] [US1] (C) Criar src/components/dialogs/StopSessionDialog.tsx: "Até qual aula você chegou?", com as próximas aulas e a seguinte já marcada; o botão "Salvar sessão" leva à confirmação "Sessão salva: N min"
- [ ] T026 [P] [US1] (C) Criar src/components/dialogs/ManualStudyDialog.tsx: dia (hoje ou ontem), curso, minutos e última aula
- [ ] T027 [US1] Montar src/app/page.tsx: ler a store, rodar `computeGameState` no servidor e compor o layout de DESIGN.md seção 5 (cabeçalho, barra, Hoje e chefe, faixa de baixo) sem rolagem em 1920 × 919

**Checkpoint**: MVP utilizável (entrar, estudar, ver a barra).

---

## Phase 4: User Story 2 - Treinos, cardios e chefe da semana (Priority: P1)

**Goal**: marcar treino e cardio e ver o chefe da semana.

**Independent Test**: quickstart.md, passo 3.

### Tests for User Story 2

- [ ] T028 [P] [US2] (A) Testar as semanas em src/lib/game/weeks.test.ts:
  - metas 4/5 e 2/2 na semana final;
  - semana cheia sem super conta no máximo 4 cardios;
  - chefe derrotado só com estudo em todos os dias não-folga, sem dia de escudo;
  - semana 1 com 10 e 11/10 de folga exige 5 dias de estudo;
  - supercardio pela regra de modalidade e minutos.

### Implementation for User Story 2

- [ ] T029 [US2] (A) Implementar `buildWeeks()` em src/lib/game/weeks.ts: `WeekInfo` das 12 semanas, `cardioEfetivo`, `bossDefeated`, `isClosed` e `isCurrent`
- [ ] T030 [US2] (B) Implementar as actions `addGym` e `addCardio` em src/app/actions.ts:
  - cardio exige `minutes ≥ 20, exceto pelada`;
  - `isSuper = modality === 'pelada' || (['bicicleta','caminhada','esteira'].includes(modality) && minutes >= 60)`;
  - mensagem de erro: "Cardio precisa de pelo menos 20 minutos."
- [ ] T031 [P] [US2] (C) Criar src/components/BossPanel.tsx: "Chefe da semana N", três linhas com marcadores quadrados (o supercardio é um losango) e a frase do que falta ou da vitória
- [ ] T032 [P] [US2] (C) Criar src/components/dialogs/CardioDialog.tsx: modalidade e minutos, o aviso "Isto conta como supercardio" antes de salvar e o erro de 20 min

**Checkpoint**: US1 e US2 funcionam juntas.

---

## Phase 5: User Story 3 - Personagem, XP, sequência, escudos e nota (Priority: P2)

**Goal**: o jogo responde aos registros.

**Independent Test**: os cenários de aceite da US3 passam nos testes, e o painel mostra nível, título, escudos e nota prevista.

### Tests for User Story 3

- [ ] T033 [P] [US3] (A) Testar a sequência em src/lib/game/streak.test.ts:
  - escudo usado numa falha isolada;
  - segunda falha seguida quebra mesmo com escudo;
  - folga congela;
  - +1 escudo por chefe, com máximo de 2;
  - começa com 1.
- [ ] T034 [P] [US3] (A) Testar o XP em src/lib/game/xp.test.ts:
  - 150 min dão 120 XP;
  - 300 XP é nível 2;
  - 1.200 XP é nível 4, "Malhador";
  - o chefe dá 34/33/33;
  - módulos concluídos antes da temporada não rendem XP.
- [ ] T035 [P] [US3] (A) Testar a nota em src/lib/game/grade.test.ts: faixas S, A, B e C; dias de escudo não contam; denominadores 76, 46 e 57; nota prevista sobre o que já fechou

### Implementation for User Story 3

- [ ] T036 [US3] (A) Implementar src/lib/game/streak.ts (`shieldUsed` por dia, `current`, `best`, `shields` e `yesterdayMissedUnprotected`)
- [ ] T037 [US3] (A) Implementar src/lib/game/xp.ts (por atributo, nível e título)
- [ ] T038 [US3] (A) Implementar src/lib/game/grade.ts (porcentagens, letra, prevista e final)
- [ ] T039 [P] [US3] (C) Criar src/components/CharacterPanel.tsx: nível, título, trilho de XP, três atributos monocromáticos e brasões de escudo
- [ ] T040 [P] [US3] (C) Criar src/components/GradeMark.tsx: a marca do ferreiro 88 × 88 com a letra em Grenze Gotisch, tracejada se prevista e sólida em baixo-relevo se final, mais as três porcentagens

---

## Phase 6: User Story 4 - Fundo Réveillon e baús (Priority: P2)

**Goal**: dinheiro e prêmios ligados ao jogo.

**Independent Test**: cenários da US4 nos testes; depósito e cliente pelo painel.

### Tests for User Story 4

- [ ] T041 [P] [US4] (A) Testar o Fundo em src/lib/game/fund.test.ts: a semana do exemplo do spec dá R$ 130; a temporada perfeita dá R$ 1.500; excedentes, folga e escudo não rendem; o pendente lista semanas fechadas sem depósito; o bônus de 5% do cliente
- [ ] T042 [P] [US4] (A) Testar os baús em src/lib/game/chests.test.ts: baú 1 pelo primeiro chefe, baú 2 por sequência de 21, baú 3 em 13/11 (aberto ou `failed`), baú 4 por 3.000 min, baú 5 em 23/12 pela nota S ou A

### Implementation for User Story 4

- [ ] T043 [US4] (A) Implementar src/lib/game/fund.ts e src/lib/game/chests.ts
- [ ] T044 [US4] (B) Implementar as actions `confirmDeposit(weekIndex)` ("Essa semana ainda não fechou." / "Esse depósito já foi confirmado.") e `addClient` (`bonusCents = round(contractCents*5/100)`) em src/app/actions.ts
- [ ] T045 [P] [US4] (C) Criar src/components/FundPanel.tsx (valor em ouro velho, medidor, depósito pendente com selo de cera ao confirmar) e src/components/dialogs/ClientDialog.tsx (valor do contrato e prévia do bônus)
- [ ] T046 [P] [US4] (C) Criar src/components/ChestsPanel.tsx: cinco linhas com o baú com cintas de ferro (trancado ou aberto), a condição, o prêmio e "Aberto em DD/MM"

---

## Phase 7: User Story 5 - Fila de cursos e previsão (Priority: P3)

**Goal**: saber onde está e quando termina.

**Independent Test**: cenários da US5 nos testes; página `/cursos`.

- [ ] T047 [P] [US5] (A) Testar as previsões em src/lib/game/courses.test.ts:
  - estado inicial (módulo 1 e aula 1 do módulo 2);
  - módulo concluído dá 50 XP e curso, 200 XP com medalha;
  - fator 1,5 antes de 3 sessões;
  - ritmo de 14 dias;
  - previsão em sequência e `queueEndsBeforeSeason`.
- [ ] T048 [US5] (A) Completar src/lib/game/courses.ts com ritmo, `projectedEnd` por curso, `queueProjectedEnd`, `queueEndsBeforeSeason` e `medals`
- [ ] T049 [P] [US5] (C) Criar src/components/CoursesPanel.tsx: a fila com o curso atual em destaque, trilho de progresso, módulo e próxima aula, "até DD/MM" e o link "Ver cursos"
- [ ] T050 [US5] (C) Criar src/app/cursos/page.tsx: mapa de cada curso com módulos numerados, aulas marcadas como concluídas, minutos restantes e previsão

---

## Phase 8: User Story 6 - Aparição diária e lembrete das 21h (Priority: P3)

**Goal**: o app aparece sozinho.

**Independent Test**: quickstart.md, passo 6 e a seção Windows.

- [ ] T051 [P] [US6] (A) Testar e implementar src/lib/game/status.ts:
  - `studyDone` (hoje cumprido ou folga);
  - `weekAtRisk` (treinos que faltam ≥ dias restantes contando hoje, ou super exigido não feito em sábado ou domingo);
  - `reasons` em português.

  Testes em src/lib/game/status.test.ts.
- [ ] T052 [US6] (B) Implementar src/app/api/status/route.ts conforme contracts/http-api.md (Bearer `FORJA_STATUS_TOKEN`, 401 sem token)
- [ ] T053 [P] [US6] (D) Criar scripts/windows/abrir.ps1 conforme contracts/windows-scripts.md: marcador do dia do jogo, ociosidade por `GetLastInputInfo` menor que 5 min, Chrome com `--profile-directory`
- [ ] T054 [P] [US6] (D) Criar scripts/windows/lembrete.ps1: `Invoke-RestMethod` no status e abrir se `studyDone` for falso, `weekAtRisk` for verdadeiro ou der erro de rede
- [ ] T055 [P] [US6] (D) Criar scripts/windows/instalar.ps1, scripts/windows/desinstalar.ps1 e scripts/windows/forja.config.example.json. As tarefas ficam em `\Forja\Abrir` (logon, desbloqueio e a cada 30 min) e `\Forja\Lembrete` (21:00), com confirmação S/N e sem elevação; `forja.config.json` vai para o .gitignore

---

## Phase 9: User Story 7 - Folgas, histórico e exportação (Priority: P3)

**Goal**: ajustes e consultas.

**Independent Test**: cenários da US7.

- [ ] T056 [US7] (A) Considerar folgas planejadas e de reserva em days, weeks, streak, grade e fund, e calcular `breaks` (`reserveUsed`, `reserveLeft`, `canUseToday`) em src/lib/game/index.ts. Com testes em src/lib/game/breaks.test.ts
- [ ] T057 [US7] (B) Implementar a action `useBreak()` ("Não restam folgas de reserva." / "Hoje já é folga.") em src/app/actions.ts
- [ ] T058 [P] [US7] (B) Implementar src/app/api/export/route.ts (download `forja-s1-AAAA-MM-DD.json`)
- [ ] T059 [P] [US7] (C) Criar src/components/DayDrawer.tsx: gaveta pela direita com sessões, aulas, treinos, cardios, calor e o porquê, XP e R$, e "Registrar para este dia" só para hoje e ontem
- [ ] T060 [US7] (C) Criar o menu do cabeçalho em src/components/Header.tsx: Registrar estudo, Usar folga, Cursos, Exportar dados e Sair

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T061 (A) Testar a temporada completa em src/lib/game/season.test.ts: cenário perfeito (R$ 1.500, nota S, 12 chefes, nível ≥ 15) e cenário com falhas
- [ ] T062 Integrar a interface ao motor e às actions em src/app/page.tsx, trocando o fixture pelos dados reais, com a confirmação de cada ação na linguagem de DESIGN.md seção 8
- [ ] T063 Rodar `npm test`, `npm run lint` e `npm run build` sem erros
- [ ] T064 Verificar o visual com o servidor local em 1920 × 919 (claro e escuro) e em 375 px, conferindo DESIGN.md seção 11, e corrigir o que não bater
- [ ] T065 [P] Escrever README.md com o que é o Forja, como rodar, como publicar na Vercel com o Neon e como instalar os scripts do Windows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (fase 1)**: sem dependências.
- **Foundational (fase 2)**: depende do setup e bloqueia todas as user stories.
- **User stories (fases 3 a 9)**: dependem da fundação. Dentro de cada frente, seguem a ordem de prioridade.
- **Polish (fase 10)**: depende de todas as stories.

### User Story Dependencies

- **US1** (P1): só depende da fundação.
- **US2** (P1): só depende da fundação. Usa o painel da US1 para aparecer.
- **US3** (P2): usa days (US1) e weeks (US2).
- **US4** (P2): usa weeks (US2), streak e grade (US3).
- **US5** (P3): estende courses (US1).
- **US6** (P3): usa days e weeks.
- **US7** (P3): cruza days, weeks, streak, grade e fund.

### Parallel Opportunities

As frentes do plan.md rodam em worktrees separados depois da fase 2:

| Frente | Tarefas |
|---|---|
| A. Motor | T017–T021, T028–T029, T033–T038, T041–T043, T047–T048, T051, T056, T061 |
| B. Dados e APIs | T022, T030, T044, T052, T057–T058 (T009–T013 entram na fundação) |
| C. Interface | T023–T026, T031–T032, T039–T040, T045–T046, T049–T050, T059–T060 (T014–T015 entram na fundação) |
| D. Windows | T053–T055 |

---

## Parallel Example: User Story 1

```text
Frente A: T017, T018, T019, T020, T021   (src/lib/timer.ts, src/lib/game/days.ts, courses.ts)
Frente B: T022                            (src/app/actions.ts)
Frente C: T023, T024, T025, T026          (src/components/*)
Depois:   T027                            (src/app/page.tsx, integração)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fases 1 e 2.
2. Fase 3: entrar, estudar e ver a barra.
3. Validar com quickstart.md, passos 1 e 2.

### Incremental Delivery

US1 → US2 (com isso as metas centrais estão cobertas) → US3 e US4 (o jogo) → US5, US6 e US7.

### Parallel Team Strategy

Quatro subagentes em worktrees (A, B, C e D) depois da fundação. A integração, os testes, o build e a verificação visual acontecem no branch principal.

---

## Notes

- **Commits:** um commit por frente, depois de os testes da frente passarem.
- **Fixture:** a interface trabalha contra `src/lib/game/fixture.ts` até a integração (T062).
- **Sem dependências extras:** nada fora do plan.md sem justificativa.
