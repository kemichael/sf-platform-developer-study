# Apex 一括処理の使用

## 学習の目的

この単元を完了すると、次のことを理解できるようになります。

- Apex 一括処理を使用する場面。
- Apex 一括処理使用時の Apex 制限の引き上げ。
- Apex 一括処理の構文。
- Apex 一括処理のベストプラクティス。

> [!ポイント] この単元のゴール
>
> 「**数千〜数百万件の大量レコードを、200 件ずつのバッチに分け、各バッチを別々のトランザクションとして処理する**」のが Apex 一括処理。`Database.Batchable` の **`start()` / `execute()` / `finish()` の 3 メソッド**と、状態を引き継ぐ `Database.Stateful` が中心。

---

## Apex 一括処理

**Apex 一括処理（Batch Apex）** は、通常の処理制限を超える大規模ジョブ（数千〜数百万件）の実行に使う。プラットフォームの制限を超えずにレコードを**バッチ単位で非同期処理**でき、データの整理やアーカイブに適する。

> [!用語] バッチ（batch）／一括処理
>
> 大量データを「ひとかたまり（バッチ）」に分割して順番に処理する方式。100 万件を 200 件ずつにすれば 5,000 バッチになる。1 バッチごとにガバナ制限がリセットされるため、巨大な処理を制限内に収められる。

実行ロジックはバッチごとに 1 回コールされ、各呼び出しは Apex ジョブキューに置かれて**別個のトランザクション**として実行される。利点は 2 つ。

- 各トランザクションは**新しいガバナ制限のセット**で開始されるため、制限内に抑えやすい。
- いずれかのバッチが失敗しても、正常に処理されたほかは**ロールバックされない**。

```text
100 万件のレコード
   │  start() が対象レコードを収集
   ▼
┌──────┬──────┬──────┬─────┬──────┐
│200件 │200件 │200件 │ ... │200件 │  ← 各バッチ = 別トランザクション
└──┬───┴──┬───┴──┬───┴─────┴──┬───┘
   ▼      ▼      ▼            ▼
 execute() がバッチごとに 1 回ずつ呼ばれる（制限はバッチ単位でリセット）
   │
   ▼
 finish()（全バッチ完了後に 1 回だけ：メール送信などの後処理）
```

> [!例] 1 バッチ失敗してもほかは生きる
>
> 5,000 バッチのうち 3 番目でエラーが出ても、1・2 番目で更新済みのレコードはロールバックされない。失敗したバッチだけが影響を受け、残りは正常に処理される。これが「巨大ジョブを安全に回せる」理由。

---

## Apex 一括処理の構文

クラスに `Database.Batchable` インターフェースを実装し、次の **3 メソッド**を含める。

> [!用語] インターフェースの実装（implements）
>
> インターフェースは「このメソッドを必ず用意する」という約束ごとの一覧。`implements Database.Batchable<sObject>` は「`start` / `execute` / `finish` を必ず実装する」契約で、Salesforce 側がこの 3 メソッドを決まった順に呼び出す。

| メソッド | 呼ばれる回数 | 役割 |
| --- | --- | --- |
| **`start()`** | ジョブ開始時に **1 回** | `execute()` に渡すレコードを収集。`Database.QueryLocator` か `Iterable` を返す。 |
| **`execute()`** | バッチごとに **複数回** | 渡されたバッチごとに実際の処理を実行。デフォルトのバッチサイズは 200。 |
| **`finish()`** | 全バッチ完了後に **1 回** | 後処理操作（メール送信など）を実行。 |

### start() メソッド

ジョブ開始時に **1 回**コールされ、`execute()` に渡すレコードを収集する。`Database.QueryLocator` か `Iterable` を返す。

> [!用語] `Database.QueryLocator`
>
> SOQL クエリの「対象範囲」を表すオブジェクト。レコードを全部メモリに読むのではなく「この条件のレコード群」というポインタを返す。多くの場合、単純な SOQL で対象範囲を生成する。

