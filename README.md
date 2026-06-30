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

### Line Highlighting & Range Select
Click any line number to highlight the row and update the URL hash (`#diff-{hash}L{num}`). Shift+click a second line to select a range — just like GitHub. Share the URL and the recipient will auto-scroll to the highlighted line.

### Inline Review Memos
Double-click a line number to attach a review note. Memos persist in `localStorage` and can be viewed in a side panel or exported as text. Perfect for offline code review without a PR.

### Review Progress Tracker
Each file has a "Viewed" checkbox. A progress bar in the toolbar shows `3/12 files reviewed`. Press `r` to toggle the current file. State persists across page reloads.

### Hunk Copy & File Filter
Copy a hunk's code (additions + context) to clipboard with one click. Filter files by name with the toolbar search box — both the diff cards and sidebar update in real time.

### Syntax Highlighting
Server-side syntax highlighting via highlight.js — only the CSS theme ships in the output HTML, not the highlight.js library itself. Supports 20+ languages (TypeScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, Swift, Kotlin, and more). Word-diff lines skip syntax coloring to avoid HTML nesting conflicts.

### Command Palette
Press `Cmd+K` (or `Ctrl+K`) to open a command palette with fuzzy search across files and built-in actions (view switching, theme toggle, search, export). Navigate with arrow keys, press Enter to execute.

### Toast Notifications
Non-intrusive feedback for clipboard operations — copy a file path or hunk code and see a slide-up confirmation toast that auto-dismisses.

### Minimap
A canvas-based diff overview on the right edge, showing addition (green), deletion (red), and hunk (blue) markers. Click or drag to jump to any position. Toggle with the toolbar button.

### Keyboard-First Navigation
Designed for developers who live in the terminal:

| Key | Action |
|-----|--------|
| `j` / `k` | Jump between files |
| `n` / `p` | Jump between hunks |
| `r` | Toggle "Viewed" for current file |
| `/` | Open search overlay |
| `b` | Toggle sidebar |
| `Cmd+K` | Command palette |
| `?` | Toggle keyboard shortcuts |
| `Escape` | Close overlays |

### File Tree Sidebar
A collapsible sidebar lists all changed files in a directory tree with:
- Collapsible directory nodes with folder icons
- File status icons (Added / Modified / Deleted / Renamed)
- Per-file addition/deletion bar chart
- Click-to-jump navigation
- Active file tracking on scroll

### In-Page Search
Press `/` to open a search overlay that highlights matches across the entire diff. Navigate results with `Enter` / `Shift+Enter`.

### Context Expansion
GitHub-style expand buttons on gap rows: ▲ (show lines above), ▼ (show lines below), and ↕ (show all hidden lines). Expands 20 lines per click, with full line-highlight and memo support on expanded rows.

### Accessibility
Semantic HTML with full ARIA support: `role` attributes on toolbar, main content, sidebar, and search overlay. Skip-to-content link, `aria-pressed` on toggle buttons, `aria-live` regions for dynamic content, and `progressbar` role on review progress.

### Print-Optimized
`@media print` rules hide all interactive chrome (toolbar, sidebar, minimap, buttons) and optimize the diff layout for paper. Print directly from the browser for code review meetings.

