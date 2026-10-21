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
 * Temporada 2: Operação Recomeço. Metas diárias de 1h de estudo e 1h de projeto/SaaS (segunda a
 * sábado, domingo de folga), até a viagem. Prospecção, vagas e LinkedIn não têm bloco de tempo:
 * contam pelas metas da semana (contatos, candidaturas e posts), junto com treinos e cardios.
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
    { id: 'estudo', name: 'Estudo', phrase: 'estudo', icon: 'icone-livro', minutes: [60, 60, 60, 60, 60, 60, 0], attr: 'inteligencia' },
    { id: 'projeto', name: 'Projeto/SaaS', phrase: 'projeto', icon: 'icone-ampulheta', minutes: [60, 60, 60, 60, 60, 60, 0], attr: 'inteligencia' },
  ],
  // metas da semana (o chefe pede todas, além de 4 treinos e 5 cardios com 1 supercardio)
  counters: [
    { id: 'contatos', name: 'Contatos de prospecção', unit: ['contato', 'contatos'], weekTarget: 20, steps: [1, 5], xp: 10, attr: 'influencia' },
    { id: 'candidaturas', name: 'Candidaturas', unit: ['candidatura', 'candidaturas'], weekTarget: 20, steps: [1], xp: 10, attr: 'influencia' },
    { id: 'posts', name: 'Posts no LinkedIn', unit: ['post', 'posts'], weekTarget: 3, steps: [1], xp: 40, attr: 'influencia' },
  ],
  features: { fund: false, chests: false },
  xp: {
    ...season1.xp,
    // um dia cumprido rende ~120 XP de blocos; o teto deixa 2h a mais valerem
    workDailyCap: 240,
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
