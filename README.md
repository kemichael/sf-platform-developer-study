# Salesforce 認定 Platform デベロッパー 学習ノート

Trailhead の教材をもとに作成した、**単一HTML・完全オフライン**で動作する学習サイトです。29＋トピック / 117 ユニットを 1 つの `index.html` に内蔵しています。

## 公開サイト（GitHub Pages）

👉 **https://kemichael.github.io/sf-platform-developer-study/**

## 主な機能

- サイドバーナビ（トピック → ユニットのツリー）
- 全文検索（`/` キーでフォーカス）
- 学習進捗チェック（ブラウザに保存）／全体・トピック別の進捗バー
- ユニット内の追従目次（スクロールスパイ）
- ダーク / ライトテーマ切替
- Apex / SOQL / JavaScript などのシンタックスハイライト＋ワンクリックコピー
- 用語解説・具体例・試験ポイント・注意・操作手順・まとめの 6 種コールアウト、図解パネル、要点カード

## ローカルで開く

`index.html` をブラウザでそのまま開くだけで全機能が動作します（ネット接続不要）。

## ビルド方法（教材を編集した場合）

教材ソースは `base-text/` 配下の Markdown です。編集後、次を実行すると `index.html` が再生成されます。

```bash
node build/normalize.js   # コールアウト記法の正規化
node build/build.js        # 全教材・ライブラリを index.html に結合
```

## 構成

```
index.html          ← 生成物（これ単体で動作）
base-text/          ← 教材ソース（Markdown）
build/
  build.js          ← ビルドスクリプト
  template.html     ← HTML 骨格
  styles.css        ← スタイル
  app.js            ← 表示ロジック
  vendor/           ← marked / Prism（オフライン用に同梱）
```

## ライセンス / 出典

教材本文は [Salesforce Trailhead](https://trailhead.salesforce.com/) の内容をもとにした学習用のまとめです。各コンテンツの権利は Salesforce に帰属します。本リポジトリは個人の学習目的で作成しています。
