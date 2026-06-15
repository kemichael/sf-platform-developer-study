# 一括 Apex トリガー

## 学習の目的

この単元を完了すると、次のことができるようになります。

- sObject のコレクションに対して動作するトリガーを作成する。
- 効率の良い SOQL 操作と DML 操作を実行するトリガーを作成する。

> [!ポイント] この単元のゴール
>
> 「**トリガーは常に複数件（最大 200 件のバッチ）をまとめて処理する**」前提で書くのが「一括化（Bulkification）」です。**`for` ループで全件処理**、**SOQL / DML はループの外で1回だけ実行**、この2点がこの単元と試験の核心です。

---

## 一括トリガーの設計パターン

Apex トリガーは一括処理向けに最適化されています。一括設計パターンを使うと、パフォーマンスが向上し、サーバーリソースの消費が抑えられ、ガバナ制限を超える可能性が低くなります。

> [!用語] 一括化（Bulkification：バルク化）
>
> 1件だけでなく**複数件がまとめて渡されても正しく・効率的に動く**ようにコードを書くこと。柱は「`for` ループで全レコードを処理」「SOQL / DML をループの外でまとめて実行」の2つです。

> [!用語] ガバナ制限（Governor Limits）
>
> マルチテナント環境のため、1処理がリソースを独占しないよう各種上限を設けています。1トランザクションあたりの代表的な制限は次のとおりです。
>
> | 制限項目 | 同期 Apex | 非同期 Apex |
> | --- | --- | --- |
> | SOQL クエリの発行回数 | 100 | 200 |
> | 取得できるレコード総数 | 50,000 | 50,000 |
> | DML ステートメントの実行回数 | 150 | 150 |
> | DML で処理できるレコード総数 | 10,000 | 10,000 |
>
> 一括化していないコードは、件数が増えると上限に達して例外（`System.LimitException`）で止まります。

```text
   一括化していないコード               一括化したコード
   ─────────────────              ─────────────────
   for (各レコード) {                SOQL を1回だけ実行（ループ外）
       SOQL を実行  ← ✗ 件数分発行     for (各レコード) {
       DML を実行   ← ✗ 件数分実行         結果をリストに溜める
   }                                  }
                                      DML を1回だけ実行（ループ外）
   200件 → SOQL/DML が200回           200件 → SOQL/DML が各1回
   → すぐ制限超過                      → 制限に余裕
```

---

## レコードセットに対する処理

一括処理化されたトリガーは、トリガーコンテキストのすべての sObject に対して実行されます。UI 操作なら通常1レコード、一括 DML や API 経由ならレコードセット全体に対して実行されます。**常にレコードのコレクションを想定**してプログラミングします。

> [!例] 1件で動いても、一括で壊れるコードがある
>
> 画面から1件作るとトリガーには1件しか渡りません。しかしデータローダーで 500 件をインポートすると、200 件 → 200 件 → 100 件と分けて渡されます。「1件目だけ処理する」コードは画面テストでは通っても一括インポートで取りこぼします。

次のトリガー（`MyTriggerNotBulk`）は1レコードのみを想定しており、複数レコードの挿入時にレコードセット全体に対して動きません。

```apex
trigger MyTriggerNotBulk on Account(before insert) {
    Account a = Trigger.new[0];
    a.Description = 'New description';
}
```

> [!注意] アンチパターン：`Trigger.new[0]` だけを触る
>
> 上のコードは `Trigger.new` の**先頭の1件（添字 0）だけ**を処理し、2件目以降を無視します。典型的な「一括化されていない（NotBulk）」失敗例です。

次の例（`MyTriggerBulk`）は `for` ループで全 sObject を反復処理し、1件でも複数件でも機能します。

```apex
trigger MyTriggerBulk on Account(before insert) {
    for(Account a : Trigger.new) {
        a.Description = 'New description';
    }
}
```

