/**
 * AES-GCM encryption for sensitive company settings
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  return crypto.createHash('sha256').update(String(raw)).digest();
}

export function encryptSecret(plaintext) {
  if (plaintext == null || plaintext === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload) {
  if (!payload) return '';
  const str = String(payload);
  if (!str.startsWith('enc:')) return str;
  const parts = str.split(':');
  if (parts.length !== 4) return '';
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function isEncryptedValue(value) {
  return String(value || '').startsWith('enc:');
}
