export function getToastScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var container = null;
  var MAX_VISIBLE = 4;

  function ensureContainer() {
    if (container && container.isConnected) return container;
    container = document.createElement('div');
    container.className = 'gp-toast-container';
    // Announced to assistive tech; the container itself must not swallow clicks aimed at
    // the diff underneath, so only the toasts are interactive.
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
    return container;
  }

  function dismiss(el) {
    if (!el || el.dataset.dismissed) return;
    el.dataset.dismissed = '1';
    el.classList.remove('gp-toast-visible');
    var done = function() { el.remove(); };
    el.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 400);
  }

  window.__gld.toast = function(message, opts) {
    opts = opts || {};
    var duration = opts.duration || 3000;

    var el = document.createElement('div');
    el.className = 'gp-toast gp-toast-' + (opts.type || 'info');
    el.textContent = message;
    el.title = 'Click to dismiss';
    el.addEventListener('click', function() { dismiss(el); });

    var c = ensureContainer();
    c.appendChild(el);
    while (c.children.length > MAX_VISIBLE) dismiss(c.firstElementChild);

    requestAnimationFrame(function() { el.classList.add('gp-toast-visible'); });
    setTimeout(function() { dismiss(el); }, duration);
    return el;
  };
})();
`;
}
