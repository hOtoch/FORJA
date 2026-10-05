import type { Metadata } from 'next';
import { bossOfWeek } from '@/components/bosses';
import { ToastProvider } from '@/components/feedback';
import { Header } from '@/components/Header';
import { HERO_TIERS, heroTier, Sprite } from '@/components/pixel';
import { SeasonMap } from '@/components/SeasonMap';
import { loadGameState } from '@/lib/load-state';
import type { GameState } from '@/lib/types';

export const metadata: Metadata = { title: 'Mapa do Forja' };

function where(state: GameState): string {
  if (state.phase === 'before') return 'A jornada ainda não começou. O ferreiro espera na Vila da Forja.';
  if (state.phase === 'after') return 'A jornada terminou no Castelo do Réveillon.';
  const i = state.dayIndex ?? 1;
  const region = i <= 27 ? 'na Floresta da Disciplina' : i <= 57 ? 'nas Montanhas do Esforço' : 'nas Terras do Gelo';
  return `Dia ${i} de ${state.days.length}: o seu ferreiro está ${region}. Faltam ${state.days.length - i} dias até o castelo.`;
}

export default async function MapaPage() {
  const state = await loadGameState();
  const current = heroTier(state.xp.level);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-3 md:px-8">
      <ToastProvider>
        <Header />
      </ToastProvider>
      <main className="mt-6 space-y-5">
        <div>
          <h1 className="font-gothic text-[2.25rem] font-extrabold leading-10">Mapa da temporada</h1>
          <p className="mt-1 text-lead">{where(state)}</p>
        </div>

        <section aria-label="Mapa" className="card">
          <SeasonMap state={state} />
        </section>

        <section aria-labelledby="evolucao-titulo" className="card">
          <div className="card-head">
            <h2 id="evolucao-titulo" className="card-title">
              Evolução do ferreiro
            </h2>
            <span className="card-meta num">Nível {state.xp.level}</span>
          </div>
          <ol className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {HERO_TIERS.map((t) => {
              const reached = state.xp.level >= t.minLevel;
              const isCurrent = t.index === current.index;
              return (
                <li
                  key={t.sprite}
                  className={`flex flex-col items-center rounded-[10px] border p-3 text-center ${
                    isCurrent ? 'border-[var(--heat-2)] bg-bg ring-2 ring-[var(--heat-2)]' : 'border-line bg-bg'
                  }`}
                >
                  <Sprite name={t.sprite} scale={3} locked={!reached} alt={reached ? t.title : ''} />
                  <p className={`mt-2 text-body font-bold ${reached ? '' : 'text-muted'}`}>{t.title}</p>
                  <p className="text-small text-muted num">
                    {isCurrent ? 'você está aqui' : reached ? 'alcançado' : `nível ${t.minLevel}`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="chefes-titulo" className="card">
          <div className="card-head">
            <h2 id="chefes-titulo" className="card-title">
              Os chefes da temporada
            </h2>
            <span className="card-meta num">
              {state.weeks.filter((w) => w.bossDefeated).length} de {state.weeks.length} derrotados
            </span>
          </div>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {state.weeks.map((w) => {
              const boss = bossOfWeek(w.index, w.isFinal);
              return (
                <li
                  key={w.index}
                  className={`flex flex-col items-center rounded-[10px] border p-3 text-center ${
                    w.isCurrent ? 'border-[var(--heat-1)] bg-bg ring-2 ring-[var(--heat-1)]' : 'border-line bg-bg'
                  }`}
                >
                  <Sprite name={boss.sprite} scale={3} faded={w.bossDefeated} />
                  <p className="mt-2 text-small font-bold leading-5">{boss.name}</p>
                  <p className="text-micro text-muted num">
                    {w.isFinal ? 'final' : `semana ${w.index}`}
                    {w.bossDefeated ? ', derrotado' : w.isCurrent ? ', agora' : ''}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
