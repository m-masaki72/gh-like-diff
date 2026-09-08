import { describe, it, expect, vi, beforeEach } from 'vitest';

const spawnSync = vi.fn();
const execSync = vi.fn();
const readFileSync = vi.fn();

vi.mock('node:child_process', () => ({
  spawnSync: (...a: unknown[]) => spawnSync(...a),
  execSync: (...a: unknown[]) => execSync(...a),
}));
vi.mock('node:fs', () => ({
  readFileSync: (...a: unknown[]) => readFileSync(...a),
}));

const { getGitDiff, getNewFileContents, getGitInfo, getDiffStats } = await import('../../src/cli/git');

function gitCall(index = 0): string[] {
  return spawnSync.mock.calls[index][1] as string[];
}

beforeEach(() => {
  spawnSync.mockReset();
  execSync.mockReset();
  readFileSync.mockReset();
  spawnSync.mockReturnValue({ status: 0, stdout: 'diff output', stderr: '' });
  execSync.mockReturnValue('/repo\n');
});

describe('getGitDiff', () => {
  it('builds a plain working-tree diff', () => {
    getGitDiff();
    expect(gitCall()).toEqual(['diff', '--unified=3', '--']);
  });

  it('adds --cached for staged changes', () => {
    getGitDiff({ staged: true });
    expect(gitCall()).toContain('--cached');
  });

  it('passes the requested context width', () => {
    getGitDiff({ contextLines: 12 });
    expect(gitCall()).toContain('--unified=12');
  });

  it('places refs before the -- separator', () => {
    getGitDiff({ refs: ['main...HEAD'] });
    const args = gitCall();
    expect(args.indexOf('main...HEAD')).toBeLessThan(args.indexOf('--'));
  });

  it('turns ignore globs into git pathspec exclusions after the separator', () => {
    getGitDiff({ ignore: ['*.meta', '*.asset'] });
    const args = gitCall();
    expect(args.slice(args.indexOf('--') + 1)).toEqual([':!*.meta', ':!*.asset']);
  });

  it('appends a file filter last', () => {
    getGitDiff({ fileFilter: 'src/app.ts' });
    expect(gitCall().at(-1)).toBe('src/app.ts');
  });

  it('retries against HEAD when the working tree has no changes', () => {
    // Otherwise a repo with only committed changes reports "No changes detected".
    spawnSync
      .mockReturnValueOnce({ status: 0, stdout: '   \n', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'from HEAD', stderr: '' });
    expect(getGitDiff()).toBe('from HEAD');
    expect(gitCall(1)).toContain('HEAD');
  });

  it('does not retry when refs were given explicitly', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
    getGitDiff({ refs: ['HEAD~1'] });
    expect(spawnSync).toHaveBeenCalledTimes(1);
  });

  it('reports a real git failure rather than returning empty output', () => {
    // Exit 1 is "differences found", so only other non-zero codes are errors.
    spawnSync.mockReturnValue({ status: 128, stdout: '', stderr: 'fatal: bad revision' });
    expect(() => getGitDiff({ refs: ['nope'] })).toThrow(/git diff failed/);
  });
});

describe('getGitInfo', () => {
  it('reports not-a-repo instead of throwing', () => {
    execSync.mockImplementation(() => { throw new Error('not a git repo'); });
    expect(getGitInfo()).toEqual({ repoName: '', branch: '', isRepo: false });
  });

  it('falls back to "detached" when there is no current branch', () => {
    execSync
      .mockReturnValueOnce('')            // rev-parse --is-inside-work-tree
      .mockReturnValueOnce('/tmp/myrepo\n') // rev-parse --show-toplevel
      .mockImplementationOnce(() => { throw new Error('detached'); });
    const info = getGitInfo();
    expect(info.repoName).toBe('myrepo');
    expect(info.branch).toBe('detached');
  });
});

