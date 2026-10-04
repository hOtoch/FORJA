// Fila de cursos: aulas concluídas, progresso, próxima aula, ritmo e previsão de término.

import { addDays, daysBetween } from '@/lib/time';
import type {
  CourseCatalog,
  CourseProgress,
  ForjaRecord,
  GameState,
  NextLesson,
  SeasonConfig,
  StudyRecord,
} from '@/lib/types';
import { inSeason } from './days';

/** Módulo ou curso concluído por um registro (rende XP de Inteligência no dia do registro). */
export interface CourseEvent {
  day: string;
  kind: 'module' | 'course';
  courseSlug: string;
  /** Nome do módulo ou do curso. */
  name: string;
}

/** Aula sem duração na plataforma (0 min) conta como `missingDurationMin`. */
export function effectiveMinutes(raw: number, config: SeasonConfig): number {
  return raw > 0 ? raw : config.courses.missingDurationMin;
}

/** Ritmo padrão: meta diária de estudo ÷ minutos de estudo por minuto de vídeo (60 ÷ 1,5 = 40). */
export function defaultPace(config: SeasonConfig): number {
  return config.goals.studyMinutes / config.courses.defaultStudyPerVideo;
}

const byChronology = (a: StudyRecord, b: StudyRecord) =>
  a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export interface LessonHistory {
  /** Aulas concluídas por curso (initialCompleted ∪ lessonIds). */
  done: Map<string, Set<number>>;
  /** Aulas que cada registro concluiu pela primeira vez. */
  newBySession: { record: StudyRecord; lessons: { courseSlug: string; id: number; minutes: number }[] }[];
  events: CourseEvent[];
  /** Cursos com alguma aula concluída por um registro de dia da temporada. */
  touchedInSeason: Set<string>;
}

/** Repassa os StudyRecords em ordem e descobre quando cada aula, módulo e curso foi concluído. */
export function lessonHistory(records: ForjaRecord[], catalog: CourseCatalog, config: SeasonConfig): LessonHistory {
  const lessonIndex = new Map<number, { courseSlug: string; minutes: number }>();
  for (const c of catalog.courses) {
    for (const m of c.modules) for (const [id, , min] of m.lessons) lessonIndex.set(id, { courseSlug: c.slug, minutes: min });
  }
  const courseBySlug = new Map(catalog.courses.map((c) => [c.slug, c]));

  const done = new Map<string, Set<number>>();
  const doneOf = (slug: string) => {
    let s = done.get(slug);
    if (!s) {
      s = new Set();
      done.set(slug, s);
    }
    return s;
  };
  for (const [slug, ids] of Object.entries(config.courses.initialCompleted)) {
    for (const id of ids) doneOf(slug).add(id);
  }

  const moduleKey = (slug: string, i: number) => `${slug}#${i}`;
  const completedModules = new Set<string>();
  const completedCourses = new Set<string>();
  const refresh = (slug: string, day: string | null, events: CourseEvent[]) => {
    const course = courseBySlug.get(slug);
    if (!course) return;
    const set = doneOf(slug);
    let all = true;
    course.modules.forEach((m, i) => {
      const complete = m.lessons.every(([id]) => set.has(id));
      if (!complete) all = false;
      const key = moduleKey(slug, i);
      if (complete && !completedModules.has(key)) {
        completedModules.add(key);
        if (day) events.push({ day, kind: 'module', courseSlug: slug, name: m.name });
      }
    });
    if (all && course.modules.length > 0 && !completedCourses.has(slug)) {
      completedCourses.add(slug);
      if (day) events.push({ day, kind: 'course', courseSlug: slug, name: course.name });
    }
  };
  // o que já estava concluído antes da temporada não gera evento (nem XP)
  for (const c of catalog.courses) refresh(c.slug, null, []);

  const events: CourseEvent[] = [];
  const newBySession: LessonHistory['newBySession'] = [];
  const touchedInSeason = new Set<string>();
  const studies = records.filter((r): r is StudyRecord => r.kind === 'study').sort(byChronology);
  for (const r of studies) {
    const lessons: LessonHistory['newBySession'][number]['lessons'] = [];
    const affected = new Set<string>();
    for (const id of r.data.lessonIds ?? []) {
      const ref = lessonIndex.get(id);
      if (!ref) continue;
      const set = doneOf(ref.courseSlug);
      if (set.has(id)) continue;
      set.add(id);
      affected.add(ref.courseSlug);
      lessons.push({ courseSlug: ref.courseSlug, id, minutes: effectiveMinutes(ref.minutes, config) });
      if (inSeason(r.day, config)) touchedInSeason.add(ref.courseSlug);
    }
    newBySession.push({ record: r, lessons });
    for (const slug of affected) refresh(slug, r.day, events);
  }

  return { done, newBySession, events, touchedInSeason };
}

