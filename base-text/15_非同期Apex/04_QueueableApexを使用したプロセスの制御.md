# Queueable Apex を使用したプロセスの制御

## 学習の目的

この単元を完了すると、次のことを理解できるようになります。

- `Queueable` インターフェースを使用するケース。
- queueable メソッドと future メソッドの違い。
- Queueable Apex の構文。
- queueable メソッドのベストプラクティス。

> [!ポイント] この単元のゴール
>
> 「**Queueable は future メソッドの上位互換**」。`Queueable` を実装し `execute(QueueableContext context)` を書いて `System.enqueueJob()` で登録する。**ジョブ ID が返る・sObject など複雑な型を渡せる・チェーニングできる**——この 3 つの利点が future との違いとして頻出。

---

## Queueable Apex

**Queueable Apex** は future メソッドの**スーパーセット（上位互換）**で、次の利点がある。

| 利点 | 内容 |
| --- | --- |
| **非プリミティブ型** | sObject 型やカスタム Apex 型など、プリミティブ以外のメンバー変数を持てる。 |
| **監視** | `System.enqueueJob()` がジョブを送信し、**`AsyncApexJob` レコードの ID を返す**。この ID で [Apex ジョブ] ページや SOQL から監視できる。 |
| **ジョブのチェーニング** | 実行中のジョブから 2 つ目のジョブを開始し、**連鎖実行**できる。 |

> [!用語] スーパーセット / ジョブのチェーニング（chaining）
>
> - **スーパーセット**：future の機能をすべて含み、さらに ID 取得・複雑な型・チェーニングを追加したもの。「迷ったら Queueable」が基本方針。
> - **チェーニング**：1 つのジョブが終わったら次を起動し数珠つなぎに実行すること。future では不可だが、Queueable は `execute()` の中から次のジョブを `enqueueJob()` するだけで連鎖できる。

---

## queueable と future の比較

queueable は機能的に future と同等で、ほとんどの場合 future の代わりに使える。ただし既存の future をすぐリファクタリングする必要はない。

| 比較項目 | future メソッド | Queueable Apex |
| --- | --- | --- |
| 宣言方法 | メソッドに `@future` | クラスに `Queueable` を実装 |
| 引数／メンバー | プリミティブ型（とそのコレクション）のみ | **sObject やカスタム型など非プリミティブ型も可** |
| ジョブ ID の取得 | できない | **`enqueueJob()` が ID を返す**（監視可能） |
| ジョブのチェーニング | できない | **できる**（1 親 → 1 子） |
| 同期／非同期の切り替え | しやすい（同期メソッドをラップ） | クラスへの変換が必要 |

> [!ポイント] あえて future を使う理由
>
> 「同じ機能を、あるときは同期、あるときは非同期で実行したい」場合は future が便利。queueable クラスに変換するより、**同期メソッドをラップする future を 1 つ作るだけ**で済む。

```apex
@Future
static void myFutureMethod(List<String> params) {
    // 同期メソッドを呼び出す
    mySyncMethod(params);
}
```

---

## キュー可能構文

`Queueable` インターフェースを実装し、`execute(QueueableContext context)` の 1 つだけを実装する。

```apex
public with sharing class SomeClass implements Queueable {
    public void execute(QueueableContext context) {
        // ここに処理を書く
    }
}
```

> [!例] future との書き方の違い
>
> future は「メソッドに `@future` を付ける」スタイル、Queueable は「**クラスに `implements Queueable` を付け、`execute` を実装する**」スタイル。クラスなのでコンストラクターを持て、sObject のリストなどを受け取って保持できるのが大きな違い。

---

## サンプルコード

一般的な Queueable のワークフローは、sObject レコードのセットを取得して処理し、非同期に DB を更新するというもの。future は sObject を渡せないため、**sObject のリストをそのまま渡せる Queueable が理想的**。次のコードは取引先のコレクションを取り、各レコードに `parentId` を設定して更新する。

```apex
public with sharing class UpdateParentAccount implements Queueable {
    private List<Account> accounts;
    private ID parent;
    public UpdateParentAccount(List<Account> records, ID id) {
        this.accounts = records;
        this.parent = id;
    }
    public void execute(QueueableContext context) {
        for (Account account : accounts) {
          account.parentId = parent;
          // ほかの処理やコールアウトを実行する
        }
        update as user accounts;
    }
}
```

