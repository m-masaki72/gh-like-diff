export function getToolbarScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  window.__gld.toggleFile = function(fileIndex) {
    var body = document.getElementById('gp-file-body-' + fileIndex);
    var file = document.getElementById('gp-file-' + fileIndex);
    if (!body || !file) return;

    var btn = file.querySelector('.gp-collapse-btn');
    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    if (btn) btn.textContent = isHidden ? 'Hide' : 'Show';
  };

  window.__gld.switchView = function(mode) {
    var dataEl = document.getElementById('gp-diff-data');
    if (!dataEl) {
      // No embedded data, just toggle button state
      document.getElementById('gp-btn-unified').classList.toggle('active', mode === 'line');
      document.getElementById('gp-btn-split').classList.toggle('active', mode === 'side');
      return;
    }

    // Full re-render from embedded data
    try {
      var data = JSON.parse(dataEl.textContent);
      data.options.outputFormat = mode === 'side' ? 'side-by-side' : 'line-by-line';
      dataEl.textContent = JSON.stringify(data);

      // Re-render all files
      var main = document.querySelector('.gp-main');
      if (main && window.__gld.renderAllFiles) {
        main.innerHTML = window.__gld.renderAllFiles(data.files, data.options);
      }
    } catch (e) {
      console.error('View switch failed:', e);
    }

    document.getElementById('gp-btn-unified').classList.toggle('active', mode === 'line');
    document.getElementById('gp-btn-split').classList.toggle('active', mode === 'side');
  };

  var helpVisible = false;
  window.__gld.toggleHelp = function() {
    var hint = document.querySelector('.gp-kbd-hint');
    if (hint) {
      helpVisible = !helpVisible;
      hint.style.display = helpVisible ? 'block' : 'none';
    }
  };
})();
`;
}
