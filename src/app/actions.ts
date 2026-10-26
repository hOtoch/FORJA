'use server';

// Server Actions do Forja. Contrato: specs/001-forja-temporada-1/contracts/server-actions.md
// Regras de gravação: specs/001-forja-temporada-1/data-model.md ("Validações ao gravar").
// Cada action confere a sessão, valida a entrada, grava pelo store e revalida as páginas.

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { mergeCatalog } from '@/config/catalog';
import { season } from '@/config/season';
import { requireSession, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth';
import { clientBonusCents, isSuperCardio, validateCardio } from '@/lib/cardio';
import { computeGameState } from '@/lib/game';
import { CUSTOM_ID_BASE, maxCustomLessonId, parseLessons, slugFor } from '@/lib/course-import';
import { timeSources } from '@/lib/game/days';
import { getStore, type Store } from '@/lib/store';
import { SUMMARY_MAX, SUMMARY_MIN } from '@/lib/summary';
import { addDays, gameDay, now } from '@/lib/time';
import {
  timerConfirmPresence,
  timerPause,
  timerResume,
  timerStart,
  timerStop,
} from '@/lib/timer';
import type {
  ActionResult,
  CourseCatalog,
  BreakRecord,
  CardioModality,
  CardioRecord,
  CatalogCourse,
  ClientRecord,
  CountRecord,
  DepositRecord,
  GymRecord,
  RescueRecord,
  StudyRecord,
  Task,
  WorkRecord,
} from '@/lib/types';

// ---------- Mensagens ----------

const MSG = {
  password: 'Senha incorreta. Confira e tente de novo.',
  missingEnv: 'Configure FORJA_PASSWORD e FORJA_SECRET no ambiente.',
  saveFailed: 'Não foi possível salvar agora. Tente de novo.',
  dayRange: 'Só dá para registrar hoje ou ontem.',
  undoRange: 'Só dá para desfazer registros de hoje ou ontem.',
  undoKind: 'Folgas e depósitos não podem ser desfeitos.',
  recordNotFound: 'Registro não encontrado.',
  timerExists: 'Já existe uma sessão em andamento.',
  noTimer: 'Nenhuma sessão em andamento.',
  course: 'Escolha um curso da lista.',
  lessons: 'Essas aulas não são deste curso.',
  minutes: 'Informe os minutos.',
  minutesInt: 'Informe os minutos em números inteiros.',
  minutesMax: 'No máximo 600 minutos por registro.',
  modality: 'Escolha a modalidade do cardio.',
  alreadyBreak: 'Hoje já é folga.',
  noReserve: 'Não restam folgas de reserva.',
  breakOutside: 'Folgas de reserva só valem durante a temporada.',
  breakUnavailable: 'Não dá para usar folga hoje.',
  week: 'Semana inválida.',
  weekOpen: 'Essa semana ainda não fechou.',
  depositDone: 'Esse depósito já foi confirmado.',
  contract: 'Informe o valor do contrato.',
  noRescue: 'Não há evento de resgate hoje.',
  rescueAuto: 'Este desafio conta sozinho pelos registros do dia.',
  rescueDone: 'Este resgate já foi concluído.',
  block: 'Escolha um bloco da rotina.',
  studyBlock: 'Estudo de curso se registra pelo formulário de estudo.',
  counter: 'Escolha um contador.',
  amount: 'Informe uma quantidade inteira de 1 a 500.',
  taskTitle: 'Escreva a tarefa (até 200 caracteres).',
  taskNotFound: 'Tarefa não encontrada.',
  summary: 'Escreva um resumo do que você aprendeu, com pelo menos 20 caracteres.',
  summaryMax: 'O resumo pode ter no máximo 2.000 caracteres.',
  courseName: 'Dê um nome ao curso (até 120 caracteres).',
  courseUrl: 'O link do curso precisa começar com http:// ou https://.',
  courseLessons: 'Cole a lista de aulas: uma por linha (até 2.000 aulas).',
  courseNotFound: 'Curso não encontrado entre os adicionados por você.',
  courseInUse: 'Esse curso tem estudo registrado nesta temporada. Desfaça os registros antes de removê-lo.',
} as const;

const MAX_MINUTES = 600;
const MAX_NOTE = 200;
const UNDOABLE_KINDS = new Set(['study', 'work', 'count', 'gym', 'cardio', 'client', 'rescue']);
const MAX_COUNT = 500;
const MAX_TASK = 200;
const MODALITIES: CardioModality[] = ['esteira', 'bicicleta', 'caminhada', 'eliptico', 'pelada', 'outro'];

// ---------- Apoio ----------

interface Ctx {
  store: Store;
  instant: Date;
  /** Dia do jogo de agora. */
  today: string;
  yesterday: string;
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function revalidate(): void {
  revalidatePath('/');
  revalidatePath('/cursos');
}

/**
 * Exige sessão (lança `Error('Não autorizado')`), monta o contexto (agora, hoje, ontem, store)
 * e revalida as páginas. Falhas inesperadas (banco fora do ar, arquivo) viram uma mensagem
 * em português para a tela, e o detalhe vai para o log do servidor.
 */
async function withSession<T>(fn: (ctx: Ctx) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  await requireSession();
  let result: ActionResult<T>;
  try {
    const instant = now();
    const today = gameDay(instant, season.timeZone, season.dayStartHour);
    result = await fn({ store: getStore(), instant, today, yesterday: addDays(today, -1) });
  } catch (err) {
    console.error('[forja] falha na action:', err);
    return fail(MSG.saveFailed);
  }
  revalidate();
  return result;
}

function isTodayOrYesterday(day: unknown, ctx: Ctx): day is string {
  return typeof day === 'string' && (day === ctx.today || day === ctx.yesterday);
}

/** Catálogo completo: o do código e os cursos adicionados no app. */
async function loadCatalog(ctx: Ctx): Promise<CourseCatalog> {
  return mergeCatalog(await ctx.store.getCourses());
}

function findCourse(catalog: CourseCatalog, slug: unknown): CatalogCourse | null {
  if (typeof slug !== 'string') return null;
  return catalog.courses.find((c) => c.slug === slug) ?? null;
}

/** Aulas únicas, todas do curso; null se alguma não pertencer a ele. */
function cleanLessonIds(course: CatalogCourse, lessonIds: unknown): number[] | null {
  if (lessonIds === undefined || lessonIds === null) return [];
  if (!Array.isArray(lessonIds)) return null;
  const valid = new Set(course.modules.flatMap((m) => m.lessons.map(([id]) => id)));
  const out: number[] = [];
  for (const id of lessonIds) {
    if (typeof id !== 'number' || !Number.isInteger(id) || !valid.has(id)) return null;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Mensagem de erro para os minutos, ou null se valem (inteiro de `min` a 600). */
function minutesError(minutes: unknown, min: number): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < min) return MSG.minutes;
  if (!Number.isInteger(minutes)) return MSG.minutesInt;
  if (minutes > MAX_MINUTES) return MSG.minutesMax;
  return null;
}

/** Resumo limpo, ou a mensagem de erro. */
function cleanSummary(summary: unknown): { ok: true; text: string } | { ok: false; error: string } {
  const text = typeof summary === 'string' ? summary.trim() : '';
  if (text.length < SUMMARY_MIN) return { ok: false, error: MSG.summary };
  if (text.length > SUMMARY_MAX) return { ok: false, error: MSG.summaryMax };
  return { ok: true, text };
}

function newId(): string {
  return crypto.randomUUID();
}

async function loadState(ctx: Ctx) {
  const [records, timer, tasks, catalog] = await Promise.all([
    ctx.store.listRecords(season.id),
    ctx.store.getTimer(),
    ctx.store.getTasks(season.id),
    loadCatalog(ctx),
  ]);
  return { records, state: computeGameState(records, timer, season, ctx.instant, { tasks, catalog }) };
}

/** Atividade com timer (estudo, projeto...). */
const findBlock = (id: unknown) =>
  typeof id === 'string' ? (timeSources(season).find((b) => b.id === id) ?? null) : null;
const findCounter = (id: unknown) =>
  typeof id === 'string' ? (season.counters.find((c) => c.id === id) ?? null) : null;

// ---------- Acesso ----------

/** Usada com useActionState na tela /entrar. Em caso de sucesso, redireciona para "/". */
export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const expected = process.env.FORJA_PASSWORD;
  if (!expected || !process.env.FORJA_SECRET) return { error: MSG.missingEnv };

  const raw = formData.get('password');
  const given = typeof raw === 'string' ? raw : '';
  if (!(await safeEqual(given, expected))) {
    // Pequena espera para encarecer tentativas em série.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { error: MSG.password };
  }

  const token = await signSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  redirect('/');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/entrar');
}

// ---------- Timer ----------

/** Liga o timer num bloco da rotina; no estudo, `courseSlug` diz o curso. */
export async function startTimer(courseSlug: string, pomodoro: boolean, block = 'estudo'): Promise<ActionResult> {
  return withSession(async (ctx) => {
    if (!findBlock(block)) return fail(MSG.block);
    if (block === 'estudo' && !findCourse(await loadCatalog(ctx), courseSlug)) return fail(MSG.course);
    if (await ctx.store.getTimer()) return fail(MSG.timerExists);
    await ctx.store.setTimer(timerStart(courseSlug, pomodoro === true, ctx.instant, block));
    return { ok: true };
  });
}

export async function pauseTimer(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    if (t.runningSince === null) return { ok: true }; // já pausado
    await ctx.store.setTimer(timerPause(t, ctx.instant, season.timer));
    return { ok: true };
  });
}

