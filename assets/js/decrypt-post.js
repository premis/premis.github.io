/**
 * Decrypt password-protected posts in the browser (Web Crypto + magic phrase).
 * Only runs when .encrypted-post exists. Loads marked for markdown rendering on first use.
 */
(function () {
  const AUTH_TAG_LENGTH = 16;
  const MAGIC_VERIFY = 'premis-verified'; // must match _config.yml encrypted_magic; not in HTML so phrase stays hidden

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function base64ToBuffer(b64) {
    try {
      var binary = atob(b64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    } catch (e) {
      return null;
    }
  }

  function deriveKey(password, salt, iterations) {
    return crypto.subtle
      .importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      });
  }

  function decryptInBrowser(payload, password) {
    if (!payload.salt || !payload.iv || !payload.ciphertext) {
      return Promise.reject(new Error('Invalid payload'));
    }
    var salt = base64ToBuffer(payload.salt);
    var iv = base64ToBuffer(payload.iv);
    var ciphertextWithTag = base64ToBuffer(payload.ciphertext);
    if (!salt || !iv || !ciphertextWithTag) {
      return Promise.reject(new Error('Invalid payload encoding'));
    }
    var iterations = payload.iterations || 250000;

    if (!crypto.subtle) {
      return Promise.reject(new Error('Decryption requires a secure context (HTTPS or localhost)'));
    }

    return deriveKey(password, salt, iterations).then(function (key) {
      return crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: AUTH_TAG_LENGTH * 8 },
        key,
        ciphertextWithTag
      );
    }).then(function (decrypted) {
      return new TextDecoder().decode(decrypted);
    });
  }

  function stripMagicPhrase(text, verify) {
    if (!verify || text.indexOf(verify) !== 0) return null;
    var rest = text.slice(verify.length);
    rest = rest.replace(/^\r?\n?/, '');
    return rest;
  }

  function renderMarkdown(md) {
    if (typeof marked !== 'undefined') {
      if (typeof marked.parse === 'function') return marked.parse(md);
      if (typeof marked === 'function') return marked(md);
    }
    return md.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>\n');
  }

  function initContainer(container) {
    var salt = container.getAttribute('data-salt') || '';
    var iv = container.getAttribute('data-iv') || '';
    var ciphertext = container.getAttribute('data-ciphertext') || '';
    var iterations = parseInt(container.getAttribute('data-iterations'), 10) || 250000;
    if (!salt || !iv || !ciphertext) return;
    var payload = { salt: salt, iv: iv, ciphertext: ciphertext, iterations: iterations };
    var ui = container.querySelector('.encrypted-post-ui');
    var form = container.querySelector('.encrypted-post-form');
    var input = container.querySelector('.encrypted-post-input');
    var errEl = container.querySelector('.encrypted-post-error');
    var bodyEl = container.querySelector('.encrypted-post-body');

    if (!form || !errEl || !bodyEl) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var password = (input && input.value) || '';
      if (!password) return;

      errEl.setAttribute('hidden', '');
      errEl.textContent = '';

      function showError(msg) {
        errEl.removeAttribute('hidden');
        errEl.textContent = msg;
      }

      try {
        decryptInBrowser(payload, password)
          .then(function (plain) {
            var md = stripMagicPhrase(plain, MAGIC_VERIFY);
            if (md === null) {
              showError('Wrong password.');
              return;
            }
            if (typeof marked === 'undefined') {
              return loadScript('https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js').then(function () {
                bodyEl.innerHTML = renderMarkdown(md);
                ui.setAttribute('hidden', '');
                bodyEl.removeAttribute('hidden');
              });
            }
            bodyEl.innerHTML = renderMarkdown(md);
            ui.setAttribute('hidden', '');
            bodyEl.removeAttribute('hidden');
          })
          .catch(function (err) {
            var msg = err && err.message ? err.message : 'Wrong password.';
            if (msg.indexOf('secure context') !== -1) {
              showError('Decryption requires HTTPS or localhost.');
            } else if (msg.indexOf('Invalid payload') !== -1) {
              showError('Post payload not configured. Paste the encrypted payload into the post front matter.');
            } else {
              showError('Wrong password.');
            }
          });
      } catch (err) {
        showError('Wrong password.');
      }
    });
  }

  function init() {
    var containers = document.querySelectorAll('.encrypted-post');
    for (var i = 0; i < containers.length; i++) {
      initContainer(containers[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
