# SOSL クエリの作成

## 学習の目的

この単元を完了すると、次のことができるようになります。

- SOSL と SOQL の相違点を説明する。
- SOSL クエリを使用して複数のオブジェクトにわたって項目を検索する。
- 開発者コンソールのクエリエディターを使用して SOSL クエリを実行する。

> [!ポイント] この単元のゴール
>
> 「**複数のオブジェクトをまたいでテキスト検索する言語が SOSL**」と覚えるのが第一歩。SOQL との違い（単語一致 vs 完全一致、複数 vs 単一オブジェクト）、`FIND` 句の構文、Apex では `'シングルクオート'`／クエリエディターでは `{中括弧}` を使うこと、結果が **リストのリスト（`List<List<sObject>>`）** で返ることを押さえれば試験対策はほぼ万全です。

---

## SOSL 入門

**Salesforce Object Search Language（SOSL）** は、レコード内のテキスト検索を行う Salesforce の検索言語です。複数の標準・カスタムオブジェクトのレコードを対象に、項目を横断的に検索できます。全文検索エンジン Apache Lucene と似た仕組みを持ちます。

> [!用語] SOSL（ソスル：Salesforce Object Search Language）
>
> Salesforce 専用の **テキスト検索言語**。複数のオブジェクトをまたいで「この単語を含むレコードを探す」検索ができます。Google の検索ボックスに近く、「単語が含まれているか」で一致を判定します。読みは「ソスル」。

SOSL クエリも Apex に直接埋め込めます。これを **インライン SOSL** と呼びます。次は「SFDC」を含む取引先（Account）と取引先責任者（Contact）を検索する例です。

```apex
List<List<SObject>> searchList = [FIND 'SFDC' IN ALL FIELDS
                                      RETURNING Account(Name), Contact(FirstName,LastName)];
```

> [!用語] インライン SOSL（Inline SOSL）
>
> Apex コードの中に角括弧 `[ ... ]` で直接書き込んだ SOSL クエリ。`[FIND ... RETURNING ...]` と書くだけでクエリを実行し、結果を変数に受け取れます（SOQL も同様）。

> [!例] このクエリが何をしているか
>
> - `FIND 'SFDC'` … 「SFDC」を含むレコードを探す。`IN ALL FIELDS` … 全項目を検索対象に。
> - `RETURNING Account(Name), Contact(FirstName,LastName)` … 取引先は名前、取引先責任者は名・姓を返す。
>
> 結果は `Account` と `Contact` の 2 種類のリストがまとめて返ります（後述の「リストのリスト」）。

---

## SOQL と SOSL の相違点と類似点

どちらも組織のレコードから情報を検索しますが、一度に 1 オブジェクトしか照会できない SOQL と異なり、**1 つの SOSL クエリですべてのオブジェクトを検索**できます。また **SOSL は単語の一致**、**SOQL はデフォルトで完全一致**（ワイルドカード未使用時）です。たとえば「Digital」を検索すると、SOSL では「Digital」や「The Digital Company」が返りますが、SOQL では「Digital」のみが返ります。

| 比較項目 | SOQL | SOSL |
| --- | --- | --- |
| 正式名称 | Salesforce Object Query Language | Salesforce Object Search Language |
| 目的 | レコードの**取得（クエリ）** | レコードの**テキスト検索** |
| 対象オブジェクト数 | **1 つ**の標準/カスタムオブジェクト | **複数**のオブジェクトを同時に |
| 一致方法 | **完全一致**（ワイルドカード未使用時） | **単語の一致**（部分一致に近い） |
| 開始キーワード | `SELECT` | `FIND` |
| 戻り値の型（Apex） | `List<sObject>`（例：`List<Account>`） | `List<List<sObject>>`（**リストのリスト**） |
| 主な用途 | 条件に合う特定オブジェクトのレコード抽出 | 横断的なキーワード検索 |

