#!/usr/bin/env node
/**
 * Encrypt a .md file in place (replaces content with encrypted JSON).
 *
 * Usage: node scripts/encrypt_md.js <path/to/file.md> [password]
 * Password: 2nd argument, or POST_PASSWORD env var, or prompted.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { encrypt } = require('./crypto_helper.js');

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
    console.error('Usage: node scripts/encrypt_md.js <path/to/file.md> [password]');
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
  if (isEncrypted(content)) {
    console.error('File is already encrypted. Use decrypt_md.js to decrypt first.');
    process.exit(1);
  }

  const payload = encrypt(content, password);
  fs.writeFileSync(resolved, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Encrypted:', resolved);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
