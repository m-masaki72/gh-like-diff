import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, findConfigFile, CONFIG_FILENAME } from '../../src/cli/config';
import { parseArgs } from '../../src/cli/args';

let root: string;
let home: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gld-config-'));
  home = mkdtempSync(join(tmpdir(), 'gld-home-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

function write(dir: string, contents: unknown) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, CONFIG_FILENAME),
    typeof contents === 'string' ? contents : JSON.stringify(contents));
}

describe('findConfigFile', () => {
  it('finds a config in the starting directory', () => {
    write(root, { style: 'line' });
    expect(findConfigFile(root, home)).toBe(join(root, CONFIG_FILENAME));
  });

  it('walks up to a parent directory', () => {
    write(root, { style: 'line' });
    const deep = join(root, 'a', 'b', 'c');
    mkdirSync(deep, { recursive: true });
    expect(findConfigFile(deep, home)).toBe(join(root, CONFIG_FILENAME));
  });

  it('prefers the nearest config over one further up', () => {
    // Only the closest file is read: merging layers would make it hard to tell where a
    // setting came from.
    write(root, { style: 'line' });
    const nested = join(root, 'pkg');
    write(nested, { style: 'side' });
    expect(findConfigFile(nested, home)).toBe(join(nested, CONFIG_FILENAME));
  });

  it('falls back to the home directory', () => {
    write(home, { colorScheme: 'dark' });
    expect(findConfigFile(root, home)).toBe(join(home, CONFIG_FILENAME));
  });

  it('returns null when there is nothing to find', () => {
    expect(findConfigFile(root, home)).toBeNull();
  });

  it('stops at the filesystem root instead of looping', () => {
    expect(findConfigFile('/', home)).toBeNull();
  });
});

describe('loadConfig', () => {
  it('reads the recognised options', () => {
    write(root, {
      style: 'line', colorScheme: 'dark', context: 8,
      ignore: ['*.meta'], singleView: true, noOpen: true,
    });
    const { config, warnings } = loadConfig(root, home);
    expect(warnings).toEqual([]);
    expect(config).toEqual({
      style: 'line', colorScheme: 'dark', context: 8,
      ignore: ['*.meta'], singleView: true, noOpen: true,
    });
  });

  it('warns instead of throwing on malformed JSON', () => {
    // A broken config must never stop someone from reading a diff.
    write(root, '{ not json');
    const { config, warnings } = loadConfig(root, home);
    expect(config).toEqual({});
    expect(warnings[0]).toContain('could not parse');
  });

  it('drops values of the wrong type and says which', () => {
    write(root, { style: 'diagonal', context: -1, ignore: 'nope', singleView: 'yes' });
    const { config, warnings } = loadConfig(root, home);
    expect(config).toEqual({});
    expect(warnings).toHaveLength(4);
    expect(warnings.join(' ')).toContain('style must be');
    expect(warnings.join(' ')).toContain('context must be');
  });

  it('keeps the valid options when only some are wrong', () => {
    write(root, { style: 'line', context: 'ten' });
    const { config, warnings } = loadConfig(root, home);
    expect(config).toEqual({ style: 'line' });
    expect(warnings).toHaveLength(1);
  });

  it('warns about unknown options rather than ignoring them silently', () => {
    // A typo in a config file is otherwise invisible.
    write(root, { syle: 'line' });
    const { warnings } = loadConfig(root, home);
    expect(warnings.join(' ')).toContain('unknown option "syle"');
  });

  it('rejects a non-object document', () => {
    write(root, [1, 2, 3]);
    const { config, warnings } = loadConfig(root, home);
    expect(config).toEqual({});
    expect(warnings[0]).toContain('must be a JSON object');
  });

  it('reports no file and no warnings when none exists', () => {
    expect(loadConfig(root, home)).toEqual({ config: {}, path: null, warnings: [] });
  });
});

describe('option precedence', () => {
  const argv = (...a: string[]) => ['node', 'gh-like-diff', ...a];

  it('uses the built-in default when nothing else is set', () => {
    expect(parseArgs(argv()).style).toBe('side');
    expect(parseArgs(argv()).context).toBe(3);
  });

  it('lets the config file beat the built-in default', () => {
    const o = parseArgs(argv(), { style: 'line', context: 7, colorScheme: 'dark' });
    expect(o.style).toBe('line');
    expect(o.context).toBe(7);
    expect(o.colorScheme).toBe('dark');
  });

  it('lets the command line beat the config file', () => {
    // Commander reports the source of each value; without that a flag matching the
    // built-in default could never override the file.
    const o = parseArgs(argv('-s', 'side', '-C', '1', '--color-scheme', 'light'),
      { style: 'line', context: 7, colorScheme: 'dark' });
    expect(o.style).toBe('side');
    expect(o.context).toBe(1);
    expect(o.colorScheme).toBe('light');
  });

  it('applies boolean options from the config file', () => {
    const o = parseArgs(argv(), { singleView: true, noOpen: true });
    expect(o.singleView).toBe(true);
    expect(o.noOpen).toBe(true);
  });

  it('lets the command line turn a config flag back on', () => {
    expect(parseArgs(argv('--single-view'), {}).singleView).toBe(true);
  });

  it('takes ignore patterns from the config file, and the CLI wins outright', () => {
    expect(parseArgs(argv(), { ignore: ['*.meta'] }).ignore).toEqual(['*.meta']);
    expect(parseArgs(argv('--ignore', '*.asset'), { ignore: ['*.meta'] }).ignore).toEqual(['*.asset']);
  });

  it('never lets a config file change what is being compared', () => {
    // refs, --staged and -f stay on the command line on purpose: a file that silently
    // changed the comparison would be far more surprising than one that changes looks.
    const o = parseArgs(argv('main...HEAD'), { style: 'line' } as never);
    expect(o.refs).toEqual(['main...HEAD']);
    expect(o.staged).toBe(false);
    expect(o.file).toBeUndefined();
  });
});
