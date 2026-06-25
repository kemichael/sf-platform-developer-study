# 構文・メソッドリファレンス

Salesforce Platform デベロッパー試験で問われる「各ソース（SOQL / SOSL / DML / Apex / Visualforce / LWC / Aura）の構文とメソッド」を、コード例と短い解説でまとめた逆引きリファレンスです。「書き方を思い出したいとき」「メソッド名を確認したいとき」にここを開けば大体わかる、を目指しています。

> [!ポイント] このページの使い方
>
> 左のサイドバーがソース（言語・API）ごとのカテゴリです。上部の検索ボックスでサブトピックを絞り込めます。各コード例はテーマに応じて構文ハイライトされ、右上のボタンでコピーできます。

> [!注意] 表記について
>
> カスタムオブジェクト／カスタム項目は API 参照名に `__c`、カスタムリレーションは `__r` が付きます。コード例の API バージョンや項目名は説明用の一例です。

---

## 1. SOQL — クエリ構文

Salesforce Object Query Language。**1 オブジェクト（およびその関係先）**からレコードを取得する。SQL と違い `SELECT *` は使えず、取得項目を必ず明示する。

### 基本構文（SELECT / FROM / WHERE）

句の順序は `SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT → OFFSET` で固定。必須は `SELECT` と `FROM` のみ。

```sql
SELECT Name, Phone, NumberOfEmployees
FROM Account
WHERE NumberOfEmployees > 25
ORDER BY Name
LIMIT 10
```

> [!注意] SELECT * は使用不可
>
> マルチテナント保護のため全項目ワイルドカードは使えない。代わりに `SELECT FIELDS(ALL)` / `FIELDS(STANDARD)` / `FIELDS(CUSTOM)` が使える（`FIELDS(ALL)` は `LIMIT` 必須）。Apex のインラインクエリでは `Id` を書かなくても常に返る。

### WHERE 句と演算子

比較演算子は `= != < > <= >=`、論理演算子は `AND / OR / NOT`、その他 `IN / NOT IN / LIKE / INCLUDES / EXCLUDES`。文字列はシングルクォートで囲み、比較は大文字小文字を区別しない。

```sql
SELECT Id, Name FROM Account
WHERE (Name = 'SFDC Computing'
       OR (NumberOfEmployees > 25 AND BillingCity = 'Los Angeles'))
```

`LIKE` のワイルドカードは `%`（0 文字以上）と `_`（任意 1 文字）。

```sql
SELECT Id FROM Contact WHERE Name LIKE 'SFDC%'      -- 前方一致（高速）
SELECT Id FROM Contact WHERE Email LIKE '%.net%'    -- 中間一致（先頭%はインデックスが効かず遅い）
```

### ORDER BY / LIMIT / OFFSET

```sql
SELECT Name FROM Account
ORDER BY Name DESC NULLS LAST   -- 既定は ASC。NULLS FIRST / NULLS LAST で null の位置を制御
LIMIT 100                        -- 返す最大件数
OFFSET 20                        -- 先頭から 20 件スキップ（最大 2,000）
```

> [!豆知識] LIMIT 1 は単一 sObject で受け取れる
>
> `Account a = [SELECT Name FROM Account LIMIT 1];` のようにリストでなく単一変数に代入できる。0 件のときは例外（`List has no rows for assignment`）になる点に注意。

### 関係クエリ（親子）

**子 → 親（ドット表記）**: 参照項目をたどる。最大 5 レベル。標準リレーションはそのまま、カスタムは `__r`。

```sql
SELECT FirstName, LastName, Account.Name, Account.Owner.Name
FROM Contact
```

**親 → 子（サブクエリ）**: 親クエリ内に子取得サブクエリを入れ子にする。子側 FROM は**複数形のリレーション名**（標準は `Contacts`、カスタムは `Items__r`）。

```sql
SELECT Name, (SELECT FirstName, LastName FROM Contacts)
FROM Account
```

```apex
// Apex では子レコードはリレーション名プロパティから取り出す
List<Account> accts = [SELECT Name, (SELECT LastName FROM Contacts) FROM Account];
Contact[] cts = accts[0].Contacts;
```

> [!ポイント] SOQL に JOIN は無い
>
> `JOIN` / `UNION` は存在しない。関係クエリで上下 5 階層までたどることで代替する。

### 集計関数・GROUP BY・HAVING

集計関数は `COUNT() / COUNT(field) / COUNT_DISTINCT() / SUM() / AVG() / MIN() / MAX()`。集計クエリの結果は **`AggregateResult`** で受け取り、別名で値を取り出す。

```sql
SELECT Industry, COUNT(Id) total, AVG(AnnualRevenue) avgRev
FROM Account
GROUP BY Industry
HAVING COUNT(Id) > 5          -- 集計後の絞り込み（WHERE は集計前）
```

