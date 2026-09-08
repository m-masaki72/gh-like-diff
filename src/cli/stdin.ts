import { readFileSync, fstatSync } from 'node:fs';

/** Explicit opt-in, for scripts that would rather not rely on any detection at all. */
export const STDIN_REF = '-';

/**
 * True when a diff is genuinely waiting on stdin.
 *
 * `!isTTY` alone is not enough, and getting this wrong is expensive: stdin is also not a
 * TTY under CI, npm scripts, editor tasks, cron, and plain `< /dev/null`. Treating any of
 * those as piped input made the CLI read an empty stdin and report "No changes detected"
 * while silently ignoring the refs it was given.
 *
 * So the source has to look like something a diff would actually arrive on: a pipe, a
 * socket, or a redirect from a file that has content. A shell pipe is a FIFO while a
 * process spawned with an `input` buffer gets a socket, and both are real input.
 * `/dev/null` is a character device and an empty file has no bytes, so both correctly fall
 * through to reading git.
 */
export function hasPipedInput(stdin: NodeJS.ReadStream = process.stdin, fd = 0): boolean {
  if (stdin.isTTY) return false;
  try {
    const stat = fstatSync(fd);
    return stat.isFIFO() || stat.isSocket() || (stat.isFile() && stat.size > 0);
  } catch {
    // A closed or unreadable stdin is not input.
    return false;
  }
}

/**
 * Reads the whole of stdin synchronously.
 *
 * Synchronous on purpose: the CLI is a single straight-line script, and going async here
 * would ripple through every caller for no benefit. Returns an empty string when stdin is
 * closed or unreadable rather than throwing, so an empty pipe falls through to the normal
 * "no changes" message.
 */
export function readStdin(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}