> [!ポイント] 使い分けの暗記ポイント
>
> - **1 つのオブジェクト**のレコードを取得したい → **SOQL**。
> - **複数のオブジェクト**を横断してテキスト検索したい → **SOSL**。
> - 「**単語一致なら SOSL／完全一致なら SOQL**」「**検索（Search）の S は SOSL**」と結びつけると間違えにくいです。

> [!例] 単語一致と完全一致の違い
>
> 「Digital」で検索した場合の結果イメージ。
>
> | 項目値 | SOSL（単語一致） | SOQL（完全一致） |
> | --- | --- | --- |
> | `Digital` | 一致する | 一致する |
> | `The Digital Company` | **一致する** | 一致しない |
> | `Digitalize` | 一致しない（別の単語扱い） | 一致しない |

---

## 前提条件

この単元の一部のクエリは、組織に取引先と取引先責任者があることを前提とします。SOQL の単元でサンプルデータを作成済みならスキップできます。

> [!手順] サンプルデータを作成する
>
> 1. 開発者コンソールの **[Debug（デバッグ）]** メニューから **[Execute Anonymous（匿名実行）]** ウィンドウを開く。
> 2. 次のスニペットを入力し、**[Execute（実行）]** をクリックする。

```apex
// 取引先と、それに紐づく取引先責任者を追加する
Account acct = new Account(
    Name='SFDC Computing',
    Phone='(415)555-1212',
    NumberOfEmployees=50,
    BillingCity='San Francisco');
insert acct;
// 取引先を insert すると sObject に ID が自動設定される。それを取得する。
ID acctID = acct.ID;
// この取引先に取引先責任者を追加する。
Contact con = new Contact(
    FirstName='Carol',
    LastName='Ruiz',
    Phone='(415)555-1212',
    Department='Wingo',
    AccountId=acctID);
insert con;
// 取引先責任者を持たない取引先を追加する
Account acct2 = new Account(
    Name='The SFDC Query Man',
    Phone='(310)555-1213',
    NumberOfEmployees=50,
    BillingCity='Los Angeles',
    Description='Expert in wing technologies.');
insert acct2;
```

> [!注意] サンプルデータの中身を把握しておく
>
> このあとの検索例は上記データを前提にします。
>
> - 取引先「**SFDC Computing**」… 電話 `(415)555-1212`
> - 取引先責任者「**Carol Ruiz**」… 部署 `Wingo`、電話 `(415)555-1212`
> - 取引先「**The SFDC Query Man**」… 説明 `Expert in wing technologies.`（取引先責任者なし）

---

## クエリエディターを使用する

開発者コンソールのクエリエディターでは SOSL を実行でき、Apex に追加する前のテストに適しています。使うときは前後の Apex コードなしで **SOSL ステートメントのみ**を入力します。

> [!手順] クエリエディターで SOSL を実行する
>
> **[Query Editor（クエリエディター）]** タブで次のコードを最初のボックスに貼り付け、**[Execute（実行）]** をクリックする。

```sql
FIND {Wingo} IN ALL FIELDS RETURNING Account(Name), Contact(FirstName,LastName,Department)
```

結果はオブジェクトごとのタブでグループ化されて表示されます。サンプルデータでは Wingo を値に持つのは取引先責任者 Carol Ruiz（部署）のみのため、これが返ります。

> [!ポイント] クエリの囲み方は実行環境で変わる（頻出）
>
> - **クエリエディターと API** … 検索クエリは **中括弧** `{ }` で囲む（例：`{Wingo}`）。
> - **Apex** … 検索クエリは **単一引用符** `' '` で囲む（例：`'Wingo'`）。
>
> 試験では「Apex で `{ }`」「エディターで `' '`」といった引っかけが出ます。「**Apex はシングルクオート、エディターは中括弧**」とセットで暗記しましょう。

---

## 基本的な SOSL 構文

SOSL では、検索するテキスト式・項目範囲・取得するオブジェクトと項目・行の選択条件を指定できます。Apex の基本構文は次のとおりです。

```apex
FIND 'SearchQuery' [IN SearchGroup] [RETURNING ObjectsAndFields]
```