> [!ポイント] QueryLocator と Iterable の違い（頻出）
>
> | 方式 | レコード総数のガバナ制限 | 最大件数 |
> | --- | --- | --- |
> | **`QueryLocator`**（SOQL） | **無視される** | 最大 **5,000 万**レコード |
> | **`Iterable`**（カスタムイテレーター） | **そのまま適用** | 通常の SOQL 取得制限内 |
>
> 大量データを単純な SOQL で処理するなら `QueryLocator`。API コール結果のループや前処理など複雑な処理が必要なら `Iterable`。

### execute() メソッド

渡されたバッチごとに実際の処理を実行する。デフォルトのバッチサイズは **200**。`start()` から受け取った順序で実行される保証はない。パラメーターは次のとおり。

- `Database.BatchableContext` オブジェクトへの参照。
- `List<sObject>` などの sObject のリスト（`QueryLocator` 使用時は返されたリスト）。

### finish() メソッド

後処理操作（メール送信など）に使い、**すべてのバッチ処理後に 1 回**コールされる。

### スケルトン

```apex
public with sharing class MyBatchClass implements Database.Batchable<sObject> {
    public (Database.QueryLocator | Iterable<sObject>) start(Database.BatchableContext bc) {
        // execute に渡すレコードまたはオブジェクトのバッチを収集する
    }
    public void execute(Database.BatchableContext bc, List<P> records){
        // 各バッチのレコードを処理する
    }
    public void finish(Database.BatchableContext bc){
        // 後処理操作を実行する
    }
}
```

---

## 一括処理クラスの呼び出し

一括処理クラスをインスタンス化し、そのインスタンスで `Database.executeBatch` をコールする。

```apex
MyBatchClass myBatchObject = new MyBatchClass();
Id batchId = Database.executeBatch(myBatchObject);
```

2 つ目の `scope` パラメーターで、バッチごとに `execute` に渡すレコード数を指定できる。

> [!ポイント] ガバナ制限に近づいたらバッチサイズを下げる
>
> 1 バッチの処理が重く制限に近づく場合は、`scope` でバッチサイズを小さくする（下の例では 100）。小さくするほど 1 トランザクションあたりの負荷が下がる。

```apex
Id batchId = Database.executeBatch(myBatchObject, 100);
```

一括処理を呼び出すごとに `AsyncApexJob` レコードが作成され、進行状況を SOQL で追跡できる。

> [!用語] `AsyncApexJob`
>
> 非同期ジョブ 1 件ごとに作られる「ジョブの記録」オブジェクト。状況（Status）、処理済みバッチ数（JobItemsProcessed）、総バッチ数（TotalJobItems）、エラー数（NumberOfErrors）などを保持し、SOQL で照会して監視できる。

```sql
AsyncApexJob job =[
  SELECT Id, Status, JobItemsProcessed, TotalJobItems, NumberOfErrors
  FROM AsyncApexJob
  WHERE ID = :batchId
  WITH USER_MODE
];
```

---

## Apex 一括処理での状態の使用

Apex 一括処理は通常**ステートレス**で、各実行は個別のトランザクションとみなされる（例：1,000 件・デフォルトサイズなら 200 件ずつ 5 トランザクション）。

> [!用語] ステートレス / ステートフル（stateful）
>
> - **ステートレス**：各バッチが独立し、前のバッチの変数の値を覚えていない。
> - **ステートフル**：バッチをまたいで変数の値を保持する。
>
> クラス定義で `Database.Stateful` を指定すると状態を保持できる。このとき**インスタンスメンバー変数のみ**が値を保持する。

> [!例] `Database.Stateful` が役立つ場面
>
> 「合計で何件更新したか」を `finish()` でメールに書きたいとする。ステートレスだと各バッチのカウントは消えるが、`Database.Stateful` を付ければ各 `execute()` の `recordsProcessed` が積算され、`finish()` で総数を参照できる。

---

## Apex 一括処理のサンプルコード

ビジネス要件：米国内企業のすべての取引先責任者は、郵送先住所として親会社の請求先住所が設定されていなければならない。次のクラスは、`QueryLocator` で取得した取引先の関連取引先責任者を取引先の請求先住所で更新し、`Database.Stateful` で追跡した更新件数を含むメールを最後に送信する。

