import { addDays, weekdayOf } from '@/lib/time';
import type { SeasonConfig } from '@/lib/types';
import { season1 } from './season1';

const START = '2026-10-19';
const END = '2026-12-23';

/** Todo domingo é folga planejada: descanso e planejamento da semana. */
function sundays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (weekdayOf(d) === 7) out.push(d);
  return out;
}

/** Pomodoro da temporada 2: 40 min de foco e 10 de pausa. */
const FOCUS = 40;
const POMODOROS_PER_DAY = 6;
const DAY = FOCUS * POMODOROS_PER_DAY;

/**
 * Temporada 2: Operação Recomeço. Meta diária de 6 pomodoros de 40 min (4h) de foco, de segunda
 * a sábado (domingo de folga), divididos como você quiser entre os cursos e o projeto/SaaS.
 * Prospecção, vagas e LinkedIn não têm bloco de tempo: contam pelas metas da semana (contatos,
 * candidaturas e posts), junto com treinos e cardios.
 */
export const season2: SeasonConfig = {
  ...season1,
  id: 's2',
  name: 'Operação Recomeço',
  start: START,
  end: END,
  plannedBreaks: sundays(START, END),
  reserveBreaks: 2,
  // minutos de segunda a domingo: o bloco "Foco" soma o estudo (qualquer curso) e o projeto
  blocks: [
    {
      id: 'foco',
      includes: ['estudo', 'projeto'],
      pomodoros: true,
      name: 'Foco',
      phrase: 'foco',
      icon: 'icone-livro',
      minutes: [DAY, DAY, DAY, DAY, DAY, DAY, 0],
      attr: 'inteligencia',
    },
  ],
  // o que dá para cronometrar dentro do Foco
  sources: [
    { id: 'estudo', name: 'Estudo', phrase: 'estudo', icon: 'icone-livro' },
    { id: 'projeto', name: 'Projeto/SaaS', phrase: 'projeto', icon: 'icone-ampulheta' },
  ],
  timer: { ...season1.timer, pomodoroFocus: FOCUS, pomodoroBreak: 10 },
  courses: {
    ...season1.courses,
    // dois cursos ao mesmo tempo: a Pythonando atual e o de AWS da Udemy
    queue: ['desenvolvimento-assistido-por-ia', 'aws-cloud-practitioner', 'python-full-ai-profissional', 'python-full-ai-2025'],
    // metade do foco do dia em aulas, na previsão de término
    studyMinutesPerDay: DAY / 2,
  },
  // metas da semana (o chefe pede todas, além de 4 treinos e 5 cardios com 1 supercardio)
  counters: [
    { id: 'contatos', name: 'Contatos de prospecção', unit: ['contato', 'contatos'], weekTarget: 20, steps: [1, 5], xp: 10, attr: 'influencia' },
    { id: 'candidaturas', name: 'Candidaturas', unit: ['candidatura', 'candidaturas'], weekTarget: 20, steps: [1], xp: 10, attr: 'influencia' },
    { id: 'posts', name: 'Posts no LinkedIn', unit: ['post', 'posts'], weekTarget: 3, steps: [1], xp: 40, attr: 'influencia' },
  ],
  features: { fund: false, chests: false },
  xp: {
    ...season1.xp,
    // um dia cumprido rende 240 XP de foco; o teto deixa 2h a mais valerem
    workDailyCap: 360,
    boss: 150,
    task: 25,
  },
  // ~300 XP por dia (blocos, contadores, treino e cardio): nível 12 a 13 perto do fim da temporada
  levelXp: (n) => 100 * n * (n + 1),
  fund: {
    studyDayCents: 0,
    gymCents: 0,
    cardioCents: 0,
    bossCents: 0,
    finalBossCents: 0,
    clientBonusPct: 0,
    perfectCents: 0,
  },
  chests: [],
  // Os desafios endurecem a cada semana do mapa e pedem sempre algo além da rotina.
  rescue: {
    challenges: [
      {
        id: 'foco-extra',
        title: 'Foco: {n} min a mais',
        description: 'Some {total} min de foco (estudo ou projeto) no dia do evento: os 6 pomodoros e mais {n} min.',
        kind: 'block-minutes',
        block: 'foco',
        base: 80, // 2 → 4 pomodoros a mais
        step: 10,
        max: 160,
      },
      {
        id: 'cardio-longo',
        title: '{n} min de cardio',
        description: 'Some {n} min de cardio no dia do evento, bem além do supercardio de 1h.',
        kind: 'cardio-minutes',
        base: 90, // 90 → 150 min
        step: 6,
        max: 150,
      },
      {
        id: 'contatos-extra',
        title: 'Prospectar {n} contatos',
        description: 'Registre {n} contatos de prospecção no dia do evento (o normal é uns 4).',
        kind: 'counter',
        counter: 'contatos',
        base: 10, // 10 → 30 contatos
        step: 2,
        max: 30,
      },
      {
        id: 'candidaturas-extra',
        title: 'Enviar {n} candidaturas',
        description: 'Registre {n} candidaturas no dia do evento (o normal é umas 4).',
        kind: 'counter',
        counter: 'candidaturas',
        base: 8, // 8 → 15 candidaturas
        step: 1,
        max: 15,
      },
      {
        id: 'leitura',
        title: 'Ler {n} páginas',
        description: 'Leia {n} páginas de um livro no dia do evento.',
        kind: 'manual',
        base: 30, // 30 → 80 páginas
        step: 5,
        max: 80,
      },
    ],
  },
};
