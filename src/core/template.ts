import type { DiffFile } from 'diff2html/lib/types';
import { getStyles } from '../ui/styles.js';
import { getClientScripts } from '../ui/scripts.js';
import { renderDiff, renderSidebar } from './renderer.js';
import { detectLanguage, highlightLine } from './highlighter.js';
import { icon, renderIconSprite } from './icons.js';

export interface TemplateOptions {
  title: string;
  repoName: string;
  branch: string;
  timestamp: string;
  outputFormat: 'side-by-side' | 'line-by-line';
  colorScheme: 'auto' | 'dark' | 'light';
  files: DiffFile[];
  stats: {
    totalAdditions: number;
    totalDeletions: number;
    fileCount: number;
  };
  fileContents?: Record<string, string[]>;
  noNewline?: Set<string>;
  crlf?: Set<string>;
  /**
   * Render only the requested view instead of both. Roughly halves the output, at the
   * cost of the in-page Unified/Split toggle, which has nothing to switch to.
   */
  singleView?: boolean;
  /**
   * Called with how many files kept their expand controls. Files whose source does not fit
   * the embedding budget lose them, and a silent loss of a feature is worse than a note.
   */
  onExpandSources?: (info: { included: number; total: number }) => void;
}

// Identifies *this* diff, not just the repo. Memo and review state are keyed on it, so a
// second diff of the same repository no longer restores notes onto unrelated lines.
export function computeDiffId(files: DiffFile[]): string {
  const parts: string[] = [];
  for (const f of files) {
    parts.push(f.oldName || '', f.newName || '', String(f.addedLines), String(f.deletedLines));
    for (const b of f.blocks) {
      parts.push(b.header);
      // Line content too: paths and hunk headers alone collide whenever two diffs touch
      // the same lines of the same files, which is exactly what happens across amends.
      for (const line of b.lines) parts.push(line.content);
    }
  }
  const src = parts.join('\u0001');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < src.length; i++) {
    h1 = Math.imul(h1 ^ src.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 + src.charCodeAt(i), 0x85ebca6b) ^ (h2 >>> 13);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}


/**
 * Total budget for the embedded file sources, in characters of serialised output.
 *
 * Expansion needs whole files, which is already expensive; highlighting them multiplies it
 * again (measured at roughly 7x). A repository with a handful of 5000-line files and a
 * one-line change produced a 42MB page. Files are taken smallest-first until the budget is
 * gone, so the greatest number of files keep their expand controls, and anything left out
 * simply renders without them — the same path taken when no source is available at all.
 */
export const EXPAND_SOURCE_BUDGET = 4 * 1024 * 1024;

export function buildExpandSources(
  fileContents: Record<string, string[]> | undefined,
  budget: number = EXPAND_SOURCE_BUDGET,
): Record<string, string[]> {
  const entries = Object.entries(fileContents || {});
  if (entries.length === 0) return {};

  // Ordered by raw size, which is a good proxy for the highlighted size and costs nothing
  // to compute. Highlighting happens only while the budget lasts, so files that would be
  // discarded anyway are never processed — that is where the time went, not the size.
  const byRawSize = entries
    .map(([path, lines]) => ({
      path,
      lines,
      rawCost: lines.reduce((n, l) => n + l.length + 3, path.length + 4),
    }))
    .sort((a, b) => a.rawCost - b.rawCost);

  // Highlighted server-side, exactly like the diff rows, so expanded context matches the
  // code around it. Shipping highlight.js to the client would add ~100KB to every page for
  // a feature that only ever renders lines we already hold here.
  const out: Record<string, string[]> = {};
  let used = 0;
  for (const { path, lines, rawCost } of byRawSize) {
    if (used + rawCost > budget) break;
    const lang = detectLanguage(path);
    const html = lines.map(line => (lang ? highlightLine(line, lang) : '') || esc(line));
    const cost = html.reduce((n, l) => n + l.length + 3, path.length + 4);
    if (used + cost > budget) break;
    used += cost;
    out[path] = html;
  }
  return out;
}

