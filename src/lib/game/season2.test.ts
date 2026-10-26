import { describe, expect, it } from 'vitest';
import { baseCatalog, mergeCatalog } from '@/config/catalog';
import { season2 } from '@/config/season2';
import { addDays } from '@/lib/time';
import type { CatalogCourse, ForjaRecord, RescueChallengeConfig, SeasonConfig } from '@/lib/types';
import { computeGameState } from './index';
import { rescueDraw } from './rescue';
import { at, cardio, count, dayOf, game, gym, study, superCardio, task, work } from './test-helpers';

// semana 1 da temporada 2: segunda 19/10 a domingo 25/10 (domingo é folga)
const MON = '2026-10-19';
const SAT = '2026-10-24';
const AWS = 'aws-cloud-practitioner';
const DAPIA = 'desenvolvimento-assistido-por-ia';

const s2study = (day: string, minutes: number, courseSlug = DAPIA, lessonIds: number[] = []): ForjaRecord => ({
  ...study(day, minutes, { courseSlug, lessonIds }),
  seasonId: 's2',
});

/** Um dia cheio: 6 pomodoros de 40 min, divididos entre dois cursos e o projeto. */
function fullDay(day: string, extra: Partial<Record<'estudo' | 'aws' | 'projeto', number>> = {}): ForjaRecord[] {
  const m = (id: 'estudo' | 'aws' | 'projeto', base: number) => base + (extra[id] ?? 0);
  const out: ForjaRecord[] = [];
  if (m('estudo', 80) > 0) out.push(s2study(day, m('estudo', 80)));
  if (m('aws', 80) > 0) out.push(s2study(day, m('aws', 80), AWS));
  if (m('projeto', 80) > 0) out.push(work(day, 'projeto', m('projeto', 80)));
  return out;
}

/** Treinos, cardios e contadores que vencem a semana 1. */
function week1Extras(): ForjaRecord[] {
  return [
    gym('2026-10-19'),
    gym('2026-10-20'),
    gym('2026-10-21'),
    gym('2026-10-22'),
    cardio('2026-10-19'),
    cardio('2026-10-20'),
    cardio('2026-10-21'),
    cardio('2026-10-22'),
    superCardio('2026-10-23'),
    count('2026-10-19', 'contatos', 20),
    count('2026-10-20', 'candidaturas', 20),
    count('2026-10-21', 'posts', 3),
  ];
}

function perfectWeek1(): ForjaRecord[] {
  const out: ForjaRecord[] = [];
  for (let d = MON; d <= SAT; d = addDays(d, 1)) out.push(...fullDay(d));
  out.push(...week1Extras());
  return out;
}

const s2game = (records: ForjaRecord[], now: Date, config: SeasonConfig = season2, custom: CatalogCourse[] = []) =>
  computeGameState(records, null, config, now, { catalog: mergeCatalog(custom) });

describe('temporada 2: 6 pomodoros de foco por dia', () => {
  it('começa em 19/10, tem domingo de folga e 10 semanas', () => {
    const g = game([], at(MON), season2);
    expect(g.dayIndex).toBe(1);
    expect(g.weeks).toHaveLength(10);
    expect(g.weeks[9]).toMatchObject({ isFinal: true, start: '2026-12-21', end: '2026-12-23' });
    expect(dayOf(g, '2026-10-25').breakKind).toBe('planned');
    expect(g.weeks[0].daysRequired).toBe(6);
  });

  it('segunda a sábado pedem 6 pomodoros de 40 min (4h), somando estudo e projeto', () => {
    const g = game([], at(MON), season2);
    expect(dayOf(g, MON).goalMinutes).toBe(240);
    expect(dayOf(g, SAT).goalMinutes).toBe(240);
    expect(season2.blocks.map((b) => [b.id, b.includes])).toEqual([['foco', ['estudo', 'projeto']]]);
    expect(season2.timer).toMatchObject({ pomodoroFocus: 40, pomodoroBreak: 10 });
    expect(season2.counters.map((c) => [c.id, c.weekTarget])).toEqual([
      ['contatos', 20],
      ['candidaturas', 20],
      ['posts', 3],
    ]);
    expect(g.weeks[0]).toMatchObject({ gymTarget: 4, cardioTarget: 5, superRequired: true });
  });

  it('dá para dividir como quiser: só estudo, só projeto ou os dois', () => {
    const onlyStudy = game([s2study(MON, 240)], at(MON, '22:00'), season2);
    expect(dayOf(onlyStudy, MON)).toMatchObject({ dayMet: true, workMinutes: 240 });
    const onlyProject = game([work(MON, 'projeto', 240)], at(MON, '22:00'), season2);
    expect(dayOf(onlyProject, MON).dayMet).toBe(true);
    const split = game(fullDay(MON), at(MON, '22:00'), season2);
    expect(dayOf(split, MON)).toMatchObject({ dayMet: true, sourceMinutes: { estudo: 160, projeto: 80 } });
  });

  it('com menos de 6 pomodoros o dia fica em aberto', () => {
    const g = game(fullDay(MON, { projeto: -80 }), at(MON, '22:00'), season2);
    expect(dayOf(g, MON)).toMatchObject({ dayMet: false, workMinutes: 160, heat: 1 });
    expect(g.status.reasons).toContain('Faltam 80 min de foco hoje.');
  });

  it('a compensação na semana vale para o foco somado', () => {
    const tue = addDays(MON, 1);
    const records = [...fullDay(MON, { projeto: -80 }), ...fullDay(tue, { estudo: 80 })];
    const g = game(records, at(addDays(MON, 2)), season2);
    expect(dayOf(g, MON).dayRedeemed).toBe(true);
  });

  it('o chefe pede os 6 dias e as metas da semana', () => {
    const g = game(perfectWeek1(), at('2026-10-26'), season2);
    expect(g.weeks[0]).toMatchObject({ daysMet: 6, bossDefeated: true });
    const noPosts = perfectWeek1().filter((r) => !(r.kind === 'count' && r.data.counter === 'posts'));
    expect(game(noPosts, at('2026-10-26'), season2).weeks[0].bossDefeated).toBe(false);
  });

  it('a semana final, parcial, pede a parte proporcional dos contadores', () => {
    const g = game([], at('2026-12-21'), season2);
    expect(g.weeks[9].counters.map((c) => c.target)).toEqual([9, 9, 2]);
  });

  it('XP: o foco vai para Inteligência, com teto diário; os contadores, para Influência', () => {
    const g = game([...fullDay(MON), count(MON, 'candidaturas', 2), count(MON, 'contatos', 5)], at(MON, '22:00'), season2);
    expect(g.xp.byAttr.inteligencia).toBe(240);
    expect(g.xp.byAttr.influencia).toBe(2 * 10 + 5 * 10);
    const long = game(fullDay(MON, { projeto: 400 }), at(MON, '23:00'), season2);
    expect(long.xp.byAttr.inteligencia).toBe(season2.xp.workDailyCap);
  });

  it('tarefa concluída rende XP no dia em que foi feita', () => {
    const tasks = [task('Atualizar o currículo', MON), task('Montar a landing do SaaS')];
    const g = game([], at(MON, '20:00'), season2, null, tasks);
    expect(g.xp.total).toBe(season2.xp.task);
    expect(g.tasks.open.map((t) => t.title)).toEqual(['Montar a landing do SaaS']);
  });
});

