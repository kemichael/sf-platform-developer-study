# Apex アクションを作成する準備をしましょう

## 学習の目的

この単元を完了すると、次のことができるようになります。

- アクションを構築できるように組織を準備する。
- Apex がアクションに対応していることを確認する。

> [!ポイント] この単元のゴール
>
> AI エージェント（Agentforce）に新しい能力を追加する第一歩が **エージェントアクション** です。この単元では、(1) アクションを作るための組織機能の有効化、(2) 既存 Apex クラスを **`@InvocableMethod`** でエージェントから呼び出せるようにする仕組みを学びます。

---

## エージェントアクションとは何か

エージェントアクションとは、AI エージェントが**ユーザーの依頼を達成するために実行できる具体的な処理**です。「来週月曜の天気を教えて」と頼まれたとき、エージェントは文章を生成するだけでなく、**実際に天気データを取得する処理**を呼び出して回答できます。この呼び出せる処理がアクションです。

> [!用語] エージェントアクション（Agent Action）
>
> AI エージェント（Agentforce）が実行できる「機能の部品」。標準アクション（レコード検索など）のほか、フローや **Apex** によるカスタムアクションを作れます。エージェントは会話内容から「どのアクションを使うべきか」を AI が推論して選び、実行します。Agentforce は、Salesforce 上で AI エージェントを構築・運用するプラットフォームです。

> [!例] アクションがあると何が変わる？
>
> - **アクションなし**：「Coral Cloud の天気は？」に一般論しか答えられない。
> - **アクションあり**：`WeatherService`（天気取得 Apex）を呼び出し、**実際の気温データ**で具体的に回答できる。

---

## このモジュールのストーリー

Coral Cloud Resorts は基本的に晴れていますが、悪天候の日もあります。どんな天候でもゲストが満喫できるよう、開発チームは宿泊予定日の天気を AI エージェントが答えられるようにしたいと考えています。材料は、天気予報 API から気温を取得する既存の Apex クラス `WeatherService`。これをエージェントから呼び出せる「アクション」に仕立てるのがゴールです。

---

## Agentforce 搭載の Developer Edition 組織にサインアップする

このバッジの Challenge には、Agentforce とサンプルデータ（Coral Cloud のデータや `WeatherService` クラス）を搭載した**専用の Developer Edition 組織**が必要です。モジュールのリンクからサインアップし、組織を Trailhead に接続してください。

> [!注意] 専用組織を必ず使うこと
>
> Developer Edition 組織は開発・学習用に無料で使える Salesforce 環境です。このバッジは Agentforce とサンプルデータが前提のため、**指定された専用 Developer Edition 組織以外**では Apex クラスやエージェントが存在せず、Challenge が成功しません。通常の Trailhead Playground では通らないことがあります。

> [!手順] Developer Edition 組織にサインアップして接続する
>
> 1. **Agentforce を搭載した無料の Developer Edition 組織にサインアップ**します。
> 2. **[Email (メール)]** に有効なメールアドレスを入力します。
> 3. **[Username (ユーザー名)]** に、メールアドレス形式の一意のユーザー名（例: `yourname@example.com`）を入力します（有効なメールアカウントである必要はありません）。
> 4. **[Sign me up (サインアップ)]** をクリックします。
> 5. アクティベーションメール（数分かかる場合あり）を開いて **[Verify Account (アカウントを確認)]** をクリックします。
> 6. パスワードと確認用の質問を設定して登録を完了します。ユーザー名・パスワード・ログイン URL は安全な場所に保存します。
> 7. Trailhead にログイン後、このページ下部の「Challenge」セクションで組織名をクリックし、**[組織を接続]** をクリックします。
> 8. ログイン画面で Developer Edition のユーザー名・パスワードを入力し、**[Allow (許可)]** → **[はい! 保存します。]** をクリックします。

---

## エージェント用に組織を準備する

エージェントをカスタマイズする前に、必要な組織機能を有効にします。

> [!手順] Agentforce Studio を有効化する
>
> 1. **[Setup (設定)]** をクリックします。
> 2. **[Quick Find (クイック検索)]** で **[Salesforce Go]** を検索して選択します。
> 3. **[Search features... (機能を検索...)]** で **[Agentforce Studio (Agentforce スタジオ)]** を検索して選択します。
> 4. **[使用開始]** をクリックします。
> 5. **[Turn On (有効化)]** → **[Confirm (確認)]** をクリックします。

> [!用語] Agentforce Studio（エージェントフォース スタジオ）
>
> Agentforce のエージェントやアクションを作成・編集・テストする管理画面。次の単元で使う **Agentforce Builder** もこの Studio の一部です。**有効化しないと**後の手順でカスタマイズ画面が開けないため、必ず先に有効化しておきましょう。

