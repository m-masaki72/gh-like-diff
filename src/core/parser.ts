import { parse as diff2htmlParse } from 'diff2html';
import type { DiffFile } from 'diff2html/lib/types';

export type { DiffFile };

export interface ParsedDiff {
  files: DiffFile[];
  stats: {
    totalAdditions: number;
    totalDeletions: number;
    fileCount: number;
  };
  /** Keys of lines that end without a trailing newline: `${fileIndex}:${'L'|'R'}:${lineNumber}` */
  noNewline: Set<string>;
  /** Keys of lines whose source ended with CRLF, in the same format as `noNewline`. */
  crlf: Set<string>;
}

// diff2html discards the "\ No newline at end of file" marker, which makes a
// newline-only change render as two identical rows. Recover it from the raw diff so the
// renderer can mark the affected line.
export function scanNoNewline(diffString: string): Set<string> {
  const out = new Set<string>();
  let fileIndex = -1;
  let oldLn = 0;
  let newLn = 0;
  let lastSide: 'L' | 'R' | 'B' | null = null;
  let lastOld = 0;
  let lastNew = 0;

  for (const raw of diffString.split('\n')) {
    if (raw.startsWith('diff --git')) {
      fileIndex++;
      oldLn = newLn = 0;
      lastSide = null;
      continue;
    }
    const hunk = /^@@+ (?:-(\d+)(?:,\d+)? )+\+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      oldLn = parseInt(hunk[1], 10);
      newLn = parseInt(hunk[2], 10);
      lastSide = null;
      continue;
    }
    if (raw.startsWith('\\')) {
      if (fileIndex < 0) continue;
      if (lastSide === 'L' || lastSide === 'B') out.add(`${fileIndex}:L:${lastOld}`);
      if (lastSide === 'R' || lastSide === 'B') out.add(`${fileIndex}:R:${lastNew}`);
      continue;
    }
    // Skip the ---/+++ file headers, which precede the first hunk marker.
    if (fileIndex < 0 || (oldLn === 0 && newLn === 0)) continue;
    if (raw.startsWith('-')) { lastSide = 'L'; lastOld = oldLn++; }
    else if (raw.startsWith('+')) { lastSide = 'R'; lastNew = newLn++; }
    else if (raw.startsWith(' ')) { lastSide = 'B'; lastOld = oldLn++; lastNew = newLn++; }
  }
  return out;
}

// diff2html strips carriage returns before the renderer ever sees a line, so a
// CRLF -> LF conversion renders as pairs of visually identical rows. Recover which lines
// carried a CR from the raw diff.
export function scanCarriageReturns(diffString: string): Set<string> {
  const out = new Set<string>();
  let fileIndex = -1;
  let oldLn = 0;
  let newLn = 0;

  for (const raw of diffString.split('\n')) {
    if (raw.startsWith('diff --git')) {
      fileIndex++;
      oldLn = newLn = 0;
      continue;
    }
    const hunk = /^@@+ (?:-(\d+)(?:,\d+)? )+\+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      oldLn = parseInt(hunk[1], 10);
      newLn = parseInt(hunk[2], 10);
      continue;
    }
    if (fileIndex < 0 || (oldLn === 0 && newLn === 0) || raw.startsWith('\\')) continue;

    const cr = raw.endsWith('\r');
    if (raw.startsWith('-')) { if (cr) out.add(`${fileIndex}:L:${oldLn}`); oldLn++; }
    else if (raw.startsWith('+')) { if (cr) out.add(`${fileIndex}:R:${newLn}`); newLn++; }
    else if (raw.startsWith(' ')) {
      if (cr) { out.add(`${fileIndex}:L:${oldLn}`); out.add(`${fileIndex}:R:${newLn}`); }
      oldLn++; newLn++;
    }
  }
  return out;
}

export function parse(diffString: string): ParsedDiff {
  const files = diff2htmlParse(diffString, {
    diffStyle: 'word',
    matching: 'lines',
    matchWordsThreshold: 0.25,
  });

  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    totalAdditions += file.addedLines;
    totalDeletions += file.deletedLines;
  }

  return {
    files,
    stats: {
      totalAdditions,
      totalDeletions,
      fileCount: files.length,
    },
    noNewline: scanNoNewline(diffString),
    crlf: scanCarriageReturns(diffString),
  };
}
