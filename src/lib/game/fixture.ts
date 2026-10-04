// GameState de exemplo para a interface trabalhar antes da integração com o motor (T016, T062).
// Cenário: quarta, 21/10/2026, 14:52 em Brasília. Dia 17 de 80, semana 3.
// - semana 1 com o chefe derrotado (baú 1 aberto em 11/10) e depositada;
// - folgas planejadas de 10 a 13/10;
// - 15/10 salvo por escudo, então o chefe da semana 2 não caiu (depósito pendente);
// - hoje com 35 min de estudo e um cliente fechado ontem.
// Os números são coerentes entre si, mas não substituem o motor de regras.

import { courseCatalog, season1 } from '@/config/season1';
import { isSuperCardio } from '@/lib/cardio';
import { seasonDays, seasonWeeks, weekdayOf } from '@/lib/time';
import type {
  CardioModality,
  ChestState,
  CourseProgress,
  DayInfo,
  ForjaRecord,
  GameState,
  GradeLetter,
  Heat,
  TimerView,
  WeekInfo,
} from '@/lib/types';

const TODAY = '2026-10-21';
const NOW = '2026-10-21T17:52:10.000Z'; // 14:52:10 em Brasília
const MIN = 60_000;

interface DaySeed {
  study?: number[]; // minutos de cada sessão
  gym?: number;
  cardio?: [CardioModality, number][];
  shield?: boolean;
}

const SEEDS: Record<string, DaySeed> = {
  '2026-10-05': { study: [75], gym: 1 },
  '2026-10-06': { study: [62] },
  '2026-10-07': { study: [70, 60], gym: 1, cardio: [['esteira', 30]] },
  '2026-10-08': { study: [64], gym: 1, cardio: [['eliptico', 25]] },
  '2026-10-09': { study: [50, 40], gym: 1, cardio: [['bicicleta', 60]] },
  '2026-10-10': { cardio: [['pelada', 50]] },
  '2026-10-11': { cardio: [['caminhada', 40]] },
  '2026-10-14': { study: [70], gym: 1 },
  '2026-10-15': { shield: true },
  '2026-10-16': { study: [85], gym: 1, cardio: [['esteira', 30]] },
  '2026-10-17': { study: [65], cardio: [['pelada', 70]] },
  '2026-10-18': { study: [61], gym: 1, cardio: [['esteira', 25]] },
  '2026-10-19': { study: [55, 40], gym: 1 },
  '2026-10-20': { study: [72], cardio: [['bicicleta', 35]] },
  '2026-10-21': { study: [35] },
};

const CLIENT = { day: '2026-10-20', contractCents: 300_000, note: 'Landing page da clínica' };

/** Aulas concluídas durante a temporada, na ordem em que foram estudadas. */
const SEASON_LESSONS = [991, 992, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022];

