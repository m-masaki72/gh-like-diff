import type { DiffFile, DiffBlock, DiffLine } from 'diff2html/lib/types';
import { LineType } from 'diff2html/lib/types';
import { detectLanguage, highlightLine } from './highlighter.js';

export interface RenderOptions {
  outputFormat: 'side-by-side' | 'line-by-line';
  embed?: boolean;
  /** Keys from the parser marking lines with no trailing newline. */
  noNewline?: Set<string>;
  /** Keys from the parser marking lines whose source ended with CRLF. */
  crlf?: Set<string>;
  /**
   * Paths whose full source is embedded in the page. Expand controls are only rendered
   * for these — a button with nothing to reveal is worse than no button at all.
   */
  expandableFiles?: Set<string>;
}

function canExpand(file: DiffFile, options: RenderOptions): boolean {
  return !!options.expandableFiles && options.expandableFiles.has(filePath(file));
}

const CRLF_BADGE =
  '<span class="gp-eol-marker" title="Line ends with CRLF" aria-label="Line ends with CRLF">CRLF</span>';

// Only shown where the two sides of a pair disagree. A file that is CRLF throughout would
// otherwise carry the marker on every row, which buries the one case that matters:
// a line-ending conversion, where both sides are byte-identical apart from the CR.
function crlfBadges(
  options: RenderOptions, fileIndex: number, del?: DiffLine | null, ins?: DiffLine | null,
): [string, string] {
  if (!options.crlf) return ['', ''];
  const left = !!del && del.oldNumber != null && options.crlf.has(`${fileIndex}:L:${del.oldNumber}`);
  const right = !!ins && ins.newNumber != null && options.crlf.has(`${fileIndex}:R:${ins.newNumber}`);
  if (left === right) return ['', ''];
  return [left ? CRLF_BADGE : '', right ? CRLF_BADGE : ''];
}

const NO_NEWLINE_BADGE =
  '<span class="gp-no-newline" title="No newline at end of file" aria-label="No newline at end of file">\\</span>';

function noNewlineBadge(
  options: RenderOptions, fileIndex: number, side: 'L' | 'R', line: number | null | undefined,
): string {
  if (line == null || !options.noNewline) return '';
  return options.noNewline.has(`${fileIndex}:${side}:${line}`) ? NO_NEWLINE_BADGE : '';
}

const DEFAULT_OPTIONS: RenderOptions = {
  outputFormat: 'side-by-side',
};

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Splits escaped HTML text into one entry per source character, so ranges can be
// expressed in source-character offsets while emitting the original escaped form.
// Entities (&amp;) and astral code points (emoji) each count as a single character.
export function splitEscapedChars(escaped: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < escaped.length) {
    if (escaped[i] === '&') {
      const semi = escaped.indexOf(';', i);
      if (semi > -1 && semi - i <= 6) {
        out.push(escaped.slice(i, semi + 1));
        i = semi + 1;
        continue;
      }
    }
    const cp = escaped.codePointAt(i)!;
    const len = cp > 0xffff ? 2 : 1;
    out.push(escaped.slice(i, i + len));
    i += len;
  }
  return out;
}

// Wraps [start, end) — in source-character offsets — with a span, without breaking
// the tag nesting of already-highlighted HTML. Each text run opens and closes its
// own span, so the result stays well-formed however the highlighter split the line.
export function wrapCharRange(html: string, start: number, end: number, cls: string): string {
  if (start >= end) return html;
  let out = '';
  let pos = 0;
  const token = /(<[^>]*>)|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(html)) !== null) {
    if (m[1]) { out += m[1]; continue; }
    const chars = splitEscapedChars(m[2]);
    const runStart = pos;
    const runEnd = pos + chars.length;
    const s = Math.max(start, runStart);
    const e = Math.min(end, runEnd);
    if (s < e) {
      out += chars.slice(0, s - runStart).join('')
        + `<span class="${cls}">` + chars.slice(s - runStart, e - runStart).join('') + '</span>'
        + chars.slice(e - runStart).join('');
    } else {
      out += m[2];
    }
    pos = runEnd;
  }
  return out;
}