### Sidebar Change Heatmap
The sidebar uses a color-coded left border to visualize change intensity — files with more additions/deletions appear with a stronger red accent, making hotspots immediately visible.

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
│   │   ├── highlighter.ts         # Server-side syntax highlighting (highlight.js)
│   │   ├── parser.ts              # diff2html parse wrapper + metadata
│   │   ├── renderer.ts            # Custom HTML renderer (side-by-side + unified)
│   │   └── template.ts            # Full-page HTML assembly (CSS/JS inline)
│   └── ui/
│       ├── styles.ts              # GitHub-style CSS (light/dark, all components)
│       ├── scripts.ts             # Client JS aggregator
│       └── components/
│           ├── command-palette.ts # Cmd+K command palette with fuzzy search
│           ├── context-expand.ts  # ▲/▼/↕ context expansion
│           ├── file-tree.ts       # Sidebar toggle
│           ├── keyboard-nav.ts    # j/k/n/p/r navigation + scroll tracking
│           ├── line-highlight.ts  # Click-to-highlight + URL hash + range select
│           ├── line-memo.ts       # Inline review memos (localStorage)
│           ├── minimap.ts         # Canvas-based diff overview + navigation
│           ├── review-progress.ts # Per-file "Viewed" checkboxes + progress bar
│           ├── search.ts          # In-page search with highlight
│           ├── split-resizer.ts   # Drag-to-resize split view divider
│           ├── theme-toggle.ts    # Light/dark/auto switching
│           ├── toast.ts           # Toast notification system
│           ├── toolbar.ts         # View switching, file collapse, hunk copy, filter
│           └── virtual-scroll.ts  # Lazy loading for large files
├── tests/
│   ├── unit/                       # Vitest unit tests (64 tests)
│   │   ├── highlighter.test.ts
│   │   ├── parser.test.ts
│   │   ├── renderer.test.ts
│   │   └── template.test.ts
│   └── e2e/                        # Playwright E2E tests (54 tests)
│       ├── fixtures/generate-diff.ts
│       ├── accessibility.spec.ts
│       ├── context-expand.spec.ts
│       ├── file-collapse.spec.ts
│       ├── hunk-copy.spec.ts
│       ├── line-highlight.spec.ts
│       ├── line-memo.spec.ts
│       ├── new-features.spec.ts
│       └── review-progress.spec.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts                  # Build config (CJS + ESM + DTS)
├── vitest.config.ts
└── playwright.config.ts
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
- **highlight.js** — Server-side syntax highlighting (CSS theme only in output)
- **commander** — CLI argument parsing
- **vitest** — Unit test framework (64 tests)
- **Playwright** — E2E browser test framework (54 tests)

### Build Output

| File | Size | Purpose |
|------|------|---------|
| `dist/gh-like-diff.js` | 88 KB | CLI binary (Node.js) |
| `dist/index.mjs` | 80 KB | ESM library |
| `dist/index.js` | 81 KB | CJS library |
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

**Phase 6: GitHub互換 + 独自機能** — GitHubのdiff UIとのクリック挙動の差異を修正し、行ハイライト・範囲選択・URLハッシュ連動を実装。加えてオフライン・自己完結型の特性を活かした独自機能（インラインメモ、レビュー進捗トラッカー、ハンクコピー）を追加。Vitest + Playwright によるテストスイート整備。多角的なコードレビューで12件のバグ修正・セキュリティ改善を実施。

**Phase 7: モダンUX + 発展機能** — サーバーサイドシンタックスハイライト（highlight.js、CSSテーマのみ出力）、Cmd+Kコマンドパレット、トースト通知、Canvas minimap、ディレクトリツリーサイドバー、アクセシビリティ全面対応（ARIA roles/labels、semantic HTML、スキップリンク）を実装。side-by-side独立スクロール、embedモード最適化、split-resizerパフォーマンス改善などのバグ修正も実施。テストスイートを118テスト（ユニット64 + E2E 54）に拡充。

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

## Status & Roadmap

See [PROGRESS.md](PROGRESS.md) for known issues, TODO items, roadmap, and license compliance details.

---

## Contributing

Contributions are welcome! Areas that would benefit most:

- **CI/CD** — GitHub Actions for build, test, and npm publish
- **Live view switching** — Client-side re-render when toggling unified ↔ split view
- **stdin support** — Accept piped diff input from other commands
- **Image diff** — Side-by-side comparison for PNG/JPG/SVG changes

```bash
# Development
npm run build          # Build with tsup
npm run test           # Run vitest unit tests (64 tests)
npm run test:e2e       # Run Playwright E2E tests (54 tests)
npm run typecheck      # TypeScript type checking
```

---

## License

MIT
