#!/usr/bin/env node
/**
 * Decrypt a post: read payload from front matter, decrypt, write back the same
 * file with plain content and no payload (encrypted: true kept for re-encrypt).
 *
 * Usage: node scripts/decrypt.js <path/to/post.md> [password]
 * Example: node scripts/decrypt.js _posts/2026-02-23-my-post.md mypassword
 *
 * Password: 2nd argument, or POST_PASSWORD env var, or prompted.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const matter = require('gray-matter');
const YAML = require('yaml');
const { decrypt } = require('./crypto_helper.js');

const MAGIC_PHRASE = 'premis-verified';

function readPasswordFromEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return null;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*POST_PASSWORD\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch (_) {}
  return null;
}

function promptPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question('Password: ', (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

function hasPayload(data) {
  return data && typeof data.payload === 'object' && data.payload !== null &&
    data.payload.salt && data.payload.iv && data.payload.ciphertext;
}

function stripMagicPhrase(text) {
  if (!text || text.indexOf(MAGIC_PHRASE) !== 0) return null;
  let rest = text.slice(MAGIC_PHRASE.length);
  rest = rest.replace(/^\r?\n?/, '');
  return rest;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/decrypt.js <path/to/post.md> [password]');
    console.error('Example: node scripts/decrypt.js _posts/2026-02-23-my-post.md mypassword');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  let password = process.argv[3] || readPasswordFromEnvFile() || process.env.POST_PASSWORD;
  if (!password) {
    password = await promptPassword();
    if (!password) {
      console.error('Password is required.');
      process.exit(1);
    }
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const { data: frontMatter, content } = matter(raw);

  if (!frontMatter || typeof frontMatter !== 'object') {
    console.error('No valid front matter found in the file.');
    process.exit(1);
  }

  if (!hasPayload(frontMatter)) {
    console.error('Post has no payload (not encrypted).');
    process.exit(1);
  }

  let plain;
  try {
    plain = decrypt(frontMatter.payload, password);
  } catch (err) {
    console.error('Decryption failed (wrong password?):', err.message);
    process.exit(1);
  }

  const body = stripMagicPhrase(plain);
  if (body === null) {
    console.error('Decrypted content missing magic phrase (wrong password?).');
    process.exit(1);
  }

  const { payload, ...rest } = frontMatter;
  const outFrontMatter = { ...rest, encrypted: true };

  const yamlStr = YAML.stringify(outFrontMatter, { lineWidth: 0 });
  const outContent = '---\n' + yamlStr.trimEnd() + '\n---\n\n' + body;

  fs.writeFileSync(resolved, outContent, 'utf8');
  console.log('Written:', resolved);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
