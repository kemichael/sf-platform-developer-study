# DML を使用してレコードを操作する

## 学習の目的

この単元を完了すると、次のことができるようになります。

- **insert** や **upsert** を使用してレコードを挿入または更新する。
- DML 例外をキャッチする。
- データベースメソッドで部分的な完了オプションを指定し、新規レコードを挿入して結果を処理する。
- DML ステートメントとデータベースメソッドの使い分けを理解する。
- 関連レコードに対して DML 操作を実行する。

> [!ポイント] この単元のゴール
>
> 「**Apex からデータベースのレコードを作成・変更・削除する方法**」が DML です。`insert` / `update` / `upsert` / `delete` などの使い分け、`DmlException` の処理、`Database` クラスメソッド（部分完了）との違い、「1 トランザクション 150 件」のガバナ制限を押さえれば試験対策は十分です。

---

## DML とは

レコードの作成や変更には **データ操作言語（DML：Data Manipulation Language）** を使い、シンプルなステートメントでレコードの挿入・更新・マージ・削除・復元を行えます。

> [!用語] DML（Data Manipulation Language：データ操作言語）
>
> データベースのレコードを「操作する（作る・変える・消す・戻す）」命令文。Apex では `insert acct;` のように操作名のあとに sObject を書くだけで反映できます。レコードを「読み取る（検索する）」のは DML ではなく **SOQL** の役割です（別の単元）。

次は取引先 Acme を挿入する例です。

```apex
// 取引先 sObject を作成する
Account acct = new Account(Name='Acme', Phone='(415)555-1212', NumberOfEmployees=100);
// DML を使用して取引先を挿入する
insert acct;
```

`insert acct;` が実行された瞬間、`acct` の内容で新しい取引先レコードが1件できます。

```text
  Apex コード                         データベース
 ┌──────────────────┐               ┌─────────────────┐
 │ Account acct =   │               │                 │
 │   new Account()  │               │                 │
 │                  │  insert acct; │  ┌───────────┐  │
 │ insert acct; ────┼──────────────▶│  │ Acme 取引先 │  │
 │                  │               │  │ Id 自動採番 │  │
 │ acct.Id ◀────────┼───────────────┼──┤           │  │
 │ (ID が返ってくる) │               │  └───────────┘  │
 └──────────────────┘               └─────────────────┘
```

---

## DML ステートメント

| ステートメント | 役割 | 区分 |
| --- | --- | --- |
| `insert` | レコードを**新規挿入**する | 一般的なデータベース操作 |
| `update` | 既存レコードを**更新**する | 一般的なデータベース操作 |
| `delete` | レコードを**削除**する（ごみ箱へ） | 一般的なデータベース操作 |
| `upsert` | **挿入＋更新**を1ステートメントで行う | Salesforce 固有 |
| `undelete` | ごみ箱のレコードを**復元**する | Salesforce 固有 |
| `merge` | 同じ型の最大 3 件を**1件に統合**する（リード・取引先責任者・ケース・取引先のみ） | Salesforce 固有 |

各 DML ステートメントは1つの sObject または sObject のリストを受け入れます。リストで操作する方が効率的です。

> [!用語] upsert（アップサート）
>
> 「**up**date（更新）」と「in**sert**（挿入）」の造語。レコードが既に存在すれば更新し、なければ新規作成する処理を**1ステートメントで**行います。判別には指定項目、なければ ID を使います。

> [!注意] merge が使えるのは 4 つの標準オブジェクトだけ
>
> `merge` は **リード・取引先責任者・ケース・取引先** でのみ使用でき、一度にマージできるのは**最大 3 件**まで（ほかを削除して関連レコードを再ペアレント化）。試験で問われやすいので覚えておきましょう。

### 新規レコードへの ID 項目の自動割り当て

レコードの挿入時、各レコードに ID が割り当てられ、DML の引数に使った sObject 変数にも ID が自動入力されます。

