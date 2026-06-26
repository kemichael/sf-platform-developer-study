/*
 * 模擬試験データのパーサー
 *
 * Google ドキュメントから取得したテキスト（JSON: {fileContent}）を読み込み、
 * 「3 セット × 60 問」の構造化データ build/exam-data.json を生成する。
 *
 * ドキュメントには 2 種類の記法が混在する：
 *   - セット1: `### **問N**` → `**問題文**` → `- A.`〜`- D.`、
 *     解答は `## ...解答・解説` 内の `- **問N: B, D**` + `- **解説**: ...`
 *   - セット2/3: `### **QN. カテゴリ**` → 問題文（複数行可）→ `- A.`〜`- D.`、
 *     解答は `### **QN. 解答：B**` + `- **ウチの解説：**` + 本文
 *
 * 入力ファイルのパスは第1引数で渡す。
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
if (!SRC) { console.error('使い方: node parse-exam.js <doc-json-path>'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8')).fileContent;

// ---- 文字化け絵文字（Latin-1 に誤デコードされたバイト列）と装飾文字を除去 ----
function clean(s) {
  if (s == null) return '';
  return String(s)
    .replace(/[-ÿ]/g, '')      // 文字化け絵文字のバイト断片
    .replace(/[​-‏︀-️￼�]/g, '') // ゼロ幅・異体字セレクタ等
    .replace(/\\([\\`*_{}\[\]()#+\-.!<>~|])/g, '$1') // Markdown エスケープ（\_ \[ \< 等）を解除
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// コードらしい行を判定（Apex / SOQL）
const CODE_RE = /[{};]|=>|==|&&|\|\||SELECT |FROM | WHERE |trigger |System\.|Map<|List<|Set<|class |public |private |void |Integer |String |Boolean |for ?\(|if ?\(|return |new |update |insert |delete |LIMIT /;

// 問題文に混在する Apex/SOQL コード行を ```apex フェンスでまとめる。
// 先頭の説明文（散文）はそのまま残し、以降の連続するコード行をブロック化する。
function wrapCode(text) {
  const ls = text.split('\n');
  if (ls.length < 2 || !ls.some(l => CODE_RE.test(l))) return text;
  const prose = [];
  let idx = 0;
  while (idx < ls.length && !CODE_RE.test(ls[idx])) { prose.push(ls[idx]); idx++; }
  const code = ls.slice(idx).join('\n').trim();
  const head = prose.join('\n').trim();
  if (!code) return text;
  return (head ? head + '\n\n' : '') + '```apex\n' + code + '\n```';
}

// 解答ラベル（A〜D）を抽出。「B, D」「B・D」「BとD」等に対応
function parseLetters(s) {
  const m = (s.match(/[A-D]/g) || []);
  return [...new Set(m)];
}

const lines = raw.split(/\r?\n/);

// ---- セット境界（H1 の "# 1" / "# 2" / "# 3"）を検出 ----
const setStarts = [];
lines.forEach((l, i) => {
  if (/^#\s+[0-9０-９]+\s*$/.test(l)) setStarts.push(i);
});
// 先頭にマーカーが無い場合に備えて 0 を補完
if (!setStarts.length || setStarts[0] !== 0) setStarts.unshift(0);

const setRanges = setStarts.map((s, i) => [s, i + 1 < setStarts.length ? setStarts[i + 1] : lines.length]);

// オプション行 "- A. xxx" を判定
const optRe = /^\s*[-*]?\s*([A-D])[\.．、)）]\s*(.+)$/;

function parseQuestions(seg) {
  const qs = [];
  let i = 0;
  while (i < seg.length) {
    const line = seg[i];
    // 問題見出し：### **問N** または ### **QN. カテゴリ**
    const mQ = line.match(/^###\s+\*\*\s*(?:問|Q)\s*(\d+)\s*[\.．:：]?\s*(.*?)\s*\*\*\s*$/i);
    if (!mQ) { i++; continue; }
    const n = parseInt(mQ[1], 10);
    const category = clean(mQ[2].replace(/解答.*/, ''));
    i++;
    // 問題文（オプション行が現れるまでの本文。**...** の囲みは外す）
    const textParts = [];
    const options = {};
    let order = [];
    while (i < seg.length) {
      const l = seg[i];
      if (/^###\s/.test(l) || /^##\s/.test(l) || /^#\s/.test(l)) break;
      const mo = l.match(optRe);
      if (mo) {
        options[mo[1]] = clean(mo[2]);
        order.push(mo[1]);
        i++;
        continue;
      }
      // オプションが既に始まっていれば本文収集は終了
      if (order.length) { i++; continue; }
      const tl = clean(l.replace(/^\s*\*\*(.*)\*\*\s*$/, '$1'));
      if (tl) textParts.push(tl);
      i++;
    }
    if (order.length >= 2) {
      qs.push({ n, category, text: textParts.join('\n'), options, order });
    }
  }
  return qs;
}

