import { describe, it, expect } from 'vitest';
import { detectLanguage, highlightLine } from '../../src/core/highlighter';

describe('detectLanguage', () => {
  it('returns typescript for .ts files', () => {
    expect(detectLanguage('src/foo.ts')).toBe('typescript');
  });

  it('returns typescript for .tsx files', () => {
    expect(detectLanguage('App.tsx')).toBe('typescript');
  });

  it('returns javascript for .js/.jsx/.mjs/.cjs', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('comp.jsx')).toBe('javascript');
    expect(detectLanguage('mod.mjs')).toBe('javascript');
    expect(detectLanguage('mod.cjs')).toBe('javascript');
  });

  it('returns python for .py files', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });

  it('returns go for .go files', () => {
    expect(detectLanguage('main.go')).toBe('go');
  });

  it('returns rust for .rs files', () => {
    expect(detectLanguage('lib.rs')).toBe('rust');
  });

  it('returns xml for .html/.htm/.xml/.svg/.vue', () => {
    expect(detectLanguage('index.html')).toBe('xml');
    expect(detectLanguage('page.htm')).toBe('xml');
    expect(detectLanguage('data.xml')).toBe('xml');
    expect(detectLanguage('icon.svg')).toBe('xml');
    expect(detectLanguage('App.vue')).toBe('xml');
  });

  it('returns css for .css/.scss/.less', () => {
    expect(detectLanguage('style.css')).toBe('css');
    expect(detectLanguage('theme.scss')).toBe('css');
    expect(detectLanguage('vars.less')).toBe('css');
  });

  it('returns yaml for .yml/.yaml', () => {
    expect(detectLanguage('config.yml')).toBe('yaml');
    expect(detectLanguage('config.yaml')).toBe('yaml');
  });

  it('returns json for .json files', () => {
    expect(detectLanguage('package.json')).toBe('json');
  });

  it('returns bash for .sh/.bash/.zsh', () => {
    expect(detectLanguage('deploy.sh')).toBe('bash');
    expect(detectLanguage('init.bash')).toBe('bash');
    expect(detectLanguage('setup.zsh')).toBe('bash');
  });

  it('returns null for unknown extensions', () => {
    expect(detectLanguage('data.xyz')).toBeNull();
    expect(detectLanguage('binary.bin')).toBeNull();
  });

  it('returns null for files without extension', () => {
    expect(detectLanguage('Makefile')).toBeNull();
    expect(detectLanguage('Dockerfile')).toBeNull();
  });

  it('is case-insensitive for extensions', () => {
    expect(detectLanguage('App.TS')).toBe('typescript');
    expect(detectLanguage('style.CSS')).toBe('css');
  });

  it('handles deeply nested paths', () => {
    expect(detectLanguage('src/core/utils/helper.ts')).toBe('typescript');
  });

  it('returns correct language for c/cpp families', () => {
    expect(detectLanguage('main.c')).toBe('c');
    expect(detectLanguage('util.h')).toBe('c');
    expect(detectLanguage('app.cpp')).toBe('cpp');
    expect(detectLanguage('app.cc')).toBe('cpp');
    expect(detectLanguage('lib.cs')).toBe('csharp');
  });

  it('returns correct language for mobile languages', () => {
    expect(detectLanguage('App.swift')).toBe('swift');
    expect(detectLanguage('Main.kt')).toBe('kotlin');
    expect(detectLanguage('Main.java')).toBe('java');
  });
});

describe('highlightLine', () => {
  it('produces highlighted HTML for typescript code', () => {
    const result = highlightLine('const x = 42;', 'typescript');
    expect(result).toContain('hljs-');
    expect(result).toContain('const');
  });

  it('wraps keywords in hljs spans', () => {
    const result = highlightLine('function greet() {}', 'javascript');
    expect(result).toContain('<span class="hljs-');
    expect(result).toContain('function');
  });

  it('highlights string literals', () => {
    const result = highlightLine('const s = "hello";', 'javascript');
    expect(result).toContain('hljs-string');
  });

  it('highlights comments', () => {
    const result = highlightLine('// this is a comment', 'javascript');
    expect(result).toContain('hljs-comment');
  });

  it('returns empty string for unknown language gracefully', () => {
    const result = highlightLine('some code', 'nonexistent_lang');
    expect(result).toBe('');
  });

  it('handles empty input', () => {
    const result = highlightLine('', 'typescript');
    expect(result).toBe('');
  });

  it('handles python syntax', () => {
    const result = highlightLine('def hello():', 'python');
    expect(result).toContain('hljs-');
  });

  it('handles JSON syntax', () => {
    const result = highlightLine('{ "key": "value" }', 'json');
    expect(result).toContain('hljs-');
  });
});
