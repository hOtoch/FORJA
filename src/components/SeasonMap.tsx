'use client';

// O mapa da temporada (revisões 4 e 6 do DESIGN.md): a ilustração (public/pixel/mapa.webp) e, por
// cima, os chefes, os baús e o ferreiro. Os 80 dias não aparecem: são só os passos do ferreiro na
// estrada, um por dia. A estrada de src/config/mapa.json foi traçada sobre a ilustração, em
// unidades de 640 de largura (a imagem tem 1024).

import { useState, type KeyboardEvent } from 'react';
import mapa from '@/config/mapa.json';
import { season1 } from '@/config/season1';
import { shortDate } from '@/lib/time';
import type { ChestState, DayInfo, GameState, WeekInfo } from '@/lib/types';
import { bossOfWeek } from './bosses';
import { dayTooltip, heatReason, WEEKDAY_SHORT } from './format';
import { heroTier, Sprite } from './pixel';

type Pt = { x: number; y: number };
type Selection = { kind: 'day'; index: number } | { kind: 'boss'; week: number } | { kind: 'chest'; id: number };

const W = mapa.width;
const H = mapa.height;
const PATH = mapa.path as [number, number][];
// Chefes (em ordem de semana) e baús ficam em chão livre da ilustração (grama ou neve, sem
// árvores, pedras, casas, fogos nem estrada), perto do dia de cada um e na região do seu mês.
// São o centro de cada desenho.
const BOSS_AT = mapa.bosses as [number, number][];
const CHEST_AT: Partial<Record<string, number[]>> = mapa.chests;
// Chefes um pouco menores que o ferreiro, para caberem nos espaços livres do outono.
const BOSS = 28;

