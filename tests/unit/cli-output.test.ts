import { describe, it, expect, vi, beforeEach } from 'vitest';

const execSync = vi.fn();
const readdirSync = vi.fn();
const statSync = vi.fn();
const unlinkSync = vi.fn();
const mkdirSync = vi.fn();
const writeFileSync = vi.fn();

vi.mock('node:child_process', () => ({ execSync: (...a: unknown[]) => execSync(...a) }));
vi.mock('node:fs', () => ({
  readdirSync: (...a: unknown[]) => readdirSync(...a),
  statSync: (...a: unknown[]) => statSync(...a),
  unlinkSync: (...a: unknown[]) => unlinkSync(...a),
  mkdirSync: (...a: unknown[]) => mkdirSync(...a),
  writeFileSync: (...a: unknown[]) => writeFileSync(...a),
}));

const platform = vi.fn();
vi.mock('node:os', async (orig) => {
  const actual = await orig<typeof import('node:os')>();
  return { ...actual, platform: () => platform() };
});

const { resolveOutputPath, openInBrowser } = await import('../../src/cli/output');

beforeEach(() => {
  [execSync, readdirSync, statSync, unlinkSync, mkdirSync, writeFileSync, platform]
    .forEach(m => m.mockReset());
  readdirSync.mockReturnValue([]);
  platform.mockReturnValue('darwin');
});

describe('temp directory housekeeping', () => {
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  it('deletes generated pages older than a week', () => {
    readdirSync.mockReturnValue(['old.html', 'new.html']);
    statSync.mockImplementation((p: string) => ({
      mtimeMs: p.endsWith('old.html') ? Date.now() - WEEK - 1000 : Date.now(),
    }));
    resolveOutputPath();
    expect(unlinkSync).toHaveBeenCalledTimes(1);
    expect(String(unlinkSync.mock.calls[0][0])).toContain('old.html');
  });

  it('leaves anything that is not a generated page alone', () => {
    readdirSync.mockReturnValue(['notes.txt', 'sub']);
    statSync.mockReturnValue({ mtimeMs: 0 });
    resolveOutputPath();
    expect(unlinkSync).not.toHaveBeenCalled();
  });

  it('never lets cleanup failure stop the run', () => {
    // Housekeeping is best-effort; a permission error must not cost the user their diff.
    readdirSync.mockImplementation(() => { throw new Error('EACCES'); });
    expect(() => resolveOutputPath()).not.toThrow();
  });

  it('skips housekeeping entirely when --save names the file', () => {
    resolveOutputPath('review');
    expect(readdirSync).not.toHaveBeenCalled();
  });
});

describe('openInBrowser', () => {
  it('uses the platform opener', () => {
    for (const [os, cmd] of [['darwin', 'open'], ['linux', 'xdg-open'], ['win32', 'start']]) {
      execSync.mockReset();
      platform.mockReturnValue(os);
      openInBrowser('/tmp/a.html');
      expect(execSync.mock.calls[0][0]).toContain(cmd);
    }
  });

  it('quotes the path so a space does not split the command', () => {
    openInBrowser('/tmp/my diff.html');
    expect(execSync.mock.calls[0][0]).toContain('"/tmp/my diff.html"');
  });

  it('does nothing on an unknown platform', () => {
    platform.mockReturnValue('aix');
    openInBrowser('/tmp/a.html');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('stays silent when no browser can be opened', () => {
    // Headless machines and containers have no opener; the file is already written.
    execSync.mockImplementationOnce(() => { throw new Error('no opener'); });
    expect(() => openInBrowser('/tmp/a.html')).not.toThrow();
  });
});
