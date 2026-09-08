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

### Phase 8: ブラウザUX総点検
実機（Playwright + スクリーンショット目視）で全機能を操作し、静的調査では見えなかった
不具合を洗い出して修正。

**根本原因は3つに集約された:**
1. **二重ビュー** — unified/side を両方DOMに出しながら素の `querySelector` を使い、
   検索件数が倍増、共有URLが飛ばない、メモバッジが片方にしか出ない、展開が反対ビューを壊す
2. **修飾キー無視** — `Cmd+R`/`Cmd+P`/`Cmd+J` が奪われ、IME変換確定のEnterが誤爆
3. **localStorageキーがリポジトリ名依存** — 別diffにメモとレビュー済みが漏れる

**その他の修正:** 巨大ファイルが永久に開けない (`renderFile` 未定義) / 展開矢印の向きと
展開範囲 / 削除ファイルが `/dev/null` 表示・偽の `dev/` フォルダ / サイドバーのアクティブ表示が
別ファイル / ダークモードのタグがコントラスト比2.2 / 絵文字のサロゲートペア分割 /
変更行にシンタックスハイライトが乗らない / 末尾改行の変更が不可視 / 狭い画面でツールバーに
到達不能 / ミニマップが右端48pxを覆い無効化不可

**追加したUX機能:** 折り返しトグル、ミニマップ表示トグル、状態リセット、未レビューのみ表示、
次の未レビューへジャンプ、検索の追加/削除行絞り込み、ショートカット一覧ダイアログ、
Markdownメモエクスポート、新側だけコピー、各種設定の永続化、失敗時のトースト通知

**テスト:** 118 → 214件 (単体102 + E2E112)。E2E fixture に意地悪ケースを追加し、
CSS巻き添え削除を検出する `chrome-integrity.spec.ts` を新設

---

## Known Issues

### Must Fix (v1.0 patch)

- [x] ~~**ライブビュー切替の再レンダー未実装**~~ — 両ビューを同時にDOMへ出す構成を維持しつつ、
  切替時にスクロール位置をアンカー復元し、検索ハイライトを張り替えるようにした
- [x] ~~**バイナリファイル・空ファイルの表示**~~ — バイナリ/リネームのみ/モード変更のみ/空ファイルに
  理由を明示するフォールバック行を追加 (`emptyBodyReason`)
- [x] ~~**遅延読み込み未接続**~~ — `window.__gld.renderFile` が未定義で「Loading...」から復帰しない
  経路だったため、遅延ロード自体を撤去して全ファイルをサーバ側で描画する方針に統一

### Should Fix (v1.0.x)

- [x] ~~**シンタックスハイライト**~~ — highlight.js によるサーバーサイドハイライト実装済み
- [ ] **`.gh-like-diffrc` 設定ファイル** — デフォルト設定の読み込み
- [ ] **GitHub Actions CI** — ビルド・テスト自動化、npm publish ワークフロー
- [ ] **npm publish 準備** — npm上の名前空間確認、CHANGELOG.md の作成
- [ ] **stdin/パイプ入力** — `git diff | gh-like-diff` のようなパイプ入力に未対応
- [x] ~~**ARIA属性**~~ — semantic HTML、ARIA roles/labels、スキップリンク実装済み

### Nice to Have (v1.1)

- [ ] **同期スクロールの改善** — side-by-side表示で行数不一致時のずれ対応
- [ ] **リネームファイルの移動検出表示** — リネーム元/先の見やすいレイアウト
- [ ] **examplesディレクトリ** — 使用例のサンプルHTML生成スクリプト
- [ ] **ダークモードCSS統合** — 重複したダークモードスタイルの統合
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
