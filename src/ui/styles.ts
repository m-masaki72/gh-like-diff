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
  --gld-split-ratio: 50%;
  --gld-ln-width: 50px;
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

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .gp-highlighted td { background: rgba(187, 128, 9, 0.15) !important; }
  :root:not([data-theme="light"]) .gp-highlighted .gp-ln { background: rgba(187, 128, 9, 0.3) !important; }
}
[data-theme="dark"] .gp-highlighted td { background: rgba(187, 128, 9, 0.15) !important; }
[data-theme="dark"] .gp-highlighted .gp-ln { background: rgba(187, 128, 9, 0.3) !important; }

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
.gp-memo-btn { display: inline-flex; align-items: center; gap: 4px; }

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
.gp-sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; border-right: none; }

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

/* Directory tree */
.gp-tree-dir { padding: 0; }
.gp-tree-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 3px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--gld-font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--gld-fg);
  text-align: left;
}
.gp-tree-toggle:hover { background: var(--gld-neutral-muted); }
.gp-tree-chevron { transition: transform 0.15s ease; flex-shrink: 0; }
.gp-tree-folder { color: var(--gld-accent); flex-shrink: 0; }
.gp-tree-dir-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-tree-dir.collapsed + .gp-tree-children { display: none; }
.gp-tree-dir.collapsed .gp-tree-chevron { transform: rotate(0deg); }
.gp-tree-dir:not(.collapsed) .gp-tree-chevron { transform: rotate(90deg); }

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

/* Chevron toggle button */
.gp-chevron-btn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: var(--gld-fg-muted);
  flex-shrink: 0;
}
.gp-chevron-btn:hover { color: var(--gld-fg); }
.gp-chevron-icon { transition: transform 0.15s ease; }
.gp-file-header-clickable { cursor: pointer; }
.gp-file-header-clickable:hover { color: var(--gld-accent); text-decoration: underline; }

/* Copy file path button */
.gp-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
  color: var(--gld-fg-muted);
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  vertical-align: middle;
  flex-shrink: 0;
}
.gp-copy-btn:hover { color: var(--gld-accent); background: var(--gld-neutral-muted); border-color: var(--gld-border); }
.gp-copy-btn.copied { color: var(--gld-success); }

/* === Diff Table === */
.gp-diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--gld-font-mono);
  font-size: 12px;
  line-height: 20px;
}

.gp-diff-table td { padding: 0; vertical-align: top; }

/* Line numbers */
.gp-ln {
  width: 50px;
  min-width: 50px;
  max-width: 50px;
  white-space: nowrap;
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

/* Line highlight (click-to-select) */
.gp-highlighted td { background: rgba(255, 223, 93, 0.25) !important; }
.gp-highlighted .gp-ln { background: rgba(255, 223, 93, 0.4) !important; }

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

/* Context expand rows (GitHub-style single row with stacked arrows) */
.gp-expand-row { background: var(--gld-hunk-bg); }
.gp-expand-arrows {
  padding: 4px 0 !important;
  width: 50px;
  min-width: 50px;
  max-width: 50px;
  border-right: 1px solid var(--gld-border-muted);
  background: var(--gld-canvas-subtle);
  user-select: none;
  vertical-align: middle;
}
.gp-expand-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gld-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  width: 100%;
}
.gp-expand-arrow svg { pointer-events: none; }
.gp-expand-arrow:hover { background: var(--gld-neutral-muted); border-radius: 4px; }
.gp-expand-arrow-all { border-top: 1px solid var(--gld-border-muted); border-bottom: 1px solid var(--gld-border-muted); }
.gp-expand-row:hover { background: rgba(56, 139, 253, 0.1); }
.gp-expand-row:hover .gp-expand-arrows { background: rgba(56, 139, 253, 0.08); }
.gp-expand-row:hover .gp-expand-label { background: rgba(56, 139, 253, 0.1); }
.gp-expand-label {
  padding: 2px 12px !important;
  color: var(--gld-fg-muted);
  font-family: var(--gld-font-sans);
  font-size: 11px;
  vertical-align: middle;
}
.gp-expand-spacer {
  background: var(--gld-hunk-bg);
  border: none !important;
  padding: 0 !important;
}
.gp-side-table .gp-expand-row td:nth-child(2) {
  border-right: none;
}