> [!ポイント] 一括化の第一歩は「必ず for ループ」
>
> `Trigger.new` を `for` ループで回せば、1件でも 200 件でも同じコードで正しく動きます。ほぼすべてのトリガーで使う基本形です。

---

## 一括 SOQL の実行

SOQL は1クエリで関連レコードの取得や複数条件のチェックができ、クエリ数を減らせます。クエリ数を減らすとクエリ制限（同期 100 / 非同期 200）に達しにくくなります。

次のトリガー（`SoqlTriggerNotBulk`）は避けるべきパターンで、`for` ループ内に SOQL があり取引先ごとに1回ずつクエリが実行されます。

```apex
trigger SoqlTriggerNotBulk on Account(after update) {
    for(Account a : Trigger.new) {
        // 取引先ごとに1回ずつ実行される非効率な SOQL クエリ！
        Opportunity[] opps = [SELECT Id,Name,CloseDate
                             FROM Opportunity WHERE AccountId=:a.Id];
        // その他の処理を行う
    }
}
```

> [!注意] 最も多いガバナ制限違反：ループ内 SOQL
>
> `for` ループの**中**で SOQL を書くと、取引先が 101 件あればクエリが 101 回発行され、上限 100 回を超えて `System.LimitException: Too many SOQL queries: 101` で失敗します。「ループの中に SOQL を書かない」は試験でも実務でも最重要のルールです。

次の例（`SoqlTriggerBulk`）はベストプラクティスで、SOQL をメインループ外で1回コールします。

- 内部クエリ（`SELECT Id FROM Opportunities`）で取引先の関連商談を取得。
- `WHERE Id IN :Trigger.new` で `Trigger.new` をバインドし、トリガー対象の取引先のみに絞り込む。
- 1回のコールで取引先と関連商談を取得し、`for` ループでコレクション変数（`acctsWithOpps`）を反復処理する。ループ内に追加クエリは不要。

> [!用語] バインド変数（Bind Variable）
>
> SOQL の `WHERE` 句で `:変数名` の形で Apex 変数を差し込む仕組み。`WHERE Id IN :Trigger.new` と書くと、`Trigger.new` の Id 集合で一気に絞り込め、1回のクエリで関係するレコードをまとめて取得できます。

```apex
trigger SoqlTriggerBulk on Account(after update) {
    // SOQL クエリを1回だけ実行する
    // 取引先とその関連商談を取得する
    List<Account> acctsWithOpps =
        [SELECT Id,(SELECT Id,Name,CloseDate FROM Opportunities)
         FROM Account WHERE Id IN :Trigger.new];
    // 返された取引先に反復処理する
    for(Account a : acctsWithOpps) {
        Opportunity[] relatedOpps = a.Opportunities;
        // その他の処理を行う
    }
}
```

親の取引先が不要なら、`WHERE AccountId IN :Trigger.new` でトリガーコンテキストの全取引先に関連する商談のみを取得できます。

```apex
trigger SoqlTriggerBulk on Account(after update) {
    // SOQL クエリを1回だけ実行する
    // このトリガー内の取引先に関連する商談を取得する
    List<Opportunity> relatedOpps = [SELECT Id,Name,CloseDate FROM Opportunity
        WHERE AccountId IN :Trigger.new];
    // 関連商談に反復処理する
    for(Opportunity opp : relatedOpps) {
        // その他の処理を行う
    }
}
```

SOQL クエリと `for` ループを **SOQL `for` ループ**にまとめると、コードを短くできます。

> [!用語] SOQL for ループ（SOQL for loop）
>
> `for (Opportunity opp : [SELECT ... FROM Opportunity ...])` のように SOQL を `for` ループに直接書く記法。結果を一時変数に入れずに反復処理でき簡潔です。大量レコードを内部的に 200 件ずつのバッチで読むため、ヒープメモリも節約できます。

```apex
trigger SoqlTriggerBulk on Account(after update) {
    // SOQL クエリを1回だけ実行し、それらに反復処理する
    for(Opportunity opp : [SELECT Id,Name,CloseDate FROM Opportunity
        WHERE AccountId IN :Trigger.new]) {
        // その他の処理を行う
    }
}
```