```apex
List<AggregateResult> results =
    [SELECT Industry, COUNT(Id) total FROM Account GROUP BY Industry];
for (AggregateResult ar : results) {
    String ind   = (String)  ar.get('Industry');
    Integer total = (Integer) ar.get('total');   // get() は Object 型なのでキャストが必要
}
```

> [!注意] COUNT() と COUNT(field) の違い
>
> `COUNT()`（引数なし）は件数を **Integer** で直接返す。`COUNT(fieldName)` は null 以外の件数を **AggregateResult** で返す。

### バインド変数とインライン SOQL

Apex 変数を `:変数名` で差し込む。SOQL インジェクション対策にもなる。

```apex
String dept = 'Finance';
Set<Id> ids = new Set<Id>{ '001...', '001...' };
List<Contact> cons =
    [SELECT Id FROM Contact WHERE Department = :dept AND AccountId IN :ids];
```

> [!ポイント] バインド変数が使える場所は限られる
>
> `WHERE` のフィルタ値、`IN / NOT IN` の値、`LIMIT` / `OFFSET` の数値、`FIND` の検索文字列など。**SELECT する項目名や FROM のオブジェクト名には使えない**。

### SOQL for ループ

クエリ結果をループする。**リスト形式**は 200 件単位で取り込むためヒープ制限を回避でき、大量データで推奨。

```apex
// 1 件ずつ
for (Account a : [SELECT Id, Name FROM Account]) { /* ... */ }

// 200 件のまとまりごと（推奨）
for (List<Account> batch : [SELECT Id FROM Account WHERE Name LIKE 'A%']) {
    for (Account a : batch) { /* ... */ }
}
```

### 動的 SOQL とインジェクション対策

```apex
String q = 'SELECT Id, Name FROM Account WHERE Name = \'' 
         + String.escapeSingleQuotes(userInput) + '\'';
List<Account> rows = Database.query(q);
```

> [!注意] 文字列連結でクエリを組むなら必ず対策する
>
> テキスト入力は `String.escapeSingleQuotes()` でエスケープ、数値・真偽値は `Integer.valueOf()` 等で型変換してから連結する。最も安全なのはバインド変数を使うこと。

---

## 2. SOSL — 検索構文

Salesforce Object Search Language。**複数オブジェクトを横断**してテキスト検索する。単語単位のインデックス検索で、あいまい検索や複数オブジェクト同時取得に向く。

### FIND の基本構文

3 部構成 `FIND（必須）→ IN（検索範囲）→ RETURNING（取得対象）`。**検索語の囲み方が実行環境で異なる**のが頻出ポイント。

```sql
-- クエリエディタ / REST API では中括弧 { }
FIND {Acme} IN ALL FIELDS RETURNING Account(Name), Contact(FirstName, LastName)
```

```apex
// Apex では一重引用符 ' '（戻り値は List<List<sObject>>）
List<List<sObject>> result =
    [FIND 'Acme' IN ALL FIELDS RETURNING Account(Name), Contact(FirstName, LastName)];
Account[] accounts = (Account[]) result[0];   // RETURNING の順に格納される
Contact[] contacts = (Contact[]) result[1];
```

> [!ポイント] 検索語の囲み方の引っかけに注意
>
> クエリエディタ／API は **中括弧 `{ }`**、Apex は **一重引用符 `' '`**。試験で頻出。

### ワイルドカードと演算子

`*`（0 文字以上）と `?`（ちょうど 1 文字）。語句は二重引用符で囲む。`AND / OR` と括弧でグループ化可。

```sql
FIND {jos* AND "data cloud"} IN NAME FIELDS RETURNING Lead(Name)
```

### IN 句（検索範囲）と RETURNING

検索範囲は `ALL FIELDS`（既定）/ `NAME FIELDS` / `EMAIL FIELDS` / `PHONE FIELDS` / `SIDEBAR FIELDS`。`RETURNING` 内では各 sObject の括弧内に `WHERE / ORDER BY / LIMIT` を書ける。項目を書かないと Id のみ返る。

```sql
FIND {cloud} IN ALL FIELDS
RETURNING Account(Name, Industry WHERE Industry = 'Apparel' ORDER BY Name LIMIT 10),
          Contact(FirstName, LastName)
```

> [!豆知識] SOSL と SOQL の使い分け
>
> 1 オブジェクトを正確な条件で取るなら **SOQL**、複数オブジェクトを横断してテキストを探すなら **SOSL**。SOSL は単語一致（`Digital` で `The Digital Company` もヒット）で、英語データの取引先・取引先責任者・リード・ユーザーではニックネーム（Joseph⇄Joey）も検索する。

> [!注意] テスト中の SOSL は空結果
>
> Apex テストでは SOSL は既定で結果を返さない。`Test.setFixedSearchResults(new List<Id>{...})` で固定の検索結果を設定する。

---

## 3. DML & Database クラス

レコードの作成・更新・削除を行う。**DML ステートメント**（`insert` など）と **Database クラスのメソッド**（`Database.insert` など）の 2 つの書き方がある。

### DML ステートメント（6 種）

