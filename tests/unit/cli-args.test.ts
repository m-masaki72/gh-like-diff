import { describe, it, expect } from 'vitest';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, rmSync } from 'node:fs';
import { parseArgs } from '../../src/cli/args';
import { resolveOutputPath, writeOutput, printSummary } from '../../src/cli/output';

function args(...argv: string[]) {
  return parseArgs(['node', 'gh-like-diff', ...argv]);
}

describe('parseArgs', () => {
  it('defaults to a side-by-side view of the working tree', () => {
    const o = args();
    expect(o.style).toBe('side');
    expect(o.staged).toBe(false);
    expect(o.context).toBe(3);
    expect(o.refs).toEqual([]);
    expect(o.colorScheme).toBe('auto');
    expect(o.json).toBe(false);
    expect(o.embed).toBe(false);
  });

  it('accepts the unified style and rejects anything else', () => {
    expect(args('-s', 'line').style).toBe('line');
    expect(args('--style', 'line').style).toBe('line');
    // Anything unrecognised falls back to the default rather than producing an
    // invalid outputFormat downstream.
    expect(args('-s', 'nonsense').style).toBe('side');
  });

  it('collects refs as positional arguments', () => {
    expect(args('main...HEAD').refs).toEqual(['main...HEAD']);
    expect(args('HEAD~3', 'HEAD~1').refs).toEqual(['HEAD~3', 'HEAD~1']);
  });

  it('parses the context line count and survives a non-numeric value', () => {
    expect(args('-C', '10').context).toBe(10);
    expect(args('-C', 'abc').context).toBe(3);
  });

  it('reads --staged, --json, --embed and --save', () => {
    const o = args('--staged', '--json', '--embed', '--save', 'review');
    expect(o.staged).toBe(true);
    expect(o.json).toBe(true);
    expect(o.embed).toBe(true);
    expect(o.save).toBe('review');
  });

  it('reads --single-view', () => {
    expect(args().singleView).toBe(false);
    expect(args('--single-view').singleView).toBe(true);
  });

  it('maps --no-open to noOpen', () => {
    expect(args().noOpen).toBe(false);
    expect(args('--no-open').noOpen).toBe(true);
  });

  it('collects repeated ignore patterns', () => {
    expect(args('--ignore', '*.meta', '*.asset').ignore).toEqual(['*.meta', '*.asset']);
    expect(args().ignore).toEqual([]);
  });

  it('passes the colour scheme through', () => {
    expect(args('--color-scheme', 'dark').colorScheme).toBe('dark');
    expect(args('--color-scheme', 'light').colorScheme).toBe('light');
  });

  it('reads the file filter', () => {
    expect(args('-f', 'src/app.ts').file).toBe('src/app.ts');
  });
});

describe('resolveOutputPath', () => {
  it('writes to the Desktop when --save names the file', () => {
    expect(resolveOutputPath('review')).toBe(join(homedir(), 'Desktop', 'review.html'));
  });

  it('otherwise writes a timestamped file under the temp directory', () => {
    const p = resolveOutputPath();
    expect(p.startsWith(join(tmpdir(), 'gh-like-diff'))).toBe(true);
    // Colons are illegal in filenames on Windows and awkward in shells everywhere.
    expect(p).toMatch(/diff_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.html$/);
    expect(p).not.toContain(':');
  });
});

describe('writeOutput', () => {
  it('creates missing parent directories', () => {
    const dir = join(tmpdir(), `gld-test-${process.pid}`, 'nested', 'deeper');
    const file = join(dir, 'out.html');
    try {
      writeOutput(file, '<html>hi</html>');
      expect(readFileSync(file, 'utf-8')).toBe('<html>hi</html>');
    } finally {
      rmSync(join(tmpdir(), `gld-test-${process.pid}`), { recursive: true, force: true });
    }
  });
});

describe('printSummary', () => {
  function capture(extra: Record<string, unknown>) {
    const lines: string[] = [];
    const original = console.log;
    console.log = (...a: unknown[]) => { lines.push(a.join(' ')); };
    try {
      printSummary({
        repoName: 'repo', branch: 'main', fileCount: 3,
        additions: 5, deletions: 2, style: 'side-by-side',
        outputPath: '/tmp/out.html', ...extra,
      });
    } finally {
      console.log = original;
    }
    // Strip the ANSI colour codes so the assertions read plainly.
    return lines.join('\n').replace(/\x1b\[[\d;]*m/g, '');
  }

  it('reports the essentials', () => {
    const out = capture({});
    expect(out).toContain('repo');
    expect(out).toContain('3 changed');
    expect(out).toContain('/tmp/out.html');
  });

  it('names the config file when one was applied', () => {
    // A setting arriving from a file must never be a silent surprise.
    expect(capture({ configPath: '/proj/.gh-like-diffrc' })).toContain('/proj/.gh-like-diffrc');
    expect(capture({})).not.toContain('Config:');
  });

  it('says when some files lost their expand controls', () => {
    const out = capture({ expandInfo: { included: 2, total: 20 } });
    expect(out).toContain('Expand:');
    expect(out).toContain('2/20');
    expect(out).toContain('too large to embed');
  });

  it('stays quiet when every file kept them', () => {
    expect(capture({ expandInfo: { included: 20, total: 20 } })).not.toContain('Expand:');
    expect(capture({ expandInfo: null })).not.toContain('Expand:');
  });
});
