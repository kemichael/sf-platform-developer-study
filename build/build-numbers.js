/*
 * 数字まとめ（数値・上限値）ページのビルド
 *
 * build/numbers.md に手作業でキュレーションした「試験で問われる具体的な数値」を
 * 共有 CSS・各ライブラリ・専用スクリプト（matome-app.js を再利用）とともに
 * 自己完結した numbers.html に出力する。
 *
 * 内容の更新は build/numbers.md を編集してから本スクリプトを再実行すること。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'numbers.html');

const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
  'prism-css.min.js', 'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js',
  'prism-apex.min.js', 'prism-bash.min.js', 'prism-json.min.js', 'mermaid.min.js'];

function strLiteral(s) {
  return JSON.stringify(s).split('<').join('\\u003c').split('>').join('\\u003e');
}

// ---- ソース Markdown 読み込み ----
const docMd = fs.readFileSync(path.join(__dirname, 'numbers.md'), 'utf8');

// 収録カテゴリ数（H2）・項目数（表の行）を集計してログに出す
const topicCount = (docMd.match(/^##\s+/gm) || []).length;
const rowCount = (docMd.match(/^\|/gm) || []).length;

// ---- HTML 出力 ----
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'numbers-app.js'), 'utf8'); // カテゴリのフラットなナビ
const template = fs.readFileSync(path.join(__dirname, 'numbers-template.html'), 'utf8');
const vendorJs = vendorFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(VENDOR, f), 'utf8')}`).join('\n;\n');

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => vendorJs)
  .replace('/*__DOC__*/', () => strLiteral(docMd))
  .replace('/*__APP__*/', () => appJs);

fs.writeFileSync(OUT, html, 'utf8');
console.log(`収録: ${topicCount} カテゴリ / 約 ${rowCount} 行（表）`);
console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
