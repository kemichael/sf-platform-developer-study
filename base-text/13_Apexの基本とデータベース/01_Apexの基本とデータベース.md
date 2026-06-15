# Apex 入門

## 学習の目的

この単元を完了すると、次のことができるようになります。

- Apex プログラミング言語の主要な機能を説明する。
- Apex クラスを保存し、匿名 Apex を使用してメソッドをコールする。
- 開発者コンソールを使用してデバッグログを調査する。

> [!ポイント] この単元のゴール
>
> 「Apex とは何か（特徴）」「クラスを保存して匿名 Apex で実行する流れ」「開発者コンソールでデバッグログを読む方法」の3点が試験対策の中心。Java に似た構文・サーバー上で動く・マルチテナントの制限がある、というキーワードを意識しましょう。

---

## Apex とは?

**Apex** は Java に似た構文を使い、データベースのストアドプロシージャーのように動作するプログラミング言語です。ボタンのクリックやレコード更新などのシステムイベントにロジックを追加できます。

> [!用語] Apex（エイペックス）
>
> Salesforce 専用のプログラミング言語。Java に似た書き方をしますが、コードは **Salesforce のサーバー上に保存・コンパイル・実行** されます。標準機能では実現できない複雑な業務ロジックの追加に使い、DB 内で保存・実行される点でストアドプロシージャーに似ています。

言語としての主な特徴は次のとおりです。

| 特徴 | 内容 |
| --- | --- |
| **ホスティング** | サーバー（Salesforce Platform）上で保存・コンパイル・実行される。 |
| **オブジェクト指向** | クラス、インターフェース、継承をサポート。 |
| **強い型付け** | コンパイル時にオブジェクトへの参照を検証する。 |
| **マルチテナント型** | 共有リソースを独占しないよう制限を適用し、暴走コードから保護する。 |
| **データベースとの統合** | レコードと項目に直接アクセスでき、操作用ステートメントとクエリ言語を提供。 |
| **データ指向** | トランザクションアクセスを提供し、ロールバックが可能。 |
| **テストが容易** | 単体テストとコードカバー率のサポートが組み込み。アップグレード前に Salesforce が全テストを実行。 |
| **バージョン管理** | 異なる API バージョンに対して保存できる。 |

> [!用語] 強い型付け（静的型付け）
>
> 変数や項目の型を明確に決め、**コンパイル時（実行前）に型の整合性をチェックする** 仕組み。型の誤りを早く発見できます。

> [!用語] マルチテナント（Multi-Tenant）
>
> 1つの巨大なプラットフォームを多数の企業（テナント）が共有して使う方式。1人が共有リソースを使いすぎないよう、Salesforce は **ガバナ制限**（後述）という上限を設けています。

> [!注意] Apex は大文字・小文字を区別しない
>
> `Integer` と `integer` は同じものとして扱われます。ただし可読性のため、クラス名は大文字始まり・変数名は小文字始まりなどの慣習に沿うのが一般的です。

---

## Apex 言語の特長

ほかのオブジェクト指向言語と同様に次をサポートします。

- クラス、インターフェース、プロパティ、コレクション（List / Set / Map）、式、変数、定数、配列表記。
- 条件分岐（if-then-else）とフロー制御（for / while ループ）。

ほかの言語と**異なり**、次もサポートします。

- クラウドでの保管・コンパイル・実行、トリガー（DB システムのトリガーに類似）。
- 直接データベースコール用のステートメントと、データ照会・検索用のクエリ言語。
- トランザクションとロールバック、カスタムコードのバージョン管理。
- `global` アクセス修飾子（名前空間とアプリケーション全体でアクセス可能）。

> [!用語] アクセス修飾子（Access Modifier）
>
> メソッドや変数を「どこから呼び出せるか」を決めるキーワード。`private`（同じクラス内のみ）→ `public`（同じアプリケーション／名前空間内）→ `global`（名前空間をまたいで全体）の順に公開範囲が広がります。

### 開発ツール

VS Code 向け Salesforce 拡張機能を使い、クライアント PC で Apex を記述・デバッグできます。Salesforce UI 上の**開発者コンソール**からブラウザーで直接記述・デバッグもできます。

> [!用語] 開発者コンソール（Developer Console）
>
> ブラウザー上で Apex の作成・保存・実行やデバッグログ確認ができる Salesforce 標準ツール。VS Code なしで Apex を試せ、この単元のハンズオンでも使います。

---

## データ型の概要

Apex は Salesforce 固有の sObject を含む、さまざまなデータ型をサポートします。