/* Unified-view wrapper for horizontal overflow */
.gp-unified-wrapper {
  width: 100%;
  overflow-x: auto;
}

/* Side-by-side specific */
.gp-side-container {
  position: relative;
  width: 100%;
}
.gp-side-wrapper {
  width: 100%;
  overflow-x: auto;
}
.gp-side-table {
  width: 100%;
  table-layout: fixed;
}
.gp-side-table tr > td:nth-child(1),
.gp-side-table tr > td:nth-child(3) { width: var(--gld-ln-width); }
.gp-side-table tr > td:nth-child(2) { width: calc(var(--gld-split-ratio) - var(--gld-ln-width)); }
.gp-side-table tr > td:nth-child(4) { width: calc(100% - var(--gld-split-ratio) - var(--gld-ln-width)); }
.gp-side-table td:nth-child(2) {
  border-right: 1px solid var(--gld-border-muted);
}
.gp-side-table .gp-code { position: relative; }
.gp-code-inner {
  overflow-x: auto;
  white-space: pre;
  scrollbar-width: thin;
  scrollbar-color: var(--gld-border) transparent;
}
.gp-code-inner::-webkit-scrollbar { height: 4px; }
.gp-code-inner::-webkit-scrollbar-thumb { background: var(--gld-border); border-radius: 2px; }
.gp-code-inner::-webkit-scrollbar-track { background: transparent; }

/* Center divider — drag to resize all files in sync */
.gp-side-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--gld-split-ratio);
  width: 9px;
  margin-left: -4px;
  cursor: col-resize;
  z-index: 5;
  background: transparent;
  user-select: none;
}
.gp-side-divider::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: transparent;
  transition: background 0.15s, width 0.15s;
}
.gp-side-divider:hover::before,
body.gp-resizing .gp-side-divider::before {
  background: var(--gld-accent);
  width: 3px;
  margin-left: -1px;
}
body.gp-resizing {
  cursor: col-resize !important;
  user-select: none !important;
}
body.gp-resizing * {
  cursor: col-resize !important;
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

/* Hunk copy button */
.gp-hunk-copy-btn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 1px 4px;
  color: var(--gld-fg-muted);
  opacity: 0;
  transition: opacity 0.15s;
  vertical-align: middle;
  margin-left: 8px;
}
.gp-hunk:hover .gp-hunk-copy-btn { opacity: 1; }
.gp-hunk-copy-btn:hover { color: var(--gld-accent); }

/* Review progress */
.gp-review-progress {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--gld-fg-muted);
}
.gp-review-bar {
  width: 60px;
  height: 6px;
  background: var(--gld-neutral-muted);
  border-radius: 3px;
  overflow: hidden;
}
.gp-review-bar-fill {
  height: 100%;
  background: var(--gld-success);
  transition: width 0.3s ease;
  border-radius: 3px;
}
.gp-reviewed-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--gld-fg-muted);
  cursor: pointer;
  margin-left: auto;
  white-space: nowrap;
}
.gp-reviewed-cb { cursor: pointer; }
.gp-file-reviewed { opacity: 0.6; }
.gp-file-reviewed::after { content: ' ✓'; color: var(--gld-success); }

/* Memo badge */
.gp-memo-badge {
  font-size: 10px;
  cursor: pointer;
  position: absolute;
  right: 2px;
  top: 0;
}
.gp-ln { position: relative; }

