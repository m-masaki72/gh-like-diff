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

function computeWordDiff(oldStr: string, newStr: string): { oldHtml: string; newHtml: string } {
  let i = 0;
  while (i < oldStr.length && i < newStr.length && oldStr[i] === newStr[i]) i++;
  let oj = oldStr.length;
  let nj = newStr.length;
  while (oj > i && nj > i && oldStr[oj - 1] === newStr[nj - 1]) { oj--; nj--; }
  const prefix = esc(oldStr.substring(0, i));
  const suffix = esc(oldStr.substring(oj));
  const oldMid = oldStr.substring(i, oj);
  const newMid = newStr.substring(i, nj);
  return {
    oldHtml: prefix + (oldMid ? `<span class="gp-word-del">${esc(oldMid)}</span>` : '') + suffix,
    newHtml: prefix + (newMid ? `<span class="gp-word-add">${esc(newMid)}</span>` : '') + suffix,
  };
}

function renderDiffDots(added: number, deleted: number): string {
  const total = added + deleted;
  if (total === 0) return '';
  const dotCount = 5;
  const raw = Math.round((added / total) * dotCount);
  const addDots = added > 0 && deleted > 0 ? Math.max(1, Math.min(dotCount - 1, raw)) : raw;
  const delDots = dotCount - addDots;
  let html = '<span class="gp-diff-dots">';
  for (let d = 0; d < addDots; d++) html += '<span class="gp-dot gp-dot-add"></span>';
  for (let d = 0; d < delDots; d++) html += '<span class="gp-dot gp-dot-del"></span>';
  html += '</span>';
  return html;
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

function fileHash(file: DiffFile): string {
  const name = file.newName || file.oldName || 'unknown';
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 8);
}

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

// Render a single expand row. Arrows point outward (direction of expansion):
//   - first gap (before the first hunk): ▲ only (expand upward to reveal hidden lines above)
//   - middle gap (between hunks): ▲▼ both
//   - last gap (after the last hunk): ▼ only (expand downward to reveal hidden lines below)
type GapPosition = 'first' | 'middle' | 'last';

function renderExpandRow(
  fileIndex: number, gapIndex: number,
  oldStart: number, oldEnd: number, newStart: number, newEnd: number,
  colspan: number,
  position: GapPosition,
): string {
  const count = newEnd === -1 ? -1 : (newEnd - newStart + 1);
  const label = count === -1 ? '' : `${count} hidden lines`;
  const gapId = `${fileIndex}-${gapIndex}`;
  const data = `data-file-idx="${fileIndex}" data-gap-id="${gapId}" data-old-start="${oldStart}" data-old-end="${oldEnd}" data-new-start="${newStart}" data-new-end="${newEnd}"`;
  const upBtn = position !== 'last'
    ? `<button class="gp-expand-arrow gp-expand-arrow-up" title="Expand upward" onclick="window.__gld.expandUp(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.427 9.573a.25.25 0 0 0 .177.427h6.792a.25.25 0 0 0 .177-.427L8.177 6.177a.25.25 0 0 0-.354 0Z"/></svg></button>`
    : '';
  const allBtn = position === 'middle'
    ? `<button class="gp-expand-arrow gp-expand-arrow-all" title="Show all hidden lines" onclick="window.__gld.expandAll(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8.177 14.323l2.896-2.896a.25.25 0 0 0-.177-.427H8.75V5h2.146a.25.25 0 0 0 .177-.427L8.177 1.677a.25.25 0 0 0-.354 0L4.927 4.573a.25.25 0 0 0 .177.427H7.25v6h-2.146a.25.25 0 0 0-.177.427l2.896 2.896a.25.25 0 0 0 .354 0z"/></svg></button>`
    : '';
  const downBtn = position !== 'first'
    ? `<button class="gp-expand-arrow gp-expand-arrow-down" title="Expand downward" onclick="window.__gld.expandDown(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.427 6.427a.25.25 0 0 1 .177-.427h6.792a.25.25 0 0 1 .177.427L8.177 9.823a.25.25 0 0 1-.354 0Z"/></svg></button>`
    : '';
  // side-by-side renders 4 cells so table-layout: fixed can derive consistent column widths
  // from every row (including expand rows). The unified view keeps the 2-cell colspan layout.
  if (colspan === 4) {
    return `<tr class="gp-expand-row" ${data}>` +
      `<td class="gp-expand-arrows">${upBtn}${allBtn}${downBtn}</td>` +
      `<td class="gp-expand-label"><span class="gp-hunk-text">${label}</span></td>` +
      `<td class="gp-expand-spacer"></td>` +
      `<td class="gp-expand-spacer"></td>` +
      `</tr>`;
  }
  return `<tr class="gp-expand-row" ${data}>` +
    `<td class="gp-expand-arrows">${upBtn}${allBtn}${downBtn}</td>` +
    `<td class="gp-expand-label" colspan="${colspan - 1}"><span class="gp-hunk-text">${label}</span></td>` +
    `</tr>`;
}

