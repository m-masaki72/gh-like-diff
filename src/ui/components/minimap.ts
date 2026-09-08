export function getMinimapScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var canvas = null;
  var viewport = null;
  var container = null;
  var dragging = false;
  var totalHeight = 0;
  var pending = false;

  function init() {
    container = document.getElementById('gp-minimap');
    if (!container) return;
    canvas = container.querySelector('.gp-minimap-canvas');
    viewport = container.querySelector('.gp-minimap-viewport');
    if (!canvas || !viewport) return;

    scheduleRender();
    updateViewport();
    window.addEventListener('scroll', updateViewport, { passive: true });
    window.addEventListener('resize', function() { scheduleRender(); updateViewport(); }, { passive: true });
    // Collapsing a file, expanding context, filtering or switching views all change the
    // document height; without this the bars kept pointing at their old positions.
    document.addEventListener('gld:layout', scheduleRender);

    container.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      jumpTo(e);
    });
    document.addEventListener('mousemove', function(e) {
      if (dragging) jumpTo(e);
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  }

  // Coalesced into one frame: resize fires in bursts and every render walks every row.
  function scheduleRender() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function() {
      pending = false;
      renderMap();
      updateViewport();
    });
  }

  function renderMap() {
    if (!canvas || !container || container.classList.contains('collapsed')) return;
    // Visible view only. Rows in the hidden table report a zero rect, which used to paint
    // a stack of phantom bars at the current scroll position.
    var lines = window.__gld.qa('.gp-main tr');
    totalHeight = document.documentElement.scrollHeight;
    var mapH = canvas.clientHeight;
    if (!mapH || !totalHeight) return;

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = mapH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, mapH);

    var scale = mapH / totalHeight;
    var width = canvas.clientWidth;
    for (var i = 0; i < lines.length; i++) {
      var tr = lines[i];
      var rect = tr.getBoundingClientRect();
      if (rect.height === 0) continue;
      var y = (rect.top + window.scrollY) * scale;
      var h = Math.max(1, rect.height * scale);

      if (tr.classList.contains('gp-add')) ctx.fillStyle = 'rgba(63,185,80,0.6)';
      else if (tr.classList.contains('gp-del')) ctx.fillStyle = 'rgba(248,81,73,0.5)';
      else if (tr.classList.contains('gp-hunk')) ctx.fillStyle = 'rgba(56,139,253,0.3)';
      else continue;
      ctx.fillRect(0, y, width, h);
    }
  }
  window.__gld.renderMinimap = scheduleRender;

  function updateViewport() {
    if (!viewport || !container) return;
    var mapH = container.clientHeight;
    totalHeight = document.documentElement.scrollHeight;
    if (!totalHeight || !mapH) return;

    var scale = mapH / totalHeight;
    viewport.style.top = (window.scrollY * scale) + 'px';
    viewport.style.height = Math.max(12, window.innerHeight * scale) + 'px';
  }

  function jumpTo(e) {
    if (!container) return;
    var rect = container.getBoundingClientRect();
    var ratio = (e.clientY - rect.top) / container.clientHeight;
    totalHeight = document.documentElement.scrollHeight;
    var target = ratio * totalHeight - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, Math.min(totalHeight, target)) });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