> [!注意] トリガーは 200 件ずつのバッチで実行される
>
> トリガーは一度に 200 レコードのバッチで実行されます（400 なら 200 件ずつ2回）。そのため SOQL `for` ループでレコードをバッチにまとめるメリットはありません（トリガー自体がすでにバッチ単位）。ただしコレクション変数の反復処理より SOQL `for` ループのほうが簡潔で明解です。

> [!ポイント] ガバナ制限の数え方はバッチ単位
>
> ガバナ制限は「**トリガーの1回の起動（＝1バッチ＝最大200件）あたり**」でカウントされます。400 件なら 200 件のバッチ2回に分かれ、それぞれで SOQL 100 回・DML 150 回まで使えます。「合計400件だから制限が2倍厳しくなる」わけではありません。

---

## 一括 DML の実行

DML コールは可能なら sObject のコレクションに対して実行します。個別実行はリソースの使用が非効率です。Apex ランタイムは1トランザクションで最大 150 の DML コールを実行できます。

次のトリガー（`DmlTriggerNotBulk`）は `for` ループ内で update を実行する非効率な例です。取引先が多いと商談数がすぐ 150 を超えます。

```apex
trigger DmlTriggerNotBulk on Account(after update) {
    // このトリガー内の取引先に関連する商談を取得する
    List<Opportunity> relatedOpps = [SELECT Id,Name,Probability FROM Opportunity
        WHERE AccountId IN :Trigger.new];
    // 関連商談に反復処理する
    for(Opportunity opp : relatedOpps) {
        // 確度が 50% 以上 100% 未満のときに説明を更新する
        if ((opp.Probability >= 50) && (opp.Probability < 100)) {
            opp.Description = 'New description for opportunity.';
            // 商談ごとに1回 update -- 非効率！
            update opp;
        }
    }
}
```

> [!注意] アンチパターン：ループ内 DML
>
> `for` ループの**中**で `update`／`insert`／`delete` を呼ぶと、件数分の DML が発行され 151 件目で `System.LimitException: Too many DML statements: 151` になります。**更新対象はリストに溜めて、ループの後で1回だけ DML する**のが正解です。

次の例（`DmlTriggerBulk`）は、更新対象をリスト（`oppsToUpdate`）に溜め、ループ外で1回 DML する効率的な方法です。

```apex
trigger DmlTriggerBulk on Account(after update) {
    // このトリガー内の取引先に関連する商談を取得する
    List<Opportunity> relatedOpps = [SELECT Id,Name,Probability FROM Opportunity
        WHERE AccountId IN :Trigger.new];
    List<Opportunity> oppsToUpdate = new List<Opportunity>();
    // 関連商談に反復処理する
    for(Opportunity opp : relatedOpps) {
        // 確度が 50% 以上 100% 未満のときに説明を更新する
        if ((opp.Probability >= 50) && (opp.Probability < 100)) {
            opp.Description = 'New description for opportunity.';
            oppsToUpdate.add(opp);
        }
    }
    // コレクションに対して DML を実行する
    update oppsToUpdate;
}
```

> [!ポイント] 「リストに溜めてループ外で1回 DML」が黄金パターン
>
> 1. 空のリスト（`oppsToUpdate`）を用意する。
> 2. ループの中では更新対象を**リストに `add` するだけ**で、DML は呼ばない。
> 3. ループを抜けてから、そのリストに対して `update`（または `insert`/`delete`）を**1回だけ**実行する。
>
> SOQL のループ外集約と並ぶ一括化の二大原則です。

---

## 一括設計パターンの動作：関連レコードを取得する例

前単元の `AddRelatedRecord` トリガーを変更します。元のトリガーは一括操作されますが `Trigger.new` の全レコードを反復処理するため最も効率的ではありません。ここでは関心のあるレコードのみを取得・反復処理するよう改善します。

