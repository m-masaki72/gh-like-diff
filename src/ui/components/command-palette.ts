export function getCommandPaletteScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var overlay = null;
  var input = null;
  var list = null;
  var commands = [];
  var filtered = [];
  var selectedIdx = 0;
  var lastFocus = null;

  function buildCommands() {
    // Offering a switch that switchView() refuses is worse than not offering it.
    var canSwitchView = document.body.dataset.singleView !== '1';
    commands = (canSwitchView ? [
      { id: 'unified', label: 'Switch to Unified view', section: 'View', fn: function() { window.__gld.switchView('line'); } },
      { id: 'split', label: 'Switch to Split view', section: 'View', fn: function() { window.__gld.switchView('side'); } }
    ] : []).concat([
      { id: 'theme', label: 'Cycle theme (auto/dark/light)', section: 'View', fn: function() { window.__gld.toggleTheme(); } },
      { id: 'sidebar', label: 'Toggle sidebar', section: 'View', keys: 'b', fn: function() { window.__gld.toggleSidebar(); } },
      { id: 'wrap', label: 'Toggle line wrapping', section: 'View', keys: 'w', fn: function() { window.__gld.toggleWrap(); } },
      { id: 'minimap', label: 'Toggle minimap', section: 'View', keys: 'm', fn: function() { window.__gld.toggleMinimap(); } },
      { id: 'search', label: 'Search in diff', section: 'Tools', keys: '/', fn: function() { window.__gld.openSearch(); } },
      { id: 'memos', label: 'Toggle memo panel', section: 'Tools', fn: function() { window.__gld.toggleMemoPanel(); } },
      { id: 'export', label: 'Export memos to clipboard', section: 'Tools', fn: function() { window.__gld.exportMemos(); } },
      { id: 'export-md', label: 'Export memos as Markdown', section: 'Tools', fn: function() { window.__gld.exportMemos('markdown'); } },
      { id: 'unreviewed', label: 'Show only unreviewed files', section: 'Review', fn: function() { window.__gld.toggleUnreviewedOnly(); } },
      { id: 'next-unreviewed', label: 'Go to next unreviewed file', section: 'Review', keys: 'u', fn: function() { window.__gld.nextUnreviewed(); } },
      { id: 'reset', label: 'Reset saved state for this diff', section: 'Review', fn: function() { window.__gld.resetState(); } },
      { id: 'help', label: 'Keyboard shortcuts', section: 'Help', keys: '?', fn: function() { window.__gld.showShortcuts(); } }
    ]);

    window.__gld.qa('.gp-file', { includeCollapsed: true }).forEach(function(file) {
      var nameEl = file.querySelector('.gp-file-header-name');
      var idx = file.dataset.fileIndex;
      commands.push({
        id: 'file-' + idx,
        label: nameEl ? nameEl.textContent : 'File ' + idx,
        section: 'Files',
        fn: function() { window.__gld.navFile(idx); }
      });
    });
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'gp-palette-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) close(); };

    var dialog = document.createElement('div');
    dialog.className = 'gp-palette';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Command palette');

    input = document.createElement('input');
    input.className = 'gp-palette-input';
    input.placeholder = 'Type a command or file name...';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'gp-palette-list');
    input.oninput = function() { filter(); render(); };
    input.onkeydown = function(e) {
      // Arrow keys and Enter belong to the IME while a conversion is in progress.
      if (window.__gld.composing(e)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); execute(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    };

    list = document.createElement('div');
    list.className = 'gp-palette-list';
    list.id = 'gp-palette-list';
    list.setAttribute('role', 'listbox');

    dialog.appendChild(input);
    dialog.appendChild(list);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function filter() {
    var q = (input.value || '').toLowerCase();
    filtered = commands.filter(function(cmd) {
      return cmd.label.toLowerCase().indexOf(q) !== -1 ||
             cmd.section.toLowerCase().indexOf(q) !== -1;
    });
    selectedIdx = 0;
  }

  function render() {
    list.innerHTML = '';
    var currentSection = '';
    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.className = 'gp-palette-empty';
      empty.textContent = 'No matching commands';
      list.appendChild(empty);
      return;
    }
    filtered.forEach(function(cmd, i) {
      if (cmd.section !== currentSection) {
        currentSection = cmd.section;
        var header = document.createElement('div');
        header.className = 'gp-palette-section';
        header.textContent = currentSection;
        list.appendChild(header);
      }
      var item = document.createElement('div');
      item.className = 'gp-palette-item' + (i === selectedIdx ? ' selected' : '');
      item.id = 'gp-palette-item-' + i;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', i === selectedIdx ? 'true' : 'false');
      // textContent, not innerHTML: a path containing markup-looking characters used to
      // break the row apart.
      var label = document.createElement('span');
      label.className = 'gp-palette-label';
      label.textContent = cmd.label;
      item.appendChild(label);
      if (cmd.keys) {
        var kbd = document.createElement('kbd');
        kbd.className = 'gp-palette-key';
        kbd.textContent = cmd.keys;
        item.appendChild(kbd);
      }
      // Only re-style on hover; re-rendering the list from a mouseenter handler recreated
      // the element under the cursor and fought with arrow-key selection.
      item.onmouseenter = function() { select(i); };
      item.onclick = function() { selectedIdx = i; execute(); };
      list.appendChild(item);
    });
    syncActiveDescendant();
  }

  function select(i) {
    if (i === selectedIdx) return;
    var prev = list.querySelector('.gp-palette-item.selected');
    if (prev) { prev.classList.remove('selected'); prev.setAttribute('aria-selected', 'false'); }
    selectedIdx = i;
    var next = document.getElementById('gp-palette-item-' + i);
    if (next) { next.classList.add('selected'); next.setAttribute('aria-selected', 'true'); }
    syncActiveDescendant();
  }

  function syncActiveDescendant() {
    if (input) input.setAttribute('aria-activedescendant', 'gp-palette-item-' + selectedIdx);
  }

  function move(dir) {
    if (!filtered.length) return;
    select(Math.max(0, Math.min(filtered.length - 1, selectedIdx + dir)));
    var sel = list.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function execute() {
    if (filtered[selectedIdx]) {
      var fn = filtered[selectedIdx].fn;
      close();
      fn();
    }
  }

  function isOpen() { return !!overlay && overlay.classList.contains('open'); }

  function open() {
    if (!overlay) createOverlay();
    lastFocus = document.activeElement;
    buildCommands();
    overlay.classList.add('open');
    // Cleared *before* filtering — the old order left the previous query's results on
    // screen beside an empty input.
    input.value = '';
    filter();
    render();
    input.focus();
  }

  function close() {
    if (!isOpen()) return;
    overlay.classList.remove('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  window.__gld.openPalette = open;
  window.__gld.closePalette = close;
  window.__gld.paletteIsOpen = isOpen;

  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) close(); else open();
      return;
    }
    // Escape works wherever focus landed inside the dialog, not just in the input.
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }, true);
})();
`;
}