/* Memo editor */
.gp-memo-editor {
  padding: 8px 12px !important;
  background: var(--gld-canvas-subtle);
  border-top: 1px solid var(--gld-border-muted);
  border-bottom: 1px solid var(--gld-border-muted);
}
.gp-memo-textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  font-family: var(--gld-font-sans);
  font-size: 12px;
  border: 1px solid var(--gld-border);
  border-radius: 4px;
  background: var(--gld-canvas);
  color: var(--gld-fg);
  resize: vertical;
  box-sizing: border-box;
}
.gp-memo-textarea:focus { outline: 2px solid var(--gld-accent); border-color: var(--gld-accent); }
.gp-memo-actions { display: flex; gap: 6px; margin-top: 6px; }
.gp-memo-save { background: var(--gld-success) !important; color: #fff !important; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px; }
.gp-memo-cancel { border: 1px solid var(--gld-border); border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px; background: var(--gld-canvas); color: var(--gld-fg); }
.gp-memo-delete { border: 1px solid var(--gld-danger); border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px; background: none; color: var(--gld-danger); }

/* Memo panel */
.gp-memo-panel {
  position: fixed;
  top: 0;
  right: -360px;
  width: 350px;
  height: 100vh;
  background: var(--gld-canvas);
  border-left: 1px solid var(--gld-border);
  box-shadow: -4px 0 12px rgba(0,0,0,0.1);
  z-index: 1000;
  transition: right 0.25s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.gp-memo-panel.open { right: 0; }
.gp-memo-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gld-border);
  font-weight: 600;
  font-size: 14px;
}
.gp-memo-panel-actions { display: flex; gap: 6px; }
.gp-memo-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.gp-memo-item {
  padding: 8px 12px;
  border: 1px solid var(--gld-border-muted);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 12px;
}
.gp-memo-item:hover { background: var(--gld-neutral-muted); }
.gp-memo-item-header { margin-bottom: 4px; }
.gp-memo-item-line { color: var(--gld-fg-muted); font-size: 11px; }
.gp-memo-item-text { color: var(--gld-fg-subtle); white-space: pre-wrap; }
.gp-memo-empty { text-align: center; color: var(--gld-fg-muted); padding: 24px; font-size: 12px; }

/* === File filter === */
.gp-file-filter {
  font-family: var(--gld-font-mono);
  font-size: 11px;
  border: 1px solid var(--gld-border);
  border-radius: 4px;
  padding: 3px 8px;
  width: 140px;
  background: var(--gld-canvas);
  color: var(--gld-fg);
  outline: none;
}
.gp-file-filter:focus { border-color: var(--gld-accent); box-shadow: 0 0 0 2px rgba(9,105,218,0.3); }
.gp-file-filter::placeholder { color: var(--gld-fg-subtle); }

/* === View switching === */
body[data-view="side"] .gp-view-unified { display: none; }
body[data-view="line"] .gp-view-side { display: none; }

/* === File body collapse animation === */
.gp-file-body {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s ease;
}
.gp-file-body.collapsed { grid-template-rows: 0fr; }
.gp-file-body-inner { overflow: hidden; }

/* === Diff dots (change bar) === */
.gp-diff-dots {
  display: inline-flex;
  gap: 2px;
  margin-left: 6px;
  vertical-align: middle;
}
.gp-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.gp-dot-add { background: var(--gld-success); }
.gp-dot-del { background: var(--gld-danger); }

/* === Theme button icons === */
.gp-theme-btn { display: inline-flex; align-items: center; justify-content: center; }
.gp-theme-btn .gp-icon-moon { display: none; }
[data-theme="dark"] .gp-theme-btn .gp-icon-sun { display: none; }
[data-theme="dark"] .gp-theme-btn .gp-icon-moon { display: inline; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .gp-theme-btn .gp-icon-sun { display: none; }
  :root:not([data-theme="light"]) .gp-theme-btn .gp-icon-moon { display: inline; }
}