要件：取引先の挿入・更新時に起動し、まだ商談がない取引先にデフォルト商談を追加する。新規挿入時はデフォルト商談がないので必ず追加、更新時は関連商談の有無を調べる必要があります。そこで `Trigger.operationType` への `switch` で挿入と更新を分け、処理対象を `toProcess` 変数で追跡します。

> [!用語] Trigger.operationType と switch ステートメント
>
> `Trigger.operationType` は実行中の操作を表す列挙値（`AFTER_INSERT`、`AFTER_UPDATE` など）を返します。`switch on ... when ...` と組み合わせると「挿入のときはこの処理、更新のときはあの処理」と分岐を見やすく書けます。`if (Trigger.isInsert)` を多重に書くより読みやすくなります。

```apex
List<Account> toProcess = null;
switch on Trigger.operationType {
    when AFTER_INSERT {
        // 処理を行う
    }
    when AFTER_UPDATE {
        // 処理を行う
    }
}
```

挿入時は、新しい取引先を `toProcess` に割り当てるだけです。

```apex
when AFTER_INSERT {
     toProcess = Trigger.New;
}
```

> [!例] なぜ挿入時はクエリ不要なのか
>
> 新規挿入された取引先はその瞬間まだ子商談を持ちません。よって「商談を持っているか調べる」SOQL は不要で、`Trigger.new` をそのまま処理対象にできます。**無駄なクエリを発行しない**のも立派な最適化です。

更新時は after トリガーなのでデータベースを照会でき、関連商談のない取引先を絞り込んで `toProcess` に割り当てます。

```apex
when AFTER_UPDATE {
     toProcess = [SELECT Id,Name FROM Account
                  WHERE Id IN :Trigger.New AND
                  Id NOT IN (SELECT AccountId FROM Opportunity WHERE AccountId in :Trigger.New)];
}
```

> [!例] `Id NOT IN (サブクエリ)` で「商談がない取引先」だけ取る
>
> 「トリガー対象の取引先（`Id IN :Trigger.New`）」のうち「商談を持つ取引先（`SELECT AccountId FROM Opportunity ...`）に含まれない（`Id NOT IN`）」ものだけを返します。**商談がまだ無い取引先だけ**を最初から絞り込み、後続ループを最小限にします。

`for` ループで `toProcess` を反復処理してデフォルト商談を `oppList` に追加し、ループ外で `insert` します。

> [!手順] AddRelatedRecord トリガーを作成・更新してテストする
>
> 1. 前単元で作成済みなら次の内容に置き換え、未作成なら開発者コンソールで次のトリガー（名前 `AddRelatedRecord`）を追加する。
>
>    ```apex
>    trigger AddRelatedRecord on Account(after insert, after update) {
>        List<Opportunity> oppList = new List<Opportunity>();
>        // このトリガー内で商談を持たない取引先に反復処理する
>        List<Account> toProcess = null;
>        switch on Trigger.operationType {
>            when AFTER_INSERT {
>            // 挿入された取引先はすべて商談が必要なので、クエリは不要
>                toProcess = Trigger.New;
>            }
>            when AFTER_UPDATE {
>                toProcess = [SELECT Id,Name FROM Account
>                             WHERE Id IN :Trigger.New AND
>                             Id NOT IN (SELECT AccountId FROM Opportunity WHERE AccountId in :Trigger.New)];
>            }
>        }
>        for (Account a : toProcess) {
>            // この取引先にデフォルト商談を追加する
>            oppList.add(new Opportunity(Name=a.Name + ' Opportunity',
>                                        StageName='Prospecting',
>                                        CloseDate=System.today().addMonths(1),
>                                        AccountId=a.Id));
>        }
>        if (oppList.size() > 0) {
>            insert oppList;
>        }
>    }
>    ```
>
> 2. Salesforce UI で取引先を作成し `Lions and Cats` と名付ける。
> 3. 取引先ページの **[商談]** 関連リストで、自動追加された `Lions and Cats Opportunity` を確認する。