```apex
Account a = new Account(Name = 'Acme');
insert a;                 // 挿入。成功すると a.Id に採番値が入る
a.Phone = '03-0000-0000';
update a;                 // 更新
upsert a;                 // Id 一致で更新、無ければ挿入
upsert con Contact.fields.Email;  // 外部 ID / idLookup 項目を照合キーにできる
delete a;                 // 削除（ごみ箱へ。15 日間は復元可）
undelete a;               // ごみ箱から復元
merge masterAcct duplicateList;   // 同型 最大 3 件を 1 件に統合（子を再ペアレント化）
```

> [!注意] merge できるのは 4 種だけ／unmerge は無い
>
> `merge` はリード・取引先責任者・ケース・取引先のみ。`unmerge` というステートメントは存在しない（引っかけ）。

### 一括 DML（リスト渡し）

リストを渡すと**全体で 1 DML ステートメント**として扱われる。ループ内で 1 件ずつ DML すると 150 回制限にすぐ達するため、必ずリストに溜めてからまとめて実行する。

```apex
List<Contact> toInsert = new List<Contact>();
for (Integer i = 0; i < 200; i++) {
    toInsert.add(new Contact(LastName = 'Test ' + i));
}
insert toInsert;          // ループの外で 1 回だけ
```

### Database クラスのメソッドと allOrNone

第 2 引数 `allOrNone` に `false` を渡すと**部分成功**を許可する（例外を投げず、成功分はコミット）。結果は `SaveResult` 等のオブジェクトで 1 件ずつ受け取る。

```apex
Database.SaveResult[] results = Database.insert(conList, false);  // 部分成功を許可
for (Database.SaveResult sr : results) {
    if (sr.isSuccess()) {
        System.debug('成功 Id: ' + sr.getId());
    } else {
        for (Database.Error err : sr.getErrors()) {
            System.debug(err.getStatusCode() + ': ' + err.getMessage());
        }
    }
}
```

| 書き方 | エラー時の挙動 | 例外 |
| --- | --- | --- |
| `insert list;`（DML 文） | 全件ロールバック | `DmlException` を投げる |
| `Database.insert(list, true)` | 全件ロールバック | `DmlException` を投げる |
| `Database.insert(list, false)` | 成功分のみコミット | 投げない（`getErrors()` で確認） |

> [!ポイント] DML 文と Database メソッドの使い分け
>
> 「1 件でも失敗したら全部やめたい」なら **DML 文**（または `Database.xxx(list, true)`）。「成功分だけ処理を続けたい」なら **`Database.xxx(list, false)`**。

### 関連レコードの操作

親と子は別々の DML で処理する。1 回の DML で親子同時更新はできない。

```apex
Account acct = new Account(Name = 'Acme');
insert acct;                       // 先に親を挿入して Id を採番
Contact c = new Contact(LastName = 'Mario', AccountId = acct.Id);
insert c;                          // 子の参照項目に親 Id をセットして挿入
```

---

## 4. Apex 基本構文

Java に似た強い型付け・大文字小文字を区別しない言語。すべての変数は既定で `null` に初期化される。

### クラス・メソッド宣言

```apex
public with sharing class EmailManager {

    public static final Decimal TAX_RATE = 0.10;   // 定数

    // static メソッド：インスタンス不要でクラス名から直接呼べる
    public static Decimal calcTaxIncluded(Decimal price) {
        return price * (1 + TAX_RATE);
    }

    public void sendMail(String address, String subject, String body) {
        // void は戻り値なし
    }
}
```

### アクセス修飾子と共有修飾子

| 修飾子 | 可視範囲 |
| --- | --- |
| `private` | 同じクラス内のみ（既定） |
| `public` | 同じ名前空間内 |
| `global` | すべての名前空間（WebService / Batch / `@future` で必須） |
| `protected` | 同クラスおよびサブクラス |

| 共有修飾子 | 動作 |
| --- | --- |
| `with sharing` | 実行ユーザーの共有ルールを尊重 |
| `without sharing` | 共有ルールを無視（システムレベル） |
| `inherited sharing` | 呼び出し元の共有モードを継承 |

> [!注意] クラス既定は without sharing 相当
>
> 共有修飾子を書かないクラスは、トリガーや一部の入口を除き共有を強制しない。セキュアなコントローラーは明示的に `with sharing` を付ける。

### 変数・制御構文

```apex
Integer count = 0;
List<String> colors = new List<String>{ 'red', 'green', 'blue' };

// 条件分岐
if (count > 0) { /* ... */ } else { /* ... */ }

// for-each（拡張 for）
for (String c : colors) { System.debug(c); }

// 従来型 for
for (Integer i = 0; i < colors.size(); i++) { /* ... */ }

// while / do-while
while (count < 10) { count++; }
do { count--; } while (count > 0);

// switch（when else が default 相当）
switch on count {
    when 0       { System.debug('zero'); }
    when 1, 2, 3 { System.debug('small'); }
    when else    { System.debug('other'); }
}
```