```apex
public with sharing class UpdateContactAddresses implements Database.Batchable<sObject>, Database.Stateful {
  // トランザクション間で状態を保持するインスタンスメンバー
  public Integer recordsProcessed = 0;
  public Database.QueryLocator start(Database.BatchableContext bc) {
    return Database.getQueryLocator(
      'SELECT ID, BillingStreet, BillingCity, BillingState, ' +
        'BillingPostalCode, (SELECT ID, MailingStreet, MailingCity, ' +
        'MailingState, MailingPostalCode FROM Contacts) FROM Account ' +
        'Where BillingCountry = \'USA\'',
      AccessLevel.USER_MODE
    );
  }
  public void execute(Database.BatchableContext bc, List<Account> scope) {
    // 各バッチのレコードを処理する
    List<Contact> contacts = new List<Contact>();
    for (Account account : scope) {
      for (Contact contact : account.contacts) {
        contact.MailingStreet = account.BillingStreet;
        contact.MailingCity = account.BillingCity;
        contact.MailingState = account.BillingState;
        contact.MailingPostalCode = account.BillingPostalCode;
        // 更新対象のリストに取引先責任者を追加する
        contacts.add(contact);
        // インスタンスメンバーのカウンターを増やす
        recordsProcessed = recordsProcessed + 1;
      }
    }
    update as user contacts;
  }
  public void finish(Database.BatchableContext bc) {
    System.debug(recordsProcessed + ' records processed. Shazam!');
    AsyncApexJob job = [
      SELECT
        Id,
        Status,
        NumberOfErrors,
        JobItemsProcessed,
        TotalJobItems,
        CreatedBy.Email
      FROM AsyncApexJob
      WHERE Id = :bc.getJobId()
      WITH USER_MODE
    ];
    // メール送信ユーティリティを呼び出す
    EmailUtils.sendMessage(job, recordsProcessed);
  }
}
```

> [!手順] このサンプルの処理を追う
>
> 1. **`start()`**：`Database.getQueryLocator` で [国（請求先）] が「USA」の取引先を照会し、処理対象を用意する。
> 2. **`execute()`**：200 レコードずつのバッチが第 2 パラメーターで渡される。各取引先責任者の郵送先住所を取引先の請求先住所に設定し、`recordsProcessed` を増やす。
> 3. **`finish()`**：`AsyncApexJob` を照会して状況・送信者アドレスを取得し、ジョブ情報と更新件数を含む通知メールを送信する。

---

## Apex 一括処理のテスト

テストレコードを挿入し、一括処理クラスをコールし、レコードが正しい住所で更新されたことを確認する。

```apex
@IsTest
private with sharing class UpdateContactAddressesTest {
  @TestSetup
  static void setup() {
    List<Account> accounts = new List<Account>();
    List<Contact> contacts = new List<Contact>();
    // 取引先を 10 件挿入する
    for (Integer i = 0; i < 10; i++) {
      accounts.add(
        new Account(
          name = 'Account ' + i,
          billingcity = 'New York',
          billingcountry = 'USA'
        )
      );
    }
    insert as user accounts;
    // 挿入した取引先を取得し、各取引先に取引先責任者を追加する
    for (Account account : [SELECT id FROM account WITH USER_MODE]) {
      contacts.add(
        new Contact(
          firstname = 'first',
          lastname = 'last',
          accountId = account.id
        )
      );
    }
    insert as user contacts;
  }
  @IsTest
  static void test() {
    Test.startTest();
    UpdateContactAddresses uca = new UpdateContactAddresses();
    Id batchId = Database.executeBatch(uca);
    Test.stopTest();
    // テスト停止後、レコードが正しく更新されたことを検証する
    Assert.areEqual(
      10,
      [
        SELECT COUNT()
        FROM contact
        WHERE MailingCity = 'New York'
        WITH USER_MODE
      ]
    );
  }
}
```

> [!用語] `@TestSetup` アノテーション
>
> `@TestSetup` を付けたメソッドで作成したレコードは、そのテストクラス内の**すべてのテストメソッドで共通利用**できる。各テストメソッド終了ごとに更新はロールバックされ、毎回まっさらな共通データから始められる。

