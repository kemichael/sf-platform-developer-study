# Apex トリガー入門

## 学習の目的

この単元を完了すると、次のことができるようになります。

- Salesforce オブジェクトのトリガーを作成する。
- トリガーコンテキスト変数を使用する。
- トリガーからクラスメソッドをコールする。
- トリガーで sObject `addError()` メソッドを使用して保存操作を制限する。

> [!ポイント] この単元のゴール
>
> 「**レコードの保存（挿入・更新・削除・復元）の前後に、自動で Apex コードを走らせる仕組み**」が Apex トリガーです。**before / after の使い分け**、**コンテキスト変数（`Trigger.new` など）**、**`addError()` による保存の制限**の3点が試験対策の中心です。

---

## Apex トリガーの作成

Apex トリガーは、レコードのイベント（挿入・更新・削除）の前後にカスタムアクションを実行する仕組みです。SOQL / DML やカスタム Apex メソッドのコールなど、Apex でできることはすべて実行できます。定義できるのは標準・カスタムオブジェクトと一部の子標準オブジェクトで、作成時に有効になり指定イベントで自動実行されます。

> [!用語] Apex / sObject / DML / SOQL
>
> - **Apex**：Salesforce 上で動く Java 似のサーバーサイド言語。SOQL や DML を組み込む。
> - **sObject**：Salesforce のレコードを Apex で表す型。`Account a = new Account(Name='Test');` のように生成し `a.Name` で項目にアクセス。
> - **DML**：レコードの挿入・更新・削除・復元の操作（`insert`/`update`/`delete`/`undelete`/`upsert`/`merge`）。これが引き金（トリガー）となる。
> - **SOQL**：レコードを検索・取得するクエリ言語。トリガー内で関連レコード取得に使う。

> [!ポイント] トリガーを選ぶ場面
>
> まず**ポイント & クリック（入力規則・フロー）で実現できないか**を検討するのが鉄則。それで無理な複雑ロジックや大量レコードの高速処理が必要なときに Apex トリガーを使います。試験では「宣言的ツールで足りるなら優先する」が問われます。

---

## トリガー構文

トリガー定義は `trigger` キーワードで始め、名前・対象オブジェクト・起動条件を続けます。

```apex
trigger TriggerName on ObjectName (trigger_events) {
   code_block
}
```

トリガーイベントはカンマ区切りで複数指定できます。

- `before insert` / `before update` / `before delete`
- `after insert` / `after update` / `after delete`
- `after undelete`

> [!用語] トリガーイベント（Trigger Event）
>
> トリガーを起動させる DML のタイミング。「いつ（before / after）」「何の操作で（insert / update / delete / undelete）」の組み合わせ。`before insert` なら挿入の直前に起動します。

> [!例] 構文の各パーツ
>
> `trigger HelloWorldTrigger on Account (before insert)` を分解すると次のとおりです。
>
> | パーツ | 意味 |
> | --- | --- |
> | `trigger` | トリガー定義の開始キーワード |
> | `HelloWorldTrigger` | トリガーの名前（自由に付ける） |
> | `on Account` | 対象オブジェクト（取引先） |
> | `(before insert)` | 起動タイミングと操作（挿入の直前） |

### トリガーの例

取引先の挿入前に実行され、デバッグログにメッセージを書き込む簡単なトリガーです。

> [!手順] HelloWorldTrigger を作成して動かす
>
> 1. 開発者コンソールで **[File] | [New] | [Apex Trigger]** をクリック。
> 2. トリガー名に「`HelloWorldTrigger`」、sObject に **[Account]** を選択し **[Submit]**。
> 3. デフォルトのコードを次に置き換える。
>
>    ```apex
>    trigger HelloWorldTrigger on Account (before insert) {
>        System.debug('Hello World!');
>    }
>    ```
>
> 4. **[Ctrl+S]** で保存。
> 5. **[Debug] | [Open Execute Anonymous Window]** をクリック。
> 6. 次のコードを追加し **[Execute]**。
>
>    ```apex
>    Account a = new Account(Name='Test Trigger');
>    insert a;
>    ```
>
> 7. デバッグログで `Hello World!` を確認する。

