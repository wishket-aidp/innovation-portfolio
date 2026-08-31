/**
 * 세션 토큰 서명/검증 (Web Crypto — 엣지 미들웨어·Node 라우트 양쪽에서 동작).
 * 토큰 = `${만료ms}.${HMAC-SHA256(secret, 만료ms)}`. 위조 불가·만료 내장.
 */
export const SESSION_COOKIE = "aidp_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 1주일 (초)

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.INTERNAL_ADMIN_PASSWORD ||
    "insecure-dev-secret"
  );
}

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  const sig = await hmacHex(sessionSecret(), exp);
  return `${exp}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = await hmacHex(sessionSecret(), exp);
  return timingSafeEqual(sig, expected);
}

export function verifyPassword(input: string): boolean {
  const pass = process.env.INTERNAL_ADMIN_PASSWORD;
  if (!pass || input.length !== pass.length) return false;
  return timingSafeEqual(input, pass);
}
