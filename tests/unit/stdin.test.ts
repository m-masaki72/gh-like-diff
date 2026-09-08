import { describe, it, expect, vi, beforeEach } from 'vitest';

const readFileSync = vi.fn();
vi.mock('node:fs', () => ({ readFileSync: (...a: unknown[]) => readFileSync(...a) }));

const { hasPipedInput, readStdin } = await import('../../src/cli/stdin');

beforeEach(() => readFileSync.mockReset());

describe('hasPipedInput', () => {
  it('is false at an interactive terminal', () => {
    expect(hasPipedInput({ isTTY: true } as NodeJS.ReadStream)).toBe(false);
  });

  it('is true for a pipe or a redirect', () => {
    // Node leaves isTTY undefined rather than false when stdin is not a terminal.
    expect(hasPipedInput({} as NodeJS.ReadStream)).toBe(true);
    expect(hasPipedInput({ isTTY: false } as unknown as NodeJS.ReadStream)).toBe(true);
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