```apex
// 取引先 sObject を作成する
Account acct = new Account(Name='Acme', Phone='(415)555-1212', NumberOfEmployees=100);
// DML を使用して取引先を挿入する
insert acct;
// 挿入された sObject 引数から新しい ID を取得する
ID acctID = acct.Id;
System.debug('ID = ' + acctID);
// DEBUG|ID = 001D000000JmKkeIA （ID は環境によって異なる）
```

> [!ポイント] insert 後は変数に ID が入る
>
> `insert acct;` を実行すると `acct.Id` に採番された ID が入ります（取り直し不要）。挿入直後の同じ変数をそのまま `update` や `upsert` に再利用できます。なお、レコードを取得（読み取り）するには DML ではなく SOQL を使います。

---

## 一括 DML

DML は単一 sObject でも、リストで一括でも行えます。一括 DML はガバナ制限（DML ステートメント 150 件）への到達を防げるため推奨されます。リストで DML すると、レコードごとではなく**全体で 1 ステートメント**とみなされます。

> [!用語] ガバナ制限（Governor Limits）
>
> Salesforce は複数組織がサーバーを共有する**マルチテナント**環境です。1組織が資源を独占しないよう Apex には実行時の上限があります。DML の代表例が「**1 トランザクションあたり DML ステートメントは 150 件まで**」です。

> [!注意] ループの中で DML を書いてはいけない
>
> 200 件を `for` で回し、その中で1件ずつ `insert` すると DML が 200 回呼ばれ、150 件制限を超えてエラーになります。**リストにまとめて 1 回だけ DML を呼ぶ**（一括 DML）のが鉄則です。
>
> ```text
>  ✗ 悪い例（ループ内 DML）        ✓ 良い例（一括 DML）
>  for (Contact c : list) {       List<Contact> conList = ...;
>      insert c;   ← 何度も実行    insert conList;  ← 1 回だけ
>  }                              （リスト全体で DML 1 件）
> ```

次は取引先責任者を一括挿入し、その後一括更新する例です（匿名 Apex で実行）。

```apex
// 取引先責任者のリストを作成する
List<Contact> conList = new List<Contact> {
    new Contact(FirstName='Joe',LastName='Smith',Department='Finance'),
    new Contact(FirstName='Kathy',LastName='Smith',Department='Technology'),
    new Contact(FirstName='Caroline',LastName='Roth',Department='Finance'),
    new Contact(FirstName='Kim',LastName='Shain',Department='Education')};
// 1 回の DML コールですべて一括挿入する
insert conList;
// 更新対象を保持するリスト
List<Contact> listToUpdate = new List<Contact>();
// 部門が Finance の場合のみ役職を追加する
for(Contact con : conList) {
    if (con.Department == 'Finance') {
        con.Title = 'Financial analyst';
        listToUpdate.add(con);
    }
}
// 1 回の DML コールで一括更新する
update listToUpdate;
```

> [!例] このコードがやっていること
>
> 1. 4 人をリストにまとめ `insert conList;` で一括挿入。
> 2. ループで Finance の人だけ `listToUpdate` に集める。
> 3. `update listToUpdate;` でそのリストだけ一括更新。
>
> DML は `insert` と `update` の **2 回だけ**。ループ内では DML を呼んでいません。実行後、Finance 部門の2人の役職が Financial analyst になります。

---

## レコードを更新/挿入する（upsert）

新規・既存が混在するリストでも、`upsert` なら挿入と更新をまとめて処理できます。重複作成を避けられ、既存判別の手間も省けます。

`upsert` は1つの項目の値で既存レコードと照合します。項目を指定しなければ ID を使い、指定する場合はカスタムオブジェクトなら**外部 ID** 項目、標準オブジェクトなら `idLookup` プロパティが true の項目（取引先責任者・ユーザーのメール項目など）を使います。

> [!用語] 外部 ID（External ID）／ idLookup プロパティ
>
> - **外部 ID**：外部システムのレコードを一意に識別するためにマークしたカスタム項目。upsert の照合キーに使えます（例：基幹システムの顧客番号）。
> - **idLookup**：標準オブジェクトの項目がレコード照合に使えるかを示すプロパティ。`true` の項目（取引先責任者やユーザーのメール項目など）を照合キーに指定できます。

