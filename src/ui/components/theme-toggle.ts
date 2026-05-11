export function getThemeToggleScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  window.__gld.toggleTheme = function() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    if (current === 'dark') {
      html.setAttribute('data-theme', 'light');
    } else if (current === 'light') {
      html.removeAttribute('data-theme');
    } else {
      // auto -> dark
      html.setAttribute('data-theme', 'dark');
    }
    updateThemeButton();
  };

  function updateThemeButton() {
    var btn = document.getElementById('gp-theme-btn');
    if (!btn) return;
    var theme = document.documentElement.getAttribute('data-theme') || 'auto';
    var labels = { auto: '☀/☾', dark: '☾', light: '☀' };
    btn.textContent = labels[theme] || labels.auto;
    btn.title = 'Theme: ' + theme;
  }

  document.addEventListener('DOMContentLoaded', updateThemeButton);
})();
`;
}
