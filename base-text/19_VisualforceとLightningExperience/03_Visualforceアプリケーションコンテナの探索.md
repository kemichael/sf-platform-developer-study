# Visualforce アプリケーションコンテナの探索

## 学習の目的

この単元を完了すると、次のことができるようになります。

- Salesforce Classic と Lightning Experience で実行される Visualforce ページの 3 つの相違点を説明する。
- Lightning Experience で機能させるために更新が必要な 2 つの一般的なコードパターンを説明する。
- Lightning Experience 実行時に Visualforce ページのデフォルト値に行う 2 つの変更点を挙げる。

> [!ポイント] この単元のゴール
>
> 最大の論点は **「Lightning Experience では Visualforce が iframe の中で動く」** という一点です。この「入れ物（コンテナ）の違い」から、セキュリティ・範囲（スコープ）・デフォルト値の変化がすべて派生します。「他人のものには手を出すな」という原則を軸に整理しましょう。

---

## Visualforce アプリケーションコンテナの探索

LEX と Classic の Visualforce の最大の違いは **実行する環境** です。

- **Salesforce Classic** … Visualforce がページ・要求・環境を「所有」する（VF 自身がコンテナ）。
- **Lightning Experience** … Visualforce が、より大きな LEX コンテナ内にラップされた **iframe の内側** で実行される。

```text
  ◆ Salesforce Classic
  ┌─────────────────────────────┐
  │  Visualforce ページ           │   ← VF がページ全体を「所有」する
  │  （ページ・要求・環境のすべて）  │      = VF 自身がコンテナ
  └─────────────────────────────┘

  ◆ Lightning Experience
  ┌─────────────────────────────────────────┐
  │  Lightning Experience（親コンテナ）         │
  │   ┌───────────────────────────────────┐  │
  │   │  iframe                            │  │
  │   │   ┌─────────────────────────────┐ │  │
  │   │   │  Visualforce ページ（子）     │ │  │   ← VF は iframe の中に閉じ込められる
  │   │   └─────────────────────────────┘ │  │
  │   └───────────────────────────────────┘  │
  └─────────────────────────────────────────┘
```

> [!用語] iframe（インラインフレーム）と参照コンテキスト
>
> **iframe** は HTML の中に別のページをまるごと埋め込む窓（`<iframe>` タグ）。窓の内外はブラウザーから見て別々の **参照コンテキスト**（ウィンドウ・タブ・iframe が持つ独立した管理単位）として扱われます。あるコンテキストの JavaScript から、別のコンテキスト（特にドメインが違う場合）の中身へは原則アクセスできません。

> [!注意] この単元は「未完成」
>
> ここで取り上げる問題の影響は **各人のコードによって大きく異なる** ため、内容の大半は多くのケースに当てはまりません。それでも LEX が Visualforce に及ぼす一般的な側面を概説します。

---

## 外側の Lightning Experience コンテナ

外側のコンテナである LEX アプリケーションは **「単一ページアプリケーション」（SPA）** で、`/lightning` URL からアクセスします。`/lightning` が読み込まれ、そのアプリケーションコードが環境を取り仕切ります。

> [!用語] 単一ページアプリケーション（SPA：Single-Page Application）
>
> 最初に 1 枚の HTML と大量の JavaScript を読み込み、その後はページ全体を再読み込みせず JavaScript で画面を切り替える方式。React などが代表例で、LEX もこの方式です。**LEX は制御できるものではなく、実装は常に進化** します。

> [!ポイント] 親子関係の原則
>
> **要求を統括するのは LEX（`/lightning`）であって Visualforce ページではありません。** LEX が **親コンテキスト**、Visualforce が **子コンテキスト** であり、**子は親に従わなければなりません**。LEX が課す制約の中でページを機能させる必要があります。

制約には 2 種類あります。