> [!用語] 開発者コンソール（Developer Console）
>
> ブラウザ上で動く標準開発ツール。Apex クラス・トリガーの作成・編集、SOQL 実行、デバッグログ確認、匿名実行ができます。

---

## トリガーの種類

- **before トリガー**：レコード保存前に値を更新・検証する場合に使う。
- **after トリガー**：システム設定の項目（`Id`、`LastModifiedDate` など）へのアクセスや他レコードへの影響を与える場合に使う。after のレコードは参照のみ。

```text
        DML 操作（insert / update / delete …）
                      │
                      ▼
        ┌─────────────────────────┐
        │   before トリガー        │  ← 保存前。Trigger.new の値を
        │                          │     そのまま書き換えできる（DML 不要）
        └────────────┬────────────┘
                      ▼
        ┌─────────────────────────┐
        │   データベースへ保存      │  ← Id や LastModifiedDate が確定
        └────────────┬────────────┘
                      ▼
        ┌─────────────────────────┐
        │   after トリガー         │  ← 保存後。レコードは読み取り専用。
        │                          │     関連レコードの操作に使う
        └─────────────────────────┘
```

> [!ポイント] before と after の使い分け（頻出）
>
> | 種類 | タイミング | レコードの変更 | 主な用途 |
> | --- | --- | --- | --- |
> | **before** | 保存の**前** | `Trigger.new` を**直接変更可**（DML 不要） | 同一レコードの値の検証・補正 |
> | **after** | 保存の**後** | レコードは**読み取り専用** | `Id` の利用、関連レコードの作成・更新 |
>
> 「**自分の項目を変えたいなら before、保存後の `Id` を使ったり別レコードを操作したいなら after**」と覚えます。

> [!注意] before トリガーで自分自身に DML を呼ばない
>
> before では `Trigger.new` を書き換えれば保存時に自動反映されます。**自分自身に明示的に `update` などの DML を実行するとエラー**になります。

---

## コンテキスト変数の使用

トリガー対象のレコードにはコンテキスト変数でアクセスします。`Trigger.new` には挿入・更新されるレコード、`Trigger.old` には更新前の旧バージョンや削除されたレコードのリストが入ります。

> [!用語] コンテキスト変数（Context Variable）
>
> トリガー実行中だけ使える変数群。`Trigger.new`、`Trigger.old`、`Trigger.isBefore`、`Trigger.isInsert` などすべて `Trigger.` で始まり、「いまどんな状況か」と「対象レコードの中身」を教えます。

> [!注意] トリガーは常に「複数件」を想定する
>
> `Trigger.new` は**1件でもリスト**です。API や Apex 経由では一度に最大 200 件がまとめて処理されるため、必ず `for` ループで全件に対応させます。「1件しか来ない前提」で書くと一括処理で破綻します（次単元で詳述）。

for ループで各取引先の `Description` を更新する例です。

```apex
trigger HelloWorldTrigger on Account (before insert) {
    for(Account a : Trigger.new) {
        a.Description = 'New description';
    }
}
```

Boolean を返すコンテキスト変数（`Trigger.isInsert` など）を使うと、1つのトリガーで複数イベントを組み合わせられます。

```apex
trigger ContextExampleTrigger on Account (before insert, after insert, after delete) {
    if (Trigger.isInsert) {
        if (Trigger.isBefore) {
            // 挿入前の処理
        } else if (Trigger.isAfter) {
            // 挿入後の処理
        }
    }
    else if (Trigger.isDelete) {
        // 削除後の処理
    }
}
```

> [!例] 1つのトリガーで複数イベントをさばく
>
> 1つのトリガーで複数イベントを受け取り、`Trigger.isInsert` や `Trigger.isBefore` で「いまどのケースか」を判定して振り分けるのが一般的。同じオブジェクトにトリガーを乱立させずに済みます。

トリガーで使えるコンテキスト変数の一覧です。

