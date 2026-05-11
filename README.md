# gh-like-diff

**GitHub-quality diff views, anywhere. Offline, interactive, shareable.**

`gh-like-diff` is a CLI tool and JavaScript library that generates self-contained, GitHub-style HTML diff pages from your local git changes. No server, no account, no internet required — just a single HTML file you can open in any browser or drop into Slack.

```bash
npx gh-like-diff                      # View local changes in your browser
npx gh-like-diff main...HEAD          # PR-style diff from main
npx gh-like-diff --staged --save pr   # Save staged diff to ~/Desktop/pr.html
```

---

## Features

### GitHub-Faithful UI
Side-by-side and unified diff views with GitHub's exact color palette, typography, and component design. Automatically adapts to your OS light/dark mode preference, with a manual toggle button.

### Keyboard-First Navigation
Designed for developers who live in the terminal:

| Key | Action |
|-----|--------|
| `j` / `k` | Jump between files |
| `n` / `p` | Jump between hunks |
| `/` | Open search overlay |
| `b` | Toggle sidebar |
| `?` | Toggle keyboard shortcuts |
| `Escape` | Close overlays |

### File Tree Sidebar
A collapsible sidebar lists all changed files with:
- File status icons (Added / Modified / Deleted / Renamed)
- Directory path grouping
- Per-file addition/deletion bar chart
- Click-to-jump navigation
- Active file tracking on scroll

### In-Page Search
Press `/` to open a search overlay that highlights matches across the entire diff. Navigate results with `Enter` / `Shift+Enter`.

### Large Diff Performance
Files with 500+ changed lines are lazy-loaded — rendered only when you click "Load diff". This keeps memory flat and the browser responsive, even on diffs with thousands of files (a common pain point in Unity projects with `.meta` files).

### Self-Contained HTML Output
The generated HTML file includes all CSS and JavaScript inlined — zero external dependencies, zero network requests. Open it from `file://`, share it on Slack, archive it as a build artifact. It just works, months later, on any machine.

### Library API
Use `gh-like-diff` programmatically in your own tools:

```typescript
import { parse, generate, render } from 'gh-like-diff';

// Parse a unified diff into structured data
const parsed = parse(diffString);

// Generate a complete self-contained HTML page
const html = generate(diffString, {
  outputFormat: 'side-by-side',
  colorScheme: 'dark',
  title: 'My Review',
});

// Render just the diff HTML fragment (for embedding)
const fragment = render(diffString);
```

---

## Installation

```bash
# Global install
npm install -g gh-like-diff

# Or run directly
npx gh-like-diff
```

**Requirements:** Node.js 18+, Git

---

## Usage

```bash
# Working tree changes (staged + unstaged)
gh-like-diff

# Staged changes only
gh-like-diff --staged

# Last 3 commits
gh-like-diff HEAD~3

# Diff from main branch (PR-style)
gh-like-diff main...HEAD

# Specific file only
gh-like-diff --file src/index.ts

# Unified (line-by-line) view instead of side-by-side
gh-like-diff --style line

# Ignore patterns (useful for Unity .meta files)
gh-like-diff --ignore "*.meta" "*.asset"

# Save to Desktop instead of /tmp
gh-like-diff --save my-review

# Generate but don't open browser
gh-like-diff --no-open

# Output parsed diff as JSON (for piping to other tools)
gh-like-diff --json

# Output HTML fragment only (for embedding in existing pages)
gh-like-diff --embed

# Force dark mode
gh-like-diff --color-scheme dark
```

### Full CLI Options

```
Usage: gh-like-diff [options] [refs...]

Arguments:
  refs                     Git refs to diff (e.g., HEAD~3, main...HEAD)

Options:
  -V, --version            output the version number
  -s, --style <mode>       View style: "side" or "line" (default: "side")
  --staged                 Show staged changes only (default: false)
  -f, --file <path>        Filter to specific file
  -C, --context <lines>    Lines of context (default: "3")
  --save <name>            Save HTML to ~/Desktop/<name>.html
  --no-open                Generate HTML but do not open browser
  --json                   Output parsed diff as JSON (default: false)
  --embed                  Output HTML fragment only (default: false)
  --ignore <patterns...>   Glob patterns to ignore (e.g., "*.meta")
  --color-scheme <scheme>  Color scheme: auto, dark, light (default: "auto")
  -h, --help               display help for command
```

---

## Why gh-like-diff?

### The Problem

Every developer reviews diffs daily, but existing local diff tools each have significant gaps:

| Tool | What's Missing |
|------|---------------|
| **diff2html** | No interactivity — no keyboard nav, no file tree, no search. Crashes on large files. |
| **delta / difftastic** | Terminal-only output. Can't share, can't navigate large diffs visually. |
| **react-diff-viewer** | Requires React, requires a build step, unmaintained since 2020. |
| **Diffity** | Cloud-based, not offline-first, designed for AI agents not humans. |
| **GitHub PR view** | Requires push, requires internet, no offline access. |