| 制約の種類 | 課す主体 | 例 | 対応のしやすさ |
| --- | --- | --- | --- |
| **明示的な制約** | Lightning Experience | Visualforce を表示するフレームのサイズ | わかりやすく対応しやすい |
| **暗黙的な制約** | ブラウザー | セキュリティ、JavaScript 実行の制約 | 検出・診断が難しい場合がある |

ページの大半はセキュリティ制約の影響を受けず、反した場合も早い段階で明確なエラーが示されます。JavaScript のエラーは検出・診断が難しいものの、一定の原則があります（後述）。

---

## Visualforce の iframe

LEX で実行する Visualforce ページは HTML の **iframe の内側** に表示され、Visualforce と親の LEX アプリケーションの間に **境界線** を作ります。

> [!ポイント] iframe が「とりあえず機能」を支える
>
> iframe 内で実行する利点は、**最上位コンテキストへのアクセス・変更を必要としないページなら、Classic のページとほぼ同じになる** ことです。だからこそ、すべてのページを書き換える必要がありません。これが Visualforce を「とりあえず機能」させる戦略の重要な部分です。一方、**最上位の参照コンテキストにアクセスするページには何らかの変更が必要** です（次セクション）。

> [!注意] 外部サービス連携時の追加設定
>
> ページが Salesforce 以外のサービスと通信する場合、iframe の境界により、組織の **CORS 設定・リモートサイト設定・クリックジャック設定・コンテンツセキュリティポリシー** の更新が必要になることがあります。

> [!用語] クリックジャック（Clickjacking）対策
>
> 悪意のあるサイトが透明な iframe で被害者を騙してクリックさせる攻撃が「クリックジャック」。Salesforce にはこれを防ぐ設定があり、自ページを iframe に埋め込む構成では調整が必要なことがあります。

---

## 新しいコンテナの影響

Visualforce ページを LEX の iframe に埋め込むことによる影響は、大きく **セキュリティ** と **範囲（スコープ）** の 2 種類に分かれます。大半のページは影響を受けませんが、影響を受けるページは問題を認識していれば原因を素早く突き止められます。

---

### セキュリティ上の影響

影響が及ぶ可能性のあるセキュリティ要素は、**セッションのメンテナンス・更新／認証／クロスドメイン要求／埋め込みの制限** です。クロスドメイン要求への影響は前述のとおりで、ここでは **セッションのメンテナンス** を述べます。

> [!用語] セッション ID（Session ID）と `$Api.Session_ID`
>
> 「セッション」とは、要求のたびに認証情報を入力しなくて済むようブラウザーが再利用する **認証トークン**。Visualforce では `$Api.Session_ID` グローバル変数で現在のセッションにアクセスできます。

> [!注意] ドメインによってセッション ID が変わる
>
> **要求のドメインに応じて `$Api.Session_ID` が異なる値を返します**。`.salesforce.com` から `.force.com` のようにホスト名の境界を越えるたびに値が変わるためです。LEX（外側）と Visualforce（iframe の内側）はドメインが異なるためセッション ID も異なります。通常はドメイン間のハンドオフが透過的に処理されますが、**セッション ID を自分で渡している場合は、正しいドメインから `$Api.Session_ID` に再アクセスして有効な ID を得る必要がある** ことがあります。

---

### 範囲（スコープ）への影響

範囲とは、主に **DOM へのアクセス・変更／JavaScript の範囲・表示・アクセス／JavaScript のグローバル変数（`window.location` など）** を意味します。

> [!ポイント] 大原則：「他人のものには手を出すな」
>
> 根本の考え方は **「他人のものには手を出すな」** の一言です。自分の JavaScript やスタイルが、自ページの参照コンテキストの要素（DOM・変数）に影響するのは構いませんが、**親の LEX コンテキストなど別の参照コンテキストの要素にはアクセスできません**。

> [!用語] DOM（Document Object Model）
>
> ブラウザーが HTML をプログラムから操作できるよう、ページの要素をツリー構造で表したもの。JavaScript はこの DOM を通じて要素を読み書きします。iframe の内外で DOM は分離されています。

