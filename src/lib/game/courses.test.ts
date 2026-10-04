import { describe, expect, it } from 'vitest';
import { courseCatalog, season1 } from '@/config/season1';
import { addDays } from '@/lib/time';
import type { CourseCatalog, SeasonConfig } from '@/lib/types';
import { computeCourses, defaultPace } from './courses';
import { FIRST_COURSE, at, game, study } from './test-helpers';

const firstCourse = courseCatalog.courses.find((c) => c.slug === FIRST_COURSE)!;
const initial = new Set(season1.courses.initialCompleted[FIRST_COURSE]);
const remainingFirstCourseIds = firstCourse.modules.flatMap((m) => m.lessons.map(([id]) => id)).filter((id) => !initial.has(id));

describe('cursos: estado inicial', () => {
  const g = game([], at('2026-10-05'));

  it('o primeiro curso tem o módulo 1 e a aula 1 do módulo 2 concluídos', () => {
    const c = g.courses[0];
    expect(c.slug).toBe(FIRST_COURSE);
    expect(c.modules[0]).toMatchObject({ completed: true, done: 10, total: 10 });
    expect(c.modules[1]).toMatchObject({ completed: false, done: 1, total: 3 });
    expect(c.modules[1].lessons.map((l) => l.done)).toEqual([true, false, false]);
    expect(c.doneLessons).toBe(11);
    expect(c.completed).toBe(false);
  });

  it('os outros dois cursos estão do zero', () => {
    expect(g.courses.map((c) => c.slug)).toEqual(season1.courses.queue);
    expect(g.courses[1].doneLessons).toBe(0);
    expect(g.courses[2].doneLessons).toBe(0);
  });

  it('aula de 0 min conta como 8 nos minutos', () => {
    const c = g.courses[0];
    const raw = firstCourse.modules.flatMap((m) => m.lessons);
    const expected = raw.reduce((s, [, , min]) => s + (min > 0 ? min : 8), 0);
    expect(c.totalMinutes).toBe(expected);
    // módulo 1: 62 min com 2 aulas sem duração (+16), mais a aula 990 (5 min)
    expect(c.doneMinutes).toBe(62 + 16 + 5);
    // a aula guarda a duração da plataforma
    expect(c.modules[0].lessons[0].minutes).toBe(0);
  });

  it('a próxima aula é a primeira pendente do curso atual, com a URL', () => {
    expect(g.currentCourseSlug).toBe(FIRST_COURSE);
    expect(g.nextLesson).toEqual({
      courseSlug: FIRST_COURSE,
      id: 991,
      title: '02 - Techspec e PRD',
      minutes: 5,
      url: 'https://plataforma.pythonando.com.br/membros/curso/desenvolvimento-assistido-por-ia?atual_aula_curso=991',
    });
  });

  it('sem conclusões na temporada não há medalhas nem XP', () => {
    expect(g.medals).toEqual([]);
    expect(g.xp.total).toBe(0);
  });
});

describe('cursos: conclusões', () => {
  it('concluir a última aula do módulo conclui o módulo e rende 50 XP', () => {
    const g = game([study('2026-10-06', 60, { lessonIds: [991, 992] })], at('2026-10-07'));
    expect(g.courses[0].modules[1].completed).toBe(true);
    expect(g.xp.byAttr.inteligencia).toBe(60 + 50);
    expect(g.nextLesson?.id).toBe(firstCourse.modules[2].lessons[0][0]);
  });

  it('a aula concluída conta uma vez só', () => {
    const g = game(
      [study('2026-10-06', 30, { lessonIds: [991, 992] }), study('2026-10-07', 30, { lessonIds: [992, 990] })],
      at('2026-10-08'),
    );
    expect(g.xp.byAttr.inteligencia).toBe(30 + 30 + 50);
  });

  it('concluir o curso rende 50 por módulo, 200 pelo curso e uma medalha', () => {
    const g = game([study('2026-10-06', 60, { lessonIds: remainingFirstCourseIds })], at('2026-10-07'));
    expect(g.courses[0].completed).toBe(true);
    expect(g.courses[0].projectedEnd).toBeNull();
    expect(g.xp.byAttr.inteligencia).toBe(60 + 7 * 50 + 200);
    expect(g.medals).toEqual([FIRST_COURSE]);
    expect(g.currentCourseSlug).toBe('python-full-ai-profissional');
    expect(g.nextLesson?.courseSlug).toBe('python-full-ai-profissional');
  });

  it('curso concluído fora da temporada rende XP, mas não medalha', () => {
    const g = game([study('2026-10-04', 60, { lessonIds: remainingFirstCourseIds })], at('2026-10-05'));
    expect(g.xp.byAttr.inteligencia).toBe(60 + 7 * 50 + 200);
    expect(g.medals).toEqual([]);
  });
});

