# Data Model: Forja, Temporada 1

Tudo o que é guardado são **registros de fatos** (o que o usuário fez) e o **timer em andamento**. Todo o resto (sequência, escudos, chefes, XP, nota, Fundo, baús, previsões) é **calculado** pelo motor de regras a partir dos registros e da configuração da temporada.

As definições de tipo abaixo são o contrato entre as partes do app. No código, elas ficam em `src/lib/types.ts`.

## Armazenamento

Duas tabelas no Postgres. Em desenvolvimento, o mesmo formato num arquivo JSON local (`.data/forja.json` com `{ records: [], kv: {} }`).

```sql
create table if not exists records (
  id          text primary key,              -- uuid
  season_id   text not null,                 -- 's1'
  kind        text not null,                 -- ver RecordKind
  day         date not null,                 -- dia do jogo (YYYY-MM-DD)
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists records_season_day on records (season_id, day);

create table if not exists kv (
  key    text primary key,                   -- 'timer'
  value  jsonb not null
);
```

## Dia do jogo

`gameDay(instant) = data em America/Sao_Paulo de (instant − 4 horas)`, no formato `YYYY-MM-DD`. Toda regra usa o dia do jogo, nunca a data do calendário.

## Registros

```ts
type RecordKind = 'study' | 'gym' | 'cardio' | 'break' | 'deposit' | 'client';

interface BaseRecord<K extends RecordKind, D> {
  id: string;           // uuid
  seasonId: string;     // 's1'
  kind: K;
  day: string;          // dia do jogo, YYYY-MM-DD
  createdAt: string;    // ISO
  data: D;
}

type StudyRecord = BaseRecord<'study', {
  courseSlug: string;
  minutes: number;              // inteiro >= 1, creditado
  source: 'timer' | 'manual';
  startedAt?: string;           // ISO (timer)
  endedAt?: string;             // ISO (timer)
  lessonIds: number[];          // aulas concluídas nesta sessão (pode ser vazio)
}>;

type GymRecord = BaseRecord<'gym', Record<string, never>>;

type CardioModality = 'esteira' | 'bicicleta' | 'caminhada' | 'eliptico' | 'pelada' | 'outro';
type CardioRecord = BaseRecord<'cardio', {
  modality: CardioModality;
  minutes: number;              // >= 20, exceto pelada (qualquer)
  isSuper: boolean;             // calculado ao salvar (ver regra abaixo)
}>;

type BreakRecord = BaseRecord<'break', { reason?: string }>;      // só folgas de reserva

type DepositRecord = BaseRecord<'deposit', {                       // day = dia da confirmação
  weekIndex: number;            // 1..12
  amountCents: number;
}>;

type ClientRecord = BaseRecord<'client', {
  contractCents: number;
  bonusCents: number;           // round(contractCents * 5 / 100)
  note?: string;
}>;

type ForjaRecord = StudyRecord | GymRecord | CardioRecord | BreakRecord | DepositRecord | ClientRecord;
```

### Validações ao gravar

| Regra | Onde se aplica |
|---|---|
| `day` só pode ser hoje ou ontem (dia do jogo) | study, gym, cardio, client |
| `day` só pode ser hoje, e restar folga de reserva | break |
| Não pode já ser folga planejada nem de reserva | break |
| `minutes` ≥ 20, exceto `pelada` | cardio |
| `isSuper = modality === 'pelada' \|\| (['bicicleta','caminhada','esteira'].includes(modality) && minutes >= 60)` | cardio |
| `lessonIds` pertencem ao `courseSlug` | study |
| Uma semana só tem um depósito confirmado | deposit |
| Desfazer (`delete`) só para registros de hoje e ontem | study, gym, cardio, client |

## Timer em andamento (`kv['timer']`)

