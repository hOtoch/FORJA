// Transforma a lista de aulas colada no formulário "Adicionar curso" em módulos e aulas.
// Aceita o formato simples (uma aula por linha, módulos com "#") e também o texto copiado da
// grade da Udemy ("Seção 1: Nome", "6 aulas • 1h 54min", a aula numa linha e a duração na outra).
//
//   # Fundamentos
//   O que é Cloud | 12:34
//   Criando a conta - 20 min
//   Primeiros passos (1h05)

import type { CatalogCourse, CatalogModule } from './types';

/** Ids das aulas adicionadas no app ficam acima disto, longe dos ids da Pythonando e da Udemy. */
export const CUSTOM_ID_BASE = 900_000_000;

const MODULE_PREFIX = /^(se[cç][aã]o|m[oó]dulo|section|cap[ií]tulo|unidade|parte)\s*\d*\s*[:.\-–]?\s*/i;
const COUNT_LINE = /^\d+\s*(aulas?|lectures?|v[ií]deos?)\b|•/i;
const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const HOURS = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*(?:min|m)\b)?$/i;

/** Minutos de "12:34", "1:02:03", "20 min", "1h05", "1h 5min"; null se não for duração. */
export function parseDuration(text: string): number | null {
  const t = text.trim().replace(/^\(|\)$/g, '').trim();
  if (!t) return null;
  const c = CLOCK.exec(t);
  if (c) {
    const [a, b, s] = [Number(c[1]), Number(c[2]), c[3] === undefined ? null : Number(c[3])];
    const seconds = s === null ? a * 60 + b : a * 3600 + b * 60 + s;
    return Math.max(1, Math.round(seconds / 60));
  }
  const compact = /^(\d+)\s*h\s*(\d{1,2})$/i.exec(t);
  if (compact) return Number(compact[1]) * 60 + Number(compact[2]);
  const h = HOURS.exec(t);
  if (h && (h[1] || h[2])) return Number(h[1] ?? 0) * 60 + Number(h[2] ?? 0);
  return null;
}

/** Separa "Título | 12:34", "Título - 20 min" ou "Título (1h05)" em título e minutos. */
function splitLesson(line: string): { title: string; minutes: number } {
  const m = /^(.*?)\s*(?:[|–—-]\s*|\(\s*)([0-9: hminHMIN]+?)\s*\)?\s*$/.exec(line);
  if (m && m[1].trim()) {
    const minutes = parseDuration(m[2]);
    if (minutes !== null) return { title: m[1].trim(), minutes };
  }
  return { title: line.trim(), minutes: 0 };
}

export interface ParsedCourse {
  modules: CatalogModule[];
  lessons: number;
  minutes: number;
}

/** Lê o texto colado. `nextId` dá o id de cada aula nova (em ordem). */
export function parseLessons(text: string, nextId: () => number): ParsedCourse {
  const modules: CatalogModule[] = [];
  let current: CatalogModule | null = null;
  const moduleNamed = (name: string) => {
    current = { name: name.slice(0, 120) || `Módulo ${modules.length + 1}`, min: 0, lessons: [] };
    modules.push(current);
    return current;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      moduleNamed(line.replace(/^#+\s*/, ''));
      continue;
    }
    if (MODULE_PREFIX.test(line) && !/\d{1,2}:\d{2}\s*$/.test(line)) {
      moduleNamed(line.replace(MODULE_PREFIX, '').trim() || line);
      continue;
    }
    if (COUNT_LINE.test(line)) continue;
    const alone = parseDuration(line);
    const target = current as CatalogModule | null;
    if (alone !== null && target && target.lessons.length > 0) {
      // duração na linha de baixo (como na Udemy): vale para a última aula
      const last = target.lessons[target.lessons.length - 1];
      if (last[2] === 0) last[2] = alone;
      continue;
    }
    if (/^(visualizar|preview|pré-visualizar)$/i.test(line)) continue;
    const mod = target ?? moduleNamed('Aulas');
    const { title, minutes } = splitLesson(line);
    mod.lessons.push([nextId(), title.slice(0, 200), minutes]);
  }

  const kept = modules.filter((m) => m.lessons.length > 0);
  for (const m of kept) m.min = m.lessons.reduce((s, l) => s + l[2], 0);
  return {
    modules: kept,
    lessons: kept.reduce((s, m) => s + m.lessons.length, 0),
    minutes: kept.reduce((s, m) => s + m.min, 0),
  };
}

/** "Certificação AWS: Cloud" → "certificacao-aws-cloud" (sem repetir os que já existem). */
export function slugFor(name: string, taken: Set<string>): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'curso';
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Maior id de aula já usado pelos cursos adicionados (para continuar a numeração). */
export function maxCustomLessonId(courses: CatalogCourse[]): number {
  let max = CUSTOM_ID_BASE;
  for (const c of courses) for (const m of c.modules) for (const [id] of m.lessons) if (id > max) max = id;
  return max;
}
