import type { CourseCatalog, SeasonConfig } from '@/lib/types';
import catalog from './courses.json';

export const courseCatalog = catalog as unknown as CourseCatalog;

/** Temporada 1: Operação Réveillon. Toda regra numérica do jogo mora aqui. */
export const season1: SeasonConfig = {
  id: 's1',
  name: 'Operação Réveillon',
  start: '2026-10-05',
  end: '2026-12-23',
  timeZone: 'America/Sao_Paulo',
  dayStartHour: 4,
  plannedBreaks: ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'],
  reserveBreaks: 2,
  goals: {
    studyMinutes: 60,
    gymPerWeek: 4,
    cardioPerWeek: 5,
    finalWeek: { gym: 2, cardio: 2, requireSuper: false },
    cardioMaxWithoutSuper: 4,
  },
  cardio: {
    minMinutes: 20,
    superMinutes: 60,
    superModalities: ['bicicleta', 'caminhada', 'esteira'],
    alwaysSuper: ['pelada'],
  },
  xp: {
    perStudyMinute: 1,
    studyDailyCap: 120,
    gym: 60,
    cardio: 20,
    superCardio: 60,
    module: 50,
    course: 200,
    boss: 100,
  },
  levelXp: (n) => 50 * n * (n + 1),
  titles: [
    [1, 'Aprendiz da forja'],
    [3, 'Malhador'],
    [6, 'Ferreiro'],
    [9, 'Armeiro'],
    [12, 'Mestre ferreiro'],
    [15, 'Lenda da forja'],
  ],
  shields: { initial: 1, max: 2 },
  grade: { S: 95, A: 85, B: 70 },
  fund: {
    studyDayCents: 500,
    gymCents: 1000,
    cardioCents: 500,
    bossCents: 3000,
    finalBossCents: 4500,
    clientBonusPct: 5,
    perfectCents: 150000,
  },
  chests: [
    {
      id: 1,
      kind: 'first-boss',
      condition: 'Derrotar o primeiro chefe',
      prize: 'Um jantar especial na viagem de 10/10',
    },
    {
      id: 2,
      kind: 'streak',
      threshold: 21,
      condition: '21 dias seguidos de estudo',
      prize: 'Um curso ou ferramenta para entregar para clientes',
    },
    {
      id: 3,
      kind: 'midpoint-grade',
      date: '2026-11-13',
      condition: 'Chegar à metade (13/11) com nota prevista A ou melhor',
      prize: 'Tênis ou roupa de treino',
    },
    {
      id: 4,
      kind: 'study-hours',
      threshold: 3000,
      condition: '50 horas de estudo',
      prize: 'A roupa do Réveillon',
    },
    {
      id: 5,
      kind: 'final-grade',
      date: '2026-12-23',
      condition: 'Nota final em 23/12',
      prize: 'S: R$ 300 a mais para uma experiência no Réveillon. A: R$ 150 a mais',
      prizes: {
        S: 'R$ 300 a mais para uma experiência no Réveillon',
        A: 'R$ 150 a mais para o Réveillon',
      },
    },
  ],
  courses: {
    queue: ['desenvolvimento-assistido-por-ia', 'python-full-ai-profissional', 'python-full-ai-2025'],
    initialCompleted: {
      'desenvolvimento-assistido-por-ia': [1037, 975, 976, 977, 978, 979, 986, 987, 984, 985, 990],
    },
    missingDurationMin: 8,
    defaultStudyPerVideo: 1.5,
    paceWindowDays: 14,
    minSessionsForPace: 3,
    lessonUrl: (slug, id) =>
      `https://plataforma.pythonando.com.br/membros/curso/${slug}?atual_aula_curso=${id}`,
  },
  timer: {
    presenceMinutes: 50,
    capMinutes: 180,
    pomodoroFocus: 25,
    pomodoroBreak: 5,
  },
};