```ts
interface TimerState {
  courseSlug: string;
  startedAt: string;          // ISO; define o dia do jogo da sessão
  accumulatedMs: number;      // tempo já creditado de trechos fechados
  runningSince: string | null;// ISO; null = pausado
  lastConfirmAt: string;      // ISO; última confirmação de presença (ou início/retomada)
  pomodoro: boolean;
}
```

**Tempo creditado agora:**
`accumulatedMs + (runningSince ? max(0, min(now, lastConfirmAt + 50min) − runningSince) : 0)`, limitado a 3h.

**Aguardando presença:** `runningSince != null && now > lastConfirmAt + 50min`.

| Ação | Efeito |
|---|---|
| `start(courseSlug)` | Cria o timer com `startedAt = runningSince = lastConfirmAt = now`. Falha se já existir um |
| `confirmPresence(countGap)` | Se estava aguardando: `countGap` credita tudo desde `runningSince`; senão, credita só até `lastConfirmAt + 50min`. Depois: `runningSince = now`, `lastConfirmAt = now`. Se não estava aguardando, só renova `lastConfirmAt` |
| `pause()` | Credita o trecho (com o limite de presença) e põe `runningSince = null` |
| `resume()` | `runningSince = now`, `lastConfirmAt = now` |
| `stop(lessonIds, countGap?)` | Calcula os minutos (`floor`, limite de 180), grava um StudyRecord com `day = gameDay(startedAt)`, `source = 'timer'` e apaga o timer. Se os minutos forem 0, só apaga |
| `discard()` | Apaga o timer sem gravar |

## Configuração da temporada (`src/config/season1.ts`)

```ts
interface SeasonConfig {
  id: 's1';
  name: 'Operação Réveillon';
  start: '2026-10-05';
  end: '2026-12-23';
  timeZone: 'America/Sao_Paulo';
  dayStartHour: 4;
  plannedBreaks: ['2026-10-10','2026-10-11','2026-10-12','2026-10-13'];
  reserveBreaks: 2;
  goals: {
    studyMinutes: 60;
    gymPerWeek: 4;
    cardioPerWeek: 5;
    finalWeek: { gym: 2; cardio: 2; requireSuper: false };
    cardioMaxWithoutSuper: 4;
  };
  cardio: {
    minMinutes: 20;
    superMinutes: 60;
    superModalities: ['bicicleta','caminhada','esteira'];
    alwaysSuper: ['pelada'];
  };
  xp: {
    perStudyMinute: 1;
    studyDailyCap: 120;
    gym: 60;
    cardio: 20;
    superCardio: 60;
    module: 50;
    course: 200;
    boss: 100;
  };
  levelXp: (n: number) => number;          // 50 * n * (n + 1)
  titles: [
    [1,'Aprendiz da forja'], [3,'Malhador'], [6,'Ferreiro'],
    [9,'Armeiro'], [12,'Mestre ferreiro'], [15,'Lenda da forja'],
  ];
  shields: { initial: 1; max: 2 };
  grade: { S: 95; A: 85; B: 70 };
  fund: {
    studyDayCents: 500;
    gymCents: 1000;
    cardioCents: 500;
    bossCents: 3000;
    finalBossCents: 4500;
    clientBonusPct: 5;
    perfectCents: 150000;
  };
  chests: ChestConfig[];                    // 5 itens, ver spec FR-036
  courses: {
    queue: ['desenvolvimento-assistido-por-ia','python-full-ai-profissional','python-full-ai-2025'];
    initialCompleted: {                     // lessonIds concluídos antes da temporada (não rendem XP)
      'desenvolvimento-assistido-por-ia': [1037,975,976,977,978,979,986,987,984,985,990];
    };
    missingDurationMin: 8;
    defaultStudyPerVideo: 1.5;
    paceWindowDays: 14;
    minSessionsForPace: 3;
    lessonUrl: (slug: string, id: number) => string;
  };
  timer: { presenceMinutes: 50; capMinutes: 180; pomodoroFocus: 25; pomodoroBreak: 5 };
}
```

