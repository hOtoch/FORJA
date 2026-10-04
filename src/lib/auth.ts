// Acesso de um usuário só: senha única (FORJA_PASSWORD) e cookie de sessão assinado
// com HMAC-SHA256 (FORJA_SECRET). Usa só Web Crypto, então roda no proxy e nas actions.
// Formato do token: base64url(JSON { exp }) + "." + base64url(assinatura do primeiro trecho).

import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'forja_session';
/** 1 ano, em segundos (maxAge do cookie e validade do token). */
export const SESSION_MAX_AGE = 365 * 24 * 60 * 60;

const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = subtle().importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Comparação de bytes em tempo constante (para tamanhos iguais). */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sign(data: string, secret: string): Promise<Uint8Array> {
  const sig = await subtle().sign('HMAC', await hmacKey(secret), encoder.encode(data));
  return new Uint8Array(sig);
}

function secretFromEnv(): string | null {
  const secret = process.env.FORJA_SECRET;
  return secret ? secret : null;
}

/**
 * Compara dois textos em tempo constante, sem vazar o tamanho:
 * compara os SHA-256 dos dois. Usado para a senha e para o token do status.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    subtle().digest('SHA-256', encoder.encode(a)),
    subtle().digest('SHA-256', encoder.encode(b)),
  ]);
  return bytesEqual(new Uint8Array(ha), new Uint8Array(hb));
}

/** Cria um token de sessão válido por 1 ano. Lança erro se FORJA_SECRET não estiver definido. */
export async function signSession(nowMs: number = Date.now()): Promise<string> {
  const secret = secretFromEnv();
  if (!secret) throw new Error('FORJA_SECRET não está configurado.');
  const exp = Math.floor(nowMs / 1000) + SESSION_MAX_AGE;
  const payload = toBase64Url(encoder.encode(JSON.stringify({ exp })));
  return `${payload}.${toBase64Url(await sign(payload, secret))}`;
}

/** true se o token foi assinado com FORJA_SECRET e ainda não expirou. */
export async function verifySession(
  token: string | null | undefined,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const secret = secretFromEnv();
  if (!secret || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [payload, signature] = parts;

  const given = fromBase64Url(signature);
  if (!given) return false;
  const expected = await sign(payload, secret);
  if (!bytesEqual(expected, given)) return false;

  const raw = fromBase64Url(payload);
  if (!raw) return false;
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (typeof data !== 'object' || data === null) return false;
    const exp = (data as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) && exp * 1000 > nowMs;
  } catch {
    return false;
  }
}

/** Confere o cookie `forja_session` da requisição atual (Server Actions, Route Handlers, páginas). */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Para Server Actions: lança `Error('Não autorizado')` sem sessão válida. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) throw new Error('Não autorizado');
}
