import crypto from 'crypto';

function base64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecodeToString(input) {
  const s = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function getSecret() {
  // In production, set ANTIBOT_SECRET.
  return process.env.ANTIBOT_SECRET || process.env.JWT_SECRET || 'dev-antibot-secret';
}

function signPayload(payloadB64) {
  return base64urlEncode(crypto.createHmac('sha256', getSecret()).update(payloadB64).digest());
}

export function createMathChallenge({ ttlSeconds = 10 * 60 } = {}) {
  // Keep it simple: + or − with non-negative result.
  const a = 1 + Math.floor(Math.random() * 9);
  const b0 = 1 + Math.floor(Math.random() * 9);
  const op = Math.random() < 0.75 ? '+' : '-';
  const b = op === '-' ? Math.min(a, b0) : b0;

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = { a, b, op, exp };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = signPayload(payloadB64);
  const token = `${payloadB64}.${sig}`;

  const question = op === '+' ? `${a} + ${b} = ?` : `${a} - ${b} = ?`;
  return { token, question, expiresAt: exp * 1000, a, b, op };
}

export function verifyMathChallenge(token, answerRaw) {
  const tokenStr = String(token || '');
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid_token' };
  const [payloadB64, sig] = parts;
  const expectedSig = signPayload(payloadB64);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecodeToString(payloadB64));
  } catch {
    return { ok: false, reason: 'bad_payload' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || now > Number(payload.exp)) return { ok: false, reason: 'expired' };

  const a = Number(payload.a);
  const b = Number(payload.b);
  const op = String(payload.op);
  if (!Number.isFinite(a) || !Number.isFinite(b) || (op !== '+' && op !== '-')) {
    return { ok: false, reason: 'bad_payload' };
  }

  const expectedAnswer = op === '+' ? a + b : a - b;
  const answer = Number.parseInt(String(answerRaw), 10);
  if (!Number.isFinite(answer)) return { ok: false, reason: 'bad_answer' };
  if (answer !== expectedAnswer) return { ok: false, reason: 'wrong_answer' };

  return { ok: true };
}