O catálogo de cursos fica em `src/config/courses.json` (cópia de `docs/courses.json`), no formato `{ courses: [{ slug, name, modules: [{ name, min, lessons: [[id, title, minutes]] }] }] }`.

## Estado do jogo (saída do motor)

`computeGameState(records: ForjaRecord[], timer: TimerState | null, config: SeasonConfig, now: Date): GameState`

```ts
type Heat = 0 | 1 | 2 | 3 | 4;             // frio, cereja, brasa, palha, incandescente

interface DayInfo {
  date: string;             // YYYY-MM-DD
  index: number;            // 1..80
  weekIndex: number;        // 1..12
  weekday: number;          // 1=seg .. 7=dom
  isFuture: boolean;
  isToday: boolean;
  breakKind: 'planned' | 'reserve' | null;
  studyMinutes: number;
  studyMet: boolean;        // >= 60
  shieldUsed: boolean;
  gym: number;
  cardio: number;
  superCardio: number;
  heat: Heat | null;        // null = futuro ou hoje sem nada
  xp: number;
  fundCents: number;
}

interface WeekInfo {
  index: number;            // 1..12 (12 = semana final)
  start: string; end: string;
  isFinal: boolean;
  isClosed: boolean;        // hoje > end
  isCurrent: boolean;
  studyDaysRequired: number;// dias não-folga da semana
  studyDaysMet: number;     // sem contar dias salvos por escudo
  shieldDays: number;
  gym: number; gymTarget: number;
  cardio: number; cardioTarget: number;
  hasSuper: boolean; superRequired: boolean;
  bossDefeated: boolean;    // só true quando todas as condições estão cumpridas
  fundCents: number;        // quanto a semana rende (inclui chefe e bônus de clientes)
  depositedCents: number | null;
}

interface GameState {
  now: string;              // ISO
  today: string;            // dia do jogo
  phase: 'before' | 'active' | 'after';
  dayIndex: number | null;  // 1..80
  days: DayInfo[];          // 80
  weeks: WeekInfo[];        // 12
  currentWeek: WeekInfo | null;
  todayInfo: DayInfo | null;
  yesterdayMissedUnprotected: boolean; // ontem sem estudo coberto por escudo: hoje não pode falhar
  streak: { current: number; best: number; shields: number };
  xp: {
    total: number;
    byAttr: { inteligencia: number; forca: number; vigor: number };
    level: number;
    title: string;
    levelStartXp: number;
    nextLevelXp: number;
  };
  grade: {
    studyPct: number; gymPct: number; cardioPct: number; // 0..100
    totalPct: number;
    letter: 'S' | 'A' | 'B' | 'C' | null;  // null antes do primeiro dia fechado
    isFinal: boolean;
  };
  fund: {
    earnedCents: number; depositedCents: number; perfectCents: number;
    clientBonusCents: number;
    pending: { weekIndex: number; amountCents: number }[];
  };
  chests: {
    id: number; condition: string; prize: string;
    state: 'locked' | 'opened' | 'failed';
    openedOn: string | null;
    note?: string;
  }[];
  courses: {
    slug: string; name: string;
    totalLessons: number; doneLessons: number;
    totalMinutes: number; doneMinutes: number;
    modules: {
      name: string; total: number; done: number; completed: boolean;
      lessons: { id: number; title: string; minutes: number; done: boolean }[];
    }[];
    completed: boolean;
    projectedEnd: string | null;   // YYYY-MM-DD
  }[];
  currentCourseSlug: string | null;
  nextLesson: { courseSlug: string; id: number; title: string; minutes: number; url: string } | null;
  queueProjectedEnd: string | null;
  queueEndsBeforeSeason: boolean;
  medals: string[];                // slugs de cursos concluídos na temporada
  breaks: { reserveUsed: number; reserveLeft: number; canUseToday: boolean };
  timer: (TimerState & {
    creditedMs: number;
    awaitingPresence: boolean;
    pendingMs: number;
    capped: boolean;
  }) | null;
  status: {
    studyDone: boolean;
    weekAtRisk: boolean;
    reasons: string[];
  };
}
```