These pain points surfaced repeatedly across GitHub issues, HackerNews discussions, and developer forums:
1. No way to leave inline comments on local diffs
2. Memory spikes on large files (56GB allocation reported on diff2html)
3. Painful multi-file navigation — manual scrolling through walls of output
4. Sharing friction — terminal colors don't survive copy-paste
5. Context expansion requires tedious line-by-line clicking

### The Solution

gh-like-diff focuses on three things existing tools do poorly:

1. **Navigation** — Keyboard shortcuts + file tree sidebar + scroll tracking
2. **Performance** — Lazy-loaded large files, flat memory usage
3. **Shareability** — Single self-contained HTML file, works everywhere

---

## Repository Structure

```
gh-like-diff/
├── bin/
│   └── gh-like-diff.ts             # CLI entry point
├── src/
│   ├── index.ts                    # Public API (parse, generate, render)
│   ├── cli/
│   │   ├── args.ts                 # Argument parser (commander)
│   │   ├── git.ts                  # Git operations (diff, repo info)
│   │   └── output.ts              # File writing, browser launch, terminal output
│   ├── core/
│   │   ├── parser.ts              # diff2html parse wrapper + metadata
│   │   ├── renderer.ts            # Custom HTML renderer (side-by-side + unified)
│   │   └── template.ts            # Full-page HTML assembly (CSS/JS inline)
│   └── ui/
│       ├── styles.ts              # GitHub-style CSS (light/dark, all components)
│       ├── scripts.ts             # Client JS aggregator
│       └── components/
│           ├── keyboard-nav.ts    # j/k/n/p navigation + scroll tracking
│           ├── file-tree.ts       # Sidebar toggle
│           ├── search.ts          # In-page search with highlight
│           ├── theme-toggle.ts    # Light/dark/auto switching
│           ├── toolbar.ts         # View switching, file collapse
│           └── virtual-scroll.ts  # Lazy loading + synchronized scrolling
├── test/                           # Test directory (fixtures, unit tests)
├── package.json
├── tsconfig.json
└── tsup.config.ts                  # Build config (CJS + ESM + DTS)
```

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **diff2html for parsing only, custom renderer** | Full control over DOM structure enables keyboard nav, virtual scroll, and future plugin system |
| **CSS as TypeScript template literals** | Guarantees all styles are inlined in the output HTML; enables programmatic theming |
| **Client JS embedded as IIFE strings** | Zero external dependencies in the output file; works from `file://` protocol |
| **Diff data embedded as `<script type="application/json">`** | Enables live view switching (side-by-side ↔ unified) without page reload |

### Tech Stack

- **TypeScript** — All source code
- **tsup** (esbuild) — Build pipeline producing CJS, ESM, and DTS outputs
- **diff2html** — Unified diff parsing engine
- **commander** — CLI argument parsing
- **vitest** — Test framework (ready for test authoring)

### Build Output

| File | Size | Purpose |
|------|------|---------|
| `dist/gh-like-diff.js` | 48 KB | CLI binary (Node.js) |
| `dist/index.mjs` | 40 KB | ESM library |
| `dist/index.js` | 39 KB | CJS library |
| `dist/index.d.ts` | 1 KB | TypeScript declarations |

---

## How This Project Was Built

