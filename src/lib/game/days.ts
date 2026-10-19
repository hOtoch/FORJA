// Os dias da temporada: blocos da rotina, contadores, treino, cardio, folga e calor
// (data-model.md, "Calor do dia").

import { isSuperCardio } from '@/lib/cardio';
import { daysBetween, seasonDays, seasonWeeks, weekdayOf } from '@/lib/time';
import type { BlockConfig, DayInfo, ForjaRecord, Heat, SeasonConfig } from '@/lib/types';

export type Phase = 'before' | 'active' | 'after';

export function phaseOf(today: string, config: Pick<SeasonConfig, 'start' | 'end'>): Phase {
  if (today < config.start) return 'before';
  if (today > config.end) return 'after';
  return 'active';
}

/** 1..80 durante a temporada; null fora dela. */
export function dayIndexOf(today: string, config: Pick<SeasonConfig, 'start' | 'end'>): number | null {
  return phaseOf(today, config) === 'active' ? daysBetween(config.start, today) + 1 : null;
}

export function inSeason(day: string, config: Pick<SeasonConfig, 'start' | 'end'>): boolean {
  return day >= config.start && day <= config.end;
}

export interface DayTotals {
  studyMinutes: number;
  /** Minutos por bloco (o estudo de cursos entra como `estudo`). */
  blockMinutes: Record<string, number>;
  counts: Record<string, number>;
  gym: number;
  cardio: number;
  cardioMinutes: number;
  superCardio: number;
}

/** Bloco do estudo de cursos: recebe os StudyRecord. */
export const STUDY_BLOCK = 'estudo';

const emptyTotals = (): DayTotals => ({
  studyMinutes: 0,
  blockMinutes: {},
  counts: {},
  gym: 0,
  cardio: 0,
  cardioMinutes: 0,
  superCardio: 0,
});

const bump = (m: Record<string, number>, k: string, n: number) => {
  m[k] = (m[k] ?? 0) + n;
};

/** Soma estudo, blocos, contadores, treinos e cardios por dia do jogo (dentro ou fora da temporada). */
export function totalsByDay(records: ForjaRecord[], config: SeasonConfig): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>();
  const get = (day: string) => {
    let t = map.get(day);
    if (!t) {
      t = emptyTotals();
      map.set(day, t);
    }
    return t;
  };
  for (const r of records) {
    switch (r.kind) {
      case 'study': {
        const t = get(r.day);
        const m = Math.max(0, r.data.minutes);
        t.studyMinutes += m;
        bump(t.blockMinutes, STUDY_BLOCK, m);
        break;
      }
      case 'work':
        bump(get(r.day).blockMinutes, r.data.block, Math.max(0, r.data.minutes));
        break;
      case 'count':
        bump(get(r.day).counts, r.data.counter, Math.max(0, r.data.amount));
        break;
      case 'gym':
        get(r.day).gym += 1;
        break;
      case 'cardio': {
        const t = get(r.day);
        t.cardio += 1;
        t.cardioMinutes += Math.max(0, r.data.minutes);
        // supercardio pela regra (modalidade e minutos), não pelo que foi gravado
        if (isSuperCardio(r.data.modality, r.data.minutes, config)) t.superCardio += 1;
        break;
      }
      default:
        break;
    }
  }
  return map;
}

/** Meta de um bloco num dia da semana (1 = segunda … 7 = domingo). */
export function blockGoal(block: BlockConfig, weekday: number): number {
  return block.minutes[weekday - 1] ?? 0;
}

/** Meta total do dia (soma dos blocos). */
export function dayGoalMinutes(weekday: number, config: SeasonConfig): number {
  return config.blocks.reduce((s, b) => s + blockGoal(b, weekday), 0);
}

/** Dias de folga de reserva (BreakRecord) dentro da temporada que não são folga planejada. */
export function reserveBreakDays(records: ForjaRecord[], config: SeasonConfig): Set<string> {
  const planned = new Set(config.plannedBreaks);
  const out = new Set<string>();
  for (const r of records) {
    if (r.kind === 'break' && inSeason(r.day, config) && !planned.has(r.day)) out.add(r.day);
  }
  return out;
}

/** Minutos acima da meta do dia que valem 1 ponto de calor. */
export const HEAT_BONUS_MINUTES = 60;

/**
 * Calor: null no futuro e em hoje/folga sem nada; 0 = passou sem nada; 1 = trabalhou, mas não
 * bateu todas as metas; 2 = cumpriu; 3 = cumpriu + 1 ponto; 4 = cumpriu + 2 ou mais pontos.
 * Pontos: 1h além da meta do dia, pelo menos 1 treino, pelo menos 1 cardio.
 */
export function dayHeat(
  d: Pick<DayInfo, 'isFuture' | 'isToday' | 'breakKind' | 'workMinutes' | 'goalMinutes' | 'dayMet' | 'gym' | 'cardio'>,
): Heat | null {
  if (d.isFuture) return null;
  if (d.workMinutes <= 0) return d.isToday || d.breakKind ? null : 0;
  if (!d.dayMet) return 1;
  const points =
    (d.workMinutes >= d.goalMinutes + HEAT_BONUS_MINUTES ? 1 : 0) + (d.gym > 0 ? 1 : 0) + (d.cardio > 0 ? 1 : 0);
  if (points >= 2) return 4;
  return points === 1 ? 3 : 2;
}

