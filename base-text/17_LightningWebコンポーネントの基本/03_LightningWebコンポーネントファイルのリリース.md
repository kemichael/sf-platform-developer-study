# Lightning Web コンポーネントファイルのリリース

## 学習の目的

この単元を完了すると、次のことができるようになります。

- 組織で表示する Lightning Web コンポーネントファイルを設定する。
- ファイルを組織にリリースする。
- 組織環境でコンポーネントの動作を確認する。

> [!ポイント] この単元のゴール
>
> 作成したコンポーネントを組織で表示する流れは、(1) **`.js-meta.xml` 設定ファイル**を用意 → (2) **組織にリリース（デプロイ）** → (3) **Lightning アプリケーションビルダー**でページに配置。とくに `isExposed` と `targets` の意味は試験で問われます。

---

## 組織で使用するための Lightning Web コンポーネントファイルの設定

前単元の自転車コンポーネントを作成して組織にプッシュします。このコンポーネントには次のファイルが必要です。

- bikeCard.html
- bikeCard.js
- bikeCard.js-meta.xml

> [!注意] CSS ファイルは不要
>
> 独自のスタイルを設定していないため CSS ファイルは不要です。CSS は見た目を整えたいときだけ追加する任意ファイルです。

> [!用語] リリース（デプロイ：Deploy）
>
> ローカル（VS Code）で作成したコンポーネントのファイルを、実際の Salesforce 組織へ送り込んで使えるようにすること。「組織にプッシュする」とも言います。

> [!手順] bikeCard コンポーネントのファイルを作成する
>
> 1. bikeCard プロジェクトを続行する。
> 2. `force-app/main/default` の `lwc` フォルダーを右クリックし **[SFDX: Create Lightning Web Component]** を選択。
> 3. コンポーネント名に `bikeCard` と入力。
> 4. Enter キーを押し、もう一度 Enter でデフォルトの `force-app/main/default/lwc` を受け入れる。

`force-app\main\default\lwc\bikeCard` に次のように表示されます。

```text
lwc/
└── bikeCard/
    ├── bikeCard.html
    ├── bikeCard.js
    └── bikeCard.js-meta.xml   ← 設定（メタデータ）ファイル
```

Salesforce Platform ではフォルダー名・ファイル名にハイフンを使えないため、キャメルケースの命名規則を使います。各ファイルの内容をコピーして置き換えます。

### bikeCard.html

```html
<template>
  <div>
    <div>Name: {name}</div>
    <div>Description: {description}</div>
    <lightning-badge label={material}></lightning-badge>
    <lightning-badge label={category}></lightning-badge>
    <div>Price: {price}</div>
    <div><img src={pictureUrl} alt={name}/></div>
  </div>
</template>
```

### bikeCard.js

```javascript
import { LightningElement } from 'lwc';
export default class BikeCard extends LightningElement {
  name = 'Electra X4';
  description = 'A sweet bike built for comfort.';
  category = 'Mountain';
  material = 'Steel';
  price = '$2,700';
  pictureUrl = 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/ebikes/electrax4.jpg';
}
```

### bikeCard.js-meta.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <!-- The apiVersion may need to be increased for the current release -->
    <apiVersion>63.0</apiVersion>
    <isExposed>true</isExposed>
    <masterLabel>Bike Card</masterLabel>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>
```

ファイルを保存します。

---

## コンポーネント設定ファイル

`.js-meta.xml` は、Lightning アプリケーションビルダーでの使用を目的とする設計設定を含む Salesforce のメタデータファイルです。組織のコンテンツを使い始めるには、このファイルが必要です。

> [!用語] コンポーネント設定ファイル（`.js-meta.xml`）
>
> コンポーネントを「どの API バージョンで」「どこに表示できるか」を Salesforce に伝える設定ファイル（メタデータ）。**このファイルがないと組織にリリースできず、画面にも配置できません**。HTML・JS と同じフォルダーに同じ名前で置きます。

> [!用語] メタデータ（Metadata）
>
> 「データについてのデータ」。ここではコンポーネントの中身ではなく、**設定情報**（API バージョンや表示先など）を指します。

ebikes リポジトリの例を示します（全コンポーネントにこの設定ファイルがあります）。

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>63.0</apiVersion>
  <isExposed>true</isExposed>
  <masterLabel>Product Card</masterLabel>
  <targets>
    <target>lightning__AppPage</target>
    <target>lightning__RecordPage</target>
    <target>lightning__HomePage</target>
    <target>lightningCommunity__Page</target>
  </targets>
  <targetConfigs>
    <targetConfig targets="lightning__RecordPage">
      <objects>
        <object>Product__c</object>
      </objects>
    </targetConfig>
  </targetConfigs>
</LightningComponentBundle>
```