/**
 * Minutos de vídeo concluídos por dia. Com menos de `minSessionsForPace` sessões, usa o padrão (40).
 * Senão: minutos de vídeo das aulas concluídas nas sessões dos últimos N dias ÷ N, com
 * N = min(14, dias desde o início da temporada ou desde o primeiro registro, o que vier antes,
 * contando hoje). Se der 0, volta ao padrão.
 */
export function studyPace(history: LessonHistory, config: SeasonConfig, today: string): number {
  const fallback = defaultPace(config);
  const sessions = history.newBySession;
  if (sessions.length < config.courses.minSessionsForPace) return fallback;
  const firstDay = sessions.reduce((min, s) => (s.record.day < min ? s.record.day : min), sessions[0].record.day);
  const ref = firstDay < config.start ? firstDay : config.start;
  const n = Math.max(1, Math.min(config.courses.paceWindowDays, daysBetween(ref, today) + 1));
  const from = addDays(today, -(n - 1));
  let minutes = 0;
  for (const s of sessions) {
    if (s.record.day < from || s.record.day > today) continue;
    for (const l of s.lessons) minutes += l.minutes;
  }
  const pace = minutes / n;
  return pace > 0 ? pace : fallback;
}

export type CoursesState = Pick<
  GameState,
  'courses' | 'currentCourseSlug' | 'nextLesson' | 'queueProjectedEnd' | 'queueEndsBeforeSeason' | 'medals'
> & {
  events: CourseEvent[];
  /** Minutos de vídeo por dia usados na previsão. */
  pace: number;
};

export function computeCourses(
  records: ForjaRecord[],
  catalog: CourseCatalog,
  config: SeasonConfig,
  today: string,
): CoursesState {
  const history = lessonHistory(records, catalog, config);
  const pace = studyPace(history, config, today);
  const courseBySlug = new Map(catalog.courses.map((c) => [c.slug, c]));

  const courses: CourseProgress[] = [];
  let currentCourseSlug: string | null = null;
  let nextLesson: NextLesson | null = null;
  let remainingAcc = 0;
  let queueProjectedEnd: string | null = null;

  for (const slug of config.courses.queue) {
    const course = courseBySlug.get(slug);
    if (!course) continue;
    const set = history.done.get(slug) ?? new Set<number>();
    let totalLessons = 0;
    let doneLessons = 0;
    let totalMinutes = 0;
    let doneMinutes = 0;
    const modules = course.modules.map((m) => {
      const lessons = m.lessons.map(([id, title, minutes]) => ({ id, title, minutes, done: set.has(id) }));
      const doneCount = lessons.filter((l) => l.done).length;
      for (const l of lessons) {
        const eff = effectiveMinutes(l.minutes, config);
        totalLessons += 1;
        totalMinutes += eff;
        if (l.done) {
          doneLessons += 1;
          doneMinutes += eff;
        }
      }
      return { name: m.name, total: lessons.length, done: doneCount, completed: doneCount === lessons.length, lessons };
    });
    const completed = totalLessons > 0 && doneLessons === totalLessons;

    let projectedEnd: string | null = null;
    if (!completed) {
      remainingAcc += totalMinutes - doneMinutes;
      projectedEnd = addDays(today, Math.ceil(remainingAcc / pace));
      queueProjectedEnd = projectedEnd;
      if (!currentCourseSlug) {
        currentCourseSlug = slug;
        for (const m of modules) {
          const l = m.lessons.find((x) => !x.done);
          if (l) {
            nextLesson = {
              courseSlug: slug,
              id: l.id,
              title: l.title,
              minutes: l.minutes,
              url: config.courses.lessonUrl(slug, l.id),
            };
            break;
          }
        }
      }
    }

    courses.push({
      slug,
      name: course.name,
      totalLessons,
      doneLessons,
      totalMinutes,
      doneMinutes,
      modules,
      completed,
      projectedEnd,
    });
  }

  const allCompleted = courses.length > 0 && courses.every((c) => c.completed);
  const queueEndsBeforeSeason =
    queueProjectedEnd !== null ? queueProjectedEnd < config.end : allCompleted && today <= config.end;
  const medals = courses.filter((c) => c.completed && history.touchedInSeason.has(c.slug)).map((c) => c.slug);

  return {
    courses,
    currentCourseSlug,
    nextLesson,
    queueProjectedEnd,
    queueEndsBeforeSeason,
    medals,
    events: history.events,
    pace,
  };
}
