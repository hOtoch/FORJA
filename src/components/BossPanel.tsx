'use client';

// Chefe da semana (revisão 2): retrato, barra de vida e a semana dia a dia em ícones.
// A vida do chefe é tudo o que a semana pede (dias de estudo, treinos, cardios); cada
// coisa feita é um golpe.

import { useState } from 'react';
import { season1 } from '@/config/season1';
import { formatBRL } from '@/lib/cardio';
import { daysBetween, longDate, shortDate } from '@/lib/time';
import type { DayInfo, GameState, WeekInfo } from '@/lib/types';
import { bossOfWeek } from './bosses';
import { Sparks } from './feedback';
import { joinPt, plural, WEEKDAY_SHORT } from './format';
import { Medallion, Sprite } from './pixel';
import { Meter } from './viz';

function cardioNumbers(w: WeekInfo) {
  const needSuper = w.superRequired && !w.hasSuper;
  const effective = needSuper ? Math.min(w.cardio, season1.goals.cardioMaxWithoutSuper) : w.cardio;
  const left = Math.max(0, w.cardioTarget - effective - (needSuper ? 1 : 0));
  return { needSuper, effective, left };
}

/** Vida total e golpes já dados. */
export function bossHp(w: WeekInfo) {
  const { effective } = cardioNumbers(w);
  const total = w.studyDaysRequired + w.gymTarget + w.cardioTarget;
  const hits =
    Math.min(w.studyDaysMet, w.studyDaysRequired) + Math.min(w.gym, w.gymTarget) + Math.min(effective, w.cardioTarget);
  return { total, left: Math.max(0, total - hits) };
}

function missingSentence(state: GameState, w: WeekInfo): string {
  if (w.bossDefeated) {
    const prize = w.isFinal
      ? `${season1.xp.boss} XP e ${formatBRL(season1.fund.finalBossCents)} no Fundo`
      : `1 escudo, ${season1.xp.boss} XP e ${formatBRL(season1.fund.bossCents)} no Fundo`;
    return `Derrotado. Você ganhou ${prize}.`;
  }
  if (w.shieldDays > 0) return 'Um dia foi salvo por escudo, então este chefe não cai. Treinos e cardios ainda rendem.';
  const { needSuper, left } = cardioNumbers(w);
  const missing: string[] = [];
  const studyLeft = w.studyDaysRequired - w.studyDaysMet;
  if (studyLeft > 0) missing.push(plural(studyLeft, 'dia de estudo', 'dias de estudo'));
  const gymLeft = Math.max(0, w.gymTarget - w.gym);
  if (gymLeft > 0) missing.push(plural(gymLeft, 'treino', 'treinos'));
  if (left > 0) missing.push(plural(left, 'cardio', 'cardios'));
  if (needSuper) missing.push('o supercardio');
  if (missing.length === 0) return 'Tudo cumprido. O chefe cai quando a semana fechar.';
  const daysLeft = daysBetween(state.today, w.end) + 1;
  return `Faltam ${joinPt(missing)}, em ${daysLeft === 1 ? '1 dia' : `${daysLeft} dias`}.`;
}

/** Opacidade do ícone de estudo: cheio se cumpriu, pela metade se estudou pouco. */
function studyOpacity(d: DayInfo): number {
  if (d.studyMet) return 1;
  if (d.studyMinutes > 0) return 0.55;
  return 0.18;
}

function BossFigure({ sprite, defeated, title }: { sprite: string; defeated: boolean; title?: string }) {
  return (
    <span className="relative" title={title}>
      <Medallion size={100}>
        {/* 84 de 100: zzz, asas e fogos não encostam na borda do medalhão */}
        <Sprite name={sprite} base={28} scale={3} faded={defeated} style={{ marginBottom: 8 }} />
      </Medallion>
      {defeated ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="rotate-[-12deg] rounded-[4px] border-2 border-[var(--wax)] bg-[var(--surface)] px-1.5 text-small font-bold text-[var(--wax)]">
            derrotado
          </span>
        </span>
      ) : null}
    </span>
  );
}

