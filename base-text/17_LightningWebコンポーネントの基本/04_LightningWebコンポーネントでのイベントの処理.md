# Lightning Web コンポーネントでのイベントの処理

## 学習の目的

この単元を完了すると、次のことができるようになります。

- 複数のコンポーネントを含むアプリケーションを作成する。
- 複雑なコンポーネントのファイル構造を説明する。
- イベントを処理する。

> [!ポイント] この単元のゴール
>
> 「**イベントは上へ（子→親）、プロパティは下へ（親→子）**」という通信パターンの理解が最大の目標。`CustomEvent` の作成・`dispatchEvent()` での発火・親の `on○○` ハンドラーでの受信、という流れを押さえましょう。試験頻出テーマです。

---

## イベントのジャーニーをたどる

ここではイベント処理を追加します。題材はサイクルショップの商品セレクターで、ユーザーが自転車名・画像をクリックすると詳細を表示します。このアプリは4つのコンポーネントが連携します。

| コンポーネント | 役割 |
| --- | --- |
| **tile** | 個々の品目（自転車）を表示する |
| **list** | タイルを並べて配置する |
| **detail** | タイルがクリックされると品目の詳細を表示する（bikeCard に類似） |
| **selector** | すべてを含むコンテナ。イベント処理の中継地点 |

> [!用語] イベント（Event）
>
> ユーザーの操作（クリックなど）や状態の変化など、「何かが起きた」という出来事を表す通知。コンポーネントはイベントを**発火（ディスパッチ）**して伝え、受け取った側は**ハンドラー**で反応します。

> [!用語] コンテナコンポーネント（Container Component）
>
> 他のコンポーネントを内部にまとめる「入れ物」役。ここでは selector が list と detail を内包し、イベントの中継地点になります。

当面はデータファイルで静的データを読み込みます（動的データの取得は次の単元）。

---

## コンポーネントのコンポジション

> [!手順] セレクターアプリケーションのファイルを追加する
>
> 1. Trailhead 用自転車セレクターアプリケーションからファイルをダウンロードする。
> 2. ファイルを bikeCard プロジェクトの `force-app/main/default/lwc` フォルダーに展開する。

> [!用語] コンポジション（Composition）
>
> 複数のコンポーネントを組み合わせて1つのアプリケーションを組み立てること。HTML タグの入れ子と同様に、LWC は他の LWC の中にネストできます。

---

## コンポーネントのリレーション

カスタム HTML 要素である LWC は、他の LWC 内にネストできます。ファイルシステムからはリレーションが分からないため、UI レベルのネスト構造を図で示します。

```text
┌─────────────────────────────────────────────┐
│ selector（コンテナ・親）                       │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │ list             │  │ detail           │ │
│  │  ┌────┐ ┌────┐   │  │ （選択された自転車 │ │
│  │  │tile│ │tile│ … │  │   の詳細を表示）   │ │
│  │  └────┘ └────┘   │  │                  │ │
│  └──────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
```

selector コンポーネントがページをレイアウトし、list (`c-list`) と detail (`c-detail`) を表示します。

```html
<template>
  <div class="wrapper">
    <header class="header">Select a Bike</header>
    <section class="content">
      <div class="columns">
        <main class="main" >
          <c-list onproductselected={handleProductSelected}></c-list>
        </main>
        <aside class="sidebar-second">
          <c-detail product-id={selectedProductId}></c-detail>
        </aside>
      </div>
    </section>
  </div>
</template>
```

detail.html を次のように更新します。条件付き表示（`lwc:if={product}` と `lwc:else`）で、未選択時は選択を促し、選択時は自転車情報を表示します。

```html
<template>
  <template lwc:if={product}>
    <div class="container">
      <div>{product.fields.Name.value}</div>
      <div class="price">{product.fields.MSRP__c.displayValue}</div>
      <div class="description">{product.fields.Description__c.value}</div>
      <img class="product-img" src={product.fields.Picture_URL__c.value} alt={product.fields.Name.value}/>
      <p>
        <lightning-badge label={product.fields.Material__c.value}></lightning-badge>
        <lightning-badge label={product.fields.Level__c.value}></lightning-badge>
      </p>
      <p>
        <lightning-badge label={product.fields.Category__c.value}></lightning-badge>
      </p>
    </div>
  </template>
  <template lwc:else>
    <div>Select a bike</div>
  </template>
</template>
```

list コンポーネントは、データの自転車ごとに tile (`c-tile`) を1つずつ表示します。

```html
<template>
  <div class="container">
    <template for:each={bikes} for:item="bike">
      <c-tile key={bike.fields.Id.value} product={bike} ontileclick={handleTileClick}></c-tile>
    </template>
  </div>
</template>
```

