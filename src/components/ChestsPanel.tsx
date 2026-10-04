// Baús: os cinco sempre visíveis, com a condição e o prêmio.

import { season1 } from '@/config/season1';
import { shortDate } from '@/lib/time';
import type { ChestState, GameState } from '@/lib/types';
import { ChestLockedIcon, ChestOpenIcon } from './icons';

function progress(chest: ChestState, state: GameState): string | null {
  if (chest.state !== 'locked') return null;
  const cfg = season1.chests.find((c) => c.id === chest.id);
  if (!cfg) return null;
  if (cfg.kind === 'streak' && cfg.threshold) return `${state.streak.current} de ${cfg.threshold}`;
  if (cfg.kind === 'study-hours' && cfg.threshold) {
    const minutes = state.days.reduce((a, d) => a + d.studyMinutes, 0);
    return `${Math.floor(minutes / 60)} de ${cfg.threshold / 60} h`;
  }
  return null;
}

export function ChestsPanel({ state }: { state: GameState }) {
  return (
    <section aria-labelledby="baus-titulo" className="min-w-0">
      <h2 id="baus-titulo" className="flex h-10 items-end font-gothic text-title font-bold">
        Baús
      </h2>
      <ul className="mt-3 space-y-2">
        {state.chests.map((c) => {
          const opened = c.state === 'opened';
          const extra = progress(c, state);
          return (
            <li key={c.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3">
              <span className={opened ? 'pt-0.5 text-ink' : 'pt-0.5 text-muted'}>
                {opened ? <ChestOpenIcon /> : <ChestLockedIcon />}
              </span>
              <div className="min-w-0 text-small">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-bold">
                    <span className="sr-only">{opened ? 'Aberto: ' : c.state === 'failed' ? 'Não abriu: ' : 'Trancado: '}</span>
                    {c.condition}
                    {extra ? <span className="font-medium text-muted num"> ({extra})</span> : null}
                  </span>
                  {opened && c.openedOn ? (
                    <span className="font-medium num">Aberto em {shortDate(c.openedOn)}</span>
                  ) : null}
                </p>
                <p className="text-muted">{c.prize}</p>
                {c.state === 'failed' ? (
                  <p className="text-muted">Não abriu{c.note ? `. ${c.note}` : ''}.</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