| 変数 | 使用方法 |
| --- | --- |
| `isExecuting` | Visualforce / Web サービス / `executeanonymous()` ではなくトリガーの場合 `true`。 |
| `isInsert` | 挿入操作でトリガーが実行された場合 `true`。 |
| `isUpdate` | 更新操作でトリガーが実行された場合 `true`。 |
| `isDelete` | 削除操作でトリガーが実行された場合 `true`。 |
| `isBefore` | レコード保存前にトリガーが実行された場合 `true`。 |
| `isAfter` | レコード保存後にトリガーが実行された場合 `true`。 |
| `isUndelete` | ごみ箱からの復元後にトリガーが実行された場合 `true`。 |
| `new` | 新バージョンの sObject リスト。`insert`/`update`/`undelete` で使用可、`before` でのみ変更可。 |
| `newMap` | Id→新 sObject のマップ。`before update`/`after insert`/`after update`/`after undelete` で使用可。 |
| `old` | 旧バージョンの sObject リスト。`update`/`delete` で使用可。 |
| `oldMap` | Id→旧 sObject のマップ。`update`/`delete` で使用可。 |
| `operationType` | 現在の操作の `System.TriggerOperation` 列挙値（`BEFORE_INSERT`〜`AFTER_UNDELETE`）。種類別ロジックには `switch` を検討。 |
| `size` | この呼び出しで処理されるレコード数。200 件超はバッチ処理され、`Trigger.size` は現バッチ内の件数のみ。 |

> [!ポイント] new / old と Map 版の使い分け（頻出）
>
> | 変数 | 中身 | 使える代表的イベント |
> | --- | --- | --- |
> | `Trigger.new` | 新しい値のリスト | insert / update / undelete |
> | `Trigger.old` | 古い値のリスト | update / delete |
> | `Trigger.newMap` | Id→新レコードのマップ | before update / after insert / after update / after undelete |
> | `Trigger.oldMap` | Id→旧レコードのマップ | update / delete |
>
> **`delete` では `Trigger.new` が使えない**、**`insert` では `Trigger.old` が使えない**点が頻出。Id でレコードを引くときは Map 版が便利です。

---

## トリガーからのクラスメソッドのコール

トリガーから他クラスの公開メソッドをコールすると、コードの再利用・トリガーの縮小・保守性向上ができます。

> [!ポイント] 「ロジックはクラスに、トリガーは入口だけ」
>
> ベストプラクティスとして、実ロジックは **ハンドラークラス**（ヘルパークラス）に切り出します。再利用・テスト・保守がしやすくなり、「1オブジェクト1トリガー」と合わせて試験でも問われる設計パターンです。

次の例は、挿入時に `CustomContactNotification` クラスの静的メソッド `notifyUsers()` をコールし、挿入された取引先責任者の件数を含むカスタム通知を送信します。

> [!注意] カスタム通知の前提
>
> カスタム通知は Lightning Experience でのみ利用可能で、作成・編集には「アプリケーションのカスタマイズ」ユーザー権限が必要です。

> [!手順] カスタム通知とハンドラークラス・トリガーを作成する
>
> 1. **[Setup]** の **[Quick Find]** に `Notification Builder` と入力し **[Custom Notifications]** を選択。
> 2. **[新規]** をクリック。
> 3. **Custom Notification Name** に `New Contact Notification` と入力。
> 4. **API Name** に `New_Contact_Notification` と入力。
> 5. **Supported Channels** で **[Desktop]** を選択。
> 6. **[保存]** をクリック。
> 7. 開発者コンソールで **[File] | [New] | [Apex Class]**。
> 8. `CustomContactNotification` と入力し **[OK]**。
> 9. デフォルトのクラス本文を以下の例で置き換える。

```apex
public with sharing class CustomContactNotification {
    public static void notifyUsers(Set<String> recipientsIds, Integer recordCount) {
        // 設定で作成したカスタム通知種別の ID を取得する
        CustomNotificationType notificationType =
            [SELECT Id, DeveloperName
             FROM CustomNotificationType
             WHERE DeveloperName='New_Contact_Notification'];
        // カスタム通知を作成し内容を設定する
        Messaging.CustomNotification notification = new Messaging.CustomNotification();
        notification.setTitle('Trailhead Trigger Tutorial');
        notification.setBody(recordCount + ' contact(s) were inserted.');
        notification.setNotificationTypeId(notificationType.Id);
        // '000000000000000AAA' はダミーの targetId 値
        notification.setTargetId('000000000000000AAA');
        // 通知を送信する
        try {
            notification.send(recipientsIds);
            System.debug('Custom notification sent successfully.');
        }
        catch (Exception e) {
            System.debug('Problem sending notification: ' + e.getMessage());
        }
    }
}
```

