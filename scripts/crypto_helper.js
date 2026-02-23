/**
 * Shared PBKDF2 + AES-256-GCM encrypt/decrypt.
 * Payload format: { salt, iv, ciphertext, iterations } (base64 strings).
 */

const crypto = require('crypto');

const PBKDF2_ITERATIONS = 250000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

function deriveKey(password, salt, iterations) {
  return crypto.pbkdf2Sync(
    Buffer.from(password, 'utf8'),
    salt,
    iterations ?? PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt, PBKDF2_ITERATIONS);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
    iterations: PBKDF2_ITERATIONS,
  };
}

function decrypt(payload, password) {
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const key = deriveKey(password, salt, payload.iterations ?? PBKDF2_ITERATIONS);

  const buf = Buffer.from(payload.ciphertext, 'base64');
  const authTag = buf.slice(-AUTH_TAG_LENGTH);
  const encrypted = buf.slice(0, -AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt, PBKDF2_ITERATIONS };