## Regras de cálculo (resumo para o motor)

- **Calor do dia:**
  - `0` = passou sem estudo;
  - `1` = estudou menos de 60;
  - `2` = cumpriu;
  - `3` = cumpriu e tem 1 ponto de calor;
  - `4` = cumpriu e tem 2 ou mais pontos.
  - Pontos de calor: estudo ≥ 120, pelo menos um treino, pelo menos um cardio.
  - Hoje sem nada é `null`.
- **Sequência e escudos:** percorrer os dias fechados em ordem.
  - Folga não mexe na sequência.
  - Meta cumprida soma 1.
  - Falha logo depois de outra falha (ignorando folgas) zera a sequência sem usar escudo.
  - Senão, se houver escudo, ele é usado e a sequência se mantém; sem escudo, zera.
  - Ao fechar uma semana com chefe derrotado (exceto a final): `escudos = min(2, escudos + 1)`.
  - Hoje só entra na sequência se já tiver cumprido.
- **Chefe:** `studyDaysMet == studyDaysRequired && shieldDays == 0 && gym >= gymTarget && cardioEfetivo >= cardioTarget && (hasSuper || !superRequired)`.
  - `cardioEfetivo = (hasSuper || !superRequired) ? cardio : min(cardio, 4)`.
- **Nota:**
  - estudo = dias cumpridos ÷ (80 − folgas planejadas − folgas de reserva usadas);
  - academia = Σ min(treinos, meta) ÷ 46;
  - cardio = Σ min(cardioEfetivo, meta) ÷ 57.
  - **Prevista:** mesma conta, mas só sobre os dias e semanas já fechados (o ritmo até agora). A nota é final quando `phase = 'after'`.
- **Fundo:**
  - R$ 5 por dia cumprido (sem folga nem escudo);
  - R$ 10 × min(treinos, meta) por semana;
  - R$ 5 × min(cardioEfetivo, meta) por semana;
  - chefe R$ 30, chefe final R$ 45;
  - mais os bônus de clientes.
  - **Pendente:** semanas fechadas sem depósito, com o valor da semana.
- **XP:**
  - estudo: min(minutos do dia, 120);
  - treino 60; cardio 20; supercardio 60;
  - módulo 50 e curso 200 (só os concluídos durante a temporada);
  - chefe 100, dividido 34 / 33 / 33.
  - **Nível:** maior N com `50·N·(N+1) ≤ total`; o mínimo é 0, que também é "Aprendiz da forja".
- **Baús:**
  1. Primeiro chefe derrotado.
  2. Sequência de 21.
  3. Em 13/11 fechado, nota prevista ≥ A; senão, `failed`.
  4. Soma de estudo ≥ 3.000 min.
  5. Em 23/12 fechado: S ou A abre; B ou C fica `failed`, com a nota "Só o Fundo".
- **Cursos:**
  - **Aulas concluídas** = `initialCompleted` ∪ `lessonIds` dos StudyRecords. A próxima aula é a primeira não concluída na ordem do catálogo, no primeiro curso da fila que tiver aula pendente.
  - **Ritmo** = minutos de vídeo das aulas concluídas nos últimos min(14, dias decorridos) dias ÷ esse número de dias. Com menos de 3 sessões, o ritmo é 60 ÷ 1,5 = 40 minutos de vídeo por dia.
  - **Previsão:** os cursos terminam em sequência (o restante de cada um ÷ ritmo, a partir de hoje).
  - Aula de 0 min conta como 8.
- **Status:**
  - `studyDone` = hoje cumprido ou hoje é folga.
  - `weekAtRisk` = treinos que faltam ≥ dias restantes da semana (contando hoje), ou supercardio exigido, não feito e hoje sábado ou domingo.
  - `reasons` explicam em português.
