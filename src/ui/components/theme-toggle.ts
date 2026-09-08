export function getThemeToggleScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var THEME_KEY = 'gld-theme';
  var ORDER = ['auto', 'dark', 'light'];

  function current() {
    return document.documentElement.getAttribute('data-theme') || 'auto';
  }

  function apply(theme) {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton();
  }

  window.__gld.setTheme = function(theme) {
    apply(theme);
    // Shared across diffs on purpose: appearance is a user-level choice, unlike the
    // per-diff memo and review state.
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  };

  window.__gld.toggleTheme = function() {
    var next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
    window.__gld.setTheme(next);
    window.__gld.toast('Theme: ' + next, { type: 'info', duration: 1200 });
  };

  function updateThemeButton() {
    var btn = document.getElementById('gp-theme-btn');
    if (!btn) return;
    var theme = current();
    btn.title = 'Theme: ' + theme + ' (click to cycle)';
    btn.setAttribute('aria-label', 'Theme: ' + theme);
    btn.dataset.theme = theme;
  }

  document.addEventListener('DOMContentLoaded', updateThemeButton);
})();
`;
}