- `Integer`、`Double`、`Long`、`Date`、`Datetime`、`String`、`ID`、`Boolean` などの**プリミティブ**。
- **sObject**（汎用 sObject または `Account`、`Contact`、`MyCustomObject__c` などの特定 sObject）。
- **コレクション**（List / Set / Map）、**列挙型**、ユーザー定義／システム提供の Apex クラス。

> [!用語] プリミティブ型（Primitive Type）
>
> 数値・文字列・真偽値・日付など、これ以上分解できない基本的なデータ型。代表例は次のとおり。

| 型 | 用途・例 |
| --- | --- |
| `Integer` | 整数（例：`10`、`-3`） |
| `Double` | 小数を含む数値（例：`3.14`） |
| `Long` | より大きな整数 |
| `String` | 文字列（例：`'Hello'`） |
| `Boolean` | 真偽値（`true` / `false`） |
| `Date` / `Datetime` | 日付（時刻なし）／ 日付＋時刻 |
| `ID` | レコードを一意に識別する 15 桁／18 桁の ID |

> [!用語] sObject（エスオブジェクト）
>
> Salesforce のレコードを Apex で表す特別なデータ型。「Salesforce Object」の略で、`Account` や `Contact`、`MyCustomObject__c` などの1レコードを変数として扱えます。詳しくは後の単元で学習します。

> [!用語] コレクション（Collection）
>
> 複数の値を1つの変数でまとめて扱う仕組み。Apex には3種類あります。

| コレクション | 特徴 | イメージ |
| --- | --- | --- |
| **List（リスト）** | 同じ型の値を**順序付き**で並べる。重複可。 | 番号付きの行列 |
| **Set（セット）** | **重複を許さない**値の集まり。順序は保証されない。 | 重複なしの袋 |
| **Map（対応付け）** | **キーと値のペア**で管理する。 | 辞書（見出し語→意味） |

---

## Apex コレクション: List

リストは同じ型のデータを順序付けて保持するコレクションで、要素には先頭から `0`、`1`…とインデックスが振られます。次の2つの宣言は同等です。`List<String>` と `String[]`（配列表記）はどちらも「文字列のリスト」を表す**同じもの**で、好みで選べます。

```apex
List<String> colors = new List<String>();
```

```apex
String[] colors = new List<String>();
```

`add()` で要素を追加できます。既存要素は角括弧の配列表記で参照できますが、配列表記では追加できません。

```apex
// リストを作成すると同時に要素を追加する
List<String> colors = new List<String> { 'red', 'green', 'blue' };
// 作成した後で要素を追加する
List<String> moreColors = new List<String>();
moreColors.add('orange');
moreColors.add('purple');
```

要素は角括弧（配列表記）または `get()` で読み込めます。次は要素の取得と反復処理の例です。

```apex
// リストから要素を取得する
String color1 = moreColors.get(0);
String color2 = moreColors[0];
System.assertEquals(color1, color2);
// リストを反復処理して要素を読み込む
System.debug('Print out the colors in moreColors:');
for(String color : moreColors) {
    System.debug(color);
}
```

> [!ポイント] インデックスは 0 から始まる
>
> リストの**最初の要素のインデックスは 0**。`moreColors.get(0)` と `moreColors[0]` はどちらも先頭要素を取り出します。「最初は 0」はハンズオン Challenge でも問われます。なお `for(String color : moreColors)` のような **for ループ**はコレクションの要素を 1 件ずつ順番に取り出して処理します。

### 高度な操作

Apex は **Set** と **Map** もサポートします。詳細は『Apex 開発者ガイド』の「Collections」を参照してください。

---

## Apex クラス

Apex クラスの利点はコードの再利用です。クラスメソッドはトリガーやほかのクラスからコールできます。以降では、サンプルクラスを組織に保存し、メールを送信してデバッグログを調べます。

> [!用語] クラス（Class）とメソッド（Method）
>
> **クラス**は関連するデータと処理をひとまとめにした「設計図」。**メソッド**はその中の処理のかたまりで、名前を付けて何度でも呼び出せます。一度作ればトリガーやほかのクラスから繰り返し利用できます。

### Apex クラスを保存する

> [!手順] EmailManager クラスを開発者コンソールに保存する
>
> 1. **開発者コンソール**を開く（自分の名前の下またはクイックアクセスメニュー）。
> 2. **[File] | [New] | [Apex Class]** をクリックし、クラス名に「EmailManager」と入力して **[OK]**。
> 3. デフォルトのクラス本文を下のサンプルで置き換える。
> 4. **[File] | [Save]** をクリックする。

