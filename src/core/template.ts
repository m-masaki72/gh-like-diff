import type { DiffFile } from 'diff2html/lib/types';
import { getStyles } from '../ui/styles.js';
import { getClientScripts } from '../ui/scripts.js';
import { renderDiff, renderSidebar } from './renderer.js';

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
  const diffContent = renderDiff(files, {
    outputFormat,
    maxLinesBeforeLazy: 500,
  });
  const css = getStyles();
  const scripts = getClientScripts();

  const themeAttr = colorScheme !== 'auto' ? ` data-theme="${colorScheme}"` : '';
  const viewIsSide = outputFormat === 'side-by-side';

  // Embed diff data as JSON for live view switching
  const embeddedData = JSON.stringify({
    files,
    options: { outputFormat },
  });

  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body data-view="${viewIsSide ? 'side' : 'line'}">

<!-- Header -->
<div class="gp-header">
  <div class="gp-header-title">
    <svg viewBox="0 0 16 16"><path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75C0 1.784.784 1 1.75 1Zm0 1.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Zm9.22 3.72a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.14-.094l-1.25-1.75a.75.75 0 0 1 1.24-.844l.63.88 1.71-1.71a.75.75 0 0 1 1.06 0Z"/></svg>
    <span>gh-like-diff</span>
  </div>
  <span class="gp-header-meta">${esc(repoName)} / ${esc(branch)} &mdash; ${esc(timestamp)}</span>
</div>

<!-- Toolbar -->
<div class="gp-toolbar">
  <button class="gp-btn${viewIsSide ? '' : ' active'}" id="gp-btn-unified" onclick="window.__gld.switchView('line')">Unified</button>
  <button class="gp-btn${viewIsSide ? ' active' : ''}" id="gp-btn-split" onclick="window.__gld.switchView('side')">Split</button>
  <div class="gp-toolbar-sep"></div>
  <button class="gp-btn gp-theme-btn" id="gp-theme-btn" onclick="window.__gld.toggleTheme()" title="Toggle theme"><svg class="gp-icon-sun" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0Zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Z"/></svg><svg class="gp-icon-moon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.22-7.832Z"/></svg></button>
  <button class="gp-btn" onclick="window.__gld.toggleSidebar()" title="Toggle sidebar"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/></svg></button>
  <span class="gp-stats">
    <strong>${stats.fileCount}</strong> file${stats.fileCount !== 1 ? 's' : ''} changed,
    <span class="gp-stats-add">+${stats.totalAdditions}</span>,
    <span class="gp-stats-del">-${stats.totalDeletions}</span>
  </span>
  <div class="gp-toolbar-sep"></div>
  <div id="gp-review-progress" class="gp-review-progress">
    <div class="gp-review-bar"><div class="gp-review-bar-fill"></div></div>
    <span class="gp-review-count">0/${stats.fileCount}</span>
  </div>
  <button class="gp-btn gp-memo-btn" onclick="window.__gld.toggleMemoPanel()" title="Review memos"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg><span id="gp-memo-count">0</span></button>
  <div class="gp-toolbar-sep"></div>
  <input type="text" id="gp-file-filter" class="gp-file-filter" placeholder="Filter files..." oninput="window.__gld.filterFiles(this.value)">
</div>

<!-- Search overlay -->
<div class="gp-search">
  <input type="text" placeholder="Search in diff... (Enter=next, Shift+Enter=prev)" />
  <span class="gp-search-count"></span>
  <button class="gp-search-close" onclick="window.__gld.closeSearch()">&times;</button>
</div>

<!-- Layout -->
<div class="gp-layout">
  ${sidebar}
  <div class="gp-main">
    ${diffContent}
  </div>
</div>

<!-- Memo panel -->
<div id="gp-memo-panel" class="gp-memo-panel">
  <div class="gp-memo-panel-header">
    <span>Review Memos</span>
    <div class="gp-memo-panel-actions">
      <button class="gp-btn" onclick="window.__gld.exportMemos()" title="Copy all memos">Export</button>
      <button class="gp-btn" onclick="window.__gld.toggleMemoPanel()">&times;</button>
    </div>
  </div>
  <div class="gp-memo-list"></div>
</div>

<!-- Keyboard hints -->
<div class="gp-kbd-hint" style="display:none">
  <kbd>j</kbd>/<kbd>k</kbd> files &nbsp;
  <kbd>n</kbd>/<kbd>p</kbd> hunks &nbsp;
  <kbd>/</kbd> search &nbsp;
  <kbd>b</kbd> sidebar &nbsp;
  <kbd>?</kbd> toggle help
</div>

<!-- Embedded diff data for live re-rendering -->
<script type="application/json" id="gp-diff-data">${safeJson(embeddedData)}</script>

<!-- Embedded file sources for context expansion -->
<script type="application/json" id="gp-file-sources">${safeJson(JSON.stringify(options.fileContents || {}))}</script>

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
