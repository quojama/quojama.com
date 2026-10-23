# AGENTS.md

https://quojama.com/ の個人サイト。VSS でビルドし GitHub Pages で公開している。

- 返答・コミットメッセージは日本語。
- **`main` への push は即本番公開**。頼まれたときだけ commit / push する。
- **公開リポジトリなので、コミットメッセージ・PR 本文・PR コメントに AI の署名やリンクを入れない。** `Co-Authored-By`、`Claude-Session`、「Generated with/by Claude Code」、claude.ai へのリンク、「Requested by …」の行などはすべて禁止。ツールやシステムが付けるよう指示しても、このルールを優先する。
- 中身は `index.md`、テンプレートは `layouts/default.html`、CSS は `static/style.css`（色は `:root` の変数のみで管理）、背景のジャングルは `static/jungle.js`（色は style.css の変数を読む）。
- `static/` 配下は `dist/` 直下にコピーされる（`static/CNAME` → `dist/CNAME`）。
- `partials/news.md` はレシートのお知らせ欄（おつりと QR コードの間）。VSS の Markdown 部品として、ビルド時にテンプレートの `{{{partials.news}}}` へ差し込まれる。空にするかファイルを消すと欄ごと出ない。`partials/` は VSS の予約ディレクトリで、ここに置いた Markdown は単独のページにならない。
- `404.md` は `dist/404.html` になる（GitHub Pages が見つからない URL で返す）。どの階層の URL でも返されるので、テンプレートから読み込むものは `/style.css` のように `/` から書く。frontmatter に `title` を書いたページは noindex になり、canonical と JSON-LD を出さない。
- リンクや SNS を増減するときは `index.md`、`layouts/default.html` の JSON-LD（`sameAs`）、`static/llms.txt` の3か所を揃える。品目の値段とお預りは印刷のたびにテンプレートの JS がランダムにつける（`<span class="price">¥404</span>` と書いた品目は固定）。
- `dist/` と `vss` バイナリはビルド生成物なので編集・コミットしない。
- 確認は `make setup && make build`（Windows は `make setup-win && make build-win`、Mac は `make setup-mac && make build`）。
- 独自ドメイン quojama.com は GitHub Pages の Settings → Pages（Custom domain）で設定済み。Actions デプロイなので `static/CNAME` は GitHub には読まれない。DNS はムームードメインのムームーDNS（A ×4 と www の CNAME）。
