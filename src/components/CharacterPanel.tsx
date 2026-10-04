// Personagem: nível, título, XP, atributos monocromáticos, escudos e sequência.

import { season1 } from '@/config/season1';
import type { GameState } from '@/lib/types';
import { fmtInt, plural } from './format';
import { ShieldIcon } from './icons';

function Rail({ value, max, thin = false }: { value: number; max: number; thin?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={thin ? 'rail rail-thin' : 'rail'} aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CharacterPanel({ state }: { state: GameState }) {
  const { xp, streak } = state;
  const span = xp.nextLevelXp - xp.levelStartXp;
  const attrs = [
    { name: 'Inteligência', value: xp.byAttr.inteligencia },
    { name: 'Força', value: xp.byAttr.forca },
    { name: 'Vigor', value: xp.byAttr.vigor },
  ];
  const max = season1.shields.max;

  return (
    <section aria-labelledby="personagem-titulo" className="min-w-0">
      <h2 id="personagem-titulo" className="flex h-10 items-end gap-3">
        <span className="font-roman text-display-m font-bold num">Nível {xp.level}</span>
        <span className="pb-1 text-lead font-medium">{xp.title}</span>
      </h2>
      <p className="mt-3 text-small font-medium num">
        {fmtInt(xp.total)} de {fmtInt(xp.nextLevelXp)} XP
      </p>
      <div className="mt-1">
        <Rail value={xp.total - xp.levelStartXp} max={span} />
      </div>
      <dl className="mt-4 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        {attrs.map((a) => (
          <div key={a.name} className="contents">
            <dt className="text-small">{a.name}</dt>
            <dd className="text-right text-small font-medium num">{fmtInt(a.value)}</dd>
            <dd>
              <Rail value={a.value} max={xp.total} thin />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center gap-2">
        <span className="flex items-center gap-1 text-focus" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <ShieldIcon key={i} size={22} filled={i < streak.shields} />
          ))}
        </span>
        <p className="text-small">
          Escudos: <span className="num">{streak.shields} de {max}</span>
        </p>
      </div>
      <p className="mt-1 text-small text-muted">
        Sequência de {plural(streak.current, 'dia', 'dias')}
        {streak.best > streak.current ? `, a melhor foi de ${streak.best}.` : streak.current > 0 ? ', a melhor até agora.' : '.'}
      </p>
    </section>
  );
}