function renderHunkCopyBtn(): string {
  return `<button class="gp-hunk-copy-btn" onclick="window.__gld.copyHunk(this)" title="Copy hunk code"><svg class="gp-copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg><svg class="gp-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="display:none"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg></button>`;
}

// --- Line-by-line (Unified) ---

function renderUnifiedLine(line: DiffLine, fileIndex: number, wordDiffHtml?: string): string {
  const content = wordDiffHtml ?? esc(line.content.slice(1));
  const fi = `data-file-idx="${fileIndex}"`;
  switch (line.type) {
    case LineType.INSERT:
      return `<tr class="gp-add"><td class="gp-ln" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-ln"></td><td class="gp-code"><span class="gp-prefix">+</span>${content}</td></tr>`;
    case LineType.DELETE:
      return `<tr class="gp-del"><td class="gp-ln"></td><td class="gp-ln" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix">-</span>${content}</td></tr>`;
    case LineType.CONTEXT:
      return `<tr class="gp-ctx"><td class="gp-ln" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-ln" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix"> </span>${content}</td></tr>`;
    default:
      return '';
  }
}

function renderUnifiedFile(file: DiffFile, fileIndex: number, lazy: boolean): string {
  if (lazy) {
    return `<div class="gp-lazy-placeholder" data-file-index="${fileIndex}" onclick="window.__gld.loadFile(${fileIndex})">Large file (${totalChangedLines(file)} changes) - click to load</div>`;
  }
  let rows = '';
  const blocks = file.blocks;
  let gapIdx = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    let currentGapId = '';

    if (bi === 0) {
      if (block.newStartLine > 1) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 3, 'first');
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (gapNew > 0) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 3, 'middle');
      }
    }

    const header = esc(block.header);
    const gapAttr = currentGapId ? ` data-gap-id="${currentGapId}"` : '';
    rows += `<tr class="gp-hunk"${gapAttr}><td class="gp-ln" colspan="2"></td><td class="gp-code"><span class="gp-hunk-text">${header}</span>${renderHunkCopyBtn()}</td></tr>`;
    const blines = block.lines;
    let li = 0;
    while (li < blines.length) {
      if (blines[li].type === LineType.DELETE) {
        const delStart = li;
        while (li < blines.length && blines[li].type === LineType.DELETE) li++;
        const insStart = li;
        while (li < blines.length && blines[li].type === LineType.INSERT) li++;
        const dels = blines.slice(delStart, insStart);
        const ins = blines.slice(insStart, li);
        const pairCount = Math.min(dels.length, ins.length);
        const wds: { oldHtml: string; newHtml: string }[] = [];
        for (let j = 0; j < pairCount; j++) {
          wds.push(computeWordDiff(dels[j].content.slice(1), ins[j].content.slice(1)));
        }
        for (let j = 0; j < dels.length; j++) {
          rows += renderUnifiedLine(dels[j], fileIndex, j < pairCount ? wds[j].oldHtml : undefined);
        }
        for (let j = 0; j < ins.length; j++) {
          rows += renderUnifiedLine(ins[j], fileIndex, j < pairCount ? wds[j].newHtml : undefined);
        }
      } else {
        rows += renderUnifiedLine(blines[li], fileIndex);
        li++;
      }
    }
  }

  if (blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, gapIdx++, last.oldEnd + 1, -1, last.newEnd + 1, -1, 3, 'last');
  }

  return `<div class="gp-unified-wrapper"><table class="gp-diff-table"><tbody>${rows}</tbody></table></div>`;
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