### upsert の構文

省略可能な項目は項目トークンで指定します（例：`Account.Fields.MyExternalId`）。`upsert` は主キー（ID）、`idLookup` 項目、または外部 ID で挿入か更新かを判別します。

```apex
upsert sObject | sObject[]
upsert sObject | sObject[] field        // 照合項目を明示（例: upsert list Account.Fields.MyExternalId;）
```

> [!ポイント] upsert のキー一致挙動（最頻出）
>
> | キーの一致 | 結果 |
> | --- | --- |
> | **一致しない（0 件）** | 新規レコードを**挿入** |
> | **1 回だけ一致** | 既存レコードを**更新** |
> | **複数回一致（2 件以上）** | **エラー**（挿入も更新もされない） |
>
> 「複数一致はエラー」が試験で問われます。照合キーには重複しない項目（ID・外部 ID・idLookup 項目）を使うのが前提です。

```text
            upsert のキー判定フロー
                    │
        照合キーで既存レコードを検索
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     0 件一致     1 件一致     2 件以上一致
        │           │           │
        ▼           ▼           ▼
     ┌─────┐     ┌─────┐     ┌──────┐
     │ 挿入 │     │ 更新 │     │ エラー │
     └─────┘     └─────┘     └──────┘
```

次は1回のコールで既存の Josh を ID で照合して更新し、新規 Kathy を挿入する例です。変数 `josh` は前の insert でレコード ID が入っているため、ID を明示設定する必要はありません。

```apex
// Josh の取引先責任者を挿入する
Contact josh = new Contact(FirstName='Josh',LastName='Kaplan',Department='Finance');
insert josh;
// josh には ID が入っており、これが upsert の照合に使われる
josh.Description = 'Josh\'s record has been updated by the upsert operation.';
// Kathy を作成する（まだ保存しない）
Contact kathy = new Contact(FirstName='Kathy',LastName='Brown',Department='Technology');
// upsert する取引先責任者のリスト
List<Contact> contacts = new List<Contact> { josh, kathy };
upsert contacts;
// 結果：Josh は更新され（1件のみ）、Kathy は新規作成される。
```

次は照合に項目（`idLookup` が設定されたメール項目）を指定する例です。

> [!注意] insert と upsert の違い
>
> ここで `insert` を使うと重複した Jane Smith が挿入されます。upsert はメール項目で既存を見つけて更新するため重複しません。

```apex
Contact jane = new Contact(FirstName='Jane',
                         LastName='Smith',
                         Email='jane.smith@example.com',
                         Description='Contact of the day');
insert jane;
// 2 つ目の sObject を作成する（ID は未設定）
Contact jane2 = new Contact(FirstName='Jane',
                         LastName='Smith',
                         Email='jane.smith@example.com',
                         Description='Prefers to be contacted by email.');
// 照合に idLookup 項目（メール）を使って upsert する
upsert jane2 Contact.fields.Email;
// 更新されたことを検証する
System.assertEquals('Prefers to be contacted by email.',
                   [SELECT Description FROM Contact WHERE Id=:jane.Id].Description);
```

実行後、Jane Smith は1件のみで説明が更新されています。

---

## レコードを削除する

`delete` で保持レコードを削除できます。即座に消えるのではなく、まずごみ箱に 15 日間保管され、その間は復元可能です。15 日経過後、完全削除の対象になります。

> [!ポイント] 削除レコードは 15 日間ごみ箱に残る
>
> `delete` したレコードは**ごみ箱に 15 日間保管**され、その間は `undelete` で復元できます。15 日経過後に完全削除の対象になります。

次は姓が Smith の取引先責任者をすべて削除する例です。

```apex
Contact[] contactsDel = [SELECT Id FROM Contact WHERE LastName='Smith'];
delete contactsDel;
```

