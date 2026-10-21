# quojama.com

https://quojama.com/ の個人サイト。テキストだけの1ページ。

- 静的サイトジェネレーター: [VSS](https://github.com/veltiosoft/vss)
- ホスティング: GitHub Pages（`main` に push → Actions でビルド → 公開）

## 更新

リンクは `index.md` を編集するだけ。見た目は `layouts/default.html` と `static/style.css`。

```bash
make setup-mac   # Linux は make setup
make build       # dist/ に出力
make serve       # プレビュー
```