describe('temporada 2: dois cursos ao mesmo tempo', () => {
  it('o curso de AWS da Udemy está no catálogo, com links para cada aula', () => {
    const aws = baseCatalog.courses.find((c) => c.slug === AWS)!;
    expect(aws).toMatchObject({ platform: 'Udemy' });
    const lessons = aws.modules.flatMap((m) => m.lessons);
    expect(lessons.length).toBe(225);
    const g = s2game([], at(MON));
    const course = g.courses.find((c) => c.slug === AWS)!;
    expect(course.nextLesson).toMatchObject({
      title: 'Boas Vindas ao Curso',
      url: 'https://www.udemy.com/course/certificacao-amazon-aws-cloud-practitioner-clf-c02/learn/lecture/51831841',
    });
    const quiz = course.modules.find((m) => m.name === 'Simulados do Exame')!.lessons[0];
    expect(quiz.url).toContain('/learn/quiz/6243112');
  });

  it('cada curso tem a sua próxima aula e o seu progresso', () => {
    const firstAws = baseCatalog.courses.find((c) => c.slug === AWS)!.modules[0].lessons.slice(0, 2).map(([id]) => id);
    const g = s2game([s2study(MON, 80, AWS, firstAws)], at(MON, '22:00'));
    const aws = g.courses.find((c) => c.slug === AWS)!;
    expect(aws.doneLessons).toBe(2);
    expect(aws.nextLesson?.title).toBe('Sobre o Exame CLF-C02');
    const dapia = g.courses.find((c) => c.slug === DAPIA)!;
    expect(dapia.nextLesson?.courseSlug).toBe(DAPIA);
  });

  it('cursos adicionados no app entram depois da fila', () => {
    const custom: CatalogCourse = {
      slug: 'docker-na-pratica',
      name: 'Docker na prática',
      custom: true,
      url: 'https://exemplo.com/docker',
      modules: [{ name: 'Aulas', min: 30, lessons: [[900000001, 'Instalando', 10], [900000002, 'Primeiro container', 20]] }],
    };
    const g = s2game([s2study(MON, 30, 'docker-na-pratica', [900000001])], at(MON, '22:00'), season2, [custom]);
    const c = g.courses.at(-1)!;
    expect(c).toMatchObject({ slug: 'docker-na-pratica', custom: true, doneLessons: 1 });
    expect(c.nextLesson).toMatchObject({ title: 'Primeiro container', url: 'https://exemplo.com/docker' });
  });
});

describe('temporada 2: resgate', () => {
  const only = (challenge: RescueChallengeConfig): SeasonConfig => ({ ...season2, rescue: { challenges: [challenge] } });

  it('contador: soma o que foi registrado no dia do evento', () => {
    const config = only({ id: 'c', title: 'Enviar {n} candidaturas', description: '', kind: 'counter', counter: 'candidaturas', base: 8, step: 1 });
    const day = rescueDraw(1, config)!.day;
    const g = game([count(day, 'candidaturas', 5), count(day, 'candidaturas', 3)], at(day, '20:00'), config);
    expect(g.rescue).toMatchObject({ weekIndex: 1, amount: 8, progress: 8, state: 'done', title: 'Enviar 8 candidaturas' });
    expect(g.weeks[0]).toMatchObject({ bossDefeated: true, bossRescued: true });
  });

  it('foco extra: pede os 6 pomodoros do dia e mais o extra, somando estudo e projeto', () => {
    const challenge = season2.rescue.challenges.find((c) => c.id === 'foco-extra')!;
    const config = only(challenge);
    const day = rescueDraw(1, config)!.day;
    const g = game([s2study(day, 200), work(day, 'projeto', 120)], at(day, '22:00'), config);
    expect(g.rescue).toMatchObject({ target: 240 + 80, progress: 320, state: 'done' });
  });
});
