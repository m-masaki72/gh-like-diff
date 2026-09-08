export function getLineMemoScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var SEP = '\\u0001';
  var openEditor = null;
  var openEditorId = null;

  function memoKey() { return window.__gld.storageKey('gld-memos'); }
  function loadMemos() { return window.__gld.readJson(memoKey(), {}) || {}; }
  function saveMemos(memos) {
    if (!window.__gld.writeJson(memoKey(), memos)) {
      window.__gld.toast('Could not save memo - storage unavailable', { type: 'error' });
    }
  }

  // Keyed on the file path, not its position in the diff: an index-based key restored
  // notes onto whatever file happened to sit at that index in a different diff.
  function memoId(path, side, lineNum) { return path + SEP + side + SEP + lineNum; }
  function parseId(id) {
    var parts = id.split(SEP);
    return { path: parts[0], side: parts[1], line: parts[2] };
  }

  function cellsFor(path, side, lineNum) {
    var file = document.querySelector('.gp-file[data-file-path="' + CSS.escape(path) + '"]');
    if (!file) return [];
    return Array.prototype.slice.call(file.querySelectorAll(
      '.gp-ln[data-side="' + side + '"][data-ln="' + lineNum + '"]'));
  }

  function removeBadges(path, side, lineNum) {
    cellsFor(path, side, lineNum).forEach(function(cell) {
      var b = cell.querySelector('.gp-memo-badge');
      if (b) b.remove();
    });
  }

  // Badges go on the exact gutter cell the memo belongs to, in *both* views, so the note
  // stays visible after a view switch and never appears against the opposite column.
  function addBadges(id) {
    var p = parseId(id);
    removeBadges(p.path, p.side, p.line);
    cellsFor(p.path, p.side, p.line).forEach(function(cell) {
      var badge = document.createElement('span');
      badge.className = 'gp-memo-badge';
      badge.textContent = '\\uD83D\\uDCDD';
      badge.title = 'Edit memo';
      badge.onclick = function(e) {
        e.stopPropagation();
        var tr = cell.closest('tr');
        if (tr) openMemoEditor(tr, id);
      };
      cell.appendChild(badge);
    });
  }

  // force=true for an explicit dismiss (Cancel / Esc). Only the implicit close that
  // happens when another line's memo is opened asks before throwing away a draft.
  function closeEditor(force) {
    if (!openEditor) return true;
    var ta = openEditor.querySelector('textarea');
    if (!force && ta && ta.value.trim() !== (ta.dataset.initial || '')) {
      var ok = true;
      try { ok = window.confirm('Discard unsaved memo?'); } catch (e) {}
      if (!ok) return false;
    }
    openEditor.remove();
    openEditor = null;
    openEditorId = null;
    return true;
  }
  window.__gld.closeMemoEditor = function() { return closeEditor(true); };
  window.__gld.memoEditorOpen = function() { return !!openEditor; };

  function openMemoEditor(tr, id) {
    if (openEditorId === id) return;
    if (!closeEditor(false)) return;
    var memos = loadMemos();
    var existing = memos[id] || '';

    var editorRow = document.createElement('tr');
    editorRow.className = 'gp-memo-editor-row';
    var td = document.createElement('td');
    td.colSpan = tr.querySelectorAll('td').length;
    td.className = 'gp-memo-editor';

    var textarea = document.createElement('textarea');
    textarea.className = 'gp-memo-textarea';
    textarea.value = existing;
    textarea.dataset.initial = existing;
    textarea.placeholder = 'Add a review note... (Ctrl/Cmd+Enter to save, Esc to close)';
    textarea.rows = 3;

    function save() {
      var val = textarea.value.trim();
      var current = loadMemos();
      if (val) {
        current[id] = val;
        saveMemos(current);
        addBadges(id);
      } else {
        delete current[id];
        saveMemos(current);
        var p = parseId(id);
        removeBadges(p.path, p.side, p.line);
      }
      textarea.dataset.initial = val;
      closeEditor(true);
      updateMemoPanel();
    }

    textarea.addEventListener('keydown', function(e) {
      if (window.__gld.composing(e)) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeEditor(true); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
    });

    var actions = document.createElement('div');
    actions.className = 'gp-memo-actions';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'gp-btn gp-memo-save';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = save;

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'gp-btn gp-memo-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = function() { closeEditor(true); };

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'gp-btn gp-memo-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = function() {
      var current = loadMemos();
      delete current[id];
      saveMemos(current);
      var p = parseId(id);
      removeBadges(p.path, p.side, p.line);
      closeEditor(true);
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
    openEditorId = id;
    textarea.focus();
  }

  document.addEventListener('dblclick', function(e) {
    var lnCell = e.target.closest('.gp-ln[data-ln]');
    if (!lnCell) return;
    e.preventDefault();
    var file = lnCell.closest('.gp-file');
    if (!file) return;
    var id = memoId(file.dataset.filePath, lnCell.dataset.side, lnCell.dataset.ln);
    var tr = lnCell.closest('tr');
    if (tr) openMemoEditor(tr, id);
  });

  function restoreBadges() {
    var memos = loadMemos();
    Object.keys(memos).forEach(addBadges);
    updateMemoPanel();
  }

  function fileNameFor(path) {
    var file = document.querySelector('.gp-file[data-file-path="' + CSS.escape(path) + '"]');
    var name = file && file.querySelector('.gp-file-header-name');
    return name ? name.textContent : path;
  }

  function updateMemoPanel() {
    var panel = document.getElementById('gp-memo-panel');
    var memos = loadMemos();
    var keys = Object.keys(memos);
    var countEl = document.getElementById('gp-memo-count');
    if (countEl) countEl.textContent = keys.length;
    if (!panel) return;

    var list = panel.querySelector('.gp-memo-list');
    if (!list) return;
    list.innerHTML = '';

    if (keys.length === 0) {
      list.innerHTML = '<div class="gp-memo-empty">No memos yet. Double-click a line number to add one.</div>';
      return;
    }

    keys.forEach(function(id) {
      var p = parseId(id);
      var item = document.createElement('div');
      item.className = 'gp-memo-item';
      item.innerHTML = '<div class="gp-memo-item-header"><strong>' + window.__gld.escHtml(fileNameFor(p.path)) +
        '</strong> <span class="gp-memo-item-line">' + window.__gld.escHtml(p.side + p.line) +
        '</span></div><div class="gp-memo-item-text">' + window.__gld.escHtml(memos[id]) + '</div>';
      item.onclick = function() {
        var cells = cellsFor(p.path, p.side, p.line).filter(function(c) {
          return window.__gld.isUsable(c, { includeCollapsed: true });
        });
        if (!cells.length) {
          window.__gld.toast('That line is not in this diff any more', { type: 'info' });
          return;
        }
        var file = cells[0].closest('.gp-file');
        var body = file && file.querySelector('.gp-file-body');
        if (body && body.classList.contains('collapsed')) window.__gld.toggleFile(file.dataset.fileIndex);
        window.__gld.scrollToElement(cells[0].closest('tr'), Math.round(window.innerHeight / 3));
      };
      list.appendChild(item);
    });
  }
  window.__gld.updateMemoPanel = updateMemoPanel;
  window.__gld.refreshMemoBadges = restoreBadges;

  window.__gld.toggleMemoPanel = function() {
    var panel = document.getElementById('gp-memo-panel');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    if (!isOpen) updateMemoPanel();
  };

  function memoText(markdown) {
    var memos = loadMemos();
    var keys = Object.keys(memos);
    if (markdown) {
      var byFile = {};
      keys.forEach(function(id) {
        var p = parseId(id);
        (byFile[p.path] = byFile[p.path] || []).push({ side: p.side, line: p.line, text: memos[id] });
      });
      return Object.keys(byFile).map(function(path) {
        var rows = byFile[path]
          .sort(function(a, b) { return Number(a.line) - Number(b.line); })
          .map(function(m) { return '- **' + m.side + m.line + '** ' + m.text.replace(/\\n/g, ' '); });
        return '## ' + path + '\\n\\n' + rows.join('\\n');
      }).join('\\n\\n');
    }
    return keys.map(function(id) {
      var p = parseId(id);
      return '[' + fileNameFor(p.path) + ' ' + p.side + p.line + '] ' + memos[id];
    }).join('\\n\\n');
  }

  window.__gld.exportMemos = function(format) {
    var count = Object.keys(loadMemos()).length;
    if (count === 0) {
      window.__gld.toast('No memos to export', { type: 'info', duration: 2000 });
      return;
    }
    var markdown = format === 'markdown';
    window.__gld.copyText(memoText(markdown),
      count + ' memo(s) copied' + (markdown ? ' as Markdown' : ''), null);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreBadges);
  } else {
    restoreBadges();
  }
})();
`;
}
