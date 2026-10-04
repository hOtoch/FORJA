'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const error = state?.error;

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="senha" className="text-small font-bold">
          Senha
        </label>
        <input
          id="senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="field mt-1.5"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'senha-erro' : undefined}
        />
      </div>
      {error ? (
        <p id="senha-erro" role="alert" className="band text-body font-medium">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-ink h-12 w-full text-lead" disabled={pending}>
        Entrar
      </button>
    </form>
  );
}
