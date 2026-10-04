// A marca do ferreiro: a letra da nota punçonada num quadro de 88 × 88.
// Tracejada enquanto é prevista; sólida e em baixo-relevo quando é final (23/12).

import { season1 } from '@/config/season1';
import type { GameState, GradeLetter } from '@/lib/types';
import { fmtPct } from './format';

const NEXT_UP: Record<GradeLetter, 'S' | 'A' | 'B' | null> = { S: null, A: 'S', B: 'A', C: 'B' };

function gradeHint(letter: GradeLetter | null, totalPct: number, final: boolean): string {
  if (!letter) return 'A nota aparece depois do primeiro dia fechado.';
  if (final) return `Média de ${fmtPct(totalPct)} na temporada.`;
  const up = NEXT_UP[letter];
  return up
    ? `Média de ${fmtPct(totalPct)}. Com ${season1.grade[up]}%, sobe para ${up}.`
    : `Média de ${fmtPct(totalPct)}. Mantenha o ritmo até 23/12.`;
}

export function GradeMark({ state }: { state: GameState }) {
  const { grade } = state;
  const rows = [
    { name: 'Estudo', pct: grade.studyPct },
    { name: 'Academia', pct: grade.gymPct },
    { name: 'Cardio', pct: grade.cardioPct },
  ];
  const final = grade.isFinal;

  return (
    <section aria-labelledby="nota-titulo" className="min-w-0">
      <h2 id="nota-titulo" className="flex h-10 items-end font-gothic text-title font-bold">
        {final ? 'Nota final' : 'Nota prevista'}
      </h2>
      <div className="mt-3 flex items-center gap-6">
        <div
          className={`flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-[8px] border-2 border-ink ${
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
            className="font-gothic text-display-l font-extrabold"
            style={final ? { textShadow: '0 1px 0 rgba(255, 255, 255, 0.55)' } : undefined}
            aria-hidden="true"
          >
            {grade.letter ?? ''}
          </span>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1">
          {rows.map((r) => (
            <div key={r.name} className="contents">
              <dt className="text-body">{r.name}</dt>
              <dd className="text-right text-body font-medium num">{fmtPct(r.pct)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-3 text-small text-muted">{gradeHint(grade.letter, grade.totalPct, final)}</p>
    </section>
  );
}
