export function getToolbarScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  window.__gld.toggleFile = function(fileIndex) {
    var body = document.getElementById('gp-file-body-' + fileIndex);
    var file = document.getElementById('gp-file-' + fileIndex);
    if (!body || !file) return;

    var isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    var chevron = file.querySelector('.gp-chevron-icon');
    if (chevron) {
      chevron.style.transform = isHidden ? '' : 'rotate(-90deg)';
    }
  };

  window.__gld.switchView = function(mode) {
    var dataEl = document.getElementById('gp-diff-data');
    if (!dataEl) {
      // No embedded data, just toggle button state
      document.getElementById('gp-btn-unified').classList.toggle('active', mode === 'line');
      document.getElementById('gp-btn-split').classList.toggle('active', mode === 'side');
      return;
    }

    try {
      var data = JSON.parse(dataEl.textContent);
      data.options.outputFormat = mode === 'side' ? 'side-by-side' : 'line-by-line';
      dataEl.textContent = JSON.stringify(data);
    } catch (e) {}

    document.getElementById('gp-btn-unified').classList.toggle('active', mode === 'line');
    document.getElementById('gp-btn-split').classList.toggle('active', mode === 'side');
  };

  window.__gld.copyFileName = function(btn) {
    var text = btn.getAttribute('data-clipboard');
    if (!text) return;
    navigator.clipboard.writeText(text).then(function() {
      var copyIcon = btn.querySelector('.gp-copy-icon');
      var checkIcon = btn.querySelector('.gp-check-icon');
      if (copyIcon) copyIcon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = '';
      btn.classList.add('copied');
      setTimeout(function() {
        if (copyIcon) copyIcon.style.display = '';
        if (checkIcon) checkIcon.style.display = 'none';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(function() {});
  };

  window.__gld.copyHunk = function(btn) {
    var hunkRow = btn.closest('.gp-hunk');
    if (!hunkRow) return;
    var lines = [];
    var row = hunkRow.nextElementSibling;
    while (row && !row.classList.contains('gp-hunk') && !row.classList.contains('gp-expand-row')) {
      var codes = row.querySelectorAll('.gp-code');
      if (codes.length > 0) {
        var lastCode = codes[codes.length - 1];
        var text = lastCode.textContent || '';
        var prefix = lastCode.querySelector('.gp-prefix');
        if (prefix) {
          text = text.substring(prefix.textContent.length);
        }
        if (!row.classList.contains('gp-del')) {
          lines.push(text);
        }
      }
      row = row.nextElementSibling;
    }
    navigator.clipboard.writeText(lines.join('\\n')).then(function() {
      var copyIcon = btn.querySelector('.gp-copy-icon');
      var checkIcon = btn.querySelector('.gp-check-icon');
      if (copyIcon) copyIcon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = '';
      setTimeout(function() {
        if (copyIcon) copyIcon.style.display = '';
        if (checkIcon) checkIcon.style.display = 'none';
      }, 2000);
    }).catch(function() {});
  };

  window.__gld.filterFiles = function(query) {
    var q = query.toLowerCase();
    document.querySelectorAll('.gp-file').forEach(function(file) {
      var name = file.querySelector('.gp-file-header-name');
      var text = name ? name.textContent.toLowerCase() : '';
      file.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
    document.querySelectorAll('.gp-file-item').forEach(function(item) {
      var name = item.querySelector('.gp-file-name');
      var text = name ? name.textContent.toLowerCase() : '';
      item.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
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