> [!用語] `for:each` ディレクティブ（繰り返し表示）
>
> 配列の要素数だけ同じテンプレートを繰り返し描画する命令。`for:each={bikes} for:item="bike"` は「`bikes` 配列の各要素を `bike` として1つずつ取り出して繰り返す」という意味。`key` 属性で各要素を一意に識別させる必要があります。

```css
.container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
```

この親/子リレーションは、設計上だけでなくイベント処理にとっても重要です。

---

## イベントは上へ、プロパティは下へ

複数の親子を含む複雑なコンポーネントでは、階層の上位・下位と通信できます。

- 子（`c-todo-item`）は親（`c-todo-app`）に**イベントをディスパッチ**する。例：ボタンクリックを親に渡し、親がページを変更する。
- 親は子に**プロパティを渡す**か、子のメソッドを呼び出す。例：子のテキスト値を設定する。

```text
        親コンポーネント
        ┌──────────────┐
        │              │
   ▲    │   イベント    │    │
   │    │   ▲      │   │    ▼
 イベント│   │      │プロパティ
（上へ） │   │      ▼   │ （下へ）
        │              │
        │   子コンポーネント
        └──────────────┘

イベント = 子 → 親（上へ）
プロパティ = 親 → 子（下へ）
```

> [!ポイント] 最重要パターン「イベントは上、プロパティは下」
>
> LWC のコンポーネント間通信の鉄則。
> - **子から親へ伝えたいこと**は「**イベント**」をディスパッチする（上へ）。
> - **親から子へ渡したいデータ**は「**プロパティ**」を `@api` 経由で設定する（下へ）。
>
> 試験では「イベントは子から親へ、プロパティは親から子へ」が正解になります。

---

## 情報を上位に渡す

子はイベントをディスパッチし、親はそれをリスンします。子は親に渡すイベントオブジェクトを作成し、親はイベントに応答するハンドラーを持ちます。

> [!用語] ディスパッチ（dispatch）/ リスン（listen）/ ハンドラー（handler）
>
> - **ディスパッチ**：イベントを「発火する・送り出す」こと。`this.dispatchEvent(...)` で行う。
> - **リスン**：イベントを「待ち受ける」こと。親が HTML で `on○○={...}` と書く。
> - **ハンドラー**：イベントを受け取ったときに実行される処理メソッド。

次の子は `CustomEvent()` でイベントを作り、[Next] ボタンクリックで `next` 種別をディスパッチします（このコンポーネントは作成不要）。

```javascript
// todoItem.js
import { LightningElement } from 'lwc';
  ...
  nextHandler() {
    this.dispatchEvent(new CustomEvent('next'));
  }
}
```

> [!用語] `CustomEvent`（カスタムイベント）
>
> 開発者が自由に名前を付けて作れる独自のイベントオブジェクト。`new CustomEvent('next')` は `next` という種別のイベントを作成します。`detail` プロパティでデータを一緒に運べます。

> [!注意] イベント種別名のルール
>
> イベント種別は任意の文字列ですが、DOM 標準に準拠して**大文字とスペースを使わず**、必要に応じてアンダースコアで区切ります。例：`productselected` のようにすべて小文字で書きます。

親は「on」プレフィックス付き（`onnext`）のインラインハンドラーでリスンし、イベントオブジェクトをハンドラーに渡します。

```html
<!-- todoApp.html -->
<template>
  <c-todo-item onnext={nextHandler}></c-todo-item>
</template>
```

```javascript
// todoApp.js
import { LightningElement } from 'lwc';
export default class TodoApp extends LightningElement {
  ...
  nextHandler(){
    this.page = this.page + 1;
  }
}
```

> [!例] イベント種別とハンドラー名の対応
>
> 子が `next` 種別をディスパッチすると、親は HTML 上で「`on` ＋ イベント種別名」つまり **`onnext`** で待ち受けます。種別が `tileclick` なら `ontileclick`、`productselected` なら `onproductselected`。

---

## 情報を下位に渡す

公開プロパティ（`@api`）や公開メソッドで情報を下位に渡せます。プロパティを `@api` で公開すると、外部コンポーネントが設定できます（このコンポーネントは作成不要）。

```javascript
// todoItem.js
import { LightningElement, api } from 'lwc';
export default class TodoItem extends LightningElement {
  @api itemName;
}
```

```html
<!-- todoApp.html -->
<template>
  <c-todo-item item-name="Milk"></c-todo-item>
</template>
```

JavaScript の `itemName`（キャメルケース）は、HTML 上ではケバブケース属性 `item-name` で設定します。これは HTML 標準に一致します。

> [!ポイント] キャメルケース ↔ ケバブケースの対応
>
> JavaScript の `@api itemName` は、HTML 上では `item-name` というケバブケース属性で設定します。**「JS はキャメルケース、HTML はハイフン区切り」**は試験頻出です。

