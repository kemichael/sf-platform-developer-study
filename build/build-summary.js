/*
 * まとめチートシートのビルド
 * build/summary.md を、共有 CSS・各ライブラリ・専用スクリプトとともに
 * 自己完結した summary.html に出力する。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'summary.html');

const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
  'prism-css.min.js', 'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js',
  'prism-apex.min.js', 'prism-bash.min.js', 'prism-json.min.js', 'mermaid.min.js'];

function strLiteral(s) {
  return JSON.stringify(s).split('<').join('\\u003c').split('>').join('\\u003e');
}

const md = fs.readFileSync(path.join(__dirname, 'summary.md'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'summary-app.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'summary-template.html'), 'utf8');
const vendorJs = vendorFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(VENDOR, f), 'utf8')}`).join('\n;\n');

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => vendorJs)
  .replace('/*__DOC__*/', () => strLiteral(md))
  .replace('/*__APP__*/', () => appJs);

fs.writeFileSync(OUT, html, 'utf8');
console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
