import type { DiffFile, DiffBlock, DiffLine } from 'diff2html/lib/types';
import { LineType } from 'diff2html/lib/types';

export interface RenderOptions {
  outputFormat: 'side-by-side' | 'line-by-line';
  maxLinesBeforeLazy: number;
}

const DEFAULT_OPTIONS: RenderOptions = {
  outputFormat: 'side-by-side',
  maxLinesBeforeLazy: 500,
};

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileTag(file: DiffFile): { label: string; cls: string } {
  if (file.isDeleted) return { label: 'Deleted', cls: 'deleted' };
  if (file.isNew) return { label: 'Added', cls: 'added' };
  if (file.isRename) return { label: 'Renamed', cls: 'renamed' };
  return { label: 'Modified', cls: 'changed' };
}

function fileName(file: DiffFile): string {
  if (file.isRename) {
    return `${file.oldName} → ${file.newName}`;
  }
  return file.newName || file.oldName || 'unknown';
}

function fileShortName(file: DiffFile): string {
  const name = file.newName || file.oldName || 'unknown';
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function fileDir(file: DiffFile): string {
  const name = file.newName || file.oldName || '';
  const parts = name.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/') + '/';
}

// Count total changed lines for a file
function totalChangedLines(file: DiffFile): number {
  return file.addedLines + file.deletedLines;
}

// Get last line numbers in a block
function getBlockEndLines(block: DiffBlock): { oldEnd: number; newEnd: number } {
  let oldEnd = block.oldStartLine - 1;
  let newEnd = block.newStartLine - 1;
  for (const line of block.lines) {
    if (line.oldNumber != null && line.oldNumber > oldEnd) oldEnd = line.oldNumber;
    if (line.newNumber != null && line.newNumber > newEnd) newEnd = line.newNumber;
  }
  return { oldEnd, newEnd };
}

// Render an expand button row
function renderExpandRow(
  fileIndex: number, oldStart: number, oldEnd: number, newStart: number, newEnd: number,
  colspan: number,
): string {
  const count = newEnd === -1 ? -1 : (newEnd - newStart + 1);
  const label = count === -1 ? '' : `↕ Show ${count} hidden lines`;
  return `<tr class="gp-expand-row" data-file-idx="${fileIndex}" data-old-start="${oldStart}" data-old-end="${oldEnd}" data-new-start="${newStart}" data-new-end="${newEnd}"><td colspan="${colspan}" class="gp-expand-cell"><button class="gp-expand-btn-row" onclick="window.__gld.expandContext(this)">${label}</button></td></tr>`;
}

// --- Line-by-line (Unified) ---

function renderUnifiedLine(line: DiffLine): string {
  const content = esc(line.content.slice(1)); // Remove +/-/space prefix
  switch (line.type) {
    case LineType.INSERT:
      return `<tr class="gp-add"><td class="gp-ln">${line.newNumber ?? ''}</td><td class="gp-ln"></td><td class="gp-code"><span class="gp-prefix">+</span>${content}</td></tr>`;
    case LineType.DELETE:
      return `<tr class="gp-del"><td class="gp-ln"></td><td class="gp-ln">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix">-</span>${content}</td></tr>`;
    case LineType.CONTEXT:
      return `<tr class="gp-ctx"><td class="gp-ln">${line.newNumber ?? ''}</td><td class="gp-ln">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix"> </span>${content}</td></tr>`;
    default:
      return '';
  }
}

function renderUnifiedHunk(block: DiffBlock): string {
  const header = esc(block.header);
  let html = `<tr class="gp-hunk"><td class="gp-ln" colspan="2"></td><td class="gp-code"><span class="gp-hunk-text">${header}</span></td></tr>`;
  for (const line of block.lines) {
    html += renderUnifiedLine(line);
  }
  return html;
}

function renderUnifiedFile(file: DiffFile, fileIndex: number, lazy: boolean): string {
  if (lazy) {
    return `<div class="gp-lazy-placeholder" data-file-index="${fileIndex}" onclick="window.__gld.loadFile(${fileIndex})">Large file (${totalChangedLines(file)} changes) - click to load</div>`;
  }
  let rows = '';
  const blocks = file.blocks;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    if (bi === 0) {
      if (block.newStartLine > 1) {
        rows += renderExpandRow(fileIndex, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 3);
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (gapNew > 0) {
        rows += renderExpandRow(fileIndex, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 3);
      }
    }

    rows += renderUnifiedHunk(block);
  }

  if (blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, last.oldEnd + 1, -1, last.newEnd + 1, -1, 3);
  }

  return `<table class="gp-diff-table"><tbody>${rows}</tbody></table>`;
}

