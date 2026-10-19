import { connection } from 'next/server';
import { season } from '@/config/season';
import { computeGameState } from '@/lib/game';
import { getStore } from '@/lib/store';
import { now } from '@/lib/time';
import type { ForjaRecord, GameState } from '@/lib/types';

/**
 * Lê os registros e o timer do store e calcula o estado do jogo agora. Só no servidor.
 * `connection()` garante que a página é gerada a cada requisição (nunca pré-renderizada no build).
 */
export async function loadDashboard(): Promise<{ state: GameState; records: ForjaRecord[] }> {
  await connection();
  const store = getStore();
  const [records, timer, tasks] = await Promise.all([
    store.listRecords(season.id),
    store.getTimer(),
    store.getTasks(season.id),
  ]);
  return { state: computeGameState(records, timer, season, now(), { tasks }), records };
}

export async function loadGameState(): Promise<GameState> {
  return (await loadDashboard()).state;
}
