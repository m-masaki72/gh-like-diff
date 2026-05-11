import { parse as parseDiff } from './core/parser.js';
import { renderDiff } from './core/renderer.js';
import { buildHtml } from './core/template.js';
import type { DiffFile } from 'diff2html/lib/types';
import type { ParsedDiff } from './core/parser.js';

export type { DiffFile, ParsedDiff };

export interface GhLikeDiffOptions {
  outputFormat?: 'side-by-side' | 'line-by-line';
  colorScheme?: 'auto' | 'dark' | 'light';
  title?: string;
  repoName?: string;
  branch?: string;
  ignore?: string[];
}

/**
 * Parse a unified diff string into structured data.
 */
export function parse(diffString: string): ParsedDiff {
  return parseDiff(diffString);
}

/**
 * Generate a complete, self-contained HTML page from a diff string.
 */
export function generate(diffString: string, options: GhLikeDiffOptions = {}): string {
  const parsed = parseDiff(diffString);

  return buildHtml({
    title: options.title || `gh-like-diff - ${options.repoName || 'diff'}`,
    repoName: options.repoName || '',
    branch: options.branch || '',
    timestamp: new Date().toLocaleString('ja-JP'),
    outputFormat: options.outputFormat || 'side-by-side',
    colorScheme: options.colorScheme || 'auto',
    files: parsed.files,
    stats: parsed.stats,
  });
}

/**
 * Render an HTML fragment (diff content only, no wrapper) from a diff string.
 */
export function render(diffString: string, options: GhLikeDiffOptions = {}): string {
  const parsed = parseDiff(diffString);
  return renderDiff(parsed.files, {
    outputFormat: options.outputFormat || 'side-by-side',
    maxLinesBeforeLazy: 500,
  });
}