function isWordChar(c: string): boolean {
  return /[\w$]/.test(c) || (c.codePointAt(0) ?? 0) > 0x7f;
}

// Character-level diff snapped outward to word boundaries, in code-point offsets.
// Offsets (never HTML) are returned so the caller can overlay them on highlighted markup.
export function computeWordDiffRange(oldStr: string, newStr: string): {
  start: number; oldEnd: number; newEnd: number;
} {
  const o = Array.from(oldStr);
  const n = Array.from(newStr);
  let start = 0;
  while (start < o.length && start < n.length && o[start] === n[start]) start++;
  let oldEnd = o.length;
  let newEnd = n.length;
  while (oldEnd > start && newEnd > start && o[oldEnd - 1] === n[newEnd - 1]) { oldEnd--; newEnd--; }

  while (start > 0 && isWordChar(o[start - 1]) && (isWordChar(o[start] ?? '') || isWordChar(n[start] ?? ''))) start--;
  while (oldEnd < o.length && newEnd < n.length && isWordChar(o[oldEnd]) && isWordChar(o[oldEnd - 1] ?? '')) { oldEnd++; newEnd++; }

  return { start, oldEnd, newEnd };
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

// git reports the missing side of an add/delete as /dev/null. Using it verbatim puts a
// bogus "dev/" folder in the sidebar and hides the real path, so always resolve to the
// side that actually exists.
export function filePath(file: DiffFile): string {
  const pick = (n?: string) => (n && n !== '/dev/null' ? n : '');
  return pick(file.isDeleted ? file.oldName : file.newName) || pick(file.oldName) || pick(file.newName) || 'unknown';
}

function fileName(file: DiffFile): string {
  if (file.isRename) {
    return `${file.oldName} → ${file.newName}`;
  }
  return filePath(file);
}

function fileShortName(file: DiffFile): string {
  const parts = filePath(file).split('/');
  return parts[parts.length - 1];
}

function fileDir(file: DiffFile): string {
  const parts = filePath(file).split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/') + '/';
}

function fileHash(file: DiffFile): string {
  const name = filePath(file);
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 8);
}

function totalChangedLines(file: DiffFile): number {
  return file.addedLines + file.deletedLines;
}

// A file card with no rendered rows reads as a rendering failure. Say why the body is
// empty instead — git legitimately produces content-free entries for binaries, pure
// renames, mode changes and empty files.
export function emptyBodyReason(file: DiffFile): string | null {
  // Checked before `blocks`: diff2html emits a synthetic "Binary file" block, which would
  // otherwise render as a lone row followed by expand controls that cannot reveal anything.
  if (file.isBinary) return 'Binary file not shown';
  if (file.isTooBig) return 'File too large to display';
  if (file.blocks.length > 0) return null;
  if (file.isRename) return 'File renamed without content changes';
  if (file.oldMode && file.newMode && String(file.oldMode) !== file.newMode) {
    return `Mode changed ${String(file.oldMode)} → ${file.newMode}`;
  }
  if (file.isNew) return 'Empty file';
  if (file.isDeleted) return 'File deleted (no content)';
  return 'No content changes';
}

