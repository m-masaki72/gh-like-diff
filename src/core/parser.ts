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
  };
}
