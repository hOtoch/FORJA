// ESQUELETO DA FUNDAÇÃO. A frente A implementa o motor de regras aqui e nos módulos irmãos
// (days, weeks, streak, xp, grade, fund, chests, courses, status), conforme
// specs/001-forja-temporada-1/data-model.md.

import type { ForjaRecord, GameState, SeasonConfig, TimerState } from '@/lib/types';

export function computeGameState(
  _records: ForjaRecord[],
  _timer: TimerState | null,
  _config: SeasonConfig,
  _now: Date,
): GameState {
  throw new Error('computeGameState ainda não foi implementado.');
}