> [!用語] 静的メソッド（static method）
>
> インスタンスを生成せず `クラス名.メソッド名()` で直接呼び出せるメソッド。`CustomContactNotification.notifyUsers(...)` のようにユーティリティ処理をまとめるのに向きます。

> [!手順] ハンドラーを呼び出すトリガーを作成してテストする
>
> 1. 開発者コンソールで **[File] | [New] | [Apex Trigger]**。
> 2. トリガー名に `ContactNotificationTrigger`、sObject に **[Contact]** を選択し **[Submit]**。
> 3. デフォルトのコードを次に置き換える。
>
>    ```apex
>    trigger ContactNotificationTrigger on Contact (after insert, after delete) {
>        if (Trigger.isInsert) {
>            Integer recordCount = Trigger.new.size();
>            // 送信先 ID を現在のユーザーに設定する
>            Set<String> recipientIDs = new Set<String>{UserInfo.getUserId()};
>            // 別クラスのユーティリティメソッドをコールする
>            CustomContactNotification.notifyUsers(recipientIDs, recordCount);
>        }
>        else if (Trigger.isDelete) {
>            // 削除後の処理
>        }
>    }
>    ```
>
> 4. **[Ctrl+S]** で保存。
> 5. **[Debug] | [Open Execute Anonymous Window]** をクリック。
> 6. 次のコードを追加し **[Execute]**。
>
>    ```apex
>    Contact c = new Contact(LastName='Test Contact');
>    insert c;
>    ```
>
> 7. デバッグログで `DEBUG|Custom notification sent successfully` を確認。
> 8. 通知ベルをクリックし、「Trailhead Trigger Tutorial」「1 contact(s) were inserted.」の通知を確認する。

---

## 関連レコードの追加

トリガーは、起動の原因となったレコードに関連するレコードの操作によく使います。次のトリガーは、まだ商談がない取引先に商談を1件追加します。SOQL で子商談を取得し、`Trigger.new` を反復処理して商談のない取引先に商談を作成、最後に一括 insert します。

> [!ポイント] ループの外で1回だけクエリ・DML する
>
> 下の例では SOQL（`acctsWithOpps`）と `insert oppList;` が**どちらも for ループの外**にあります。子商談はまとめて1回のクエリで取得し、追加する商談はリスト（`oppList`）に貯めてループ後に一括 `insert`。これがガバナ制限を超えない基本形です。

> [!用語] ガバナ制限（Governor Limits）
>
> マルチテナント環境のため、1処理が資源を独占しないよう各種上限があります。代表例は「SOQL **100 回**」「DML **150 回**」（1トランザクションあたり）。**ループ内で SOQL / DML を呼ぶ**とすぐ上限に達するため、必ずループの外でまとめます。

開発者コンソールで `AddRelatedRecord` トリガーを追加します（手順は `HelloWorldTrigger` と同様）。

```apex
trigger AddRelatedRecord on Account(after insert, after update) {
    List<Opportunity> oppList = new List<Opportunity>();
    // このトリガー内の取引先に関連する商談を取得する
    Map<Id,Account> acctsWithOpps = new Map<Id,Account>(
        [SELECT Id,(SELECT Id FROM Opportunities) FROM Account WHERE Id IN :Trigger.new]);
    // まだ商談がない取引先それぞれに商談を1件追加する
    for(Account a : Trigger.new) {
        System.debug('acctsWithOpps.get(a.Id).Opportunities.size()=' + acctsWithOpps.get(a.Id).Opportunities.size());
        // 取引先がすでに関連商談を持っているか確認する
        if (acctsWithOpps.get(a.Id).Opportunities.size() == 0) {
            // 持っていなければデフォルトの商談を追加する
            oppList.add(new Opportunity(Name=a.Name + ' Opportunity',
                                       StageName='Prospecting',
                                       CloseDate=System.today().addMonths(1),
                                       AccountId=a.Id));
        }
    }
    if (oppList.size() > 0) {
        insert oppList;
    }
}
```

