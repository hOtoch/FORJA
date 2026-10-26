// Formatação compartilhada pela interface (pt-BR, horário de Brasília).

import { season } from '@/config/season';
import { formatBRL } from '@/lib/cardio';
import { addDays, shortDate } from '@/lib/time';
import type { BlockConfig, CourseProgress, DayInfo, GameState, Heat, LessonProgress } from '@/lib/types';

const intFmt = new Intl.NumberFormat('pt-BR');
const hmFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: season.timeZone,
  hour: '2-digit',
  minute: '2-digit',
});

const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** 91.6666 → "91,7%" */
export function fmtPct(n: number): string {
  return `${pctFmt.format(n)}%`;
}

/** Data prevista: "27/12" no ano da temporada, "26/06/2027" fora dele. */
export function projDate(date: string): string {
  return date.slice(0, 4) === season.start.slice(0, 4) ? shortDate(date) : `${shortDate(date)}/${date.slice(0, 4)}`;
}

/** 1240 → "1.240" */
export function fmtInt(n: number): string {
  return intFmt.format(Math.round(n));
}

/** Instante ISO → "14:52" em Brasília. */
export function timeHM(iso: string | number): string {
  return hmFmt.format(new Date(iso));
}

/** "02 - Techspec e PRD" → "Techspec e PRD" */
export function lessonName(title: string): string {
  return title.replace(/^\s*\d+\s*-\s*/, '').trim();
}

