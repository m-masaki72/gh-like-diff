# gh-like-diff — Progress & Roadmap

## Development History

### Phase 1: Prototype
Bash script (`gdiff`) wrapping `git diff` + `diff2html-cli` with custom HTML template (~200 lines).

### Phase 2: Research
Ecosystem survey across 15+ sources (diff2html-cli, delta, difftastic, GitHub, Gerrit, HackerNews). Identified 10 critical pain points: navigation, performance, shareability.

### Phase 3: Architecture Design
Library structure, custom renderer strategy, client-side JS embedding, phased roadmap.

### Phase 4: v1.0 Implementation
1,700 lines of TypeScript — CLI layer, core engine, UI components. End-to-end tested on real Unity project.

### Phase 5: Documentation
README and project documentation.

### Phase 6: GitHub互換 + 独自機能
- GitHub-compatible click behavior (line highlight, range select, URL hash)
- Offline-first unique features: inline memos, review progress tracker, hunk copy
- Test suite (57 tests at the time)
- Code review: 12 bug fixes + security improvements

### Phase 7: モダンUX + 発展機能
- Server-side syntax highlighting (highlight.js, CSS theme only in output)
- Cmd+K command palette with fuzzy search
- Toast notifications for clipboard feedback
- Canvas-based minimap with click/drag navigation
- Directory tree sidebar with collapsible folders
- Accessibility overhaul (ARIA roles/labels, semantic HTML, skip link)
- Side-by-side independent cell scroll
- Embed mode optimization (single view rendering)
- Split-resizer performance fix (CSS custom property only)
- Test suite expanded to 118 tests (64 unit + 54 E2E)

---

## Known Issues

### Must Fix (v1.0 patch)

- [ ] **ライブビュー切替の再レンダー未実装** — Unified ↔ Split ボタンはUI上存在するが、クライアント側で切替時のDOM再描画が行われない。埋め込みJSONデータの更新のみ対応済み
- [ ] **バイナリファイル・空ファイルの表示** — バイナリファイルや空diffが含まれる場合のフォールバック表示がない
- [x] ~~**遅延読み込み未接続**~~ — `maxLinesBeforeLazy: Infinity` に設定し無効化。クライアント側レンダリングの代わりに全ファイルをサーバー側で描画

### Should Fix (v1.0.x)

- [x] ~~**シンタックスハイライト**~~ — highlight.js によるサーバーサイドハイライト実装済み（CSSテーマのみ出力HTML内に含む）
- [ ] **`.gh-like-diffrc` 設定ファイル** — デフォルト設定の読み込み
- [ ] **GitHub Actions CI** — ビルド・テスト自動化、npm publish ワークフロー
- [ ] **npm publish 準備** — npm上の名前空間確認、CHANGELOG.md の作成
- [ ] **stdin/パイプ入力** — `git diff | gh-like-diff` のようなパイプ入力に未対応
- [x] ~~**ARIA属性**~~ — semantic HTML要素、ARIA roles/labels、スキップリンク、aria-pressed/aria-live 実装済み

### Nice to Have (v1.1)

- [ ] **同期スクロールの改善** — side-by-side表示で行数不一致時のずれ対応
- [ ] **リネームファイルの移動検出表示** — リネーム元/先の見やすいレイアウト
- [ ] **examplesディレクトリ** — 使用例のサンプルHTML生成スクリプト
- [ ] **ダークモードCSS統合** — 重複したダークモードスタイル (~1.5KB) の統合
- [ ] **SVGアイコン統合** — インラインで重複しているSVGアイコンの共通化

---

## Roadmap

### v1.5 — "The Collaborative Diff"
- **Comment import/export** — `gh-like-diff comments export review.html > comments.json`
- **Annotation mode** — Mark lines as "reviewed", "needs discussion", or "approved"（基本的なレビュー進捗は実装済み）
- **Interdiff** — `gh-like-diff interdiff v1.html v2.html` to compare two saved diffs
- **Plugin system** — `--plugin ./my-plugin.js` for custom toolbar buttons and rendering

### v2.0 — "The Smart Diff"
- **Function-level navigation** — tree-sitter WASM extracts function/class names; "symbols changed" summary
- **Image diff** — Side-by-side, onion-skin, and swipe comparison for PNG/JPG/SVG
- **AI review integration** — `--ai-review` embeds LLM suggestions as comments (BYOK)
- **Interactive staging** — `gh-like-diff stage` for a visual `git add -p` replacement
- **Syntax-aware folding** — Collapse unchanged functions, show only what changed

---

## License Compliance

All dependencies are MIT-compatible:

| Package | Version | License | Role |
|---------|---------|---------|------|
| commander | ^12.0.0 | MIT | CLI argument parsing |
| diff2html | ^3.4.48 | MIT | Unified diff parsing |
| highlight.js | ^11.11.0 | BSD-3-Clause | Server-side syntax highlighting |
| typescript | ^5.5.0 | Apache-2.0 | Build-time only (devDep) |
| tsup | ^8.0.0 | MIT | Build-time only (devDep) |
| vitest | ^2.0.0 | MIT | Test-time only (devDep) |
| @playwright/test | ^1.61.1 | Apache-2.0 | Test-time only (devDep) |

BSD-3-Clause (highlight.js) requires attribution in redistribution. The highlight.js CSS theme is included in output HTML; the JS library itself is not shipped (runs at build time only).
