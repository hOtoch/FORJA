// Proxy (antigo middleware, Next.js 16; roda em Node). Contrato: specs/001-forja-temporada-1/contracts/http-api.md
// Toda rota exige o cookie `forja_session` válido, exceto /entrar, /api/status e arquivos estáticos.
// É só a primeira barreira: cada Server Action e rota confere a sessão de novo.

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

const PUBLIC_PATHS = ['/entrar', '/api/status'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/entrar';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Tudo, menos: _next/static, _next/image, favicon.ico, ícones (icon*, apple-icon*)
    // e qualquer arquivo com extensão (public/, manifest, robots.txt...).
    '/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|.*\\.[^/]+$).*)',
  ],
};