function renderEmptyBody(file: DiffFile, colspan: number): string {
  const reason = emptyBodyReason(file);
  if (!reason) return '';
  return `<tr class="gp-empty-file"><td class="gp-empty-file-cell" colspan="${colspan}">${esc(reason)}</td></tr>`;
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

// Render a single expand row. Arrows follow the GitHub convention — they point toward
// the diff, and each one reveals lines contiguous with the end of the gap it starts from:
//   ▼ walks down from the top of the gap (the lines just after the preceding hunk)
//   ▲ walks up from the bottom of the gap (the lines just before the following hunk)
// Every gap offers both directions plus "show all", so no run of hidden lines is
// reachable only by repeated clicking from the far end.
type GapPosition = 'first' | 'middle' | 'last';

function renderExpandRow(
  fileIndex: number, gapIndex: number,
  oldStart: number, oldEnd: number, newStart: number, newEnd: number,
  colspan: number,
  position: GapPosition,
  view: 'side' | 'unified',
): string {
  const count = newEnd === -1 ? -1 : (newEnd - newStart + 1);
  const label = count === -1 ? '' : `${count} hidden line${count === 1 ? '' : 's'}`;
  const gapId = `${view}-${fileIndex}-${gapIndex}`;
  const data = `data-file-idx="${fileIndex}" data-gap-id="${gapId}" data-old-start="${oldStart}" data-old-end="${oldEnd}" data-new-start="${newStart}" data-new-end="${newEnd}"`;
  const upBtn = `<button class="gp-expand-arrow gp-expand-arrow-up" aria-label="Expand up toward the hunk below" title="Expand up (lines just above the next hunk)" onclick="window.__gld.expandUp(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M4.427 9.573a.25.25 0 0 0 .177.427h6.792a.25.25 0 0 0 .177-.427L8.177 6.177a.25.25 0 0 0-.354 0Z"/></svg></button>`;
  const allBtn = `<button class="gp-expand-arrow gp-expand-arrow-all" aria-label="Show all hidden lines" title="Show all hidden lines" onclick="window.__gld.expandAll(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8.177 14.323l2.896-2.896a.25.25 0 0 0-.177-.427H8.75V5h2.146a.25.25 0 0 0 .177-.427L8.177 1.677a.25.25 0 0 0-.354 0L4.927 4.573a.25.25 0 0 0 .177.427H7.25v6h-2.146a.25.25 0 0 0-.177.427l2.896 2.896a.25.25 0 0 0 .354 0z"/></svg></button>`;
  const downBtn = `<button class="gp-expand-arrow gp-expand-arrow-down" aria-label="Expand down from the hunk above" title="Expand down (lines just below the previous hunk)" onclick="window.__gld.expandDown(this)"><svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M4.427 6.427a.25.25 0 0 1 .177-.427h6.792a.25.25 0 0 1 .177.427L8.177 9.823a.25.25 0 0 1-.354 0Z"/></svg></button>`;
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

function renderUnifiedLine(
  line: DiffLine, fileIndex: number, options: RenderOptions, wordDiffHtml?: string, hlContent?: string,
): string {
  const content = wordDiffHtml ?? hlContent ?? esc(line.content.slice(1));
  const fi = `data-file-idx="${fileIndex}"`;
  const nlR = noNewlineBadge(options, fileIndex, 'R', line.newNumber);
  const nlL = noNewlineBadge(options, fileIndex, 'L', line.oldNumber);
  switch (line.type) {
    case LineType.INSERT:
      return `<tr class="gp-add"><td class="gp-ln" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-ln"></td><td class="gp-code"><span class="gp-prefix">+</span>${content}${nlR}</td></tr>`;
    case LineType.DELETE:
      return `<tr class="gp-del"><td class="gp-ln"></td><td class="gp-ln" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix">-</span>${content}${nlL}</td></tr>`;
    case LineType.CONTEXT:
      return `<tr class="gp-ctx"><td class="gp-ln" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-ln" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code"><span class="gp-prefix"> </span>${content}${nlR || nlL}</td></tr>`;
    default:
      return '';
  }
}

function hlLine(line: DiffLine, lang: string | null): string | undefined {
  if (!lang) return undefined;
  const result = highlightLine(line.content.slice(1), lang);
  return result || undefined;
}

// Syntax-highlight the line first, then overlay the word-diff range on top, so changed
// lines keep the same colouring as the context lines around them.
function renderWordDiffContent(
  line: DiffLine, lang: string | null, start: number, end: number, cls: string,
): string {
  const src = line.content.slice(1);
  const base = (lang ? highlightLine(src, lang) : '') || esc(src);
  return wrapCharRange(base, start, end, cls);
}

function renderUnifiedFile(file: DiffFile, fileIndex: number, options: RenderOptions): string {
  let rows = renderEmptyBody(file, 3);
  if (rows) return `<div class="gp-unified-wrapper"><table class="gp-diff-table"><tbody>${rows}</tbody></table></div>`;
  const expandable = canExpand(file, options);
  const blocks = file.blocks;
  let gapIdx = 0;
  const lang = detectLanguage(filePath(file));

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    let currentGapId = '';

    if (bi === 0) {
      if (expandable && block.newStartLine > 1) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 3, 'first', 'unified');
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (expandable && gapNew > 0) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 3, 'middle', 'unified');
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
        const wds: { start: number; oldEnd: number; newEnd: number }[] = [];
        for (let j = 0; j < pairCount; j++) {
          wds.push(computeWordDiffRange(dels[j].content.slice(1), ins[j].content.slice(1)));
        }
        for (let j = 0; j < dels.length; j++) {
          const word = j < pairCount
            ? renderWordDiffContent(dels[j], lang, wds[j].start, wds[j].oldEnd, 'gp-word-del')
              + crlfBadges(options, fileIndex, dels[j], ins[j])[0]
            : undefined;
          rows += renderUnifiedLine(dels[j], fileIndex, options, word, j >= pairCount ? hlLine(dels[j], lang) : undefined);
        }
        for (let j = 0; j < ins.length; j++) {
          const word = j < pairCount
            ? renderWordDiffContent(ins[j], lang, wds[j].start, wds[j].newEnd, 'gp-word-add')
              + crlfBadges(options, fileIndex, dels[j], ins[j])[1]
            : undefined;
          rows += renderUnifiedLine(ins[j], fileIndex, options, word, j >= pairCount ? hlLine(ins[j], lang) : undefined);
        }
      } else {
        rows += renderUnifiedLine(blines[li], fileIndex, options, undefined, hlLine(blines[li], lang));
        li++;
      }
    }
  }

  if (expandable && blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, gapIdx++, last.oldEnd + 1, -1, last.newEnd + 1, -1, 3, 'last', 'unified');
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

