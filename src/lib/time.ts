import type { SeasonConfig } from './types';

const HOUR = 3_600_000;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatters.set(timeZone, f);
  }
  return f;
}

/** Data de calendário (YYYY-MM-DD) do instante no fuso dado. */
export function calendarDate(instant: Date | string | number, timeZone = 'America/Sao_Paulo'): string {
  return formatterFor(timeZone).format(new Date(instant));
}

/**
 * Dia do jogo: a data em America/Sao_Paulo depois de subtrair `dayStartHour` horas.
 * Estudar até 03:59 conta para o dia anterior.
 */
export function gameDay(
  instant: Date | string | number,
  timeZone = 'America/Sao_Paulo',
  dayStartHour = 4,
): string {
  const t = new Date(instant).getTime() - dayStartHour * HOUR;
  return calendarDate(t, timeZone);
}

/** Soma dias a uma data YYYY-MM-DD (aritmética de calendário, sem fuso). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dias de `from` até `to` (to − from). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** 1 = segunda … 7 = domingo. */
export function weekdayOf(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Todos os dias da temporada, em ordem. */
export function seasonDays(config: Pick<SeasonConfig, 'start' | 'end'>): string[] {
  const out: string[] = [];
  for (let d = config.start; d <= config.end; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface SeasonWeek {
  index: number;
  start: string;
  end: string;
  isFinal: boolean;
  days: string[];
}

/** Semanas de segunda a domingo; a última pode ser parcial (semana final). */
export function seasonWeeks(config: Pick<SeasonConfig, 'start' | 'end'>): SeasonWeek[] {
  const weeks: SeasonWeek[] = [];
  let current: string[] = [];
  for (const d of seasonDays(config)) {
    if (weekdayOf(d) === 1 && current.length) {
      weeks.push({ index: weeks.length + 1, start: current[0], end: current[current.length - 1], isFinal: false, days: current });
      current = [];
    }
    current.push(d);
  }
  if (current.length) {
    weeks.push({ index: weeks.length + 1, start: current[0], end: current[current.length - 1], isFinal: false, days: current });
  }
  const last = weeks[weeks.length - 1];
  if (last && last.days.length < 7) last.isFinal = true;
  return weeks;
}

/**
 * Relógio do app. Em desenvolvimento, `FORJA_NOW` fixa o instante
 * (ex.: 2026-10-21T15:00:00-03:00) para ver o painel no meio da temporada.
 */
export function now(): Date {
  const fixed = process.env.FORJA_NOW;
  if (fixed && process.env.NODE_ENV !== 'production') {
    const d = new Date(fixed);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** "12/10" */
export function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "segunda, 12 de outubro" */
export function longDate(date: string): string {
  return `${WEEKDAYS[weekdayOf(date) - 1]}, ${Number(date.slice(8, 10))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

export function monthName(date: string): string {
  return MONTHS[Number(date.slice(5, 7)) - 1];
}
