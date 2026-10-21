# AGENTS.md

https://quojama.com/ の個人サイト。VSS でビルドし GitHub Pages で公開している。

- 返答・コミットメッセージは日本語。
- **`main` への push は即本番公開**。頼まれたときだけ commit / push する。
- 中身は `index.md`、テンプレートは `layouts/default.html`、CSS は `static/style.css`（色は `:root` の変数のみで管理）。
- 旧 WordPress のページは旧 URL と同じパスに置いている（`about/`、`portfolio/<slug>/`、`blog/`、記事は `<slug>/`）。画像は `static/wp-content/uploads/`。URL を変えると外部からのリンクが切れるので、パスは変えない。
- 移さなかった旧ページ（`/tumblr/`、`/test-post/`、`/contact/`、`/tclmx-001/`）は `static/<slug>/index.html` の meta refresh で転送している。
- ページ内のリンク・画像・CSS はルート相対（`/style.css`、`/wp-content/...`）。
- VSS の Markdown は `<iframe>` を通さない。YouTube などはリンクで貼る。
- `static/` 配下は `dist/` 直下にコピーされる（`static/CNAME` → `dist/CNAME`）。
- `dist/` と `vss` バイナリはビルド生成物なので編集・コミットしない。
- 確認は `make setup && make build`（Windows は `make setup-win && make build-win`、Mac は `make setup-mac && make build`）。
- 独自ドメイン（quojama.com）は未設定。DNS はまだロリポップ/旧 WordPress を向いている。