公開プロパティはプリミティブ値・シンプルオブジェクト・配列を下位に渡すのに適します。getter/setter でロジックを挟むこともできます（`@api` でアノテーションを忘れずに）。また `@api` 公開メソッドを子に作り、親から呼び出せます。

> [!用語] getter と setter（ゲッター/セッター）
>
> - **getter（`get`）**：プロパティの値を**取得**するときに自動で呼ばれる関数。
> - **setter（`set`）**：プロパティに値を**設定**するときに自動で呼ばれる関数。
>
> 単純な代入の代わりに「値を読み書きするたびに処理を実行したい」場合に使います。

```javascript
// videoPlayer.js
import { LightningElement, api } from 'lwc';
export default class VideoPlayer extends LightningElement {
  @api play() {
    // Play music!
  }
}
```

`c-video-player` が親に含まれていれば、親から `querySelector()` で取得して公開メソッドを呼べます。

```javascript
// methodCaller.js
import { LightningElement } from 'lwc';
export default class MethodCaller extends LightningElement {
  handlePlay() {
    this.template.querySelector('c-video-player').play();
  }
}
```

> [!用語] `querySelector()`（クエリセレクター）
>
> DOM の中から条件に合う要素を1つ探すメソッド。`this.template.querySelector('c-video-player')` は「自分のテンプレート内の `c-video-player` 要素を取得」する意味で、取得した子の公開メソッド（`@api` 付き）を呼び出せます。

---

## HTML でのイベント処理

このアプリはタイルのクリックを処理し、detail を再表示する必要があります。イベントは HTML または JavaScript で処理できますが、HTML アプローチが推奨です。

> [!ポイント] イベント処理は HTML アプローチが推奨
>
> イベントの待ち受けは「HTML に `on○○={ハンドラー}`」と「JavaScript の `addEventListener`」の2通りがありますが、**LWC では HTML テンプレートに書く方法が推奨**です。

各 tile の HTML（tile.html）には `onclick` リスナーがあり、クリックを待ち受けます。

```html
<template>
  <div class="container">
    <a onclick={tileClick}>
      <div class="title">{product.fields.Name.value}</div>
      <img class="product-img" src={product.fields.Picture_URL__c.value} alt={product.fields.Name.value}/>
    </a>
  </div>
</template>
```

タイルをクリックすると `onclick` が tile.js の `tileClick` を呼びます。

```javascript
import { LightningElement, api } from 'lwc';
export default class Tile extends LightningElement {
  @api product;
  tileClick() {
    const event = new CustomEvent('tileclick', {
      // detail contains only primitives
      detail: this.product.fields.Id.value
    });
    // Fire the event from c-tile
    this.dispatchEvent(event);
  }
}
```

> [!注意] `detail` にはプリミティブ値を入れる
>
> `CustomEvent` の `detail` でデータを運べますが、**できるだけプリミティブ値（文字列・数値など）を入れる**のが安全です。オブジェクトをそのまま渡すと、参照共有による予期しない変更が起きることがあります。

---

## セレクターアプリケーションのイベントパターン

親が子イベントに応答できるよう、イベントを階層の上位へ伝搬し、必要なら他の子へプロパティを下位に渡します。このパターンを図で示します。

```text
[tile]                                   クリック発生
  │  ① CustomEvent('tileclick') を dispatch（上へ）
  ▼
[list]  ontileclick → handleTileClick
  │  ② CustomEvent('productselected') を dispatch（上へ）
  ▼
[selector]  onproductselected → handleProductSelected
  │  ③ selectedProductId に値を設定
  │     product-id={selectedProductId} でプロパティを渡す（下へ）
  ▼
[detail]  set/get productId → product を更新 → 詳細を表示
```

具体的な流れは次のとおりです。

1. tile.html の `onclick` が `tileClick` を呼ぶ。
2. tile.js の `tileClick` が `tileclick` 種別の `CustomEvent`（`detail` に `this.product.fields.Id.value`）を作成・発火。
3. list.html の `ontileclick` が `handleTileClick` を呼ぶ。
4. list.js の `handleTileClick` が event（`evt`）を受け、別の `CustomEvent`（`productselected`、`detail` に `evt.detail`）を作成・発火。

```javascript
// Fire the event from c-list
this.dispatchEvent(event);
```

5. selector.html の `onproductselected` が `handleProductSelected` を呼ぶ。
6. selector.js の `handleProductSelected` が `selectedProductId` を `evt.detail` に設定。これが detail コンポーネントに渡される。

```html
product-id={selectedProductId}
```

7. detail.html の条件付きディレクティブ `<template lwc:if={product}>` が product 値を待機。
8. detail.js が非公開変数 `_productId` で状態を追跡し、get/set パターンで値を取得・設定して `product` にセット。これで detail.html が条件付きコンテンツを読み込む。

