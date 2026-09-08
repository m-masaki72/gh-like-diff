import { describe, it, expect } from 'vitest';
import { splitEscapedChars, wrapCharRange, computeWordDiffRange } from '../../src/core/renderer';

describe('splitEscapedChars', () => {
  it('treats an HTML entity as a single source character', () => {
    expect(splitEscapedChars('a&amp;b')).toEqual(['a', '&amp;', 'b']);
    expect(splitEscapedChars('&lt;div&gt;')).toEqual(['&lt;', 'd', 'i', 'v', '&gt;']);
  });

  it('keeps a surrogate pair together', () => {
    // A naive index-based split turns the emoji into two lone surrogates, which render
    // as replacement characters.
    expect(splitEscapedChars('a🎉b')).toEqual(['a', '🎉', 'b']);
  });

  it('handles a bare ampersand that is not an entity', () => {
    expect(splitEscapedChars('a & b')).toEqual(['a', ' ', '&', ' ', 'b']);
  });
});

describe('wrapCharRange', () => {
  it('wraps a range of plain text', () => {
    expect(wrapCharRange('abcdef', 2, 4, 'x')).toBe('ab<span class="x">cd</span>ef');
  });

  it('returns the input unchanged for an empty range', () => {
    expect(wrapCharRange('abcdef', 3, 3, 'x')).toBe('abcdef');
  });

  it('does not break the nesting of highlighted markup', () => {
    const html = '<span class="hljs-keyword">const</span> x = 1;';
    const out = wrapCharRange(html, 0, 7, 'gp-word-del');
    // The keyword span stays intact and the wrapper opens/closes inside each text run.
    expect(out).toContain('<span class="hljs-keyword">');
    expect(out.match(/<span/g)!.length).toBe(out.match(/<\/span>/g)!.length);
    expect(out).toBe(
      '<span class="hljs-keyword"><span class="gp-word-del">const</span></span>' +
      '<span class="gp-word-del"> x</span> = 1;',
    );
  });

  it('counts entities as one character when locating the range', () => {
    // Source is `a<b`; the range covers only `<`.
    expect(wrapCharRange('a&lt;b', 1, 2, 'x')).toBe('a<span class="x">&lt;</span>b');
  });

  it('counts an emoji as one character', () => {
    expect(wrapCharRange('a🎉b', 1, 2, 'x')).toBe('a<span class="x">🎉</span>b');
  });

  it('spans several text runs across tags', () => {
    const out = wrapCharRange('<i>ab</i>cd', 1, 4, 'x');
    expect(out).toBe('<i>a<span class="x">b</span></i><span class="x">cd</span>');
  });
});

describe('computeWordDiffRange', () => {
  it('finds the changed middle section', () => {
    const r = computeWordDiffRange('foo(a, b)', 'foo(a, c)');
    expect('foo(a, b)'.slice(r.start, r.oldEnd)).toBe('b');
    expect('foo(a, c)'.slice(r.start, r.newEnd)).toBe('c');
  });

  it('snaps outward to word boundaries instead of stopping mid-token', () => {
    const r = computeWordDiffRange('const alpha = 1;', 'const alphabet = 1;');
    // A raw character diff would mark only "bet"; whole-word marking reads far better.
    expect('const alpha = 1;'.slice(r.start, r.oldEnd)).toBe('alpha');
    expect('const alphabet = 1;'.slice(r.start, r.newEnd)).toBe('alphabet');
  });

  it('never splits a surrogate pair', () => {
    const oldStr = 'const emoji = "🎉 done";';
    const newStr = 'const emoji = "🎊 done";';
    const r = computeWordDiffRange(oldStr, newStr);
    const oldChars = Array.from(oldStr);
    const newChars = Array.from(newStr);
    expect(oldChars.slice(r.start, r.oldEnd).join('')).toContain('🎉');
    expect(newChars.slice(r.start, r.newEnd).join('')).toContain('🎊');
    // Offsets are code-point based, so slicing can never yield a lone surrogate.
    expect(/[\uD800-\uDFFF]/.test(oldChars.slice(r.start, r.oldEnd).join(''))
      && !/🎉/.test(oldChars.slice(r.start, r.oldEnd).join(''))).toBe(false);
  });

  it('returns an empty range for identical strings', () => {
    const r = computeWordDiffRange('same', 'same');
    expect(r.start).toBe(r.oldEnd);
    expect(r.start).toBe(r.newEnd);
  });

  it('covers the whole added text when the old side is empty', () => {
    const r = computeWordDiffRange('', 'added');
    expect(r.start).toBe(0);
    expect(r.oldEnd).toBe(0);
    expect(r.newEnd).toBe(5);
  });
});
