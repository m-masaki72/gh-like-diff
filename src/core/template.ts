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
<body>

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
  <button class="gp-btn" id="gp-theme-btn" onclick="window.__gld.toggleTheme()" title="Toggle theme">☀/☾</button>
  <button class="gp-btn" onclick="window.__gld.toggleSidebar()">☰</button>
  <span class="gp-stats">
    <strong>${stats.fileCount}</strong> file${stats.fileCount !== 1 ? 's' : ''} changed,
    <span class="gp-stats-add">+${stats.totalAdditions}</span>,
    <span class="gp-stats-del">-${stats.totalDeletions}</span>
  </span>
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

<!-- Keyboard hints -->
<div class="gp-kbd-hint" style="display:none">
  <kbd>j</kbd>/<kbd>k</kbd> files &nbsp;
  <kbd>n</kbd>/<kbd>p</kbd> hunks &nbsp;
  <kbd>/</kbd> search &nbsp;
  <kbd>b</kbd> sidebar &nbsp;
  <kbd>?</kbd> toggle help
</div>

<!-- Embedded diff data for live re-rendering -->
<script type="application/json" id="gp-diff-data">${embeddedData}</script>

<!-- Embedded file sources for context expansion -->
<script type="application/json" id="gp-file-sources">${JSON.stringify(options.fileContents || {})}</script>

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
