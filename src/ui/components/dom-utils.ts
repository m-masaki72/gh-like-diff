// Shared client-side helpers. Both the unified and side-by-side tables are always in the
// DOM (only one is shown via CSS), so a bare document.querySelector reaches rows the user
// cannot see — scrollIntoView on them is a no-op and counting them inflates every total.
// Every component queries diff content through here instead.
export function getDomUtilsScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  function activeView() {
    return document.body.dataset.view === 'side' ? 'side' : 'line';
  }

  function hiddenViewSelector() {
    return activeView() === 'side' ? '.gp-view-unified' : '.gp-view-side';
  }

  // Cheap and layout-free: relies on the view/collapse classes rather than offsetParent,
  // so calling it in a loop over thousands of rows does not force reflow.
  function isUsable(el, opts) {
    if (!el) return false;
    if (el.closest(hiddenViewSelector())) return false;
    var file = el.closest('.gp-file');
    if (file) {
      if (file.style.display === 'none') return false;
      if (!opts || !opts.includeCollapsed) {
        var body = file.querySelector('.gp-file-body');
        if (body && body.classList.contains('collapsed')) return false;
      }
    }
    return true;
  }

  function qa(sel, opts) {
    var root = (opts && opts.root) || document;
    var out = [];
    var all = root.querySelectorAll(sel);
    for (var i = 0; i < all.length; i++) {
      if (isUsable(all[i], opts)) out.push(all[i]);
    }
    return out;
  }

  function q(sel, opts) {
    var list = qa(sel, opts);
    return list.length ? list[0] : null;
  }

  function diffId() {
    return document.body.dataset.diffId || 'diff';
  }

  function storageKey(prefix) {
    return prefix + '-' + diffId();
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function getPrefs() { return readJson(storageKey('gld-prefs'), {}) || {}; }

  function setPref(name, value) {
    var prefs = getPrefs();
    prefs[name] = value;
    writeJson(storageKey('gld-prefs'), prefs);
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Height of the sticky header+toolbar, measured rather than hard-coded: the toolbar
  // wraps to a second row on narrow windows, which used to leave targets under it.
  function stickyOffset() {
    var h = 0;
    var header = document.querySelector('.gp-header');
    var toolbar = document.querySelector('.gp-toolbar');
    if (header) h += header.getBoundingClientRect().height;
    if (toolbar) h += toolbar.getBoundingClientRect().height;
    return Math.round(h);
  }

  function scrollToElement(el, extra) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - (extra || 8);
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  // Components that change how many rows are on screen announce it here, so dependants
  // (currently the minimap) can recompute instead of drawing a stale map.
  function notifyLayoutChanged() {
    document.dispatchEvent(new CustomEvent('gld:layout'));
  }

  // True when a bare-letter shortcut must not fire: the user is typing, mid-IME
  // composition, or holding a modifier (Cmd+R, Ctrl+P and friends belong to the browser).
  function shortcutBlocked(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return true;
    if (e.isComposing || e.keyCode === 229) return true;
    var t = e.target;
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    // Checkboxes and buttons are focusable but not text entry — blocking on them left the
    // shortcuts dead after clicking "Viewed" until the user clicked elsewhere.
    if (tag === 'INPUT') {
      var type = (t.getAttribute('type') || 'text').toLowerCase();
      return type !== 'checkbox' && type !== 'radio' && type !== 'button' && type !== 'submit';
    }
    return false;
  }

  // For handlers living on a text field, where modifiers are fine but IME is not.
  function composing(e) {
    return !!(e.isComposing || e.keyCode === 229);
  }

  // Publishes the measured header height to CSS so every sticky offset follows the
  // toolbar when it wraps, instead of the old hard-coded 82px.
  function syncStickyTop() {
    document.documentElement.style.setProperty('--gld-sticky-top', stickyOffset() + 'px');
  }

  function watchSticky() {
    syncStickyTop();
    window.addEventListener('resize', syncStickyTop, { passive: true });
    if (typeof ResizeObserver === 'function') {
      var toolbar = document.querySelector('.gp-toolbar');
      var header = document.querySelector('.gp-header');
      var ro = new ResizeObserver(syncStickyTop);
      if (toolbar) ro.observe(toolbar);
      if (header) ro.observe(header);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchSticky);
  } else {
    watchSticky();
  }

  window.__gld.syncStickyTop = syncStickyTop;
  window.__gld.shortcutBlocked = shortcutBlocked;
  window.__gld.composing = composing;
  window.__gld.activeView = activeView;
  window.__gld.hiddenViewSelector = hiddenViewSelector;
  window.__gld.isUsable = isUsable;
  window.__gld.qa = qa;
  window.__gld.q = q;
  window.__gld.diffId = diffId;
  window.__gld.storageKey = storageKey;
  window.__gld.readJson = readJson;
  window.__gld.writeJson = writeJson;
  window.__gld.getPrefs = getPrefs;
  window.__gld.setPref = setPref;
  window.__gld.escHtml = escHtml;
  window.__gld.stickyOffset = stickyOffset;
  window.__gld.scrollToElement = scrollToElement;
  window.__gld.notifyLayoutChanged = notifyLayoutChanged;
})();
`;
}
