/*
 * 構文・メソッドリファレンスページのビルド
 *
 * build/reference.md に手作業でキュレーションした「各ソース（SOQL / SOSL / DML /
 * Apex / Visualforce / LWC / Aura）の構文とメソッド」を、共有 CSS・各ライブラリ・
 * 単元まとめと共通のアプリスクリプト（matome-app.js：2 階層ナビ＋コードハイライト）と
 * ともに自己完結した reference.html に出力する。
 *
 * 内容の更新は build/reference.md を編集してから本スクリプトを再実行すること。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'reference.html');

const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
  'prism-css.min.js', 'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js',
  'prism-apex.min.js', 'prism-bash.min.js', 'prism-json.min.js', 'mermaid.min.js'];

function strLiteral(s) {
  return JSON.stringify(s).split('<').join('\\u003c').split('>').join('\\u003e');
}

// ---- ソース Markdown 読み込み ----
const docMd = fs.readFileSync(path.join(__dirname, 'reference.md'), 'utf8');

// 収録カテゴリ数（H2）・サブトピック数（H3）・コード例数を集計してログに出す
const categoryCount = (docMd.match(/^##\s+/gm) || []).length;
const topicCount = (docMd.match(/^###\s+/gm) || []).length;
const codeCount = (docMd.match(/^```/gm) || []).length / 2;

// ---- HTML 出力 ----
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'matome-app.js'), 'utf8'); // 2 階層ナビ＋コードハイライト
const template = fs.readFileSync(path.join(__dirname, 'reference-template.html'), 'utf8');
const vendorJs = vendorFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(VENDOR, f), 'utf8')}`).join('\n;\n');

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => vendorJs)
  .replace('/*__DOC__*/', () => strLiteral(docMd))
  .replace('/*__APP__*/', () => appJs);

fs.writeFileSync(OUT, html, 'utf8');
console.log(`収録: ${categoryCount} カテゴリ / ${topicCount} サブトピック / 約 ${codeCount} コード例`);
console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