// Catálogo pequeno para conferir ritmo e previsão com números redondos
const catalog: CourseCatalog = {
  courses: [
    {
      slug: 'a',
      name: 'Curso A',
      modules: [
        { name: 'A1', min: 0, lessons: [[1, 'a1', 30], [2, 'a2', 30], [3, 'a3', 0]] },
        { name: 'A2', min: 0, lessons: [[4, 'a4', 40]] },
      ],
    },
    { slug: 'b', name: 'Curso B', modules: [{ name: 'B1', min: 0, lessons: [[10, 'b1', 100], [11, 'b2', 100]] }] },
  ],
};
const cfg: SeasonConfig = { ...season1, courses: { ...season1.courses, queue: ['a', 'b'], initialCompleted: {} } };
const s = (day: string, lessonIds: number[]) => study(day, 60, { courseSlug: lessonIds[0] >= 10 ? 'b' : 'a', lessonIds });

describe('cursos: ritmo e previsão', () => {
  it('com menos de 3 sessões supõe 1,5 min de estudo por min de vídeo (40 por dia)', () => {
    expect(defaultPace(cfg)).toBe(40);
    const r = computeCourses([s('2026-10-19', [1])], catalog, cfg, '2026-10-20');
    expect(r.pace).toBe(40);
    // A: 108 no total, 30 feitos → 78 restantes → 2 dias; B: 78 + 200 = 278 → 7 dias
    expect(r.courses.map((c) => c.projectedEnd)).toEqual(['2026-10-22', '2026-10-27']);
    expect(r.queueProjectedEnd).toBe('2026-10-27');
    expect(r.queueEndsBeforeSeason).toBe(true);
  });

  it('com 3 sessões ou mais usa os minutos de vídeo dos últimos 14 dias', () => {
    const records = [s('2026-10-15', [1]), s('2026-10-16', [2]), s('2026-10-17', [3])];
    const r = computeCourses(records, catalog, cfg, '2026-10-20');
    expect(r.pace).toBeCloseTo((30 + 30 + 8) / 14, 10);
    const pace = (30 + 30 + 8) / 14;
    expect(r.courses[0].projectedEnd).toBe(addDays('2026-10-20', Math.ceil(40 / pace)));
    expect(r.courses[1].projectedEnd).toBe(addDays('2026-10-20', Math.ceil(240 / pace)));
  });

  it('no começo da temporada a janela é só dos dias decorridos', () => {
    const records = [s('2026-10-05', [1]), s('2026-10-06', [2]), s('2026-10-07', [3])];
    const r = computeCourses(records, catalog, cfg, '2026-10-07');
    expect(r.pace).toBeCloseTo(68 / 3, 10);
  });

  it('sessões antes da temporada contam a partir do primeiro registro', () => {
    const records = [s('2026-10-01', [1]), s('2026-10-02', [2]), s('2026-10-03', [3])];
    const r = computeCourses(records, catalog, cfg, '2026-10-03');
    expect(r.pace).toBeCloseTo(68 / 3, 10);
  });

  it('sem aula concluída na janela volta ao ritmo padrão', () => {
    const records = [s('2026-10-05', [1]), s('2026-10-06', [2]), s('2026-10-07', [3])];
    const r = computeCourses(records, catalog, cfg, '2026-11-01');
    expect(r.pace).toBe(40);
  });

  it('avisa só quando a fila termina antes de 23/12', () => {
    const slow: CourseCatalog = {
      courses: [{ slug: 'a', name: 'Longo', modules: [{ name: 'M', min: 0, lessons: [[1, 'x', 5000]] }] }],
    };
    const r = computeCourses([], slow, { ...cfg, courses: { ...cfg.courses, queue: ['a'] } }, '2026-10-20');
    expect(r.queueProjectedEnd).toBe(addDays('2026-10-20', 125));
    expect(r.queueEndsBeforeSeason).toBe(false);
  });

  it('fila toda concluída: sem curso atual, sem próxima aula e com aviso', () => {
    const r = computeCourses([s('2026-10-06', [1, 2, 3, 4]), s('2026-10-07', [10, 11])], catalog, cfg, '2026-10-08');
    expect(r.currentCourseSlug).toBeNull();
    expect(r.nextLesson).toBeNull();
    expect(r.queueProjectedEnd).toBeNull();
    expect(r.queueEndsBeforeSeason).toBe(true);
    expect(r.medals).toEqual(['a', 'b']);
    expect(r.events.map((e) => `${e.kind}:${e.name}`)).toEqual([
      'module:A1',
      'module:A2',
      'course:Curso A',
      'module:B1',
      'course:Curso B',
    ]);
  });
});