> [!注意] このコードには SOQL クエリが含まれる
>
> `[SELECT Id FROM Contact WHERE LastName='Smith']` は削除対象を取得する SOQL クエリです（詳細は別の単元）。「削除するレコードを検索で集めて `delete` に渡している」と理解すれば十分です。

---

## DML ステートメントの例外

DML 操作が失敗すると `DmlException` が返されます。コードでキャッチしてエラー処理できます。

> [!用語] DmlException と try...catch
>
> **DmlException** は DML 操作が失敗したときに投げられる例外（例：必須項目が空のまま挿入）。**try...catch** は、エラーが起きそうな処理を `try { }` で囲み、例外発生時に `catch { }` へ移る仕組み。これにより DML が失敗してもプログラム全体を止めずに処理できます。

次は必須の名前項目なしで挿入を試み、`DmlException` をキャッチする例です。

```apex
try {
    // 必須の Name 項目がないため例外が発生する
    Account acct = new Account();
    insert acct;
} catch (DmlException e) {
    System.debug('A DML exception has occurred: ' +
                e.getMessage());
}
```

---

## データベースメソッド

Apex には組み込みの `Database` クラスがあり、対応する DML ステートメントと同じ動作のメソッドを提供します。

> [!用語] Database クラス
>
> DML ステートメントと同じ操作を**メソッドの形**（`Database.insert(...)`）で提供する組み込みクラス。違いは、**部分的な完了（一部だけ成功）** を指定できる点と、**結果オブジェクトで 1 件ずつの成否を受け取れる**点です。

静的メソッドはクラス名でコールします。

- `Database.insert()` / `Database.update()` / `Database.upsert()` / `Database.delete()` / `Database.undelete()`
- `Database.merge()`（リード・取引先責任者・ケース・取引先のみ）

DML ステートメントと異なり、省略可能な `allOrNone` パラメーターで部分完了を指定できます。

> [!用語] allOrNone（オール・オア・ナン）パラメーター
>
> `Database` メソッドの第2引数に渡せる真偽値。
>
> - `true`（既定値）… 1 件でも失敗すると**全件ロールバック**し例外を投げる（DML ステートメントと同じ）。
> - `false` … 成功分はそのまま**コミット**し、失敗分だけエラーを返す（**部分完了**、例外なし）。

データベースメソッドは各レコードの成否情報を含む結果オブジェクトを返します。既定では `allOrNone` は `true` なので、対応する DML ステートメントと同様に動作します（`Database.insert(recordList)` と `Database.insert(recordList, true)` は `insert recordList;` と同等）。

```apex
Database.SaveResult[] results = Database.insert(recordList, false);
```

> [!注意] 操作ごとに返る結果オブジェクトが違う
>
> 挿入・更新は `Database.SaveResult`、upsert は `Database.UpsertResult`、削除は `Database.DeleteResult` を返します。

なお `Database` クラスには、DML ステートメントにない機能（トランザクション制御・ロールバック・ごみ箱を空にする・SOQL 関連メソッド）も含まれます。

### 例: 部分的な完了を指定してレコードを挿入する

次はリストの1件（空の取引先責任者）に必須の LastName がなくエラーになる例です。3件はコミットされ、結果を反復してログ出力します。

```apex
// 取引先責任者のリストを作成する
List<Contact> conList = new List<Contact> {
        new Contact(FirstName='Joe',LastName='Smith',Department='Finance'),
        new Contact(FirstName='Kathy',LastName='Smith',Department='Technology'),
        new Contact(FirstName='Caroline',LastName='Roth',Department='Finance'),
        new Contact()};
// 部分完了オプションで一括挿入する
Database.SaveResult[] srList = Database.insert(conList, false);
// 各結果を反復処理する
for (Database.SaveResult sr : srList) {
    if (sr.isSuccess()) {
        // 成功：処理されたレコードの ID を取得する
        System.debug('Successfully inserted contact. Contact ID: ' + sr.getId());
    } else {
        // 失敗：すべてのエラーを取得する
        for(Database.Error err : sr.getErrors()) {
            System.debug('The following error has occurred.');
            System.debug(err.getStatusCode() + ': ' + err.getMessage());
            System.debug('Contact fields that affected this error: ' + err.getFields());
     }
    }
}
```

