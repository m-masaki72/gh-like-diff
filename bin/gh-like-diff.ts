import { parseArgs } from '../src/cli/args.js';
import { loadConfig, CONFIG_FILENAME } from '../src/cli/config.js';
import { getGitInfo, getGitDiff, getNewFileContents, resolveNewSideRef } from '../src/cli/git.js';
import { resolveOutputPath, writeOutput, openInBrowser, printSummary } from '../src/cli/output.js';
import { hasPipedInput, readStdin } from '../src/cli/stdin.js';
import { parse } from '../src/core/parser.js';
import { buildHtml } from '../src/core/template.js';
import { renderDiff } from '../src/core/renderer.js';

function main() {
  try {
  const { config, path: configPath, warnings } = loadConfig();
  for (const warning of warnings) {
    console.error(`\x1b[0;33m${CONFIG_FILENAME}: ${warning}\x1b[0m`);
  }
  const options = parseArgs(process.argv, config);

  // A piped diff is self-contained: it may come from another machine, a saved patch or a
  // tool that is not git at all, so neither a repository nor git itself is required.
  const piped = hasPipedInput();
  const gitInfo = piped ? { repoName: '', branch: '', isRepo: false } : getGitInfo();

  if (!piped && !gitInfo.isRepo) {
    console.error('\x1b[0;31mError: Not a git repository\x1b[0m');
    console.error('Pipe a diff instead:  git diff | gh-like-diff');
    process.exit(1);
  }

  // Get diff
  const diff = piped
    ? readStdin()
    : getGitDiff({
      staged: options.staged,
      contextLines: options.context,
      refs: options.refs,
      fileFilter: options.file,
      ignore: options.ignore,
    });

  if (!diff.trim()) {
    console.log('\x1b[0;36mNo changes detected.\x1b[0m');
    console.log('');
    console.log('Tips:');
    console.log('  gh-like-diff HEAD~1          # Show last commit');
    console.log('  gh-like-diff main...HEAD     # Show changes from main');
    console.log('  gh-like-diff --staged        # Show staged changes');
    console.log('  git diff | gh-like-diff      # Read a diff from stdin');
    process.exit(0);
  }

  // Parse
  const parsed = parse(diff);

  // JSON output mode
  if (options.json) {
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }

  // Embed-only mode
  if (options.embed) {
    const fragment = renderDiff(parsed.files, {
      outputFormat: options.style === 'side' ? 'side-by-side' : 'line-by-line',
      embed: true,
      noNewline: parsed.noNewline,
    crlf: parsed.crlf,
    });
    console.log(fragment);
    return;
  }

  // Read file contents for context expansion, from whichever revision the diff's "+" side
  // points at (working tree, index, or a commit).
  // Skipped for piped input: the diff may describe a tree this machine does not have, and
  // reading same-named files from the current directory would show unrelated code.
  const newSideRef = resolveNewSideRef({ staged: options.staged, refs: options.refs });
  const fileContents = piped ? {} : getNewFileContents(parsed.files, newSideRef);

  // Full HTML generation
  const html = buildHtml({
    title: `gh-like-diff - ${gitInfo.repoName || 'diff'}`,
    repoName: gitInfo.repoName,
    branch: gitInfo.branch,
    timestamp: new Date().toLocaleString('ja-JP'),
    outputFormat: options.style === 'side' ? 'side-by-side' : 'line-by-line',
    colorScheme: options.colorScheme,
    files: parsed.files,
    stats: parsed.stats,
    fileContents,
    noNewline: parsed.noNewline,
    crlf: parsed.crlf,
    singleView: options.singleView,
  });

  const outputPath = resolveOutputPath(options.save);
  writeOutput(outputPath, html);

  printSummary({
    repoName: gitInfo.repoName,
    branch: gitInfo.branch,
    fileCount: parsed.stats.fileCount,
    additions: parsed.stats.totalAdditions,
    deletions: parsed.stats.totalDeletions,
    style: options.style === 'side' ? 'side-by-side' : 'unified',
    configPath,
    outputPath,
  });

  if (!options.noOpen) {
    openInBrowser(outputPath);
    console.log('\x1b[0;32mOpened in browser!\x1b[0m');
  }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[0;31mError: ${msg}\x1b[0m`);
    process.exit(1);
  }
}

main();
