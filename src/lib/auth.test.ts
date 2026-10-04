import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeEqual, SESSION_MAX_AGE, signSession, verifySession } from './auth';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const T0 = Date.UTC(2026, 9, 3, 12, 0, 0);

function decodePayload(token: string): unknown {
  const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
}

function encodePayload(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('sessão assinada', () => {
  beforeEach(() => {
    vi.stubEnv('FORJA_SECRET', SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('assina e confere um token', async () => {
    const token = await signSession(T0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await verifySession(token, T0)).toBe(true);
  });

  it('o payload só tem a expiração, 1 ano à frente', async () => {
    const token = await signSession(T0);
    expect(decodePayload(token)).toEqual({ exp: Math.floor(T0 / 1000) + SESSION_MAX_AGE });
    expect(SESSION_MAX_AGE).toBe(365 * 24 * 60 * 60);
  });

  it('vale até perto de 1 ano e expira depois', async () => {
    const token = await signSession(T0);
    expect(await verifySession(token, T0 + (SESSION_MAX_AGE - 60) * 1000)).toBe(true);
    expect(await verifySession(token, T0 + SESSION_MAX_AGE * 1000)).toBe(false);
    expect(await verifySession(token, T0 + (SESSION_MAX_AGE + 1) * 1000)).toBe(false);
  });

  it('recusa payload adulterado', async () => {
    const token = await signSession(T0);
    const [, sig] = token.split('.');
    const forged = `${encodePayload({ exp: Math.floor(T0 / 1000) + 10 * SESSION_MAX_AGE })}.${sig}`;
    expect(await verifySession(forged, T0)).toBe(false);
  });

  it('recusa assinatura adulterada', async () => {
    const token = await signSession(T0);
    const [payload, sig] = token.split('.');
    const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    expect(await verifySession(`${payload}.${flipped}`, T0)).toBe(false);
    expect(await verifySession(`${payload}.${sig.slice(0, -2)}`, T0)).toBe(false);
  });

  it('recusa token assinado com outro segredo', async () => {
    const token = await signSession(T0);
    vi.stubEnv('FORJA_SECRET', 'outro-segredo-completamente-diferente');
    expect(await verifySession(token, T0)).toBe(false);
  });

  it('recusa lixo e vazio', async () => {
    for (const bad of [undefined, null, '', '.', 'abc', 'a.b.c', 'a.', '.b', '!!!.???', 'e30.e30']) {
      expect(await verifySession(bad, T0)).toBe(false);
    }
  });

  it('sem FORJA_SECRET: não assina e não aceita nada', async () => {
    const token = await signSession(T0);
    vi.stubEnv('FORJA_SECRET', '');
    await expect(signSession(T0)).rejects.toThrow('FORJA_SECRET');
    expect(await verifySession(token, T0)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('compara textos', async () => {
    expect(await safeEqual('senha', 'senha')).toBe(true);
    expect(await safeEqual('senha', 'Senha')).toBe(false);
    expect(await safeEqual('senha', 'senha-mais-longa')).toBe(false);
    expect(await safeEqual('', '')).toBe(true);
    expect(await safeEqual('', 'x')).toBe(false);
    expect(await safeEqual('ção', 'ção')).toBe(true);
  });
});
