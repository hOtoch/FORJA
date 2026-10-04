'use server';

// Server Actions do Forja. Contrato: specs/001-forja-temporada-1/contracts/server-actions.md
// Regras de gravação: specs/001-forja-temporada-1/data-model.md ("Validações ao gravar").
// Cada action confere a sessão, valida a entrada, grava pelo store e revalida as páginas.

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { courseCatalog, season1 } from '@/config/season1';
import { requireSession, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '@/lib/auth';
import { clientBonusCents, isSuperCardio, validateCardio } from '@/lib/cardio';
import { computeGameState } from '@/lib/game';
import { getStore, type Store } from '@/lib/store';
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
  BreakRecord,
  CardioModality,
  CardioRecord,
  CatalogCourse,
  ClientRecord,
  DepositRecord,
  GymRecord,
  StudyRecord,
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
} as const;

const MAX_MINUTES = 600;
const MAX_NOTE = 200;
const UNDOABLE_KINDS = new Set(['study', 'gym', 'cardio', 'client']);
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
    const today = gameDay(instant, season1.timeZone, season1.dayStartHour);
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

function findCourse(slug: unknown): CatalogCourse | null {
  if (typeof slug !== 'string') return null;
  return courseCatalog.courses.find((c) => c.slug === slug) ?? null;
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

function newId(): string {
  return crypto.randomUUID();
}

async function loadState(ctx: Ctx) {
  const [records, timer] = await Promise.all([ctx.store.listRecords(season1.id), ctx.store.getTimer()]);
  return { records, state: computeGameState(records, timer, season1, ctx.instant) };
}

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

export async function startTimer(courseSlug: string, pomodoro: boolean): Promise<ActionResult> {
  return withSession(async (ctx) => {
    if (!findCourse(courseSlug)) return fail(MSG.course);
    if (await ctx.store.getTimer()) return fail(MSG.timerExists);
    await ctx.store.setTimer(timerStart(courseSlug, pomodoro === true, ctx.instant));
    return { ok: true };
  });
}

export async function pauseTimer(): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    if (t.runningSince === null) return { ok: true }; // já pausado
    await ctx.store.setTimer(timerPause(t, ctx.instant, season1.timer));
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
    await ctx.store.setTimer(timerConfirmPresence(t, countGap === true, ctx.instant, season1.timer));
    return { ok: true };
  });
}

export async function stopTimer(
  lessonIds: number[],
  countGap: boolean,
): Promise<ActionResult<{ minutes: number }>> {
  return withSession(async (ctx) => {
    const t = await ctx.store.getTimer();
    if (!t) return fail(MSG.noTimer);
    const course = findCourse(t.courseSlug);
    const lessons = course ? cleanLessonIds(course, lessonIds) : [];
    if (lessons === null) return fail(MSG.lessons);

    const record = timerStop(t, lessons, countGap === true, ctx.instant, season1, newId);
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
}): Promise<ActionResult> {
  return withSession(async (ctx) => {
    const { day, courseSlug, minutes, lessonIds } = input;
    if (!isTodayOrYesterday(day, ctx)) return fail(MSG.dayRange);
    const minErr = minutesError(minutes, 1);
    if (minErr) return fail(minErr);
    const course = findCourse(courseSlug);
    if (!course) return fail(MSG.course);
    const lessons = cleanLessonIds(course, lessonIds);
    if (lessons === null) return fail(MSG.lessons);

    const record: StudyRecord = {
      id: newId(),
      seasonId: season1.id,
      kind: 'study',
      day,
      createdAt: ctx.instant.toISOString(),
      data: { courseSlug: course.slug, minutes, source: 'manual', lessonIds: lessons },
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
      seasonId: season1.id,
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
    const cardioErr = validateCardio(modality, minutes, season1);
    if (cardioErr) return fail(cardioErr);
    const minErr = minutesError(minutes, 0);
    if (minErr) return fail(minErr);

    const isSuper = isSuperCardio(modality, minutes, season1);
    const record: CardioRecord = {
      id: newId(),
      seasonId: season1.id,
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
      season1.plannedBreaks.includes(ctx.today) ||
      records.some((r) => r.kind === 'break' && r.day === ctx.today) ||
      (state.todayInfo?.breakKind ?? null) !== null;
    if (alreadyBreak) return fail(MSG.alreadyBreak);
    if (state.breaks.reserveLeft <= 0) return fail(MSG.noReserve);
    if (!state.breaks.canUseToday) {
      return fail(state.phase === 'active' ? MSG.breakUnavailable : MSG.breakOutside);
    }

    const record: BreakRecord = {
      id: newId(),
      seasonId: season1.id,
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
    const deposited =
      week.depositedCents !== null ||
      records.some((r) => r.kind === 'deposit' && r.data.weekIndex === weekIndex);
    if (deposited) return fail(MSG.depositDone);
    if (!week.isClosed) return fail(MSG.weekOpen);

    const pending = state.fund.pending.find((p) => p.weekIndex === weekIndex);
    const record: DepositRecord = {
      id: newId(),
      seasonId: season1.id,
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
    const bonusCents = clientBonusCents(contractCents, season1);
    const record: ClientRecord = {
      id: newId(),
      seasonId: season1.id,
      kind: 'client',
      day: ctx.today,
      createdAt: ctx.instant.toISOString(),
      data: cleanNote ? { contractCents, bonusCents, note: cleanNote } : { contractCents, bonusCents },
    };
    await ctx.store.addRecord(record);
    return { ok: true, data: { bonusCents } };
  });
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  return withSession(async (ctx) => {
    if (typeof id !== 'string' || !id) return fail(MSG.recordNotFound);
    const records = await ctx.store.listRecords(season1.id);
    const record = records.find((r) => r.id === id);
    if (!record) return fail(MSG.recordNotFound);
    if (!UNDOABLE_KINDS.has(record.kind)) return fail(MSG.undoKind);
    if (!isTodayOrYesterday(record.day, ctx)) return fail(MSG.undoRange);
    if (!(await ctx.store.deleteRecord(id))) return fail(MSG.recordNotFound);
    return { ok: true };
  });
}