function renderSideCellWithClass(line: DiffLine | null, side: 'left' | 'right', cls: string, fileIndex: number, wordDiffHtml?: string): string {
  if (line === null) {
    return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
  }

  const content = wordDiffHtml ?? esc(line.content.slice(1));
  const ds = side === 'left' ? 'L' : 'R';
  const fi = `data-file-idx="${fileIndex}"`;

  if (line.type === LineType.CONTEXT) {
    const num = side === 'left' ? (line.oldNumber ?? '') : (line.newNumber ?? '');
    return `<td class="gp-ln${cls}" ${fi} data-ln="${num}" data-side="${ds}">${num}</td><td class="gp-code${cls}">${content}</td>`;
  }
  if (line.type === LineType.DELETE && side === 'left') {
    return `<td class="gp-ln${cls}" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code${cls}">${content}</td>`;
  }
  if (line.type === LineType.INSERT && side === 'right') {
    return `<td class="gp-ln${cls}" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-code${cls}">${content}</td>`;
  }
  return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
}

function renderSideFile(file: DiffFile, fileIndex: number, lazy: boolean): string {
  if (lazy) {
    return `<div class="gp-lazy-placeholder" data-file-index="${fileIndex}" onclick="window.__gld.loadFile(${fileIndex})">Large file (${totalChangedLines(file)} changes) - click to load</div>`;
  }

  let rows = '';
  const blocks = file.blocks;
  let gapIdx = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    let currentGapId = '';

    // Expand pair: before first hunk or between hunks
    if (bi === 0) {
      if (block.newStartLine > 1) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 4, 'first');
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (gapNew > 0) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 4, 'middle');
      }
    }

    const header = esc(block.header);
    const gapAttr = currentGapId ? ` data-gap-id="${currentGapId}"` : '';
    rows += `<tr class="gp-hunk"${gapAttr}><td class="gp-ln"></td><td class="gp-code gp-side-left-code"><span class="gp-hunk-text">${header}</span>${renderHunkCopyBtn()}</td><td class="gp-ln"></td><td class="gp-code"></td></tr>`;

    const pairs = pairLines(block);
    for (const pair of pairs) {
      const leftCls = pair.left?.type === LineType.DELETE ? 'gp-del' : (pair.left?.type === LineType.CONTEXT ? 'gp-ctx' : '');
      const rightCls = pair.right?.type === LineType.INSERT ? 'gp-add' : (pair.right?.type === LineType.CONTEXT ? 'gp-ctx' : '');
      const rowCls = leftCls && rightCls && leftCls === rightCls ? ` class="${leftCls}"` : '';

      const leftLnCls = leftCls ? ` ${leftCls}` : '';
      const rightLnCls = rightCls ? ` ${rightCls}` : '';

      let leftWordHtml: string | undefined;
      let rightWordHtml: string | undefined;
      if (pair.left && pair.right && pair.left.type === LineType.DELETE && pair.right.type === LineType.INSERT) {
        const wd = computeWordDiff(pair.left.content.slice(1), pair.right.content.slice(1));
        leftWordHtml = wd.oldHtml;
        rightWordHtml = wd.newHtml;
      }

      rows += `<tr${rowCls}>${renderSideCellWithClass(pair.left, 'left', leftLnCls, fileIndex, leftWordHtml)}${renderSideCellWithClass(pair.right, 'right', rightLnCls, fileIndex, rightWordHtml)}</tr>`;
    }
  }

  // Expand pair: after last hunk (to EOF, resolved by JS)
  if (blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, gapIdx++, last.oldEnd + 1, -1, last.newEnd + 1, -1, 4, 'last');
  }

  return `<div class="gp-side-container"><div class="gp-side-wrapper"><table class="gp-diff-table gp-side-table"><tbody>${rows}</tbody></table></div><div class="gp-side-divider" onmousedown="window.__gld.startSplitResize(event)" title="Drag to resize"></div></div>`;
}

