import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileSync = vi.fn();
const fstatSync = vi.fn();
vi.mock('node:fs', () => ({
  readFileSync: (...a: unknown[]) => readFileSync(...a),
  fstatSync: (...a: unknown[]) => fstatSync(...a),
}));

const { hasPipedInput, readStdin, STDIN_REF } = await import('../../src/cli/stdin');

beforeEach(() => {
  readFileSync.mockReset();
  fstatSync.mockReset();
});

describe('hasPipedInput', () => {
  const notTty = {} as NodeJS.ReadStream;

  it('is false at an interactive terminal', () => {
    expect(hasPipedInput({ isTTY: true } as NodeJS.ReadStream)).toBe(false);
  });

  it('is true for a pipe', () => {
    fstatSync.mockReturnValue({ isFIFO: () => true, isSocket: () => false, isFile: () => false, size: 0 });
    expect(hasPipedInput(notTty)).toBe(true);
  });

  it('is true for a socket, which is what a spawned process with an input buffer gets', () => {
    fstatSync.mockReturnValue({ isFIFO: () => false, isSocket: () => true, isFile: () => false, size: 0 });
    expect(hasPipedInput(notTty)).toBe(true);
  });

  it('is true for a redirect from a file with content', () => {
    fstatSync.mockReturnValue({ isFIFO: () => false, isSocket: () => false, isFile: () => true, size: 42 });
    expect(hasPipedInput(notTty)).toBe(true);
  });

  it('is false for /dev/null', () => {
    // The critical case: stdin is not a TTY under CI, npm scripts, editor tasks and cron,
    // and treating those as piped input made the CLI ignore the refs it was given.
    fstatSync.mockReturnValue({ isFIFO: () => false, isSocket: () => false, isFile: () => false, size: 0 });
    expect(hasPipedInput(notTty)).toBe(false);
  });

  it('is false for a redirect from an empty file', () => {
    fstatSync.mockReturnValue({ isFIFO: () => false, isSocket: () => false, isFile: () => true, size: 0 });
    expect(hasPipedInput(notTty)).toBe(false);
  });

  it('is false when stdin cannot be inspected at all', () => {
    fstatSync.mockImplementationOnce(() => { throw new Error('EBADF'); });
    expect(hasPipedInput(notTty)).toBe(false);
  });

  it('offers an explicit opt-in for scripts', () => {
    expect(STDIN_REF).toBe('-');
  });
});

describe('readStdin', () => {
  it('reads file descriptor 0 as UTF-8', () => {
    readFileSync.mockReturnValue('diff --git a/a b/a\n');
    expect(readStdin()).toBe('diff --git a/a b/a\n');
    expect(readFileSync).toHaveBeenCalledWith(0, 'utf-8');
  });

  it('returns an empty string instead of throwing when stdin is unreadable', () => {
    // An empty pipe then falls through to the normal "no changes" message.
    // Once-only: a persistent throwing implementation leaks into vitest's own fs use
    // after the test body finishes.
    readFileSync.mockImplementationOnce(() => { throw new Error('EAGAIN'); });
    expect(readStdin()).toBe('');
  });
});
