// Per-diff view preferences (wrapping, minimap visibility), the shortcut dialog, and the
// escape hatch that clears everything this page has stored.
export function getViewPrefsScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  function setPressed(id, on) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('active', !!on);
    }
  }

  window.__gld.setWrap = function(on, persist) {
    document.body.classList.toggle('gp-wrap', !!on);
    setPressed('gp-wrap-btn', on);
    if (persist !== false) window.__gld.setPref('wrap', !!on);
    window.__gld.notifyLayoutChanged();
  };

  window.__gld.toggleWrap = function() {
    window.__gld.setWrap(!document.body.classList.contains('gp-wrap'));
  };

  window.__gld.setMinimapVisible = function(on, persist) {
    var el = document.getElementById('gp-minimap');
    if (el) el.classList.toggle('collapsed', !on);
    document.body.classList.toggle('gp-no-minimap', !on);
    setPressed('gp-minimap-btn', on);
    if (persist !== false) window.__gld.setPref('minimap', !!on);
  };

  window.__gld.toggleMinimap = function() {
    var el = document.getElementById('gp-minimap');
    var visible = el ? !el.classList.contains('collapsed') : false;
    window.__gld.setMinimapVisible(!visible);
  };

  var lastFocus = null;

  window.__gld.showShortcuts = function() {
    var dlg = document.getElementById('gp-shortcuts');
    if (!dlg) return;
    lastFocus = document.activeElement;
    dlg.hidden = false;
    var close = dlg.querySelector('button');
    if (close) close.focus();
  };

  window.__gld.hideShortcuts = function() {
    var dlg = document.getElementById('gp-shortcuts');
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  };

  window.__gld.toggleHelp = function() {
    var dlg = document.getElementById('gp-shortcuts');
    if (!dlg) return;
    if (dlg.hidden) window.__gld.showShortcuts(); else window.__gld.hideShortcuts();
  };

  window.__gld.shortcutsOpen = function() {
    var dlg = document.getElementById('gp-shortcuts');
    return !!dlg && !dlg.hidden;
  };

  window.__gld.resetState = function() {
    var confirmed = true;
    try {
      confirmed = window.confirm('Clear memos, review progress and view preferences for this diff?');
    } catch (e) {}
    if (!confirmed) return;
    try {
      [window.__gld.storageKey('gld-memos'),
       window.__gld.storageKey('gld-reviewed'),
       window.__gld.storageKey('gld-prefs'),
       'gld-split-ratio', 'gld-theme'].forEach(function(k) { localStorage.removeItem(k); });
    } catch (e) {}
    window.__gld.toast('State cleared - reloading', { type: 'success', duration: 1200 });
    setTimeout(function() { location.reload(); }, 300);
  };

  function restore() {
    var prefs = window.__gld.getPrefs();
    window.__gld.setWrap(!!prefs.wrap, false);
    window.__gld.setMinimapVisible(prefs.minimap !== false, false);
    if (prefs.view === 'side' || prefs.view === 'line') {
      window.__gld.switchView(prefs.view, false);
    }
  }

  document.addEventListener('click', function(e) {
    var dlg = document.getElementById('gp-shortcuts');
    if (dlg && !dlg.hidden && e.target === dlg) window.__gld.hideShortcuts();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
`;
}