// --- File card ---

function renderFileCard(file: DiffFile, fileIndex: number, options: RenderOptions): string {
  const tag = fileTag(file);
  const name = fileName(file);
  const copyName = file.newName || file.oldName || 'unknown';
  const lazy = totalChangedLines(file) > options.maxLinesBeforeLazy;
  const fHash = fileHash(file);

  const sideContent = renderSideFile(file, fileIndex, lazy);
  const unifiedContent = renderUnifiedFile(file, fileIndex, lazy);

  return `
<div class="gp-file" id="gp-file-${fileIndex}" data-file-index="${fileIndex}" data-file-hash="${fHash}">
  <div class="gp-file-header">
    <button class="gp-chevron-btn" onclick="window.__gld.toggleFile(${fileIndex})" aria-label="Toggle file" title="Toggle file">
      <svg class="gp-chevron-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.94l3.72-3.72a.749.749 0 0 1 1.06 0Z"/></svg>
    </button>
    <span class="gp-file-tag ${tag.cls}">${tag.label}</span>
    <span class="gp-file-header-name gp-file-header-clickable" onclick="window.__gld.toggleFile(${fileIndex})">${esc(name)}</span>
    <button class="gp-copy-btn" data-clipboard="${esc(copyName)}" onclick="window.__gld.copyFileName(this)" title="Copy file path">
      <svg class="gp-copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
      <svg class="gp-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="display:none"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
    </button>
    <div class="gp-file-header-stats">
      ${file.addedLines > 0 ? `<span class="gp-stats-add">+${file.addedLines}</span>` : ''}
      ${file.deletedLines > 0 ? `<span class="gp-stats-del">-${file.deletedLines}</span>` : ''}
      ${renderDiffDots(file.addedLines, file.deletedLines)}
    </div>
    <label class="gp-reviewed-label" title="Mark as reviewed">
      <input type="checkbox" class="gp-reviewed-cb" data-file-index="${fileIndex}" onchange="window.__gld.toggleReviewed(${fileIndex})">
      Viewed
    </label>
  </div>
  <div class="gp-file-body" id="gp-file-body-${fileIndex}">
    <div class="gp-file-body-inner">
      <div class="gp-view-side">${sideContent}</div>
      <div class="gp-view-unified">${unifiedContent}</div>
    </div>
  </div>
</div>`;
}

// --- Sidebar ---

export function renderSidebar(files: DiffFile[]): string {
  const maxChanges = Math.max(1, ...files.map(f => f.addedLines + f.deletedLines));
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
    const heat = Math.round((total / maxChanges) * 100);
    const heatStyle = heat > 10 ? ` style="border-left-color: rgba(209,36,47,${Math.min(heat / 100, 0.7).toFixed(2)})"` : '';

    items += `
<a class="gp-file-item" href="#gp-file-${i}" data-file-index="${i}" onclick="window.__gld.navFile(${i}); return false;"${heatStyle}>
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

export { fileHash };

export function renderDiff(files: DiffFile[], options?: Partial<RenderOptions>): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let html = '';
  for (let i = 0; i < files.length; i++) {
    html += renderFileCard(files[i], i, opts);
  }
  return html;
}