> [!例] 部分完了の効果
>
> 4件中1件（項目が空の取引先責任者）が失敗しても、`allOrNone=false` のおかげで**残り 3 件は保存**されます。`Database.SaveResult` の配列を回し、`isSuccess()` で成功なら ID、失敗なら `getErrors()` でエラー内容を取り出すのがポイントです。

---

## DML ステートメントとデータベースメソッドの使い分け

- **エラーを Apex 例外として処理し、その場で処理を中断したい場合**は DML ステートメントを使い、`try...catch` で受けます。
- **部分的な完了を可能にしたい場合**は `Database` クラスメソッドを使います。失敗レコードがあっても残りは完了でき、結果配列で成否を判断できます。

> [!ポイント] 選択基準を表で整理
>
> | 観点 | DML ステートメント（`insert` 等） | Database メソッド（`Database.insert()` 等） |
> | --- | --- | --- |
> | 一部失敗時の挙動 | **全件ロールバック**（all or none） | `allOrNone=false` なら**成功分はコミット** |
> | エラーの扱い | **例外（DmlException）** を投げる | 結果オブジェクトで**成否を返す**（例外なし） |
> | エラー処理の書き方 | `try...catch` | 結果配列を反復して `isSuccess()` 判定 |
> | 向いている場面 | エラーで処理を止めたい／全件確実に | 失敗分を許容し残りを処理したい |
>
> 「**全部成功させたい → DML ステートメント**」「**部分的に成功させたい → Database メソッド（allOrNone=false）**」と覚えましょう。

---

## 関連レコードを操作する

### 関連レコードを挿入する

リレーションが定義済みなら、**外部キー ID** で関連レコードを挿入できます。外部キー ID は子レコードが「どの親に属するか」を指す ID 項目で、流れは「親を `insert` → 親の `Id` を取得 → 子の `AccountId` にセット → 子を `insert`」です。

```apex
Account acct = new Account(Name='SFDC Account');
insert acct;
// 取引先が挿入されると sObject に ID が入る。それを取得する。
ID acctID = acct.ID;
// この取引先に取引先責任者を追加する
Contact mario = new Contact(
    FirstName='Mario',
    LastName='Ruiz',
    Phone='415.555.1212',
    AccountId=acctID);
insert mario;
```

実行後、新規取引先（SFDC Account）の [Contacts] 関連リストに Mario Ruiz が含まれます。

### 関連レコードを更新する

> [!注意] 親と子は同じ DML では更新できない
>
> 1 回の DML で「取引先責任者」と「その関連取引先」の両方を更新することはできません。**それぞれ別々の `update` コール**が必要です。試験で問われやすい制約です。

```apex
// 取引先に関連付けられている取引先責任者をクエリする
Contact queriedContact = [SELECT Account.Name
                          FROM Contact
                          WHERE FirstName = 'Mario' AND LastName='Ruiz'
                          LIMIT 1];
// 取引先責任者の電話番号を更新する
queriedContact.Phone = '(415)555-1213';
// 関連する取引先の業種を更新する
queriedContact.Account.Industry = 'Technology';
// 2 つの別々のコールを行う
update queriedContact;            // 1. 取引先責任者
update queriedContact.Account;    // 2. 関連する取引先
```

### 関連レコードを削除する

> [!用語] カスケード削除（Cascade Delete）
>
> 親レコードを削除したとき、関連する子レコードも**連鎖的に**自動削除される仕組み。取引先を削除すると紐づく取引先責任者も消えます。主従関係はもちろん、参照関係でも条件が整えば発生します。

次は SFDC Account を削除する例で、関連取引先責任者も削除されます。

```apex
Account[] queriedAccounts = [SELECT Id FROM Account WHERE Name='SFDC Account'];
delete queriedAccounts;
```

---

## トランザクションについて

DML 操作はトランザクション内で実行され、すべてが成功して初めて完了します。いずれかが失敗すればトランザクション全体がロールバックされ、データは一切コミットされません。

