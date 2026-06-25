const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'numbers.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const stats = await p.evaluate(() => ({
    navCats: document.querySelectorAll('.nav-cat').length,
    callouts: document.querySelectorAll('.callout').length,
    tables: document.querySelectorAll('#doc table').length,
    tableRows: document.querySelectorAll('#doc tbody tr').length,
    h2: document.querySelectorAll('#doc h2').length,
    h3: document.querySelectorAll('#doc h3').length,
    topbarLinks: document.querySelectorAll('.topbar .summary-link').length,
  }));
  await p.screenshot({ path: path.join(OUT, 'numbers_top.png') });
  // カテゴリクリックでスクロール（ナビ動作確認）
  await p.evaluate(() => { const u = document.querySelectorAll('.nav-cat')[4]; if (u) u.click(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'numbers_mid.png') });
  const active = await p.evaluate(() => { const a = document.querySelector('.nav-cat.active'); return a ? a.textContent : '(none)'; });
  // 検索フィルター動作確認
  const filtered = await p.evaluate(() => {
    const inp = document.getElementById('searchInput');
    inp.value = 'テスト'; inp.dispatchEvent(new Event('input'));
    return document.getElementById('searchCount').textContent;
  });
  await p.evaluate(() => { const inp = document.getElementById('searchInput'); inp.value = ''; inp.dispatchEvent(new Event('input')); });
  // ダーク
  await p.click('#themeToggle');
  await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(OUT, 'numbers_dark.png') });
  await b.close();
  console.log(JSON.stringify(stats));
  console.log('active after click:', active, '/ filter "テスト":', filtered, '/ console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
