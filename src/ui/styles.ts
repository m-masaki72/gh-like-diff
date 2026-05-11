export function getStyles(): string {
  return `
/* === GitHub Design Tokens === */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --gld-fg: #1f2328;
  --gld-fg-muted: #656d76;
  --gld-fg-subtle: #6e7781;
  --gld-canvas: #ffffff;
  --gld-canvas-subtle: #f6f8fa;
  --gld-border: #d0d7de;
  --gld-border-muted: #d8dee4;
  --gld-neutral-muted: rgba(175,184,193,0.2);
  --gld-accent: #0969da;
  --gld-success: #1a7f37;
  --gld-danger: #d1242f;
  --gld-add-num-bg: rgba(63,185,80,0.3);
  --gld-add-line-bg: #e6ffec;
  --gld-add-word-bg: #abf2bc;
  --gld-del-num-bg: rgba(255,129,130,0.3);
  --gld-del-line-bg: #ffebe9;
  --gld-del-word-bg: #ff8182;
  --gld-hunk-bg: #ddf4ff;
  --gld-hunk-border: rgba(84,174,255,0.4);
  --gld-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --gld-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  --gld-sidebar-width: 280px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --gld-fg: #e6edf3;
    --gld-fg-muted: #8b949e;
    --gld-fg-subtle: #6e7681;
    --gld-canvas: #0d1117;
    --gld-canvas-subtle: #161b22;
    --gld-border: #30363d;
    --gld-border-muted: #21262d;
    --gld-neutral-muted: rgba(110,118,129,0.4);
    --gld-accent: #58a6ff;
    --gld-success: #3fb950;
    --gld-danger: #f85149;
    --gld-add-num-bg: rgba(63,185,80,0.3);
    --gld-add-line-bg: rgba(63,185,80,0.15);
    --gld-add-word-bg: rgba(63,185,80,0.4);
    --gld-del-num-bg: rgba(248,81,73,0.3);
    --gld-del-line-bg: rgba(248,81,73,0.15);
    --gld-del-word-bg: rgba(248,81,73,0.4);
    --gld-hunk-bg: rgba(56,139,253,0.15);
    --gld-hunk-border: rgba(56,139,253,0.4);
  }
}

[data-theme="dark"] {
  --gld-fg: #e6edf3;
  --gld-fg-muted: #8b949e;
  --gld-fg-subtle: #6e7681;
  --gld-canvas: #0d1117;
  --gld-canvas-subtle: #161b22;
  --gld-border: #30363d;
  --gld-border-muted: #21262d;
  --gld-neutral-muted: rgba(110,118,129,0.4);
  --gld-accent: #58a6ff;
  --gld-success: #3fb950;
  --gld-danger: #f85149;
  --gld-add-num-bg: rgba(63,185,80,0.3);
  --gld-add-line-bg: rgba(63,185,80,0.15);
  --gld-add-word-bg: rgba(63,185,80,0.4);
  --gld-del-num-bg: rgba(248,81,73,0.3);
  --gld-del-line-bg: rgba(248,81,73,0.15);
  --gld-del-word-bg: rgba(248,81,73,0.4);
  --gld-hunk-bg: rgba(56,139,253,0.15);
  --gld-hunk-border: rgba(56,139,253,0.4);
}

body {
  font-family: var(--gld-font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--gld-fg);
  background: var(--gld-canvas);
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* === Header === */
.gp-header {
  background: #24292f;
  padding: 10px 20px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 200;
  box-shadow: 0 1px 0 rgba(0,0,0,0.12);
}
[data-theme="dark"] .gp-header,
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .gp-header { background: #161b22; } }

.gp-header-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.gp-header-title svg { width: 20px; height: 20px; fill: currentColor; }
.gp-header-meta { font-size: 12px; color: #8b949e; margin-left: auto; }

/* === Toolbar === */
.gp-toolbar {
  background: var(--gld-canvas-subtle);
  border-bottom: 1px solid var(--gld-border);
  padding: 6px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: sticky;
  top: 42px;
  z-index: 199;
}

.gp-btn {
  font-family: var(--gld-font-sans);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--gld-border);
  background: var(--gld-canvas);
  color: var(--gld-fg);
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}
.gp-btn:hover { background: var(--gld-canvas-subtle); }
.gp-btn.active { background: var(--gld-accent); color: #fff; border-color: var(--gld-accent); }

.gp-stats { font-size: 12px; color: var(--gld-fg-muted); margin-left: auto; }
.gp-stats-add { color: var(--gld-success); font-weight: 600; }
.gp-stats-del { color: var(--gld-danger); font-weight: 600; }

.gp-toolbar-sep { width: 1px; height: 20px; background: var(--gld-border); margin: 0 4px; }

/* === Layout === */
.gp-layout {
  display: flex;
  min-height: calc(100vh - 82px);
}

/* === File Tree Sidebar === */
.gp-sidebar {
  width: var(--gld-sidebar-width);
  min-width: var(--gld-sidebar-width);
  border-right: 1px solid var(--gld-border);
  background: var(--gld-canvas);
  overflow-y: auto;
  position: sticky;
  top: 82px;
  height: calc(100vh - 82px);
  transition: width 0.2s, min-width 0.2s;
  z-index: 50;
}
.gp-sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; }

.gp-sidebar-header {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gld-fg);
  border-bottom: 1px solid var(--gld-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--gld-canvas);
  z-index: 1;
}

.gp-file-item {
  display: flex;
  align-items: center;
  padding: 4px 14px;
  font-size: 12px;
  font-family: var(--gld-font-mono);
  color: var(--gld-fg);
  cursor: pointer;
  border-left: 2px solid transparent;
  text-decoration: none;
  gap: 6px;
}
.gp-file-item:hover { background: var(--gld-neutral-muted); }
.gp-file-item.active { background: var(--gld-neutral-muted); border-left-color: var(--gld-accent); }

.gp-file-icon { flex-shrink: 0; width: 14px; font-size: 10px; text-align: center; }
.gp-file-icon.added { color: var(--gld-success); }
.gp-file-icon.deleted { color: var(--gld-danger); }
.gp-file-icon.modified { color: #bf8700; }
.gp-file-icon.renamed { color: var(--gld-fg-muted); }

.gp-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.gp-file-dir { color: var(--gld-fg-muted); }

.gp-file-bar {
  display: flex;
  gap: 1px;
  height: 8px;
  flex-shrink: 0;
  margin-left: auto;
}
.gp-file-bar-add { background: var(--gld-success); min-width: 2px; border-radius: 1px; }
.gp-file-bar-del { background: var(--gld-danger); min-width: 2px; border-radius: 1px; }

/* === Main Content === */
.gp-main {
  flex: 1;
  min-width: 0;
  padding: 16px 20px;
}

/* === File Diff Card === */
.gp-file {
  border: 1px solid var(--gld-border);
  border-radius: 6px;
  margin-bottom: 16px;
}

.gp-file-header {
  background: var(--gld-canvas-subtle);
  border-bottom: 1px solid var(--gld-border);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: sticky;
  top: 82px;
  z-index: 10;
  font-size: 12px;
}

.gp-file-header-name {
  font-family: var(--gld-font-mono);
  font-weight: 600;
  color: var(--gld-fg);
}

.gp-file-header-stats { margin-left: auto; display: flex; gap: 6px; font-size: 11px; }

.gp-file-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}
.gp-file-tag.changed { background: #ddf4ff; color: var(--gld-accent); }
.gp-file-tag.added { background: #dafbe1; color: var(--gld-success); }
.gp-file-tag.deleted { background: #ffebe9; color: var(--gld-danger); }
.gp-file-tag.renamed { background: #fff8c5; color: #9a6700; }

.gp-collapse-btn {
  font-family: var(--gld-font-sans);
  font-size: 11px;
  color: var(--gld-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.gp-collapse-btn:hover { text-decoration: underline; }

/* === Diff Table === */
.gp-diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--gld-font-mono);
  font-size: 12px;
  line-height: 20px;
  table-layout: fixed;
}

.gp-diff-table td { padding: 0; vertical-align: top; }

/* Line numbers */
.gp-ln {
  width: 50px;
  min-width: 50px;
  color: var(--gld-fg-subtle);
  text-align: right;
  padding: 0 8px !important;
  user-select: none;
  cursor: pointer;
  border-right: 1px solid var(--gld-border-muted);
  background: var(--gld-canvas);
}
.gp-ln:hover { color: var(--gld-accent); }

/* Code content */
.gp-code {
  padding: 0 12px !important;
  white-space: pre;
  overflow-x: auto;
  word-wrap: normal;
}

.gp-prefix {
  display: inline-block;
  width: 12px;
  color: var(--gld-fg-muted);
  user-select: none;
}

/* Line types */
.gp-add { background: var(--gld-add-line-bg); }
.gp-add .gp-ln { background: var(--gld-add-num-bg); border-color: rgba(63,185,80,0.2); }
.gp-add .gp-prefix { color: var(--gld-success); }
.gp-add:hover td { background: rgba(63,185,80,0.25) !important; }

.gp-del { background: var(--gld-del-line-bg); }
.gp-del .gp-ln { background: var(--gld-del-num-bg); border-color: rgba(248,81,73,0.2); }
.gp-del .gp-prefix { color: var(--gld-danger); }
.gp-del:hover td { background: rgba(248,81,73,0.25) !important; }

.gp-ctx { background: var(--gld-canvas); }
.gp-ctx:hover td { background: var(--gld-neutral-muted); }

/* Word-level highlights */
.gp-word-add { background: var(--gld-add-word-bg); border-radius: 2px; }
.gp-word-del { background: var(--gld-del-word-bg); border-radius: 2px; }

/* Hunk header */
.gp-hunk {
  background: var(--gld-hunk-bg);
  border-top: 1px solid var(--gld-border-muted);
  color: var(--gld-fg-muted);
}
.gp-hunk td { padding: 4px 12px !important; }
.gp-hunk-text { font-style: italic; }

/* Expand button */
.gp-expand-btn {
  font-family: var(--gld-font-sans);
  font-size: 11px;
  color: var(--gld-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
}
.gp-expand-btn:hover { text-decoration: underline; }

/* Context expand rows */
.gp-expand-row { background: var(--gld-hunk-bg); }
.gp-expand-cell { text-align: center; padding: 1px 0 !important; }
.gp-expand-btn-row {
  font-family: var(--gld-font-sans);
  font-size: 11px;
  color: var(--gld-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 12px;
  width: 100%;
}
.gp-expand-btn-row:hover { text-decoration: underline; background: var(--gld-neutral-muted); }

/* Side-by-side specific */
.gp-side-wrapper {
  width: 100%;
  overflow-x: auto;
}
.gp-side-table {
  table-layout: fixed;
  width: 100%;
}
.gp-col-ln { width: 50px; }
.gp-col-code { width: calc(50% - 50px); }
.gp-side-table td:nth-child(2) {
  border-right: 1px solid var(--gld-border-muted);
}

.gp-empty-line { background: var(--gld-canvas-subtle); }

/* === Search Overlay === */
.gp-search {
  display: none;
  position: fixed;
  top: 82px;
  right: 20px;
  background: var(--gld-canvas);
  border: 1px solid var(--gld-border);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 300;
  gap: 8px;
  align-items: center;
}
.gp-search.open { display: flex; }
.gp-search input {
  font-family: var(--gld-font-mono);
  font-size: 13px;
  border: 1px solid var(--gld-border);
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  width: 260px;
  background: var(--gld-canvas);
  color: var(--gld-fg);
}
.gp-search input:focus { border-color: var(--gld-accent); box-shadow: 0 0 0 2px rgba(9,105,218,0.3); }
.gp-search-count { font-size: 11px; color: var(--gld-fg-muted); min-width: 60px; }
.gp-search-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gld-fg-muted);
  font-size: 16px;
  padding: 0 4px;
}

/* === Keyboard hint === */
.gp-kbd-hint {
  position: fixed;
  bottom: 12px;
  right: 12px;
  background: var(--gld-canvas);
  border: 1px solid var(--gld-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--gld-fg-muted);
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  opacity: 0.7;
  transition: opacity 0.2s;
}
.gp-kbd-hint:hover { opacity: 1; }
.gp-kbd-hint kbd {
  background: var(--gld-canvas-subtle);
  border: 1px solid var(--gld-border);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: var(--gld-font-mono);
  font-size: 10px;
}

/* === Virtual scroll placeholder === */
.gp-lazy-placeholder {
  padding: 12px 14px;
  text-align: center;
  color: var(--gld-fg-muted);
  font-size: 12px;
  background: var(--gld-canvas-subtle);
  cursor: pointer;
}
.gp-lazy-placeholder:hover { background: var(--gld-neutral-muted); }

/* === Responsive === */
@media (max-width: 900px) {
  .gp-sidebar { display: none; }
  .gp-main { padding: 8px; }
  .gp-side-table { table-layout: auto; }
  .gp-side-table td:nth-child(2) { border-right: none; }
}
`;
}