function parseAnswers(seg) {
  const ans = {}; // n -> { letters, explanation }
  let i = 0;
  while (i < seg.length) {
    const l = seg[i];
    // 形式A（セット1）: - **問N: B, D**
    let m = l.match(/^\s*[-*]?\s*\*\*\s*問\s*(\d+)\s*[:：]\s*([A-D][^*]*?)\*\*/);
    // 形式B（セット2/3）: ### **QN. 解答：B**
    if (!m) m = l.match(/^###\s+\*\*\s*Q\s*(\d+)[^*]*?解答\s*[:：]\s*([A-D][^*]*?)\*\*/i);
    if (!m) { i++; continue; }
    const n = parseInt(m[1], 10);
    const letters = parseLetters(m[2]);
    i++;
    // 解説本文：次の解答見出しまでの行を集める（ラベル行は除去）
    const exp = [];
    while (i < seg.length) {
      const x = seg[i];
      if (/^\s*[-*]?\s*\*\*\s*問\s*\d+\s*[:：]/.test(x)) break;
      if (/^###\s+\*\*\s*Q\s*\d+[^*]*?解答/i.test(x)) break;
      if (/^##\s/.test(x) || /^#\s/.test(x)) break;
      let t = x.replace(/^\s*[-*]?\s*\*\*\s*(解説|ウチの解説)\s*[:：]?\s*\*\*\s*/, '');
      t = t.replace(/^\s*[-*]?\s*\*\*\s*(解説|ウチの解説)\s*[:：]/, '');
      t = t.replace(/^\s*[:：]\s*/, ''); // ラベル除去後に残る先頭コロンを削る
      t = clean(t);
      if (t) exp.push(t);
      i++;
    }
    ans[n] = { letters, explanation: exp.join('\n') };
  }
  return ans;
}

const setTitles = [
  'Set 1 — ファンダメンタルズ／Apex／自動化／UI／テスト',
  'Set 2 — Platform Developer I 模擬試験',
  'Set 3 — Platform Developer I 模擬試験（Version 2）',
];

const sets = [];
setRanges.forEach(([s, e], si) => {
  const seg = lines.slice(s, e);
  const questions = parseQuestions(seg);
  const answers = parseAnswers(seg);
  const merged = questions.map(q => {
    const a = answers[q.n] || { letters: [], explanation: '' };
    // 多肢選択判定：問題文の「N つ選択」または解答が複数
    const mSel = q.text.match(/([0-9０-９]+)\s*つ選択/);
    const expectN = mSel ? parseInt(mSel[1].replace(/[０-９]/g, c => '０１２３４５６７８９'.indexOf(c)), 10) : null;
    const multi = (a.letters.length > 1) || (expectN && expectN > 1);
    return {
      n: q.n,
      category: q.category || '',
      text: wrapCode(q.text),
      options: q.order.map(k => ({ key: k, text: q.options[k] })),
      answer: a.letters,
      multi: !!multi,
      explanation: a.explanation || '',
    };
  }).sort((x, y) => x.n - y.n);
  sets.push({ id: 'set' + (si + 1), title: setTitles[si] || ('Set ' + (si + 1)), questions: merged });
});

const out = { version: 1, sets };
const OUT = path.join(__dirname, 'exam-data.json');
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

// ---- 検証ログ ----
sets.forEach(st => {
  const noAns = st.questions.filter(q => !q.answer.length).map(q => q.n);
  const badOpt = st.questions.filter(q => q.options.length !== 4).map(q => q.n + '(' + q.options.length + ')');
  const noExp = st.questions.filter(q => !q.explanation).map(q => q.n);
  console.log(`${st.id}: ${st.questions.length}問 / 解答なし:[${noAns}] / 選択肢≠4:[${badOpt}] / 解説なし:[${noExp}]`);
});
console.log('出力:', OUT);