#### 更新が必要な 2 つの一般的なコードパターン

> [!注意] パターン 1：`window.location` を直接操作してページ遷移する
>
> ありがちな過ちは **`window.location` を操作して別ページへ移動する** コードです。iframe の内側からこれを行うと LEX コンテナの想定外の挙動を招きます。**正しくは、ナビゲーション用に用意された API（`sforce.one` など）をコールします。**

> [!注意] パターン 2：`window.parent` / `contentWindow` で親フレームに触れる
>
> 「親コンテキストにアクセスできない問題」を `contentWindow` や `window.parent` で回避できると考えるのは思い違いです。Visualforce と LEX はドメインが異なるため **同一オリジンポリシー（same-origin policy）** に抵触するおそれがあり、仮に抵触しなくても再現しづらい断続的バグに置き換わるだけです。フレーム境界を越えるには **`window.postMessage`** を使い、他フレームの受信コードにメッセージを送ります。

> [!用語] 同一オリジンポリシー / window.postMessage
>
> **同一オリジンポリシー** は、あるオリジン（スキーム＋ドメイン＋ポート）の JavaScript が別オリジンの中身に勝手にアクセスするのを禁じる規則。Visualforce（`.force.com` 等）と LEX（`.salesforce.com` 等）はオリジンが異なります。**window.postMessage** は異なるオリジン／フレーム間で安全にメッセージをやり取りする標準 API で、「送る → 受け取った側が処理する」形で境界を越えます。

```text
   ✗ 悪い例：境界を無理やり越える
   iframe（VF）── window.parent.location = ... ──▶ 親（LEX）  → 同一オリジンポリシー違反

   ✓ 良い例：用意された手段を使う
   iframe（VF）── sforce.one / postMessage ──▶ 親（LEX）  → 安全に連携
```

---

## Lightning Experience における Visualforce のデフォルトと環境の変更

LEX での実行中、バックグラウンドでマイナーチェンジが行われ、大半のページが「とりあえず機能」します。たとえば LEX で実行される Visualforce ページでは常に **Salesforce Classic の標準ヘッダーとサイドバーが抑制** されます。

---

### `showHeader` および `sidebar` 属性は常に false

これらの属性は Visualforce ページ上の **Classic のヘッダー・サイドバー** に影響します。LEX では LEX のナビゲーション要素が優先されるため、**Classic のヘッダー・サイドバーは常に抑制（false）** されます。LEX のヘッダー/サイドバーは抑制できず、対応する属性もありません。

```html
<apex:page showHeader="true" sidebar="true">
    <!-- Salesforce Classic では指定どおりヘッダー・サイドバーが表示される -->
    <!-- Lightning Experience では showHeader / sidebar は常に false 扱いになる -->
</apex:page>
```

Classic と LEX でページを共有する場合も、**Classic 実行時に使う値** を設定しておけます（LEX 側では無視される）。

> [!注意] `standardStylesheets` は影響を受けない
>
> Classic の標準スタイルシートの有無を決める `<apex:page>` の **`standardStylesheets` 属性は LEX の影響を受けません**。LEX でもデフォルトの `true` のままで変更も可能です。「ヘッダー/サイドバーは強制 false、でもスタイルシートはそのまま」という対比が試験のポイントです。

> [!ポイント] LEX で変わるデフォルト値「2つ」
>
> 試験で問われる「LEX 実行時にデフォルト値に行われる 2 つの変更」は次のとおりです。
> 1. **`showHeader` が常に false**（Classic ヘッダーの抑制）。
> 2. **`sidebar` が常に false**（Classic サイドバーの抑制）。

---

### sforce.one JavaScript ユーティリティオブジェクト

> [!用語] sforce.one
>
> LEX または Salesforce アプリケーションで実行するページに **自動的に挿入** される JavaScript オブジェクト。多数の便利な関数を備え、主に **ナビゲーションイベントの起動** に使います。追加作業は不要で抑制もできません。

