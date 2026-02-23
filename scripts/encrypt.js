#!/usr/bin/env node
/**
 * Encrypt text with a password (PBKDF2 + AES-256-GCM).
 * Output is JSON: { salt, iv, ciphertext } (base64) for use in HTML/data attributes.
 *
 * Usage:
 *   node scripts/encrypt.js "your text here"
 *   node scripts/encrypt.js < path/to/file.txt
 *   POST_PASSWORD=secret node scripts/encrypt.js "your text"
 *
 * Password: from env POST_PASSWORD, or pass as second argument (less secure).
 */

const { encrypt } = require('./crypto_helper.js');

function main() {
  const args = process.argv.slice(2);
  let password = process.env.POST_PASSWORD;

  if (args[0] && args[0].startsWith('-')) {
    console.error('Usage: node scripts/encrypt.js [password] [text]\n  Or: echo "text" | node scripts/encrypt.js [password]\n  Or: POST_PASSWORD=xxx node scripts/encrypt.js [text]');
    process.exit(1);
  }

  if (args.length >= 2) {
    password = args[0];
    args.shift();
  }
  if (!password) {
    console.error('Password required: set POST_PASSWORD or pass as first argument.');
    process.exit(1);
  }

  let text;
  if (args.length > 0) {
    text = args.join(' ');
  } else if (!process.stdin.isTTY) {
    text = require('fs').readFileSync(0, 'utf8');
  } else {
    console.error('Provide text as argument or via stdin.');
    process.exit(1);
  }

  const result = encrypt(text, password);
  console.log(JSON.stringify(result, null, 2));
}

main();
