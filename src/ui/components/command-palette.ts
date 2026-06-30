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

  function buildCommands() {
    commands = [
      { id: 'unified', label: 'Switch to Unified view', section: 'View', fn: function() { window.__gld.switchView('line'); } },
      { id: 'split', label: 'Switch to Split view', section: 'View', fn: function() { window.__gld.switchView('side'); } },
      { id: 'theme', label: 'Toggle theme (dark/light)', section: 'View', fn: function() { window.__gld.toggleTheme(); } },
      { id: 'sidebar', label: 'Toggle sidebar', section: 'View', fn: function() { window.__gld.toggleSidebar(); } },
      { id: 'search', label: 'Search in diff', section: 'Tools', keys: '/', fn: function() { window.__gld.openSearch(); } },
      { id: 'memos', label: 'Toggle memo panel', section: 'Tools', fn: function() { window.__gld.toggleMemoPanel(); } },
      { id: 'export', label: 'Export memos to clipboard', section: 'Tools', fn: function() { window.__gld.exportMemos(); } },
      { id: 'help', label: 'Toggle keyboard shortcuts', section: 'Help', keys: '?', fn: function() { window.__gld.toggleHelp(); } }
    ];

    var files = document.querySelectorAll('.gp-file');
    files.forEach(function(file, i) {
      var nameEl = file.querySelector('.gp-file-header-name');
      var name = nameEl ? nameEl.textContent : 'File ' + i;
      commands.push({
        id: 'file-' + i,
        label: name,
        section: 'Files',
        fn: function() { window.__gld.navFile(i); }
      });
    });
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'gp-palette-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) close(); };

    var dialog = document.createElement('div');
    dialog.className = 'gp-palette';

    input = document.createElement('input');
    input.className = 'gp-palette-input';
    input.placeholder = 'Type a command or file name...';
    input.oninput = function() { filter(); render(); };
    input.onkeydown = function(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); execute(); }
      else if (e.key === 'Escape') { close(); }
    };

    list = document.createElement('div');
    list.className = 'gp-palette-list';

    dialog.appendChild(input);
    dialog.appendChild(list);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function filter() {
    var q = input.value.toLowerCase();
    filtered = commands.filter(function(cmd) {
      return cmd.label.toLowerCase().indexOf(q) !== -1 ||
             cmd.section.toLowerCase().indexOf(q) !== -1;
    });
    selectedIdx = 0;
  }

  function render() {
    list.innerHTML = '';
    var currentSection = '';
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
      item.innerHTML = '<span class="gp-palette-label">' + cmd.label + '</span>' +
        (cmd.keys ? '<kbd class="gp-palette-key">' + cmd.keys + '</kbd>' : '');
      item.onmouseenter = function() { selectedIdx = i; render(); };
      item.onclick = function() { selectedIdx = i; execute(); };
      list.appendChild(item);
    });
  }

  function move(dir) {
    selectedIdx = Math.max(0, Math.min(filtered.length - 1, selectedIdx + dir));
    render();
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

  function open() {
    buildCommands();
    if (!overlay) createOverlay();
    overlay.classList.add('open');
    filter();
    render();
    input.value = '';
    input.focus();
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  window.__gld.openPalette = open;
  window.__gld.closePalette = close;

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) close();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open();
    }
  });
})();
`;
}