describe('getNewFileContents', () => {
  const files = [{ newName: 'src/a.ts', oldName: 'src/a.ts' }];

  it('reads the working tree when no ref is given', () => {
    readFileSync.mockReturnValue('one\ntwo\n');
    const out = getNewFileContents(files, null);
    expect(readFileSync).toHaveBeenCalled();
    expect(out['src/a.ts']).toEqual(['one', 'two', '']);
    // git show must not be consulted when the file is readable on disk.
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('reads the index for staged diffs', () => {
    spawnSync.mockReturnValue({ status: 0, stdout: 'staged\n' });
    getNewFileContents(files, '');
    expect(spawnSync.mock.calls[0][1]).toEqual(['show', ':src/a.ts']);
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it('reads the named revision for a historical range', () => {
    // Reading the checkout here showed unrelated code with plausible line numbers.
    spawnSync.mockReturnValue({ status: 0, stdout: 'old content\n' });
    getNewFileContents(files, 'HEAD~3');
    expect(spawnSync.mock.calls[0][1]).toEqual(['show', 'HEAD~3:src/a.ts']);
  });

  it('skips deleted files and /dev/null paths', () => {
    const out = getNewFileContents([
      { newName: '/dev/null', oldName: 'gone.ts', isDeleted: true },
      { newName: '/dev/null', oldName: '/dev/null' },
    ], null);
    expect(out).toEqual({});
  });

  it('falls back to git when the file is not on disk', () => {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    spawnSync.mockReturnValue({ status: 0, stdout: 'recovered\n' });
    expect(getNewFileContents(files, null)['src/a.ts']).toEqual(['recovered', '']);
  });

  it('returns nothing when the repository root cannot be resolved', () => {
    execSync.mockImplementation(() => { throw new Error('no repo'); });
    expect(getNewFileContents(files, null)).toEqual({});
  });
});

describe('getDiffStats', () => {
  const DIFF = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 keep
-removed
+added
+also added
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1,1 +1,1 @@
-gone
+here
`;

  it('counts files, additions and deletions', () => {
    // The ---/+++ headers start with - and + and must not be counted as content.
    expect(getDiffStats(DIFF)).toEqual({ fileCount: 2, additions: 3, deletions: 2 });
  });

  it('returns zeroes for an empty diff', () => {
    expect(getDiffStats('')).toEqual({ fileCount: 0, additions: 0, deletions: 0 });
  });

  it('ignores hunk headers and context lines', () => {
    const stats = getDiffStats('diff --git a/x b/x\n@@ -1 +1 @@\n unchanged\n');
    expect(stats).toEqual({ fileCount: 1, additions: 0, deletions: 0 });
  });
});

describe('getGitDiff fallbacks', () => {
  it('keeps the file filter when retrying against HEAD', () => {
    // Otherwise the retry silently widens the diff to the whole repository.
    spawnSync
      .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
      .mockReturnValueOnce({ status: 0, stdout: 'from HEAD', stderr: '' });
    getGitDiff({ fileFilter: 'src/app.ts' });
    const retry = spawnSync.mock.calls[1][1] as string[];
    expect(retry).toContain('HEAD');
    expect(retry.slice(retry.indexOf('--') + 1)).toEqual(['src/app.ts']);
  });

  it('treats exit code 1 as "differences found", not an error', () => {
    spawnSync.mockReturnValue({ status: 1, stdout: 'a diff', stderr: '' });
    expect(getGitDiff({ refs: ['HEAD~1'] })).toBe('a diff');
  });
});

describe('getNewFileContents limits', () => {
  it('skips a file larger than the per-file cap', () => {
    readFileSync.mockReturnValue('x'.repeat(600 * 1024));
    expect(getNewFileContents([{ newName: 'big.ts', oldName: 'big.ts' }], null)).toEqual({});
  });

  it('skips a file when the git fallback also fails', () => {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    spawnSync.mockReturnValue({ status: 128, stdout: '' });
    expect(getNewFileContents([{ newName: 'gone.ts', oldName: 'gone.ts' }], null)).toEqual({});
  });
});
