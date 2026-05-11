import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GitInfo {
  repoName: string;
  branch: string;
  isRepo: boolean;
}

export interface DiffOptions {
  staged?: boolean;
  contextLines?: number;
  refs?: string[];
  fileFilter?: string;
  ignore?: string[];
}

export function getGitInfo(): GitInfo {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
  } catch {
    return { repoName: '', branch: '', isRepo: false };
  }

  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  const repoName = repoRoot.split('/').pop() || '';

  let branch: string;
  try {
    branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch {
    branch = 'detached';
  }

  return { repoName, branch, isRepo: true };
}

export function getGitDiff(options: DiffOptions = {}): string {
  const { staged, contextLines = 3, refs = [], fileFilter, ignore = [] } = options;

  const args = ['diff', `--unified=${contextLines}`];

  if (staged) {
    args.push('--cached');
  }

  for (const pattern of ignore) {
    args.push(`:(exclude)${pattern}`);
  }

  args.push(...refs);

  if (fileFilter) {
    args.push('--', fileFilter);
  }

  const result = spawnSync('git', args, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 });
  let output = result.stdout || '';

  // If no diff found and no explicit refs, try HEAD
  if (output.trim() === '' && refs.length === 0 && !staged) {
    const headArgs = ['diff', `--unified=${contextLines}`, 'HEAD'];
    if (fileFilter) {
      headArgs.push('--', fileFilter);
    }
    const headResult = spawnSync('git', headArgs, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 });
    output = headResult.stdout || '';
  }

  return output;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  fileCount: number;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB limit per file

export function getNewFileContents(
  files: { newName: string; oldName: string; isDeleted?: boolean }[],
): Record<string, string[]> {
  let repoRoot: string;
  try {
    repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return {};
  }

  const result: Record<string, string[]> = {};
  for (const file of files) {
    if (file.isDeleted) continue;
    const path = file.newName || file.oldName;
    if (!path) continue;
    try {
      const fullPath = join(repoRoot, path);
      const content = readFileSync(fullPath, 'utf-8');
      if (content.length <= MAX_FILE_SIZE) {
        result[path] = content.split('\n');
      }
    } catch {
      try {
        const content = execSync(`git show HEAD:${path}`, { encoding: 'utf-8', maxBuffer: MAX_FILE_SIZE });
        result[path] = content.split('\n');
      } catch {
        // Skip
      }
    }
  }
  return result;
}

export function getDiffStats(diff: string): DiffStats {
  const lines = diff.split('\n');
  let additions = 0;
  let deletions = 0;
  let fileCount = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      fileCount++;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return { additions, deletions, fileCount };
}