主要なタグを整理します。

| タグ | 必須/省略可 | 意味 |
| --- | --- | --- |
| `apiVersion` | 必須 | コンポーネントを Salesforce API バージョンにバインドする |
| `isExposed` | 必須 | `true` でビルダーに公開、`false` で非公開 |
| `targets` | 省略可 | コンポーネントを追加できる Lightning ページの種別 |
| `targetConfigs` | 省略可 | ページ種別ごとの固有の動作（対応オブジェクトなど）を指定 |

ビルダー／エクスペリエンスビルダーで使えるようにするには、`isExposed` を `true` にし、`<target>` を1つ以上定義します。

> [!用語] `isExposed`（公開フラグ）
>
> ビルダーで使えるようにするかを `true`/`false` で指定。**`false` だとビルダーに一切表示されません**。配置したいなら必ず `true` にします。

> [!用語] `targets`（ターゲット）
>
> コンポーネントを配置できる**ページの種別**を指定するタグ。例：`lightning__AppPage`（アプリケーションページ）、`lightning__RecordPage`（レコードページ）、`lightning__HomePage`（ホームページ）。`isExposed` を `true` にしたら `<target>` を1つ以上書く必要があります。

> [!ポイント] ビルダーに表示する2条件
>
> 試験頻出。Lightning アプリケーションビルダーに表示させるには、(1) **`isExposed` を `true`**、(2) **`<target>` を1つ以上定義**、の両方が必要。どちらか欠けると表示されません。

---

## 組織にコンポーネントを表示

LWC を UI に表示するには2つのオプションがあります。

1. flexipage 型（home、record home など）をサポートするよう設定し、Lightning アプリケーションビルダーで flexipage に追加する（最もシンプル。この単元で使用）。
2. LWC を含む Aura コンポーネントを参照するタブを作成する（ラッパーコンポーネント・タブ・表示設定・デフォルトのアプリケーション設定ファイルが必要）。

> [!用語] flexipage（フレキシページ）/ Lightning アプリケーションビルダー
>
> - **flexipage**：ドラッグ＆ドロップで部品を配置して作る Lightning ページ。
> - **Lightning アプリケーションビルダー（Lightning App Builder）**：その flexipage をコードなしで作成・編集する画面ツール。作成した LWC をマウス操作で配置できます。

---

## ファイルのリリース

> [!手順] 組織を承認してリリースする
>
> 1. コマンドパレットの **[SFDX: Authorize an Org]** で組織を承認する。別名はプロジェクトのデフォルト（`default`）を受け入れ、要求されたら **[Allow]** をクリック。
> 2. **[force-app/main/default]** フォルダーを右クリックし **[SFDX: Deploy This Source to Org]** を選択。

> [!用語] 組織を承認（Authorize an Org）
>
> VS Code から特定の Salesforce 組織に接続する許可を与える操作。一度承認しておくと、その後はコマンドでリリースや組織オープンができます。

---

## ebike 画像を表示させる

使用する画像は Amazon AWS にホストされています。表示するには画像の URL を信頼済み URL リストに追加します。

> [!用語] 信頼済み URL（Trusted URLs）
>
> 外部リソース（ここでは画像）への接続を「安全なものとして許可する」ために登録する URL のリスト。許可していない外部 URL の読み込みはブロックされるため、外部画像の表示には登録が必要です。

> [!手順] 信頼済み URL に画像のホストを追加する
>
> 1. コマンドパレットの **[SFDX: Open Default Org]** で組織を開く。
> 2. **[Setup]** の **[Quick Find]** に `trusted urls` と入力し、**[Trusted URLs]** を選択。
> 3. **[New Trusted URL]** をクリック。
> 4. **[API Name]** に `ebikes` と入力。
> 5. **[URL]** に `https://s3-us-west-2.amazonaws.com` と入力。
> 6. **[Description]** に `Allow ebike images to display` と入力。
> 7. **[Active]** はオンのまま。
> 8. **[img-src (images)]** が選択されていることを確認。
> 9. **[保存]** をクリック。

---

## コンポーネントの新しいページの作成

設定ファイルでビルダーでの使用を有効にしたので、UI でアプリケーションを作成しコンポーネントを追加します。

