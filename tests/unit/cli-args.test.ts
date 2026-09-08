import { describe, it, expect } from 'vitest';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, rmSync } from 'node:fs';
import { parseArgs } from '../../src/cli/args';
import { resolveOutputPath, writeOutput } from '../../src/cli/output';

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
