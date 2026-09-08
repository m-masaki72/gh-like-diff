import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

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
  const repoName = basename(repoRoot);

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

  args.push(...refs);

  args.push('--');

  for (const pattern of ignore) {
    args.push(`:!${pattern}`);
  }

  if (fileFilter) {
    args.push(fileFilter);
  }

  const result = spawnSync('git', args, { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 });

  if (result.status !== 0 && result.status !== 1) {
    const msg = (result.stderr || '').trim();
    throw new Error(`git diff failed (exit ${result.status}): ${msg}`);
  }

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

/**
 * Which revision the "+" side of the diff refers to.
 *
 * Context expansion must read that revision, not whatever happens to be checked out —
 * `gh-like-diff HEAD~5..HEAD~3` used to expand into the current working tree and present
 * unrelated code with line numbers that looked consistent.
 *
 * Returns `null` when the new side really is the working tree.
 */
export function resolveNewSideRef(options: { staged?: boolean; refs?: string[] } = {}): string | null {
  const refs = options.refs || [];
  for (const ref of refs) {
    const m = /^(.*?)(\.{2,3})(.*)$/.exec(ref);
    if (m) return m[3] ? m[3] : 'HEAD';
  }
  // A single ref (`git diff HEAD~1`) still compares against the working tree.
  if (refs.length > 0) return null;
  return options.staged ? '' : null;
}

export function getNewFileContents(
  files: { newName: string; oldName: string; isDeleted?: boolean }[],
  ref: string | null = null,
): Record<string, string[]> {
  let repoRoot: string;
  try {
    repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return {};
  }

  const readFromGit = (path: string): string | null => {
    // `git show :path` reads the index, `git show <rev>:path` a commit. When the new side
    // is the working tree there is no revision, so fall back to HEAD — `null:path` is not
    // a ref and would guarantee the lookup fails.
    const spec = ref === null ? `HEAD:${path}` : `${ref}:${path}`;
    const r = spawnSync('git', ['show', spec], { encoding: 'utf-8', maxBuffer: MAX_FILE_SIZE });
    return r.status === 0 && typeof r.stdout === 'string' ? r.stdout : null;
  };

  const result: Record<string, string[]> = {};
  for (const file of files) {
    if (file.isDeleted) continue;
    const path = file.newName || file.oldName;
    if (!path || path === '/dev/null') continue;
    try {
      let content: string | null;
      if (ref === null) {
        content = readFileSync(join(repoRoot, path), 'utf-8');
      } else {
        content = readFromGit(path);
      }
      if (content !== null && content.length <= MAX_FILE_SIZE) {
        result[path] = content.split('\n');
      }
    } catch {
      try {
        const fallback = readFromGit(path);
        if (fallback !== null && fallback.length <= MAX_FILE_SIZE) {
          result[path] = fallback.split('\n');
        }
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