// --- Side-by-side ---

interface SidePair {
  left: DiffLine | null;
  right: DiffLine | null;
}

function pairLines(block: DiffBlock): SidePair[] {
  const pairs: SidePair[] = [];
  const deletes: DiffLine[] = [];
  const inserts: DiffLine[] = [];

  function flushPending() {
    const maxLen = Math.max(deletes.length, inserts.length);
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        left: deletes[i] || null,
        right: inserts[i] || null,
      });
    }
    deletes.length = 0;
    inserts.length = 0;
  }

  for (const line of block.lines) {
    if (line.type === LineType.DELETE) {
      deletes.push(line);
    } else if (line.type === LineType.INSERT) {
      inserts.push(line);
    } else {
      flushPending();
      pairs.push({ left: line, right: line });
    }
  }
  flushPending();
  return pairs;
}

function renderSideCellWithClass(line: DiffLine | null, side: 'left' | 'right', cls: string): string {
  if (line === null) {
    return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
  }

  const content = esc(line.content.slice(1));

  if (line.type === LineType.CONTEXT) {
    const num = side === 'left' ? (line.oldNumber ?? '') : (line.newNumber ?? '');
    return `<td class="gp-ln${cls}">${num}</td><td class="gp-code${cls}">${content}</td>`;
  }
  if (line.type === LineType.DELETE && side === 'left') {
    return `<td class="gp-ln${cls}">${line.oldNumber ?? ''}</td><td class="gp-code${cls}">${content}</td>`;
  }
  if (line.type === LineType.INSERT && side === 'right') {
    return `<td class="gp-ln${cls}">${line.newNumber ?? ''}</td><td class="gp-code${cls}">${content}</td>`;
  }
  return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
}

function renderSideCell(line: DiffLine | null, side: 'left' | 'right'): string {
  if (line === null) {
    return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
  }

  const content = esc(line.content.slice(1));

  if (line.type === LineType.CONTEXT) {
    const num = side === 'left' ? (line.oldNumber ?? '') : (line.newNumber ?? '');
    return `<td class="gp-ln">${num}</td><td class="gp-code">${content}</td>`;
  }
  if (line.type === LineType.DELETE && side === 'left') {
    return `<td class="gp-ln">${line.oldNumber ?? ''}</td><td class="gp-code">${content}</td>`;
  }
  if (line.type === LineType.INSERT && side === 'right') {
    return `<td class="gp-ln">${line.newNumber ?? ''}</td><td class="gp-code">${content}</td>`;
  }
  return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
}

function renderSideHunk(block: DiffBlock): string {
  const header = esc(block.header);
  let leftHtml = `<tr class="gp-hunk"><td class="gp-ln"></td><td class="gp-code"><span class="gp-hunk-text">${header}</span></td></tr>`;
  let rightHtml = `<tr class="gp-hunk"><td class="gp-ln"></td><td class="gp-code"></td></tr>`;

  const pairs = pairLines(block);
  for (const pair of pairs) {
    const leftCls = pair.left?.type === LineType.DELETE ? ' class="gp-del"' : (pair.left?.type === LineType.CONTEXT ? ' class="gp-ctx"' : '');
    const rightCls = pair.right?.type === LineType.INSERT ? ' class="gp-add"' : (pair.right?.type === LineType.CONTEXT ? ' class="gp-ctx"' : '');

    leftHtml += `<tr${leftCls}>${renderSideCell(pair.left, 'left')}</tr>`;
    rightHtml += `<tr${rightCls}>${renderSideCell(pair.right, 'right')}</tr>`;
  }

  return { leftHtml, rightHtml } as any; // will destructure
}

