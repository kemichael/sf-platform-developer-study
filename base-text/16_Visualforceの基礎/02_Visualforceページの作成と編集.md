# Visualforce ページの作成と編集

## 学習の目的

この単元を完了すると、次のことができるようになります。

- Visualforce ページとその主な属性について説明する。
- 組織の既存の Visualforce ページをリストして開く。
- 開発者コンソールを使用して Visualforce ページを作成・編集する。
- Visualforce タグと属性をエディターで特定、追加、カスタマイズする。

> [!ポイント] この単元のゴール
>
> **開発者コンソールで Visualforce ページを作り、属性（`sidebar` など）とコンポーネント（`<apex:pageBlock>` など）を追加して構造を組み立てる**——この操作が学べれば十分です。タグの **ネスト（入れ子）の親子ルール** も押さえましょう。

---

## Visualforce ページの作成の概要

Visualforce ページはアプリ開発の基本部品で、組織データのアクセス・表示・更新を行い、一意の URL から呼び出せます。HTML に似たタグベースのマークアップ（`<タグ>～</タグ>`）を使い、約 150 個の組み込みコンポーネントが用意されています。HTML・CSS・JavaScript を混在でき、Salesforce API からも操作できます。

> [!用語] Visualforce ページ／コンポーネント
>
> **ページ**：Visualforce マークアップで作る 1 枚の画面。**固有の URL** を持ち、`/apex/ページ名` でアクセスする「1 部品」。**コンポーネント**：ページを組み立てる部品（`<apex:pageBlock>` など）。多機能な「大まかなコンポーネント」と、小さな役割の「きめの細かいコンポーネント」がある。

> [!ポイント] Visualforce ページを作成・編集する 3 つの方法
>
> | 方法 | 特徴 | 向いている用途 |
> | --- | --- | --- |
> | **開発者コンソール** | 構文強調・オートコンプリート等が充実。最も高機能 | 本格的な開発、複雑なコード |
> | **開発モードのクイック修正/フッター** | 画面下のフッターで素早く編集 | ちょっとした修正・お試し |
> | **設定エディター** | 基本的だがページ設定にアクセスできる | ページの設定変更（Lightning 有効化など） |
>
> このほか **Visual Studio Code（VS Code）+ Salesforce 拡張機能** でも開発できます。

---

## 開発者コンソールでの Visualforce ページの作成

開発者コンソールには構文の自動強調、タグペアの照合、オートコンプリート、スマートインデントが備わり、複雑なコードを含むページの開発に最適です。

> [!用語] 開発者コンソール（Developer Console）
>
> ブラウザーから使える統合開発ツール。Visualforce ページ・Apex クラス・トリガーなどを作成・編集・テスト・デバッグできます。インストール不要です。

> [!手順] 開発者コンソールで「HelloWorld」ページを作成する
>
> 1. 自分の名前の下、またはクイックアクセスメニュー（設定歯車アイコン）から **[開発者コンソール]** を開きます。
> 2. **[File] | [New] | [Visualforce Page]** をクリックします。
> 3. ページ名に `HelloWorld` と入力し **[OK]** をクリックします。
> 4. エディターで次のマークアップを入力します。
>
>     ```html
>     <apex:page>
>         <h1>Hello World</h1>
>     </apex:page>
>     ```
>
> 5. **[File] | [Save]** をクリックします。
> 6. **[Preview]** をクリックすると、Salesforce スタイルのないページが新しいウィンドウに表示されます。

> [!用語] プレビューと /apex/ページ名 URL
>
> [Preview] は Salesforce のスタイルが付かない「素のページ」を別ウィンドウで開く機能。本来は `/apex/ページ名` でアクセスします。

Lightning Experience で表示するには、メインウィンドウに戻り、ブラウザーの JavaScript コンソールで次を実行します（`pageName` はページ名に置換）。`/apex/PageName` URL を開くのと同じ動作です。

```javascript
$A.get("e.force:navigateToURL").setParams({"url": "/apex/pageName"}).fire();
```