/* === Minimap === */
.gp-minimap {
  position: fixed;
  right: 0;
  top: 82px;
  width: 48px;
  height: calc(100vh - 82px);
  z-index: 50;
  cursor: pointer;
  transition: width 0.2s, opacity 0.2s;
  opacity: 0.5;
}
.gp-minimap:hover { opacity: 0.9; }
.gp-minimap.collapsed { width: 0; opacity: 0; pointer-events: none; }
.gp-minimap-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.gp-minimap-viewport {
  position: absolute;
  left: 0;
  right: 0;
  background: var(--gld-accent);
  opacity: 0.15;
  border-radius: 2px;
  pointer-events: none;
  border: 1px solid var(--gld-accent);
  border-left: 2px solid var(--gld-accent);
}

/* === Command Palette === */
.gp-palette-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 3000;
  justify-content: center;
  padding-top: min(20vh, 120px);
}
.gp-palette-overlay.open { display: flex; }
.gp-palette {
  width: min(560px, 90vw);
  max-height: min(400px, 60vh);
  background: var(--gld-canvas);
  border: 1px solid var(--gld-border);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  align-self: flex-start;
}
.gp-palette-input {
  padding: 12px 16px;
  font-family: var(--gld-font-sans);
  font-size: 15px;
  border: none;
  border-bottom: 1px solid var(--gld-border);
  background: var(--gld-canvas);
  color: var(--gld-fg);
  outline: none;
}
.gp-palette-list {
  overflow-y: auto;
  padding: 4px 0;
}
.gp-palette-section {
  padding: 6px 16px 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--gld-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.gp-palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--gld-fg);
}
.gp-palette-item:hover, .gp-palette-item.selected {
  background: var(--gld-neutral-muted);
}
.gp-palette-key {
  background: var(--gld-canvas-subtle);
  border: 1px solid var(--gld-border);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: var(--gld-font-mono);
  font-size: 10px;
  color: var(--gld-fg-muted);
}

