#!/usr/bin/env node
/**
 * Create a proper _posts file from a _writing draft: copy front matter, encrypt
 * only the body (with magic phrase), write to _posts/<basename> with encrypted
 * payload so the site can decrypt it.
 *
 * Usage: node scripts/encrypt_post.js <path/to/draft.md> [password]
 * Example: node scripts/encrypt_post.js _writing/2026-02-23-deceit.md mypassword
 *
 * Password: 2nd argument, or POST_PASSWORD env var, or prompted.
 * Output: _posts/<basename> (e.g. _posts/2026-02-23-deceit.md)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const matter = require('gray-matter');
const YAML = require('yaml');
const { encrypt } = require('./crypto_helper.js');

const MAGIC_PHRASE = 'premis-verified'; // must match encrypted_magic in _config.yml
const POSTS_DIR = '_posts';

function promptPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question('Password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/encrypt_post.js <path/to/draft.md> [password]');
    console.error('Example: node scripts/encrypt_post.js _writing/2026-02-23-deceit.md mypassword');
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

  const raw = fs.readFileSync(resolved, 'utf8');
  const { data: frontMatter, content: body } = matter(raw);

  if (!frontMatter || typeof frontMatter !== 'object') {
    console.error('No valid front matter found in the file.');
    process.exit(1);
  }

  const toEncrypt = MAGIC_PHRASE + '\n' + (body || '');
  const payload = encrypt(toEncrypt, password);

  const outFrontMatter = {
    ...frontMatter,
    encrypted: true,
    payload: {
      salt: payload.salt,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      iterations: payload.iterations,
    },
  };

  const basename = path.basename(resolved);
  const outDir = path.resolve(process.cwd(), POSTS_DIR);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, basename);

  const yamlStr = YAML.stringify(outFrontMatter, { lineWidth: 0 });
  const outContent = '---\n' + yamlStr.trimEnd() + '\n---\n';

  fs.writeFileSync(outPath, outContent, 'utf8');
  console.log('Written:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