> [!注意] こまめに保存する
>
> プレビューは **保存時に自動更新** されます。「変わらない」ときはまず保存を確認しましょう。以降の手順では保存の記述を省きます。

### 既存ページを開く

**[File] | [Open]** で既存の Visualforce ページ一覧が表示され、ダブルクリックで開けます。Apex クラスやトリガー、Visualforce コンポーネントなど他のエンティティも開けます。

---

## 入力支援機能を使用して属性を追加する

属性を設定するとコンポーネントの動作をカスタマイズできます。オートコンプリートを使うと、入力途中で候補が自動表示され、全部覚えていなくても数文字で選べます。

> [!用語] 属性（attribute）
>
> タグの動作を指定する「設定値」。`<apex:page sidebar="false">` の `sidebar="false"` が属性で、`属性名="値"` の形で書きます。HTML の `<img src="...">` の `src` と同じ考え方です。

> [!手順] `<apex:page>` に sidebar / showHeader 属性を追加する
>
> 1. `<apex:page>` 開始タグの内側（`>` の直前）をクリックし、スペースに続けて `s` を入力します。補完候補が絞り込まれます。
> 2. 下矢印キーで `sidebar` を選び Enter。有効な値が表示されます。
> 3. `f` の入力で `false` を選び Enter。保存します。
> 4. 同様に `showHeader="false"` を追加し、保存します。コードは次のようになります。
>
>     ```html
>     <apex:page sidebar="false" showHeader="false">
>         <h1>Hello World</h1>
>     </apex:page>
>     ```

### 高度な操作

Classic では `sidebar` と `showHeader` の既定は `true` ですが、Lightning Experience とモバイルでは常に `false` に上書きされます。ページには Salesforce のスタイルシートが含まれますが、すべての出力を抑制するには `standardStylesheets="false"` を追加します。

> [!ポイント] `<apex:page>` の主な属性
>
> | 属性 | 役割 | Classic の既定 | Lightning での挙動 |
> | --- | --- | --- | --- |
> | `sidebar` | サイドバーの表示/非表示 | `true` | 常に `false`（上書き） |
> | `showHeader` | 標準ヘッダーの表示/非表示 | `true` | 常に `false`（ヘッダー抑制は不可） |
> | `standardStylesheets` | Salesforce 標準スタイルの読み込み | `true` | スタイルを消すなら `false` |
> | `standardController` | 標準コントローラーの指定 | なし | レコード操作に使用 |

> [!注意] Lightning では sidebar / showHeader が効かない
>
> `sidebar` と `showHeader` を `true` にしても、**Lightning とモバイルでは強制的に `false`** になります。仕様であり、試験でも問われやすいポイントです。

---

## ページ構造を形成するコンポーネントを追加して並び替える

> [!手順] pageBlock と pageBlockSection でページ構造を作る
>
> 1. `Hello World` の下に `<apex:pageBlock>` を追加し、`title` を `A Block Title` に設定します（関連項目をグループ化する構造化 UI 要素）。
> 2. その内側に `<apex:pageBlockSection>` を追加し、`title` を `A Section Title` に設定します（折りたたみ可能なセクション）。
> 3. セクション内に `I'm three components deep!` などのテキストを追加します。
>
>     ```html
>     <apex:page>
>         <h1>Hello World</h1>
>         <apex:pageBlock title="A Block Title">
>             <apex:pageBlockSection title="A Section Title">
>                 I'm three components deep!
>             </apex:pageBlockSection>
>         </apex:pageBlock>
>     </apex:page>
>     ```

> [!用語] ネスト（nest：入れ子）
>
> あるタグの内側に別のタグを入れること。上の例では `<apex:page>` → `<apex:pageBlock>` → `<apex:pageBlockSection>` と 3 段階に入れ子化されています。「I'm three components deep!（3 つ深い）」はこの 3 段階を表しています。

```text
<apex:page>                          ← ①ページ全体（一番外側）
  └─ <h1>Hello World</h1>
  └─ <apex:pageBlock>                ← ②関連項目をまとめる枠
       └─ <apex:pageBlockSection>    ← ③折りたためるセクション
            └─ I'm three components deep!   ← 中身のテキスト
```