> [!手順] このクラスの構造
>
> 1. **メンバー変数**：`accounts`（取引先のリスト）と `parent`（親取引先の ID）。future では渡せないが Queueable なら sObject のリストを持てる。
> 2. **コンストラクター**：ジョブ作成時に、処理対象リストと親 ID を受け取って保存する。
> 3. **`execute()`**：保存したデータを使い、各取引先に親 ID を設定してまとめて更新する。

このクラスをジョブとしてキューに追加するには次を実行する。

```apex
// 'NY' のすべての取引先を検索する
List<Account> accounts = [
  SELECT Id
  FROM Account
  WHERE BillingState = 'NY'
  WITH USER_MODE
];
// すべてのレコードの親となる特定の取引先を検索する
Id parentId = [
  SELECT Id
  FROM Account
  WHERE Name = 'ACME Corp'
  WITH USER_MODE
][0]
.Id;
// Queueable クラスの新しいインスタンスを生成する
UpdateParentAccount updateJob = new UpdateParentAccount(accounts, parentId);
// 処理のためにジョブをキューに追加する
ID jobID = System.enqueueJob(updateJob);
```

> [!用語] `System.enqueueJob()`
>
> Queueable ジョブを実行キューに登録するメソッド。リソースが空くと処理される。戻り値として `AsyncApexJob` の**ジョブ ID（`jobID`）が返る**のがポイントで、これで進行状況を監視できる。

ジョブ ID を使い、[Apex Job] ページや SOQL で進行状況を監視できる。

```sql
SELECT Id, Status, NumberOfErrors FROM AsyncApexJob WHERE Id = :jobID WITH USER_MODE
```

---

## Queueable Apex のテスト

Apex 一括処理のテストとよく似ている。`@TestSetup` の `setup()` が 1 件の親取引先と 100 件の子取引先を作成・挿入し、このデータを Queueable クラスで使う。

> [!ポイント] 非同期処理は `startTest`/`stopTest` で囲む
>
> ジョブを **`Test.startTest()` から `Test.stopTest()` のブロック内**でキューに送信すると、`Test.stopTest()` 後に非同期プロセスが同期実行される。future・Batch・Scheduler のテストでも共通の鉄則。

```apex
@IsTest
public with sharing class UpdateParentAccountTest {
  @TestSetup
  static void setup() {
    List<Account> accounts = new List<Account>();
    // 親取引先を 1 件追加する
    accounts.add(new Account(name = 'Parent'));
    // 子取引先を 100 件追加する
    for (Integer i = 0; i < 100; i++) {
      accounts.add(new Account(name = 'Test Account' + i));
    }
    insert as user accounts;
  }
  @IsTest
  static void testQueueable() {
    // queueable クラスに渡すテストデータを照会する
    Id parentId = [
      SELECT Id
      FROM Account
      WHERE Name = 'Parent'
      WITH USER_MODE
    ][0]
    .Id;
    List<Account> accounts = [
      SELECT Id, Name
      FROM Account
      WHERE Name LIKE 'Test Account%'
      WITH USER_MODE
    ];
    // queueable インスタンスを生成する
    UpdateParentAccount updater = new UpdateParentAccount(accounts, parentId);
    // 非同期処理を強制的に実行させる startTest/stopTest ブロック
    Test.startTest();
    System.enqueueJob(updater);
    Test.stopTest();
    // ジョブが実行されたことを検証する。レコードに正しい parentId が設定されたか確認する
    Assert.areEqual(
      100,
      [SELECT COUNT() FROM Account WHERE parentId = :parentId WITH USER_MODE]
    );
  }
}
```

テストの最後で、更新された取引先を照会し、`parentId` が正しく設定された取引先が 100 件あることを検証している。

---

## ジョブのチェーニング

ジョブを連続実行する必要がある場合、Queueable のチェーニングが役立つ。`execute()` メソッドから 2 つ目のジョブを送信する。

> [!ポイント] 1 親ジョブにつき子ジョブは 1 つだけ
>
> 実行中のジョブから追加できるジョブは **1 つのみ**（1 親 → 1 子）。同じジョブから複数の子ジョブは開始できない。

```apex
public with sharing class FirstJob implements Queueable {
    public void execute(QueueableContext context) {
        // 何らかの処理ロジックをここに書く
        // 次のジョブを送信してこのジョブにチェーニングする
        System.enqueueJob(new SecondJob());
    }
}
```