### 例外処理

```apex
try {
    insert acct;
} catch (DmlException e) {
    System.debug('DML 失敗: ' + e.getMessage());
} catch (Exception e) {
    System.debug('その他: ' + e.getMessage());
} finally {
    // 成功・失敗に関わらず実行
}

// カスタム例外
public class MyException extends Exception {}
throw new MyException('独自エラー');
```

> [!ポイント] LimitException は catch できない
>
> ガバナ制限超過で発生する `System.LimitException` は捕捉できず、トランザクションを終了させる。制限に達しないコードを書くことが前提。

---

## 5. コレクション（List / Set / Map）

Apex のコレクションは 3 種類のみ。

| 種類 | 特徴 | 主な用途 |
| --- | --- | --- |
| `List` | 順序あり・重複可・インデックス 0 始まり | SOQL 結果、順序が必要なデータ |
| `Set` | 順序なし・重複不可 | 一意な Id 集合、`IN` 句への受け渡し |
| `Map` | キー → 値・キーは一意 | Id をキーにした高速参照 |

### List

```apex
List<String> colors = new List<String>{ 'red', 'green' };  // リテラル初期化
String[] colors2 = new List<String>();                      // 配列表記も同等

colors.add('blue');          // 末尾に追加
String first = colors.get(0); //= colors[0]
Integer n = colors.size();    // 件数
Boolean empty = colors.isEmpty();
colors.remove(0);             // インデックス指定で削除
colors.clear();               // 全削除
```

### Set

```apex
Set<Id> accountIds = new Set<Id>{ '001...', '001...' };
accountIds.add(someId);
Boolean has = accountIds.contains(someId);

// SOQL の IN 句にそのまま渡せる
List<Contact> cons = [SELECT Id FROM Contact WHERE AccountId IN :accountIds];
```

### Map

```apex
// SOQL 結果から「Id → レコード」の Map を一発生成
Map<Id, Account> acctMap = new Map<Id, Account>([SELECT Id, Name FROM Account]);

acctMap.put(someId, new Account(Name = 'New'));
Account a = acctMap.get(someId);
Boolean exists = acctMap.containsKey(someId);
Set<Id> keys = acctMap.keySet();
List<Account> vals = acctMap.values();
```

> [!豆知識] トリガーの定番テクニック
>
> `Trigger.newMap` のように Id をキーにした Map と、`Set<Id>` を使って関連レコードを 1 回の SOQL でまとめて取得するのが一括化（バルク化）の基本パターン。

---

## 6. 組み込みメソッド（String / Date / Math / System）

よく使う標準クラスのメソッド。試験では「正しいメソッド名・引数の順序」を問われやすい。

### String

```apex
String s = '  Hello, World  ';
s.trim();                       // 前後の空白を除去
s.length();                     // 文字数
s.toLowerCase(); s.toUpperCase();
s.contains('World');            // 部分一致（Boolean）
s.substring(0, 5);              // 部分文字列
s.split(',');                   // 区切りで List<String> に
'a' + 'b';                      // + で連結
String.isBlank(s);              // null / 空 / 空白のみ → true
String.isEmpty(s);              // null / 空 → true
String.valueOf(123);            // 他の型を文字列化
String.format('{0} 円', new List<Object>{ 1000 });
String.escapeSingleQuotes(s);   // SOQL インジェクション対策
```

### Date / Datetime

```apex
Date today = Date.today();
Datetime now = Datetime.now();
Date d = Date.newInstance(2026, 6, 25);
today.addDays(7); today.addMonths(1); today.addYears(1);
today.daysBetween(otherDate);   // 差の日数
System.today(); System.now();   // System 経由でも取得可
now.format('yyyy/MM/dd');
```

### Math

```apex
Math.abs(-5);        // 5
Math.max(3, 8);      // 8
Math.min(3, 8);      // 3
Math.round(3.6);     // 4
Math.floor(3.9);     // 3
Math.ceil(3.1);      // 4
Math.mod(10, 3);     // 1（剰余）
```

### System / Assert

```apex
System.debug('メッセージ');
System.debug(LoggingLevel.ERROR, '重要なログ');
System.assertEquals(expected, actual, 'メッセージ');  // 旧形式
Assert.areEqual(expected, actual);                    // 新形式（推奨）
System.now(); System.today();
System.runAs(someUser) { /* 別ユーザー権限で実行（テスト用） */ }
```

---

## 7. sObject / Schema / describe

レコード 1 件 1 件を表すオブジェクトと、項目・権限情報を実行時に取得する仕組み。

### sObject のインスタンス化と項目アクセス

```apex
// コンストラクタで複数項目を一度に設定
Account acct = new Account(Name = 'Acme', NumberOfEmployees = 100);

acct.Phone = '03-1111-2222';   // ドット表記で設定
String name = acct.Name;        // ドット表記で取得

Book__c b = new Book__c(Name = 'Workbook 1');  // カスタムは __c
```