/* === Toast notifications === */
.gp-toast-container {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
}
.gp-toast {
  padding: 8px 16px;
  border-radius: 6px;
  font-family: var(--gld-font-sans);
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: auto;
  white-space: nowrap;
}
.gp-toast-visible { opacity: 1; transform: translateY(0); }
.gp-toast-info { background: var(--gld-canvas); color: var(--gld-fg); border: 1px solid var(--gld-border); }
.gp-toast-success { background: #1a7f37; color: #fff; }
.gp-toast-error { background: #d1242f; color: #fff; }

/* === Syntax highlighting (GitHub theme) === */
.hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-meta .hljs-keyword { color: #d73a49; }
.hljs-string, .hljs-attr, .hljs-template-tag { color: #032f62; }
.hljs-number, .hljs-literal { color: #005cc5; }
.hljs-built_in, .hljs-type { color: #6f42c1; }
.hljs-title, .hljs-title\\.class_, .hljs-title\\.function_ { color: #6f42c1; }
.hljs-params { color: var(--gld-fg); }
.hljs-variable, .hljs-template-variable { color: #e36209; }
.hljs-regexp { color: #032f62; }
.hljs-symbol, .hljs-bullet { color: #005cc5; }
.hljs-meta { color: #6a737d; }
.hljs-deletion { color: var(--gld-danger); }
.hljs-addition { color: var(--gld-success); }
.hljs-selector-class, .hljs-selector-id { color: #6f42c1; }
.hljs-attribute { color: #005cc5; }
.hljs-name, .hljs-tag { color: #22863a; }

[data-theme="dark"] .hljs-comment, [data-theme="dark"] .hljs-quote { color: #8b949e; }
[data-theme="dark"] .hljs-keyword, [data-theme="dark"] .hljs-selector-tag { color: #ff7b72; }
[data-theme="dark"] .hljs-string, [data-theme="dark"] .hljs-attr { color: #a5d6ff; }
[data-theme="dark"] .hljs-number, [data-theme="dark"] .hljs-literal { color: #79c0ff; }
[data-theme="dark"] .hljs-built_in, [data-theme="dark"] .hljs-type { color: #d2a8ff; }
[data-theme="dark"] .hljs-title, [data-theme="dark"] .hljs-title\\.class_, [data-theme="dark"] .hljs-title\\.function_ { color: #d2a8ff; }
[data-theme="dark"] .hljs-variable, [data-theme="dark"] .hljs-template-variable { color: #ffa657; }
[data-theme="dark"] .hljs-regexp, [data-theme="dark"] .hljs-template-tag { color: #a5d6ff; }
[data-theme="dark"] .hljs-name, [data-theme="dark"] .hljs-tag { color: #7ee787; }
[data-theme="dark"] .hljs-selector-class, [data-theme="dark"] .hljs-selector-id { color: #d2a8ff; }
[data-theme="dark"] .hljs-attribute { color: #79c0ff; }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .hljs-comment, :root:not([data-theme="light"]) .hljs-quote { color: #8b949e; }
  :root:not([data-theme="light"]) .hljs-keyword, :root:not([data-theme="light"]) .hljs-selector-tag { color: #ff7b72; }
  :root:not([data-theme="light"]) .hljs-string, :root:not([data-theme="light"]) .hljs-attr { color: #a5d6ff; }
  :root:not([data-theme="light"]) .hljs-number, :root:not([data-theme="light"]) .hljs-literal { color: #79c0ff; }
  :root:not([data-theme="light"]) .hljs-built_in, :root:not([data-theme="light"]) .hljs-type { color: #d2a8ff; }
  :root:not([data-theme="light"]) .hljs-title, :root:not([data-theme="light"]) .hljs-title\\.class_, :root:not([data-theme="light"]) .hljs-title\\.function_ { color: #d2a8ff; }
  :root:not([data-theme="light"]) .hljs-variable, :root:not([data-theme="light"]) .hljs-template-variable { color: #ffa657; }
  :root:not([data-theme="light"]) .hljs-regexp, :root:not([data-theme="light"]) .hljs-template-tag { color: #a5d6ff; }
  :root:not([data-theme="light"]) .hljs-name, :root:not([data-theme="light"]) .hljs-tag { color: #7ee787; }
  :root:not([data-theme="light"]) .hljs-selector-class, :root:not([data-theme="light"]) .hljs-selector-id { color: #d2a8ff; }
  :root:not([data-theme="light"]) .hljs-attribute { color: #79c0ff; }
}

/* === Responsive === */
@media (max-width: 900px) {
  .gp-sidebar { display: none; }
  .gp-minimap { display: none; }
  .gp-main { padding: 8px; }
  .gp-side-table { table-layout: auto; }
  .gp-side-table td:nth-child(2) { border-right: none; }
  .gp-file-filter { width: 100px; }
}

/* === Accessibility === */
.gp-sr-skip {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--gld-accent);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 6px 0;
}
.gp-sr-skip:focus { left: 0; }

/* === Print === */
@media print {
  .gp-header, .gp-toolbar, .gp-sidebar, .gp-search, .gp-kbd-hint,
  .gp-memo-panel, .gp-chevron-btn, .gp-copy-btn, .gp-hunk-copy-btn,
  .gp-expand-row, .gp-reviewed-label, .gp-side-divider, .gp-minimap { display: none !important; }
  .gp-layout { display: block; }
  .gp-main { padding: 0; }
  .gp-file { break-inside: avoid; border: 1px solid #ccc; margin-bottom: 8px; }
  .gp-file-header { position: static; }
  .gp-diff-table { font-size: 10px; line-height: 16px; }
  .gp-ln { padding: 0 4px !important; }
  .gp-code { padding: 0 6px !important; }
  body { background: #fff; color: #000; }
}
`;
}