> [!手順] 2 つ目のセクションを追加する
>
> 1. 最初のセクションの後に別の `<apex:pageBlockSection>` を追加し、`title` を `A New Section` に設定します。
> 2. 本文にテキストを追加します。
>
>     ```html
>     <apex:page>
>         <h1>Hello World</h1>
>         <apex:pageBlock title="A Block Title">
>             <apex:pageBlockSection title="A Section Title">
>                 I'm three components deep!
>             </apex:pageBlockSection>
>             <apex:pageBlockSection title="A New Section">
>                 This is another section.
>             </apex:pageBlockSection>
>         </apex:pageBlock>
>     </apex:page>
>     ```

> [!注意] 親子関係の制約に注意
>
> `<apex:pageBlockSection>` は **必ず `<apex:pageBlock>` の内側** に置かないと機能しません。「この親の中でしか使えない」親子ルールを持つコンポーネントがあり、守らないとエラーや表示崩れになります。ネスト可否は「標準コンポーネントの参照」で確認できます。

---

## もうひとこと...

開発者コンソール以外の作成・編集方法は次のとおりです。

- **開発モードのクイック修正/フッター**：新規作成や簡単な編集を素早く行える。テストページ作成にも有効。
- **設定エディター**：[設定] の [クイック検索] で「Visualforce ページ」を選択。他の方法では使えないページ設定にアクセスできる。
- **Visual Studio Code** + Salesforce 拡張機能：開発組織（スクラッチ組織・Sandbox・DE 組織）、Apex、Aura、Visualforce を操作できる。

`<apex:pageBlockSectionItem>` や `<apex:pageBlockButtons>` など、プラットフォームのスタイルに合わせるコンポーネントもあります。

> [!ポイント] 「標準コンポーネントの参照」を使いこなす
>
> 約 150 個のコンポーネントを暗記する必要はありません。**「標準コンポーネントの参照（Standard Component Reference）」** で、どのコンポーネントがあるか・どんな属性を持つか・どこにネストできるかを都度確認するのが、実務でも試験対策でも近道です。

---

## リソース

- Salesforce ヘルプ: Visualforce ページの作成
- Salesforce ヘルプ: 開発者コンソールの機能
- Salesforce ヘルプ: Visualforce または Apex のエディター
- Visualforce 開発者ガイド: Tools for Visualforce Development
- Visualforce 開発者ガイド: Standard Component Reference
- Visual Studio Code 向け Salesforce 拡張機能
- Salesforce 開発者ブログ: Developing Visualforce With Your Browser

---

## ハンズオン Challenge（+500 ポイント）

この単元は各自のハンズオン組織で実行します。[起動] をクリックして開始するか、組織の名前をクリックして別の組織を選びます。

> [!まとめ] あなたの Challenge：画像を表示する単純な Visualforce ページを作成する
>
> 標準 Salesforce ヘッダーがなく、Visualforce 画像コンポーネントで画像を表示するページを作成します。
>
> **Challenge の要件**
> 新しい Visualforce ページを作成する:
> - 表示ラベル：`DisplayImage`
> - 名前：`DisplayImage`
> - ページに **標準 Salesforce ヘッダーを表示しない**（`showHeader="false"` を使う）
> - Visualforce の `apex:image` コンポーネントで次の画像を表示する:
>   `https://developer.salesforce.com/files/salesforce-developer-network-logo.png`

> [!ポイント] Challenge のヒント
>
> - ヘッダーを消すには `<apex:page showHeader="false">` を使う。
> - 画像表示は `<apex:image value="画像のURL"/>` の形で書く。
> - 表示ラベルと名前は **半角英字で `DisplayImage`** と正確に入力する（評価は英語データで行われる）。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めてください。評価は英語データに対して行われるため、**英語の値のみ** をコピー&ペーストします。不合格時は、(1) [Locale] を [United States]、(2) [Language] を [English] に切り替え、(3) [Check Challenge] をクリックすると通ることがあります。
