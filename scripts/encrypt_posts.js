#!/usr/bin/env node
/**
 * Find _posts that need encryption (encrypted: true, no payload, have content),
 * then call node encrypt.js for each with the password.
 *
 * Password: 1st CLI arg, or .env (POST_PASSWORD=...), or POST_PASSWORD env, or prompt.
 * Usage: node scripts/encrypt_posts.js [password]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');
const matter = require('gray-matter');

const POSTS_DIR = '_posts';
const ENCRYPT_SCRIPT = path.join(__dirname, 'encrypt.js');

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

function getPassword() {
  return process.argv[2] || readPasswordFromEnvFile() || process.env.POST_PASSWORD;
}

function hasPayload(data) {
  return data && typeof data.payload === 'object' && data.payload !== null &&
    data.payload.salt && data.payload.iv && data.payload.ciphertext;
}

async function main() {
  let password = getPassword();
  if (!password) {
    password = await promptPassword();
    if (!password) {
      console.error('Password is required. Use: node scripts/encrypt_posts.js <password> or set POST_PASSWORD in .env.');
      process.exit(1);
    }
  }

  const postsDir = path.resolve(process.cwd(), POSTS_DIR);
  if (!fs.existsSync(postsDir)) {
    console.error('Posts directory not found:', postsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(postsDir).filter((f) => /\.(md|markdown)$/i.test(f));
  const toEncrypt = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    if (!data || typeof data !== 'object' || !data.encrypted) continue;
    if (hasPayload(data)) continue;
    if (!(content || '').trim()) continue;

    toEncrypt.push(filePath);
  }

  if (toEncrypt.length === 0) {
    console.log('No posts need encryption.');
    return;
  }

  const env = { ...process.env, POST_PASSWORD: password };

  for (const filePath of toEncrypt) {
    const result = spawnSync(process.execPath, [ENCRYPT_SCRIPT, filePath], { env, stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
