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

    function showAll() {
      pills.forEach(function (p) {
        p.classList.remove('is-selected');
      });
      groups.forEach(function (g) {
        g.classList.remove('is-hidden');
      });
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

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
        if (pill.classList.contains('is-selected')) {
          showAll();
        } else {
          showOnly(slug);
        }
      });
    });

    // Apply hash on load
    var hash = window.location.hash.slice(1);
    if (hash) {
      var match = Array.prototype.find.call(pills, function (p) {
        return p.getAttribute('data-category') === hash;
      });
      if (match) showOnly(hash);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