const COURSE_ENDS: Record<string, string> = {
  'desenvolvimento-assistido-por-ia': '2026-10-30',
  'python-full-ai-profissional': '2026-11-24',
  'python-full-ai-2025': '2026-12-11',
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function seedOf(date: string): Required<DaySeed> {
  const s = SEEDS[date] ?? {};
  return { study: s.study ?? [], gym: s.gym ?? 0, cardio: s.cardio ?? [], shield: s.shield ?? false };
}

function heatOf(minutes: number, gym: number, cardio: number): Heat {
  if (minutes < season1.goals.studyMinutes) return minutes > 0 ? 1 : 0;
  const points = (minutes >= 120 ? 1 : 0) + (gym > 0 ? 1 : 0) + (cardio > 0 ? 1 : 0);
  return (2 + Math.min(points, 2)) as Heat;
}

function buildDays(today: string): DayInfo[] {
  const weeks = seasonWeeks(season1);
  return seasonDays(season1).map((date, i) => {
    const seed = seedOf(date);
    const isFuture = date > today;
    const isToday = date === today;
    const breakKind = season1.plannedBreaks.includes(date) ? ('planned' as const) : null;
    const studyMinutes = sum(seed.study);
    const studyMet = studyMinutes >= season1.goals.studyMinutes;
    const cardio = seed.cardio.length;
    const superCardio = seed.cardio.filter(([m, min]) => isSuperCardio(m, min, season1)).length;
    const empty = studyMinutes === 0 && seed.gym === 0 && cardio === 0;
    const heat: Heat | null = isFuture || (isToday && empty) ? null : heatOf(studyMinutes, seed.gym, cardio);
    const xp =
      Math.min(studyMinutes, season1.xp.studyDailyCap) +
      seed.gym * season1.xp.gym +
      (cardio - superCardio) * season1.xp.cardio +
      superCardio * season1.xp.superCardio;
    const counts = studyMet && !breakKind && !seed.shield;
    const fundCents =
      (counts ? season1.fund.studyDayCents : 0) +
      seed.gym * season1.fund.gymCents +
      cardio * season1.fund.cardioCents;
    return {
      date,
      index: i + 1,
      weekIndex: weeks.find((w) => w.days.includes(date))!.index,
      weekday: weekdayOf(date),
      isFuture,
      isToday,
      breakKind,
      studyMinutes,
      studyMet,
      shieldUsed: seed.shield,
      gym: seed.gym,
      cardio,
      superCardio,
      heat,
      xp,
      fundCents,
    };
  });
}

function buildWeeks(days: DayInfo[], today: string): WeekInfo[] {
  return seasonWeeks(season1).map((w) => {
    const ds = days.filter((d) => d.weekIndex === w.index);
    const gymTarget = w.isFinal ? season1.goals.finalWeek.gym : season1.goals.gymPerWeek;
    const cardioTarget = w.isFinal ? season1.goals.finalWeek.cardio : season1.goals.cardioPerWeek;
    const superRequired = w.isFinal ? season1.goals.finalWeek.requireSuper : true;
    const studyDaysRequired = ds.filter((d) => !d.breakKind).length;
    const studyDaysMet = ds.filter((d) => !d.breakKind && d.studyMet && !d.shieldUsed && !d.isFuture).length;
    const shieldDays = ds.filter((d) => d.shieldUsed).length;
    const gym = sum(ds.map((d) => d.gym));
    const cardio = sum(ds.map((d) => d.cardio));
    const hasSuper = ds.some((d) => d.superCardio > 0);
    const effective = hasSuper || !superRequired ? cardio : Math.min(cardio, season1.goals.cardioMaxWithoutSuper);
    const isClosed = w.end < today;
    const bossDefeated =
      studyDaysMet === studyDaysRequired &&
      shieldDays === 0 &&
      gym >= gymTarget &&
      effective >= cardioTarget &&
      (hasSuper || !superRequired);
    const clientCents = ds.some((d) => d.date === CLIENT.day) ? Math.round(CLIENT.contractCents * 0.05) : 0;
    const fundCents =
      studyDaysMet * season1.fund.studyDayCents +
      Math.min(gym, gymTarget) * season1.fund.gymCents +
      Math.min(effective, cardioTarget) * season1.fund.cardioCents +
      (bossDefeated ? (w.isFinal ? season1.fund.finalBossCents : season1.fund.bossCents) : 0) +
      clientCents;
    return {
      index: w.index,
      start: w.start,
      end: w.end,
      isFinal: w.isFinal,
      isClosed,
      isCurrent: w.start <= today && today <= w.end,
      studyDaysRequired,
      studyDaysMet,
      shieldDays,
      gym,
      gymTarget,
      cardio,
      cardioTarget,
      hasSuper,
      superRequired,
      bossDefeated,
      fundCents,
      depositedCents: w.index === 1 ? fundCents : null,
    };
  });
}

function buildCourses(): CourseProgress[] {
  const done = new Set<number>([
    ...Object.values(season1.courses.initialCompleted).flat(),
    ...SEASON_LESSONS,
  ]);
  const minutesOf = (m: number) => (m > 0 ? m : season1.courses.missingDurationMin);
  return season1.courses.queue.map((slug) => {
    const course = courseCatalog.courses.find((c) => c.slug === slug)!;
    const modules = course.modules.map((m) => {
      const lessons = m.lessons.map(([id, title, minutes]) => ({ id, title, minutes, done: done.has(id) }));
      const doneCount = lessons.filter((l) => l.done).length;
      return {
        name: m.name,
        total: lessons.length,
        done: doneCount,
        completed: doneCount === lessons.length,
        lessons,
      };
    });
    const lessons = modules.flatMap((m) => m.lessons);
    return {
      slug,
      name: course.name,
      totalLessons: lessons.length,
      doneLessons: lessons.filter((l) => l.done).length,
      totalMinutes: sum(lessons.map((l) => minutesOf(l.minutes))),
      doneMinutes: sum(lessons.filter((l) => l.done).map((l) => minutesOf(l.minutes))),
      modules,
      completed: modules.every((m) => m.completed),
      projectedEnd: COURSE_ENDS[slug] ?? null,
    };
  });
}

function levelFor(total: number) {
  let level = 0;
  while (season1.levelXp(level + 1) <= total) level++;
  let title = season1.titles[0][1];
  for (const [min, name] of season1.titles) if (Math.max(level, 1) >= min) title = name;
  return { level, title, levelStartXp: season1.levelXp(level), nextLevelXp: season1.levelXp(level + 1) };
}

function letterFor(pct: number): GradeLetter {
  if (pct >= season1.grade.S) return 'S';
  if (pct >= season1.grade.A) return 'A';
  if (pct >= season1.grade.B) return 'B';
  return 'C';
}

function buildState(timer: TimerView | null): GameState {
  const days = buildDays(TODAY);
  const weeks = buildWeeks(days, TODAY);
  const courses = buildCourses();
  const currentWeek = weeks.find((w) => w.isCurrent) ?? null;
  const todayInfo = days.find((d) => d.isToday) ?? null;

  // XP
  const past = days.filter((d) => !d.isFuture);
  const studyXp = sum(past.map((d) => Math.min(d.studyMinutes, season1.xp.studyDailyCap)));
  const gymXp = sum(past.map((d) => d.gym)) * season1.xp.gym;
  const cardioXp = sum(past.map((d) => (d.cardio - d.superCardio) * season1.xp.cardio + d.superCardio * season1.xp.superCardio));
  const modulesXp = 3 * season1.xp.module; // módulos 2, 3 e 4 do primeiro curso
  const bosses = weeks.filter((w) => w.isClosed && w.bossDefeated).length;
  const inteligencia = studyXp + modulesXp + bosses * 34;
  const forca = gymXp + bosses * 33;
  const vigor = cardioXp + bosses * 33;
  const total = inteligencia + forca + vigor;

  // Nota prevista: só dias e semanas fechados
  const closedDays = days.filter((d) => d.date < TODAY && !d.breakKind);
  const studyPct = (100 * closedDays.filter((d) => d.studyMet && !d.shieldUsed).length) / closedDays.length;
  const closedWeeks = weeks.filter((w) => w.isClosed);
  const gymPct = (100 * sum(closedWeeks.map((w) => Math.min(w.gym, w.gymTarget)))) / sum(closedWeeks.map((w) => w.gymTarget));
  const cardioPct =
    (100 *
      sum(
        closedWeeks.map((w) =>
          Math.min(w.hasSuper || !w.superRequired ? w.cardio : Math.min(w.cardio, 4), w.cardioTarget),
        ),
      )) /
    sum(closedWeeks.map((w) => w.cardioTarget));
  const totalPct = (studyPct + gymPct + cardioPct) / 3;

  const clientBonusCents = Math.round(CLIENT.contractCents * 0.05);
  const earnedCents = sum(weeks.map((w) => w.fundCents));
  const depositedCents = sum(weeks.map((w) => w.depositedCents ?? 0));

  const chests: ChestState[] = season1.chests.map((c) => ({
    id: c.id,
    condition: c.condition,
    prize: c.prize,
    state: c.id === 1 ? 'opened' : 'locked',
    openedOn: c.id === 1 ? '2026-10-11' : null,
  }));

  const nextLessonId = 1023;
  const first = courses[0];
  const nextLessonInfo = first.modules.flatMap((m) => m.lessons).find((l) => l.id === nextLessonId)!;

  return {
    now: NOW,
    today: TODAY,
    phase: 'active',
    dayIndex: todayInfo?.index ?? null,
    days,
    weeks,
    currentWeek,
    todayInfo,
    yesterdayMissedUnprotected: false,
    streak: { current: 11, best: 11, shields: 1 },
    xp: { total, byAttr: { inteligencia, forca, vigor }, ...levelFor(total) },
    grade: {
      studyPct: Math.round(studyPct),
      gymPct: Math.round(gymPct),
      cardioPct: Math.round(cardioPct),
      totalPct: Math.round(totalPct),
      letter: letterFor(totalPct),
      isFinal: false,
    },
    fund: {
      earnedCents,
      depositedCents,
      perfectCents: season1.fund.perfectCents,
      clientBonusCents,
      pending: weeks
        .filter((w) => w.isClosed && w.depositedCents === null)
        .map((w) => ({ weekIndex: w.index, amountCents: w.fundCents })),
    },
    chests,
    courses,
    currentCourseSlug: first.slug,
    nextLesson: {
      courseSlug: first.slug,
      id: nextLessonId,
      title: nextLessonInfo.title,
      minutes: nextLessonInfo.minutes,
      url: season1.courses.lessonUrl(first.slug, nextLessonId),
    },
    queueProjectedEnd: COURSE_ENDS['python-full-ai-2025'],
    queueEndsBeforeSeason: true,
    medals: [],
    breaks: { reserveUsed: 0, reserveLeft: season1.reserveBreaks, canUseToday: true },
    timer,
    status: {
      studyDone: false,
      weekAtRisk: false,
      reasons: ['Faltam 25 min de estudo hoje.'],
    },
  };
}

/** Painel no meio da temporada, sem sessão de estudo em andamento. */
export function getSampleState(): GameState {
  return buildState(null);
}

/**
 * Mesmo cenário com uma sessão em andamento.
 * - `running` (padrão): começou às 14:10, 42 min creditados.
 * - `presence`: começou às 13:20 e passou dos 50 min sem confirmação; 42 min pendentes.
 * - `paused`: pausada depois de 31 min.
 */
export function getSampleStateWithTimer(variant: 'running' | 'presence' | 'paused' = 'running'): GameState {
  const now = Date.parse(NOW);
  const slug = 'desenvolvimento-assistido-por-ia';
  const presenceMs = season1.timer.presenceMinutes * MIN;
  let timer: TimerView;
  if (variant === 'presence') {
    const started = now - (92 * MIN + 10_000);
    timer = {
      courseSlug: slug,
      startedAt: new Date(started).toISOString(),
      accumulatedMs: 0,
      runningSince: new Date(started).toISOString(),
      lastConfirmAt: new Date(started).toISOString(),
      pomodoro: false,
      creditedMs: presenceMs,
      awaitingPresence: true,
      pendingMs: now - started - presenceMs,
      capped: false,
    };
  } else if (variant === 'paused') {
    const started = now - 55 * MIN;
    timer = {
      courseSlug: slug,
      startedAt: new Date(started).toISOString(),
      accumulatedMs: 31 * MIN,
      runningSince: null,
      lastConfirmAt: new Date(started + 31 * MIN).toISOString(),
      pomodoro: true,
      creditedMs: 31 * MIN,
      awaitingPresence: false,
      pendingMs: 0,
      capped: false,
    };
  } else {
    const started = now - (42 * MIN + 10_000);
    timer = {
      courseSlug: slug,
      startedAt: new Date(started).toISOString(),
      accumulatedMs: 0,
      runningSince: new Date(started).toISOString(),
      lastConfirmAt: new Date(started).toISOString(),
      pomodoro: false,
      creditedMs: now - started,
      awaitingPresence: false,
      pendingMs: 0,
      capped: false,
    };
  }
  return buildState(timer);
}

/**
 * Registros que geram o cenário acima, para a gaveta do dia listar sessões, aulas,
 * treinos e cardios (e oferecer "Desfazer" em hoje e ontem).
 */
export function getSampleRecords(): ForjaRecord[] {
  const records: ForjaRecord[] = [];
  const lessons = [...SEASON_LESSONS];
  const at = (date: string, hh: number, mm: number) =>
    new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-03:00`).toISOString();
  for (const date of Object.keys(SEEDS).sort()) {
    const seed = seedOf(date);
    const starts: [number, number][] = date === TODAY ? [[8, 30]] : [[19, 0], [21, 15]];
    seed.study.forEach((minutes, i) => {
      const startedAt = at(date, ...starts[i]);
      const endedAt = new Date(Date.parse(startedAt) + minutes * MIN).toISOString();
      records.push({
        id: `study-${date}-${i}`,
        seasonId: season1.id,
        kind: 'study',
        day: date,
        createdAt: endedAt,
        data: {
          courseSlug: 'desenvolvimento-assistido-por-ia',
          minutes,
          source: i === 1 && date === '2026-10-07' ? 'manual' : 'timer',
          startedAt,
          endedAt,
          lessonIds: date === TODAY || i > 0 ? [] : lessons.splice(0, 1),
        },
      });
    });
    for (let g = 0; g < seed.gym; g++) {
      records.push({ id: `gym-${date}-${g}`, seasonId: season1.id, kind: 'gym', day: date, createdAt: at(date, 7, 10), data: {} });
    }
    seed.cardio.forEach(([modality, minutes], c) => {
      records.push({
        id: `cardio-${date}-${c}`,
        seasonId: season1.id,
        kind: 'cardio',
        day: date,
        createdAt: at(date, 18, 0),
        data: { modality, minutes, isSuper: isSuperCardio(modality, minutes, season1) },
      });
    });
  }
  records.push({
    id: 'client-2026-10-20',
    seasonId: season1.id,
    kind: 'client',
    day: CLIENT.day,
    createdAt: at(CLIENT.day, 16, 20),
    data: {
      contractCents: CLIENT.contractCents,
      bonusCents: Math.round(CLIENT.contractCents * 0.05),
      note: CLIENT.note,
    },
  });
  records.push({
    id: 'deposit-week-1',
    seasonId: season1.id,
    kind: 'deposit',
    day: '2026-10-12',
    createdAt: at('2026-10-12', 10, 0),
    data: { weekIndex: 1, amountCents: 12_000 },
  });
  return records;
}
