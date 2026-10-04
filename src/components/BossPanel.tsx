'use client';

// Chefe da semana: três linhas com marcadores quadrados; o supercardio é um losango.

import { useState } from 'react';
import { season1 } from '@/config/season1';
import { daysBetween, longDate } from '@/lib/time';
import type { GameState, WeekInfo } from '@/lib/types';
import { Sparks } from './feedback';
import { formatBRL } from '@/lib/cardio';
import { joinPt, plural } from './format';

function Markers({ total, filled, diamond }: { total: number; filled: number; diamond: 'filled' | 'empty' | null }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-[1px] border-[1.5px] border-ink ${i < filled ? 'bg-ink' : ''}`}
        />
      ))}
      {diamond ? (
        <span
          className={`ml-1 h-[10px] w-[10px] rotate-45 rounded-[1px] border-[1.5px] border-ink ${
            diamond === 'filled' ? 'bg-ink' : ''
          }`}
        />
      ) : null}
    </span>
  );
}

function cardioNumbers(w: WeekInfo) {
  const needSuper = w.superRequired && !w.hasSuper;
  const effective = needSuper ? Math.min(w.cardio, season1.goals.cardioMaxWithoutSuper) : w.cardio;
  const left = Math.max(0, w.cardioTarget - effective - (needSuper ? 1 : 0));
  return { needSuper, effective, left };
}

function bossSentence(state: GameState, w: WeekInfo): string {
  if (w.bossDefeated) {
    if (w.isFinal)
      return `Chefe final derrotado: ${season1.xp.boss} XP e ${formatBRL(season1.fund.finalBossCents)} no Fundo.`;
    return state.streak.shields >= season1.shields.max && w.isClosed
      ? `Chefe derrotado: ${season1.xp.boss} XP e ${formatBRL(season1.fund.bossCents)} no Fundo. Os escudos já estavam cheios.`
      : `Chefe derrotado: 1 escudo, ${season1.xp.boss} XP e ${formatBRL(season1.fund.bossCents)} no Fundo.`;
  }
  if (w.shieldDays > 0)
    return 'Um dia desta semana foi salvo por escudo, então este chefe não cai. Treinos e cardios ainda rendem XP e Fundo.';
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
  return `Faltam ${joinPt(missing)}. ${daysLeft === 1 ? 'Hoje é o último dia da semana.' : `Restam ${daysLeft} dias na semana.`}`;
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
    return (
      <section aria-labelledby="chefe-titulo" className="min-w-0">
        <h2 id="chefe-titulo" className="font-gothic text-title font-bold">
          Chefe da semana
        </h2>
        <p className="mt-3 text-body">
          {state.phase === 'before'
            ? `O primeiro chefe aparece na ${longDate(season1.start)}.`
            : `A temporada acabou. Chefes derrotados: ${beaten} de ${state.weeks.length}.`}
        </p>
      </section>
    );
  }

  const cardio = cardioNumbers(w);
  const rows = [
    {
      name: 'Estudo',
      count: `${w.studyDaysMet} de ${w.studyDaysRequired} ${w.studyDaysRequired === 1 ? 'dia' : 'dias'}`,
      markers: <Markers total={w.studyDaysRequired} filled={w.studyDaysMet} diamond={null} />,
    },
    {
      name: 'Academia',
      count: `${w.gym} de ${w.gymTarget}`,
      markers: <Markers total={w.gymTarget} filled={Math.min(w.gym, w.gymTarget)} diamond={null} />,
    },
    {
      name: 'Cardio',
      count: `${cardio.effective} de ${w.cardioTarget}`,
      markers: w.superRequired ? (
        <Markers
          total={w.cardioTarget - 1}
          filled={Math.min(w.hasSuper ? w.cardio - 1 : w.cardio, w.cardioTarget - 1)}
          diamond={w.hasSuper ? 'filled' : 'empty'}
        />
      ) : (
        <Markers total={w.cardioTarget} filled={Math.min(w.cardio, w.cardioTarget)} diamond={null} />
      ),
      note: w.superRequired ? (w.hasSuper ? 'supercardio feito' : 'falta o supercardio') : null,
    },
  ];

  return (
    <section aria-labelledby="chefe-titulo" className="relative min-w-0">
      <h2 id="chefe-titulo" className="relative font-gothic text-title font-bold">
        {w.isFinal ? 'Chefe final' : `Chefe da semana ${w.index}`}
        {sparkKey > 0 ? <Sparks key={sparkKey} onDone={() => setSparkKey(0)} /> : null}
      </h2>
      <dl className="mt-3 grid w-fit grid-cols-[auto_auto_auto] items-center gap-x-6 gap-y-2">
        {rows.map((r) => (
          <div key={r.name} className="contents">
            <dt className="text-body">{r.name}</dt>
            <dd className="text-right text-body font-medium num">
              {r.count}
              {r.note ? <span className="sr-only">, {r.note}</span> : null}
            </dd>
            <dd>{r.markers}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-[34rem] text-body">{bossSentence(state, w)}</p>
      {state.status.weekAtRisk && state.status.reasons.length > 0 ? (
        <p className="mt-2 max-w-[34rem] text-small text-muted">A semana corre risco. {state.status.reasons.join(' ')}</p>
      ) : null}
    </section>
  );
}
