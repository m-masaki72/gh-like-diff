export function getContextExpandScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var EXPAND_STEP = 10;

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getFilePath(fileIdx) {
    var dataEl = document.getElementById('gp-diff-data');
    if (!dataEl) return null;
    var data = JSON.parse(dataEl.textContent);
    var file = data.files[fileIdx];
    return file ? (file.newName || file.oldName) : null;
  }

  function getFileLines(path) {
    var el = document.getElementById('gp-file-sources');
    if (!el) return null;
    var sources = JSON.parse(el.textContent);
    return sources[path] || null;
  }

  function buildContextRows(oldStart, newStart, count, lines, isSide) {
    var html = '';
    for (var i = 0; i < count; i++) {
      var newNum = newStart + i;
      var oldNum = oldStart + i;
      var content = escHtml(lines[newNum - 1] || '');
      if (isSide) {
        html += '<tr class="gp-ctx">' +
          '<td class="gp-ln gp-ctx">' + oldNum + '</td>' +
          '<td class="gp-code gp-ctx">' + content + '</td>' +
          '<td class="gp-ln gp-ctx">' + newNum + '</td>' +
          '<td class="gp-code gp-ctx">' + content + '</td></tr>';
      } else {
        html += '<tr class="gp-ctx">' +
          '<td class="gp-ln">' + newNum + '</td>' +
          '<td class="gp-ln">' + oldNum + '</td>' +
          '<td class="gp-code"><span class="gp-prefix"> </span>' + content + '</td></tr>';
      }
    }
    return html;
  }

  function insertRowsBefore(tr, html) {
    var temp = document.createElement('tbody');
    temp.innerHTML = html;
    var parent = tr.parentNode;
    while (temp.firstChild) {
      parent.insertBefore(temp.firstChild, tr);
    }
  }

  function updateExpandLabel(tr) {
    var newStart = parseInt(tr.dataset.newStart);
    var newEnd = parseInt(tr.dataset.newEnd);
    var remaining = newEnd - newStart + 1;
    var btn = tr.querySelector('.gp-expand-btn-row');
    if (btn) btn.textContent = '\\u2195 Show ' + remaining + ' hidden lines';
  }

  window.__gld.expandContext = function(btn) {
    var tr = btn.closest('.gp-expand-row');
    if (!tr) return;

    var fileIdx = parseInt(tr.dataset.fileIdx);
    var oldStart = parseInt(tr.dataset.oldStart);
    var oldEnd = parseInt(tr.dataset.oldEnd);
    var newStart = parseInt(tr.dataset.newStart);
    var newEnd = parseInt(tr.dataset.newEnd);

    var path = getFilePath(fileIdx);
    if (!path) return;
    var lines = getFileLines(path);
    if (!lines) return;

    // Resolve EOF markers
    if (newEnd === -1) {
      newEnd = lines.length;
      oldEnd = oldStart + (newEnd - newStart);
    }

    if (newStart > newEnd) { tr.remove(); return; }

    var table = tr.closest('.gp-diff-table');
    var isSide = table && table.classList.contains('gp-side-table');
    var total = newEnd - newStart + 1;

    if (total <= EXPAND_STEP) {
      // Expand all remaining and remove the row
      var html = buildContextRows(oldStart, newStart, total, lines, isSide);
      insertRowsBefore(tr, html);
      tr.remove();
    } else {
      // Expand EXPAND_STEP lines, keep the row for the rest
      var html = buildContextRows(oldStart, newStart, EXPAND_STEP, lines, isSide);
      insertRowsBefore(tr, html);
      tr.dataset.oldStart = String(oldStart + EXPAND_STEP);
      tr.dataset.newStart = String(newStart + EXPAND_STEP);
      updateExpandLabel(tr);
    }
  };

  // Resolve EOF expand rows on page load
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.gp-expand-row').forEach(function(tr) {
      var newEnd = parseInt(tr.dataset.newEnd);
      if (newEnd !== -1) return;

      var fileIdx = parseInt(tr.dataset.fileIdx);
      var newStart = parseInt(tr.dataset.newStart);
      var path = getFilePath(fileIdx);
      if (!path) { tr.remove(); return; }
      var lines = getFileLines(path);
      if (!lines) { tr.remove(); return; }

      var remaining = lines.length - newStart + 1;
      if (remaining <= 0) {
        tr.remove();
      } else {
        tr.dataset.newEnd = String(lines.length);
        tr.dataset.oldEnd = String(parseInt(tr.dataset.oldStart) + remaining - 1);
        updateExpandLabel(tr);
      }
    });
  });
})();
`;
}
