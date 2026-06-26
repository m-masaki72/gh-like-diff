export function getLineHighlightScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var HIGHLIGHT_CLASS = 'gp-highlighted';
  var lastClickedLn = null;

  function clearHighlights() {
    var els = document.querySelectorAll('.' + HIGHLIGHT_CLASS);
    for (var i = 0; i < els.length; i++) {
      els[i].classList.remove(HIGHLIGHT_CLASS);
    }
  }

  function highlightRange(fileEl, startLn, endLn, side) {
    var rows = fileEl.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('.gp-ln[data-ln][data-side="' + side + '"]');
      for (var j = 0; j < cells.length; j++) {
        var num = parseInt(cells[j].dataset.ln);
        if (num >= startLn && num <= endLn) {
          rows[i].classList.add(HIGHLIGHT_CLASS);
        }
      }
    }
  }

  function updateHash(fHash, side, startLn, endLn) {
    var hash = '#diff-' + fHash + side + startLn;
    if (endLn && endLn !== startLn) {
      hash += '-' + side + endLn;
    }
    history.replaceState(null, '', hash);
  }

  function parseHash(hash) {
    var m = hash.match(/^#diff-([a-f0-9]+)([LR])(\\d+)(?:-([LR])(\\d+))?$/);
    if (!m) return null;
    return {
      fileHash: m[1],
      side: m[2],
      startLn: parseInt(m[3]),
      endLn: m[5] ? parseInt(m[5]) : parseInt(m[3])
    };
  }

  document.addEventListener('click', function(e) {
    var lnCell = e.target.closest('.gp-ln[data-ln]');
    if (!lnCell) return;

    e.preventDefault();
    var fileIdx = parseInt(lnCell.dataset.fileIdx);
    var lineNum = parseInt(lnCell.dataset.ln);
    var side = lnCell.dataset.side;
    var fileEl = document.getElementById('gp-file-' + fileIdx);
    if (!fileEl) return;
    var fHash = fileEl.dataset.fileHash;

    clearHighlights();

    if (e.shiftKey && lastClickedLn && lastClickedLn.fileIdx === fileIdx && lastClickedLn.side === side) {
      var start = Math.min(lastClickedLn.lineNum, lineNum);
      var end = Math.max(lastClickedLn.lineNum, lineNum);
      highlightRange(fileEl, start, end, side);
      updateHash(fHash, side, start, end);
    } else {
      var tr = lnCell.closest('tr');
      if (tr) tr.classList.add(HIGHLIGHT_CLASS);
      updateHash(fHash, side, lineNum);
      lastClickedLn = { fileIdx: fileIdx, lineNum: lineNum, side: side };
    }
  });

  function applyHashHighlight() {
    var parsed = parseHash(window.location.hash);
    if (!parsed) return;
    var fileEl = document.querySelector('.gp-file[data-file-hash="' + parsed.fileHash + '"]');
    if (!fileEl) return;
    clearHighlights();
    highlightRange(fileEl, parsed.startLn, parsed.endLn, parsed.side);
    var first = fileEl.querySelector('.' + HIGHLIGHT_CLASS);
    if (first) {
      setTimeout(function() {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  window.addEventListener('hashchange', applyHashHighlight);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHashHighlight);
  } else {
    applyHashHighlight();
  }
})();
`;
}
