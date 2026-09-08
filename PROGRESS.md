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

### Phase 9: CI・クロスブラウザ・残課題の解消
- **stdin/パイプ入力** — `git diff | gh-like-diff`。リポジトリ不要。ローカルの同名ファイルを
  読むと無関係なコードを見せてしまうため、この経路では展開ボタンを出さない
- **CRLF の可視化** — 生diffから CR を拾い、新旧で**差があるときだけ**マーカーを出す
- **Unified の行番号を sticky 化** — 横スクロールで消えてクリックできなくなる問題を解消
- **900px以下で分割線を非表示** — `table-layout: auto` に切り替わりカラム境界と一致しないため
- **展開行のシンタックスハイライト** — hljs をクライアントに積まず、
  埋め込むソース自体をサーバ側でハイライト済みHTMLにして解決
- **GitHub Actions CI** — 既存はビルドと型チェックのみでテスト未実行だった。
  unit(node 18/20/22) と e2e(3ブラウザ) を分離し、concurrency・タイムアウト・
  Playwright ブラウザキャッシュ・失敗時のレポート回収・単一の必須チェックを追加
- **クロスブラウザE2E** — Firefox と WebKit を追加し、**実バグを2件検出**:
  Firefox のフォーム状態復元でリセット後も ✓ が残る / WebKit に `-webkit-user-select` が無く
  行番号がコピーに混入する

**性能実測**（50ファイル・20,000変更行）: parse 10ms / generate 517ms / HTML 17.25MB /
ブラウザ読込 832ms / 検索 約270ms / ビュー切替 約450ms。
動作は実用範囲。サイズは第2ビューがほぼ半分（片ビューなら 7.42MB）を占める。

**テスト:** 214 → 単体215 + E2E118×3ブラウザ

### Phase 10: 計測・UX・サイズをテストに落とす
- **性能回帰テスト** — 一度きりの実測を `performance.test.ts` に固定。サイズは決定的なので
  厳しく（1変更行あたり1100B未満・線形成長）、時間はスケーリング比で O(n²) を検出する
- **キーボード/フォーカスのE2E** — スキップリンク、Tab到達性、ダイアログのフォーカス取得と復帰、
  コマンドパレットの矢印選択、progressbar の aria-valuetext、live region
- **a11y の実バグ2件を修正** — チェブロンに `aria-expanded`/`aria-controls` が無かった /
  **閉じたメモパネルがタブ順に残り**、画面外のボタンにフォーカスが乗っていた
  （画面外配置だけでは不十分で `visibility` が必要）
- **`--single-view`** — 片ビューのみ描画して**約48%削減**。切替トグルは静的ラベルに置き換え、
  `data-single-view` でクライアント側の切替も拒否する（保存済み設定で白紙になるのを防ぐ）
- WebKit は既定でボタンを Tab 順に含めないため、Tab走査テストは2ブラウザ限定にし、
  全ブラウザ向けに「focus 可能か」の等価テストを追加

**テスト:** 単体228 + E2E141×3ブラウザ

### Phase 11: 設定ファイルと公開準備
- **`.gh-like-diffrc`** — style / colorScheme / context / ignore / singleView / noOpen。
  commander の `getOptionValueSource` で「CLIで明示指定したか」を判定しないと
  設定ファイルが既定値に常に負けるため、そこを起点に優先順位を実装
- 不正な設定は**警告して読み飛ばす**（差分が読めなくなる方が困る）。
  未知キーもタイポ検出のため警告する。適用元のパスはサマリに表示
- **公開準備** — CHANGELOG.md、sourcemap 除外、`prepublishOnly`。
  `npm pack --dry-run --json` の結果をテストで検証し、src/tests/PROGRESS.md の
  混入と .map の同梱を防ぐ

**テスト:** 単体262 + E2E141×3ブラウザ

### Phase 12: 静的解析・カバレッジ・出力サイズ
- **ESLint 導入** — 型情報付きルール。`program.opts()` が `any` を返すため
  **CLI入力の型検査が完全に無効**だったのを発見して修正。`no-floating-promises` も有効化
- **カバレッジを意味のある数字に** — ナイーブな計測では `src/ui/*` が100%（テンプレート
  文字列を返すだけの関数なので中身は未測定）、`bin/*` が0%（spawn で叩くため計測外）と
  嘘をつく。両方を理由付きで除外して 87.96% → **99.16%**。手薄だった `getDiffStats` などを追加
- **SVGスプライト化** — 409個中ユニークは15個で、重複が11%を占めていた。**119KB削減**
- **横スクロール同期** — 同じ行の左右セルを連動。長い行の左右比較が1回のスクロールで済む
- ダークCSS統合は **費用対効果が合わないため見送り**（理由は Known Issues に記載）

- **README にスクリーンショット** — 生成スクリプトをリポジトリに置き、
  画像が陳腐化しないようにした。参照先の実在もテストで検査する

**テスト:** 単体321 + E2E145×3ブラウザ / lint・カバレッジ閾値も CI で強制

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
- [x] ~~**`.gh-like-diffrc` 設定ファイル**~~ — 最寄り優先で1ファイルのみ読む。
      CLI > 設定ファイル > 既定値。「何を diff するか」(refs/--staged/-f) は意図的に対象外
- [x] ~~**GitHub Actions CI**~~ — unit(node 18/20/22) + e2e(chromium/firefox/webkit) を
  concurrency・job/step タイムアウト・失敗時のレポート回収付きで自動化。
  npm publish ワークフローは未着手
- [x] ~~**npm publish 準備**~~ — CHANGELOG.md 作成、sourcemap を公開物から除外
      （283kB → 131kB / 展開後 1.2MB → 529kB）、`prepublishOnly` で typecheck+test+build。
      **npm 上の名前空間確認は未実施**（要ユーザー対応）
- [x] ~~**stdin/パイプ入力**~~ — `git diff | gh-like-diff` に対応。リポジトリ外でも動作する
- [x] ~~**ARIA属性**~~ — semantic HTML、ARIA roles/labels、スキップリンク実装済み

### Nice to Have (v1.1)

- [x] ~~**同期スクロールの改善**~~ — 同じ行の左右セルの横スクロールを同期。
      1行分の相手セルだけを触るので、行数によらず一定コスト
- [ ] **リネームファイルの移動検出表示** — リネーム元/先の見やすいレイアウト
- [x] ~~**examplesディレクトリ**~~ — `scripts/screenshots.mjs` が実 git リポジトリを作って
      サンプル差分を生成し、README 用の画像を撮る（`npm run screenshots`）
- [ ] **ダークモードCSS統合** — **見送り**。重複は3.5KB / 全36.9KB の固定コストにすぎず、
      `@media (prefers-color-scheme)` と `[data-theme]` は入れ子の階層が違うため
      セレクタを並べて統合できない。`light-dark()` は対応ブラウザを絞る。
      本来の危険（片方だけに変数を足す事故）は `styles.test.ts` の対称性検査で塞いである
- [x] ~~**SVGアイコン統合**~~ — `<symbol>` + `<use>` のスプライト化。
      50ファイルの差分で 1505.7KB → 1386.6KB（**119KB削減**、SVG部分は 166KB → 47KB）

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