> [!手順] AddRelatedRecord トリガーをテストする
>
> 1. Salesforce UI で取引先を作成し `Apples and Oranges` と名付ける。
> 2. 取引先ページの **[商談]** 関連リストで、トリガーが自動追加した商談を確認する。

> [!注意] このトリガーはまだ最適化の余地がある
>
> このトリガーは `Trigger.new` の全取引先を反復処理しますが、実際に必要なのは商談のない取引先のみ。次単元では SOQL を変更し商談のない取引先だけを取得・反復処理する効率化を学びます。

---

## トリガーの例外の使用

特定条件でレコードを保存させないなど、データベース操作に制限を加えたいときは、対象 sObject で `addError()` を呼びます。`addError()` は致命的エラーを生成し、メッセージが UI に表示されログに記録されます。

> [!用語] addError() メソッド
>
> sObject に対して呼ぶと「このレコードは保存できない」エラーを発生させるメソッド。引数の文字列がそのままユーザー向けエラーメッセージになります。入力規則では実現できない複雑な条件で保存を止めたいときに使います。

次のトリガーは、関連商談がある取引先の削除を防ぎ、商談のカスケード削除を回避します。前の例の `Apples and Oranges` 取引先を使います。

```apex
trigger AccountDeletion on Account (before delete) {
    // 関連商談を持つ取引先の削除を防ぐ
    for (Account a : [SELECT Id FROM Account
                     WHERE Id IN (SELECT AccountId FROM Opportunity) AND
                     Id IN :Trigger.old]) {
        Trigger.oldMap.get(a.Id).addError(
            'Cannot delete account with related opportunities.');
    }
}
```

> [!手順] AccountDeletion トリガーをテストして無効化する
>
> 1. `Apples and Oranges` 取引先ページで **[Delete]** をクリック。
> 2. 確認ポップアップで **[Delete]**。
> 3. `Cannot delete account with related opportunities` のカスタムエラーが表示されることを確認。
> 4. テスト後、`AccountDeletion` トリガーを無効化する。
> 5. **[Setup]** から `Apex Triggers` を検索。
> 6. `AccountDeletion` の横の **[Edit]** をクリック。
> 7. **[Is Active]** をオフにする。
> 8. **[保存]**。

> [!注意] addError() とロールバックの挙動（試験頻出）
>
> `addError()` をコールすると、一括 DML が部分的に完了している場合を除き、操作全体がロールバックされます。
>
> - **Platform API の一括 DML コール**：不正レコードを除外し、エラーのないレコードのみ保存（**部分的成功**）。
> - **Apex の DML ステートメント**：エラーで**操作全体がロールバック**。ただし全レコードを処理して完全なエラーリストを作成する。

---

## トリガーとコールアウト

Apex から外部 Web サービスへコールできます。これを**コールアウト**といいます。トリガーからのコールアウトは、応答待ちで操作がブロックされないよう**非同期**に行う必要があります。

> [!用語] コールアウト / future メソッド
>
> - **コールアウト**：Apex から Salesforce 外の Web サービス（API）へ HTTP リクエストを送ること。
> - **future メソッド（@future）**：`@future` を付けると別のバックグラウンドプロセスで非同期実行される。トリガーからコールアウトする場合は `@future(callout=true)` を付ける。

> [!注意] このコールアウト例はそのままでは動かない
>
> 架空のエンドポイント URL を使うため、有効な URL に変更しリモートサイト設定を追加しない限り実行できません。

```apex
public class CalloutClass {
    @future(callout=true)
    public static void makeCallout() {
        HttpRequest request = new HttpRequest();
        // エンドポイント URL を設定する
        String endpoint = 'http://yourHost/yourService';
        request.setEndPoint(endpoint);
        request.setMethod('GET');
        // HTTP リクエストを送信して応答を取得する
        HttpResponse response = new HTTP().send(request);
    }
}
```