```javascript
import { LightningElement, api } from 'lwc';
import { bikes } from 'c/data';
export default class Detail extends LightningElement {
  product;
  // Private var to track @api productId
  _productId = undefined;
  // Use set and get to process the value every time it's
  // requested while switching between products
  set productId(value) {
    this._productId = value;
    this.product = bikes.find(bike => bike.fields.Id.value === value);
  }
  // getter for productId
  @api get productId(){
    return this._productId;
  }
}
```

タイルをクリックするたびに、このプロセスが繰り返されます。

> [!例] クリックから詳細表示までの一連の流れ
>
> タイルをクリック → tile が `tileclick` を発火 → list が受け取り `productselected` を発火 → selector が `selectedProductId` を更新 → その値が detail の `productId` に渡る → detail の setter が該当の自転車を探して `product` にセット → `lwc:if={product}` が真になり詳細を表示。まさに「イベントは上、プロパティは下」の実例です。

> [!注意] イベントの伝達設定（高度なトピック）
>
> イベントには DOM ツリー上位への伝搬を管理するプロパティ（`bubbles` や `composed` など）があります。詳細は「イベント伝達の設定」を参照。デフォルト値の変更は高度な用途向けで、動作確認のテストが必要です。

---

## 組織へのファイルのリリース

前単元と同じ手順で新しいファイルをリリースし、ビルダーでページを作成します。

> [!手順] セレクターアプリケーションをリリースして確認する
>
> 1. `force-app/main/default` フォルダーを右クリックし **[SFDX: Deploy Source to Org]** を選択。
> 2. コマンドパレットの **[SFDX: Open Default Org]** で組織を開く。
> 3. selector コンポーネントを使って範囲が1つのページを作成する。
> 4. 表示ラベル `Your Bike Selection` を設定する。
> 5. selector コンポーネントをページレイアウト最上部にドラッグする。
> 6. 保存して、すべてのユーザーを対象に有効化する。
> 7. ページを開き、コンポーネントが UI で動作することを確認する。

次は、スタイルを設定し、組織からライブデータを取得します。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] イベント処理の頻出ポイント
>
> - **イベントは子から親へ（上へ）、プロパティは親から子へ（下へ）**。最頻出。
> - 子は `this.dispatchEvent(new CustomEvent('種別名'))` で発火。**種別名は小文字、スペース不可**。
> - 親は HTML で **`on` ＋ 種別名**（例 `onproductselected`）の属性で待ち受ける。
> - イベントで運ぶデータは `detail` プロパティに入れ、**プリミティブ値**が望ましい。
> - 親から子のメソッドを呼ぶには **`@api` 公開メソッド ＋ `querySelector()`** を使う。
> - カスタムコンポーネントの参照構文は **`<c-detail product-id={...}></c-detail>`** のように `c-` 付きケバブケース。

> [!まとめ] この単元のまとめ
>
> - 複数の LWC は**ネスト（入れ子）**して1つのアプリにできる（コンポジション）。
> - 通信の鉄則は「**イベントは上、プロパティは下**」。
> - 子：`CustomEvent` を作って `dispatchEvent()` で発火 → 親：`on○○` ハンドラーで受信。
> - 親：`@api` プロパティを HTML（ケバブケース属性）で設定して子へ値を渡す。
> - tile → list → selector → detail のチェーンが「上→下」パターンの代表例。

---

## リソース

- Lightning Web Components Developer Guide: Shadow DOM
- Lightning Web Components Developer Guide: イベントを使用した通信
- Lightning Web Components Developer Guide: Getter と Setter の作成

---

## テスト

この単元を完了するには、テストのすべての質問に正しく解答する必要があります。
**+100 ポイント**

**1. カスタムコンポーネントを参照する正しい構文はどれですか?**

- A. `<c-detail product-id={selectedProductId}></c>`
- B. `import { LightningComponent, api } from 'detail';`
- C. `import { detail, api } from 'lwc';`
- D. `<div class="detail">`
- E. `<template if:true={product}>`

**2. 複雑なコンポーネントアプリケーションでのイベント処理パターンを表しているのは次のどれですか?**

- A. プロパティは子から上位の親にディスパッチされ、イベントは親から下位の子に渡される。
- B. イベントは子から上位の親にディスパッチされ、モジュールは親から下位の子に渡される。
- C. イベントは子から上位の親にディスパッチされ、プロパティは親から下位の子に渡される。
- D. イベントは子から上位の親にディスパッチされ、ほかの子は親コンポーネントをリスンする。
- E. イベントは親から下位のすべての子コンポーネントにディスパッチされる。

> [!ポイント] 解答の考え方
>
> - 設問1：`c-` 付き・ケバブケースで属性を渡している → **A**。
> - 設問2：**イベントは子→親（上へ）、プロパティは親→子（下へ）** → **C**。
