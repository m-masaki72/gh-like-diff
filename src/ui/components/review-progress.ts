export function getReviewProgressScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  function stateKey() { return window.__gld.storageKey('gld-reviewed'); }
  function loadReviewed() { return window.__gld.readJson(stateKey(), {}) || {}; }
  function saveReviewed(state) { window.__gld.writeJson(stateKey(), state); }
  window.__gld.getReviewedSet = loadReviewed;

  function updateProgress() {
    var boxes = document.querySelectorAll('.gp-reviewed-cb');
    var total = boxes.length;
    var done = document.querySelectorAll('.gp-reviewed-cb:checked').length;

    var fill = document.querySelector('.gp-review-bar-fill');
    if (fill) fill.style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
    var count = document.querySelector('.gp-review-count');
    if (count) count.textContent = done + '/' + total;
    // Kept in sync so assistive tech reports real progress instead of a frozen 0.
    var bar = document.getElementById('gp-review-progress');
    if (bar) {
      bar.setAttribute('aria-valuenow', String(done));
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuetext', done + ' of ' + total + ' files viewed');
    }

    boxes.forEach(function(cb) {
      var item = document.querySelector('.gp-file-item[data-file-index="' + cb.dataset.fileIndex + '"]');
      // gp-file-reviewed, not "reviewed": that is the class the stylesheet defines.
      if (item) item.classList.toggle('gp-file-reviewed', cb.checked);
    });
  }
  window.__gld.updateReviewProgress = updateProgress;

  function setCollapsed(fileIndex, collapsed) {
    var body = document.getElementById('gp-file-body-' + fileIndex);
    var file = document.getElementById('gp-file-' + fileIndex);
    if (!body || !file) return;
    if (body.classList.contains('collapsed') === collapsed) return;
    window.__gld.toggleFile(fileIndex);
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
    // Matches GitHub: marking a file viewed folds it away so the remaining work is visible.
    setCollapsed(fileIndex, cb.checked);
    updateProgress();
    if (document.body.classList.contains('gp-unreviewed-only')) window.__gld.applyFileVisibility();
  };

  // Synchronises every checkbox with the stored state instead of only ticking the saved
  // ones. Firefox restores form control values across a reload, so after clearing storage
  // the boxes came back ticked with nothing behind them.
  function restoreReviewState() {
    var state = loadReviewed();
    document.querySelectorAll('.gp-reviewed-cb').forEach(function(cb) {
      var reviewed = !!state[cb.dataset.fileIndex];
      cb.checked = reviewed;
      setCollapsed(cb.dataset.fileIndex, reviewed);
    });
    updateProgress();
  }

  // The file whose header is closest above the fold — or the first visible file when the
  // page is scrolled to the very top, which previously left "r" doing nothing at all.
  function currentFileIndex() {
    var files = window.__gld.qa('.gp-file', { includeCollapsed: true });
    if (!files.length) return null;
    var limit = window.scrollY + window.__gld.stickyOffset() + 8;
    var chosen = files[0];
    for (var i = 0; i < files.length; i++) {
      if (files[i].getBoundingClientRect().top + window.scrollY <= limit) chosen = files[i];
      else break;
    }
    return chosen.dataset.fileIndex;
  }
  window.__gld.currentFileIndex = currentFileIndex;

  window.__gld.toggleCurrentReviewed = function() {
    var idx = currentFileIndex();
    if (idx == null) return;
    var cb = document.querySelector('.gp-reviewed-cb[data-file-index="' + idx + '"]');
    if (!cb) return;
    cb.checked = !cb.checked;
    window.__gld.toggleReviewed(idx);
    var file = document.getElementById('gp-file-' + idx);
    var name = file && file.querySelector('.gp-file-header-name');
    window.__gld.toast((cb.checked ? 'Viewed: ' : 'Unviewed: ') + (name ? name.textContent : idx),
      { type: 'info', duration: 1800 });
  };

  window.__gld.nextUnreviewed = function() {
    var files = window.__gld.qa('.gp-file', { includeCollapsed: true });
    var start = window.scrollY + window.__gld.stickyOffset() + 8;
    var state = loadReviewed();
    for (var i = 0; i < files.length; i++) {
      var top = files[i].getBoundingClientRect().top + window.scrollY;
      if (top > start && !state[files[i].dataset.fileIndex]) {
        window.__gld.scrollToElement(files[i]);
        return;
      }
    }
    for (var j = 0; j < files.length; j++) {
      if (!state[files[j].dataset.fileIndex]) {
        window.__gld.scrollToElement(files[j]);
        return;
      }
    }
    window.__gld.toast('All files reviewed', { type: 'success', duration: 2000 });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreReviewState);
  } else {
    restoreReviewState();
  }
})();
`;
}
