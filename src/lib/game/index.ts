// Motor de regras do Forja: calcula todo o GameState a partir dos registros, do timer e da
// configuração da temporada (specs/001-forja-temporada-1/data-model.md). Funções puras.

import { courseCatalog } from '@/config/season1';
import { gameDay } from '@/lib/time';
import { timerView } from '@/lib/timer';
import type { CourseCatalog, ForjaRecord, GameState, SeasonConfig, TimerState } from '@/lib/types';
import { computeChests } from './chests';
import { computeCourses } from './courses';
import { buildDays, dayIndexOf, phaseOf, reserveBreakDays } from './days';
import { computeFund, dayFundCents } from './fund';
import { computeGrade } from './grade';
import { computeStatus } from './status';
import { computeStreak } from './streak';
import { buildWeeks } from './weeks';
import { computeXp } from './xp';

export function computeGameState(
  records: ForjaRecord[],
  timer: TimerState | null,
  config: SeasonConfig,
  now: Date,
  catalog: CourseCatalog = courseCatalog,
): GameState {
  const today = gameDay(now, config.timeZone, config.dayStartHour);
  const phase = phaseOf(today, config);

  // dias → sequência/escudos (marca os dias salvos) → semanas e chefes
  const streak = computeStreak(buildDays(records, config, today), config, today);
  const weeks = buildWeeks(streak.days, records, config, today);

  const courses = computeCourses(records, catalog, config, today);
  const xp = computeXp(records, weeks, courses.events, config);
  const fundByDay = dayFundCents(streak.days, weeks, records, config);
  const days = streak.days.map((d) => ({ ...d, xp: xp.byDay.get(d.date) ?? 0, fundCents: fundByDay.get(d.date) ?? 0 }));

  const currentWeek = weeks.find((w) => w.isCurrent) ?? null;
  const todayInfo = days.find((d) => d.isToday) ?? null;

  const reserveUsed = reserveBreakDays(records, config).size;
  const reserveLeft = Math.max(0, config.reserveBreaks - reserveUsed);

  return {
    now: now.toISOString(),
    today,
    phase,
    dayIndex: dayIndexOf(today, config),
    days,
    weeks,
    currentWeek,
    todayInfo,
    yesterdayMissedUnprotected: streak.yesterdayMissedUnprotected,
    streak: { current: streak.current, best: streak.best, shields: streak.shields },
    xp: {
      total: xp.total,
      byAttr: xp.byAttr,
      level: xp.level,
      title: xp.title,
      levelStartXp: xp.levelStartXp,
      nextLevelXp: xp.nextLevelXp,
    },
    grade: computeGrade(days, config, today, phase === 'after'),
    fund: computeFund(weeks, records, config),
    chests: computeChests({ config, today, days, weeks, streakTimeline: streak.timeline }),
    courses: courses.courses,
    currentCourseSlug: courses.currentCourseSlug,
    nextLesson: courses.nextLesson,
    queueProjectedEnd: courses.queueProjectedEnd,
    queueEndsBeforeSeason: courses.queueEndsBeforeSeason,
    medals: courses.medals,
    breaks: {
      reserveUsed,
      reserveLeft,
      canUseToday: phase === 'active' && reserveLeft > 0 && todayInfo !== null && todayInfo.breakKind === null,
    },
    timer: timer ? timerView(timer, now, config.timer) : null,
    status: computeStatus({
      config,
      phase,
      today,
      todayInfo,
      currentWeek,
      yesterdayMissedUnprotected: streak.yesterdayMissedUnprotected,
    }),
  };
}
