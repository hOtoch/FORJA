import { season1 } from '@/config/season1';
import { computeGameState } from '@/lib/game';
import { getStore } from '@/lib/store';
import { now } from '@/lib/time';
import type { GameState } from '@/lib/types';

/** Lê os registros e o timer do store e calcula o estado do jogo agora. Só no servidor. */
export async function loadGameState(): Promise<GameState> {
  const store = getStore();
  const [records, timer] = await Promise.all([store.listRecords(season1.id), store.getTimer()]);
  return computeGameState(records, timer, season1, now());
}
