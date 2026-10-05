'use client';

// O mapa da temporada (revisão 3 do DESIGN.md): a imagem em pixel art (public/pixel/mapa.png)
// e, por cima, os 80 dias na estrada, os chefes no fim de cada semana, os baús e o ferreiro no
// dia de hoje. A estrada vem de src/config/mapa.json, a mesma que desenhou a imagem.

import { useState, type KeyboardEvent } from 'react';
import mapa from '@/config/mapa.json';
import { season1 } from '@/config/season1';
import { shortDate } from '@/lib/time';
import type { ChestState, DayInfo, GameState, WeekInfo } from '@/lib/types';
import { bossOfWeek } from './bosses';
import { dayTooltip, heatReason, WEEKDAY_SHORT } from './format';
import { heroTier } from './pixel';

type Pt = { x: number; y: number; nx: number; ny: number };
type Selection = { kind: 'day'; index: number } | { kind: 'boss'; week: number } | { kind: 'chest'; id: number };

const W = mapa.width;
const H = mapa.height;
const PATH = mapa.path as [number, number][];

function buildPath() {
  const segs = PATH.slice(1).map((b, i) => {
    const a = PATH[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, len };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  function at(d: number): Pt {
    let rest = Math.max(0, Math.min(total, d));
    for (const s of segs) {
      if (rest <= s.len) {
        const t = s.len === 0 ? 0 : rest / s.len;
        const dx = (s.b[0] - s.a[0]) / s.len;
        const dy = (s.b[1] - s.a[1]) / s.len;
        // normal à esquerda do sentido da caminhada (estrada indo para a direita: normal para cima)
        return { x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, nx: dy, ny: -dx };
      }
      rest -= s.len;
    }
    const last = segs[segs.length - 1];
    return { x: last.b[0], y: last.b[1], nx: 0, ny: -1 };
  }
  return { total, at };
}

// A estrada é fixa: calcula uma vez só.
const GEO = buildPath();

const CHEST_DAY: Record<string, (state: GameState) => number> = {
  'first-boss': () => 7,
  streak: () => 21,
  'midpoint-grade': (s) => (s.days.find((d) => d.date === '2026-11-13')?.index ?? 40),
  'study-hours': () => 50,
  'final-grade': () => 80,
};

function heatFill(d: DayInfo): string {
  if (d.breakKind && d.studyMinutes === 0) return 'url(#mapa-folga)';
  if (d.isFuture || d.heat === null) return 'rgba(26, 20, 16, 0.18)';
  return `var(--heat-${d.heat})`;
}

function bossStatus(w: WeekInfo): string {
  if (w.bossDefeated) return 'derrotado';
  if (w.isCurrent) return 'em combate esta semana';
  if (w.isClosed) return 'escapou';
  return 'esperando';
}

export function SeasonMap({ state }: { state: GameState }) {
  const geo = GEO;
  const n = state.days.length;
  const dayPt = (index: number) => geo.at((geo.total * (index - 0.5)) / n);
  const todayIndex = state.dayIndex;
  const [sel, setSel] = useState<Selection>(
    todayIndex ? { kind: 'day', index: todayIndex } : { kind: 'boss', week: 1 },
  );
  const [hover, setHover] = useState<number | null>(null);

  const heroPt =
    state.phase === 'before' ? geo.at(0) : state.phase === 'after' || !todayIndex ? geo.at(geo.total) : dayPt(todayIndex);
  const hero = heroTier(state.xp.level);

  const bosses = state.weeks.map((w) => {
    const lastDay = state.days.filter((d) => d.weekIndex === w.index).at(-1)?.index ?? n;
    const p = w.isFinal ? geo.at(geo.total) : dayPt(lastDay);
    return { w, boss: bossOfWeek(w.index, w.isFinal), p };
  });

  const chests = state.chests.map((c) => {
    const cfg = season1.chests.find((x) => x.id === c.id);
    const day = cfg ? CHEST_DAY[cfg.kind](state) : 80;
    return { c, p: dayPt(day), day };
  });

  function onDaysKey(e: KeyboardEvent<SVGGElement>) {
    const cur = sel.kind === 'day' ? sel.index : (todayIndex ?? 1);
    let next = cur;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(n, cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, cur - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = n;
    else return;
    e.preventDefault();
    setSel({ kind: 'day', index: next });
  }

  function activate(e: KeyboardEvent, s: Selection) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSel(s);
    }
  }

  const hovered = hover !== null ? state.days[hover - 1] : null;
  const hoverPt = hover !== null ? dayPt(hover) : null;

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <div
          className="relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-[10px] border-2 border-[#2b241e]"
          style={{ aspectRatio: `${W} / ${H}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art sem reamostragem */}
          <img
            src="/pixel/mapa.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />

          {mapa.regions.map((r) => (
            <span
              key={r.label}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-[#2b241e] bg-[#f3ecdd] px-2 py-0.5 font-gothic text-[clamp(0.7rem,1.3vw,1.05rem)] font-bold text-[#2b241e]"
              style={{ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%` }}
            >
              {r.label}
            </span>
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Mapa da temporada">
            <defs>
              <pattern id="mapa-folga" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="3" height="3" fill="#d8cbae" />
                <line x1="0" y1="0" x2="0" y2="3" stroke="#47423d" strokeWidth="1.4" />
              </pattern>
            </defs>

            {/* os 80 dias */}
            <g
              role="listbox"
              aria-label="Dias da temporada. Use as setas para andar pela estrada."
              tabIndex={0}
              onKeyDown={onDaysKey}
              className="outline-none"
            >
              {state.days.map((d) => {
                const p = dayPt(d.index);
                const isSel = sel.kind === 'day' && sel.index === d.index;
                const size = d.isToday ? 7 : 5;
                return (
                  <g
                    key={d.date}
                    role="option"
                    aria-selected={isSel}
                    aria-label={dayTooltip(d)}
                    onPointerEnter={() => setHover(d.index)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => setSel({ kind: 'day', index: d.index })}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect x={p.x - 6} y={p.y - 6} width={12} height={12} fill="transparent" />
                    <rect
                      x={Math.round(p.x - size / 2)}
                      y={Math.round(p.y - size / 2)}
                      width={size}
                      height={size}
                      fill={heatFill(d)}
                      stroke={isSel ? '#fff3c4' : d.shieldUsed ? '#7e9be0' : '#1a1410'}
                      strokeWidth={isSel ? 1.5 : 1}
                    />
                  </g>
                );
              })}
            </g>

            {/* baús */}
            {chests.map(({ c, p }) => {
              const x = Math.round(p.x - p.nx * 15 - 8);
              const y = Math.round(p.y - p.ny * 15 - 8);
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
            {bosses.map(({ w, boss, p }) => {
              const off = w.isFinal ? 0 : 26;
              const x = Math.round(p.x + p.nx * off - 16);
              const y = Math.round(p.y + p.ny * off - (w.isFinal ? 46 : 16));
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
                  <ellipse cx={x + 16} cy={y + 31} rx={11} ry={3} fill="rgba(26,20,16,0.35)" />
                  <image
                    href={`/pixel/${boss.sprite}.png`}
                    x={x}
                    y={y}
                    width={32}
                    height={32}
                    style={{
                      imageRendering: 'pixelated',
                      filter: w.bossDefeated ? 'grayscale(1) opacity(0.55)' : !w.isClosed && !w.isCurrent ? 'saturate(0.85)' : undefined,
                    }}
                  />
                  {w.bossDefeated ? (
                    <path d={`M${x + 6} ${y + 6} L${x + 26} ${y + 26} M${x + 26} ${y + 6} L${x + 6} ${y + 26}`} stroke="#8e2a1c" strokeWidth={3} />
                  ) : null}
                  {isSel ? <rect x={x - 2} y={y - 2} width={36} height={36} fill="none" stroke="#fff3c4" strokeWidth={1.5} /> : null}
                </g>
              );
            })}

            {/* o ferreiro */}
            <g className="forja-bob" aria-hidden="true">
              <ellipse cx={heroPt.x} cy={heroPt.y + 1} rx={9} ry={3} fill="rgba(26,20,16,0.4)" />
              <image
                href={`/pixel/${hero.sprite}.png`}
                x={Math.round(heroPt.x - 16)}
                y={Math.round(heroPt.y - 30)}
                width={32}
                height={32}
                style={{ imageRendering: 'pixelated' }}
              />
            </g>
          </svg>

          {hovered && hoverPt ? (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[#2b241e] bg-[#f3ecdd] px-2 py-1 text-small text-[#2b241e] shadow"
              style={{ left: `${(hoverPt.x / W) * 100}%`, top: `${((hoverPt.y - 10) / H) * 100}%` }}
            >
              <span className="num">{dayTooltip(hovered)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Details state={state} sel={sel} chests={chests.map((x) => ({ chest: x.c, day: x.day }))} />
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { fill: 'var(--heat-4)', label: 'incandescente' },
    { fill: 'var(--heat-3)', label: 'palha' },
    { fill: 'var(--heat-2)', label: 'meta cumprida' },
    { fill: 'var(--heat-1)', label: 'estudou pouco' },
    { fill: 'var(--heat-0)', label: 'sem estudo' },
    { fill: 'rgba(26,20,16,0.18)', label: 'por vir' },
  ];
  return (
    <ul className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-bg p-4 text-small text-muted" aria-label="Legenda">
      <li className="mb-1 font-gothic text-[1.125rem] font-bold text-ink">Legenda</li>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 border border-[#1a1410]" style={{ background: i.fill }} />
          {i.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 border border-[#1a1410] forja-hatched" />
        folga
      </li>
      <li className="mt-2 text-ink">Clique num dia, num chefe ou num baú para ver os detalhes. Pelo teclado, as setas andam pela estrada.</li>
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
            style={{ imageRendering: 'pixelated', filter: w.bossDefeated ? 'grayscale(1) opacity(0.55)' : undefined }}
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
