/**
 * Regenerates the README screenshots.
 *
 *   npm run screenshots
 *
 * The sample diff is built here rather than committed so the images always show the
 * current output: a screenshot that quietly drifts out of date is worse than none.
 * Feature shots are clipped to the part they illustrate, which keeps the files small
 * enough to live in the repository.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'images');
const require = createRequire(import.meta.url);
const lib = require(join(root, 'dist', 'index.js'));

const BEFORE = `import { Money } from './money';

export interface CartItem {
  sku: string;
  quantity: number;
  unitPrice: Money;
}

/** Totals a cart, applying any bulk discount the customer qualifies for. */
export function total(items: CartItem[]): Money {
  let sum = Money.zero();
  for (const item of items) {
    sum = sum.add(item.unitPrice.times(item.quantity));
  }
  return sum;
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((n, item) => n + item.quantity, 0);
}

export function isEmpty(items: CartItem[]): boolean {
  return items.length === 0;
}
`;

const AFTER = BEFORE
  .replace("import { Money } from './money';",
    "import { Money } from './money';\nimport { discountFor } from './discounts';")
  .replace('  return sum;\n}', '  return sum.minus(discountFor(sum, itemCount(items)));\n}');

const CHECKOUT_BEFORE = `export function renderSummary(count: number): string {
  return \`\${count} item\${count === 1 ? '' : 's'}\`;
}
`;

const CHECKOUT_AFTER = `export function renderSummary(count: number, discounted: boolean): string {
  const label = \`\${count} item\${count === 1 ? '' : 's'}\`;
  return discounted ? \`\${label} (bulk discount applied)\` : label;
}
`;

const DISCOUNTS = `import { Money } from './money';

const BULK_THRESHOLD = 10;
const BULK_RATE = 0.05;

export function discountFor(subtotal: Money, count: number): Money {
  if (count < BULK_THRESHOLD) return Money.zero();
  return subtotal.times(BULK_RATE);
}
`;

/**
 * Built by running git in a scratch repository rather than by assembling a patch by hand.
 * A hand-made whole-file hunk marks every line as changed, which is not what a diff
 * normally looks like and makes a poor illustration.
 */
function sampleDiff() {
  const repo = mkdtempSync(join(tmpdir(), 'gld-demo-'));
  const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf-8' });
  git('init', '-q');
  git('config', 'user.email', 'demo@example.com');
  git('config', 'user.name', 'Demo');

  mkdirSync(join(repo, 'src', 'core'), { recursive: true });
  mkdirSync(join(repo, 'src', 'ui'), { recursive: true });
  writeFileSync(join(repo, 'src/core/cart.ts'), BEFORE);
  writeFileSync(join(repo, 'src/ui/checkout.ts'), CHECKOUT_BEFORE);
  git('add', '-A');
  git('commit', '-qm', 'initial');

  writeFileSync(join(repo, 'src/core/cart.ts'), AFTER);
  writeFileSync(join(repo, 'src/core/discounts.ts'), DISCOUNTS);
  writeFileSync(join(repo, 'src/ui/checkout.ts'), CHECKOUT_AFTER);
  git('add', '-A');

  return git('diff', '--cached').stdout;
}

const shots = [
  { name: 'side-by-side-light', full: true },
  { name: 'unified-dark', full: true, before: p => p.evaluate(() => {
    window.__gld.setTheme('dark');
    window.__gld.switchView('line');
  }) },
  {
    name: 'review-memo',
    height: 560,
    before: async p => {
      const cell = p.locator('.gp-view-side .gp-ln[data-ln]').nth(6);
      await cell.dblclick();
      await p.locator('.gp-memo-textarea').fill('Should this round before or after the discount?');
    },
  },
  { name: 'command-palette', height: 620, before: p => p.evaluate(() => window.__gld.openPalette()) },
  {
    name: 'search',
    height: 520,
    before: async p => {
      await p.evaluate(() => window.__gld.openSearch());
      await p.locator('.gp-search input').fill('discount');
    },
  },
];

const dir = mkdtempSync(join(tmpdir(), 'gld-shots-'));
const page1 = join(dir, 'demo.html');
writeFileSync(page1, lib.generate(sampleDiff(), {
  outputFormat: 'side-by-side',
  repoName: 'demo',
  branch: 'main',
  fileContents: {
    'src/core/cart.ts': AFTER.split('\n'),
    'src/core/discounts.ts': DISCOUNTS.split('\n'),
    'src/ui/checkout.ts': CHECKOUT_AFTER.split('\n'),
  },
}));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 2 });

for (const shot of shots) {
  // Feature shots use a shorter viewport rather than a clip rectangle: a fixed crop drifts
  // as soon as the layout changes, and silently cuts the subject in half.
  await page.setViewportSize({ width: 1400, height: shot.height ?? 820 });
  await page.goto('file://' + page1);
  // The page remembers theme and view per diff, so without this the dark unified shot
  // would leak into every shot after it.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(600);
  if (shot.before) await shot.before(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, `${shot.name}.png`) });
  console.log(`wrote docs/images/${shot.name}.png`);
}

await browser.close();
