/**
 * Categories page: toggle filter by category. Pills in .categories-bar filter
 * .category-group blocks in .categories-content. Supports URL hash (e.g. #philosophy).
 */
(function () {
  function init() {
    var bar = document.querySelector('.categories-bar');
    if (!bar) return;

    var pills = bar.querySelectorAll('.category-pill');
    var content = document.querySelector('.categories-content');
    if (!content) return;
    var groups = content.querySelectorAll('.category-group');

    function showOnly(categorySlug) {
      pills.forEach(function (p) {
        p.classList.toggle('is-selected', p.getAttribute('data-category') === categorySlug);
      });
      groups.forEach(function (g) {
        g.classList.toggle('is-hidden', g.getAttribute('data-category') !== categorySlug);
      });
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '#' + categorySlug);
      }
    }

    pills.forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        var slug = pill.getAttribute('data-category');
        // Always keep some category selected: clicking the active pill does nothing.
        if (!pill.classList.contains('is-selected')) {
          showOnly(slug);
        }
      });
    });

    // Apply hash on load or fall back to the first category
    var hash = window.location.hash.slice(1);
    if (hash) {
      var match = Array.prototype.find.call(pills, function (p) {
        return p.getAttribute('data-category') === hash;
      });
      if (match) {
        showOnly(hash);
        return;
      }
    }

    // No valid hash: select the first category by default
    if (pills.length > 0) {
      var firstSlug = pills[0].getAttribute('data-category');
      showOnly(firstSlug);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