> [!用語] トランザクション／ロールバック
>
> **トランザクション**は「ひとまとまりの処理単位」。**ロールバック**は、途中で1つでも失敗したときに**すべての変更を取り消して開始前の状態に戻す**こと。「全部成功するか、全部なかったことにするか（all or nothing）」を保証します。

```text
        トランザクション（all or nothing）
 ┌──────────────────────────────────────┐
 │ insert 取引先A   ✓                     │
 │ insert 取引先B   ✓                     │
 │ update 取引先責任者 ✗ (入力規則エラー) │
 └────────────────┬─────────────────────┘
                  ▼
        いずれか失敗 → 全体をロールバック
                  ▼
        取引先 A も B もコミットされない（消える）
```

> [!ポイント] トランザクション境界を覚える
>
> 境界（単位）になり得るのは、**トリガー・クラスメソッド・匿名コードブロック・Apex ページ・カスタム Web サービスメソッド**。この境界内で1つでも DML が失敗すると、境界内の全 DML がロールバックされます。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] DML 関連のガバナ制限
>
> **1 トランザクションあたりの DML ステートメント数は 150 件**（最重要、リストでまとめれば件数によらず 1 ステートメント扱い）、**DML 処理できるレコード総数は 10,000 件**。ループ内 DML は制限超過の典型的なアンチパターンで、必ず**リストにためて一括 DML**（バルク化）。

> [!まとめ] この単元の要点とよく問われる知識
>
> - **DML** はレコードを操作する命令文。`insert` / `update` / `delete`（一般）と `upsert` / `undelete` / `merge`（Salesforce 固有）の 6 種類。読み取りは **SOQL**。
> - `insert` 後、引数の sObject 変数の `Id` 項目に**自動で ID が入る**。
> - レコードはなるべく**リストにまとめて一括 DML**（150 件制限対策）。
> - **upsert** は「あれば更新・なければ挿入」。照合キーは ID・外部 ID・idLookup 項目。**複数一致はエラー**。
> - `merge` は **リード・取引先責任者・ケース・取引先**のみ、**最大 3 件**。`delete` は**ごみ箱に 15 日間**残り `undelete` で復元可、かつ**カスケード削除**に対応。
> - 親レコードと関連レコードは**別々の DML コール**で更新する。
> - 失敗時に**全件ロールバックなら DML ステートメント**、**部分完了なら Database メソッド（allOrNone=false）**。DML はトランザクション内で実行され、**1 つ失敗すれば全体がロールバック**される。

---

## リソース

- Apex 開発者ガイド：Apex でのデータの操作
- Apex 開発者ガイド：Apex DML オペレーション
- Apex リファレンスガイド：Database クラス
- Apex 開発者ガイド：Exception のステートメント
- Apex 開発者ガイド：sObjects That Don't Support DML Operations

---

## ハンズオン Challenge（+500 ポイント）

> [!手順] 準備を始めましょう
>
> この単元は各自のハンズオン組織で実行します。**[起動]** をクリックして開始します。

> [!まとめ] あなたの Challenge：取引先を挿入するメソッドを作成する
>
> 新しい取引先を挿入する Apex クラスを作成します。取引先名は入力パラメーターで決まります。正常に挿入された場合は取引先レコードを返し、DML 例外が発生した場合は null を返します。
>
> **要件**
>
> - Apex クラスは **`AccountHandler`** という名前で、通用範囲を **`public`** にする。
> - **`insertNewAccount`** という **public static** メソッドを含める。
> - **入力文字列をパラメーター**として受け入れ、取引先名の作成に使う。
> - 取引先を挿入し、**レコードを返す**。
> - **空の文字列も受け入れ**、失敗した DML をキャッチして **`null` を返す**。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めます。評価は英語データを対象に行われるため、**英語の値のみ**をコピーして貼り付けます。不合格の場合は、(1) [Locale] を [United States]、(2) [Language] を [English] に切り替えてから、(3) [Check Challenge] をクリックしてみてください。