export async function resumeTimer(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    // Já rodando: retomar de novo zeraria o trecho em curso, então não muda nada.
    if (t.runningSince !== null) return { ok: true };
    await ctx.store.setTimer(timerResume(t, ctx.instant));
    return { ok: true };
  });
}

export async function confirmPresence(countGap: boolean): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    await ctx.store.setTimer(timerConfirmPresence(t, countGap === true, ctx.instant, season.timer));
    return { ok: true };
  });
}

/** Encerra a sessão. No estudo, `summary` (o que foi aprendido) é obrigatório. */
export async function stopTimer(
  lessonIds: number[],
  countGap: boolean,
  summary?: string,
): Promise<ActionResult<{ minutes: number }>> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    const course = findCourse(await loadCatalog(ctx), t.courseSlug);
    const lessons = course ? cleanLessonIds(course, lessonIds) : [];
    if (lessons === null) return fail(MSG.lessons);

    let record = timerStop(t, lessons, countGap === true, ctx.instant, season, newId);
    if (record?.kind === 'study') {
      const s = cleanSummary(summary);
      if (!s.ok) return fail(s.error);
      record = { ...record, data: { ...record.data, summary: s.text } };
    }
    // Grava a sessão antes de apagar o timer: se a gravação falhar, nada se perde.
    if (record) await ctx.store.addRecord(record);
    await ctx.store.setTimer(null);
    return { ok: true, data: { minutes: record?.data.minutes ?? 0 } };
  });
}

