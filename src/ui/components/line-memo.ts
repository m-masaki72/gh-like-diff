export function getLineMemoScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var MEMO_KEY_PREFIX = 'gld-memos-';
  var openEditor = null;

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getMemoKey() {
    var title = document.title || 'diff';
    var h = 0;
    for (var i = 0; i < title.length; i++) {
      h = ((h << 5) - h + title.charCodeAt(i)) | 0;
    }
    return MEMO_KEY_PREFIX + Math.abs(h).toString(16).slice(0, 8);
  }

  function loadMemos() {
    try {
      var raw = localStorage.getItem(getMemoKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveMemos(memos) {
    try { localStorage.setItem(getMemoKey(), JSON.stringify(memos)); } catch (e) {}
  }

  function memoId(fileIdx, side, lineNum) {
    return fileIdx + '-' + side + '-' + lineNum;
  }

  function removeBadge(tr) {
    var existing = tr.querySelector('.gp-memo-badge');
    if (existing) existing.remove();
  }

  function addBadge(tr, id) {
    removeBadge(tr);
    var lnCell = tr.querySelector('.gp-ln[data-ln]');
    if (!lnCell) return;
    var badge = document.createElement('span');
    badge.className = 'gp-memo-badge';
    badge.textContent = '\\uD83D\\uDCDD';
    badge.title = 'Edit memo';
    badge.onclick = function(e) {
      e.stopPropagation();
      openMemoEditor(tr, id);
    };
    lnCell.appendChild(badge);
  }

  function closeEditor() {
    if (openEditor) {
      openEditor.remove();
      openEditor = null;
    }
  }

  function openMemoEditor(tr, id) {
    closeEditor();
    var memos = loadMemos();
    var existing = memos[id] || '';

    var editorRow = document.createElement('tr');
    editorRow.className = 'gp-memo-editor-row';
    var td = document.createElement('td');
    var colCount = tr.querySelectorAll('td').length;
    td.colSpan = colCount;
    td.className = 'gp-memo-editor';

    var textarea = document.createElement('textarea');
    textarea.className = 'gp-memo-textarea';
    textarea.value = existing;
    textarea.placeholder = 'Add a review note...';
    textarea.rows = 3;

    var actions = document.createElement('div');
    actions.className = 'gp-memo-actions';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'gp-btn gp-memo-save';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = function() {
      var val = textarea.value.trim();
      var memos = loadMemos();
      if (val) {
        memos[id] = val;
        addBadge(tr, id);
      } else {
        delete memos[id];
        removeBadge(tr);
      }
      saveMemos(memos);
      closeEditor();
      updateMemoPanel();
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'gp-btn gp-memo-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = closeEditor;

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'gp-btn gp-memo-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = function() {
      var memos = loadMemos();
      delete memos[id];
      saveMemos(memos);
      removeBadge(tr);
      closeEditor();
      updateMemoPanel();
    };

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    if (existing) actions.appendChild(deleteBtn);
    td.appendChild(textarea);
    td.appendChild(actions);
    editorRow.appendChild(td);

    tr.parentNode.insertBefore(editorRow, tr.nextSibling);
    openEditor = editorRow;
    textarea.focus();
  }

  document.addEventListener('dblclick', function(e) {
    var lnCell = e.target.closest('.gp-ln[data-ln]');
    if (!lnCell) return;
    e.preventDefault();
    var fileIdx = lnCell.dataset.fileIdx;
    var side = lnCell.dataset.side;
    var lineNum = lnCell.dataset.ln;
    var id = memoId(fileIdx, side, lineNum);
    var tr = lnCell.closest('tr');
    if (tr) openMemoEditor(tr, id);
  });

  function restoreBadges() {
    var memos = loadMemos();
    Object.keys(memos).forEach(function(id) {
      var parts = id.split('-');
      var fileIdx = parts[0];
      var side = parts[1];
      var lineNum = parts[2];
      var cell = document.querySelector('.gp-ln[data-file-idx="' + fileIdx + '"][data-side="' + side + '"][data-ln="' + lineNum + '"]');
      if (cell) {
        var tr = cell.closest('tr');
        if (tr) addBadge(tr, id);
      }
    });
  }

  function updateMemoPanel() {
    var panel = document.getElementById('gp-memo-panel');
    if (!panel) return;
    var memos = loadMemos();
    var keys = Object.keys(memos);
    var countEl = document.getElementById('gp-memo-count');
    if (countEl) countEl.textContent = keys.length;

    var list = panel.querySelector('.gp-memo-list');
    if (!list) return;
    list.innerHTML = '';

    if (keys.length === 0) {
      list.innerHTML = '<div class="gp-memo-empty">No memos yet. Double-click a line number to add one.</div>';
      return;
    }

    keys.forEach(function(id) {
      var parts = id.split('-');
      var fileIdx = parseInt(parts[0]);
      var side = parts[1];
      var lineNum = parts[2];
      var fileEl = document.getElementById('gp-file-' + fileIdx);
      var fileName = fileEl ? (fileEl.querySelector('.gp-file-header-name') || {}).textContent || 'File ' + fileIdx : 'File ' + fileIdx;

      var item = document.createElement('div');
      item.className = 'gp-memo-item';
      item.innerHTML = '<div class="gp-memo-item-header"><strong>' + escHtml(fileName) + '</strong> <span class="gp-memo-item-line">' + escHtml(side + lineNum) + '</span></div><div class="gp-memo-item-text">' + escHtml(memos[id]) + '</div>';
      item.onclick = function() {
        var cell = document.querySelector('.gp-ln[data-file-idx="' + fileIdx + '"][data-side="' + side + '"][data-ln="' + lineNum + '"]');
        if (cell) cell.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      list.appendChild(item);
    });
  }

  window.__gld.toggleMemoPanel = function() {
    var panel = document.getElementById('gp-memo-panel');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    if (!isOpen) updateMemoPanel();
  };

  window.__gld.exportMemos = function() {
    var memos = loadMemos();
    var keys = Object.keys(memos);
    if (keys.length === 0) return;
    var text = keys.map(function(id) {
      var parts = id.split('-');
      var fileEl = document.getElementById('gp-file-' + parts[0]);
      var fileName = fileEl ? (fileEl.querySelector('.gp-file-header-name') || {}).textContent || 'File ' + parts[0] : 'File ' + parts[0];
      return '[' + fileName + ' ' + parts[1] + parts[2] + '] ' + memos[id];
    }).join('\\n\\n');
    navigator.clipboard.writeText(text);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreBadges);
  } else {
    restoreBadges();
  }
})();
`;
}