> [!ポイント] このトリガーが一括化できているチェックポイント
>
> - SOQL は `switch` の各分岐で**1回ずつ**（ループの外）。
> - `insert oppList;` は**ループの外で1回だけ**。
> - 更新時は「商談がない取引先だけ」を SOQL で先に絞り込み、無駄な反復を排除。
> - これにより 200 件超の一括処理でもガバナ制限に余裕を持って収まります。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] 一括化チェックリスト（暗記推奨）
>
> - **SOQL をループの中に書かない**（同期 100 / 非同期 200 回上限）。
> - **DML をループの中に書かない**（150 回上限）。更新対象はリストに溜めてループ外で1回 DML。
> - `Trigger.new` は必ず `for` ループで全件処理する（`Trigger.new[0]` だけは NG）。
> - 関連レコードはバインド変数（`WHERE Id IN :Trigger.new`）で1回のクエリにまとめる。
> - トリガーは **200 件ずつのバッチ**で起動し、制限はバッチ単位でカウントされる。

> [!注意] よくある誤解
>
> - 「画面では1件しか作らないから一括化は不要」→ データローダー・API・Apex 経由では複数件が渡るため**必ず**一括化が必要。
> - 「`for` ループにすれば完了」→ ループの中で SOQL/DML を呼んでいれば不十分。**SOQL/DML をループ外に出すこと**まで含めて一括化。

> [!まとめ] この単元の要点
>
> - 一括化とは「複数件をまとめて正しく・効率的に処理する」書き方。
> - 二大原則：(1) `for` ループで全件処理、(2) SOQL / DML はループの外で1回だけ。
> - 関連レコードは**バインド変数で1クエリ**取得し、更新対象は**リストに溜めて1回 DML**。
> - トリガーは 200 件単位のバッチで動き、ガバナ制限はバッチごとにカウントされる。
> - `Trigger.operationType` + `switch` で挿入/更新の処理を分け、無駄なクエリを省ける。

---

## リソース

- Apex 開発者ガイド: トリガー
- Apex 開発者ガイド: 実行ガバナと制限

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：一括 Apex トリガーを作成する
>
> フェーズが **[Closed Won（商談成立）]** の商談にフォローアップ ToDo を追加する一括 Apex トリガーを作成します。トリガーは商談の挿入後または更新後に起動します。
>
> **Apex トリガーを作成する**
>
> - Name（名前）：`ClosedOpportunityTrigger`
> - Object（オブジェクト）：`Opportunity`（商談）
> - Events（イベント）：`after insert` と `after update`
> - 条件：フェーズが `Closed Won`（商談成立）である
> - 操作：ToDo を作成する
>   - `Subject`（件名）：`Follow Up Test Task`（フォローアップ ToDo）
>   - `WhatId`：商談 ID（ToDo を商談に関連付ける）
> - Apex トリガーを**一括処理化**して 200 件以上の商談を挿入または更新できるようにする

> [!ポイント] Challenge 攻略のヒント
>
> - 保存後に確定した商談 ID を ToDo（`Task`）の `WhatId` に使うため、**after トリガー**（`after insert, after update`）です。
> - `Trigger.new` を `for` ループで回し、`opp.StageName == 'Closed Won'` の商談だけ `Task` を作って**リストに `add`** します。
> - `insert` は**ループの外で1回だけ**実行します（200 件超対応の肝）。
> - `Task` には `Subject = 'Follow Up Test Task'` と `WhatId = opp.Id` を設定します。
> - 評価では 200 件以上の一括挿入・更新が試されるので、ループ内 SOQL／DML を絶対に入れないこと。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めてください。評価は英語データに対して行われるため、**英語の値のみ**をコピー&ペーストします。日本語組織で不合格になった場合は、(1) [Locale] を [United States]、(2) [Language] を [English] に切り替えてから、(3) [Check Challenge] をクリックすると通ることがあります。