クエリエディターと API では構文がわずかに異なります（クエリを中括弧で囲む）。

```sql
FIND {SearchQuery} [IN SearchGroup] [RETURNING ObjectsAndFields]
```

```text
   FIND  'SearchQuery'   [IN SearchGroup]   [RETURNING ObjectsAndFields]
    │         │                 │                      │
    │         │                 │                      └─ 何を返すか（省略可）
    │         │                 │                         オブジェクトと項目のリスト
    │         │                 └─ どの項目範囲を検索するか（省略可、既定=全項目）
    │         └─ 検索する単語／語句（必須）
    └─ SOSL の開始キーワード
```

### SearchQuery（検索文字列）

**SearchQuery** は検索するテキスト（単語または語句）です。論理演算子（AND、OR）と括弧でグループ化でき、ワイルドカード（`*`、`?`）も使えます。テキスト検索は大文字・小文字を区別しません。

> [!用語] ワイルドカード（`*` と `?`）
>
> 「任意の文字」を表す記号。
> - `*`（アスタリスク）… 検索語の途中・末尾の **0 文字以上**に一致。例：`wing*` は `wing`, `wings`, `wingo` に一致。
> - `?`（クエスチョン）… 検索語の途中・末尾の **ちょうど 1 文字**に一致。例：`jo?n` は `john`, `joan` に一致。

### SearchGroup（検索する項目範囲）

**SearchGroup** は省略可能で、検索する項目範囲を指定します。省略時はすべての項目です。

| SearchGroup | 検索対象の項目範囲 |
| --- | --- |
| `ALL FIELDS` | すべての項目（既定値） |
| `NAME FIELDS` | 名前に関する項目 |
| `EMAIL FIELDS` | メールアドレスの項目 |
| `PHONE FIELDS` | 電話番号の項目 |
| `SIDEBAR FIELDS` | サイドバー検索の対象項目 |

> [!用語] SearchGroup（検索グループ）
>
> 「項目のどの種類を検索対象にするか」の指定。たとえば `IN EMAIL FIELDS` ならメールアドレス項目だけを検索します。省略すると `ALL FIELDS`（全項目）です。

### ObjectsAndFields（返す情報）

**ObjectsAndFields** は省略可能で、検索結果で返す情報を指定します。1 つ以上の sObject と各項目、省略可能な絞り込み基準を指定できます。省略すると見つかったすべてのオブジェクトの ID が返ります。

> [!用語] RETURNING 句（リターニング句）
>
> 「どのオブジェクトの、どの項目を返すか」を指定する部分。例：`RETURNING Account(Name), Contact(FirstName,LastName)` は取引先から Name、取引先責任者から FirstName と LastName を返します。省略すると一致したレコードの **ID だけ**が返ります。

---

## 単語と語句

SearchQuery には 2 種類のテキストが含まれます。

> [!用語] 単語（Word）と語句（Phrase）
>
> - **単語** … `test` などの 1 語。スペース・句読点・文字から数字への変更などで区切られます。常に大文字・小文字は区別されません。
> - **語句** … 二重引用符で囲んだ単語とスペースのまとまり（`"john smith"` など）。論理演算子やグルーピング演算子と組み合わせて複雑なクエリを作れます。

> [!例] 単語と語句の違い
>
> - `john smith` … 「john」と「smith」の **2 つの単語**。両方が（順不同・別項目でも）含まれれば一致。
> - `"john smith"` … 「john smith」という **1 つの語句**。この並びでそろっている必要がある。

---

## 検索の例

次の表は「すべての項目で検索」した場合の、さまざまな検索文字列とその結果の例です。

