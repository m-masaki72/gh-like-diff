export function getMinimapScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var canvas = null;
  var viewport = null;
  var container = null;
  var dragging = false;
  var totalHeight = 0;

  function init() {
    container = document.getElementById('gp-minimap');
    if (!container) return;
    canvas = container.querySelector('.gp-minimap-canvas');
    viewport = container.querySelector('.gp-minimap-viewport');
    if (!canvas || !viewport) return;

    renderMap();
    updateViewport();
    window.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', function() { renderMap(); updateViewport(); });

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

  function renderMap() {
    if (!canvas) return;
    var lines = document.querySelectorAll('.gp-main tr');
    totalHeight = document.documentElement.scrollHeight;
    var mapH = canvas.clientHeight;
    if (!mapH || !totalHeight) return;

    var ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = mapH * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvas.clientWidth, mapH);

    var scale = mapH / totalHeight;
    for (var i = 0; i < lines.length; i++) {
      var tr = lines[i];
      var rect = tr.getBoundingClientRect();
      var y = (rect.top + window.scrollY) * scale;
      var h = Math.max(1, rect.height * scale);

      if (tr.classList.contains('gp-add')) {
        ctx.fillStyle = 'rgba(63,185,80,0.6)';
        ctx.fillRect(0, y, canvas.clientWidth, h);
      } else if (tr.classList.contains('gp-del')) {
        ctx.fillStyle = 'rgba(248,81,73,0.5)';
        ctx.fillRect(0, y, canvas.clientWidth, h);
      } else if (tr.classList.contains('gp-hunk')) {
        ctx.fillStyle = 'rgba(56,139,253,0.3)';
        ctx.fillRect(0, y, canvas.clientWidth, h);
      }
    }
  }

  function updateViewport() {
    if (!viewport || !container) return;
    var mapH = container.clientHeight;
    var viewH = window.innerHeight;
    var scrollY = window.scrollY;
    totalHeight = document.documentElement.scrollHeight;
    if (!totalHeight) return;

    var scale = mapH / totalHeight;
    var top = scrollY * scale;
    var height = Math.max(12, viewH * scale);
    viewport.style.top = top + 'px';
    viewport.style.height = height + 'px';
  }

  function jumpTo(e) {
    if (!container) return;
    var rect = container.getBoundingClientRect();
    var y = e.clientY - rect.top;
    var ratio = y / container.clientHeight;
    totalHeight = document.documentElement.scrollHeight;
    var target = ratio * totalHeight - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, target) });
  }

  window.__gld.toggleMinimap = function() {
    var el = document.getElementById('gp-minimap');
    if (el) el.classList.toggle('collapsed');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
