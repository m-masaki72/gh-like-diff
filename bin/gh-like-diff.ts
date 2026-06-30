import { parseArgs } from '../src/cli/args.js';
import { getGitInfo, getGitDiff, getNewFileContents } from '../src/cli/git.js';
import { resolveOutputPath, writeOutput, openInBrowser, printSummary } from '../src/cli/output.js';
import { parse } from '../src/core/parser.js';
import { buildHtml } from '../src/core/template.js';
import { renderDiff } from '../src/core/renderer.js';

function main() {
  try {
  const options = parseArgs(process.argv);
  const gitInfo = getGitInfo();

  if (!gitInfo.isRepo) {
    console.error('\x1b[0;31mError: Not a git repository\x1b[0m');
    process.exit(1);
  }

  // Get diff
  const diff = getGitDiff({
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
    });
    console.log(fragment);
    return;
  }

  // Read file contents for context expansion
  const fileContents = getNewFileContents(parsed.files);

  // Full HTML generation
  const html = buildHtml({
    title: `gh-like-diff - ${gitInfo.repoName}`,
    repoName: gitInfo.repoName,
    branch: gitInfo.branch,
    timestamp: new Date().toLocaleString('ja-JP'),
    outputFormat: options.style === 'side' ? 'side-by-side' : 'line-by-line',
    colorScheme: options.colorScheme,
    files: parsed.files,
    stats: parsed.stats,
    fileContents,
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