function renderSideCellWithClass(line: DiffLine | null, side: 'left' | 'right', cls: string, fileIndex: number, options: RenderOptions, wordDiffHtml?: string, hlContent?: string): string {
  if (line === null) {
    return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
  }

  const content = wordDiffHtml ?? hlContent ?? esc(line.content.slice(1));
  const ds = side === 'left' ? 'L' : 'R';
  const fi = `data-file-idx="${fileIndex}"`;
  const nl = noNewlineBadge(options, fileIndex, ds, ds === 'L' ? line.oldNumber : line.newNumber);

  if (line.type === LineType.CONTEXT) {
    const num = side === 'left' ? (line.oldNumber ?? '') : (line.newNumber ?? '');
    return `<td class="gp-ln${cls}" ${fi} data-ln="${num}" data-side="${ds}">${num}</td><td class="gp-code${cls}"><div class="gp-code-inner">${content}${nl}</div></td>`;
  }
  if (line.type === LineType.DELETE && side === 'left') {
    return `<td class="gp-ln${cls}" ${fi} data-ln="${line.oldNumber}" data-side="L">${line.oldNumber ?? ''}</td><td class="gp-code${cls}"><div class="gp-code-inner">${content}${nl}</div></td>`;
  }
  if (line.type === LineType.INSERT && side === 'right') {
    return `<td class="gp-ln${cls}" ${fi} data-ln="${line.newNumber}" data-side="R">${line.newNumber ?? ''}</td><td class="gp-code${cls}"><div class="gp-code-inner">${content}${nl}</div></td>`;
  }
  return `<td class="gp-ln"></td><td class="gp-code gp-empty-line"></td>`;
}