> [!手順] アプリケーションページを作成してコンポーネントを配置する
>
> 1. コマンドパレットの **[SFDX: Open Default Org]** で組織を開く。
> 2. **[設定]** の **[クイック検索]** に `Lightning App Builder` と入力し、**[Lightning アプリケーションビルダー]** を選択。
> 3. **[新規]** をクリック。
> 4. **[アプリケーションページ]** を選択し **[Next]** をクリック。
> 5. 表示ラベル `Bike Card` を設定し **[次へ]** をクリック。
> 6. **[1 つの範囲]** を選択し **[完了]** をクリック。
> 7. コンポーネントリストを **[Bike Card]** が表示されるまでスクロール。

> [!手順] ページを有効化して表示を確認する
>
> 1. **[Bike Card]** コンポーネントをページレイアウト上部へドラッグする。
> 2. **[保存]** をクリック。
> 3. **[Activate]** をクリック。
> 4. **[すべてのユーザーを対象に有効化]** は選択されたまま。必要に応じて名前やアイコンを変更。
> 5. **[保存]** をクリック。
> 6. **[Skip and Save]** をクリック（ナビゲーションメニューへの追加は不要）。
> 7. **[戻る]** をクリックしてビルダーを終了。
> 8. アプリケーションランチャーで **[Bike Card]** を見つけて選択。
> 9. ページを開き、コンポーネントが UI で動作することを確認。

```text
[VS Code でファイル作成]
   bikeCard.html / .js / .js-meta.xml
        │  SFDX: Deploy This Source to Org
        ▼
[Salesforce 組織にリリース]
        │  Lightning アプリケーションビルダー
        ▼
[アプリケーションページにドラッグ]
        │  保存 → 有効化
        ▼
[UI に Bike Card コンポーネントが表示]
```

次の単元では、イベント処理を含むインタラクティブなコンポーネントを作成し、リリースしてテストします。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] リリースまわりの頻出ポイント
>
> - 組織にリリースするには **HTML・JS に加えて `.js-meta.xml`** が必須。
> - ビルダーに表示するには **`isExposed` を `true`** にし、**`<target>` を1つ以上**定義する。
> - 主な `target`：`lightning__AppPage`（アプリケーションページ）、`lightning__RecordPage`（レコードページ）、`lightning__HomePage`（ホームページ）。
> - 外部画像などを表示するには**信頼済み URL**への登録が必要。
> - リリースは **VS Code の [SFDX: Deploy This Source to Org]** で実行する。

> [!まとめ] この単元のまとめ
>
> - 組織で使うには **`.js-meta.xml` 設定ファイル**が必要（`apiVersion`・`isExposed`・`targets`）。
> - **`isExposed=true` ＋ `<target>` 定義**でビルダーに表示できる。
> - **リリース → 信頼済み URL 登録 → ビルダーでページ作成・配置 → 有効化**の流れで UI に表示する。

---

## リソース

- Salesforce DX 開発者ガイド: プロジェクトの設定
- Salesforce ヘルプ: Lightning アプリケーションビルダー
- Lightning Web Components Dev Guide: Component Configuration Tags（コンポーネント設定タグ）
- Trailhead: 組織開発モデル

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：自転車カードコンポーネントのアプリケーションページを作成する
>
> ファイルを Trailhead Playground または Developer Edition 組織にリリースし、Lightning アプリケーションビルダーでアプリケーションページを作成します。
>
> **事前作業**：前単元の「必要な準備」を未完了なら今すぐ完了してください。組織で Dev Hub が有効で、VS Code で組織が承認されていることを確認します。
>
> **手順と設定値**
> 1. Visual Studio Code で SFDX プロジェクトを作成する
>    - Template（テンプレート）：`Standard`（標準）
>    - Project name（プロジェクト名）：`bikeCard`
> 2. Lightning Web Component をプロジェクトに追加する
>    - フォルダー：`lwc`
>    - Component name（コンポーネント名）：`bikeCard`
> 3. この単元のコンポーネントファイルの内容を自分のファイルにコピーする
>    - `bikeCard.html`
>    - `bikeCard.js`
>    - `bikeCard.js-meta.xml`
> 4. bikeCard コンポーネントファイルを組織にリリースする
> 5. Lightning アプリケーションページを作成する:
>    - 表示ラベル：`Bike Card`（自転車カード）
>    - API Name（API 参照名）：`Bike_Card`
> 6. bikeCard コンポーネントをページに追加する
> 7. 全ユーザーに対してページを有効にする

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しつつ進めます。評価は英語データに対して行われるため、**英語の値のみ**をコピー&ペーストします。日本語組織で不合格になった場合は、(1) [Locale] を [United States] に、(2) [Language] を [English] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがあります。
