export function getVirtualScrollScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  // Lazy-load large file diffs via IntersectionObserver
  var observer;

  function initObserver() {
    if (!('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var placeholder = entry.target;
          if (placeholder.classList.contains('gp-lazy-placeholder')) {
            // Will be loaded on click; but pre-fetch when scrolled near
            placeholder.style.opacity = '1';
          }
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('.gp-lazy-placeholder').forEach(function(el) {
      observer.observe(el);
    });
  }

  // Load a lazy file diff from embedded data
  window.__gld.loadFile = function(fileIndex) {
    var placeholder = document.querySelector('.gp-lazy-placeholder[data-file-index="' + fileIndex + '"]');
    if (!placeholder) return;

    var dataEl = document.getElementById('gp-diff-data');
    if (!dataEl) return;

    try {
      var data = JSON.parse(dataEl.textContent);
      var file = data.files[fileIndex];
      if (!file) return;

      placeholder.textContent = 'Loading...';

      // Re-render this file's diff (uses the embedded renderer)
      setTimeout(function() {
        var html = window.__gld.renderFile(file, fileIndex);
        var container = document.createElement('div');
        container.innerHTML = html;
        placeholder.parentNode.replaceChild(container.firstElementChild || container, placeholder);
      }, 0);
    } catch (e) {
      placeholder.textContent = 'Failed to load: ' + e.message;
    }
  };

  // Synchronized scrolling is no longer needed — side-by-side uses a single table
  function initSyncScroll() {}

  document.addEventListener('DOMContentLoaded', function() {
    initObserver();
    initSyncScroll();
  });
})();
`;
}