function renderSideFile(file: DiffFile, fileIndex: number, options: RenderOptions): string {
  let rows = renderEmptyBody(file, 4);
  if (rows) {
    return `<div class="gp-side-container"><div class="gp-side-wrapper"><table class="gp-diff-table gp-side-table"><tbody>${rows}</tbody></table></div></div>`;
  }
  const expandable = canExpand(file, options);
  const blocks = file.blocks;
  let gapIdx = 0;
  const lang = detectLanguage(filePath(file));

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    let currentGapId = '';

    // Expand pair: before first hunk or between hunks
    if (bi === 0) {
      if (expandable && block.newStartLine > 1) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, 1, block.oldStartLine - 1, 1, block.newStartLine - 1, 4, 'first', 'side');
      }
    } else {
      const prev = getBlockEndLines(blocks[bi - 1]);
      const gapNew = block.newStartLine - 1 - prev.newEnd;
      if (expandable && gapNew > 0) {
        currentGapId = `${fileIndex}-${gapIdx}`;
        rows += renderExpandRow(fileIndex, gapIdx++, prev.oldEnd + 1, block.oldStartLine - 1, prev.newEnd + 1, block.newStartLine - 1, 4, 'middle', 'side');
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
      let leftHl: string | undefined;
      let rightHl: string | undefined;
      if (pair.left && pair.right && pair.left.type === LineType.DELETE && pair.right.type === LineType.INSERT) {
        const wd = computeWordDiffRange(pair.left.content.slice(1), pair.right.content.slice(1));
        const eol = crlfBadges(options, fileIndex, pair.left, pair.right);
        leftWordHtml = renderWordDiffContent(pair.left, lang, wd.start, wd.oldEnd, 'gp-word-del') + eol[0];
        rightWordHtml = renderWordDiffContent(pair.right, lang, wd.start, wd.newEnd, 'gp-word-add') + eol[1];
      } else {
        if (pair.left) leftHl = hlLine(pair.left, lang);
        if (pair.right) rightHl = hlLine(pair.right, lang);
      }

      rows += `<tr${rowCls}>${renderSideCellWithClass(pair.left, 'left', leftLnCls, fileIndex, options, leftWordHtml, leftHl)}${renderSideCellWithClass(pair.right, 'right', rightLnCls, fileIndex, options, rightWordHtml, rightHl)}</tr>`;
    }
  }

  // Expand pair: after last hunk (to EOF, resolved by JS)
  if (expandable && blocks.length > 0) {
    const last = getBlockEndLines(blocks[blocks.length - 1]);
    rows += renderExpandRow(fileIndex, gapIdx++, last.oldEnd + 1, -1, last.newEnd + 1, -1, 4, 'last', 'side');
  }

  return `<div class="gp-side-container"><div class="gp-side-wrapper"><table class="gp-diff-table gp-side-table"><tbody>${rows}</tbody></table></div><div class="gp-side-divider" role="separator" aria-orientation="vertical" onmousedown="window.__gld.startSplitResize(event)" ontouchstart="window.__gld.startSplitResize(event)" title="Drag to resize (double-click to reset)"></div></div>`;
}

// --- File card ---

