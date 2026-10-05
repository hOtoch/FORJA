// Pixel art do Forja (revisão 3 do DESIGN.md). Os PNG ficam em public/pixel e são gerados por
// scripts/pixel/build.py com a skill pixel-art-gen: 1 px de arte = 1 px de imagem, ampliado
// aqui por múltiplos inteiros com image-rendering: pixelated, para os pixels ficarem nítidos.

import type { CSSProperties, ReactNode } from 'react';
import { season1 } from '@/config/season1';

export interface SpriteProps {
  name: string;
  /** Tamanho original da arte (32 para personagem e chefes, 16 para baús, 12 para ícones). */
  base?: number;
  /** Fator inteiro de ampliação. */
  scale?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Silhueta escura (evolução ainda não alcançada). */
  locked?: boolean;
  /** Apagado (chefe derrotado, baú que não abriu). */
  faded?: boolean;
}

export function Sprite({ name, base = 32, scale = 3, alt = '', className, style, locked, faded }: SpriteProps) {
  const size = base * scale;
  const filter = locked ? 'brightness(0) opacity(0.28)' : faded ? 'grayscale(1) opacity(0.5)' : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pixel art: sem reamostragem do otimizador
    <img
      src={`/pixel/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={className}
      style={{ imageRendering: 'pixelated', filter, ...style }}
    />
  );
}

// ---------- evoluções do personagem ----------

export interface HeroTier {
  index: number;
  minLevel: number;
  title: string;
  sprite: string;
}

/** Uma evolução por título (season1.titles): Aprendiz, Malhador, Ferreiro, Armeiro, Mestre, Lenda. */
export const HERO_TIERS: HeroTier[] = season1.titles.map(([minLevel, title], i) => ({
  index: i,
  minLevel: i === 0 ? 0 : minLevel,
  title,
  sprite: `heroi-${i + 1}`,
}));

export function heroTier(level: number): HeroTier {
  let tier = HERO_TIERS[0];
  for (const t of HERO_TIERS) if (level >= t.minLevel) tier = t;
  return tier;
}

export function nextHeroTier(level: number): HeroTier | null {
  return HERO_TIERS.find((t) => t.minLevel > level) ?? null;
}

/** Medalhão de ferro em volta de um sprite (o mesmo nos dois temas). */
export function Medallion({
  children,
  size,
  center = false,
}: {
  children: ReactNode;
  size: number;
  /** Centraliza na vertical (itens); senão o sprite fica apoiado embaixo (personagens). */
  center?: boolean;
}) {
  return (
    <span
      className={`relative flex shrink-0 justify-center overflow-hidden rounded-full ${center ? 'items-center' : 'items-end'}`}
      style={{ width: size, height: size, background: '#2b241e', boxShadow: '0 0 0 2px #8a6a1f, 0 0 0 3px var(--line)' }}
    >
      {children}
    </span>
  );
}
