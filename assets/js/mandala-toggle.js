(function() {
  var STORAGE_KEY = 'mandala-brightness';
  var BRIGHTNESS_DIM = 0;
  var BRIGHTNESS_FULL = 2;

  function getStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'full' ? 'full' : 'dim';
    } catch (e) {
      return 'dim';
    }
  }

  function setStored(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
  }

  function applyState(mandala, btn, state) {
    mandala.style.filter = state === 'full' ? 'brightness(' + BRIGHTNESS_FULL + ') hue-rotate(180deg)' : 'brightness(' + BRIGHTNESS_DIM + ') hue-rotate(180deg)';
    mandala.style.opacity = state === 'full' ? 0.4 : 0.6;

    btn.classList.toggle('is-full', state === 'full');
    btn.classList.toggle('is-dim', state === 'dim');
  }

  function init() {
    var mandala = document.getElementById('mandala-bg');
    var btn = document.getElementById('mandala-toggle');
    if (!mandala || !btn) return;

    var state = getStored();
    applyState(mandala, btn, state);

    btn.addEventListener('click', function() {
      state = state === 'full' ? 'dim' : 'full';
      applyState(mandala, btn, state);
      setStored(state);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
