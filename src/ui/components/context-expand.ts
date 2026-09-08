export function getContextExpandScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var EXPAND_STEP = 20;

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Parsed once: re-parsing the whole diff plus every file body on each arrow click made
  // repeated expansion visibly stutter on large diffs.
  var sourcesCache = null;
  function getSources() {
    if (sourcesCache) return sourcesCache;
    var el = document.getElementById('gp-file-sources');
    try { sourcesCache = el ? JSON.parse(el.textContent) : {}; } catch (e) { sourcesCache = {}; }
    return sourcesCache;
  }

  function getFilePath(fileIdx) {
    var file = document.getElementById('gp-file-' + fileIdx);
    return file ? file.dataset.filePath : null;
  }

  function getFileLines(path) {
    var sources = getSources();
    return (path && sources[path]) || null;
  }

  function buildContextRows(oldStart, newStart, count, lines, isSide, fileIdx) {
    var html = '';
    var fi = 'data-file-idx="' + fileIdx + '"';
    for (var i = 0; i < count; i++) {
      var newNum = newStart + i;
      var oldNum = oldStart + i;
      var content = escHtml(lines[newNum - 1] || '');
      if (isSide) {
        // Same .gp-code-inner wrapper the server-rendered rows use, so expanded lines
        // scroll and wrap identically instead of overflowing into the other pane.
        html += '<tr class="gp-ctx">' +
          '<td class="gp-ln gp-ctx" ' + fi + ' data-ln="' + oldNum + '" data-side="L">' + oldNum + '</td>' +
          '<td class="gp-code gp-ctx"><div class="gp-code-inner">' + content + '</div></td>' +
          '<td class="gp-ln gp-ctx" ' + fi + ' data-ln="' + newNum + '" data-side="R">' + newNum + '</td>' +
          '<td class="gp-code gp-ctx"><div class="gp-code-inner">' + content + '</div></td></tr>';
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
      labelEl.textContent = remaining + ' hidden line' + (remaining === 1 ? '' : 's');
    }
  }

  function removeGap(row) {
    var gapId = row.dataset && row.dataset.gapId;
    if (gapId) {
      // Scoped to this table: gap ids used to collide between the unified and
      // side-by-side copies, so expanding one view hid the other view's hunk header.
      var table = row.closest('.gp-diff-table');
      var hunk = (table || document).querySelector('.gp-hunk[data-gap-id="' + gapId + '"]');
      if (hunk) hunk.style.display = 'none';
    }
    row.remove();
    window.__gld.notifyLayoutChanged();
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

  // --- Expand functions ---
  // GitHub convention: the arrow points toward the diff, and each direction reveals lines
  // contiguous with the end of the gap it starts from. Previously both arrows were mapped
  // the other way round, so the only control on the first gap revealed the top of the
  // file rather than the lines immediately above the hunk.

  // \u25b2 walks up from the bottom of the gap: the lines just before the following hunk.
  window.__gld.expandUp = function(btn) {
    var ctx = getExpandContext(btn);
    if (!ctx) return;
    var r = ctx.r;
    var total = r.newEnd - r.newStart + 1;

    if (total <= EXPAND_STEP) {
      var all = buildContextRows(r.oldStart, r.newStart, total, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsAfter(ctx.row, all);
      removeGap(ctx.row);
      return;
    }
    var count = EXPAND_STEP;
    var newStart = r.newEnd - count + 1;
    var oldStart = r.oldEnd - count + 1;
    var html = buildContextRows(oldStart, newStart, count, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
    insertRowsAfter(ctx.row, html);
    syncGapData(ctx.row, r.newStart, newStart - 1, r.oldStart, oldStart - 1);
    window.__gld.notifyLayoutChanged();
  };

  // \u25bc walks down from the top of the gap: the lines just after the preceding hunk.
  window.__gld.expandDown = function(btn) {
    var ctx = getExpandContext(btn);
    if (!ctx) return;
    var r = ctx.r;
    var total = r.newEnd - r.newStart + 1;

    if (total <= EXPAND_STEP) {
      var all = buildContextRows(r.oldStart, r.newStart, total, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
      insertRowsBefore(ctx.row, all);
      removeGap(ctx.row);
      return;
    }
    var html = buildContextRows(r.oldStart, r.newStart, EXPAND_STEP, ctx.lines, ctx.isSide, ctx.row.dataset.fileIdx);
    insertRowsBefore(ctx.row, html);
    syncGapData(ctx.row, r.newStart + EXPAND_STEP, r.newEnd, r.oldStart + EXPAND_STEP, r.oldEnd);
    window.__gld.notifyLayoutChanged();
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