function buildPath() {
  const segs = PATH.slice(1).map((b, i) => {
    const a = PATH[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, len };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  // distância, pela estrada, da vila até cada ponto do traçado
  const vertex = PATH.map((_, i) => segs.slice(0, i).reduce((s, x) => s + x.len, 0));
  function at(d: number): Pt {
    let rest = Math.max(0, Math.min(total, d));
    for (const s of segs) {
      if (rest <= s.len) {
        const t = s.len === 0 ? 0 : rest / s.len;
        return { x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t };
      }
      rest -= s.len;
    }
    const last = segs[segs.length - 1];
    return { x: last.b[0], y: last.b[1] };
  }
  return { total, vertex, at };
}

// A estrada é fixa: calcula uma vez só.
const GEO = buildPath();

// Cada mês anda só no trecho da sua região: outubro na floresta, novembro nas montanhas e
// dezembro no gelo. `monthStarts` diz em que ponto do traçado cada trecho começa. Devolve, para
// cada dia, a distância pela estrada até ele.
function placeDays(days: DayInfo[]): number[] {
  const month = (d: DayInfo) => d.date.slice(0, 7);
  const months = [...new Set(days.map(month))];
  const starts = mapa.monthStarts.map((i) => GEO.vertex[i]);
  if (months.length !== starts.length) return days.map((d) => (GEO.total * (d.index - 0.5)) / days.length);
  const bounds = [...starts, GEO.total];
  const count = new Map<string, number>();
  for (const d of days) count.set(month(d), (count.get(month(d)) ?? 0) + 1);
  const seen = new Map<string, number>();
  return days.map((d) => {
    const m = month(d);
    const k = months.indexOf(m);
    const j = (seen.get(m) ?? 0) + 1;
    seen.set(m, j);
    return bounds[k] + ((bounds[k + 1] - bounds[k]) * (j - 0.5)) / count.get(m)!;
  });
}

const CHEST_DAY: Record<string, (state: GameState) => number> = {
  'first-boss': () => 7,
  streak: () => 21,
  'midpoint-grade': (s) => (s.days.find((d) => d.date === '2026-11-13')?.index ?? 40),
  'study-hours': () => 50,
  'final-grade': () => 80,
};

function bossStatus(w: WeekInfo): string {
  if (w.bossDefeated) return 'derrotado';
  if (w.isCurrent) return 'em combate esta semana';
  if (w.isClosed) return 'escapou';
  return 'esperando';
}

export function SeasonMap({ state }: { state: GameState }) {
  const geo = GEO;
  const n = state.days.length;
  const dayDist = placeDays(state.days);
  const dayPt = (index: number) => geo.at(dayDist[index - 1]);
  const todayIndex = state.dayIndex;
  const [sel, setSel] = useState<Selection>(
    todayIndex ? { kind: 'day', index: todayIndex } : { kind: 'boss', week: 1 },
  );

  const heroPt =
    state.phase === 'before' ? geo.at(0) : state.phase === 'after' || !todayIndex ? geo.at(geo.total) : dayPt(todayIndex);
  const hero = heroTier(state.xp.level);
  const today = todayIndex ? state.days[todayIndex - 1] : undefined;

  const bosses = state.weeks.map((w) => {
    const lastDay = state.days.filter((d) => d.weekIndex === w.index).at(-1)?.index ?? n;
    const p = w.isFinal ? geo.at(geo.total) : dayPt(lastDay);
    const [cx, cy] = BOSS_AT[w.index - 1] ?? [p.x, p.y - 26];
    return { w, boss: bossOfWeek(w.index, w.isFinal), cx, cy };
  });

  const chests = state.chests.map((c) => {
    const cfg = season1.chests.find((x) => x.id === c.id);
    const day = cfg ? CHEST_DAY[cfg.kind](state) : 80;
    const p = dayPt(day);
    const [cx, cy] = (cfg && CHEST_AT[cfg.kind]) ?? [p.x, p.y + 18];
    return { c, cx, cy, day };
  });

  function activate(e: KeyboardEvent, s: Selection) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSel(s);
    }
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <div
          className="relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-[10px] border-2 border-[#2b241e]"
          style={{ aspectRatio: `${W} / ${H}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- fundo do SVG, nas mesmas medidas que ele */}
          <img src={mapa.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" draggable={false} />

          {mapa.regions.map((r) => (
            <span
              key={r.label}
              className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap sm:block rounded-[4px] border border-[#2b241e] bg-[#f3ecdd] px-2 py-0.5 font-gothic text-[clamp(0.7rem,1.3vw,1.05rem)] font-bold text-[#2b241e]"
              style={{ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%` }}
            >
              {r.label}
            </span>
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Mapa da temporada">
            {/* baús */}
            {chests.map(({ c, cx, cy }) => {
              const x = Math.round(cx - 8);
              const y = Math.round(cy - 8);
              return (
                <g
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Baú: ${c.condition}`}
                  onClick={() => setSel({ kind: 'chest', id: c.id })}
                  onKeyDown={(e) => activate(e, { kind: 'chest', id: c.id })}
                  className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#fff3c4]"
                >
                  <rect x={x - 2} y={y - 2} width={20} height={20} fill="transparent" stroke="transparent" strokeWidth={1.5} />
                  <image
                    href={`/pixel/${c.state === 'opened' ? 'bau-aberto' : 'bau-fechado'}.png`}
                    x={x}
                    y={y}
                    width={16}
                    height={16}
                    style={{ imageRendering: 'pixelated', filter: c.state === 'failed' ? 'grayscale(1) opacity(0.5)' : undefined }}
                  />
                </g>
              );
            })}

            {/* chefes */}
            {bosses.map(({ w, boss, cx, cy }) => {
              const x = Math.round(cx - BOSS / 2);
              const y = Math.round(cy - BOSS / 2);
              const isSel = sel.kind === 'boss' && sel.week === w.index;
              return (
                <g
                  key={w.index}
                  role="button"
                  tabIndex={0}
                  aria-label={`${boss.name}, semana ${w.index}: ${bossStatus(w)}`}
                  onClick={() => setSel({ kind: 'boss', week: w.index })}
                  onKeyDown={(e) => activate(e, { kind: 'boss', week: w.index })}
                  className={`cursor-pointer outline-none ${w.isCurrent && !w.bossDefeated ? 'forja-bob' : ''}`}
                >
                  <ellipse cx={x + BOSS / 2} cy={y + BOSS - 1} rx={10} ry={3} fill="rgba(26,20,16,0.35)" />
                  <image
                    href={`/pixel/${boss.sprite}.png`}
                    x={x}
                    y={y}
                    width={BOSS}
                    height={BOSS}
                    style={{
                      filter: w.bossDefeated ? 'grayscale(1) opacity(0.55)' : !w.isClosed && !w.isCurrent ? 'saturate(0.85)' : undefined,
                    }}
                  />
                  {w.bossDefeated ? (
                    <path
                      d={`M${x + 5} ${y + 5} L${x + BOSS - 5} ${y + BOSS - 5} M${x + BOSS - 5} ${y + 5} L${x + 5} ${y + BOSS - 5}`}
                      stroke="#8e2a1c"
                      strokeWidth={3}
                    />
                  ) : null}
                  {isSel ? (
                    <rect x={x - 2} y={y - 2} width={BOSS + 4} height={BOSS + 4} fill="none" stroke="#fff3c4" strokeWidth={1.5} />
                  ) : null}
                </g>
              );
            })}

            {/* o ferreiro: um passo pela estrada a cada dia */}
            {today ? (
              <g
                role="button"
                tabIndex={0}
                aria-label={`O seu ferreiro, hoje: ${dayTooltip(today)}`}
                onClick={() => setSel({ kind: 'day', index: today.index })}
                onKeyDown={(e) => activate(e, { kind: 'day', index: today.index })}
                className="forja-bob cursor-pointer outline-none"
              >
                <HeroFigure x={heroPt.x} y={heroPt.y} sprite={hero.sprite} />
              </g>
            ) : (
              <g className="forja-bob" aria-hidden="true">
                <HeroFigure x={heroPt.x} y={heroPt.y} sprite={hero.sprite} />
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Details state={state} sel={sel} chests={chests.map((x) => ({ chest: x.c, day: x.day }))} />
        <Legend heroSprite={hero.sprite} />
      </div>
    </div>
  );
}

function HeroFigure({ x, y, sprite }: { x: number; y: number; sprite: string }) {
  return (
    <>
      <ellipse cx={x} cy={y + 1} rx={9} ry={3} fill="rgba(26,20,16,0.4)" />
      <image href={`/pixel/${sprite}.png`} x={Math.round(x - 16)} y={Math.round(y - 30)} width={32} height={32} />
    </>
  );
}

function Legend({ heroSprite }: { heroSprite: string }) {
  const items = [
    { sprite: heroSprite, label: 'o seu ferreiro: anda um trecho da estrada por dia' },
    { sprite: 'boss-01', label: 'chefe da semana; fica cinza e riscado quando é derrotado' },
    { sprite: 'bau-fechado', label: 'baú: abre quando a condição dele é cumprida' },
  ];
  return (
    <ul className="flex flex-col gap-2 rounded-[10px] border border-line bg-bg p-4 text-small text-muted" aria-label="Legenda">
      <li className="mb-1 font-gothic text-[1.125rem] font-bold text-ink">Legenda</li>
      {items.map((i) => (
        <li key={i.sprite} className="flex items-center gap-2">
          <Sprite name={i.sprite} base={16} scale={2} />
          {i.label}
        </li>
      ))}
      <li className="mt-2 text-ink">Clique no ferreiro, num chefe ou num baú para ver os detalhes.</li>
    </ul>
  );
}

function Details({
  state,
  sel,
  chests,
}: {
  state: GameState;
  sel: Selection;
  chests: { chest: ChestState; day: number }[];
}) {
  if (sel.kind === 'day') {
    const d = state.days[sel.index - 1];
    if (!d) return null;
    const w = state.weeks.find((x) => x.index === d.weekIndex);
    const boss = w ? bossOfWeek(w.index, w.isFinal) : null;
    return (
      <aside className="rounded-[10px] border border-line bg-bg p-4" aria-live="polite">
        <p className="card-meta">
          Dia {d.index} de {state.days.length}, semana {d.weekIndex}
        </p>
        <h3 className="mt-1 font-gothic text-[1.5rem] font-bold leading-7">
          {d.isToday ? 'Hoje, ' : ''}
          {WEEKDAY_SHORT[d.weekday - 1]}, {shortDate(d.date)}
        </h3>
        <p className="mt-3 text-body">{heatReason(d)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Estudo</dt>
            <dd className="text-body font-bold num">{d.studyMinutes} min</dd>
          </div>
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Treinos</dt>
            <dd className="text-body font-bold num">{d.gym}</dd>
          </div>
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Cardios</dt>
            <dd className="text-body font-bold num">{d.cardio}</dd>
          </div>
        </dl>
        {boss ? <p className="mt-4 text-small text-muted">Chefe desta semana: {boss.name}.</p> : null}
      </aside>
    );
  }
  if (sel.kind === 'boss') {
    const w = state.weeks.find((x) => x.index === sel.week);
    if (!w) return null;
    const boss = bossOfWeek(w.index, w.isFinal);
    return (
      <aside className="rounded-[10px] border border-line bg-bg p-4" aria-live="polite">
        <p className="card-meta">
          {w.isFinal ? 'Chefe final' : `Chefe da semana ${w.index}`}, de {shortDate(w.start)} a {shortDate(w.end)}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/pixel/${boss.sprite}.png`}
            width={96}
            height={96}
            alt=""
            style={{ filter: w.bossDefeated ? 'grayscale(1) opacity(0.55)' : undefined }}
          />
          <div>
            <h3 className="font-gothic text-[1.5rem] font-bold leading-7">{boss.name}</h3>
            <p className="text-small font-bold">{bossStatus(w)}</p>
          </div>
        </div>
        <p className="mt-3 text-body italic text-muted">{boss.lore}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Estudo</dt>
            <dd className="text-body font-bold num">
              {w.studyDaysMet} de {w.studyDaysRequired}
            </dd>
          </div>
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Academia</dt>
            <dd className="text-body font-bold num">
              {Math.min(w.gym, w.gymTarget)} de {w.gymTarget}
            </dd>
          </div>
          <div className="tile flex-col gap-0 bg-surface">
            <dt className="text-micro text-muted">Cardio</dt>
            <dd className="text-body font-bold num">
              {Math.min(w.cardio, w.cardioTarget)} de {w.cardioTarget}
            </dd>
          </div>
        </dl>
      </aside>
    );
  }
  const entry = chests.find((x) => x.chest.id === sel.id);
  if (!entry) return null;
  const c = entry.chest;
  return (
    <aside className="rounded-[10px] border border-line bg-bg p-4" aria-live="polite">
      <p className="card-meta">Baú {c.id} de {chests.length}</p>
      <div className="mt-2 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/pixel/${c.state === 'opened' ? 'bau-aberto' : 'bau-fechado'}.png`}
          width={64}
          height={64}
          alt=""
          style={{ imageRendering: 'pixelated', filter: c.state === 'failed' ? 'grayscale(1) opacity(0.5)' : undefined }}
        />
        <h3 className="font-gothic text-[1.5rem] font-bold leading-7">{c.condition}</h3>
      </div>
      <p className="mt-3 text-body">
        <span className="text-muted">Prêmio: </span>
        {c.prize}
      </p>
      <p className="mt-2 text-small font-bold">
        {c.state === 'opened' && c.openedOn
          ? `Aberto em ${shortDate(c.openedOn)}.`
          : c.state === 'failed'
            ? `Não abriu${c.note ? `. ${c.note}` : ''}.`
            : 'Ainda trancado.'}
      </p>
    </aside>
  );
}