export async function discardTimer(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    await ctx.store.setTimer(null);
    return { ok: true };
  });
}

// ---------- Registros ----------

export async function addStudy(input: {
  day: string;
  courseSlug: string;
  minutes: number;
  lessonIds: number[];
  summary: string;
}): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { day, courseSlug, minutes, lessonIds } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    const minErr = minutesError(minutes, 1);
    if (minErr) return fail(minErr);
    const course = findCourse(await loadCatalog(ctx), courseSlug);
    if (!course) return fail(MSG.course);
    const lessons = cleanLessonIds(course, lessonIds);
    if (lessons === null) return fail(MSG.lessons);
    const summary = cleanSummary(input.summary);
    if (!summary.ok) return fail(summary.error);

    const record: StudyRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'study',
      day,
      createdAt: ctx.instant.toISOString(),
      data: { courseSlug: course.slug, minutes, source: 'manual', lessonIds: lessons, summary: summary.text },
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

/** Tempo num bloco que não é estudo de curso (prospecção, vagas, projeto). */
export async function addWork(input: { day: string; block: string; minutes: number; note?: string }): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { day, block, minutes, note } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    const cfg = findBlock(block);
    if (!cfg) return fail(MSG.block);
    if (cfg.id === 'estudo') return fail(MSG.studyBlock);
    const minErr = minutesError(minutes, 1);
    if (minErr) return fail(minErr);
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE) : '';
    const record: WorkRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'work',
      day,
      createdAt: ctx.instant.toISOString(),
      data: cleanNote
        ? { block: cfg.id, minutes, source: 'manual', note: cleanNote }
        : { block: cfg.id, minutes, source: 'manual' },
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

/** Soma num contador (candidaturas, contatos, posts). */
export async function addCount(input: { day: string; counter: string; amount: number }): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { day, counter, amount } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    const cfg = findCounter(counter);
    if (!cfg) return fail(MSG.counter);
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > MAX_COUNT) {
      return fail(MSG.amount);
    }
    const record: CountRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'count',
      day,
      createdAt: ctx.instant.toISOString(),
      data: { counter: cfg.id, amount },
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

export async function addGym(input: { day: string }): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { day } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    const record: GymRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'gym',
      day,
      createdAt: ctx.instant.toISOString(),
      data: {},
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

