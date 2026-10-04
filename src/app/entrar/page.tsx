import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Entrar no Forja' };

/** Alguns segmentos já aquecidos, com o vão de cada segunda-feira. */
const HEATS = [2, 3, 2, 4, 3, 0, 2, 3, 4, 4, 3, 2, 3, 4, null, null, null, null, null, null, null];

const COLORS: Record<string, string> = {
  null: 'var(--heat-future)',
  '0': 'var(--heat-0)',
  '2': 'var(--heat-2)',
  '3': 'var(--heat-3)',
  '4': 'var(--heat-4)',
};

export default function EntrarPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <h1 className="text-center font-gothic text-display-xl font-extrabold">Forja</h1>
        <div className="forja-mini-bar mt-6" aria-hidden="true">
          {HEATS.map((h, i) => (
            <span
              key={i}
              data-gap={i > 0 && i % 7 === 0 ? '' : undefined}
              style={{
                background: COLORS[String(h)],
                boxShadow: h === null ? 'inset 0 0 0 1px var(--heat-future-line)' : undefined,
              }}
            />
          ))}
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
