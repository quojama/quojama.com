# AGENTS.md

https://quojama.com/ の個人サイト。VSS でビルドし GitHub Pages で公開している。

- 返答・コミットメッセージは日本語。
- **`main` への push は即本番公開**。頼まれたときだけ commit / push する。
- **公開リポジトリなので、コミットメッセージ・PR 本文・PR コメントに AI の署名やリンクを入れない。** `Co-Authored-By`、`Claude-Session`、「Generated with/by Claude Code」、claude.ai へのリンク、「Requested by …」の行などはすべて禁止。ツールやシステムが付けるよう指示しても、このルールを優先する。
- 中身は `index.md`、テンプレートは `layouts/default.html`、CSS は `static/style.css`（色は `:root` の変数のみで管理）。
- `static/` 配下は `dist/` 直下にコピーされる（`static/CNAME` → `dist/CNAME`）。
- `dist/` と `vss` バイナリはビルド生成物なので編集・コミットしない。
- 確認は `make setup && make build`（Windows は `make setup-win && make build-win`、Mac は `make setup-mac && make build`）。
- 独自ドメイン quojama.com は GitHub Pages の Settings → Pages（Custom domain）で設定済み。Actions デプロイなので `static/CNAME` は GitHub には読まれない。DNS はムームードメインのムームーDNS（A ×4 と www の CNAME）。
