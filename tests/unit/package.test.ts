import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const built = existsSync(join(root, 'dist', 'index.js'));

describe('package metadata', () => {
  it('declares everything npm needs to publish', () => {
    for (const field of ['name', 'version', 'description', 'license', 'repository', 'engines']) {
      expect(pkg[field], `missing ${field}`).toBeTruthy();
    }
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('runs the full check before publishing', () => {
    // prepack only builds; without this a broken build could still reach npm.
    expect(pkg.scripts.prepublishOnly).toContain('typecheck');
    expect(pkg.scripts.prepublishOnly).toContain('test');
    expect(pkg.scripts.prepublishOnly).toContain('build');
  });

  it('keeps every dependency runtime-necessary', () => {
    // Playwright, vitest and tsup must never leak into a consumer's install.
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['commander', 'diff2html', 'highlight.js']);
  });
});

describe('published entry points', () => {
  it('points its exports at files the build produces', () => {
    const targets = [
      pkg.main, pkg.module, pkg.types,
      pkg.exports['.'].types, pkg.exports['.'].import, pkg.exports['.'].require,
      pkg.bin['gh-like-diff'],
    ];
    for (const rel of targets) {
      expect(rel, 'entry point not declared').toBeTruthy();
      if (built) expect(existsSync(join(root, rel)), `${rel} is missing from dist`).toBe(true);
    }
  });

  it.skipIf(!built)('ships a CLI with a shebang', () => {
    const cli = readFileSync(join(root, pkg.bin['gh-like-diff']), 'utf-8');
    expect(cli.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it.skipIf(!built)('loads the CommonJS build and exposes the public API', () => {
     
    const lib = require(join(root, pkg.main));
    for (const fn of ['parse', 'generate', 'render']) {
      expect(typeof lib[fn], `${fn} is not exported`).toBe('function');
    }
  });
});

describe('tarball contents', () => {
  // `npm pack --dry-run` is the only faithful answer to "what would consumers get".
  // --ignore-scripts keeps the prepack build's log out of the JSON on stdout.
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root, encoding: 'utf-8', timeout: 120000,
  });
  let files: string[] = [];
  if (packed.status === 0) {
    try {
      files = (JSON.parse(packed.stdout)[0]?.files ?? []).map((f: { path: string }) => f.path);
    } catch {
      // Leave empty: the tests below skip rather than fail on an npm we cannot read.
    }
  }

  it.skipIf(files.length === 0)('includes the build output and the documents', () => {
    expect(files).toContain('package.json');
    expect(files).toContain('README.md');
    expect(files).toContain('CHANGELOG.md');
    expect(files).toContain('LICENSE');
    expect(files.some(f => f.startsWith('dist/'))).toBe(true);
  });

  it.skipIf(files.length === 0)('excludes source maps', () => {
    // They more than doubled the unpacked size and are of no use to a consumer.
    expect(files.filter(f => f.endsWith('.map'))).toEqual([]);
  });

  it.skipIf(files.length === 0)('excludes sources, tests and project notes', () => {
    const leaked = files.filter(f =>
      f.startsWith('src/') || f.startsWith('tests/') || f.startsWith('bin/')
      || f.startsWith('.github/') || f === 'PROGRESS.md' || f === 'CLAUDE.md');
    expect(leaked).toEqual([]);
  });
});

describe('changelog', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf-8');

  it('has an Unreleased section to collect changes into', () => {
    expect(changelog).toContain('## [Unreleased]');
  });

  it('describes the current release or the unreleased work', () => {
    const hasVersionHeading = new RegExp(`## \\[${pkg.version.replace(/\./g, '\\.')}\\]`).test(changelog);
    const unreleasedBody = changelog.split('## [Unreleased]')[1] ?? '';
    expect(hasVersionHeading || unreleasedBody.trim().length > 0).toBe(true);
  });
});