```text
[FirstJob]
   │ execute() の中で enqueueJob(new SecondJob())
   ▼
[SecondJob]
   │ execute() の中でさらに次を enqueue……
   ▼
[ThirdJob] ...（1 親 → 1 子で数珠つなぎ）
```

定義済みのスタック深度でチェーンをテストできるが、適用される Apex ガバナ制限に注意。詳細は「Adding a Queueable Job with a Specified Stack Depth」を参照。

---

## 留意事項

| 留意事項 | 内容 |
| --- | --- |
| **共有制限への計上** | キュー内のジョブを実行すると、非同期 Apex メソッド実行の共有制限値に 1 回計数される。 |
| **1 トランザクションの上限** | 1 トランザクションで `System.enqueueJob` でキューに追加できる最大数は **50 ジョブ**。 |
| **チェーニングの分岐不可** | 実行中のジョブから追加できるジョブは **1 つのみ**（1 親 → 1 子）。 |
| **チェーンの深度** | 基本的に制限はないが、**Developer Edition / トライアル組織**では最大スタック深度が **5**（チェーニング 4 回、親含め最大 5 ジョブ）。設定で上書き可能。 |

> [!用語] スタック深度（stack depth）
>
> チェーンで連なったジョブの「段数」。親ジョブを 1 段目として何段まで連鎖できるかを表す。Developer Edition では 5 段まで。

> [!注意] future との致命的な違い
>
> future は「future から future を呼べない（チェーニング不可）」、Queueable は「チェーニングできる」。**ジョブを連続実行したい要件が出たら future ではなく Queueable**、という判断が試験で問われる。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] Queueable Apex のよくある出題
>
> - 実装するのは **`Queueable` インターフェース**、メソッドは **`execute(QueueableContext context)`**、登録は **`System.enqueueJob()`**。
> - future に対する 3 つの利点：**①非プリミティブ型（sObject）OK ②ジョブ ID が返る（監視可）③チェーニング可**。
> - 1 トランザクションで enqueue できるのは最大 **50** ジョブ。チェーニングは **1 親 → 1 子**。
> - Developer Edition のチェーン最大スタック深度は **5**。
> - テストは `Test.startTest()` / `Test.stopTest()` で囲む。

---

## リソース

- Apex 開発者ガイド：Queueable Apex

---

## ハンズオン Challenge（+500 ポイント）

この単元は各自のハンズオン組織で実行します。[起動] をクリックして開始するか、組織の名前をクリックして別の組織を選びます。

> [!まとめ] あなたの Challenge：取引先責任者を挿入する Queueable Apex クラスを作成する
>
> 特定の州の各取引先に、同じ取引先責任者を挿入する Queueable Apex クラスを作成します。
>
> **作成する Apex クラス**
>
> | 設定 | 値 |
> | --- | --- |
> | 名前 | `AddPrimaryContact` |
> | Interface（インターフェース） | `Queueable` |
>
> - 第 1 引数として Contact sObject、第 2 引数として州の略称の文字列を受け入れるコンストラクターを作成する。
> - `execute` メソッドで、コンストラクターに渡された州の略称の `BillingState` を持つ**最大 200 件**の取引先を照会し、各取引先に関連付けた Contact sObject レコードを挿入する（sObject の `clone()` メソッドを参照）。
>
> **作成する Apex テストクラス**
>
> | 設定 | 値 |
> | --- | --- |
> | Name（名前） | `AddPrimaryContactTest` |
>
> - `BillingState` が `NY` の取引先 50 件と、`BillingState` が `CA` の取引先 50 件を挿入する。
> - `AddPrimaryContact` のインスタンスを作成してジョブをキューに登録し、`BillingState` が `CA` の 50 件の取引先それぞれに取引先責任者レコードが挿入されたことを確認する。
> - 単体テストは `AddPrimaryContact` のすべてのコード行をカバーし、コードカバー率 **100%** になる必要がある。
> - 完了確認の前に、Developer Console の [Run All（すべて実行）] でテストクラスを少なくとも 1 回実行する。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語 Playground で開始し、かっこ内の翻訳を参照しながら進める。評価は英語データに対して行われるため**英語の値のみ**をコピー＆ペーストする。不合格時は、(1) [地域] を [米国]、(2) [言語] を [英語] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがある。