> [!注意] sObject は new で作る
>
> `Account a = new Account();` が正しい。`Account.newInstance()` のような書き方は誤り（引っかけ）。

### 汎用 sObject とキャスト・動的アクセス

```apex
sObject sobj = new Account(Name = 'Trailhead');
Account acct = (Account) sobj;          // 特定型へキャスト

sobj.put('Name', 'Acme');               // 項目名を文字列で動的に設定
Object v = sobj.get('Name');            // 動的に取得
Schema.SObjectType t = sobj.getSObjectType();
```

### Schema / describe（CRUD・FLS チェック）

DML の前にユーザーの権限を確認するのがセキュアコーディングの基本。

```apex
// オブジェクトレベル（CRUD）
if (Schema.sObjectType.Account.isCreateable()) { insert acct; }
if (Schema.sObjectType.Account.isUpdateable()) { update acct; }
if (Lead.sObjectType.getDescribe().isDeletable()) { delete ld; }

// 項目レベル（FLS）
if (Schema.sObjectType.Opportunity.fields.Amount.isAccessible()) { /* 参照 */ }
```

### セキュリティ強制の新構文

```apex
// SOQL：ユーザーがアクセスできるレコード／項目のみ
List<Account> a = [SELECT Id, Name FROM Account WITH USER_MODE];
List<Account> b = [SELECT Id FROM Account WHERE ... WITH SECURITY_ENFORCED];

// DML：ユーザーモードで実行
insert as user acct;
Database.insert(acct, AccessLevel.USER_MODE);

// アクセス不可項目を取り除いて続行
SObjectAccessDecision dec = Security.stripInaccessible(AccessType.READABLE, records);
List<SObject> safe = dec.getRecords();
```

> [!ポイント] WITH SECURITY_ENFORCED は QueryException
>
> アクセス不可の項目があると `System.QueryException` を投げる。一方 `stripInaccessible()` は例外を出さずに項目を除去して処理を続ける。

---

## 8. Apex トリガー

レコードの DML イベントに応じて Apex を自動実行する仕組み。

### trigger 構文とイベント

```apex
trigger AccountTrigger on Account (before insert, after insert, after update) {
    // ...
}
```

イベントは `before insert / before update / before delete / after insert / after update / after delete / after undelete`。**`before undelete` は存在しない**。

### コンテキスト変数

| 変数 | 内容 | 使えるイベント |
| --- | --- | --- |
| `Trigger.new` | 新しい値のリスト（before でのみ変更可） | insert / update / undelete |
| `Trigger.old` | 古い値のリスト（読み取り専用） | update / delete |
| `Trigger.newMap` | Id → 新レコードの Map | before update / after insert・update・undelete |
| `Trigger.oldMap` | Id → 旧レコードの Map | update / delete |
| `Trigger.isInsert` 他 | 操作種別の Boolean | すべて |
| `Trigger.isBefore` / `isAfter` | 保存前／後 | すべて |
| `Trigger.size` | 処理レコード数 | すべて |

```apex
trigger AccountTrigger on Account (before insert, after delete) {
    if (Trigger.isBefore && Trigger.isInsert) {
        for (Account a : Trigger.new) {
            a.Description = 'New';     // before なら DML 不要で反映される
        }
    }
    if (Trigger.isAfter && Trigger.isDelete) {
        for (Account a : Trigger.old) {
            Trigger.oldMap.get(a.Id).addError('関連レコードがあるため削除できません');
        }
    }
}
```

> [!ポイント] before と after の使い分け
>
> **before**：自レコードの値を変更・検証（`Trigger.new` を直接書き換え）。**after**：確定した Id の利用、関連レコードの作成・更新、読み取り専用の値参照。

### 一括化（バルク化）の鉄則

```apex
trigger OpportunityTrigger on Opportunity (after update) {
    Set<Id> acctIds = new Set<Id>();
    for (Opportunity o : Trigger.new) acctIds.add(o.AccountId);  // ① ループで集める

    // ② SOQL はループの外で 1 回だけ（バインド変数で IN）
    Map<Id, Account> accts = new Map<Id, Account>(
        [SELECT Id FROM Account WHERE Id IN :acctIds]);

    List<Account> toUpdate = new List<Account>();
    for (Opportunity o : Trigger.new) {
        Account a = accts.get(o.AccountId);
        // ... 値を更新して
        toUpdate.add(a);
    }
    update toUpdate;   // ③ DML もループの外で 1 回だけ
}
```

> [!注意] Trigger.new[0] だけ見るのはアンチパターン
>
> トリガーは最大 200 件のまとまりで起動する。先頭 1 件だけを処理すると残りが漏れる。必ず `for` で全件処理する。

---

## 9. 非同期 Apex

別スレッドで後から実行する仕組み。コールアウト、大量データ処理、定期実行などに使う。同期に比べ **SOQL 100→200 回、ヒープ 6MB→12MB** など制限が緩和される。

