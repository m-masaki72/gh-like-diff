export function getContextExpandScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var EXPAND_STEP = 20;

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

  function buildContextRows(oldStart, newStart, count, lines, isSide, fileIdx) {
    var html = '';
    var fi = 'data-file-idx="' + fileIdx + '"';
    for (var i = 0; i < count; i++) {
      var newNum = newStart + i;
      var oldNum = oldStart + i;
      var content = escHtml(lines[newNum - 1] || '');
      if (isSide) {
        html += '<tr class="gp-ctx">' +
          '<td class="gp-ln gp-ctx" ' + fi + ' data-ln="' + oldNum + '" data-side="L">' + oldNum + '</td>' +
          '<td class="gp-code gp-ctx">' + content + '</td>' +
          '<td class="gp-ln gp-ctx" ' + fi + ' data-ln="' + newNum + '" data-side="R">' + newNum + '</td>' +
          '<td class="gp-code gp-ctx">' + content + '</td></tr>';
      } else {
        html += '<tr class="gp-ctx">' +
          '<td class="gp-ln" ' + fi + ' data-ln="' + newNum + '" data-side="R">' + newNum + '</td>' +
          '<td class="gp-ln" ' + fi + ' data-ln="' + oldNum + '" data-side="L">' + oldNum + '</td>' +
          '<td class="gp-code"><span class="gp-prefix"> </span>' + content + '</td></tr>';
      }
    }
    return html;
  }

  function insertRowsBefore(ref, html) {
    var temp = document.createElement('tbody');
    temp.innerHTML = html;
    var parent = ref.parentNode;
    while (temp.firstChild) {
      parent.insertBefore(temp.firstChild, ref);
    }
  }

  function insertRowsAfter(ref, html) {
    var temp = document.createElement('tbody');
    temp.innerHTML = html;
    var parent = ref.parentNode;
    var next = ref.nextSibling;
    while (temp.firstChild) {
      if (next) {
        parent.insertBefore(temp.firstChild, next);
      } else {
        parent.appendChild(temp.firstChild);
      }
    }
  }

  // --- Gap row helpers (single-row expand UI) ---

  function syncGapData(row, newStart, newEnd, oldStart, oldEnd) {
    var remaining = newEnd - newStart + 1;
    if (remaining <= 0) {
      removeGap(row);
      return;
    }
    row.dataset.newStart = String(newStart);
    row.dataset.newEnd = String(newEnd);
    row.dataset.oldStart = String(oldStart);
    row.dataset.oldEnd = String(oldEnd);
    var labelEl = row.querySelector('.gp-expand-label .gp-hunk-text');
    if (labelEl) {
      labelEl.textContent = remaining + ' hidden lines';
    }
  }

  function removeGap(row) {
    var gapId = row.dataset && row.dataset.gapId;
    if (gapId) {
      var hunk = document.querySelector('.gp-hunk[data-gap-id="' + gapId + '"]');
      if (hunk) hunk.style.display = 'none';
    }
    row.remove();
  }

  function resolveEof(row, lines) {
    var newStart = parseInt(row.dataset.newStart);
    var oldStart = parseInt(row.dataset.oldStart);
    var newEnd = parseInt(row.dataset.newEnd);
    var oldEnd = parseInt(row.dataset.oldEnd);
    if (newEnd === -1) {
      newEnd = lines.length;
      oldEnd = oldStart + (newEnd - newStart);
      syncGapData(row, newStart, newEnd, oldStart, oldEnd);
    }
    return { newStart: newStart, newEnd: newEnd, oldStart: oldStart, oldEnd: oldEnd };
  }

  function getExpandContext(btn) {
    var row = btn.closest('.gp-expand-row');
    if (!row) return null;
    var fileIdx = parseInt(row.dataset.fileIdx);
    var path = getFilePath(fileIdx);
    if (!path) return null;
    var lines = getFileLines(path);
    if (!lines) return null;
    var r = resolveEof(row, lines);
    if (!r || r.newStart > r.newEnd) { removeGap(row); return null; }
    var table = row.closest('.gp-diff-table');
    var isSide = table && table.classList.contains('gp-side-table');
    return { row: row, lines: lines, r: r, isSide: isSide };
  }

  // --- Expand functions (GitHub-style: ▲ shows top, ▼ shows bottom) ---

  // ▲ click — show the TOP of the hidden range (rows go ABOVE the expand row).
  window.__gld.expandUp = function(btn) {
    var ctx = getExpandContext(btn);
    if (!ctx) return;
    var r = ctx.r;
    var total = r.newEnd - r.newStart + 1;

    if (total <= EXPAND_STEP) {
      var html = buildContextRows(r.oldStart, r.newStart, total, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsBefore(ctx.row, html);
      removeGap(ctx.row);
    } else {
      var html = buildContextRows(r.oldStart, r.newStart, EXPAND_STEP, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsBefore(ctx.row, html);
      syncGapData(ctx.row, r.newStart + EXPAND_STEP, r.newEnd, r.oldStart + EXPAND_STEP, r.oldEnd);
    }
  };

  // ▼ click — show the BOTTOM of the hidden range (rows go BELOW the expand row).
  window.__gld.expandDown = function(btn) {
    var ctx = getExpandContext(btn);
    if (!ctx) return;
    var r = ctx.r;
    var total = r.newEnd - r.newStart + 1;

    if (total <= EXPAND_STEP) {
      var html = buildContextRows(r.oldStart, r.newStart, total, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsAfter(ctx.row, html);
      removeGap(ctx.row);
    } else {
      var count = EXPAND_STEP;
      var expandNewStart = r.newEnd - count + 1;
      var expandOldStart = r.oldEnd - count + 1;
      var html = buildContextRows(expandOldStart, expandNewStart, count, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsAfter(ctx.row, html);
      syncGapData(ctx.row, r.newStart, expandNewStart - 1, r.oldStart, expandOldStart - 1);
    }
  };

  window.__gld.expandAll = function(btn) {
    var ctx = getExpandContext(btn);
    if (!ctx) return;
    var r = ctx.r;
    var total = r.newEnd - r.newStart + 1;
    var html = buildContextRows(r.oldStart, r.newStart, total, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
    insertRowsBefore(ctx.row, html);
    removeGap(ctx.row);
  };

  // Resolve EOF expand rows (data-new-end="-1") once we know the file length.
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.gp-expand-row').forEach(function(row) {
      var newEnd = parseInt(row.dataset.newEnd);
      if (newEnd !== -1) return;

      var fileIdx = parseInt(row.dataset.fileIdx);
      var newStart = parseInt(row.dataset.newStart);
      var oldStart = parseInt(row.dataset.oldStart);
      var path = getFilePath(fileIdx);
      if (!path) { removeGap(row); return; }
      var lines = getFileLines(path);
      if (!lines) { removeGap(row); return; }

      var remaining = lines.length - newStart + 1;
      if (remaining <= 0) {
        removeGap(row);
      } else {
        syncGapData(row, newStart, lines.length, oldStart, oldStart + remaining - 1);
      }
    });
  });
})();
`;
}