---

## すでにある機能を利用してエージェントアクションを構築する

Salesforce で AI エージェントを構築する大きな利点は、**組織にすでに備わっている機能を活用できる**ことです。Coral Cloud には、外部 API からリゾート所在地の天候を取得する `WeatherService` Apex クラスが既にあります。

> [!用語] Apex / HTTP コールアウト
>
> **Apex** は Salesforce 専用のプログラミング言語。Java に似た構文で、データ操作（DML）・検索（SOQL）・外部 API 呼び出しなどをサーバー側で実行します。**HTTP コールアウト**は Apex から外部の Web サービス（API）へ HTTP 要求を送り応答を受け取る仕組み。`WeatherService` は天気予報 API にコールアウトして気温データを取得します。

次の `WeatherService` クラスは、指定日付の天候情報を外部 API から取得します。

```apex
public with sharing class WeatherService {
    /**
     * Gets the weather at Coral Cloud Resorts for the provided date
     */
    public static Weather getResortWeather(Datetime dateToCheck) {
        // 指定日付を「今年」に補正する
        Integer currentYear = Date.today().year();
        Integer yearDelta = currentYear - dateToCheck.year();
        dateToCheck = dateToCheck.addYears(yearDelta);
        // API 用の日付文字列（ISO）と説明文用の日付文字列を作成
        String isoDate = dateToCheck.format('yyyy-MM-dd');
        String dateString = dateToCheck.format('MMMM d');
        // 外部天気 API への HTTP 要求を準備（callout: で名前付き資格情報を使用）
        HttpRequest req = new HttpRequest();
        req.setEndpoint(
            'callout:Weather_Endpoint/weather?lat=37.789782764570425&lon=-122.39723702244089&date=' +
            isoDate
        );
        req.setMethod('GET');
        // API を呼び出して応答を受け取る
        Http http = new Http();
        HttpResponse res = http.send(req);
        // 200（成功）以外なら例外をスロー
        if (res.getStatusCode() != 200) {
            throw new CalloutException('Bad response: ' + res);
        }
        // 応答 JSON を解析し、1日分の気温リストを取得
        String body = res.getBody();
        WeatherApiResponse weatherResponse = (WeatherApiResponse) JSON.deserialize(
            body,
            WeatherAPIResponse.class
        );
        List<Decimal> temperatures = new List<Decimal>();
        for (TemperatureWrapper item : weatherResponse.weather) {
            if (item.temperature != null) {
                temperatures.add(item.temperature);
            }
        }
        // 昇順ソートして最小値・最大値を取得
        temperatures.sort();
        Decimal minTempC = temperatures[0];
        Decimal maxTempC = temperatures[temperatures.size() - 1];
        // 摂氏から華氏へ変換
        Decimal minTempF = toFahrenheit(minTempC);
        Decimal maxTempF = toFahrenheit(maxTempC);
        // 読みやすい説明文を組み立てる
        String description =
            'On ' +
            dateString +
            ', temperature should be between ' +
            minTempC +
            '°C (' +
            minTempF +
            '°F) and ' +
            maxTempC +
            '°C (' +
            maxTempF +
            '°F) at Coral Cloud Resorts.';
        // 天候情報を Weather オブジェクトに詰めて返す
        Weather weather = new Weather();
        weather.minTemperatureC = minTempC;
        weather.minTemperatureF = minTempF;
        weather.maxTemperatureC = maxTempC;
        weather.maxTemperatureF = maxTempF;
        weather.description = description;
        return weather;
    }
    // 摂氏を華氏に変換するヘルパー
    private static Decimal toFahrenheit(Decimal celsius) {
        return (celsius * 9 / 5 + 32).setScale(1);
    }
    // API 応答（JSON）をマッピングする内部クラス
    private class WeatherApiResponse {
        public List<TemperatureWrapper> weather;
    }
    private class TemperatureWrapper {
        public Decimal temperature;
    }
    // 呼び出し元に返す天候情報をまとめるクラス
    public class Weather {
        public Decimal minTemperatureC;
        public Decimal minTemperatureF;
        public Decimal maxTemperatureC;
        public Decimal maxTemperatureF;
        public String description;
    }
}
```

このクラスは Agentforce ビルダーからそのままでは使えません。ベストプラクティスは、元の `WeatherService` を書き換えず、**それを呼び出す新しい Apex クラスを作って `@InvocableMethod` に設定する**ことです。

> [!用語] アノテーション（Annotation）
>
> Apex のメソッドや変数の前に `@` を付ける「目印」。プラットフォームに「この要素には特別な意味がある」と伝えます。`@InvocableMethod` を付けると、そのメソッドはフローや Agentforce から呼び出せる対象として認識されます。