`sforce.one` は JavaScript デバッガーコンソールや Web 開発者のリソースリストに表示されます。

> [!注意] Classic には挿入されない
>
> `sforce.one` を **Classic の Visualforce ページに挿入する方法はありません**（LEX／Salesforce アプリ専用）。詳細は後の「ナビゲーションの管理」単元で説明します。

---

## Classic と LEX の相違点まとめ（3つの観点）

> [!ポイント] 3つの相違点を整理する
>
> | 観点 | Salesforce Classic | Lightning Experience |
> | --- | --- | --- |
> | **実行コンテナ** | VF がページ全体を所有 | iframe 内（LEX が親、VF が子） |
> | **ヘッダー/サイドバー** | `showHeader`/`sidebar` の指定どおり | 常に抑制（false） |
> | **sforce.one** | 挿入されない | 自動的に挿入される |

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] よくある出題パターン
>
> - **LEX では Visualforce は iframe の中で動く**（親＝LEX、子＝VF）。
> - **`window.location` の直接操作はダメ** → ナビゲーション API（`sforce.one` 等）。
> - **`window.parent`／`contentWindow` で親に触れるのもダメ** → 同一オリジンポリシー違反のおそれ。フレーム越えは `window.postMessage`。
> - **LEX では `showHeader` と `sidebar` が常に false。** ただし `standardStylesheets` は影響を受けない。
> - **`sforce.one` は LEX/Salesforce アプリには自動挿入、Classic には挿入されない。**
> - ドメインが変わると **`$Api.Session_ID` の値も変わる**。

> [!まとめ] この単元のまとめ
>
> - Classic と LEX の最大の違いは **実行コンテナ**。LEX では VF が iframe（子）として動き、親の LEX に従う。
> - 更新が必要な 2 大コードパターンは **`window.location` の直接操作** と **`window.parent`/`contentWindow` による親アクセス**。正しくはナビゲーション API と `window.postMessage`。
> - LEX で変わるデフォルト値は **`showHeader` と `sidebar` が常に false**。
> - `sforce.one` は LEX/Salesforce アプリに自動挿入される（Classic には入らない）。

---

## リソース

- セッションセキュリティ設定の変更
- Visualforce 開発者ガイド
- Mozilla Development Network: HTML Inline Frame 要素（`<iframe>`）
- Mozilla Development Network: Content Security Policy の利用方法

---

## テスト

この単元を完了するには、テストのすべての質問に正しく解答する必要があります。

**+100 ポイント**

**問 1. 次の文のうち、正しいものはどれですか？**

- A. Salesforce Classic では、`window.location` を直接設定すると良い。
- B. `window.postMessage` を使用して、Visualforce ページの iframe から、Lightning Experience で動作しているコードにメッセージを送信することはできない。
- C. Visualforce ページでは、Lightning Experience ナビゲーション項目の DOM 要素にアクセスできる。
- D. sforce.one JavaScript ユーティリティオブジェクトは、Salesforce Classic のページに挿入される。

> [!ポイント] 解答の考え方
>
> 正解は **A**。Classic では Visualforce がページ全体を所有するため `window.location` の直接操作も動きます（LEX では NG）。B は誤り（`postMessage` での送信は可能）、C も誤り（別コンテキストの DOM にはアクセス不可）、D も誤り（`sforce.one` は Classic には挿入されない）です。

**問 2. 次のうち、Visualforce ページが Lightning Experience に表示される場合に、異なるものはどれですか？**

- A. Visualforce ページに追加したスタイルシート
- B. Visualforce ページのクリックジャック設定
- C. Visualforce ページに追加した JavaScript コード
- D. 上記のすべて

> [!ポイント] 解答の考え方
>
> 正解は **D**。iframe コンテナの変化により、スタイルシート・クリックジャック設定・JavaScript のいずれも Classic とは挙動が異なり得ます。