function WeekStrip({ days }: { days: DayInfo[] }) {
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((d) => {
        const off = d.breakKind !== null;
        return (
          <li
            key={d.date}
            className={`flex flex-col items-center gap-1 rounded-lg px-0.5 py-2 ${
              d.isToday ? 'bg-bg ring-2 ring-[var(--heat-2)]' : off ? 'forja-hatched' : 'bg-bg'
            }`}
            aria-label={`${WEEKDAY_SHORT[d.weekday - 1]}, ${shortDate(d.date)}: ${
              off
                ? 'folga'
                : [
                    d.studyMet ? 'estudo cumprido' : d.studyMinutes > 0 ? `${d.studyMinutes} min de estudo` : 'sem estudo',
                    d.gym > 0 ? 'treino' : null,
                    d.cardio > 0 ? (d.superCardio > 0 ? 'supercardio' : 'cardio') : null,
                  ]
                    .filter(Boolean)
                    .join(', ')
            }`}
          >
            <span className={`text-micro font-bold ${d.isToday ? '' : 'text-muted'}`}>
              {d.isToday ? 'hoje' : WEEKDAY_SHORT[d.weekday - 1]}
            </span>
            <span className="text-small font-bold num" aria-hidden="true">
              {Number(d.date.slice(8, 10))}
            </span>
            {off ? (
              <span className="py-[26px] text-micro font-medium text-muted" aria-hidden="true">
                folga
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1" aria-hidden="true">
                <Sprite name="icone-livro" base={12} scale={2} style={{ opacity: studyOpacity(d) }} />
                <Sprite name="icone-martelo" base={12} scale={2} style={{ opacity: d.gym > 0 ? 1 : 0.18 }} />
                <span className="relative">
                  <Sprite name="icone-coracao" base={12} scale={2} style={{ opacity: d.cardio > 0 ? 1 : 0.18 }} />
                  {d.superCardio > 0 ? (
                    <span className="absolute -right-2.5 -top-2">
                      <Sprite name="icone-chama" base={12} scale={1} />
                    </span>
                  ) : null}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function BossPanel({ state }: { state: GameState }) {
  const w = state.currentWeek;
  const defeated = w?.bossDefeated ?? false;
  const [seen, setSeen] = useState({ week: w?.index ?? 0, defeated });
  const [sparkKey, setSparkKey] = useState(0);
  if (seen.week !== (w?.index ?? 0) || seen.defeated !== defeated) {
    setSeen({ week: w?.index ?? 0, defeated });
    if (seen.week === (w?.index ?? 0) && !seen.defeated && defeated) setSparkKey((k) => k + 1);
  }

  if (!w) {
    const beaten = state.weeks.filter((x) => x.bossDefeated).length;
    const first = bossOfWeek(1);
    return (
      <section aria-labelledby="chefe-titulo" className="card">
        <div className="card-head">
          <h2 id="chefe-titulo" className="card-title">
            Chefe da semana
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <BossFigure sprite={first.sprite} defeated={false} title={first.lore} />
          <p className="text-body">
            {state.phase === 'before'
              ? `${first.name} aparece na ${longDate(season1.start)}.`
              : `A temporada acabou. Chefes derrotados: ${beaten} de ${state.weeks.length}.`}
          </p>
        </div>
      </section>
    );
  }

  const boss = bossOfWeek(w.index, w.isFinal);
  const hp = bossHp(w);
  const days = state.days.filter((d) => d.weekIndex === w.index);
  const cardio = cardioNumbers(w);

  return (
    <section aria-labelledby="chefe-titulo" className="card relative">
      <div className="card-head">
        <h2 id="chefe-titulo" className="card-title relative">
          {w.isFinal ? 'Chefe final' : `Chefe da semana ${w.index}`}
          {sparkKey > 0 ? <Sparks key={sparkKey} onDone={() => setSparkKey(0)} /> : null}
        </h2>
        <span className="card-meta num">
          {shortDate(w.start)} a {shortDate(w.end)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <BossFigure sprite={boss.sprite} defeated={defeated} title={boss.lore} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lead font-bold">{boss.name}</p>
          <p className="truncate text-small italic text-muted">{boss.lore}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <Meter
                value={hp.left}
                max={hp.total}
                color="var(--heat-1)"
                label={`Vida do chefe: ${hp.left} de ${hp.total}`}
              />
            </div>
            <span className="shrink-0 text-small font-bold num">
              {defeated ? 'derrotado' : `${hp.left} de ${hp.total}`}
            </span>
          </div>
          <p className="mt-1.5 text-small text-muted">{missingSentence(state, w)}</p>
        </div>
      </div>

      <div className="mt-4">
        <WeekStrip days={days} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-micro font-medium text-muted">Estudo</dt>
          <dd className="text-body font-bold num">
            {w.studyDaysMet} de {w.studyDaysRequired}
          </dd>
        </div>
        <div>
          <dt className="text-micro font-medium text-muted">Academia</dt>
          <dd className="text-body font-bold num">
            {Math.min(w.gym, w.gymTarget)} de {w.gymTarget}
          </dd>
        </div>
        <div>
          <dt className="text-micro font-medium text-muted">Cardio</dt>
          <dd className="text-body font-bold num">
            {Math.min(cardio.effective, w.cardioTarget)} de {w.cardioTarget}
            {w.superRequired ? (
              <span className="ml-1 text-micro font-medium text-muted">{w.hasSuper ? '(super feito)' : '(falta o super)'}</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}