function renderSideFile(file: DiffFile, fileIndex: number, lazy: boolean): string {
  if (lazy) {
    return `<div class="gp-lazy-placeholder" data-file-index="${fileIndex}" onclick="window.__gld.loadFile(${fileIndex})">Large file (${totalChangedLines(file)} changes) - click to load</div>`;
  }

  let rows = '';
  const blocks = file.blocks;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    // Expand row: before first hunk or between hunks
    if (bi === 0) {
      if (block.newStartLine > 1) {
        rows += renderExpandRow(fileIndex, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 4);
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (gapNew > 0) {
        rows += renderExpandRow(fileIndex, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 4);
      }
    }

    const header = esc(block.header);
    rows += `<tr class="gp-hunk"><td class="gp-ln"></td><td class="gp-code gp-side-left-code"><span class="gp-hunk-text">${header}</span></td><td class="gp-ln"></td><td class="gp-code"></td></tr>`;

    const pairs = pairLines(block);
    for (const pair of pairs) {
      const leftCls = pair.left?.type === LineType.DELETE ? 'gp-del' : (pair.left?.type === LineType.CONTEXT ? 'gp-ctx' : '');
      const rightCls = pair.right?.type === LineType.INSERT ? 'gp-add' : (pair.right?.type === LineType.CONTEXT ? 'gp-ctx' : '');
      const rowCls = leftCls && rightCls && leftCls === rightCls ? ` class="${leftCls}"` : '';

      const leftLnCls = leftCls ? ` ${leftCls}` : '';
      const rightLnCls = rightCls ? ` ${rightCls}` : '';

      rows += `<tr${rowCls}>${renderSideCellWithClass(pair.left, 'left', leftLnCls)}${renderSideCellWithClass(pair.right, 'right', rightLnCls)}</tr>`;
    }
  }

  // Expand row: after last hunk (to EOF, resolved by JS)
  if (blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, last.oldEnd + 1, -1, last.newEnd + 1, -1, 4);
  }

  const colgroup = '<colgroup><col class="gp-col-ln"><col class="gp-col-code"><col class="gp-col-ln"><col class="gp-col-code"></colgroup>';
  return `<div class="gp-side-wrapper"><table class="gp-diff-table gp-side-table">${colgroup}<tbody>${rows}</tbody></table></div>`;
}

// --- File card ---

function renderFileCard(file: DiffFile, fileIndex: number, options: RenderOptions): string {
  const tag = fileTag(file);
  const name = fileName(file);
  const lazy = totalChangedLines(file) > options.maxLinesBeforeLazy;

  const diffContent = options.outputFormat === 'side-by-side'
    ? renderSideFile(file, fileIndex, lazy)
    : renderUnifiedFile(file, fileIndex, lazy);

  return `
<div class="gp-file" id="gp-file-${fileIndex}" data-file-index="${fileIndex}">
  <div class="gp-file-header">
    <span class="gp-file-tag ${tag.cls}">${tag.label}</span>
    <span class="gp-file-header-name">${esc(name)}</span>
    <div class="gp-file-header-stats">
      ${file.addedLines > 0 ? `<span class="gp-stats-add">+${file.addedLines}</span>` : ''}
      ${file.deletedLines > 0 ? `<span class="gp-stats-del">-${file.deletedLines}</span>` : ''}
    </div>
    <button class="gp-collapse-btn" onclick="window.__gld.toggleFile(${fileIndex})">Hide</button>
  </div>
  <div class="gp-file-body" id="gp-file-body-${fileIndex}">
    ${diffContent}
  </div>
</div>`;
}

// --- Sidebar ---

export function renderSidebar(files: DiffFile[]): string {
  let items = '';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const tag = fileTag(file);
    const dir = fileDir(file);
    const short = fileShortName(file);
    const maxBar = 5;
    const total = file.addedLines + file.deletedLines || 1;
    const addW = Math.max(1, Math.round((file.addedLines / total) * maxBar));
    const delW = Math.max(1, Math.round((file.deletedLines / total) * maxBar));

    items += `
<a class="gp-file-item" href="#gp-file-${i}" data-file-index="${i}" onclick="window.__gld.navFile(${i}); return false;">
  <span class="gp-file-icon ${tag.cls}">${tag.label[0]}</span>
  <span class="gp-file-name"><span class="gp-file-dir">${esc(dir)}</span>${esc(short)}</span>
  <span class="gp-file-bar">
    ${file.addedLines > 0 ? `<span class="gp-file-bar-add" style="width:${addW}px"></span>` : ''}
    ${file.deletedLines > 0 ? `<span class="gp-file-bar-del" style="width:${delW}px"></span>` : ''}
  </span>
</a>`;
  }

  return `
<div class="gp-sidebar" id="gp-sidebar">
  <div class="gp-sidebar-header">
    <span>Files (${files.length})</span>
    <button class="gp-collapse-btn" onclick="window.__gld.toggleSidebar()">Hide</button>
  </div>
  ${items}
</div>`;
}

// --- Main export ---

export function renderDiff(files: DiffFile[], options?: Partial<RenderOptions>): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let html = '';
  for (let i = 0; i < files.length; i++) {
    html += renderFileCard(files[i], i, opts);
  }
  return html;
}
