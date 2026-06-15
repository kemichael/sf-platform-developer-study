/* 全 .md から ```mermaid ブロックを抽出し、mermaid.parse で構文検証する */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'base-text');
const INDEX = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

// ```mermaid ... ``` を抽出
function extract(file) {
  const txt = fs.readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  let inb = false, buf = [], start = 0;
  for (let i = 0; i < txt.length; i++) {
    const line = txt[i];
    if (!inb && /^\s*```mermaid\s*$/.test(line)) { inb = true; buf = []; start = i + 1; continue; }
    if (inb && /^\s*```\s*$/.test(line)) { inb = false; blocks.push({ code: buf.join('\n'), line: start }); continue; }
    if (inb) buf.push(line.replace(/^>\s?/, '')); // コールアウト内の `> ` を除去
  }
  return blocks;
}

(async () => {
  const all = [];
  for (const f of walk(SRC)) for (const b of extract(f)) all.push({ file: path.relative(SRC, f), line: b.line, code: b.code });
  console.log('検証対象 mermaid ブロック数:', all.length);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(INDEX, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.mermaid, { timeout: 15000 });
  await page.evaluate(() => mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' }));

  const fails = [];
  for (const b of all) {
    const err = await page.evaluate(async (code) => {
      try { await mermaid.parse(code); return null; }
      catch (e) { return String((e && e.message) || e); }
    }, b.code);
    if (err) fails.push({ ...b, err });
  }
  await browser.close();

  if (!fails.length) { console.log('✅ 全 mermaid 図が構文OK（パース成功）'); return; }
  console.log('❌ 構文エラー:', fails.length, '件');
  fails.forEach(f => {
    console.log('---');
    console.log(f.file + ' (line ' + f.line + ')');
    console.log('  err:', f.err.split('\n')[0]);
    console.log('  code1行目:', f.code.split('\n')[0]);
  });
})();