トリガーから future メソッドをコールしてコールアウトを非同期実行します。

```apex
trigger CalloutTrigger on Account (before insert, before update) {
    CalloutClass.makeCallout();
}
```

> [!ポイント] トリガーからのコールアウトは必ず非同期
>
> トリガーから直接（同期）コールアウトすると「`You have uncommitted work pending`」エラーになります。**`@future(callout=true)` メソッド**（または Queueable）経由で非同期実行するのが定石です。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] トリガーの設計ベストプラクティス
>
> - **1オブジェクト1トリガー**：実行順序が保証されないため、1つにまとめてハンドラークラスへ振り分ける。
> - **ロジックレス（軽量）トリガー**：トリガー本体には条件分岐だけ書き、実処理はハンドラークラスに委譲する。
> - **一括化（Bulkification）**：常に `Trigger.new` を `for` ループで処理し、SOQL / DML は**ループの外**でまとめて実行する。
> - **再帰の防止**：トリガーが別の DML を起こして再び走る「再帰」を、静的変数フラグなどで制御する。

> [!ポイント] before / after でできること早見表
>
> | やりたいこと | 使うトリガー |
> | --- | --- |
> | 同じレコードの項目を補正・検証する | **before**（DML 不要） |
> | 保存を中止してエラーを出す（`addError`） | **before**（delete なら before delete） |
> | 確定した `Id` を使って関連レコードを作る | **after** |
> | 別オブジェクトのレコードを更新する | **after** |

> [!まとめ] この単元の要点
>
> - トリガーは `trigger 名前 on オブジェクト (イベント) { ... }` で定義する。
> - **before** は保存前（自レコードを直接変更可）、**after** は保存後（`Id` あり・読み取り専用）。
> - コンテキスト変数（`Trigger.new`/`old`/`newMap`/`oldMap`/`isInsert` …）で状況とレコードを取得する。
> - トリガーは**常に複数件**を想定し、SOQL/DML は**ループの外**でまとめる（ガバナ制限）。
> - 保存を止めたいときは sObject の **`addError()`** を呼ぶ。
> - トリガーからのコールアウトは **`@future(callout=true)`** で非同期に行う。

---

## リソース

- Apex 開発者ガイド: トリガー
- Apex 開発者ガイド: Apex を使用したコールアウトの呼び出し
- Apex リファレンスガイド: CustomNotification クラス
- Trailhead: Apex インテグレーションサービス

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：Apex トリガーを作成する
>
> **[Match Billing Address（請求先住所と一致）]** が選択されている場合に、取引先の **[Shipping Postal Code（郵便番号(納入先)）]** を **[Billing Postal Code（郵便番号(請求先)）]** と一致させる Apex トリガーを作成します。トリガーは取引先の挿入前または更新前に起動します。
>
> **事前作業：取引先オブジェクトにチェックボックス項目を追加する**
>
> - Field Label（項目の表示ラベル）：`Match Billing Address`（請求先住所と一致）
> - 項目名：`Match_Billing_Address`
> - メモ：生成される API 参照名は `Match_Billing_Address__c` になります。
>
> **Apex トリガーを作成する**
>
> - Name（名前）：`AccountAddressTrigger`
> - Object（オブジェクト）：`Account`（取引先）
> - Events（イベント）：`before insert` と `before update`
> - Condition（条件）：[Match Billing Address] が `true`
> - 操作：[郵便番号(納入先)] を [郵便番号(請求先)] と一致するように設定する

> [!ポイント] Challenge 攻略のヒント
>
> - 「保存前に同じレコードの項目を書き換える」ので **before トリガー**（`before insert, before update`）です。
> - `Trigger.new` を `for` ループで回し、各取引先の `Match_Billing_Address__c` が `true` のときだけ `ShippingPostalCode = BillingPostalCode` を代入します。
> - before トリガーなので**代入するだけ**で保存に反映され、明示的な `update` は不要（呼ぶとエラー）です。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めてください。評価は英語データに対して行われるため、**英語の値のみ**をコピー&ペーストします。日本語組織で不合格になった場合は、(1) [Locale] を [United States]、(2) [Language] を [English] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがあります。
