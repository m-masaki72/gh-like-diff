export function getSplitResizerScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var STORAGE_KEY = 'gld-split-ratio';
  var MIN_RATIO = 0.15;
  var MAX_RATIO = 0.85;

  function applyRatio(ratio) {
    var clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio));
    var pct = (clamped * 100).toFixed(3) + '%';
    document.documentElement.style.setProperty('--gld-split-ratio', pct);
    return clamped;
  }

  function restoreSavedRatio() {
    var ratio = 0.5;
    try {
      var saved = parseFloat(localStorage.getItem(STORAGE_KEY) || '');
      if (!isNaN(saved)) ratio = saved;
    } catch (e) {}
    applyRatio(ratio);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSavedRatio);
  } else {
    restoreSavedRatio();
  }

  var dragging = false;
  var activeContainer = null;

  window.__gld.startSplitResize = function(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    activeContainer = e.currentTarget && e.currentTarget.parentElement;
    if (!activeContainer) return;
    dragging = true;
    document.body.classList.add('gp-resizing');
  };

  document.addEventListener('mousemove', function(e) {
    if (!dragging || !activeContainer) return;
    var rect = activeContainer.getBoundingClientRect();
    if (rect.width <= 100) return;
    var ratio = (e.clientX - rect.left) / rect.width;
    applyRatio(ratio);
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    activeContainer = null;
    document.body.classList.remove('gp-resizing');
    try {
      var current = getComputedStyle(document.documentElement).getPropertyValue('--gld-split-ratio').trim();
      var pct = parseFloat(current);
      if (!isNaN(pct)) localStorage.setItem(STORAGE_KEY, String(pct / 100));
    } catch (e) {}
  }

  document.addEventListener('mouseup', endDrag);
  document.addEventListener('mouseleave', endDrag);
})();
`;
}
