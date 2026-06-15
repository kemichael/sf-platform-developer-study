# サーバー側の Apex コントローラークラスを作成する

## 学習の目的

**Lightning コンポーネントフレームワーク** は、モバイル／デスクトップ対応の動的 Web アプリを開発する UI フレームワークです。このクイックスタートでは、組織の取引先責任者リストを表示する Lightning コンポーネントを作成します。本ユニットではその入り口として、取引先責任者を返す **Apex コントローラークラス** を作り、`@AuraEnabled` を付けて **コンポーネントから呼び出せる状態にする** 流れを押さえます。

> [!ポイント] このユニットのゴール
>
> Aura コンポーネントが表示するデータは **サーバー側の Apex** から取得します。`@AuraEnabled` を付けた Apex メソッドを用意し、クライアント（コンポーネント）から呼べるようにするのが本ユニットの目的です。

> [!用語] Aura コンポーネント（Aura Component）
>
> マークアップ・JavaScript・CSS を1つの「バンドル」にまとめて再利用可能な画面部品を作る、Salesforce 従来方式の UI 部品。現在の推奨は後継の **Lightning Web コンポーネント（LWC）** ですが、試験では Aura の基本構造も問われます。

---

## このモジュールの位置づけ

> [!注意] Aura は「従来方式」、推奨は LWC
>
> このモジュールは従来の Aura コンポーネントをサポートするシステム管理者向けです。Salesforce で UI を構築する **推奨方法は Lightning Web コンポーネント（LWC）** で、「Aura から LWC への移行」トレイルで現行の Web 標準に準拠する方法を学習できます。

### SLDS のバージョンについて

**Salesforce Lightning Design System（SLDS）** には現在 2 つのバージョンがあります。

| バージョン | 概要 | スタイル設定の仕組み |
| --- | --- | --- |
| **SLDS 1** | 元の Salesforce Lightning Design System | Aura 設計トークン（Design Tokens） |
| **SLDS 2** | Spring '25 で導入された新しい CSS フレームワーク | スタイリングフック（Styling Hooks）で構造とビジュアルを分離 |

- Aura 設計トークンでスタイル設定している場合は **SLDS 1** で作業しています。
- SLDS 2 のメリットを享受するには、Aura コンポーネントを **LWC または Lightning 基本コンポーネント** にアップグレードしてスタイリングフックを使用します。

> [!用語] SLDS（Salesforce Lightning Design System）
>
> Salesforce 標準の見た目（色・余白・アイコンなど）を再現するデザインシステム。これに沿って作ると標準画面と統一感のある UI になります。

---

## 全体像：これから作るもの

クイックスタート全体では次の4部品を組み合わせて1つのコンポーネントを完成させます。本ユニットは最初の **(1) Apex コントローラー** を担当します。

```text
 ┌──────────────────────────────────────────────────────────┐
 │  Aura コンポーネント MyContactList（クライアント側）         │
 │                                                          │
 │   (2) マークアップ .cmp ── 画面の見た目                     │
 │   (3) コントローラー .js ── ボタン/初期化の処理              │
 │            │  c.getContacts を呼び出す                     │
 │            ▼                                              │
 └────────────┼─────────────────────────────────────────────┘
              │ サーバー通信
              ▼
 ┌──────────────────────────────────────────────────────────┐
 │  (1) Apex コントローラー MyContactListController（サーバー側）│
 │       @AuraEnabled getContacts(Id recordId)              │
 │            │  SOQL で取引先責任者を検索                     │
 │            ▼                                              │
 │        取引先責任者（Contact）のリストを返す                 │
 └──────────────────────────────────────────────────────────┘
```

> [!用語] Apex（エイペックス）
>
> Salesforce 上で動くサーバー側プログラミング言語。Java に似た構文で、データベース操作（SOQL や DML）やビジネスロジックを記述します。Aura/LWC コンポーネントはこの Apex メソッドを呼び出してデータをやり取りします。

---

## Apex コントローラーを作成する

