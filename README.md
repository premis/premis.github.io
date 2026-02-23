# premis.github.io
My Work Online

## Encrypted posts

1. Write posts in `_posts` as usual. Add `encrypted: true` to the front matter and your plain content.
2. Run the encrypt script so it replaces those posts with the encrypted version (adds `payload`, clears body):
   - `npm run encrypt-posts`  
   - Or: `node scripts/encrypt_posts.js [password]` (single post: `node scripts/encrypt.js _posts/… [password]`)
3. Password: set in `.env` as `POST_PASSWORD=yourpass` (copy from `.env.example`), or pass as the first argument, or set the env var. If none is set, the script will prompt.

Only posts with `encrypted: true` and no existing `payload` (and with content) are encrypted; already-encrypted posts are left unchanged.

**Decrypt (for editing):** To turn encrypted posts back into plain files, use `npm run decrypt-posts` or `node scripts/decrypt_posts.js [password]` (single: `npm run decrypt-post -- _posts/… [password]` or `node scripts/decrypt.js _posts/… [password]`). Same password source (`.env`, etc.).