> [!ポイント] なぜ「ラッパークラス」を新しく作るのか
>
> 元の `WeatherService` を書き換えず、**それを呼び出すだけの新しいクラス（ラッパー）に `@InvocableMethod` を付ける**のがベストプラクティスです。
> - 元クラスのロジックを汚さず、**責務を分離**できる。
> - `@InvocableMethod` を 1 つ付けるだけで、**フロー（宣言型）・外部アプリ（REST）・Agentforce** のすべてから同じ Apex を再利用できる。
> - アクション用の入力/出力の形を、エージェント向けに整えられる。

---

## 呼び出し可能なメソッド（InvocableMethod）を確認する

Coral Cloud チームはすでに `WeatherService` を呼び出す Apex クラス `CheckWeather` を用意しています。`@InvocableMethod` と `@InvocableVariable` の実装を確認しましょう。

```apex
public with sharing class CheckWeather {
    // このメソッドをエージェント/フローから呼び出せる「アクション」として公開する
    @InvocableMethod(
        label='Check Weather'
        description='Check weather at Coral Cloud Resorts at a specific date'
    )
    public static List<WeatherResponse> getWeather(
        List<WeatherRequest> requests
    ) {
        // 入力リクエストから、天気を調べたい日付を取り出す
        Datetime dateToCheck = (Datetime) requests[0].dateToCheck;
        // 既存の WeatherService を呼び出して天候情報を取得
        WeatherService.Weather weather = WeatherService.getResortWeather(
            dateToCheck
        );
        // エージェントに返すレスポンスを組み立てる
        WeatherResponse response = new WeatherResponse();
        response.minTemperature = weather.minTemperatureC;
        response.maxTemperature = weather.maxTemperatureC;
        response.temperatureDescription =
            'Temperatures will be between ' +
            weather.minTemperatureC +
            '°C (' +
            weather.minTemperatureF +
            '°F) and ' +
            weather.maxTemperatureC +
            '°C (' +
            weather.maxTemperatureF +
            '°F) at Coral Cloud.';
        // リストで返す（InvocableMethod の戻り値は必ず List）
        return new List<WeatherResponse>{ response };
    }
    // アクションの「入力」を定義するクラス
    public class WeatherRequest {
        @InvocableVariable(
            required=true
            description='Date for which we want to check the temperature. The variable needs to be an Apex Date type with format yyyy-MM-dd.'
        )
        public Date dateToCheck;
    }
    // アクションの「出力」を定義するクラス
    public class WeatherResponse {
        @InvocableVariable(
            description='Minimum temperature in Celsius at Coral Cloud Resorts location for the provided date'
        )
        public Decimal minTemperature;
        @InvocableVariable(
            description='Maximum temperature in Celsius at Coral Cloud Resorts location for the provided date'
        )
        public Decimal maxTemperature;
        @InvocableVariable(
            description='Description of temperatures at Coral Cloud Resorts location for the provided date'
        )
        public String temperatureDescription;
    }
}
```

> [!用語] `@InvocableMethod` / `@InvocableVariable`
>
> **`@InvocableMethod`** を付けたメソッドは、フロー・REST・Agentforce から呼び出せる「アクション」になります。シグネチャは `public static`、引数は **List 型を 1 つだけ**、戻り値も **List 型**（または `void`）。`label` と `description` で表示名と説明を指定します。
> **`@InvocableVariable`** はリクエスト/レスポンスのフィールドに付け、その変数を**入力または出力**にします。`required=true` で入力必須、`description` で説明（指示）を設定できます。

### 処理の流れを図で理解する

エージェントが `CheckWeather` アクションを実行したときのデータの流れです。

```text
  ユーザー「来週月曜の天気は？」
            │
            ▼
   ┌────────────────────────┐
   │ Agentforce（AI が推論） │  ← どのアクションを使うか判断
   └───────────┬────────────┘
               │ 日付を WeatherRequest に詰める（入力）
               ▼
   ┌────────────────────────────────────┐
   │ CheckWeather.getWeather             │  @InvocableMethod
   │  入力: List<WeatherRequest>         │
   └───────────┬────────────────────────┘
               │ WeatherService を呼び出す
               ▼
   ┌────────────────────────────────────┐
   │ WeatherService.getResortWeather     │
   │  外部天気 API に HTTP コールアウト   │
   └───────────┬────────────────────────┘
               │ 気温データを返す
               ▼
   ┌────────────────────────────────────┐
   │ WeatherResponse（出力）             │  @InvocableVariable
   │  minTemperature / maxTemperature /  │
   │  temperatureDescription             │
   └───────────┬────────────────────────┘
               │
               ▼
     エージェントが回答文を生成してユーザーに返す
```

---

## アノテーションのパラメーターを読み解く

