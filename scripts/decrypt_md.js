#!/usr/bin/env node
/**
 * Decrypt a .md file in place (replaces encrypted JSON with plain markdown).
 *
 * Usage: node scripts/decrypt_md.js <path/to/file.md> [password]
 * Password: 2nd argument, or POST_PASSWORD env var, or prompted.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { decrypt } = require('./crypto_helper.js');

function promptPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question('Password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function isEncrypted(content) {
  const s = content.trim();
  if (!s.startsWith('{')) return false;
  try {
    const j = JSON.parse(content);
    return j && typeof j.salt === 'string' && typeof j.ciphertext === 'string';
  } catch (_) {
    return false;
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/decrypt_md.js <path/to/file.md> [password]');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  let password = process.argv[3] || process.env.POST_PASSWORD;
  if (!password) {
    password = await promptPassword();
    if (!password) {
      console.error('Password is required.');
      process.exit(1);
    }
  }

  const content = fs.readFileSync(resolved, 'utf8');
  if (!isEncrypted(content)) {
    console.error('File does not look encrypted (no JSON payload).');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(content);
  } catch (e) {
    console.error('Invalid encrypted format.');
    process.exit(1);
  }

  try {
    const plain = decrypt(payload, password);
    fs.writeFileSync(resolved, plain, 'utf8');
    console.log('Decrypted:', resolved);
  } catch (e) {
    if (e.message && (e.message.includes('Unsupported state') || e.message.includes('auth'))) {
      console.error('Wrong password or corrupted file.');
    } else {
      console.error(e.message);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
