'use client';

// Confirmações e erros (toast), o diálogo nativo e as faíscas.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { ActionResult } from '@/lib/types';
import { WaxSealIcon } from './icons';

// ---------- toast ----------

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
  seal?: boolean;
}

type Notify = (text: string, options?: { tone?: 'ok' | 'error'; seal?: boolean }) => void;

const ToastContext = createContext<Notify>(() => {});

export function useToast(): Notify {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const notify = useCallback<Notify>((text, options) => {
    const id = nextId.current++;
    const tone = options?.tone ?? 'ok';
    setToasts((ts) => [...ts.slice(-2), { id, text, tone, seal: options?.seal }]);
    window.setTimeout(
      () => setToasts((ts) => ts.filter((t) => t.id !== id)),
      tone === 'error' ? 7000 : 4000,
    );
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-start gap-2 md:inset-x-auto md:bottom-6 md:left-8">
        {/* Regiões vivas fixas: confirmações em "polite", erros em "assertive". */}
        {(['ok', 'error'] as const).map((tone) => (
          <div
            key={tone}
            aria-live={tone === 'error' ? 'assertive' : 'polite'}
            className="flex flex-col items-start gap-2"
          >
            {toasts
              .filter((t) => t.tone === tone)
              .map((t) => (
                <div
                  key={t.id}
                  className={`pointer-events-auto flex max-w-[28rem] items-center gap-3 rounded-[6px] border border-ink px-4 py-3 text-body font-medium ${
                    tone === 'error' ? 'bg-surface' : 'bg-ink text-bg'
                  }`}
                >
                  {t.seal ? <WaxSealIcon size={28} /> : null}
                  <span>{t.text}</span>
                  <button
                    type="button"
                    className="ml-2 rounded-[4px] px-1 text-small underline underline-offset-2 opacity-80 hover:opacity-100"
                    onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
                  >
                    Fechar
                  </button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Chama uma Server Action e transforma falha de rede em mensagem pronta:
 * "Sem conexão com o servidor. O treino não foi salvo; tente de novo."
 */
export async function runAction<T>(
  call: () => Promise<ActionResult<T>>,
  what: string,
): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch {
    return { ok: false, error: `Sem conexão com o servidor. ${what} não foi salvo; tente de novo.` };
  }
}

// ---------- diálogo nativo ----------

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** "drawer" abre pela direita (gaveta do dia). */
  variant?: 'dialog' | 'drawer';
  children: ReactNode;
}

/**
 * <dialog> nativo em modo modal: Esc fecha, o foco fica preso dentro
 * e volta para onde estava ao fechar. Clicar fora também fecha.
 */
export function Dialog({ open, onClose, title, variant = 'dialog', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  function handleClose() {
    const prev = previous.current;
    previous.current = null;
    onClose();
    if (prev && prev.isConnected) prev.focus();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={variant === 'drawer' ? 'forja-drawer' : 'forja-dialog'}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      {open ? (
        <div className={variant === 'drawer' ? 'min-h-full p-6' : 'p-6'}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-gothic text-title font-bold">
              {title}
            </h2>
            <button type="button" className="btn btn-quiet -mr-2 -mt-1 text-small" onClick={() => ref.current?.close()}>
              Fechar
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

// ---------- faíscas ----------

const SPARKS: { dx: number; dy: number }[] = [
  { dx: -14, dy: -22 },
  { dx: -6, dy: -32 },
  { dx: 3, dy: -27 },
  { dx: 9, dy: -35 },
  { dx: 15, dy: -21 },
  { dx: -1, dy: -40 },
];

/** Até 6 pontos de 2 px, em Palha e Incandescente, subindo por 500 ms. */
export function Sparks({ onDone }: { onDone: () => void }) {
  return (
    <span className="forja-sparks" aria-hidden="true">
      {SPARKS.map((s, i) => (
        <span
          key={i}
          style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, animationDelay: `${i * 25}ms` } as CSSProperties}
          onAnimationEnd={i === SPARKS.length - 1 ? onDone : undefined}
        />
      ))}
    </span>
  );
}