`EmailManager` には、メールを送信する公開メソッド `sendMail()` と、結果を検査する非公開ヘルパーメソッド `inspectResults()`（`sendMail()` から呼ばれる）が含まれます。

```apex
public class EmailManager {
    // 公開メソッド
    public void sendMail(String address, String subject, String body) {
        // メールメッセージオブジェクトを作成する
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        String[] toAddresses = new String[] {address};
        mail.setToAddresses(toAddresses);
        mail.setSubject(subject);
        mail.setPlainTextBody(body);
        // 組み込みの sendEmail メソッドに渡す
        Messaging.SendEmailResult[] results = Messaging.sendEmail(
                                 new Messaging.SingleEmailMessage[] { mail });
        // 結果を検査するヘルパーメソッドを呼び出す
        inspectResults(results);
    }
    // ヘルパーメソッド（結果のリストを反復して成否を検査する）
    private static Boolean inspectResults(Messaging.SendEmailResult[] results) {
        Boolean sendResult = true;
        for (Messaging.SendEmailResult res : results) {
            if (res.isSuccess()) {
                System.debug('Email sent successfully');
            }
            else {
                sendResult = false;
                System.debug('The following errors occurred: ' + res.getErrors());
            }
        }
        return sendResult;
    }
}
```

> [!注意] 構文エラーが出たとき
>
> 構文が正しくない場合は **[Problems]** タブにエラーが表示されます。クラスを保存すると Salesforce によってコンパイルされます。

> [!用語] public / private とカプセル化
>
> `public`（例：`sendMail()`）は**クラスの外から呼び出せ**、`private`（例：`inspectResults()`）は**そのクラスの中からしか呼び出せません**。外部に見せる必要のない補助処理は `private` で隠す——関連データと処理をまとめ内部実装を隠すこの考え方を**カプセル化**といいます。

---

### メソッドをコールしてメールを送信する

公開メソッドを**匿名 Apex 実行**で呼び出します。匿名 Apex はコード行をその場で実行でき、機能テストに便利です。実行するとデバッグログが生成されます。

> [!用語] 匿名 Apex（Anonymous Apex）
>
> クラスとして保存せず、その場で1回だけ実行できる Apex コード。「実行匿名ウィンドウ」に数行貼って実行するだけで動かせます。トリガーなど、ほかの呼び出し方法もあります（別モジュールで学習）。

> [!手順] 匿名 Apex でメールを送信する
>
> 1. **[Debug] | [Open Execute Anonymous Window]** をクリックする。
> 2. 次のコードを入力する。`'Your email address'` を自分のメールアドレスに置き換える。
> 3. **[Execute]** をクリックする。
> 4. 受信箱にメールが届いているか確認する。

```apex
EmailManager em = new EmailManager();
em.sendMail('Your email address', 'Trailhead Tutorial', '123 body');
```

> [!用語] インスタンス（Instance）と `new`
>
> クラス（設計図）から実際に作られた「実体」がインスタンス。`new EmailManager()` で生成し、変数 `em` に入れます。1行目で `em` を作り、2行目でその `em.sendMail()` に「宛先・件名・本文」を渡す——これがインスタンスメソッドの使い方です。

---

### デバッグログを調べる

Apex メソッドの実行はデバッグログに記録され、`System.debug()` で独自メッセージも書き出せます。`inspectResults()` は送信の成否を `System.debug()` で出力するので、ログで確認できます。

> [!用語] デバッグログと System.debug()
>
> **デバッグログ**は Apex の実行内容を記録した履歴で、原因調査（デバッグ）に欠かせません。**`System.debug('メッセージ')`** はメッセージや変数値をログに書き出す組み込みメソッドで、途中経過を確認する最も基本的な手段です。

> [!手順] デバッグログを絞り込んで確認する
>
> 1. **[Logs]** タブをクリックし、最新のログをダブルクリックする。
> 2. **[Debug Only]** を選択して、`System.debug()` のログ行のみに絞り込む。

メールがエラーなく送信されると、絞り込んだログに次が表示されます。

```text
DEBUG|Email sent successfully
```

> [!注意] キーワードでも絞り込める
>
> **[Filter]** 項目にキーワードを入力するなどでも絞り込めます。詳細は「ログインスペクター」を参照してください。

---

### 静的メソッドをコールする

`sendMail()` はクラスメンバー変数を使わないため、インスタンスメソッドである必要はありません。`static` を付けて**静的メソッド**にすると、インスタンスを作らずクラス名から直接コールできます。

