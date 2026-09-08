import { Command } from 'commander';
import type { FileConfig } from './config.js';

export interface CliOptions {
  style: 'side' | 'line';
  staged: boolean;
  file?: string;
  context: number;
  save?: string;
  noOpen: boolean;
  json: boolean;
  embed: boolean;
  singleView: boolean;
  ignore: string[];
  colorScheme: 'auto' | 'dark' | 'light';
  refs: string[];
}

/**
 * Precedence is CLI > config file > built-in default. Commander reports where each value
 * came from, which is the only way to tell "the user asked for side-by-side" apart from
 * "side-by-side is the default" — without it a config file could never win.
 */
export function parseArgs(argv: string[], fileConfig: FileConfig = {}): CliOptions {
  const program = new Command();

  program
    .name('gh-like-diff')
    .description('GitHub-quality diff views, anywhere. Offline, interactive, shareable.')
    .version('1.0.0')
    .argument('[refs...]', 'Git refs to diff (e.g., HEAD~3, main...HEAD), or "-" to read a diff from stdin')
    .option('-s, --style <mode>', 'View style: "side" or "line"', 'side')
    .option('--staged', 'Show staged changes only', false)
    .option('-f, --file <path>', 'Filter to specific file')
    .option('-C, --context <lines>', 'Lines of context', '3')
    .option('--save <name>', 'Save HTML to ~/Desktop/<name>.html')
    .option('--no-open', 'Generate HTML but do not open browser')
    .option('--json', 'Output parsed diff as JSON', false)
    .option('--embed', 'Output HTML fragment only (no wrapper)', false)
    .option('--single-view', 'Render only the selected view (about half the file size, no in-page view toggle)', false)
    .option('--ignore <patterns...>', 'Glob patterns to ignore (e.g., "*.meta")')
    .option('--color-scheme <scheme>', 'Color scheme: auto, dark, light', 'auto')
    .parse(argv);

  const opts = program.opts();
  const refs = program.args;
  const fromCli = (name: string) => program.getOptionValueSource(name) === 'cli';

  const style = fromCli('style') || fileConfig.style === undefined
    ? (opts.style === 'line' ? 'line' : 'side')
    : fileConfig.style;

  const parsedContext = parseInt(opts.context, 10);
  const context = fromCli('context') || fileConfig.context === undefined
    ? (Number.isNaN(parsedContext) ? 3 : parsedContext)
    : fileConfig.context;

  const colorScheme = fromCli('colorScheme') || fileConfig.colorScheme === undefined
    ? (opts.colorScheme || 'auto')
    : fileConfig.colorScheme;

  return {
    style,
    staged: opts.staged,
    file: opts.file,
    context,
    save: opts.save,
    // --no-open is a negated flag, so commander reports it under "open".
    noOpen: opts.open === false || (!fromCli('open') && fileConfig.noOpen === true),
    json: opts.json,
    embed: opts.embed,
    singleView: opts.singleView || (!fromCli('singleView') && fileConfig.singleView === true),
    ignore: opts.ignore || fileConfig.ignore || [],
    colorScheme,
    refs,
  };
}
