'use client';

// Gráficos do painel (skill dataviz): anel da meta do dia, medidores e as colunas do estudo
// dos últimos 14 dias. Uma série só, uma cor só; texto sempre em tinta, nunca na cor da série.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

// ---------- Anel ----------

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Excedente além de `max` (até mais um `max`), num anel interno fino. */
  bonusColor?: string;
  label: string;
  children?: ReactNode;
}

export function RingMeter({
  value,
  max,
  size = 132,
  stroke = 12,
  color = 'var(--heat-2)',
  bonusColor = 'var(--heat-3)',
  label,
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const main = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const bonus = max > 0 ? Math.max(0, Math.min(1, (value - max) / max)) : 0;
  const ri = r - stroke / 2 - 5;
  const ci = 2 * Math.PI * ri;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {main > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap={main < 1 ? 'round' : 'butt'}
            strokeDasharray={`${c * main} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="forja-ring-arc"
          />
        ) : null}
        {bonus > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={ri}
            fill="none"
            stroke={bonusColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${ci * bonus} ${ci}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ---------- Medidor ----------

export function Meter({
  value,
  max,
  color,
  size = 'md',
  label,
}: {
  value: number;
  max: number;
  color?: string;
  size?: 'sm' | 'md';
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={size === 'sm' ? 'meter meter-sm' : 'meter'}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ---------- Colunas do estudo ----------

export interface StudyBar {
  date: string;
  /** "seg, 12/10" */
  label: string;
  /** "12" */
  tick: string;
  /** "S", "T", "Q"... */
  weekday: string;
  minutes: number;
  isFuture: boolean;
  isToday: boolean;
  isBreak: boolean;
}

const H = 196;
const PAD_L = 34;
const PAD_R = 8;
const PAD_T = 14;
const PLOT_H = 132;
const BASE = PAD_T + PLOT_H;

function niceMax(values: number[], goal: number): number {
  const top = Math.max(goal * 2, ...values);
  return Math.ceil(top / 30) * 30;
}

export function StudyChart({ bars, goal, title }: { bars: StudyBar[]; goal: number; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();
  // Desenha na largura real (sem esticar o SVG), para o texto manter o tamanho em qualquer tela.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const yMax = niceMax(bars.map((b) => b.minutes), goal);
  const band = (W - PAD_L - PAD_R) / bars.length;
  const barW = Math.max(6, Math.min(24, band - (band > 24 ? 8 : 4)));
  const y = (v: number) => BASE - (v / yMax) * PLOT_H;
  const ticks = [0, goal, yMax].filter((v, i, a) => a.indexOf(v) === i);
  const shown = active !== null ? bars[active] : null;

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const last = bars.length - 1;
    if (e.key === 'ArrowRight') setActive((i) => (i === null ? 0 : Math.min(last, i + 1)));
    else if (e.key === 'ArrowLeft') setActive((i) => (i === null ? last : Math.max(0, i - 1)));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Escape') setActive(null);
    else return;
    e.preventDefault();
  }

  return (
    <figure ref={box} className="relative m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block overflow-visible outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] rounded"
        role="group"
        aria-label={`${title}. Use as setas para ler cada dia.`}
        aria-describedby={tableId}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        {/* grade e eixo: linhas finas, recessivas */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(t)}
              y2={y(t)}
              stroke={t === goal ? 'var(--text)' : 'var(--line)'}
              strokeWidth={t === goal ? 1.5 : 1}
            />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--text-muted)" className="num">
              {t}
            </text>
          </g>
        ))}

        {bars.map((b, i) => {
          const cx = PAD_L + band * i + band / 2;
          const h = b.minutes > 0 ? Math.max(4, (Math.min(b.minutes, yMax) / yMax) * PLOT_H) : 0;
          const top = BASE - h;
          const r = Math.min(4, h);
          const x = cx - barW / 2;
          const isActive = active === i;
          return (
            <g key={b.date} onPointerEnter={() => setActive(i)} onPointerMove={() => setActive(i)}>
              {/* área de toque maior que a coluna */}
              <rect x={PAD_L + band * i} y={PAD_T} width={band} height={PLOT_H + 40} fill="transparent" />
              {isActive ? (
                <rect x={PAD_L + band * i + 2} y={PAD_T} width={band - 4} height={PLOT_H} fill="var(--hover)" rx="4" />
              ) : null}
              {b.isBreak && b.minutes === 0 ? (
                <rect x={x} y={BASE - 10} width={barW} height={10} rx="2" fill="url(#forja-hatch)" />
              ) : null}
              {h > 0 ? (
                <path
                  d={`M${x} ${BASE} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + barW - r} Q${x + barW} ${top} ${x + barW} ${top + r} V${BASE} Z`}
                  fill="var(--heat-2)"
                  opacity={active === null || isActive ? 1 : 0.55}
                />
              ) : null}
              <text
                x={cx}
                y={BASE + 16}
                textAnchor="middle"
                fontSize="12"
                fontWeight={b.isToday ? 700 : 500}
                fill={b.isFuture ? 'var(--text-muted)' : 'var(--text)'}
                className="num"
              >
                {b.tick}
              </text>
              <text x={cx} y={BASE + 30} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {b.isToday ? 'hoje' : b.weekday}
              </text>
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - PAD_R} y1={BASE} y2={BASE} stroke="var(--text-muted)" strokeWidth="1" />
        <defs>
          <pattern id="forja-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--track)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--text-muted)" strokeWidth="1.5" />
          </pattern>
        </defs>
      </svg>

      {shown ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-small shadow-sm"
          style={{ left: `${((PAD_L + band * (active ?? 0) + band / 2) / W) * 100}%` }}
          role="status"
        >
          <p className="font-bold num">
            {shown.isFuture ? 'ainda não chegou' : shown.isBreak && shown.minutes === 0 ? 'folga' : `${shown.minutes} min`}
          </p>
          <p className="text-muted">{shown.label}</p>
        </div>
      ) : null}

      <p className="mt-1 flex items-center gap-2 text-small text-muted" aria-hidden="true">
        <span className="inline-block h-[2px] w-5 bg-ink" />
        meta de {goal} min
        <span className="ml-3 inline-block h-3 w-3 rounded-[2px] bg-[var(--heat-2)]" />
        minutos de estudo
      </p>

      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Minutos de estudo</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.date}>
              <th scope="row">{b.label}</th>
              <td>{b.isFuture ? 'ainda não chegou' : b.isBreak && b.minutes === 0 ? 'folga' : `${b.minutes} min`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
