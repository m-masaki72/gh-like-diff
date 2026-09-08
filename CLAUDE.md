# gh-like-diff

## プロジェクト概要
GitHub風のdiffビューを生成するCLIツール＆JSライブラリ。全CSS/JSをインラインで埋め込んだ自己完結型HTMLを出力し、file://プロトコルやオフライン環境で動作する。

## ビルド・テスト
- `npm run build` — tsup (esbuild) でCJS/ESM/DTSをビルド
- `npm run test` — vitest ユニットテスト (215テスト)
- `npm run test:e2e` — Playwright E2E テスト (118テスト × chromium/firefox/webkit)
- `npm run typecheck` — TypeScript型チェック

**E2E は `dist/` を読む。** src を直してテストする前に必ず `npm run build` すること。

### テストの原則
「要素が存在するか」だけを見るテストは配線切れもCSS欠落も検出できない。
`tests/e2e/chrome-integrity.spec.ts` は計算済みスタイル（位置・不透明度・サイズ）を
検証してCSSの巻き添え削除を捕まえる。fixture にはバイナリ・リネーム・空ファイル・
末尾改行なし・深い階層・長い行・絵文字を含めること（`edgeCasePageUrl`）。

## アーキテクチャ
- diff2htmlはパース専用。レンダリングは独自実装 (`src/core/renderer.ts`)
- highlight.jsはビルド時（Node.js側）で実行。出力HTMLにはCSSテーマのみ含む
- クライアントJSはIIFE文字列としてTypeScriptテンプレートリテラル内に記述
- `window.__gld` 名前空間で各コンポーネントのAPIを公開
- URLハッシュ (`#diff-{hash}L{num}`) で行ハイライト状態を共有可能
- Unified/Side-by-sideは両方同時にDOMにレンダリング（embed時は片方のみ）

### 二重ビューと `dom-utils`
両ビューが常にDOMにあり、片方は `display:none`。素の `document.querySelector` は
**非表示側を先に掴む**（sideが先に出力される）。非表示要素への `scrollIntoView` は無反応、
件数カウントは倍になる。

そのため diff 内容への問い合わせは必ず `src/ui/components/dom-utils.ts` の
`window.__gld.q()` / `qa()` を経由する。アクティブビュー配下に限定し、折りたたみ中・
フィルタ非表示のファイルも除外する（`offsetParent` ではなくクラス判定なのでリフローしない）。

### 状態の永続化
- キーは `computeDiffId(files)`（パス＋hunkヘッダのハッシュ）で **diffごとに分離**。
  リポジトリ名だけを使うと別diffにメモやレビュー済みが漏れる
- メモIDは「ファイルパス + side + 行番号」。ファイルindexは並び順が変わると壊れる
- テーマのみ `gld-theme` でdiff横断（外観はユーザー単位の選択のため）

### word-diff とシンタックスハイライト
`computeWordDiffRange()` はHTMLではなく**コードポイント単位のオフセット**を返し、
`wrapCharRange()` がハイライト済みHTMLのテキスト実行ごとに span を開閉する。
これによりタグのネストを壊さずに両立し、サロゲートペアの分割も起きない。

### コンテキスト展開
- 矢印はGitHub準拠。▼ はギャップ上端から下へ、▲ は下端から上へ伸びる
- `data-gap-id` にはビュー種別を含める（両ビューで衝突すると反対側のhunkヘッダを消す）
- 展開にはファイル全文が必要。`fileContents` が無いファイルは**展開ボタン自体を描画しない**
- CLI は diff の「+側」が指すリビジョンから読む (`resolveNewSideRef`)。
  作業ツリー固定にすると過去差分で無関係なコードを表示してしまう

### キーボード
`window.__gld.shortcutBlocked(e)` を必ず通す。修飾キー付き（Cmd+R/Cmd+P等）と
IME変換中（`isComposing`）を除外する。チェックボックスは入力欄扱いにしない。

## テンプレートリテラル内JSの注意点
- `${}` はesbuildにテンプレート式として解釈される。`{` `}` を含む正規表現は `String.fromCharCode()` で回避 (search.ts参照)
- `</script>` をJSON内に含めないよう `safeJson()` でエスケープ必須 (template.ts参照)

## コーディング規約
- クライアントJS内では `var` + `function` 宣言を使用（ES5互換、IE以外の全ブラウザ対応）
- イベントハンドラはインライン `onclick` 属性 + `window.__gld.*` で実装
- 新コンポーネント追加時は `src/ui/components/` に配置し `src/ui/scripts.ts` でimport
