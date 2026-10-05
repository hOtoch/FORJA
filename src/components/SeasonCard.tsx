// Faixa da temporada (revisão 2): o dia em destaque, os selos de sequência, escudos e
// folgas, e a barra de 80 dias logo abaixo.

import { season1 } from '@/config/season1';
import { daysBetween, longDate, shortDate } from '@/lib/time';
import type { GameState } from '@/lib/types';
import { plural } from './format';
import Link from 'next/link';
import { Sprite } from './pixel';
import { SeasonBar } from './SeasonBar';

function dayFigure(state: GameState): { big: string; small: string } {
  const total = state.days.length;
  if (state.phase === 'before') {
    const left = daysBetween(state.today, season1.start);
    return { big: `${left}`, small: left === 1 ? 'dia para começar' : 'dias para começar' };
  }
  if (state.phase === 'after' || state.dayIndex === null) return { big: `${total}`, small: 'dias forjados' };
  return { big: `Dia ${state.dayIndex}`, small: `de ${total}` };
}

export function SeasonCard({ state, onSelectDay }: { state: GameState; onSelectDay: (date: string) => void }) {
  const fig = dayFigure(state);
  const left = state.dayIndex !== null ? state.days.length - state.dayIndex : null;
  const { streak } = state;

  return (
    <section aria-labelledby="temporada-titulo" className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <div>
            <h2 id="temporada-titulo" className="card-title">
              {season1.name}
            </h2>
            <p className="text-small text-muted num">
              Temporada 1, de {shortDate(season1.start)} a {shortDate(season1.end)}
            </p>
          </div>
          <p className="flex items-baseline gap-1.5 whitespace-nowrap border-l border-line pl-5">
            <span className="figure text-[2rem] leading-9">{fig.big}</span>
            <span className="text-body text-muted num">{fig.small}</span>
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-2" aria-label="Resumo da temporada">
          <li className="chip">
            <Sprite name="icone-chama" base={12} scale={2} faded={streak.current === 0} />
            <span>
              Sequência <b className="num">{plural(streak.current, 'dia', 'dias')}</b>
              {streak.best > streak.current ? <span className="text-muted num"> (melhor: {streak.best})</span> : null}
            </span>
          </li>
          <li className="chip">
            <span className="flex gap-0.5" aria-hidden="true">
              {Array.from({ length: season1.shields.max }, (_, i) => (
                <Sprite key={i} name={i < streak.shields ? 'icone-escudo' : 'icone-escudo-vazio'} base={12} scale={2} />
              ))}
            </span>
            <span>
              Escudos <b className="num">{streak.shields} de {season1.shields.max}</b>
            </span>
          </li>
          <li className="chip">
            <Sprite name="icone-ampulheta" base={12} scale={2} />
            <span className="num">
              {left === null
                ? state.phase === 'before'
                  ? `Começa ${longDate(season1.start)}`
                  : 'Temporada encerrada'
                : left === 0
                  ? 'Último dia'
                  : `${plural(left, 'dia', 'dias')} até 23/12`}
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-5">
        <SeasonBar state={state} onSelectDay={onSelectDay} />
      </div>
      <p className="mt-1 text-right">
        <Link href="/mapa" className="link text-small">
          Ver o caminho no mapa
        </Link>
      </p>
    </section>
  );
}