`getWeather` の `@InvocableMethod` には 2 つのパラメーターがあり、どちらもエージェントアクション作成で使われます。

| パラメーター | 役割 | エージェントアクションでの表示 |
| --- | --- | --- |
| `label` | アクションの表示名 | エージェントアクションの**表示ラベル** |
| `description` | アクションが何をするかの説明 | エージェントアクションの**指示（instruction）** |

`WeatherRequest`（入力）の `dateToCheck` は `required=true` のため **[Require Input (入力が必要)]** がデフォルトでオンになり、`description` が入力指示、型 `Date` が入力データ型として自動設定されます。`WeatherResponse`（出力）の 3 変数は、各 `description` が出力指示、各データ型が出力表示に使われます（`String` は「テキスト」扱い）。

| 出力変数 | データ型 | 役割 | description（指示）の内容 |
| --- | --- | --- | --- |
| `minTemperature` | `Decimal` | 出力 | 指定日の最低気温（摂氏） |
| `maxTemperature` | `Decimal` | 出力 | 指定日の最高気温（摂氏） |
| `temperatureDescription` | `String` | 出力 | 指定日の気温の説明文（テキスト） |

> [!ポイント] Apex のメタ情報がそのままアクションに引き継がれる
>
> **Apex 側のアノテーション情報（`required`・`description`・データ型）が、エージェントアクション作成画面に自動で引き継がれます。** 画面で一から入力し直す必要はありません。だからこそ Apex を書く段階で `description` を丁寧に書くことが大切です。`description` は AI がそのアクションをいつ・どう使うかを判断する材料になるため、曖昧だと AI が適切に選べません。

---

## 権限の設定

Apex ファイルにアクセスするには適切な権限が必要です。このバッジのカスタム Developer 組織ではこのステップは完了済みで、呼び出し可能なメソッドを含む Apex クラスへのアクセス権が**権限セット**（オブジェクト・項目・Apex クラスへのアクセス権をまとめて付与する仕組み）を通して AI エージェントに付与されています。

> [!注意] アクションが動かないときの定番の原因
>
> 「アクションを作ってエージェントに追加したのに動かない」場合、**Apex クラスへのアクセス権限が権限セットで付与されていない**ことが非常に多いです。エージェントは権限のない Apex クラスをプラン作成時に考慮できません（このバッジの専用組織では設定済みです）。

---

## 試験対策：押さえておきたい追加ポイント

> [!ポイント] `@InvocableMethod` / `@InvocableVariable` のルール（頻出）
>
> `@InvocableMethod`
> - メソッドは **`public`（または `global`）かつ `static`**。
> - 引数は **List 型を 1 つだけ**、戻り値は **List 型** または `void`。
> - 1 つのクラスに付けられるのは **1 メソッドだけ**。一括処理（バルク）前提。
>
> `@InvocableVariable`
> - 入力/出力に使う変数に付ける。**`public` である必要**がある。
> - `required=true` で入力必須、`label` で表示名、`description` で説明を指定。
> - 標準/カスタムオブジェクト・プリミティブ型などを扱える。

> [!ポイント] エージェントアクションを構築する 3 つの前提
>
> 1. **機能の有効化**：Agentforce Studio が組織で有効。
> 2. **`@InvocableMethod` 化**：Apex が呼び出し可能なメソッドとして公開済み。
> 3. **権限の付与**：エージェントが Apex クラスにアクセスできる権限を持つ。

---

## リソース

- Apex 開発者ガイド: InvocableMethod Annotation（InvocableMethod アノテーション）
- Apex 開発者ガイド: InvocableVariable Annotation（InvocableVariable アノテーション）
- Salesforce ヘルプ: Agentforce および Einstein 生成 AI
- Salesforce ヘルプ: エージェントアクションの手順のベストプラクティス

---

## ハンズオン Challenge（+500 ポイント）

> [!まとめ] あなたの Challenge：準備を始めましょう
>
> この単元は各自のハンズオン組織で実行します。**[起動]** をクリックして開始するか、組織の名前をクリックして別の組織を選びます。
>
> **採点対象**
> - この単元の設定ステップを完了してください。
> - **Einstein が有効**になっていること。
> - **Agentforce が有効**になっていること。
> - **Agentforce（デフォルト）エージェントが有効**になっていること。

> [!注意] 日本語環境で受講する場合
>
> Challenge は日本語の Trailhead Playground で開始し、かっこ内の翻訳を参照して進めます。評価は英語データを対象に行われるため、**英語の値のみ**をコピーして貼り付けます。不合格だった場合は、(1) [Locale (地域)] を [United States (米国)]、(2) [Language (言語)] を [English (英語)] に切り替えてから、(3) [Check Challenge (Challenge を確認)] をクリックすると通ることがあります。