/** 5 → "5 min"; 80 → "1 h 20 min"; 0 → "sem duração" */
export function minutesLabel(min: number): string {
  if (min <= 0) return 'sem duração';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Milissegundos → "42:10" ou "1:02:10". */
export function clockParts(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "42 minutos e 10 segundos" para leitores de tela. */
export function clockSpoken(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  return parts.join(' e ');
}

export const HEAT_NAMES: Record<Heat, string> = {
  0: 'Ferro frio',
  1: 'Cereja',
  2: 'Brasa',
  3: 'Palha',
  4: 'Incandescente',
};

export const WEEKDAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "12 de outubro" */
export function dayMonth(date: string): string {
  return `${Number(date.slice(8, 10))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${fmtInt(n)} ${n === 1 ? one : many}`;
}

/** Lista em português: "a", "a e b", "a, b e c". */
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function activities(day: DayInfo): string[] {
  const out: string[] = [];
  if (day.gym > 0) out.push(day.gym === 1 ? 'treino' : `${day.gym} treinos`);
  if (day.cardio > 0) {
    const label = day.superCardio > 0 ? 'supercardio' : 'cardio';
    out.push(day.cardio === 1 ? label : `${day.cardio} cardios`);
  }
  return out;
}

/** Nome do bloco da rotina ("Prospecção"). */
export function blockName(id: string): string {
  return (season.sources ?? []).find((s) => s.id === id)?.name ?? season.blocks.find((b) => b.id === id)?.name ?? id;
}

/** Bloco com meta em que a atividade conta (o "Foco" inclui estudo e projeto). */
export function blockOfSource(source: string): BlockConfig | undefined {
  return season.blocks.find((b) => (b.includes ?? [b.id]).includes(source));
}

/** "3 de 6 pomodoros" (blocos em pomodoros) ou "2h de 4h". */
export function blockProgressLabel(block: BlockConfig | undefined, minutes: number, goal: number): string {
  if (block?.pomodoros) {
    const focus = season.timer.pomodoroFocus;
    const done = Math.floor(minutes / focus);
    return goal > 0 ? `${done} de ${Math.round(goal / focus)} pomodoros` : `${done} ${done === 1 ? 'pomodoro' : 'pomodoros'}`;
  }
  return goal > 0 ? `${hoursLabel(minutes)} de ${hoursLabel(goal)}` : hoursLabel(minutes);
}

/** "1 candidatura", "3 candidaturas" */
export function counterAmount(id: string, n: number): string {
  const c = season.counters.find((x) => x.id === id);
  if (!c) return String(n);
  return `${fmtInt(n)} ${n === 1 ? c.unit[0] : c.unit[1]}`;
}

/** "2h", "1h30", "45 min" */
export function hoursLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, '0')}`;
}

/** O que um chefe derrotado rende, conforme o que a temporada usa. */
export function bossPrize(isFinal: boolean, rescued = false): string {
  const parts: string[] = [];
  if (!isFinal && !rescued) parts.push('1 escudo');
  parts.push(`${season.xp.boss} XP`);
  if (season.features.fund) {
    parts.push(`${formatBRL(isFinal ? season.fund.finalBossCents : season.fund.bossCents)} no Fundo`);
  }
  return joinPt(parts);
}

/** Estado do dia em palavras: "meta cumprida", "folga planejada"... */
export function dayState(day: DayInfo): string {
  if (day.breakKind === 'planned') return 'folga planejada';
  if (day.breakKind === 'reserve') return 'folga de reserva';
  if (day.isFuture) return 'por forjar';
  if (day.shieldUsed && !day.dayRedeemed) return 'salvo por escudo';
  if (day.dayMet) return 'meta cumprida';
  if (day.dayRedeemed) return 'compensado na semana';
  if (day.isToday) return day.workMinutes > 0 ? 'meta ainda não cumprida' : 'nada ainda';
  if (day.workMinutes > 0) return 'meta não cumprida';
  return 'dia vazio';
}

/** Dica do segmento: "seg, 12/10: 75 min de estudo, treino e cardio". */
export function dayTooltip(day: DayInfo): string {
  const head = `${WEEKDAY_SHORT[day.weekday - 1]}, ${shortDate(day.date)}`;
  if (day.isFuture) return `${head}: por forjar`;
  const parts: string[] = [];
  if (day.workMinutes > 0) parts.push(`${hoursLabel(day.workMinutes)} de foco`);
  parts.push(...activities(day));
  const prefix = day.breakKind ? 'folga' : day.shieldUsed ? 'salvo por escudo' : '';
  if (parts.length === 0) return `${head}: ${prefix || (day.isToday ? 'nada ainda' : 'dia vazio')}`;
  return `${head}: ${prefix ? `${prefix}, ` : ''}${joinPt(parts)}`;
}

/** Leitor de tela: "12 de outubro, meta cumprida, 75 minutos, treino, cardio". */
export function dayAriaLabel(day: DayInfo): string {
  const parts = [dayMonth(day.date)];
  if (day.isToday) parts.push('hoje');
  parts.push(dayState(day));
  if (!day.isFuture && day.workMinutes > 0) parts.push(`${day.workMinutes} minutos de foco`);
  if (!day.isFuture) parts.push(...activities(day));
  return parts.join(', ');
}

/** Por que o dia tem esse calor. */
export function heatReason(day: DayInfo): string {
  if (day.isFuture) return 'Por forjar. Este dia ainda não chegou.';
  if (day.breakKind === 'planned')
    return 'Folga planejada. Não mexe na sequência e não entra na nota nem no Fundo.';
  if (day.breakKind === 'reserve')
    return 'Folga de reserva. Não mexe na sequência e não entra na nota nem no Fundo.';
  if (day.shieldUsed && !day.dayRedeemed)
    return 'Ferro frio, salvo por escudo. A sequência continuou, mas o dia não conta na nota nem para o chefe.';
  if (day.heat === null) return 'Hoje ainda não tem registro. O segmento esquenta com o primeiro bloco.';
  if (day.heat === 0) return 'Ferro frio: o dia passou sem nada registrado.';
  if (day.heat === 1) {
    const missing = day.blocks.filter((b) => !b.met).map((b) => `${blockName(b.id)} (${b.minutes} de ${b.goal} min)`);
    const tail = day.dayRedeemed ? ' Compensado com minutos a mais em outro dia da semana.' : '';
    return `Cereja: ${hoursLabel(day.workMinutes)} de foco, mas faltou ${joinPt(missing)}.${tail}`;
  }
  const points: string[] = [];
  if (day.workMinutes >= day.goalMinutes + 60) points.push('1h além da meta');
  if (day.gym > 0) points.push('treino');
  if (day.cardio > 0) points.push('cardio');
  if (day.heat === 2) return 'Brasa: todas as metas do dia cumpridas.';
  if (day.heat === 3) return `Palha: metas do dia e mais 1 ponto de calor (${joinPt(points)}).`;
  return `Incandescente: metas do dia e mais ${points.length} pontos de calor (${joinPt(points)}).`;
}

/** Aulas ainda não concluídas de um curso, na ordem, com o módulo (1-based). */
export function pendingLessons(course: CourseProgress | undefined): (LessonProgress & { moduleNumber: number; moduleName: string })[] {
  if (!course) return [];
  return course.modules.flatMap((m, i) =>
    m.lessons.filter((l) => !l.done).map((l) => ({ ...l, moduleNumber: i + 1, moduleName: m.name })),
  );
}

export function courseBySlug(state: GameState, slug: string | null | undefined): CourseProgress | undefined {
  return state.courses.find((c) => c.slug === slug);
}

export function lessonTitleById(state: GameState, id: number): string | null {
  for (const c of state.courses)
    for (const m of c.modules)
      for (const l of m.lessons) if (l.id === id) return lessonName(l.title);
  return null;
}

/** Hoje e ontem são os únicos dias que aceitam registro. */
export function registrableDays(state: GameState): string[] {
  return [state.today, addDays(state.today, -1)];
}

export function relativeDayLabel(state: GameState, day: string): string {
  if (day === state.today) return `Hoje (${shortDate(day)})`;
  if (day === addDays(state.today, -1)) return `Ontem (${shortDate(day)})`;
  return shortDate(day);
}
