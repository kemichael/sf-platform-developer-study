/*
 * ビルドスクリプト
 * base-text 配下の Markdown 教材をスキャンして構造化し、
 * HTMLテンプレート・CSS・アプリJS・各ライブラリをすべて 1 つの index.html に
 * インライン埋め込みして出力する(完全オフライン・単一ファイル)。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'base-text');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'index.html');

function cleanName(name) {
  return name.replace(/\.md$/i, '').replace(/^\d+[_\-]/, '').replace(/_/g, ' ').trim();
}
function orderKey(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}
function sortedEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => orderKey(a.name) - orderKey(b.name) || a.name.localeCompare(b.name, 'ja'));
}
function collectUnits(dir, section) {
  const units = [];
  for (const ent of sortedEntries(dir)) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      units.push(...collectUnits(full, cleanName(ent.name)));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      units.push({ title: cleanName(ent.name), section: section || null, content: fs.readFileSync(full, 'utf8'), order: orderKey(ent.name) });
    }
  }
  return units;
}
function buildData() {
  const topics = [];
  for (const ent of sortedEntries(SRC)) {
    if (!ent.isDirectory()) continue;
    const units = collectUnits(path.join(SRC, ent.name), null);
    if (units.length === 0) continue;
    const ti = topics.length;
    units.forEach((u, ui) => { u.id = `t${ti}-u${ui}`; });
    topics.push({ title: cleanName(ent.name), num: String(orderKey(ent.name)).padStart(2, '0'), id: `t${ti}`, units });
  }
  return { topics };
}
// JSON を <script> 内に安全に埋め込む(終了タグと不等号のみエスケープ)
function safeJson(obj) {
  return JSON.stringify(obj).split('<').join('\\u003c').split('>').join('\\u003e');
}
function readVendor(file) { return fs.readFileSync(path.join(VENDOR, file), 'utf8'); }

function main() {
  const data = buildData();
  const unitCount = data.topics.reduce((n, t) => n + t.units.length, 0);
  console.log(`トピック: ${data.topics.length} / ユニット: ${unitCount}`);
  const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
    'prism-css.min.js', 'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js',
    'prism-apex.min.js', 'prism-bash.min.js', 'prism-json.min.js',
    'mermaid.min.js'];
  const vendorJs = vendorFiles.map(f => `/* ${f} */\n${readVendor(f)}`).join('\n;\n');
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const html = template
    .replace('/*__CSS__*/', () => css)
    .replace('/*__VENDOR__*/', () => vendorJs)
    .replace('/*__DATA__*/', () => `window.__COURSE__ = ${safeJson(data)};`)
    .replace('/*__APP__*/', () => appJs);
  fs.writeFileSync(OUT, html, 'utf8');
  console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
}
main();
