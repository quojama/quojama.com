# quojama.com

https://quojama.com/ の個人サイト。旧 WordPress（ロリポップ）から About・Portfolio・Blog を移してきた。

- 静的サイトジェネレーター: [VSS](https://github.com/veltiosoft/vss)
- ホスティング: GitHub Pages（`main` に push → Actions でビルド → 公開）

## ローカルで動かす

`git` と `make` が必要。

```bash
git clone https://github.com/quojama/quojama.com.git
cd quojama.com
make setup-mac   # VSS 本体を取得（初回のみ）
make serve       # http://localhost:8080 でプレビュー
```

| 目的 | macOS (Apple Silicon) | macOS (Intel) | Windows | Linux |
|---|---|---|---|---|
| VSS 取得（初回のみ） | `make setup-mac` | `make setup-mac-intel` | `make setup-win` | `make setup` |
| ビルド（`dist/` に出力） | `make build` | `make build` | `make build-win` | `make build` |
| プレビュー | `make serve` | `make serve` | `make serve-win` | `make serve` |

`vss` バイナリと `dist/` は `.gitignore` 済み。

## 更新

- リンク: `index.md`
- About: `about/index.md`
- Portfolio: 一覧は `portfolio/index.md`、各作品は `portfolio/<slug>/index.md`
- Blog: 一覧は `blog/index.md`、各記事は `<slug>/index.md`（旧 WordPress と同じ URL）
- 画像: `static/wp-content/uploads/`（旧 WordPress と同じパス）
- テンプレート: `layouts/default.html`
- 見た目: `static/style.css`（色は `:root` の変数で管理）

`main` に push すると数分で本番に反映される。