function renderFileCard(file: DiffFile, fileIndex: number, options: RenderOptions): string {
  const tag = fileTag(file);
  const name = fileName(file);
  const copyName = filePath(file);
  const fHash = fileHash(file);

  const isSide = options.outputFormat === 'side-by-side';
  const sideContent = options.embed && !isSide ? '' : renderSideFile(file, fileIndex, options);
  const unifiedContent = options.embed && isSide ? '' : renderUnifiedFile(file, fileIndex, options);

  return `
<div class="gp-file" id="gp-file-${fileIndex}" data-file-index="${fileIndex}" data-file-hash="${fHash}" data-file-path="${esc(copyName)}">
  <div class="gp-file-header">
    <button class="gp-chevron-btn" onclick="window.__gld.toggleFile(${fileIndex})" aria-label="Toggle file" aria-expanded="true" aria-controls="gp-file-body-${fileIndex}" title="Toggle file">
      <svg class="gp-chevron-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.94l3.72-3.72a.749.749 0 0 1 1.06 0Z"/></svg>
    </button>
    <span class="gp-file-tag ${tag.cls}">${tag.label}</span>
    <span class="gp-file-header-name gp-file-header-clickable" onclick="window.__gld.toggleFile(${fileIndex})">${esc(name)}</span>
    <button class="gp-copy-btn" data-clipboard="${esc(copyName)}" onclick="window.__gld.copyFileName(this)" title="Copy file path">
      <svg class="gp-copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
      <svg class="gp-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="display:none"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
    </button>
    <button class="gp-copy-btn gp-copy-new-btn" onclick="window.__gld.copyNewSide(${fileIndex})" title="Copy the new-side code of this file" aria-label="Copy new side">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5Zm5.75.56v2.19c0 .138.112.25.25.25h2.19ZM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25Z"/></svg>
    </button>
    <div class="gp-file-header-stats">
      ${file.addedLines > 0 ? `<span class="gp-stats-add">+${file.addedLines}</span>` : ''}
      ${file.deletedLines > 0 ? `<span class="gp-stats-del">-${file.deletedLines}</span>` : ''}
      ${renderDiffDots(file.addedLines, file.deletedLines)}
    </div>
    <label class="gp-reviewed-label" title="Mark as reviewed">
      <input type="checkbox" class="gp-reviewed-cb" autocomplete="off" data-file-index="${fileIndex}" onchange="window.__gld.toggleReviewed(${fileIndex})">
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

interface TreeNode {
  files: { file: DiffFile; index: number }[];
  dirs: Map<string, TreeNode>;
}

function buildTree(files: DiffFile[]): TreeNode {
  const root: TreeNode = { files: [], dirs: new Map() };
  for (let i = 0; i < files.length; i++) {
    const name = filePath(files[i]);
    const parts = name.split('/');
    const fileName = parts.pop()!;
    let node = root;
    for (const part of parts) {
      if (!node.dirs.has(part)) node.dirs.set(part, { files: [], dirs: new Map() });
      node = node.dirs.get(part)!;
    }
    node.files.push({ file: { ...files[i], newName: fileName, oldName: fileName }, index: i });
  }
  return root;
}

function renderTreeNode(node: TreeNode, maxChanges: number, depth: number, files: DiffFile[], prefix = ''): string {
  let html = '';
  const sorted = Array.from(node.dirs.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [dirName, child] of sorted) {
    const pad = depth * 12;
    const dirPath = prefix + dirName;
    html += `<div class="gp-tree-dir" data-dir="${esc(dirPath)}" style="padding-left:${pad}px">
  <button class="gp-tree-toggle" aria-expanded="true" onclick="window.__gld.toggleDir(this)">
    <svg class="gp-tree-chevron" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L10.19 8 6.22 4.03a.75.75 0 0 1 0-1.06Z"/></svg>
    <svg class="gp-tree-folder" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.5A1.75 1.75 0 0 1 16 4.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z"/></svg>
    <span class="gp-tree-dir-name">${esc(dirName)}</span>
  </button>
</div>`;
    html += `<div class="gp-tree-children">`;
    html += renderTreeNode(child, maxChanges, depth + 1, files, dirPath + '/');
    html += `</div>`;
  }

  for (const { file, index } of node.files) {
    const orig = files[index];
    const tag = fileTag(orig);
    const short = filePath(file);
    const maxBar = 5;
    const total = orig.addedLines + orig.deletedLines || 1;
    const addW = Math.max(1, Math.round((orig.addedLines / total) * maxBar));
    const delW = Math.max(1, Math.round((orig.deletedLines / total) * maxBar));
    const heat = Math.round((total / Math.max(maxChanges, 1)) * 100);
    const heatStyle = heat > 10 ? ` style="border-left-color: rgba(209,36,47,${Math.min(heat / 100, 0.7).toFixed(2)})"` : '';
    const pad = depth * 12;

    html += `
<a class="gp-file-item" href="#gp-file-${index}" data-file-index="${index}" title="${esc(filePath(orig))}" onclick="window.__gld.navFile(${index}); return false;"${heatStyle} style="padding-left:${14 + pad}px">
  <span class="gp-file-icon ${tag.cls}">${tag.label[0]}</span>
  <span class="gp-file-name">${esc(short)}</span>
  <span class="gp-file-bar">
    ${orig.addedLines > 0 ? `<span class="gp-file-bar-add" style="width:${addW}px"></span>` : ''}
    ${orig.deletedLines > 0 ? `<span class="gp-file-bar-del" style="width:${delW}px"></span>` : ''}
  </span>
</a>`;
  }
  return html;
}

export function renderSidebar(files: DiffFile[]): string {
  const maxChanges = Math.max(1, ...files.map(f => f.addedLines + f.deletedLines));
  const tree = buildTree(files);
  const items = renderTreeNode(tree, maxChanges, 0, files);

  return `
<nav class="gp-sidebar" id="gp-sidebar" role="navigation" aria-label="File tree">
  <div class="gp-sidebar-header">
    <span>Files (${files.length})</span>
    <button class="gp-collapse-btn" onclick="window.__gld.toggleSidebar()" aria-label="Hide sidebar">Hide</button>
  </div>
  ${items}
</nav>`;
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