export async function addCardio(input: {
  day: string;
  modality: CardioModality;
  minutes: number;
}): Promise<ActionResult<{ isSuper: boolean }>> {
  return withSession(async (ctx) => {
    const { day, modality, minutes } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    if (!MODALITIES.includes(modality)) return fail(MSG.modality);
    const cardioErr = validateCardio(modality, minutes, season);
    if (cardioErr) return fail(cardioErr);
    const minErr = minutesError(minutes, 0);
    if (minErr) return fail(minErr);

    const isSuper = isSuperCardio(modality, minutes, season);
    const record: CardioRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'cardio',
      day,
      createdAt: ctx.instant.toISOString(),
      data: { modality, minutes, isSuper },
    };
    await ctx.store.addRecord(record);
    return { ok: true, data: { isSuper } };
  });
}

/** Usa uma folga de reserva hoje. (Não se chama useBreak para não parecer um hook do React.) */
export async function takeBreak(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { records, state } = await loadState(ctx);
    const alreadyBreak =
      season.plannedBreaks.includes(ctx.today) ||
      records.some((r) => r.kind === 'break' && r.day === ctx.today) ||
      (state.todayInfo?.breakKind ?? null) !== null;
    if (alreadyBreak) return fail(MSG.alreadyBreak);
    if (state.breaks.reserveLeft <= 0) return fail(MSG.noReserve);
    if (!state.breaks.canUseToday) {
      return fail(state.phase === 'active' ? MSG.breakUnavailable : MSG.breakOutside);
    }

    const record: BreakRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'break',
      day: ctx.today,
      createdAt: ctx.instant.toISOString(),
      data: {},
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

export async function confirmDeposit(weekIndex: number): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { records, state } = await loadState(ctx);
    if (typeof weekIndex !== 'number' || !Number.isInteger(weekIndex)) return fail(MSG.week);
    const week = state.weeks.find((w) => w.index === weekIndex);
    if (!week) return fail(MSG.week);
    // depois do depósito, só a diferença (um chefe resgatado mais tarde, por exemplo)
    const pending = state.fund.pending.find((p) => p.weekIndex === weekIndex);
    const deposited =
      week.depositedCents !== null || records.some((r) => r.kind === 'deposit' && r.data.weekIndex === weekIndex);
    if (deposited && !pending) return fail(MSG.depositDone);
    if (!week.isClosed) return fail(MSG.weekOpen);

    const record: DepositRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'deposit',
      day: ctx.today,
      createdAt: ctx.instant.toISOString(),
      data: { weekIndex, amountCents: pending?.amountCents ?? week.fundCents },
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

export async function addClient(input: {
  contractCents: number;
  note?: string;
}): Promise<ActionResult<{ bonusCents: number }>> {
  return withSession(async (ctx) => {
    const { contractCents, note } = input;
    if (typeof contractCents !== 'number' || !Number.isSafeInteger(contractCents) || contractCents <= 0) {
      return fail(MSG.contract);
    }
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE) : '';
    const bonusCents = clientBonusCents(contractCents, season);
    const record: ClientRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'client',
      day: ctx.today,
      createdAt: ctx.instant.toISOString(),
      data: cleanNote ? { contractCents, bonusCents, note: cleanNote } : { contractCents, bonusCents },
    };
    await ctx.store.addRecord(record);
    return { ok: true, data: { bonusCents } };
  });
}

/** "Concluí" do evento de resgate de hoje, para desafios que não dá para medir (prospecção, leitura). */
export async function completeRescue(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { state } = await loadState(ctx);
    const rescue = state.rescue;
    if (!rescue || rescue.day !== ctx.today || rescue.state === 'upcoming' || rescue.state === 'missed') {
      return fail(MSG.noRescue);
    }
    if (rescue.kind !== 'manual') return fail(MSG.rescueAuto);
    if (rescue.state === 'done') return fail(MSG.rescueDone);

    const record: RescueRecord = {
      id: newId(),
      seasonId: season.id,
      kind: 'rescue',
      day: ctx.today,
      createdAt: ctx.instant.toISOString(),
      data: { weekIndex: rescue.weekIndex },
    };
    await ctx.store.addRecord(record);
    return { ok: true };
  });
}

// ---------- Cursos adicionados no app ----------

const MAX_COURSE_NAME = 120;
const MAX_COURSE_LESSONS = 2000;

