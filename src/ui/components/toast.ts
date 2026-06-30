export function getToastScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'gp-toast-container';
    document.body.appendChild(container);
    return container;
  }

  window.__gld.toast = function(message, opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var duration = opts.duration || 3000;

    var el = document.createElement('div');
    el.className = 'gp-toast gp-toast-' + type;
    el.textContent = message;

    var c = ensureContainer();
    c.appendChild(el);

    requestAnimationFrame(function() {
      el.classList.add('gp-toast-visible');
    });

    setTimeout(function() {
      el.classList.remove('gp-toast-visible');
      el.addEventListener('transitionend', function() { el.remove(); });
      setTimeout(function() { el.remove(); }, 300);
    }, duration);
  };
})();
`;
}
