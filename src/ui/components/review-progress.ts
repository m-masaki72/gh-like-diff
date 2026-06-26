export function getReviewProgressScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var REVIEWED_KEY_PREFIX = 'gld-reviewed-';

  function getReviewKey() {
    var title = document.title || 'diff';
    var h = 0;
    for (var i = 0; i < title.length; i++) {
      h = ((h << 5) - h + title.charCodeAt(i)) | 0;
    }
    return REVIEWED_KEY_PREFIX + Math.abs(h).toString(16).slice(0, 8);
  }

  function loadReviewed() {
    try {
      var raw = localStorage.getItem(getReviewKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveReviewed(state) {
    try { localStorage.setItem(getReviewKey(), JSON.stringify(state)); } catch (e) {}
  }

  function updateProgress() {
    var files = document.querySelectorAll('.gp-file');
    var total = files.length;
    var reviewed = document.querySelectorAll('.gp-reviewed-cb:checked').length;
    var bar = document.getElementById('gp-review-progress');
    if (bar) {
      var pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
      bar.querySelector('.gp-review-bar-fill').style.width = pct + '%';
      bar.querySelector('.gp-review-count').textContent = reviewed + '/' + total;
    }
    var sidebarItems = document.querySelectorAll('.gp-file-item');
    var state = loadReviewed();
    sidebarItems.forEach(function(item) {
      var idx = item.dataset.fileIndex;
      item.classList.toggle('gp-file-reviewed', !!state[idx]);
    });
  }

  window.__gld.toggleReviewed = function(fileIndex) {
    var state = loadReviewed();
    var cb = document.querySelector('.gp-reviewed-cb[data-file-index="' + fileIndex + '"]');
    if (!cb) return;
    if (cb.checked) {
      state[fileIndex] = true;
    } else {
      delete state[fileIndex];
    }
    saveReviewed(state);
    updateProgress();
  };

  function restoreReviewState() {
    var state = loadReviewed();
    Object.keys(state).forEach(function(idx) {
      var cb = document.querySelector('.gp-reviewed-cb[data-file-index="' + idx + '"]');
      if (cb) cb.checked = true;
    });
    updateProgress();
  }

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'r') {
      e.preventDefault();
      var files = document.querySelectorAll('.gp-file');
      var scrollTop = window.scrollY + 100;
      for (var i = files.length - 1; i >= 0; i--) {
        if (files[i].getBoundingClientRect().top + window.scrollY <= scrollTop) {
          var cb = files[i].querySelector('.gp-reviewed-cb');
          if (cb) {
            cb.checked = !cb.checked;
            window.__gld.toggleReviewed(i);
          }
          break;
        }
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreReviewState);
  } else {
    restoreReviewState();
  }
})();
`;
}
