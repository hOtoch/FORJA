'use client';

// Falha ao montar uma página no servidor. Em produção o Next não passa a mensagem do erro para
// o navegador (só o digest), então a tela diz o que conferir; a mensagem completa fica nos logs.

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[40rem] px-4 py-16">
      <div className="card">
        <h1 className="font-gothic text-[2rem] font-extrabold leading-9">A forja não acendeu</h1>
        <p className="mt-3 text-body">O servidor não conseguiu carregar os seus dados.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-body">
          <li>
            Acabou de publicar? Confira na Vercel se o Neon está ligado ao projeto (Storage) e se existe a variável{' '}
            <code>DATABASE_URL</code>. Variável criada ou mudada só vale depois de um novo deploy.
          </li>
          <li>A mensagem completa está em Vercel → Logs, junto do código abaixo.</li>
        </ul>
        {error.digest ? <p className="mt-3 text-small text-muted num">Código: {error.digest}</p> : null}
        <button type="button" className="btn btn-outline mt-5" onClick={() => retry()}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