/** Adiciona um curso a partir da lista de aulas colada (veja src/lib/course-import.ts). */
export async function addCourse(input: {
  name: string;
  url?: string;
  platform?: string;
  lessons: string;
}): Promise<ActionResult<{ slug: string; lessons: number; minutes: number }>> {
  return withSession(async (ctx) => {
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
    if (!name || name.length > MAX_COURSE_NAME) return fail(MSG.courseName);
    const url = typeof input.url === 'string' ? input.url.trim() : '';
    if (url && !/^https?:\/\/\S+$/i.test(url)) return fail(MSG.courseUrl);
    const platform = typeof input.platform === 'string' ? input.platform.trim().slice(0, 40) : '';
    if (typeof input.lessons !== 'string') return fail(MSG.courseLessons);

    const custom = await ctx.store.getCourses();
    let id = Math.max(maxCustomLessonId(custom), CUSTOM_ID_BASE);
    const parsed = parseLessons(input.lessons.slice(0, 200_000), () => ++id);
    if (parsed.lessons === 0 || parsed.lessons > MAX_COURSE_LESSONS) return fail(MSG.courseLessons);

    const taken = new Set(mergeCatalog(custom).courses.map((c) => c.slug));
    const course: CatalogCourse = {
      slug: slugFor(name, taken),
      name,
      modules: parsed.modules,
      custom: true,
      ...(platform ? { platform } : {}),
      ...(url ? { url } : {}),
    };
    await ctx.store.setCourses([...custom, course]);
    return { ok: true, data: { slug: course.slug, lessons: parsed.lessons, minutes: parsed.minutes } };
  });
}

/** Remove um curso adicionado no app, se não houver estudo dele registrado nesta temporada. */
export async function deleteCourse(slug: string): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const custom = await ctx.store.getCourses();
    if (!custom.some((c) => c.slug === slug)) return fail(MSG.courseNotFound);
    const records = await ctx.store.listRecords(season.id);
    if (records.some((r) => r.kind === 'study' && r.data.courseSlug === slug)) return fail(MSG.courseInUse);
    const timer = await ctx.store.getTimer();
    if (timer?.courseSlug === slug) return fail(MSG.courseInUse);
    await ctx.store.setCourses(custom.filter((c) => c.slug !== slug));
    return { ok: true };
  });
}

// ---------- Tarefas avulsas ----------

function cleanTitle(title: unknown): string | null {
  if (typeof title !== 'string') return null;
  const t = title.trim().replace(/\s+/g, ' ');
  return t && t.length <= MAX_TASK ? t : null;
}

export async function addTask(input: { title: string; block?: string | null }): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const title = cleanTitle(input.title);
    if (!title) return fail(MSG.taskTitle);
    const block = input.block ? findBlock(input.block) : null;
    if (input.block && !block) return fail(MSG.block);
    const tasks = await ctx.store.getTasks(season.id);
    const task: Task = {
      id: newId(),
      title,
      block: block?.id ?? null,
      createdAt: ctx.instant.toISOString(),
      doneDay: null,
      doneAt: null,
    };
    await ctx.store.setTasks(season.id, [...tasks, task]);
    return { ok: true };
  });
}

/** Conclui (no dia do jogo de agora) ou reabre uma tarefa. */
export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const tasks = await ctx.store.getTasks(season.id);
    if (!tasks.some((t) => t.id === id)) return fail(MSG.taskNotFound);
    const next = tasks.map((t) =>
      t.id !== id
        ? t
        : done
          ? { ...t, doneDay: t.doneDay ?? ctx.today, doneAt: t.doneAt ?? ctx.instant.toISOString() }
          : { ...t, doneDay: null, doneAt: null },
    );
    await ctx.store.setTasks(season.id, next);
    return { ok: true };
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const tasks = await ctx.store.getTasks(season.id);
    if (!tasks.some((t) => t.id === id)) return fail(MSG.taskNotFound);
    await ctx.store.setTasks(
      season.id,
      tasks.filter((t) => t.id !== id),
    );
    return { ok: true };
  });
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  return withSession(async (ctx) => {
    if (typeof id !== 'string' || !id) return fail(MSG.recordNotFound);
    const records = await ctx.store.listRecords(season.id);
    const record = records.find((r) => r.id === id);
    if (!record) return fail(MSG.recordNotFound);
    if (!UNDOABLE_KINDS.has(record.kind)) return fail(MSG.undoKind);
    if (!isTodayOrYesterday(record.day, ctx)) return fail(MSG.undoRange);
    if (!(await ctx.store.deleteRecord(id))) return fail(MSG.recordNotFound);
    return { ok: true };
  });
}