> [!手順] Apex コントローラークラスを作成する
>
> 1. Trailhead Playground で画面右上の設定歯車アイコンをクリックし、**[Developer Console（開発者コンソール）]** を選択する。
> 2. **[File（ファイル）] | [New（新規）] | [Apex Class（Apex クラス）]** の順に選択する。
> 3. クラス名として `MyContactListController` と入力し、**[OK]** をクリックする。
> 4. クラス本文（`{}` 内）に次のコードを入力する。
> 5. **[File（ファイル）] | [Save（保存）]** を選択する。

> [!ポイント] コードのコピー方法
>
> コードスニペット右上の **[Copy（コピー）]** をクリックすると、コピー＆ペーストでき、手入力の打ち間違いを防げます。

```apex
// @AuraEnabled を付けると、このメソッドを Lightning コンポーネントから呼び出せる
@AuraEnabled
public static List<Contact> getContacts(Id recordId) {
   // recordId（取引先の ID）に一致する取引先責任者を検索して返す
   return [SELECT Id, FirstName, LastName, Email, Phone FROM Contact WHERE AccountId = :recordId];
}
```

`@AuraEnabled` が指定された Apex メソッドは、Lightning コンポーネントからコールできます。

---

## コードを1行ずつ読み解く

> [!手順] getContacts メソッドの処理の流れ
>
> 1. `@AuraEnabled` … このメソッドを **クライアント（Aura コンポーネント）から呼び出してよい** という許可を表すアノテーション。
> 2. `public static List<Contact>` … 戻り値は **取引先責任者（Contact）のリスト**。`static` なのでインスタンス化せず呼び出せます。
> 3. `getContacts(Id recordId)` … 引数として **取引先のレコード ID** を受け取ります。
> 4. `[SELECT ... FROM Contact WHERE AccountId = :recordId]` … **SOQL クエリ**。指定取引先に紐づく取引先責任者の Id・名・姓・メール・電話を取得します。
> 5. `:recordId` … SOQL に Apex 変数を埋め込む **バインド変数** 記法。

> [!用語] @AuraEnabled（オーラ・イネーブルド）
>
> Apex のメソッドや項目に付けるアノテーション。これを付けたメソッドだけが Aura/LWC コンポーネントから呼び出せます。「コンポーネントから使うなら必ず付ける」と覚えます。

> [!用語] SOQL（ソークル：Salesforce Object Query Language）
>
> Salesforce のデータベースからレコードを取得する問い合わせ言語。SQL に似ていますが、Salesforce のオブジェクトとリレーションに特化し、`SELECT 項目 FROM オブジェクト WHERE 条件` の形で書きます。`:変数名` の **バインド変数** で Apex 変数を安全に渡せ、SOQL インジェクション対策にもなります。

> [!例] このメソッドが返すもの
>
> 取引先「United Oil & Gas Corp」のレコード ID を `recordId` として渡すと、その取引先に紐づく取引先責任者（例：3 名）の Id・名・姓・メール・電話が **リスト** で返されます。これを次のユニットで作るコンポーネントが表示します。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] Aura/LWC のサーバー連携でよく問われること
>
> - **`@AuraEnabled` がないメソッドはコンポーネントから呼び出せない**（Aura・LWC 共通の頻出ポイント）。
> - 呼び出す Apex メソッドは **`static`** で定義するのが基本（LWC では必須）。
> - 公開メソッドは `public` か `global`。`private` では外部から呼べません。
> - 読み取り専用メソッドは `@AuraEnabled(cacheable=true)` でキャッシュ可（特に LWC）。
> - Apex は **ガバナ制限** の対象。SOQL 発行回数（同期で 100 回）などの上限を超えないよう、ループ内クエリを避けます。

> [!用語] ガバナ制限（Governor Limits）
>
> マルチテナント環境のため、1ユーザーがリソースを使いすぎないよう実行回数や処理量に設けられた上限。SOQL 発行回数や取得行数が代表例で、超過すると例外が発生します。

---

## リソース

- Salesforce ヘルプ：Lightning Aura コンポーネント開発者ガイド
- Salesforce ヘルプ：Apex 開発者ガイド
- Trailhead：Aura から Lightning Web コンポーネントへの移行

---

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めます。評価は英語データに対して行われるため、**英語の値のみ** をコピー＆ペーストします。日本語組織で不合格になった場合は、(1) [地域（Locale）] を [米国（United States）]、(2) [言語（Language）] を [英語（English）] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがあります。
