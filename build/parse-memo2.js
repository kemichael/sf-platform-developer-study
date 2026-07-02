/*
 * memo-2.md（99 問・問題と選択肢のみ）のパーサー
 *
 * 形式:
 *   - 問題見出し: `#### 質問 N/99`
 *   - 問題文: `**...**` の太字行（複数行）
 *   - 選択肢: `**A.** テキスト`（A〜E、コード継続行あり）
 *   - コード: `apex` 行 + `Copy` / `CopyEdit` 行に続くコード行
 *     （全体が `**...**` で太字化されている場合もある）
 *
 * 出力: 第2引数のパスに構造化 JSON（answer / explanation は空で出力し、
 *       後工程で補完する）
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) { console.error('使い方: node parse-memo2.js <memo-2.md> <out.json>'); process.exit(1); }

const raw = fs.readFileSync(SRC, 'utf8');

// 行単位の前処理: 太字ラッパー除去・Markdown エスケープ解除・装飾除去
function cleanLine(l) {
  let s = String(l).replace(/[ \t]+$/, '');
  const mBold = s.match(/^\s*\*\*(.*)\*\*\s*$/);
  if (mBold) s = mBold[1];
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!<>~|])/g, '$1');
  s = s.replace(/[​-‏︀-️﻿￼�]/g, '');
  return s;
}

const JP_RE = /[぀-ヿ一-鿿]/;            // 日本語を含む＝散文とみなす
const LANG_RE = /^(apex|java|sql|soql|javascript|js|html|xml|json|text)$/i;
const SKIP_RE = /^(Copy|CopyEdit|（質問全文）)$/;

// 行配列 → 散文 + ```フェンス``` 混在の Markdown 文字列
function buildText(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (SKIP_RE.test(l.trim())) { i++; continue; }
    const mLang = l.trim().match(LANG_RE);
    if (mLang) {
      // 言語マーカー行 → 続くコード行をフェンス化（日本語散文が出たら終了）
      const lang = mLang[1].toLowerCase() === 'js' ? 'javascript' : mLang[1].toLowerCase();
      i++;
      const code = [];
      while (i < lines.length) {
        const c = lines[i];
        const t = c.trim();
        if (SKIP_RE.test(t)) { i++; continue; }
        if (t && JP_RE.test(t) && !/\/\/|\/\*/.test(t)) break; // 日本語散文で終了（コメント除く）
        code.push(c);
        i++;
      }
      while (code.length && !code[code.length - 1].trim()) code.pop();
      while (code.length && !code[0].trim()) code.shift();
      if (code.length) out.push('```' + lang + '\n' + code.join('\n') + '\n```');
      continue;
    }
    out.push(l.trim());
    i++;
  }
  return out.join('\n');
}

const lines = raw.split(/\r?\n/);
const qHeadRe = /^####\s*質問\s*(\d+)\s*\/\s*\d+/;
const optRe = /^\*\*([A-E])\.\*\*\s*(.*)$/;

// 問題ごとの行範囲を切り出す
const starts = [];
lines.forEach((l, i) => { if (qHeadRe.test(l)) starts.push(i); });

const questions = [];
starts.forEach((s, qi) => {
  const e = qi + 1 < starts.length ? starts[qi + 1] : lines.length;
  const n = parseInt(lines[s].match(qHeadRe)[1], 10);
  const seg = lines.slice(s + 1, e);

  // 選択肢の開始位置で本文と分割
  const textLines = [];
  const optChunks = [];      // [{key, lines}]
  let cur = null;
  seg.forEach(l => {
    const mo = l.match(optRe);
    if (mo) {
      cur = { key: mo[1], lines: [mo[2]] };
      optChunks.push(cur);
    } else if (cur) {
      cur.lines.push(cleanLine(l));
    } else {
      textLines.push(cleanLine(l));
    }
  });

  const text = buildText(textLines);
  const options = optChunks.map(c => {
    // 先頭行（選択肢テキスト）もクリーニング
    c.lines[0] = cleanLine(c.lines[0]);
    return { key: c.key, text: buildText(c.lines) };
  });

  // 「N つの回答を選択」「N つの◯◯はどれ」から複数選択を判定
  const mSel = text.match(/([0-9２-９])\s*つの?(?:回答|答え)?を?選択/) ||
               text.match(/([0-9２-９])\s*つの[^\n。]{0,25}(?:どれ|何)/);
  const zen = c => { const k = '０１２３４５６７８９'.indexOf(c); return k >= 0 ? String(k) : c; };
  const expectN = mSel ? parseInt(zen(mSel[1]), 10) : 1;

  questions.push({
    n,
    category: '',
    text,
    options,
    answer: [],
    multi: expectN > 1,
    expect: expectN,
    explanation: '',
  });
});

fs.writeFileSync(OUT, JSON.stringify(questions, null, 2), 'utf8');

// ---- 検証ログ ----
console.log(`問題数: ${questions.length}`);
const badOpt = questions.filter(q => q.options.length < 4).map(q => `${q.n}(${q.options.length})`);
console.log(`選択肢<4: [${badOpt}]`);
const opt5 = questions.filter(q => q.options.length === 5).map(q => q.n);
console.log(`5択: [${opt5}]`);
const multi = questions.filter(q => q.multi).map(q => q.n);
console.log(`複数選択: [${multi}]`);
const noText = questions.filter(q => !q.text.trim()).map(q => q.n);
console.log(`本文なし: [${noText}]`);
const emptyOpt = questions.filter(q => q.options.some(o => !o.text.trim())).map(q => q.n);
console.log(`空選択肢: [${emptyOpt}]`);
console.log('出力:', OUT);
