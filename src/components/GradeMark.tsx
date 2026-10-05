// Nota (revisão 2): a marca do ferreiro punçonada num quadro de 88 × 88 (tracejada enquanto
// é prevista, sólida em 23/12) e um medidor por hábito, com a faixa da próxima letra.

import { season1 } from '@/config/season1';
import type { GameState, GradeLetter } from '@/lib/types';
import { fmtPct } from './format';
import { Meter } from './viz';

const NEXT_UP: Record<GradeLetter, 'S' | 'A' | 'B' | null> = { S: null, A: 'S', B: 'A', C: 'B' };

function hint(letter: GradeLetter | null, totalPct: number, final: boolean): string {
  if (!letter) return 'A nota aparece depois do primeiro dia fechado.';
  if (final) return `Média final de ${fmtPct(totalPct)}.`;
  const up = NEXT_UP[letter];
  return up
    ? `Média de ${fmtPct(totalPct)}. Com ${season1.grade[up]}%, sobe para ${up}.`
    : `Média de ${fmtPct(totalPct)}. Mantenha o ritmo até 23/12.`;
}

export function GradeMark({ state }: { state: GameState }) {
  const { grade } = state;
  const final = grade.isFinal;
  const rows = [
    { name: 'Estudo', pct: grade.studyPct },
    { name: 'Academia', pct: grade.gymPct },
    { name: 'Cardio', pct: grade.cardioPct },
  ];

  return (
    <section aria-labelledby="nota-titulo" className="card">
      <div className="card-head">
        <h2 id="nota-titulo" className="card-title">
          {final ? 'Nota final' : 'Nota prevista'}
        </h2>
        <span className="card-meta">S a partir de {season1.grade.S}%</span>
      </div>

      <div className="flex items-center gap-5">
        <div
          className={`flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-bg ${
            final ? 'border-solid' : 'border-dashed'
          }`}
          role="img"
          aria-label={
            grade.letter
              ? `${final ? 'Nota final' : 'Nota prevista'} ${grade.letter}, média de ${fmtPct(grade.totalPct)}`
              : 'A nota aparece depois do primeiro dia fechado'
          }
        >
          <span
            className={`font-gothic text-display-l font-extrabold ${grade.letter ? '' : 'text-muted opacity-40'}`}
            style={final ? { textShadow: '0 1px 0 rgba(255, 255, 255, 0.55)' } : undefined}
            aria-hidden="true"
          >
            {grade.letter ?? '?'}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="grid grid-cols-[4.75rem_minmax(0,1fr)_3.25rem] items-center gap-x-2.5">
              <span className="text-small">{r.name}</span>
              <Meter value={r.pct} max={100} size="sm" label={`${r.name}: ${fmtPct(r.pct)}`} />
              <span className="text-right text-small font-bold num">{grade.letter ? fmtPct(r.pct) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-small text-muted">{hint(grade.letter, grade.totalPct, final)}</p>
    </section>
  );
}