| 種類 | 用途 | 実装 |
| --- | --- | --- |
| `@future` | 簡単な非同期、コールアウト | static メソッドに注釈 |
| `Queueable` | 連鎖・監視したい非同期 | `Queueable` 実装 |
| `Batchable` | 大量レコード（数百万件）処理 | `Database.Batchable` 実装 |
| `Schedulable` | 定期実行 | `Schedulable` 実装 |

### @future

```apex
public class CalloutHelper {
    @future(callout=true)                 // 外部コールアウト時は callout=true が必須
    public static void sendAsync(Set<Id> recordIds) {  // ① static ② 戻り値 void
        // ③ 引数はプリミティブ型かそのコレクションのみ（sObject は不可）
        List<Contact> cons = [SELECT Id FROM Contact WHERE Id IN :recordIds];
    }
}
```

> [!注意] @future の 3 制約
>
> ①`static` ②戻り値は `void` ③引数はプリミティブ型かそのコレクションのみ（**sObject は渡せない**＝Id を渡す）。実行順序は保証されず、future から future は呼べない。

### Queueable

```apex
public class MyQueueable implements Queueable {
    public void execute(QueueableContext context) {
        // 重い処理
        System.enqueueJob(new NextQueueable());   // チェーン（連鎖）できる
    }
}
// 実行（ジョブ ID が返り、AsyncApexJob で監視できる）
Id jobId = System.enqueueJob(new MyQueueable());
```

> [!ポイント] Queueable が future に勝る 3 点
>
> ①sObject など**非プリミティブをメンバーに持てる** ②**ジョブ ID で監視**できる ③**チェーン（連鎖）**できる。

### Batch（Database.Batchable）

```apex
public class MyBatch implements Database.Batchable<sObject>, Database.Stateful {
    public Integer recordsProcessed = 0;          // Stateful でバッチ間も保持

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator('SELECT Id FROM Account');  // 最大 5,000 万件
    }
    public void execute(Database.BatchableContext bc, List<Account> scope) {
        recordsProcessed += scope.size();          // scope は既定 200 件
    }
    public void finish(Database.BatchableContext bc) {
        System.debug('完了: ' + recordsProcessed);
    }
}
// 実行（第 2 引数でバッチサイズを指定、既定 200）
Id batchId = Database.executeBatch(new MyBatch(), 100);
```

> [!豆知識] 各バッチは独立トランザクション
>
> `execute` のまとまりごとに別トランザクション。1 バッチが失敗しても他のバッチはロールバックされない。インスタンス変数を持ち越したいときは `Database.Stateful` を実装する。

### Schedulable

```apex
public class MyScheduler implements Schedulable {
    public void execute(SchedulableContext sc) { /* ... */ }
}
// CRON 式は「秒 分 時 日 月 曜日 [年]」
String cron = '0 0 8 * * ?';     // 毎日 8:00
System.schedule('毎朝ジョブ', cron, new MyScheduler());
```

### 監視（AsyncApexJob / CronTrigger）

```apex
AsyncApexJob job = [SELECT Status, NumberOfErrors, JobItemsProcessed, TotalJobItems
                    FROM AsyncApexJob WHERE Id = :batchId];
```

---

## 10. Apex テスト

本番リリースには**組織全体で 75% 以上**のコードカバレッジと全テスト合格が必要。

### テストクラスの基本

```apex
@IsTest
private class AccountServiceTest {

    @TestSetup
    static void makeData() {
        // 全テストメソッドで共有。各メソッド終了ごとにロールバックされる
        insert new Account(Name = 'Seed');
    }

    @IsTest
    static void testCreate() {
        Test.startTest();                 // ここから新しいガバナ制限セット
        AccountService.createDefault();
        Test.stopTest();                  // 非同期処理（future/Queueable/Batch）はここで完了

        Account a = [SELECT Name FROM Account WHERE Name = 'Default' LIMIT 1];
        Assert.areEqual('Default', a.Name);   // 第 1 が期待値、第 2 が実際値
    }
}
```

> [!ポイント] Test.startTest / stopTest の役割
>
> 内側のコードは**新しいガバナ制限セット**で実行される。さらに `stopTest()` の時点で、ブロック内で起動した**非同期処理が同期的に完了**するため、結果を検証できる。1 メソッド内で 1 回ずつ。

### アサーション

```apex
Assert.areEqual(expected, actual);      // 期待値・実際値の順を厳守
Assert.areNotEqual(a, b);
Assert.isTrue(cond);  Assert.isFalse(cond);
Assert.isNull(x);     Assert.isNotNull(x);
Assert.fail('ここに来てはいけない');
```

### モックと runAs

```apex
// HTTP コールアウトのモック
Test.setMock(HttpCalloutMock.class, new MyHttpMock());

// 指定ユーザーの権限・共有コンテキストで実行
System.runAs(testUser) { /* ... */ }
```

