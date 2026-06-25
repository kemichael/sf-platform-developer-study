/*
 * 単元まとめ・試験対策ページのビルド
 *
 * base-text/ 配下の各ユニット Markdown から
 *   - 「## 🎓 この単元のまとめ」セクション
 *   - 「## 試験対策：…」セクション
 * を抽出し、トピック → 単元 の階層に集約した 1 枚の Markdown を生成する。
 * その Markdown を共有 CSS・各ライブラリ・専用スクリプトとともに
 * 自己完結した matome.html に出力する。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'base-text');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'matome.html');

const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
  'prism-css.min.js', 'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js',
  'prism-apex.min.js', 'prism-bash.min.js', 'prism-json.min.js', 'mermaid.min.js'];

function strLiteral(s) {
  return JSON.stringify(s).split('<').join('\\u003c').split('>').join('\\u003e');
}

// ディレクトリ名・ファイル名の先頭にある「数字＋区切り」を取り除いて表示名にする
function cleanName(name) {
  return name.replace(/\.md$/i, '').replace(/^\d+[_.\-\s]*/, '').replace(/_/g, ' ').trim();
}

// 指定ディレクトリ配下の .md を、パス順（ファイル名先頭の数字順）で再帰的に集める
function collectMarkdown(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }));
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectMarkdown(full));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      if (/^99_/.test(ent.name)) continue; // トピック総まとめは対象外
      out.push(full);
    }
  }
  return out;
}

// 本文 1 行目付近の H1（# …）を単元タイトルとして取得
function extractTitle(lines) {
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return null;
}

// startPredicate にマッチする H2 セクションを、次の H1/H2 または EOF まで抜き出す。
// 見出し行そのものは含めず、末尾の空行・水平線(---)は落とす。
function extractSection(lines, startPredicate) {
  let i = lines.findIndex(startPredicate);
  if (i < 0) return null;
  const body = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^#{1,2}\s/.test(lines[j])) break; // 次の H1/H2 で打ち切り
    body.push(lines[j]);
  }
  // 末尾の空行・水平線を除去
  while (body.length && (body[body.length - 1].trim() === '' || /^-{3,}\s*$/.test(body[body.length - 1]))) {
    body.pop();
  }
  // 先頭の空行を除去
  while (body.length && body[0].trim() === '') body.shift();
  if (!body.length) return null;
  // 内部の見出しは 2 段下げて、単元(H3)・ラベル(H4)より下に潜らせる
  const demoted = body.map(l => {
    const hm = l.match(/^(#{1,4})(\s.+)$/);
    return hm ? '#' + hm[1] + hm[2] : l;
  });
  return demoted.join('\n').trim();
}

const isSummaryHead = l => /^##\s+🎓?\s*この単元のまとめ\s*$/.test(l);
const isExamHead = l => /^##\s+試験対策/.test(l);

// ---- トピックごとに抽出 ----
const topicDirs = fs.readdirSync(BASE, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort((a, b) => a.localeCompare(b, 'ja', { numeric: true }));

const topics = []; // { name, num, units: [{title, summary, exam}] }
let unitCount = 0, summaryCount = 0, examCount = 0;

for (const dirName of topicDirs) {
  const files = collectMarkdown(path.join(BASE, dirName));
  const units = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const title = extractTitle(lines) || cleanName(path.basename(file));
    const summary = extractSection(lines, isSummaryHead);
    const exam = extractSection(lines, isExamHead);
    if (!summary && !exam) continue; // どちらも無い単元はスキップ
    units.push({ title, summary, exam });
    unitCount++;
    if (summary) summaryCount++;
    if (exam) examCount++;
  }
  if (units.length) {
    const numMatch = dirName.match(/^(\d+)/);
    topics.push({ name: cleanName(dirName), num: numMatch ? numMatch[1] : '', units });
  }
}

// ---- Markdown 組み立て ----
const md = [];
md.push('# 単元まとめ・試験対策');
md.push('');
md.push(`各単元の **「🎓 この単元のまとめ」** と **「試験対策」** を 1 ページに集約した復習用ページです。${topics.length} トピック / ${unitCount} 単元を収録しています。試験直前の総ざらいや、苦手トピックの一気読みに活用してください。`);
md.push('');
md.push('> [!ポイント] このページの使い方');
md.push('>');
md.push('> - 左サイドバーのトピックを開くと、各単元へジャンプできます。');
md.push('> - 各単元には **まとめ**（要点・図・豆知識）と **試験対策**（頻出ポイント）が並びます。');
md.push('> - 本文の詳細は[学習ノート本編](index.html)を参照してください。');
md.push('');

for (const topic of topics) {
  md.push(`## ${topic.num ? topic.num + '. ' : ''}${topic.name}`);
  md.push('');
  for (const unit of topic.units) {
    md.push(`### ${unit.title}`);
    md.push('');
    if (unit.summary) {
      md.push('#### 🎓 この単元のまとめ');
      md.push('');
      md.push(unit.summary);
      md.push('');
    }
    if (unit.exam) {
      md.push('#### 📝 試験対策');
      md.push('');
      md.push(unit.exam);
      md.push('');
    }
  }
}

const docMd = md.join('\n');

// ---- HTML 出力 ----
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'matome-app.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'matome-template.html'), 'utf8');
const vendorJs = vendorFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(VENDOR, f), 'utf8')}`).join('\n;\n');

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => vendorJs)
  .replace('/*__DOC__*/', () => strLiteral(docMd))
  .replace('/*__APP__*/', () => appJs);

fs.writeFileSync(OUT, html, 'utf8');
console.log(`収録: ${topics.length} トピック / ${unitCount} 単元（まとめ ${summaryCount} / 試験対策 ${examCount}）`);
console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
