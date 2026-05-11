import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir, tmpdir, platform } from 'node:os';

const OUTPUT_DIR = join(tmpdir(), 'gh-like-diff');

export function resolveOutputPath(saveName?: string): string {
  if (saveName) {
    return join(homedir(), 'Desktop', `${saveName}.html`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return join(OUTPUT_DIR, `diff_${timestamp}.html`);
}

export function writeOutput(filePath: string, content: string): void {
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}

export function openInBrowser(filePath: string): void {
  const os = platform();
  try {
    if (os === 'darwin') {
      execSync(`open "${filePath}"`);
    } else if (os === 'linux') {
      execSync(`xdg-open "${filePath}"`);
    } else if (os === 'win32') {
      execSync(`start "" "${filePath}"`);
    }
  } catch {
    // Silently fail if browser can't be opened
  }
}

// Terminal colors
const c = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

export function printSummary(info: {
  repoName: string;
  branch: string;
  fileCount: number;
  additions: number;
  deletions: number;
  style: string;
  outputPath: string;
}): void {
  console.log(`${c.bold}${c.blue}gh-like-diff${c.reset}`);
  console.log(`  ${c.cyan}Repository:${c.reset} ${info.repoName}`);
  console.log(`  ${c.cyan}Branch:${c.reset}     ${info.branch}`);
  console.log(`  ${c.cyan}Files:${c.reset}      ${info.fileCount} changed`);
  console.log(`  ${c.green}+${info.additions}${c.reset} additions, ${c.red}-${info.deletions}${c.reset} deletions`);
  console.log(`  ${c.cyan}View:${c.reset}       ${info.style}`);
  console.log('');
  console.log(`${c.green}Generated:${c.reset} ${info.outputPath}`);
}
