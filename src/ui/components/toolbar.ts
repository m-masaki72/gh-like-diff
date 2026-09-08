export function getToolbarScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  window.__gld.toggleFile = function(fileIndex) {
    var body = document.getElementById('gp-file-body-' + fileIndex);
    var file = document.getElementById('gp-file-' + fileIndex);
    if (!body || !file) return;

    var isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed');
    var chevron = file.querySelector('.gp-chevron-icon');
    if (chevron) {
      chevron.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
    }
    var btn = file.querySelector('.gp-chevron-btn');
    if (btn) btn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    window.__gld.notifyLayoutChanged();
  };

  // The two views have different heights, so flipping the class alone drops the reader
  // somewhere unrelated. Anchor on the file nearest the top and restore its offset.
  function captureAnchor() {
    var files = document.querySelectorAll('.gp-file');
    for (var i = 0; i < files.length; i++) {
      var rect = files[i].getBoundingClientRect();
      if (rect.bottom > 0) return { el: files[i], offset: rect.top };
    }
    return null;
  }

  function restoreAnchor(anchor) {
    if (!anchor) return;
    var y = anchor.el.getBoundingClientRect().top + window.scrollY - anchor.offset;
    window.scrollTo({ top: Math.max(0, y) });
  }

  window.__gld.switchView = function(mode, persist) {
    // With --single-view only one table was rendered; switching would leave the page
    // pointing at a view that does not exist and show nothing at all.
    if (document.body.dataset.singleView === '1') return;
    var next = mode === 'side' ? 'side' : 'line';
    if (document.body.dataset.view === next) return;
    var anchor = captureAnchor();
    document.body.dataset.view = next;
    var unified = document.getElementById('gp-btn-unified');
    var split = document.getElementById('gp-btn-split');
    if (unified) {
      unified.classList.toggle('active', next === 'line');
      unified.setAttribute('aria-pressed', next === 'line' ? 'true' : 'false');
    }
    if (split) {
      split.classList.toggle('active', next === 'side');
      split.setAttribute('aria-pressed', next === 'side' ? 'true' : 'false');
    }
    restoreAnchor(anchor);
    if (persist !== false) window.__gld.setPref('view', next);
    // The highlight set belongs to the view that was on screen; rebuild it for the new one.
    if (window.__gld.refreshSearch) window.__gld.refreshSearch();
    window.__gld.notifyLayoutChanged();
  };

  function showCopiedFeedback(btn) {
    var copyIcon = btn.querySelector('.gp-copy-icon');
    var checkIcon = btn.querySelector('.gp-check-icon');
    if (copyIcon) copyIcon.style.display = 'none';
    if (checkIcon) checkIcon.style.display = '';
    btn.classList.add('copied');
    setTimeout(function() {
      if (copyIcon) copyIcon.style.display = '';
      if (checkIcon) checkIcon.style.display = 'none';
      btn.classList.remove('copied');
    }, 2000);
  }

  // navigator.clipboard rejects on file:// in some browsers and whenever permission is
  // denied. Failing silently made the buttons look dead, so always report the outcome.
  function copyText(text, okMessage, btn) {
    function ok() {
      if (btn) showCopiedFeedback(btn);
      window.__gld.toast(okMessage, { type: 'success', duration: 2000 });
    }
    function fail() {
      window.__gld.toast('Copy failed - clipboard unavailable', { type: 'error', duration: 3000 });
    }
    try {
      if (!navigator.clipboard) return fail();
      navigator.clipboard.writeText(text).then(ok).catch(fail);
    } catch (e) { fail(); }
  }
  window.__gld.copyText = copyText;

  window.__gld.copyFileName = function(btn) {
    var text = btn.getAttribute('data-clipboard');
    if (!text) return;
    copyText(text, 'Path copied', btn);
  };

  window.__gld.copyHunk = function(btn) {
    var hunkRow = btn.closest('.gp-hunk');
    if (!hunkRow) return;
    var lines = [];
    var row = hunkRow.nextElementSibling;
    while (row && !row.classList.contains('gp-hunk') && !row.classList.contains('gp-expand-row')) {
      var codes = row.querySelectorAll('.gp-code');
      if (codes.length > 0) {
        var lastCode = codes[codes.length - 1];
        var text = lastCode.textContent || '';
        var prefix = lastCode.querySelector('.gp-prefix');
        if (prefix) {
          text = text.substring(prefix.textContent.length);
        }
        if (!row.classList.contains('gp-del') && !lastCode.classList.contains('gp-empty-line')) {
          lines.push(text);
        }
      }
      row = row.nextElementSibling;
    }
    copyText(lines.join('\\n'), 'Hunk copied', btn);
  };

  // Selecting across a side-by-side table interleaves both columns. This copies just the
  // new-code column of the file the button belongs to.
  window.__gld.copyNewSide = function(fileIndex) {
    var file = document.getElementById('gp-file-' + fileIndex);
    if (!file) return;
    var lines = [];
    var rows = file.querySelectorAll('.gp-view-side tr');
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('.gp-code');
      if (cells.length < 2) continue;
      var right = cells[cells.length - 1];
      if (right.classList.contains('gp-empty-line')) continue;
      lines.push(right.textContent || '');
    }
    if (!lines.length) {
      window.__gld.toast('Nothing to copy', { type: 'info', duration: 2000 });
      return;
    }
    copyText(lines.join('\\n'), 'New side copied', null);
  };

  function applyFileVisibility() {
    var query = (document.getElementById('gp-file-filter') || {}).value || '';
    var q = query.toLowerCase();
    var unreviewedOnly = document.body.classList.contains('gp-unreviewed-only');
    var reviewed = window.__gld.getReviewedSet ? window.__gld.getReviewedSet() : {};
    var shown = 0;

    document.querySelectorAll('.gp-file').forEach(function(file) {
      var name = file.querySelector('.gp-file-header-name');
      var text = name ? name.textContent.toLowerCase() : '';
      var idx = file.dataset.fileIndex;
      var visible = (!q || text.indexOf(q) !== -1) && !(unreviewedOnly && reviewed[idx]);
      file.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });

    document.querySelectorAll('.gp-file-item').forEach(function(item) {
      var name = item.querySelector('.gp-file-name');
      var text = name ? name.textContent.toLowerCase() : '';
      var idx = item.dataset.fileIndex;
      var visible = (!q || text.indexOf(q) !== -1) && !(unreviewedOnly && reviewed[idx]);
      item.style.display = visible ? '' : 'none';
    });

    // Folder headings whose children all vanished are noise; hide them too.
    document.querySelectorAll('.gp-tree-children').forEach(function(group) {
      var items = group.querySelectorAll('.gp-file-item');
      var any = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].style.display !== 'none') { any = true; break; }
      }
      group.style.display = any ? '' : 'none';
      var dir = group.previousElementSibling;
      if (dir && dir.classList.contains('gp-tree-dir')) dir.style.display = any ? '' : 'none';
    });

    var empty = document.getElementById('gp-no-matches');
    if (empty) empty.hidden = shown !== 0;
    window.__gld.notifyLayoutChanged();
  }
  window.__gld.applyFileVisibility = applyFileVisibility;

  window.__gld.filterFiles = function() { applyFileVisibility(); };

  window.__gld.toggleUnreviewedOnly = function() {
    var on = !document.body.classList.contains('gp-unreviewed-only');
    document.body.classList.toggle('gp-unreviewed-only', on);
    var btn = document.getElementById('gp-unreviewed-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('active', on);
    }
    applyFileVisibility();
  };
})();
`;
}
