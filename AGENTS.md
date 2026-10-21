# AGENTS.md

https://quojama.com/ の個人サイト。VSS でビルドし GitHub Pages で公開している。

- 返答・コミットメッセージは日本語。
- **`main` への push は即本番公開**。頼まれたときだけ commit / push する。
- 中身は `index.md`、テンプレートは `layouts/default.html`、CSS は `static/style.css`（色は `:root` の変数のみで管理）。
- `static/` 配下は `dist/` 直下にコピーされる（`static/CNAME` → `dist/CNAME`）。
- `dist/` と `vss` バイナリはビルド生成物なので編集・コミットしない。
- 確認は `make setup && make build`。
