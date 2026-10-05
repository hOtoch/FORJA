// Ilustrações do Forja (revisão 2 do DESIGN.md): o ferreiro, os chefes, os baús e a bolsa
// do Fundo. Desenhadas sobre um medalhão de ferro, com as mesmas cores nos dois temas,
// como a barra da temporada. Todas decorativas (aria-hidden) salvo quando recebem `label`.

import type { ReactNode } from 'react';

const IRON = '#2b241e';
const IRON_DARK = '#17130f';
const RIM = '#8a6a1f';
const EMBER = '#e8681e';
const STRAW = '#f3b54a';
const GOLD = '#d4ac4f';
const WOOD = '#8a5a35';
const WOOD_DARK = '#5e3b21';
const STEEL = '#9a948c';
const SKIN = '#d9a27a';

interface ArtProps {
  size?: number;
  label?: string;
  className?: string;
}

function Medallion({ size = 96, label, className, children }: ArtProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={`medallion ${className ?? ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id="forja-medallion-clip">
          <circle cx="48" cy="48" r="45" />
        </clipPath>
      </defs>
      <circle cx="48" cy="48" r="48" fill={IRON} />
      <g clipPath="url(#forja-medallion-clip)">{children}</g>
      <circle cx="48" cy="48" r="45.5" fill="none" stroke={RIM} strokeWidth="2" />
    </svg>
  );
}

/** O ferreiro: você. Barba, bandana de brasa, avental de couro e o martelo no ombro. */
export function SmithArt(props: ArtProps) {
  return (
    <Medallion {...props}>
      {/* brilho da forja atrás */}
      <circle cx="48" cy="92" r="34" fill="#3a2a1e" />
      <path d="M14 88 l6 -14 l4 8 l5 -16 l6 22z" fill={EMBER} opacity="0.85" />
      <path d="M70 90 l5 -12 l4 7 l4 -10 l5 15z" fill={STRAW} opacity="0.8" />
      {/* tronco e avental */}
      <path d="M18 98 C19 76 31 67 48 67 C65 67 77 76 78 98 Z" fill="#6b4a2f" />
      <path d="M34 98 L36 72 L60 72 L62 98 Z" fill="#4a3220" />
      <path d="M38 72 L36 66 M58 72 L60 66" stroke={IRON_DARK} strokeWidth="2" strokeLinecap="round" />
      {/* pescoço e cabeça */}
      <rect x="42" y="56" width="12" height="12" rx="3" fill={SKIN} />
      <ellipse cx="48" cy="43" rx="13" ry="15" fill={SKIN} />
      {/* barba */}
      <path d="M35 45 C35 62 42 69 48 69 C54 69 61 62 61 45 C58 52 54 54 48 54 C42 54 38 52 35 45 Z" fill="#7a4a2a" />
      <path d="M43 57 C46 59 50 59 53 57" stroke={IRON_DARK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* cabelo e bandana */}
      <path d="M35 40 C35 26 61 26 61 40 C57 35 39 35 35 40 Z" fill="#3a2a1e" />
      <rect x="34.5" y="35" width="27" height="4" rx="2" fill={EMBER} />
      {/* olhos e sobrancelhas */}
      <circle cx="43" cy="44" r="1.7" fill={IRON_DARK} />
      <circle cx="53" cy="44" r="1.7" fill={IRON_DARK} />
      <path d="M40 40.5 L46 41.5 M56 40.5 L50 41.5" stroke={IRON_DARK} strokeWidth="1.6" strokeLinecap="round" />
      {/* martelo no ombro */}
      <path d="M66 86 L80 50" stroke={WOOD} strokeWidth="4" strokeLinecap="round" />
      <g transform="rotate(21 80 47)">
        <rect x="71" y="42" width="18" height="10" rx="2" fill={STEEL} stroke={IRON_DARK} strokeWidth="1.5" />
        <rect x="71" y="42" width="4" height="10" rx="1" fill="#c9c3ba" />
      </g>
    </Medallion>
  );
}

export type BossKind = 'ogro' | 'goblin' | 'lich' | 'troll' | 'serpente' | 'dragao';

/** Retrato do chefe da semana. `defeated` apaga as cores e cruza o retrato. */
export function BossArt({ kind, defeated = false, ...props }: ArtProps & { kind: BossKind; defeated?: boolean }) {
  return (
    <Medallion {...props}>
      <circle cx="48" cy="96" r="40" fill="#3a2a1e" />
      <g style={defeated ? { filter: 'grayscale(1)', opacity: 0.5 } : undefined}>
        {kind === 'ogro' || kind === 'troll' ? <OgreFace troll={kind === 'troll'} /> : null}
        {kind === 'goblin' ? <GoblinFace /> : null}
        {kind === 'lich' ? <LichFace /> : null}
        {kind === 'serpente' ? <SerpentFace /> : null}
        {kind === 'dragao' ? <DragonFace /> : null}
      </g>
      {defeated ? (
        <path d="M24 24 L72 72 M72 24 L24 72" stroke="#8e2a1c" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      ) : null}
    </Medallion>
  );
}

function OgreFace({ troll }: { troll: boolean }) {
  const skin = troll ? '#7f8c8d' : '#7d8b4f';
  const dark = troll ? '#55605f' : '#56622f';
  return (
    <>
      <path d="M16 98 C18 78 30 70 48 70 C66 70 78 78 80 98 Z" fill={dark} />
      <ellipse cx="48" cy="50" rx="24" ry="23" fill={skin} />
      <ellipse cx="25" cy="46" rx="5" ry="8" fill={skin} />
      <ellipse cx="71" cy="46" rx="5" ry="8" fill={skin} />
      {/* sobrancelha única e olhos em brasa */}
      <path d="M31 39 L46 44 L50 44 L65 39" stroke={IRON_DARK} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="47" r="3.2" fill={EMBER} />
      <circle cx="56" cy="47" r="3.2" fill={EMBER} />
      <ellipse cx="48" cy="55" rx="5" ry="3.5" fill={dark} />
      {/* boca e presas */}
      <path d="M34 63 C40 68 56 68 62 63" stroke={IRON_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M37 64 L39 57 L42 65 Z M59 64 L57 57 L54 65 Z" fill="#efe6d2" />
      {troll ? <path d="M36 30 L40 22 L44 30 M52 30 L56 22 L60 30" stroke={IRON_DARK} strokeWidth="2" fill="none" /> : null}
    </>
  );
}

function GoblinFace() {
  return (
    <>
      <path d="M22 98 C24 80 34 72 48 72 C62 72 72 80 74 98 Z" fill="#4f3b2a" />
      <path d="M26 42 L6 30 L28 54 Z M70 42 L90 30 L68 54 Z" fill="#6f9a5a" />
      <ellipse cx="48" cy="50" rx="21" ry="22" fill="#6f9a5a" />
      <ellipse cx="40" cy="46" rx="5.5" ry="6" fill={STRAW} />
      <ellipse cx="56" cy="46" rx="5.5" ry="6" fill={STRAW} />
      <circle cx="41" cy="47" r="2.4" fill={IRON_DARK} />
      <circle cx="55" cy="47" r="2.4" fill={IRON_DARK} />
      <path d="M45 52 L48 60 L51 52" fill="#5b8248" />
      <path d="M37 63 L41 66 L44 63 L48 66 L52 63 L55 66 L59 63" stroke={IRON_DARK} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M30 30 C38 22 58 22 66 30" stroke="#4f3b2a" strokeWidth="6" fill="none" strokeLinecap="round" />
    </>
  );
}

function LichFace() {
  return (
    <>
      <path d="M18 98 C20 80 32 72 48 72 C64 72 76 80 78 98 Z" fill="#3b2a52" />
      <path d="M48 76 L40 98 M48 76 L56 98" stroke={GOLD} strokeWidth="2" />
      {/* crânio */}
      <path d="M28 46 C28 30 37 23 48 23 C59 23 68 30 68 46 C68 55 63 58 61 62 L61 70 L35 70 L35 62 C33 58 28 55 28 46 Z" fill="#e8e0cc" />
      <ellipse cx="39.5" cy="47" rx="6" ry="7" fill={IRON_DARK} />
      <ellipse cx="56.5" cy="47" rx="6" ry="7" fill={IRON_DARK} />
      <circle cx="40" cy="48" r="2.2" fill="#7e9be0" />
      <circle cx="56" cy="48" r="2.2" fill="#7e9be0" />
      <path d="M46 55 L48 59 L50 55 Z" fill={IRON_DARK} />
      <path d="M40 64 V70 M44 64 V70 M48 64 V70 M52 64 V70 M56 64 V70" stroke={IRON_DARK} strokeWidth="1.5" />
      {/* coroa */}
      <path d="M31 30 L35 16 L42 26 L48 12 L54 26 L61 16 L65 30 Z" fill={GOLD} stroke={IRON_DARK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="48" cy="24" r="2.5" fill="#a3311f" />
    </>
  );
}

function SerpentFace() {
  return (
    <>
      <path d="M30 98 C30 80 40 74 50 70 C62 66 66 56 60 50" stroke="#3f7a6a" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M26 44 C26 30 38 24 50 24 C64 24 74 32 74 42 C74 52 64 58 50 58 C38 58 26 54 26 44 Z" fill="#4f9a84" />
      <path d="M34 34 L46 30 L58 30 L68 36" stroke="#3f7a6a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="44" cy="40" rx="4" ry="5" fill={STRAW} />
      <ellipse cx="60" cy="40" rx="4" ry="5" fill={STRAW} />
      <rect x="43" y="36" width="2" height="9" rx="1" fill={IRON_DARK} />
      <rect x="59" y="36" width="2" height="9" rx="1" fill={IRON_DARK} />
      <path d="M48 58 L50 68 L46 74 M50 68 L54 74" stroke="#a3311f" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function DragonFace() {
  return (
    <>
      <path d="M14 98 C16 78 30 68 48 68 C66 68 80 78 82 98 Z" fill="#6e1f16" />
      {/* chifres */}
      <path d="M30 34 C22 24 20 14 24 6 C28 16 34 22 38 28 Z M66 34 C74 24 76 14 72 6 C68 16 62 22 58 28 Z" fill="#e8e0cc" />
      {/* cabeça */}
      <path d="M26 46 C26 32 36 26 48 26 C60 26 70 32 70 46 C70 58 62 70 48 74 C34 70 26 58 26 46 Z" fill="#a3311f" />
      <path d="M36 62 C40 68 56 68 60 62 L58 72 C52 76 44 76 38 72 Z" fill="#8a2718" />
      {/* olhos */}
      <path d="M33 44 L44 42 L42 49 Z" fill={STRAW} />
      <path d="M63 44 L52 42 L54 49 Z" fill={STRAW} />
      <path d="M40 43.5 L40 47.5 M56 43.5 L56 47.5" stroke={IRON_DARK} strokeWidth="1.8" strokeLinecap="round" />
      {/* narinas e fumaça */}
      <circle cx="44" cy="60" r="1.6" fill={IRON_DARK} />
      <circle cx="52" cy="60" r="1.6" fill={IRON_DARK} />
      <path d="M40 66 L43 70 L46 66 M50 66 L53 70 L56 66" stroke="#efe6d2" strokeWidth="1.6" fill="none" />
      <path d="M30 26 L36 18 L38 28 M66 26 L60 18 L58 28" fill="#8a2718" />
    </>
  );
}

/** Baú com cintas de ferro. Aberto mostra o ouro; `failed` fica apagado. */
export function ChestArt({
  state,
  size = 72,
  label,
}: {
  state: 'locked' | 'opened' | 'failed';
  size?: number;
  label?: string;
}) {
  const muted = state === 'failed';
  return (
    <svg
      viewBox="0 0 72 64"
      width={size}
      height={(size * 64) / 72}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={muted ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}
    >
      <ellipse cx="36" cy="60" rx="30" ry="3.5" fill={IRON_DARK} opacity="0.18" />
      {state === 'opened' ? (
        <>
          {/* tampa aberta para trás */}
          <path d="M10 26 L14 6 C24 2 48 2 58 6 L62 26 Z" fill={WOOD_DARK} stroke={IRON_DARK} strokeWidth="1.5" />
          <path d="M23 26 L25 4.5 M49 26 L47 4.5" stroke="#47423d" strokeWidth="4" />
          {/* ouro */}
          <ellipse cx="36" cy="27" rx="24" ry="7" fill={GOLD} />
          <circle cx="27" cy="25" r="3.5" fill={STRAW} stroke="#a37f2c" />
          <circle cx="38" cy="22.5" r="3.5" fill={STRAW} stroke="#a37f2c" />
          <circle cx="46" cy="26" r="3.5" fill={STRAW} stroke="#a37f2c" />
          <path d="M18 18 l2 -4 l2 4 l-2 4 z M54 14 l1.5 -3 l1.5 3 l-1.5 3 z" fill="#fff0cc" />
        </>
      ) : (
        <>
          {/* tampa fechada, abaulada */}
          <path d="M8 30 C8 14 18 10 36 10 C54 10 64 14 64 30 Z" fill={WOOD} stroke={IRON_DARK} strokeWidth="1.5" />
          <path d="M22 30 C22 16 24 11 25 10.5 M50 30 C50 16 48 11 47 10.5" stroke="#47423d" strokeWidth="4" fill="none" />
        </>
      )}
      {/* corpo */}
      <rect x="8" y="29" width="56" height="27" rx="2" fill={WOOD} stroke={IRON_DARK} strokeWidth="1.5" />
      <path d="M8 37 H64" stroke={WOOD_DARK} strokeWidth="1.2" />
      <path d="M8 46 H64" stroke={WOOD_DARK} strokeWidth="1.2" />
      <rect x="20" y="29" width="5" height="27" fill="#47423d" />
      <rect x="47" y="29" width="5" height="27" fill="#47423d" />
      {/* fechadura */}
      <rect x="30" y="31" width="12" height="13" rx="2" fill={state === 'opened' ? '#47423d' : GOLD} stroke={IRON_DARK} strokeWidth="1.5" />
      {state === 'opened' ? null : <path d="M36 35 V40" stroke={IRON_DARK} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

/** Bolsa de moedas do Fundo Réveillon. */
export function PouchArt(props: ArtProps) {
  return (
    <Medallion {...props}>
      <circle cx="48" cy="96" r="40" fill="#3a2a1e" />
      {/* moedas empilhadas */}
      <g stroke="#a37f2c" strokeWidth="1.2">
        <ellipse cx="70" cy="74" rx="11" ry="4" fill={GOLD} />
        <ellipse cx="70" cy="69" rx="11" ry="4" fill={STRAW} />
        <ellipse cx="70" cy="64" rx="11" ry="4" fill={GOLD} />
        <ellipse cx="70" cy="59" rx="11" ry="4" fill={STRAW} />
      </g>
      {/* bolsa */}
      <path d="M26 44 C14 56 16 78 38 80 C58 82 64 62 52 44 Z" fill="#8a5a35" stroke={IRON_DARK} strokeWidth="1.5" />
      <path d="M28 44 C30 36 50 36 52 44 C46 47 34 47 28 44 Z" fill="#6b4226" stroke={IRON_DARK} strokeWidth="1.5" />
      <path d="M33 30 L38 39 M47 30 L42 39" stroke="#6b4226" strokeWidth="4" strokeLinecap="round" />
      <path d="M29 45 C35 49 45 49 51 45" stroke={EMBER} strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x="40" y="69" textAnchor="middle" fontSize="15" fontWeight="700" fill={STRAW} fontFamily="var(--font-sans), sans-serif">
        R$
      </text>
    </Medallion>
  );
}