export function buildHtml(options: TemplateOptions): string {
  const {
    title,
    repoName,
    branch,
    timestamp,
    outputFormat,
    colorScheme,
    files,
    stats,
  } = options;

  const sidebar = renderSidebar(files);
  const singleView = !!options.singleView;
  const expandSources = buildExpandSources(options.fileContents);
  options.onExpandSources?.({
    included: Object.keys(expandSources).length,
    total: Object.keys(options.fileContents || {}).length,
  });
  const diffContent = renderDiff(files, {
    outputFormat,
    embed: singleView,
    noNewline: options.noNewline,
    crlf: options.crlf,
    expandableFiles: new Set(Object.keys(expandSources)),
  });
  const css = getStyles();
  const scripts = getClientScripts();

  const themeAttr = colorScheme !== 'auto' ? ` data-theme="${colorScheme}"` : '';
  const viewIsSide = outputFormat === 'side-by-side';
  const diffId = computeDiffId(files);

  // Widen the gutter for files with 5+ digit line numbers; the fixed 50px used to let the
  // number overlap the code in generated or vendored files.
  const maxLine = files.reduce((max, f) => f.blocks.reduce((m, b) => Math.max(m, b.newStartLine + b.lines.length), max), 0);
  const lnWidth = Math.max(50, String(Math.max(1, maxLine)).length * 9 + 18);

  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>${css}</style>
<script>
// Theme is applied before first paint so a saved choice never flashes the generated
// default. View and wrapping are not: they change layout, and applying them here would
// only move the reflow earlier. view-prefs.js restores those once the DOM exists.
(function(){try{
  var t=localStorage.getItem('gld-theme');
  if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);
  else if(t==='auto')document.documentElement.removeAttribute('data-theme');
}catch(e){}})();
</script>
</head>
<body data-view="${viewIsSide ? 'side' : 'line'}"${singleView ? ' data-single-view="1"' : ''} data-diff-id="${diffId}" style="--gld-ln-width:${lnWidth}px">
${renderIconSprite()}
<a href="#gp-file-0" class="gp-sr-skip">Skip to diff content</a>

<!-- Header -->
<header class="gp-header" role="banner">
  <div class="gp-header-title">
    ${icon('logo')}
    <span>gh-like-diff</span>
  </div>
  <span class="gp-header-meta">${esc(repoName)} / ${esc(branch)} &mdash; ${esc(timestamp)}</span>
</header>

<!-- Toolbar -->
<nav class="gp-toolbar" role="toolbar" aria-label="Diff controls">
  ${singleView
    ? `<span class="gp-view-label" title="Generated with --single-view; regenerate without it to switch views">${viewIsSide ? 'Split' : 'Unified'}</span>`
    : `<button class="gp-btn${viewIsSide ? '' : ' active'}" id="gp-btn-unified" onclick="window.__gld.switchView('line')" aria-pressed="${viewIsSide ? 'false' : 'true'}">Unified</button>
  <button class="gp-btn${viewIsSide ? ' active' : ''}" id="gp-btn-split" onclick="window.__gld.switchView('side')" aria-pressed="${viewIsSide ? 'true' : 'false'}">Split</button>`}
  <div class="gp-toolbar-sep" role="separator"></div>
  <button class="gp-btn gp-theme-btn" id="gp-theme-btn" onclick="window.__gld.toggleTheme()" title="Toggle theme" aria-label="Toggle theme">${icon('sun', { className: 'gp-icon-sun' })}${icon('moon', { className: 'gp-icon-moon' })}</button>
  <button class="gp-btn" onclick="window.__gld.toggleSidebar()" title="Toggle sidebar" aria-label="Toggle sidebar">${icon('sidebar')}</button>
  <button class="gp-btn" id="gp-wrap-btn" onclick="window.__gld.toggleWrap()" title="Toggle line wrapping (w)" aria-label="Toggle line wrapping" aria-pressed="false">${icon('wrap')}</button>
  <button class="gp-btn" id="gp-minimap-btn" onclick="window.__gld.toggleMinimap()" title="Toggle minimap (m)" aria-label="Toggle minimap" aria-pressed="true">${icon('minimap')}</button>
  <span class="gp-stats" aria-live="polite">
    <strong>${stats.fileCount}</strong> file${stats.fileCount !== 1 ? 's' : ''} changed,
    <span class="gp-stats-add">+${stats.totalAdditions}</span>,
    <span class="gp-stats-del">-${stats.totalDeletions}</span>
  </span>
  <div class="gp-toolbar-sep"></div>
  <div id="gp-review-progress" class="gp-review-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${stats.fileCount}" aria-label="Review progress">
    <div class="gp-review-bar"><div class="gp-review-bar-fill"></div></div>
    <span class="gp-review-count">0/${stats.fileCount}</span>
  </div>
  <button class="gp-btn gp-memo-btn" onclick="window.__gld.toggleMemoPanel()" title="Review memos" aria-label="Review memos">${icon('memo')}<span id="gp-memo-count">0</span></button>
  <button class="gp-btn" id="gp-unreviewed-btn" onclick="window.__gld.toggleUnreviewedOnly()" title="Show only unreviewed files" aria-label="Show only unreviewed files" aria-pressed="false">Unreviewed</button>
  <div class="gp-toolbar-sep"></div>
  <input type="text" id="gp-file-filter" class="gp-file-filter" autocomplete="off" placeholder="Filter files..." oninput="window.__gld.filterFiles()" aria-label="Filter files">
  <button class="gp-btn" onclick="window.__gld.showShortcuts()" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">?</button>
  <button class="gp-btn" onclick="window.__gld.resetState()" title="Clear memos, review state and preferences for this diff" aria-label="Reset saved state">Reset</button>
