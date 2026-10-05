// Personagem (revisão 2): retrato do ferreiro, nível e título, XP até o próximo nível e os
// três atributos com ícone. Escudos e sequência ficam na faixa da temporada.

import type { ReactNode } from 'react';
import type { GameState } from '@/lib/types';
import { SmithArt } from './art';
import { fmtInt } from './format';
import { BookIcon, HammerSolidIcon, HeartIcon } from './icons';
import { Meter } from './viz';

function Attr({ icon, name, value, max }: { icon: ReactNode; name: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[20px_6.5rem_minmax(0,1fr)_3.5rem] items-center gap-x-2.5">
      <span className="text-muted" aria-hidden="true">
        {icon}
      </span>
      <span className="text-small">{name}</span>
      <Meter value={value} max={max} size="sm" label={`${name}: ${fmtInt(value)} XP`} />
      <span className="text-right text-small font-bold num">{fmtInt(value)}</span>
    </div>
  );
}

export function CharacterPanel({ state }: { state: GameState }) {
  const { xp } = state;
  const span = xp.nextLevelXp - xp.levelStartXp;
  const into = xp.total - xp.levelStartXp;
  const top = Math.max(1, xp.byAttr.inteligencia, xp.byAttr.forca, xp.byAttr.vigor);

  return (
    <section aria-labelledby="personagem-titulo" className="card">
      <div className="card-head">
        <h2 id="personagem-titulo" className="card-title">
          Personagem
        </h2>
        <span className="card-meta num">{fmtInt(xp.total)} XP</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <SmithArt size={88} />
          <span
            className="absolute -bottom-1 -right-1 flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-surface bg-ink px-1.5 text-body font-bold text-bg num"
            aria-hidden="true"
          >
            {xp.level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lead font-bold">
            Nível {xp.level}
            <span className="font-medium text-muted">, {xp.title}</span>
          </p>
          <div className="mt-2">
            <Meter
              value={into}
              max={span}
              color="var(--money)"
              label={`${fmtInt(into)} de ${fmtInt(span)} XP para o nível ${xp.level + 1}`}
            />
          </div>
          <p className="mt-1 text-small text-muted num">
            Faltam {fmtInt(xp.nextLevelXp - xp.total)} XP para o nível {xp.level + 1}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Attr icon={<BookIcon size={20} />} name="Inteligência" value={xp.byAttr.inteligencia} max={top} />
        <Attr icon={<HammerSolidIcon size={20} />} name="Força" value={xp.byAttr.forca} max={top} />
        <Attr icon={<HeartIcon size={20} />} name="Vigor" value={xp.byAttr.vigor} max={top} />
      </div>
    </section>
  );
}