| 検索文字列 | 説明 | 一致レコードおよび項目 |
| --- | --- | --- |
| `The Query` | The と Query の両方を含む項目を持つレコードが返る。語順は不問。 | 取引先：SFDC Query Man（名前項目が一致） |
| `Wingo OR Man` | OR 演算子。Wingo を含む、または Man を含むレコードが返る。 | 取引先責任者：Carol Ruiz、部署 `Wingo`／取引先：SFDC Query Man（名前項目が一致） |
| `1212` | 単語 1212 を含むレコードが返る。1212 はダッシュで区切られると単語扱いのため、`-1212` で終わる電話項目も一致。 | 取引先：SFDC Computing、電話 `(415)555-1212`／取引先責任者：Carol Ruiz、電話 `(415)555-1212` |
| `wing*` | ワイルドカード検索。wing で始まる項目を持つレコードが返る。 | 取引先責任者：Maria Ruiz、部署 `Wingo`／取引先：The SFDC Query Man、説明 `Expert in wing technologies.` |

> [!ポイント] 「単語の区切り」の感覚をつかむ
>
> `1212` の例のように、SOSL は文字列を**単語単位**に分解して検索します。`(415)555-1212` という電話番号も、ダッシュや括弧で区切られて `415`・`555`・`1212` という単語として扱われるため `1212` で一致します。完全一致が必要な SOQL とはこの点が大きく異なります。

---

## SOSL Apex の例

次は Apex で SOSL を実行する例です。変数 `soslFindClause` に OR で組み合わせた 2 単語の検索クエリを割り当て、SOSL では**先頭にコロンを付けて**（バインド）参照します。結果は **リストのリスト** で返り、`RETURNING` の順にオブジェクトが並びます。

> [!用語] バインド変数（`:` コロン）
>
> Apex のローカル変数を SOSL / SOQL の中で使う仕組み。`FIND :soslFindClause` のように変数名の前にコロン `:` を付けると、その時点の変数の値がクエリに差し込まれます。文字列を直接埋め込むより安全で読みやすくなります。

> [!用語] List&lt;List&lt;sObject&gt;&gt;（リストのリスト）
>
> SOSL の戻り値の型。外側のリストの各要素が「1 つのオブジェクト種別ぶんのレコードの配列」で、`RETURNING` で指定した順番に並びます。
> - `searchList[0]` … 1 番目に指定したオブジェクト（この例では Account）の配列。
> - `searchList[1]` … 2 番目に指定したオブジェクト（この例では Contact）の配列。

> [!手順] Apex で SOSL を実行する
>
> 開発者コンソールの **[Execute Anonymous（匿名実行）]** ウィンドウで次のスニペットを実行し、デバッグログですべてのレコードが返ったことを確認する。

```apex
String soslFindClause = 'Wingo OR SFDC';
List<List<sObject>> searchList = [FIND :soslFindClause IN ALL FIELDS
                    RETURNING Account(Name),Contact(FirstName,LastName,Department)];
Account[] searchAccounts = (Account[])searchList[0];   // index 0 = 1番目に指定した Account の配列
Contact[] searchContacts = (Contact[])searchList[1];   // index 1 = 2番目に指定した Contact の配列
System.debug('Found the following accounts.');
for (Account a : searchAccounts) {
    System.debug(a.Name);
}
System.debug('Found the following contacts.');
for (Contact c : searchContacts) {
    System.debug(c.LastName + ', ' + c.FirstName);
}
```

> [!ポイント] 結果の取り出し順を間違えない
>
> 結果配列のインデックスは `RETURNING` 句のオブジェクトの順番と一致します。上の例は `RETURNING Account(...), Contact(...)` の順なので、**`searchList[0]` が Account、`searchList[1]` が Contact** です。`(Account[])` のようにキャストする点も押さえましょう。

```text
 FIND :soslFindClause IN ALL FIELDS RETURNING Account(...), Contact(...)
                              │
                              ▼
                  List<List<sObject>> searchList
            ┌─────────────────────┴─────────────────────┐
            ▼                                            ▼
      searchList[0]                                searchList[1]
   ┌──────────────┐                            ┌──────────────┐
   │ Account[]    │                            │ Contact[]    │
   │ （取引先の配列）│                            │ （責任者の配列）│
   └──────────────┘                            └──────────────┘
```

---

## もうひとこと…（結果の絞り込み・並び替え・制限）

