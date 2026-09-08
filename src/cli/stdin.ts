import { readFileSync } from 'node:fs';

/**
 * True when a diff is being piped in (`git diff | gh-like-diff`).
 *
 * `isTTY` is undefined when stdin is a pipe or a file redirect and true when it is a
 * terminal, so the absence of a TTY is the signal that there is something to read.
 */
export function hasPipedInput(stdin: NodeJS.ReadStream = process.stdin): boolean {
  return !stdin.isTTY;
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
