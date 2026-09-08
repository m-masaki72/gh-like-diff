import { describe, it, expect } from 'vitest';
import { ICON_PATHS, icon, renderIconSprite } from '../../src/core/icons';
import { generate } from '../../src/index';

const DIFF = `diff --git a/src/deep/a.ts b/src/deep/a.ts
--- a/src/deep/a.ts
+++ b/src/deep/a.ts
@@ -10,3 +10,3 @@
 keep
-old
+new
`;
const html = generate(DIFF, { fileContents: { 'src/deep/a.ts': ['a', 'b', 'c'] } });

describe('icon sprite', () => {
  it('defines every symbol the page references', () => {
    // A <use> pointing at a missing symbol renders nothing at all — an invisible button.
    const used = new Set([...html.matchAll(/<use href="#(gp-i-[\w-]+)"/g)].map(m => m[1]));
    const defined = new Set([...html.matchAll(/<symbol id="(gp-i-[\w-]+)"/g)].map(m => m[1]));
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter(id => !defined.has(id))).toEqual([]);
  });

  it('emits the sprite exactly once', () => {
    expect((html.match(/class="gp-icon-sprite"/g) || []).length).toBe(1);
  });

  it('leaves no inline path data outside the sprite', () => {
    // The point of the change: 409 copies of 15 shapes became 409 references.
    const sprite = html.match(/<svg class="gp-icon-sprite"[\s\S]*?<\/svg>/)![0];
    const rest = html.replace(sprite, '');
    expect(rest).not.toContain('<path d=');
  });

  it('costs far less than inlining would', () => {
    const uses = (html.match(/<use href=/g) || []).length;
    const inlineCost = [...html.matchAll(/<use href="#gp-i-([\w-]+)"/g)]
      .reduce((n, m) => n + ICON_PATHS[m[1]].length, 0);
    const spriteCost = renderIconSprite().length;
    expect(uses).toBeGreaterThan(10);
    expect(spriteCost).toBeLessThan(inlineCost);
  });
});

describe('icon()', () => {
  it('marks icons decorative unless given a label', () => {
    // They sit inside buttons that already have accessible names.
    expect(icon('copy')).toContain('aria-hidden="true"');
    expect(icon('copy', { title: 'Copy' })).toContain('aria-label="Copy"');
    expect(icon('copy', { title: 'Copy' })).toContain('role="img"');
  });

  it('passes through the class, size and style the call site needs', () => {
    const out = icon('check', { className: 'gp-check-icon', size: 14, style: 'display:none' });
    expect(out).toContain('class="gp-check-icon"');
    expect(out).toContain('width="14" height="14"');
    expect(out).toContain('style="display:none"');
  });

  it('references a symbol that exists', () => {
    for (const name of Object.keys(ICON_PATHS)) {
      expect(renderIconSprite()).toContain(`id="gp-i-${name}"`);
    }
  });

  it('keeps the theme toggle able to swap sun and moon by class', () => {
    // The stylesheet hides one of the two by class name, so those must survive.
    expect(html).toContain('class="gp-icon-sun"');
    expect(html).toContain('class="gp-icon-moon"');
  });
});
