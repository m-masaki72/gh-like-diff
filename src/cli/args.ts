import { Command } from 'commander';

export interface CliOptions {
  style: 'side' | 'line';
  staged: boolean;
  file?: string;
  context: number;
  save?: string;
  noOpen: boolean;
  json: boolean;
  embed: boolean;
  ignore: string[];
  colorScheme: 'auto' | 'dark' | 'light';
  refs: string[];
}

export function parseArgs(argv: string[]): CliOptions {
  const program = new Command();

  program
    .name('gh-like-diff')
    .description('GitHub-quality diff views, anywhere. Offline, interactive, shareable.')
    .version('1.0.0')
    .argument('[refs...]', 'Git refs to diff (e.g., HEAD~3, main...HEAD)')
    .option('-s, --style <mode>', 'View style: "side" or "line"', 'side')
    .option('--staged', 'Show staged changes only', false)
    .option('-f, --file <path>', 'Filter to specific file')
    .option('-C, --context <lines>', 'Lines of context', '3')
    .option('--save <name>', 'Save HTML to ~/Desktop/<name>.html')
    .option('--no-open', 'Generate HTML but do not open browser')
    .option('--json', 'Output parsed diff as JSON', false)
    .option('--embed', 'Output HTML fragment only (no wrapper)', false)
    .option('--ignore <patterns...>', 'Glob patterns to ignore (e.g., "*.meta")')
    .option('--color-scheme <scheme>', 'Color scheme: auto, dark, light', 'auto')
    .parse(argv);

  const opts = program.opts();
  const refs = program.args;

  return {
    style: opts.style === 'line' ? 'line' : 'side',
    staged: opts.staged,
    file: opts.file,
    context: parseInt(opts.context, 10) || 3,
    save: opts.save,
    noOpen: opts.open === false,
    json: opts.json,
    embed: opts.embed,
    ignore: opts.ignore || [],
    colorScheme: opts.colorScheme || 'auto',
    refs,
  };
}