> [!注意] テストの分離原則
>
> テストは既定で**組織の既存データにアクセスできない**（`@IsTest(SeeAllData=true)` で解除可だが非推奨）。メール送信・コールアウトは実行されず、SOSL は空結果を返す。作成したデータは終了時に自動ロールバックされる。テストコードはカバレッジの分母に含まれない。

---

## 11. Visualforce

サーバーサイドでレンダリングする MVC のページフレームワーク。タグは `apex:` 名前空間、値は式 `{! ... }` で埋め込む。

### ページと式

```html
<apex:page standardController="Account">
    <h1>{! Account.Name }</h1>
    <p>{! $User.FirstName & ' ' & $User.LastName }</p>   <!-- & で連結 -->
    <p>{! IF(Account.AnnualRevenue > 1000000, 'Big', 'Small') }</p>
</apex:page>
```

`<apex:page>` の主な属性：`standardController` / `controller` / `extensions` / `recordSetVar`（標準リストコントローラー）/ `showHeader` / `sidebar` / `renderAs="pdf"`。

> [!注意] controller と standardController は併用不可
>
> 標準コントローラーに独自ロジックを足したいときは `extensions`（コントローラー拡張）を使う。

### コントローラーの種類

| 種類 | 指定方法 | 特徴 |
| --- | --- | --- |
| 標準コントローラー | `standardController="Account"` | コード不要。save/edit/delete 等の標準アクション |
| 標準リストコントローラー | `standardController` + `recordSetVar` | 一覧・ページ送り（next/previous） |
| カスタムコントローラー | `controller="MyCtrl"` | 独自ロジック。getter で値を公開 |
| コントローラー拡張 | `extensions="MyExt"` | 標準＋独自ロジック |

```apex
public class ContactsListController {
    public List<Contact> getContacts() {            // {! contacts } で呼ばれる
        return [SELECT Id, Name FROM Contact LIMIT 10];
    }
    public PageReference save() { /* ... */ return null; }  // アクションメソッド
}
```

### 主要タグ

```html
<apex:form>
  <apex:pageBlock title="取引先">
    <apex:pageMessages/>                              <!-- エラー・情報の表示 -->
    <apex:pageBlockSection columns="1">
      <apex:inputField value="{! Account.Name }"/>    <!-- 型に応じた入力欄に自動変換 -->
      <apex:outputField value="{! Account.Phone }"/>  <!-- 書式付き表示 -->
    </apex:pageBlockSection>
    <apex:pageBlockButtons>
      <apex:commandButton action="{! save }" value="保存"/>
    </apex:pageBlockButtons>
  </apex:pageBlock>

  <apex:pageBlockTable value="{! Account.Contacts }" var="c">
    <apex:column value="{! c.Name }"/>
  </apex:pageBlockTable>
</apex:form>
```

反復は `apex:pageBlockTable` / `apex:dataTable` / `apex:repeat`（最も自由）。グローバル変数は `$User` / `$ObjectType` / `$Action` / `$Resource` など。

> [!ポイント] inputField は FLS と入力規則を自動順守
>
> `<apex:inputField>` は項目の型・必須・参照先・項目レベルセキュリティ・入力規則を自動で反映する。手書きの `<apex:inputText>` よりこちらが基本。

### 静的リソース

```html
<apex:includeScript value="{! $Resource.jQuery }"/>
<apex:image value="{! URLFOR($Resource.assets, 'images/logo.png') }"/>
```

> [!豆知識] ZIP 内のファイルは URLFOR が必須
>
> 単一ファイルは `$Resource.name` で直接参照できるが、ZIP でアップロードした中のファイルは `URLFOR($Resource.zipName, 'path/in/zip')` でたどる。

---

## 12. Lightning Web コンポーネント（LWC）

標準 Web 標準（ES6 / Web Components）ベースの最新 UI フレームワーク。HTML テンプレート＋ JS クラス＋メタデータ XML の 3 ファイルで構成。

### HTML テンプレート構文

```html
<template>
    <!-- プロパティバインディング（JS の同名プロパティ） -->
    <p>Name: {name}</p>

    <!-- 条件付き表示（現行構文） -->
    <template lwc:if={isReady}>
        <p>準備完了</p>
    </template>
    <template lwc:else>
        <p>読み込み中...</p>
    </template>

    <!-- 繰り返し（key は必須） -->
    <template for:each={contacts} for:item="contact">
        <li key={contact.Id}>{contact.Name}</li>
    </template>

    <!-- 子コンポーネントは c- ＋ケバブケース、属性もケバブケース -->
    <c-child product-id={selectedId} onproductselected={handleSelect}></c-child>
    <lightning-button label="保存" onclick={handleClick}></lightning-button>
</template>
```

> [!注意] lwc:if と if:true
>
> 現行は `lwc:if` / `lwc:elseif` / `lwc:else`。古い `if:true` / `if:false` は旧構文（API 56.0 以前）。

### JS：デコレーターとライフサイクル

