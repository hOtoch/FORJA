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

/**
 * Temporada 2: Operação Recomeço. Rotina de 6h30 nos dias úteis (prospecção, vagas, estudo e
 * projeto/SaaS), sábado mais leve e domingo de folga, até a viagem. O LinkedIn não tem bloco de
 * tempo: conta só pelos posts da semana (contador).
 * O dia só conta como cumprido quando todos os blocos batem a meta (com compensação na semana).
 */
export const season2: SeasonConfig = {
  ...season1,
  id: 's2',
  name: 'Operação Recomeço',
  start: START,
  end: END,
  plannedBreaks: sundays(START, END),
  reserveBreaks: 2,
  // minutos de segunda a domingo
  blocks: [
    { id: 'prospeccao', name: 'Prospecção', phrase: 'prospecção', icon: 'bolsa', minutes: [120, 120, 120, 120, 120, 0, 0], attr: 'influencia' },
    { id: 'vagas', name: 'Vagas', phrase: 'vagas', icon: 'icone-escudo', minutes: [90, 90, 90, 90, 90, 0, 0], attr: 'influencia' },
    { id: 'estudo', name: 'Estudo', phrase: 'estudo', icon: 'icone-livro', minutes: [120, 120, 120, 120, 120, 0, 0], attr: 'inteligencia' },
    { id: 'projeto', name: 'Projeto/SaaS', phrase: 'projeto', icon: 'icone-ampulheta', minutes: [60, 60, 60, 60, 60, 120, 0], attr: 'inteligencia' },
  ],
  counters: [
    { id: 'contatos', name: 'Contatos de prospecção', unit: ['contato', 'contatos'], weekTarget: 100, steps: [1, 5], xp: 2, attr: 'influencia' },
    { id: 'candidaturas', name: 'Candidaturas', unit: ['candidatura', 'candidaturas'], weekTarget: 20, steps: [1], xp: 10, attr: 'influencia' },
    { id: 'posts', name: 'Posts no LinkedIn', unit: ['post', 'posts'], weekTarget: 3, steps: [1], xp: 40, attr: 'influencia' },
  ],
  features: { fund: false, chests: false },
  xp: {
    ...season1.xp,
    // um dia cheio rende ~500 XP; o teto deixa 2h a mais valerem
    workDailyCap: 600,
    boss: 150,
    task: 25,
  },
  // ~600 XP por dia: nível 12 perto do fim da temporada
  levelXp: (n) => 250 * n * (n + 1),
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
        id: 'estudo-extra',
        title: 'Estudar {n} min a mais',
        description: 'Some {total} min de estudo no dia do evento: a meta do dia e mais {n} min.',
        kind: 'block-minutes',
        block: 'estudo',
        base: 60, // 60 → 150 min a mais
        step: 10,
        max: 150,
      },
      {
        id: 'projeto-extra',
        title: 'Projeto: {n} min a mais',
        description: 'Some {total} min no projeto/SaaS no dia do evento: a meta do dia e mais {n} min.',
        kind: 'block-minutes',
        block: 'projeto',
        base: 60, // 60 → 150 min a mais
        step: 10,
        max: 150,
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
        description: 'Registre {n} contatos de prospecção no dia do evento (o normal é uns 20).',
        kind: 'counter',
        counter: 'contatos',
        base: 35, // 35 → 60 contatos
        step: 3,
        max: 60,
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
