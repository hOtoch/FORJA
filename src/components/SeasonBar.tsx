'use client';

// A barra da temporada: 80 segmentos de ferro forjado, um por dia (DESIGN.md, seção 6).

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { season1 } from '@/config/season1';
import { monthName } from '@/lib/time';
import type { DayInfo, GameState } from '@/lib/types';
import { Sparks } from './feedback';
import { dayAriaLabel, dayTooltip } from './format';

const WARM_KEY = 'forja:aquecida';
const MIDPOINT = season1.chests.find((c) => c.kind === 'midpoint-grade')?.date ?? null;

interface Props {
  state: GameState;
  onSelectDay: (date: string) => void;
}

function heatAttr(day: DayInfo): string {
  if (day.isFuture || day.heat === null) return 'future';
  return String(day.heat);
}

function bottomLabel(day: DayInfo, isLast: boolean): { text: string; size: 'micro' | 'small' } | null {
  if (isLast) return { text: 'fim, Réveillon em 28/12', size: 'small' };
  if (day.date === MIDPOINT) return { text: 'metade', size: 'small' };
  if (day.index === 1 || day.date.endsWith('-01')) return { text: monthName(day.date), size: 'micro' };
  return null;
}

/**
 * Script que roda durante o parse do HTML, antes da primeira pintura:
 * na primeira abertura do dia, liga o aquecimento. Segue o padrão de
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
 */
function WarmScript({ today }: { today: string }) {
  const html = `(function(){try{var d=${JSON.stringify(today)};if(localStorage.getItem("${WARM_KEY}")===d)return;localStorage.setItem("${WARM_KEY}",d);if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;var b=document.getElementById("forja-barra");if(b)b.classList.add("is-warming")}catch(e){}})()`;
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function SeasonBar({ state, onSelectDay }: Props) {
  const { days, weeks, today, todayInfo } = state;
  const last = days.length - 1;
  const initialFocus = todayInfo ? todayInfo.index - 1 : state.phase === 'after' ? last : 0;
  const [focusIndex, setFocusIndex] = useState(initialFocus);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);

  // Martelada quando o calor de hoje muda; faíscas quando a meta é batida.
  const todayHeat = todayInfo?.heat ?? null;
  const todayMet = todayInfo?.studyMet ?? false;
  const [seen, setSeen] = useState({ date: today, heat: todayHeat, met: todayMet });
  const [hit, setHit] = useState(false);
  const [sparkKey, setSparkKey] = useState(0);
  if (seen.date !== today || seen.heat !== todayHeat || seen.met !== todayMet) {
    setSeen({ date: today, heat: todayHeat, met: todayMet });
    if (seen.date === today) {
      if (seen.heat !== todayHeat) setHit(true);
      if (!seen.met && todayMet) setSparkKey((k) => k + 1);
    }
  }

  // Aquecimento: o script inline cuida da carga completa; aqui fica o caso de
  // navegação pelo cliente e a remoção da classe depois da animação.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let warming = bar.classList.contains('is-warming');
    if (!warming) {
      try {
        if (localStorage.getItem(WARM_KEY) !== today) {
          localStorage.setItem(WARM_KEY, today);
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            bar.classList.add('is-warming');
            warming = true;
          }
        }
      } catch {
        // sem localStorage: a barra aparece pronta
      }
    }
    if (!warming) return;
    const t = window.setTimeout(() => bar.classList.remove('is-warming'), 1800);
    return () => window.clearTimeout(t);
  }, [today]);

  function move(next: number) {
    const i = Math.max(0, Math.min(last, next));
    setFocusIndex(i);
    buttons.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const map: Record<string, number> = {
      ArrowRight: focusIndex + 1,
      ArrowLeft: focusIndex - 1,
      ArrowDown: focusIndex + 7,
      ArrowUp: focusIndex - 7,
      PageDown: focusIndex + 7,
      PageUp: focusIndex - 7,
      Home: 0,
      End: last,
    };
    if (e.key in map) {
      e.preventDefault();
      move(map[e.key]);
    }
  }

  const current = state.currentWeek;

  return (
    <div className="forja-bar-wrap">
      <div
        id="forja-barra"
        ref={barRef}
        className="forja-bar"
        role="toolbar"
        aria-label="Barra da temporada, 80 dias de 5 de outubro a 23 de dezembro. Use as setas para andar pelos dias e Enter para abrir um dia."
        onKeyDown={onKeyDown}
        suppressHydrationWarning
      >
        {weeks.map((week) => {
          const weekDays = days.filter((d) => d.weekIndex === week.index);
          const n = weekDays.length;
          return (
            <div
              key={week.index}
              className="forja-week"
              style={{ flex: `${n} 1 ${(n - 1) * 2}px` }}
              role="presentation"
            >
              {weekDays.map((day) => {
                const i = day.index - 1;
                const label = bottomLabel(day, i === last);
                const warm = !day.isFuture && !day.breakKind && day.heat !== null;
                return (
                  <div key={day.date} className="forja-cell">
                    {day.isToday ? (
                      <span className="forja-label forja-label-top text-small font-medium">hoje</span>
                    ) : null}
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      className={day.isToday && hit ? 'forja-seg is-hit' : 'forja-seg'}
                      data-heat={heatAttr(day)}
                      data-break={day.breakKind ? '' : undefined}
                      data-shield={day.shieldUsed ? '' : undefined}
                      data-today={day.isToday ? '' : undefined}
                      data-warm={warm ? '' : undefined}
                      style={{ '--i': i } as CSSProperties}
                      tabIndex={i === focusIndex ? 0 : -1}
                      aria-label={dayAriaLabel(day)}
                      aria-current={day.isToday ? 'date' : undefined}
                      onFocus={() => setFocusIndex(i)}
                      onClick={() => {
                        setFocusIndex(i);
                        onSelectDay(day.date);
                      }}
                      onAnimationEnd={(e) => {
                        if (e.animationName === 'forja-hammer') setHit(false);
                      }}
                    />
                    <span
                      className="forja-tip"
                      data-align={i < 5 ? 'start' : i > last - 5 ? 'end' : undefined}
                      aria-hidden="true"
                    >
                      {dayTooltip(day)}
                    </span>
                    {label ? (
                      <span
                        className={`forja-label forja-label-bottom ${i === last ? 'forja-label-end' : ''} ${
                          label.size === 'micro' ? 'text-micro font-medium text-muted' : 'text-small font-medium text-muted'
                        }`}
                      >
                        {label.text}
                      </span>
                    ) : null}
                    {day.isToday && sparkKey > 0 ? <Sparks key={sparkKey} onDone={() => setSparkKey(0)} /> : null}
                  </div>
                );
              })}
              {current?.index === week.index ? (
                <span className="forja-week-label text-small font-medium">semana {week.index}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <WarmScript today={today} />
      <p className="mt-2 text-small text-muted md:hidden">
        {state.dayIndex ? `Dia ${state.dayIndex} de ${days.length}` : 'Temporada de 80 dias'}
        {current ? `, semana ${current.index}` : ''}. Fim em 23/12, Réveillon em 28/12.
      </p>
    </div>
  );
}
