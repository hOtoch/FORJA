// Ícones do Forja: traço de 1,5 px, silhueta medieval, cor herdada (currentColor).
// Um ícone só aparece onde ajuda a reconhecer algo; nunca enfeita um título.

import type { ReactNode, SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Texto para leitor de tela. Sem ele, o ícone é decorativo. */
  label?: string;
  size?: number;
}

function Svg({ label, size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const SHIELD_PATH =
  'M12 2.9c3 1.25 5.5 1.55 7.4 1.45v6.05c0 5.2-3.2 8.75-7.4 10.7-4.2-1.95-7.4-5.5-7.4-10.7V4.35c1.9.1 4.4-.2 7.4-1.45z';

/** Brasão (escudo heráldico). Cheio = escudo disponível. */
export function ShieldIcon({ filled = false, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path d={SHIELD_PATH} fill={filled ? 'currentColor' : 'none'} />
      {filled ? null : <path d="M12 6.5v10.5M7.6 10.2h8.8" opacity={0.55} />}
    </Svg>
  );
}

/** Baú com cintas de ferro, trancado. */
export function ChestLockedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 10.25V8.6c0-2.2 1.8-4 4-4h9c2.2 0 4 1.8 4 4v1.65" />
      <rect x="3.5" y="10.25" width="17" height="9.25" rx="1" />
      <path d="M8 4.75v14.75M16 4.75v14.75" />
      <rect x="10.25" y="11" width="3.5" height="3.25" rx="0.6" />
      <path d="M10.9 11V10a1.1 1.1 0 0 1 2.2 0v1" />
    </Svg>
  );
}

/** Baú aberto: tampa levantada e interior em Palha. */
export function ChestOpenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.2 11.25 6 3.75h12l1.8 7.5" />
      <path d="M9.1 3.75 8.4 11.25M14.9 3.75l.7 7.5" />
      <path d="M4 11.25h16l-1.6 2.25H5.6z" fill="var(--heat-3)" stroke="currentColor" />
      <rect x="3.5" y="11.25" width="17" height="8.25" rx="1" />
      <path d="M8 13.5v6M16 13.5v6" />
    </Svg>
  );
}

/** Bigorna. */
export function AnvilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 7.75h12.25l5.75-2.25v2.3c0 2.3-2.3 3.7-4.9 3.7h-.6c-1 0-1.75.8-1.75 1.8v1.45h2.75v3.5H7.5v-3.5h2.75V13.3c0-1-.8-1.8-1.8-1.8H6.6C4.6 11.5 3 10.1 3 8.2z" />
      <path d="M5.5 20.25h13" />
    </Svg>
  );
}

/** Martelo de ferreiro. */
export function HammerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m13.6 3.4 7 7-2.7 2.7-7-7z" />
      <path d="M12.4 9.2 4.1 17.5a1.65 1.65 0 0 0 2.35 2.35l8.3-8.3" />
    </Svg>
  );
}

/** Chama. */
export function FlameIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c.6 3.4 5.2 5.4 5.2 10.4a5.2 5.2 0 0 1-10.4 0c0-2.4 1.2-4 2.5-5 .1 1.9.9 3.1 2.2 3.5-.4-3.3.1-6.2.5-8.9z" />
    </Svg>
  );
}

function sealPath(): string {
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 9.6 : 8.4;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}z`;
}
const SEAL_PATH = sealPath();

/** Selo de cera de "Depósito confirmado". Sempre na cor Cera. */
export function WaxSealIcon(p: IconProps) {
  return (
    <Svg {...p} stroke="none">
      <path d={SEAL_PATH} fill="var(--wax)" />
      <circle cx="12" cy="12" r="5.4" fill="none" stroke="#E9B8A8" strokeWidth={1.2} opacity={0.75} />
      <path d="M9.6 11h4.1l1.4-.6v.7c0 .7-.6 1.1-1.3 1.1h-.6v1h.8v1.1h-3.6v-1.1h.8v-1h-.6c-.6 0-1-.4-1-1z" fill="#E9B8A8" opacity={0.85} />
    </Svg>
  );
}

/** Medalha de curso concluído. */
export function MedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 3.5 10.5 9M16 3.5 13.5 9" />
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="m12 12 .9 1.7 1.9.3-1.4 1.3.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.3z" />
    </Svg>
  );
}
