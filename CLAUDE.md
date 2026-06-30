# gh-like-diff

## プロジェクト概要
GitHub風のdiffビューを生成するCLIツール＆JSライブラリ。全CSS/JSをインラインで埋め込んだ自己完結型HTMLを出力し、file://プロトコルやオフライン環境で動作する。

## ビルド・テスト
- `npm run build` — tsup (esbuild) でCJS/ESM/DTSをビルド
- `npm run test` — vitest ユニットテスト (64テスト)
- `npm run test:e2e` — Playwright E2E テスト (54テスト)
- `npm run typecheck` — TypeScript型チェック

## アーキテクチャ
- diff2htmlはパース専用。レンダリングは独自実装 (`src/core/renderer.ts`)
- highlight.jsはビルド時（Node.js側）で実行。出力HTMLにはCSSテーマのみ含む
- クライアントJSはIIFE文字列としてTypeScriptテンプレートリテラル内に記述
- `window.__gld` 名前空間で各コンポーネントのAPIを公開
- メモ・レビュー状態はlocalStorageに永続化
- URLハッシュ (`#diff-{hash}L{num}`) で行ハイライト状態を共有可能
- word-diff行はシンタックスハイライトをスキップ（HTMLタグのネスト競合回避）
- Unified/Side-by-sideは両方同時にDOMにレンダリング（embed時は片方のみ）

## テンプレートリテラル内JSの注意点
- `${}` はesbuildにテンプレート式として解釈される。`{` `}` を含む正規表現は `String.fromCharCode()` で回避 (search.ts参照)
- `</script>` をJSON内に含めないよう `safeJson()` でエスケープ必須 (template.ts参照)

## コーディング規約
- クライアントJS内では `var` + `function` 宣言を使用（ES5互換、IE以外の全ブラウザ対応）
- イベントハンドラはインライン `onclick` 属性 + `window.__gld.*` で実装
- 新コンポーネント追加時は `src/ui/components/` に配置し `src/ui/scripts.ts` でimport
