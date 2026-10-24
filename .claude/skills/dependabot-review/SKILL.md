---
name: dependabot-review
description: quojama.com に届いた Dependabot の PR（GitHub Actions の更新）を調べ、マージしてよいかを判断し、許可が出たらマージして本番デプロイまで確かめる。「Dependabot の PR を見て」「プルリクをマージしていいか調べて」と言われたとき、または定期実行で使う。
---

# Dependabot の PR を調べて対応する

このリポジトリでは `main` へのマージがそのまま本番公開になる。調べるのは自由だが、**マージはユーザーの許可を得てから**行う（定期実行で動いているときは、マージせずに報告だけする）。

## 前提: PR の CI が緑でも安全とは限らない

`pages.yml` は `pull_request` のとき `configure-pages`・`upload-pages-artifact`・`deploy-pages` をスキップする。PR の CI で実際に動くのは `checkout` と VSS のビルドだけ。
なので、Pages 系の Action は **リリースノートを読んで判断し、マージ後の本番デプロイで確かめる**しかない。`links.yml` は schedule と手動実行でしか動かないので、PR では一切試されない。

## 手順

### 1. 一覧と差分を見る

```bash
gh pr list --author app/dependabot --json number,title,url
gh pr diff <番号>
gh pr checks <番号>
```

### 2. PR ごとに調べる

- **SHA がタグと一致するか**: diff の `uses: owner/repo@<SHA> # vX.Y.Z` を、`gh api repos/<owner>/<repo>/git/ref/tags/vX.Y.Z -q .object.sha` と照らす。食い違ったらマージしない（`object.type` が `tag` なら、もう一段 `git/tags/<sha>` を引いてコミットの SHA を出す）。
- **リリースノート**: 今の版から新しい版までのあいだを全部読む（`gh api "repos/<owner>/<repo>/releases?per_page=20"`）。メジャー版が上がるときは特に、次を確かめる。
  - 入力（`with:`）の廃止や名前の変更。このリポジトリで使っている入力に当たるか
  - 既定の動きの変更。例: `upload-pages-artifact` v4 以降はドットファイル（`.` で始まるファイル）を成果物に入れない。`static/` や `dist/` にドットファイルがあれば影響する（`find dist static -name '.*'` で確かめる）
  - Node.js のバージョン（GitHub ホストのランナーなら気にしなくてよい）
  - 組み合わせの条件（例: `upload-pages-artifact` と `deploy-pages` の対応する版）
- **CI**: `gh pr checks` の build が pass しているか。

### 3. 判断を報告する

PR ごとに、次の3つのどれかに分けて表で示す。

- **マージしてよい**: SHA が一致し、壊れる変更がこのリポジトリに当たらない
- **条件つき**: 他の PR と一緒に入れる必要がある、ワークフローの修正が要る、など
- **見送る**: SHA の不一致、使っている入力の廃止など

根拠（どのリリースノートのどの変更を見たか）を一行ずつ添える。そのうえで「マージしてよいか」をユーザーに聞く。

### 4. マージする（許可が出たら）

- `pages.yml` を触る PR は、マージのたびに本番デプロイが走る。**依存し合う PR の順番**に気をつける。`upload-pages-artifact` と `deploy-pages` が両方来ていたら、`deploy-pages` を先に入れる（新しい成果物の形式を古い deploy が読めない恐れがあるため）。
- マージは squash で、1件ずつ:

  ```bash
  gh pr merge <番号> --squash --delete-branch
  ```

- 次の PR が衝突していたら、PR に `@dependabot rebase` とコメントすると Dependabot が作り直す。終わるまで待ってからマージする。
- PR 本文やコメントに AI の署名やリンクを入れない（AGENTS.md のとおり）。

### 5. 本番を確かめる

マージした PR ごとに:

```bash
gh run list --workflow pages.yml --branch main --limit 1
gh run watch <run-id> --exit-status
curl -s https://quojama.com/ | grep -o 'style.css?v=[0-9]*'
```

- deploy まで成功し、本番の HTML が返ること。
- `checkout` や `lychee-action` を上げたときは、リンクチェックも手動で回す: `gh workflow run links.yml`

デプロイが失敗しても、GitHub Pages は前回のデプロイを出したままなので、サイトは落ちない。その場合はその PR のマージを `git revert` して push し、失敗したログ（`gh run view <run-id> --log-failed`）を添えてユーザーに報告する。

### 6. 最後に報告する

マージしたもの、見送ったもの（理由つき）、デプロイの結果、残った PR を短くまとめる。