SOSL の結果は絞り込み・並び替え・制限ができます。複数 sObject を返せるため、これらの条件は **RETURNING 句内部の各 sObject 内** で適用します。

- **絞り込み（WHERE）**：例 `RETURNING Account(Name, Industry WHERE Industry='Apparel')` は業種 Apparel の取引先のみ返す。
- **並び替え（ORDER BY）**：例 `RETURNING Account(Name, Industry ORDER BY Name)` は取引先を名前で並び替える。
- **制限（LIMIT）**：例 `RETURNING Account(Name, Industry LIMIT 10)` は取引先を 10 件に制限。

> [!例] WHERE・ORDER BY・LIMIT を組み合わせる
>
> ```sql
> FIND {Acme} IN ALL FIELDS
> RETURNING Account(Name, Industry WHERE Industry='Apparel' ORDER BY Name LIMIT 10)
> ```
>
> 「Acme」を含む取引先のうち業種が Apparel のものを名前順に並べ、先頭 10 件だけ返します。これらの句は **各 sObject の括弧の中** に書くのがポイントです。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] SOSL のガバナ制限（暗記推奨）
>
> - **1 トランザクションあたりの SOSL クエリ発行回数：最大 20 回**（SOQL は 100 回なので混同に注意）。
> - **1 SOSL クエリで返せるレコード数：最大 2,000 行**。
> - 超えると実行時に `System.LimitException` が発生。ループ内で SOSL/SOQL を発行しない（バルク化）のがベストプラクティス。

> [!注意] 検索インデックスの遅延に注意
>
> SOSL は内部の**検索インデックス**を使うため、レコードの作成・更新直後は反映に**わずかなタイムラグ**が生じ、作りたてのレコードがすぐにはヒットしないことがあります。テストでは `Test.setFixedSearchResults()` で検索結果を固定するのが定石です。

> [!まとめ] この単元の要点整理
>
> - **SOSL** はテキスト検索言語。`FIND` で始まり、**複数オブジェクトを横断**して**単語一致**で検索する。
> - **SOQL** はクエリ言語。`SELECT` で始まり、**単一オブジェクト**を**完全一致**で取得する。
> - クエリの囲み：**Apex は `'シングルクオート'`、クエリエディター／API は `{中括弧}`**。
> - 結果は **`List<List<sObject>>`（リストのリスト）**。`searchList[0]` から `RETURNING` の順にオブジェクトが入る。
> - ガバナ制限：**SOSL は 20 クエリ／クエリあたり 2,000 行**。

---

## リソース

- SOQL および SOSL リファレンス

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：取引先責任者とリードを検索する Apex クラスを作成する
>
> 入力パラメーターに基づいて、取引先責任者（Contact）とリード（Lead）の両方を返す Apex クラスを作成します。名と姓が入力パラメーターと一致する取引先責任者とリードの両方を返してください。
>
> **設定値（正確にそのまま使うこと）**
> - Apex クラス名：`ContactAndLeadSearch`、通用範囲（アクセス修飾子）：`public`
> - メソッド：`searchContactsAndLeads` という **public static** メソッドを含める
> - メソッドは入力文字列をパラメーターとして受け入れる
> - 名と姓がその文字列と一致する取引先責任者またはリードを検索する
> - メソッドの戻り値のデータ型：`List<List<sObject>>`

> [!手順] Challenge を始める
>
> 1. 各自のハンズオン組織で実行する。**[起動]** をクリックして開始する。
> 2. 上記の設定値どおりに Apex クラスを作成し、**姓が `Smith` の取引先責任者・リードを用意してから**（SOSL は検索用にデータをインデックス化するため）**[Check Challenge]** を実行する。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めます。評価は英語データに対して行われるため、**英語の値のみ**をコピー＆ペーストします。不合格になった場合は、(1) [Locale（地域）] を [United States（米国）]、(2) [Language（言語）] を [English（英語）] に切り替えてから、(3) [Check Challenge（Challenge を確認）] をクリックすると通ることがあります。