`setup()` が請求先市区郡「New York」・請求先国「USA」の取引先 10 件と関連取引先責任者を作成し、`test()` で一括処理クラスを `Test.startTest` / `Test.stopTest` 内で実行する。ジョブは `Test.stopTest` 後に同期実行され、最後に郵送先市区郡「New York」の取引先責任者数が 10 件であることを検証する。

> [!注意] テストで処理できるバッチは 1 つだけ
>
> **テストメソッドが実行できるバッチは 1 つのみ**。挿入するレコード数はバッチサイズの 200 件以下にし、`start()` で返される `Iterable` がバッチサイズと一致していることを確認する。

---

## ベストプラクティス

一括処理ジョブを高速化するには、コールアウト回数を最小限にし、クエリを調整する。実行時間が長いほどキュー内のほかのジョブが遅延しやすい。

- レコードのバッチが複数あるなら必ず Apex 一括処理を使う。複数バッチに足りない少量なら **Queueable Apex** を推奨。
- できるだけ迅速に収集・実行できるよう SOQL クエリを調整する。
- 遅延を最小化するため、作成する非同期要求の数を最小限にする。
- トリガーから開始する場合、**制限を超える数の一括処理ジョブをトリガーで追加しない**。

> [!ポイント] Batch と Queueable の使い分け
>
> 複数バッチに分けるほどレコードがある（数千件以上）なら **Batch**。バッチに分けるほどではない少量〜中量を非同期処理したいだけなら **Queueable**。試験では「どちらを選ぶか」がよく問われる。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] Apex 一括処理のよくある出題
>
> - 実装するインターフェースは **`Database.Batchable<sObject>`**、必須メソッドは **`start()` / `execute()` / `finish()`**。
> - 呼び出しは **`Database.executeBatch(インスタンス [, scope])`**。`scope` 省略時のバッチサイズは **200**。
> - **`QueryLocator` は最大 5,000 万件**まで照会可能（SOQL 行数制限が無視される）。`Iterable` は通常の制限が適用。
> - バッチをまたいで値を保持したいなら **`Database.Stateful`** を実装（インスタンス変数のみ保持）。
> - **テストでは 1 バッチ分（200 件以下）のみ**実行できる。

---

## リソース

- Apex 開発者ガイド：Apex の一括処理
- Apex 開発者ガイド：Apex 一括処理の使用
- Apex 開発者ガイド：カスタムイテレーター
- Apex 開発者ガイド：TestSetup アノテーション

---

## ハンズオン Challenge（+500 ポイント）

この単元は各自のハンズオン組織で実行します。[起動] をクリックして開始するか、組織の名前をクリックして別の組織を選びます。

> [!まとめ] あなたの Challenge：Apex 一括処理でリードレコードを更新する
>
> `Database.Batchable` インターフェースを実装して、組織のすべてのリードレコードを特定の LeadSource で更新する Apex クラスを作成します。
>
> **作成する Apex クラス**
>
> | 設定 | 値 |
> | --- | --- |
> | 名前 | `LeadProcessor` |
> | Interface（インターフェース） | `Database.Batchable` |
>
> - `start` メソッドで `QueryLocator` を使い、組織のすべての Lead レコードを収集する。
> - `execute` メソッドで、すべての Lead レコードを `Dreamforce` の LeadSource 値で更新する。
>
> **作成する Apex テストクラス**
>
> - 名前：`LeadProcessorTest`
> - **200 件の Lead レコードを挿入**し、`LeadProcessor` Batch クラスを実行して、すべての Lead が正しく更新されたことを検証する。
> - 単体テストは `LeadProcessor` のすべてのコード行をカバーし、コードカバー率 **100%** になる必要がある。
> - 完了確認の前に、Developer Console の [Run All（すべて実行）] でテストクラスを少なくとも 1 回実行する。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語 Playground で開始し、かっこ内の翻訳を参照しながら進める。評価は英語データに対して行われるため**英語の値のみ**をコピー＆ペーストする。不合格時は、(1) [地域] を [米国]、(2) [言語] を [英語] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがある。