/**
 * Compensação de horas na semana, bloco a bloco: os minutos acima da meta de um bloco (e tudo o
 * que for feito em dia de folga) cobrem o mesmo bloco em dias fechados que ficaram sem a meta. Um
 * dia só é compensado quando todos os blocos que faltaram são cobertos. Os dias com o menor buraco
 * vêm primeiro, para salvar o maior número de dias. Hoje nunca é compensado (ainda dá para
 * cumprir), mas o que passar da meta hoje já compensa dias anteriores.
 */
export function redeemWeek(
  weekDays: Pick<DayInfo, 'date' | 'breakKind' | 'isFuture' | 'isToday' | 'dayMet' | 'blocks'>[],
): {
  redeemed: Set<string>;
  owedByBlock: Record<string, number>;
  owedMinutes: number;
  surplusMinutes: number;
} {
  const surplus: Record<string, number> = {};
  const gaps: { date: string; deficits: Record<string, number>; total: number }[] = [];
  for (const d of weekDays) {
    if (d.isFuture) continue;
    for (const b of d.blocks) {
      if (d.breakKind) bump(surplus, b.id, b.minutes);
      else if (b.minutes > b.goal) bump(surplus, b.id, b.minutes - b.goal);
    }
    if (d.breakKind || d.dayMet || d.isToday) continue;
    const deficits: Record<string, number> = {};
    let total = 0;
    for (const b of d.blocks) {
      if (b.minutes < b.goal) {
        deficits[b.id] = b.goal - b.minutes;
        total += b.goal - b.minutes;
      }
    }
    if (total > 0) gaps.push({ date: d.date, deficits, total });
  }
  gaps.sort((a, b) => a.total - b.total || (a.date < b.date ? -1 : 1));

  const redeemed = new Set<string>();
  const owed: Record<string, number> = {};
  for (const g of gaps) {
    const covered = Object.entries(g.deficits).every(([id, n]) => (surplus[id] ?? 0) >= n);
    if (covered) {
      for (const [id, n] of Object.entries(g.deficits)) surplus[id] -= n;
      redeemed.add(g.date);
    } else {
      for (const [id, n] of Object.entries(g.deficits)) bump(owed, id, n);
    }
  }
  // o que sobrou abate do que falta (não salva um dia sozinho, mas diminui a conta)
  const owedByBlock: Record<string, number> = {};
  let owedMinutes = 0;
  for (const [id, n] of Object.entries(owed)) {
    const paid = Math.min(surplus[id] ?? 0, n);
    surplus[id] = (surplus[id] ?? 0) - paid;
    if (n - paid > 0) {
      owedByBlock[id] = n - paid;
      owedMinutes += n - paid;
    }
  }
  const surplusMinutes = Object.values(surplus).reduce((a, b) => a + b, 0);
  return { redeemed, owedByBlock, owedMinutes, surplusMinutes };
}

/**
 * DayInfo dos dias da temporada. `shieldUsed`, `xp` e `fundCents` saem zerados aqui e são
 * preenchidos depois pelo motor (streak, xp e fund).
 */
export function buildDays(records: ForjaRecord[], config: SeasonConfig, today: string): DayInfo[] {
  const totals = totalsByDay(records, config);
  const planned = new Set(config.plannedBreaks);
  const reserve = reserveBreakDays(records, config);
  const weekOf = new Map<string, number>();
  for (const w of seasonWeeks(config)) for (const d of w.days) weekOf.set(d, w.index);

  const days: DayInfo[] = seasonDays(config).map((date, i) => {
    const t = totals.get(date) ?? emptyTotals();
    const weekday = weekdayOf(date);
    const breakKind: DayInfo['breakKind'] = planned.has(date) ? 'planned' : reserve.has(date) ? 'reserve' : null;
    const blocks = config.blocks.map((b) => {
      const minutes = t.blockMinutes[b.id] ?? 0;
      const goal = blockGoal(b, weekday);
      return { id: b.id, minutes, goal, met: minutes >= goal };
    });
    const workMinutes = Object.values(t.blockMinutes).reduce((a, b) => a + b, 0);
    const goalMinutes = blocks.reduce((s, b) => s + b.goal, 0);
    const base = {
      date,
      index: i + 1,
      weekIndex: weekOf.get(date) ?? 0,
      weekday,
      isFuture: date > today,
      isToday: date === today,
      breakKind,
      studyMinutes: t.studyMinutes,
      dayMet: goalMinutes > 0 ? blocks.every((b) => b.met) : workMinutes > 0,
      shieldUsed: false,
      dayRedeemed: false,
      blocks,
      workMinutes,
      goalMinutes,
      counts: { ...t.counts },
      gym: t.gym,
      cardio: t.cardio,
      cardioMinutes: t.cardioMinutes,
      superCardio: t.superCardio,
      xp: 0,
      fundCents: 0,
    };
    return { ...base, heat: dayHeat(base) };
  });

  for (const w of seasonWeeks(config)) {
    const { redeemed } = redeemWeek(days.filter((d) => d.weekIndex === w.index));
    for (const d of days) if (redeemed.has(d.date)) d.dayRedeemed = true;
  }
  return days;
}

/** Dia que conta como cumprido para a semana (chefe, Fundo e nota). */
export const dayCountsForWeek = (d: Pick<DayInfo, 'breakKind' | 'dayMet' | 'shieldUsed' | 'dayRedeemed'>) =>
  !d.breakKind && ((d.dayMet && !d.shieldUsed) || d.dayRedeemed);

/** Dia fechado = anterior a hoje. */
export const isClosedDay = (day: Pick<DayInfo, 'date'>, today: string) => day.date < today;
