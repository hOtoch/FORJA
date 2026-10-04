# Contract: Server Actions

Todas as gravações passam por Server Actions em `src/app/actions.ts`. Cada uma:

- exige sessão válida (senão lança `Error('Não autorizado')`);
- valida a entrada conforme `data-model.md`;
- grava pelo módulo de armazenamento (`src/lib/store.ts`);
- chama `revalidatePath('/')`;
- devolve `ActionResult`.

```ts
type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };
// error é uma frase em português pronta para a interface, ex.: "Cardio precisa de pelo menos 20 minutos."
```

| Ação | Entrada | Resultado | Erros de negócio |
|---|---|---|---|
| `login(formData)` | `password` | Grava o cookie e redireciona para `/` | "Senha incorreta. Confira e tente de novo." |
| `logout()` | — | Apaga o cookie e redireciona para `/entrar` | — |
| `startTimer(courseSlug, pomodoro)` | slug do curso, booleano | `ok` (o cliente abre a aula em nova aba antes de chamar) | "Já existe uma sessão em andamento." |
| `pauseTimer()` / `resumeTimer()` | — | `ok` | "Nenhuma sessão em andamento." |
| `confirmPresence(countGap)` | booleano | `ok` | "Nenhuma sessão em andamento." |
| `stopTimer(lessonIds, countGap)` | `number[]`, booleano | `{ minutes }` | "Nenhuma sessão em andamento." |
| `discardTimer()` | — | `ok` | — |
| `addStudy({ day, courseSlug, minutes, lessonIds })` | registro manual | `ok` | "Só dá para registrar hoje ou ontem." / "Informe os minutos." |
| `addGym({ day })` | hoje ou ontem | `ok` | "Só dá para registrar hoje ou ontem." |
| `addCardio({ day, modality, minutes })` | — | `{ isSuper }` | "Cardio precisa de pelo menos 20 minutos." |
| `useBreak()` | — | `ok` | "Não restam folgas de reserva." / "Hoje já é folga." |
| `confirmDeposit(weekIndex)` | 1..12 | `ok` | "Essa semana ainda não fechou." / "Esse depósito já foi confirmado." |
| `addClient({ contractCents, note })` | — | `{ bonusCents }` | "Informe o valor do contrato." |
| `deleteRecord(id)` | id | `ok` | "Só dá para desfazer registros de hoje ou ontem." |

As regras que dependem do estado (folga disponível, semana fechada) usam o mesmo `computeGameState` que alimenta a tela.
