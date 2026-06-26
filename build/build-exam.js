/*
 * 模擬試験ページのビルド
 *
 * build/exam-data.json（3 セット × 60 問の構造化データ）を、共有 CSS・
 * marked / Prism ライブラリ・専用スクリプトとともに自己完結した exam.html に出力する。
 *
 * 問題の追加・修正は build/exam-data.json を編集（1 セット = 60 問）してから
 * 本スクリプトを再実行する。元の Google ドキュメントから再生成する場合は
 * build/parse-exam.js を使う。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const OUT = path.join(ROOT, 'exam.html');

// コードハイライト用に Prism と marked のみ読み込む（Mermaid は不要）
const vendorFiles = ['marked.min.js', 'prism-core.min.js', 'prism-markup.min.js', 'prism-clike.min.js',
  'prism-javascript.min.js', 'prism-sql.min.js', 'prism-java.min.js', 'prism-apex.min.js'];

// JSON テキスト中の <,> を \u エスケープし、</script> での閉じタグ誤認を防ぐ
function jsonEmbed(obj) {
  return JSON.stringify(obj).split('<').join('\\u003c').split('>').join('\\u003e');
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exam-data.json'), 'utf8'));
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'exam-app.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'exam-template.html'), 'utf8');
const vendorJs = vendorFiles.map(f => `/* ${f} */\n${fs.readFileSync(path.join(VENDOR, f), 'utf8')}`).join('\n;\n');

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => vendorJs)
  .replace('/*__DATA__*/', () => jsonEmbed(data))
  .replace('/*__APP__*/', () => appJs);

fs.writeFileSync(OUT, html, 'utf8');

const totalQ = data.sets.reduce((a, s) => a + s.questions.length, 0);
console.log(`収録: ${data.sets.length} セット / 計 ${totalQ} 問`);
console.log(`出力: ${OUT} (${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB)`);