</nav>

<!-- Search overlay -->
<div class="gp-search" role="search" aria-label="Search in diff">
  <input type="text" placeholder="Search in diff... (Enter=next, Shift+Enter=prev)" aria-label="Search query" />
  <span class="gp-search-scope" role="group" aria-label="Limit search">
    <button type="button" class="gp-btn active" data-scope="all" aria-pressed="true" onclick="window.__gld.setSearchScope('all')">All</button>
    <button type="button" class="gp-btn" data-scope="add" aria-pressed="false" onclick="window.__gld.setSearchScope('add')">+ Added</button>
    <button type="button" class="gp-btn" data-scope="del" aria-pressed="false" onclick="window.__gld.setSearchScope('del')">&minus; Deleted</button>
  </span>
  <span class="gp-search-count" aria-live="polite"></span>
  <button class="gp-search-close" onclick="window.__gld.closeSearch()" aria-label="Close search">&times;</button>
</div>

<!-- Layout -->
<div class="gp-layout">
  ${sidebar}
  <main class="gp-main" role="main" aria-label="Diff content">
    <div id="gp-no-matches" class="gp-no-matches" role="status" hidden>No files match the current filter.</div>
    ${diffContent}
  </main>
</div>

<!-- Memo panel -->
<aside id="gp-memo-panel" class="gp-memo-panel" role="complementary" aria-label="Review memos">
  <div class="gp-memo-panel-header">
    <span>Review Memos</span>
    <div class="gp-memo-panel-actions">
      <button class="gp-btn" onclick="window.__gld.exportMemos()" title="Copy all memos as plain text" aria-label="Export memos">Export</button>
      <button class="gp-btn" onclick="window.__gld.exportMemos('markdown')" title="Copy all memos as Markdown" aria-label="Export memos as Markdown">MD</button>
      <button class="gp-btn" onclick="window.__gld.toggleMemoPanel()" aria-label="Close memo panel">&times;</button>
    </div>
  </div>
  <div class="gp-memo-list" role="list"></div>
</aside>

<!-- Minimap -->
<div id="gp-minimap" class="gp-minimap" role="navigation" aria-label="Diff minimap">
  <canvas class="gp-minimap-canvas" aria-hidden="true"></canvas>
  <div class="gp-minimap-viewport" aria-hidden="true"></div>
</div>

<!-- Keyboard shortcuts -->
<div class="gp-shortcuts" id="gp-shortcuts" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" hidden>
  <div class="gp-shortcuts-panel">
    <div class="gp-shortcuts-header">
      <strong>Keyboard shortcuts</strong>
      <button class="gp-btn" onclick="window.__gld.hideShortcuts()" aria-label="Close shortcuts">&times;</button>
    </div>
    <dl class="gp-shortcuts-list">
      <dt><kbd>j</kbd> / <kbd>k</kbd></dt><dd>Next / previous file</dd>
      <dt><kbd>n</kbd> / <kbd>p</kbd></dt><dd>Next / previous hunk</dd>
      <dt><kbd>u</kbd></dt><dd>Next unreviewed file</dd>
      <dt><kbd>r</kbd></dt><dd>Mark current file as viewed</dd>
      <dt><kbd>/</kbd></dt><dd>Search in diff</dd>
      <dt><kbd>&#8984;K</kbd> / <kbd>Ctrl K</kbd></dt><dd>Command palette</dd>
      <dt><kbd>b</kbd></dt><dd>Toggle sidebar</dd>
      <dt><kbd>w</kbd></dt><dd>Toggle line wrapping</dd>
      <dt><kbd>m</kbd></dt><dd>Toggle minimap</dd>
      <dt><kbd>?</kbd></dt><dd>This dialog</dd>
      <dt><kbd>Esc</kbd></dt><dd>Close search / dialog / memo editor</dd>
    </dl>
  </div>
</div>

<!-- Embedded file sources for context expansion -->
<script type="application/json" id="gp-file-sources">${safeJson(JSON.stringify(expandSources))}</script>

<!-- Client scripts -->
<script>${scripts}</script>

</body>
</html>`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeJson(json: string): string {
  return json.replace(/<\//g, '<\\/');
}
