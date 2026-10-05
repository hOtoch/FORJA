// Baús (revisão 2): cinco quadros lado a lado, cada um com o baú desenhado, um nome curto,
// o progresso até abrir e o prêmio.

import { season1 } from '@/config/season1';
import { shortDate } from '@/lib/time';
import type { ChestConfig, ChestState, GameState } from '@/lib/types';
import { Sprite } from './pixel';
import { fmtInt } from './format';
import { Meter } from './viz';

const SHORT: Record<ChestConfig['kind'], string> = {
  'first-boss': 'Primeiro chefe',
  streak: '21 dias seguidos',
  'midpoint-grade': 'Metade com nota A',
  'study-hours': '50 horas de estudo',
  'final-grade': 'Nota final S ou A',
};

function progress(chest: ChestState, cfg: ChestConfig, state: GameState): { value: number; max: number; text: string } | null {
  if (chest.state !== 'locked') return null;
  if (cfg.kind === 'first-boss') {
    const beaten = state.weeks.filter((w) => w.bossDefeated).length;
    return { value: beaten, max: 1, text: 'derrote um chefe' };
  }
  if (cfg.kind === 'streak' && cfg.threshold) {
    const v = Math.max(state.streak.current, Math.min(state.streak.best, cfg.threshold));
    return { value: v, max: cfg.threshold, text: `${v} de ${cfg.threshold} dias` };
  }
  if (cfg.kind === 'study-hours' && cfg.threshold) {
    const minutes = state.days.reduce((a, d) => a + d.studyMinutes, 0);
    return { value: minutes, max: cfg.threshold, text: `${fmtInt(Math.floor(minutes / 60))} de ${cfg.threshold / 60} h` };
  }
  if (cfg.date) return { value: 0, max: 1, text: `abre em ${shortDate(cfg.date)}` };
  return null;
}

export function ChestsPanel({ state }: { state: GameState }) {
  const opened = state.chests.filter((c) => c.state === 'opened').length;
  return (
    <section aria-labelledby="baus-titulo" className="card">
      <div className="card-head">
        <h2 id="baus-titulo" className="card-title">
          Baús
        </h2>
        <span className="card-meta num">
          {opened} de {state.chests.length} abertos
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {state.chests.map((c) => {
          const cfg = season1.chests.find((x) => x.id === c.id);
          if (!cfg) return null;
          const p = progress(c, cfg, state);
          const status = c.state === 'opened' ? 'Aberto' : c.state === 'failed' ? 'Não abriu' : 'Trancado';
          return (
            <li
              key={c.id}
              className={`flex min-w-0 flex-col items-center rounded-[10px] border px-3 pb-3 pt-2 text-center ${
                c.state === 'opened' ? 'border-[var(--heat-3)] bg-bg' : 'border-line bg-bg'
              }`}
            >
              <Sprite
                name={c.state === 'opened' ? 'bau-aberto' : 'bau-fechado'}
                base={16}
                scale={4}
                faded={c.state === 'failed'}
              />
              <p className="mt-1 text-body font-bold">
                <span className="sr-only">{status}: </span>
                {SHORT[cfg.kind]}
              </p>
              {c.state === 'opened' && c.openedOn ? (
                <p className="text-small font-bold text-money num">Aberto em {shortDate(c.openedOn)}</p>
              ) : c.state === 'failed' ? (
                <p className="text-small text-muted">Não abriu{c.note ? `. ${c.note}` : ''}</p>
              ) : p ? (
                <div className="mt-1 w-full">
                  {cfg.date ? null : <Meter value={p.value} max={p.max} size="sm" color="var(--money)" label={p.text} />}
                  <p className="mt-1 text-micro font-medium text-muted num">{p.text}</p>
                </div>
              ) : null}
              <p className="mt-1.5 text-small leading-5 text-muted">{c.prize}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
