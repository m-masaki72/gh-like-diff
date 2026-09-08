// The sidebar tree itself is rendered server-side in renderer.ts. This script owns the
// sidebar toggle and the per-directory collapse state.
export function getFileTreeScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  function collapsedDirs() { return window.__gld.getPrefs().collapsedDirs || {}; }

  function persist(dirs) { window.__gld.setPref('collapsedDirs', dirs); }

  window.__gld.toggleDir = function(btn) {
    var dir = btn.parentElement;
    if (!dir) return;
    var collapsed = dir.classList.toggle('collapsed');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    var dirs = collapsedDirs();
    if (collapsed) dirs[dir.dataset.dir] = true; else delete dirs[dir.dataset.dir];
    persist(dirs);
  };

  window.__gld.toggleSidebar = function() {
    var sidebar = document.getElementById('gp-sidebar');
    if (!sidebar) return;
    var collapsed = sidebar.classList.toggle('collapsed');
    window.__gld.setPref('sidebar', collapsed ? 'closed' : 'open');
  };

  function restore() {
    var prefs = window.__gld.getPrefs();
    var sidebar = document.getElementById('gp-sidebar');
    if (sidebar && prefs.sidebar === 'closed') sidebar.classList.add('collapsed');

    var dirs = prefs.collapsedDirs || {};
    document.querySelectorAll('.gp-tree-dir').forEach(function(dir) {
      if (dirs[dir.dataset.dir]) {
        dir.classList.add('collapsed');
        var btn = dir.querySelector('.gp-tree-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
`;
}
