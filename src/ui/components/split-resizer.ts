export function getSplitResizerScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var STORAGE_KEY = 'gld-split-ratio';
  var DEFAULT_RATIO = 0.5;
  var MIN_RATIO = 0.15;
  var MAX_RATIO = 0.85;
  var MIN_PANE_PX = 120;

  function applyRatio(ratio) {
    var clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio));
    document.documentElement.style.setProperty('--gld-split-ratio', (clamped * 100).toFixed(3) + '%');
    return clamped;
  }

  function saveRatio(ratio) {
    try { localStorage.setItem(STORAGE_KEY, String(ratio)); } catch (e) {}
  }

  function restoreSavedRatio() {
    var ratio = DEFAULT_RATIO;
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

  window.__gld.resetSplit = function() {
    applyRatio(DEFAULT_RATIO);
    saveRatio(DEFAULT_RATIO);
    window.__gld.toast('Split reset to 50/50', { type: 'info', duration: 1500 });
  };

  var dragging = false;
  var activeContainer = null;

  function pointerX(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    return e.clientX;
  }

  function beginDrag(e) {
    var target = e.currentTarget || e.target;
    activeContainer = target && target.parentElement;
    if (!activeContainer) return;
    dragging = true;
    document.body.classList.add('gp-resizing');
  }

  window.__gld.startSplitResize = function(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;
    e.preventDefault();
    beginDrag(e);
  };

  function onMove(e) {
    if (!dragging || !activeContainer) return;
    var rect = activeContainer.getBoundingClientRect();
    if (rect.width <= 2 * MIN_PANE_PX) return;
    // Clamped in pixels as well as percent, so a narrow window cannot collapse a pane to
    // nothing while the divider stays parked at 15%.
    var x = Math.max(MIN_PANE_PX, Math.min(rect.width - MIN_PANE_PX, pointerX(e) - rect.left));
    applyRatio(x / rect.width);
    if (e.cancelable) e.preventDefault();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    activeContainer = null;
    document.body.classList.remove('gp-resizing');
    try {
      var pct = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gld-split-ratio'));
      if (!isNaN(pct)) saveRatio(pct / 100);
    } catch (e) {}
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);
  // Not mouseleave: leaving the window mid-drag used to commit a half-finished ratio.
  // The button-state check ends the drag only once the button is genuinely released.
  document.addEventListener('mouseenter', function(e) {
    if (dragging && e.buttons === 0) endDrag();
  });

  document.addEventListener('dblclick', function(e) {
    if (e.target.closest && e.target.closest('.gp-side-divider')) {
      e.preventDefault();
      window.__gld.resetSplit();
    }
  });
})();
`;
}
