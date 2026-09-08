import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(process.cwd(), 'dist', 'gh-like-diff.js');
const built = existsSync(CLI);

const DIFF = `diff --git a/src/piped.ts b/src/piped.ts
index 1111111..2222222 100644
--- a/src/piped.ts
+++ b/src/piped.ts
@@ -1,2 +1,2 @@
 const keep = 1;
-const before = 2;
+const after = 2;
`;

function runPiped(input: string, args: string[] = []) {
  // No --save: that writes to the real Desktop. The default output already lands in the
  // system temp directory.
  return spawnSync(process.execPath, [CLI, '--no-open', ...args], {
    input,
    encoding: 'utf-8',
    // Run outside any git repository to prove the piped path needs neither.
    cwd: mkdtempSync(join(tmpdir(), 'gld-cli-')),
  });
}

// These drive the built CLI, so they only run once `npm run build` has produced dist/.
describe.skipIf(!built)('CLI with piped input', () => {
  it('renders a diff read from stdin outside a git repository', () => {
    const res = runPiped(DIFF);
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain('Not a git repository');

    const generated = res.stdout.match(/Generated:\s*(\S+\.html)/)?.[1]
      ?? res.stdout.match(/(\/\S+\.html)/)?.[1];
    expect(generated, res.stdout).toBeTruthy();
    const html = readFileSync(generated!, 'utf-8');
    expect(html).toContain('src/piped.ts');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('reports no changes for an empty pipe instead of erroring', () => {
    const res = runPiped('');
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('No changes detected');
    // The hint mentions the pipe form so the mode is discoverable.
    expect(res.stdout).toContain('git diff | gh-like-diff');
  });

  it('emits JSON from a piped diff', () => {
    const res = runPiped(DIFF, ['--json']);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.stats.fileCount).toBe(1);
  });

  it('omits expand controls for a piped diff, whose sources it cannot know', () => {
    // Reading same-named files from the current directory would show unrelated code.
    const res = runPiped(DIFF, ['--embed']);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('__gld.expandUp(this)');
  });
});

describe.skipIf(!built)('CLI with a config file', () => {
  it('applies .gh-like-diffrc and says where it came from', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gld-cfg-'));
    writeFileSync(join(dir, '.gh-like-diffrc'), JSON.stringify({ style: 'line' }));
    const res = spawnSync(process.execPath, [CLI, '--no-open'], {
      input: DIFF, encoding: 'utf-8', cwd: dir,
    });
    expect(res.status).toBe(0);
    // Printed rather than applied silently, so a surprising default is traceable.
    expect(res.stdout).toContain('unified');
    expect(res.stdout).toContain('.gh-like-diffrc');
  });

  it('lets the command line override the config file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gld-cfg-'));
    writeFileSync(join(dir, '.gh-like-diffrc'), JSON.stringify({ style: 'line' }));
    const res = spawnSync(process.execPath, [CLI, '--no-open', '-s', 'side'], {
      input: DIFF, encoding: 'utf-8', cwd: dir,
    });
    expect(res.stdout).toContain('side-by-side');
  });

  it('warns about a broken config but still renders', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gld-cfg-'));
    writeFileSync(join(dir, '.gh-like-diffrc'), '{ broken');
    const res = spawnSync(process.execPath, [CLI, '--no-open'], {
      input: DIFF, encoding: 'utf-8', cwd: dir,
    });
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('could not parse');
    expect(res.stdout).toContain('Generated:');
  });
});

describe.skipIf(!built)('CLI stdin detection', () => {
  function repo() {
    const dir = mkdtempSync(join(tmpdir(), 'gld-stdin-'));
    const run = (args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf-8' });
    run(['init', '-q']);
    run(['config', 'user.email', 't@e.com']);
    run(['config', 'user.name', 'T']);
    writeFileSync(join(dir, 'a.txt'), 'line1\nline2\n');
    run(['add', '-A']); run(['commit', '-qm', 'first']);
    writeFileSync(join(dir, 'a.txt'), 'line1\nline2 changed\n');
    run(['add', '-A']); run(['commit', '-qm', 'second']);
    return dir;
  }

  it('still honours refs when stdin is /dev/null', () => {
    // CI runners, npm scripts, editor tasks and cron all give a non-TTY stdin. Treating
    // that as piped input silently dropped the refs and reported "No changes detected".
    const dir = repo();
    const res = spawnSync(process.execPath, [CLI, 'HEAD~1', '--no-open'], {
      cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('1 changed');
    expect(res.stdout).not.toContain('No changes detected');
  });

  it('still honours --staged when stdin is a pipe', () => {
    const dir = repo();
    writeFileSync(join(dir, 'a.txt'), 'line1\nline2 staged\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    const res = spawnSync(process.execPath, [CLI, '--staged', '--no-open'], {
      cwd: dir, input: DIFF, encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    // The summary shows no file names, so read the page: git's staged diff must win over
    // the pipe. A populated Repository line also proves the git path was taken at all.
    // Colour codes sit between the label and the value, so strip them before matching.
    const plain = res.stdout.replace(/\x1b\[[\d;]*m/g, '');
    expect(plain).toMatch(/Repository:\s+\S/);
    const generated = res.stdout.match(/(\/\S+\.html)/)?.[1];
    expect(generated, res.stdout).toBeTruthy();
    const html = readFileSync(generated!, 'utf-8');
    expect(html).toContain('a.txt');
    expect(html).not.toContain('src/piped.ts');
  });

  it('reads the pipe when no refs were given', () => {
    const dir = repo();
    const res = spawnSync(process.execPath, [CLI, '--no-open'], {
      cwd: dir, input: DIFF, encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('1 changed');
  });

  it('reads the pipe on request even alongside refs', () => {
    const dir = repo();
    const res = spawnSync(process.execPath, [CLI, '-', '--no-open'], {
      cwd: dir, input: DIFF, encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('1 changed');
  });
});