```js
import { LightningElement, api, wire } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class MyComponent extends LightningElement {
    @api recordId;            // 公開プロパティ（親 / アプリビルダーから設定可）
    @track items = [];        // 入れ子の変更を監視（単純な値には通常不要）

    // ライフサイクルフック
    connectedCallback()   { /* DOM 挿入時（Aura の init 相当） */ }
    renderedCallback()    { /* 描画後、毎回呼ばれる */ }
    disconnectedCallback(){ /* DOM 削除時。リスナー解除など */ }

    // Apex を @wire（読み取り専用・リアクティブ）
    @wire(getAccounts) accounts;

    // 計算プロパティ（getter）
    get hasItems() { return this.items.length > 0; }
}
```

| デコレーター | 役割 |
| --- | --- |
| `@api` | 公開プロパティ／メソッド。親から設定・呼び出し可 |
| `@track` | オブジェクト／配列の内部変更を監視（現在は省略可な場面が多い） |
| `@wire` | LDS / Apex からリアクティブにデータ取得 |

### イベント（子 → 親）

```js
// 子：CustomEvent を発火（イベント名は小文字・スペース不可）
this.dispatchEvent(new CustomEvent('productselected', { detail: this.productId }));
```

```js
// 親：detail で受け取る
handleSelect(event) { this.selectedId = event.detail; }
```

> [!ポイント] データは下へ、イベントは上へ
>
> 親 → 子はプロパティ（`@api`）、子 → 親は **CustomEvent**。親が子のメソッドを呼ぶときは `this.template.querySelector('c-child').publicMethod()`（子側は `@api` メソッド）。

### Apex 連携と書き込み

```js
import { createRecord } from 'lightning/uiRecordApi';
import getContacts from '@salesforce/apex/ContactController.getContacts';

// @wire は読み取り専用・キャッシュ可（Apex 側は @AuraEnabled(cacheable=true)）
@wire(getContacts, { accountId: '$recordId' }) wiredContacts;

// 変更系や手動取得は命令的に呼ぶ（Promise）
handleSave() {
    createRecord({ apiName: 'Account', fields: { Name: 'Acme' } })
        .then(account => { /* 成功 */ })
        .catch(error => { /* 失敗 */ });
}
```

```apex
// Apex 側：@wire で呼ぶメソッドは cacheable=true・static・DML 不可
@AuraEnabled(cacheable=true)
public static List<Contact> getContacts(Id accountId) {
    return [SELECT Id, Name FROM Contact WHERE AccountId = :accountId];
}
```

### メタデータ（.js-meta.xml）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>63.0</apiVersion>
    <isExposed>true</isExposed>            <!-- true なら targets が 1 つ以上必須 -->
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
    </targets>
</LightningComponentBundle>
```

---

## 13. Aura コンポーネント

LWC より前の Lightning コンポーネントフレームワーク。タグは `aura:` / `lightning:`（コロン区切り）、式は `{! ... }`。試験では LWC への移行対応で問われやすい。

### コンポーネントと属性

```html
<aura:component controller="MyContactListController"
                implements="flexipage:availableForRecordHome,force:hasRecordId"
                access="global">
    <aura:attribute name="contacts" type="Contact[]" />
    <aura:attribute name="recordId" type="Id" />

    <aura:handler name="init" value="{!this}" action="{!c.doInit}" />

    <aura:iteration items="{!v.contacts}" var="con">
        <p>{!con.Name}</p>
    </aura:iteration>

    <aura:if isTrue="{!v.recordId != null}">
        <lightning:formattedNumber value="5000" style="currency" currencyCode="JPY" />
    </aura:if>
</aura:component>
```

| 式 | 意味 |
| --- | --- |
| `{!v.属性名}` | 値プロバイダー（属性の参照） |
| `{!c.メソッド}` | コントローラー（クライアント JS）の参照 |
| `{#property}` | イテレーション内の項目参照（一方向） |

### クライアント側コントローラーとサーバー呼び出し

```js
({
    doInit : function(component, event, helper) {
        var action = component.get("c.getContacts");      // Apex メソッド取得
        action.setParams({ recordId: component.get("v.recordId") });
        action.setCallback(this, function(response) {
            if (response.getState() === "SUCCESS") {
                component.set("v.contacts", response.getReturnValue());
            }
        });
        $A.enqueueAction(action);    // キューに入れて初めて送信される
    }
})
```

> [!ポイント] Aura → LWC 移行の対応表
>
> `init` ハンドラー → `connectedCallback()`、`aura:iteration` → `for:each`、`aura:if` → `lwc:if`、コンポーネントイベント → CustomEvent、`<force:recordData>` → `@wire` / `createRecord`、`.THIS`（CSS スコープ）→ Shadow DOM が自動スコープのため不要。

> [!豆知識] @AuraEnabled は Aura / LWC 共通
>
> Apex メソッドを Aura・LWC から呼ぶには `@AuraEnabled`（static ＋ public/global）を付ける。読み取り専用でキャッシュさせるなら `@AuraEnabled(cacheable=true)`（`@wire` で利用、DML 不可）。
