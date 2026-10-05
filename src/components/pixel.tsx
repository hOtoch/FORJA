// Desenhos do Forja (revisões 3 e 5 do DESIGN.md), todos em public/pixel:
// - personagem e chefes são ilustrações de 256 × 256 no estilo pixel art, reduzidas pelo
//   navegador com suavização (com pixelated, a redução serrilha);
// - baús, bolsa e ícones são pixel art de verdade, gerada por scripts/pixel/build.py (1 px de
//   arte = 1 px de imagem), ampliada por múltiplos inteiros com image-rendering: pixelated.

import type { CSSProperties, ReactNode } from 'react';
import { season1 } from '@/config/season1';

export interface SpriteProps {
  name: string;
  /** Tamanho de referência (32 para personagem e chefes, 16 para baús, 12 para ícones). */
  base?: number;
  /** Ampliação sobre o tamanho de referência (inteira, para a pixel art de verdade). */
  scale?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Silhueta escura (evolução ainda não alcançada). */
  locked?: boolean;
  /** Apagado (chefe derrotado, baú que não abriu). */
  faded?: boolean;
}

/** Ilustrações grandes (personagem e chefes): reduzidas com suavização, não com pixelated. */
export function isIllustration(name: string): boolean {
  return /^(heroi|boss)-/.test(name);
}

export function Sprite({ name, base = 32, scale = 3, alt = '', className, style, locked, faded }: SpriteProps) {
  const size = base * scale;
  const filter = locked ? 'brightness(0) opacity(0.28)' : faded ? 'grayscale(1) opacity(0.5)' : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arquivos estáticos pequenos, sem o otimizador
    <img
      src={`/pixel/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={className}
      style={{ imageRendering: isIllustration(name) ? 'auto' : 'pixelated', filter, ...style }}
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
