export function getKeyboardNavScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var currentFileIndex = -1;

  function files() { return window.__gld.qa('.gp-file', { includeCollapsed: true }); }

  // The sidebar is a directory tree: folders are emitted before the files beside them, so
  // its DOM order is not file order. Match on the index the element carries instead.
  function setSidebarActive(fileIndex) {
    document.querySelectorAll('.gp-file-item').forEach(function(item) {
      var on = item.dataset.fileIndex === String(fileIndex);
      item.classList.toggle('active', on);
      if (on) {
        var sidebar = item.closest('.gp-sidebar');
        if (sidebar) {
          var ir = item.getBoundingClientRect();
          var sr = sidebar.getBoundingClientRect();
          if (ir.top < sr.top || ir.bottom > sr.bottom) {
            item.scrollIntoView({ block: 'nearest' });
          }
        }
      }
    });
  }

  function highlightFile(index) {
    var list = files();
    var el = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].dataset.fileIndex === String(index)) { el = list[i]; break; }
    }
    if (!el) return;
    currentFileIndex = index;
    setSidebarActive(index);
    window.__gld.scrollToElement(el);
  }

  function step(delta) {
    var list = files();
    if (!list.length) return;
    var pos = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].dataset.fileIndex === String(currentFileIndex)) { pos = i; break; }
    }
    var next = Math.max(0, Math.min(list.length - 1, pos + delta));
    highlightFile(list[next].dataset.fileIndex);
  }

  function nextHunk() {
    var hunks = window.__gld.qa('.gp-hunk');
    var limit = window.scrollY + window.__gld.stickyOffset() + 8;
    for (var i = 0; i < hunks.length; i++) {
      if (hunks[i].getBoundingClientRect().top + window.scrollY > limit + 4) {
        window.__gld.scrollToElement(hunks[i]);
        return;
      }
    }
  }

  function prevHunk() {
    var hunks = window.__gld.qa('.gp-hunk');
    var limit = window.scrollY + window.__gld.stickyOffset() - 4;
    for (var i = hunks.length - 1; i >= 0; i--) {
      if (hunks[i].getBoundingClientRect().top + window.scrollY < limit) {
        window.__gld.scrollToElement(hunks[i]);
        return;
      }
    }
  }

  // Escape is shared by several overlays; close the innermost one only.
  function handleEscape() {
    if (window.__gld.shortcutsOpen && window.__gld.shortcutsOpen()) { window.__gld.hideShortcuts(); return true; }
    if (window.__gld.memoEditorOpen && window.__gld.memoEditorOpen()) { return window.__gld.closeMemoEditor(); }
    if (window.__gld.searchIsOpen && window.__gld.searchIsOpen()) { window.__gld.closeSearch(); return true; }
    var panel = document.getElementById('gp-memo-panel');
    if (panel && panel.classList.contains('open')) { window.__gld.toggleMemoPanel(); return true; }
    return false;
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (handleEscape()) e.preventDefault();
      return;
    }
    // Guards modifiers and IME as well as text fields, so Cmd+R still reloads, Cmd+P
    // still prints, and confirming a Japanese conversion does not trigger a shortcut.
    if (window.__gld.shortcutBlocked(e)) return;

    switch (e.key) {
      case 'j': step(1); e.preventDefault(); break;
      case 'k': step(-1); e.preventDefault(); break;
      case 'n': nextHunk(); e.preventDefault(); break;
      case 'p': prevHunk(); e.preventDefault(); break;
      case 'u': window.__gld.nextUnreviewed(); e.preventDefault(); break;
      case 'r': window.__gld.toggleCurrentReviewed(); e.preventDefault(); break;
      case 'w': window.__gld.toggleWrap(); e.preventDefault(); break;
      case 'm': window.__gld.toggleMinimap(); e.preventDefault(); break;
      case 'b': window.__gld.toggleSidebar(); e.preventDefault(); break;
      case '/': e.preventDefault(); window.__gld.openSearch(); break;
      case '?': window.__gld.toggleHelp(); e.preventDefault(); break;
    }
  });

  var ticking = false;
  window.addEventListener('scroll', function() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      var list = files();
      var limit = window.scrollY + window.__gld.stickyOffset() + 8;
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].getBoundingClientRect().top + window.scrollY <= limit) {
          var idx = list[i].dataset.fileIndex;
          if (currentFileIndex !== idx) {
            currentFileIndex = idx;
            setSidebarActive(idx);
          }
          break;
        }
      }
      ticking = false;
    });
  }, { passive: true });

  window.__gld.navFile = highlightFile;
  window.__gld.nextFile = function() { step(1); };
  window.__gld.prevFile = function() { step(-1); };
})();
`;
}