> [!用語] 静的メソッド（static）とインスタンスメソッド
>
> **インスタンスメソッド**は先に `new` でインスタンスを作ってから呼びます（`em.sendMail(...)`）。**静的メソッド**は `static` を付け、**インスタンスを作らずクラス名から直接**呼べます（`EmailManager.sendMail(...)`）。メンバー変数を使わない処理は静的にすると `new` の手間が省けます。

> [!手順] sendMail() を静的メソッドに変更して実行する
>
> 1. `EmailManager` クラスの `sendMail()` 定義の最初の行に `static` を追加する。
> 2. **[File] | [Save]** で保存する。
> 3. **[Execute Anonymous]** で、クラス名から静的メソッドを呼ぶようステートメントを変更する。
> 4. **[Execute]** をクリックして実行し、メールとデバッグログをチェックする。

メソッド定義の変更（`static` の追加）:

```apex
public static void sendMail(String address, String subject, String body) {
```

匿名 Apex でのコール（クラス名から直接）:

```apex
EmailManager.sendMail('Your email address', 'Trailhead Tutorial', '123 body');
```

---

## 試験対策：押さえておきたい追加ポイント

> [!用語] ガバナ制限（Governor Limits）
>
> マルチテナント環境で、1人のテナントのコードが共有リソースを使いすぎないよう Salesforce が課す**上限値**。1トランザクションあたりの SOQL クエリ数や DML 件数、CPU 時間などに制限があり、超えると実行時エラーになります。Apex で最も重要な概念のひとつです。

> [!ポイント] 代表的なガバナ制限（同期トランザクションの目安）
>
> 数値の暗記までは不要なことが多いですが、「**ループの中でクエリや更新をしない（バルク化する）**」という考え方は頻出です。

| 項目 | 同期での上限（目安） |
| --- | --- |
| 発行できる SOQL クエリ数 | 100 |
| SOQL で取得できるレコード総数 | 50,000 |
| 発行できる DML ステートメント数 | 150 |
| 発行できる SOSL クエリ数 | 20 |
| CPU 時間 | 10,000 ミリ秒 |

> [!ポイント] Apex のベストプラクティス（試験頻出）
>
> - **バルク化**：1件ずつでなく**複数レコードをまとめて処理**できるように書く。
> - **ループ内で SOQL / DML を呼ばない**：すぐ制限に達する。クエリは**ループの外**でまとめる。
> - **コードカバー率 75% 以上**：本番デプロイには Apex 全体のテストカバー率が **75% 以上**必要。
> - **`System.assert` で結果を検証**：テストでは想定どおりの結果を必ずアサートする。
> - **ハードコーディングを避ける**：レコード ID などをコードに直接書かない。
> - **用語整理**：匿名 Apex は保存されずその場限りで実行。`static` はクラス名で直接呼べる。「強い型付け・マルチテナント・Java に似た構文・サーバー上で実行」は Apex の特徴としてセットで覚える。

---

## リソース

- Apex 開発者ガイド: Apex の概要
- Apex 開発者ガイド: ループ
- Trailhead: 開発者コンソールの基礎

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：文字列のリストを返すメソッドを含む Apex クラスを作成する
>
> この単元は各自のハンズオン組織で実行します。**[起動]** をクリックして開始します。
>
> 形式が設定された文字列のリストを返すメソッドを含む Apex クラスを作成します。リストの長さは整数パラメーターによって決まります。
>
> **要件**
>
> - Apex クラスは **`StringListTest`** という名前で、通用範囲を **`public`** にする。
> - **`generateStringList`** という **public static** メソッドを含める。
> - `generateStringList` は**文字列のリストを返す**。
> - 入力 **`Integer`** をパラメーターとして受け入れ、これが返される文字列の数を決定する。
> - リスト内の各要素は **`Test n`** という形式にする（**`n`** は現在のインデックス）。たとえば入力が 3 なら出力は **`['Test 0', 'Test 1', 'Test 2']`** になる。
> - リスト内の最初の要素のインデックス位置は常に **`0`**。

> [!ポイント] Challenge のヒント
>
> - メソッド宣言は `public static List<String> generateStringList(Integer n)` のような形。
> - 空の `List<String>` を用意し、`for` を `0` から `n` 未満まで回して `'Test ' + i` を `add()` する。
> - 最初のインデックスは **0**（`'Test 0'` から始まる）。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照しながら進めます。評価は**英語データを対象**に行われるため、**英語の値のみ**をコピーして貼り付けます。不合格の場合は、(1) [Locale] を [United States]、(2) [Language] を [English] に切り替えてから、(3) **[Check Challenge]** をクリックしてみてください。