This project was built in a single session with [Claude Code](https://claude.ai/code) (Claude Opus 4.6), Anthropic's AI coding assistant.

### Session Timeline

**Phase 1: Prototype** — Started with a bash script (`gdiff`) that piped `git diff` into `diff2html-cli` with a custom HTML wrapper template. This was a quick personal tool with ~200 lines of shell + HTML.

**Phase 2: Research** — Claude Code launched parallel research agents to survey the ecosystem:
- Collected pain points from GitHub Issues on diff2html-cli, delta, difftastic, and diff-so-fancy
- Analyzed feature gaps between local tools and web-based code review (GitHub, Gerrit, Phabricator)
- Reviewed emerging tools (Diffity, SemanticDiff, difit) and their differentiators
- Studied npm package landscape (react-diff-viewer, CodeMirror merge, Monaco diff)

Key findings across 15+ sources identified **10 critical pain points** in local diff viewing, with navigation, performance, and shareability as the top three.

**Phase 3: Architecture Design** — A Plan agent designed the full library architecture, including:
- Package structure and public API surface
- Custom renderer vs diff2html delegation trade-offs
- Client-side JS embedding strategy for self-contained HTML
- Phased roadmap (v1.0 → v1.5 → v2.0)

**Phase 4: Implementation** — All 1,700 lines of TypeScript were written in sequence:
1. Project scaffolding (package.json, tsconfig, tsup)
2. CLI layer (argument parsing, git operations, output handling)
3. Core engine (diff parser, custom HTML renderer, template assembler)
4. UI components (keyboard nav, file tree, search, theme toggle, virtual scroll)
5. Build, link, and end-to-end testing on a real Unity project repository

**Phase 5: Documentation** — This README.

### What the AI Did Well
- Parallel research across many sources to identify real user pain points
- Architecture decisions grounded in the actual limitations of existing tools
- Full implementation from scaffold to working CLI in one pass
- GitHub-faithful CSS with proper dark mode, hover states, and responsive design

### What Required Human Direction
- Deciding the project name and positioning
- Choosing the project location and scope for the session
- Approving the design plan before implementation began
- Triggering the README creation with quality expectations

---

## Known Issues & Near-Term TODO

v1.0 として動作する状態ですが、以下の残作業・改善ポイントがあります。

### Must Fix (v1.0 patch)

- [ ] **ライブビュー切替の再レンダー未実装** — Unified ↔ Split ボタンはUI上存在するが、クライアント側の `renderAllFiles` / `renderFile` が未定義のため、切替時に実際のDOM再描画が行われない。埋め込みJSONからクライアントJSでレンダーする仕組みの追加が必要
- [ ] **バイナリファイル・空ファイルの表示** — バイナリファイルや空diffが含まれる場合のフォールバック表示がない（「Binary file differs」等のメッセージ表示）
- [ ] **`--ignore` のgitパススペック制約** — 現在 `:(exclude)` を使用しているが、git pathspecの仕様上 `*.meta` のようなグロブは一部ケースで動作しない可能性がある。`--diff-filter` との組み合わせやpost-filteringの検討が必要

### Should Fix (v1.0.x)

- [ ] **テストの作成** — `test/` ディレクトリはスキャフォールド済みだが中身が空。parser, renderer, args の単体テストと、実diffを使った統合テストが必要
- [ ] **シンタックスハイライト** — 現在はモノクロのコード表示。highlight.js または Shiki を統合してキーワード・文字列等の色分けを追加
- [ ] **`.gh-like-diffrc` 設定ファイル** — プロジェクトルートの `.gh-like-diffrc` または `package.json` の `gh-like-diff` フィールドから `--ignore` パターン等のデフォルト設定を読み込む仕組み
- [ ] **GitHub Actions CI** — push/PRでのビルド・テスト自動化、npm publish ワークフロー
- [ ] **npm publish 準備** — npm上の名前空間確認、`prepublishOnly` テスト、CHANGELOG.md の作成

### Nice to Have (v1.1)

- [ ] **ワード単位のdiffハイライト改善** — 現在のレンダラーは行単位の差分のみ表示。diff2htmlの `diffStyle: 'word'` パース結果を活用して変更箇所のインラインハイライトを表示
- [ ] **コンテキスト展開** — `@@` ハンクヘッダーのクリックで前後の追加コンテキスト行を読み込む機能（現在はCSSクラスのみ存在しスクリプト未実装）
- [ ] **サイドバーのファイルフィルター/検索** — ファイル数が多いdiffでサイドバー内をインクリメンタルに絞り込む入力欄
- [ ] **同期スクロールの改善** — side-by-side表示で左右テーブルのスクロールを完全同期（現在は基本実装済みだが行数不一致時にずれる場合がある）
- [ ] **Windowsパスハンドリング** — macOSで開発・テスト済み。Windows環境での `open` コマンド代替やパス区切り文字の対応確認
- [ ] **リネームファイルの移動検出表示** — `old → new` の表示はあるが、リネーム元/先の内容diffが見やすいレイアウトの検討
- [ ] **アクセシビリティ** — ARIAラベル、スクリーンリーダー対応、フォーカス管理
- [ ] **examplesディレクトリ** — 基本的な使用例、大規模diff例、カスタムテーマ例のサンプルHTML生成スクリプト

---

## Roadmap

### v1.5 — "The Collaborative Diff"
- **Inline comments** — Click a line number to add a comment; stored as JSON inside the HTML file
- **Comment import/export** — `gh-like-diff comments export review.html > comments.json`
- **Annotation mode** — Mark lines as "reviewed", "needs discussion", or "approved"
- **Interdiff** — `gh-like-diff interdiff v1.html v2.html` to compare two saved diffs
- **Plugin system** — `--plugin ./my-plugin.js` for custom toolbar buttons and rendering

### v2.0 — "The Smart Diff"
- **Function-level navigation** — tree-sitter WASM extracts function/class names; "symbols changed" summary
- **Image diff** — Side-by-side, onion-skin, and swipe comparison for PNG/JPG/SVG
- **AI review integration** — `--ai-review` embeds LLM suggestions as comments (BYOK)
- **Interactive staging** — `gh-like-diff stage` for a visual `git add -p` replacement
- **Syntax-aware folding** — Collapse unchanged functions, show only what changed

---

## Contributing

Contributions are welcome! Areas that would benefit most:

- **Tests** — Unit tests for parser, renderer, and CLI argument handling (`test/` is scaffolded and ready)
- **CI/CD** — GitHub Actions for build, test, and npm publish
- **Syntax highlighting** — Integrate highlight.js or Shiki for code coloring
- **Accessibility** — ARIA labels, screen reader support, focus management
- **Windows testing** — The tool is developed on macOS; Windows path handling may need fixes

---

## License

MIT
