const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message)));
  await p.goto('https://kemichael.github.io/sf-platform-developer-study/summary.html?v=live2', { waitUntil: 'load', timeout: 60000 });
  let ok = false;
  try { await p.waitForSelector('figure.mermaid-fig svg', { timeout: 25000 }); ok = true; } catch (e) {}
  const cnt = await p.evaluate(() => document.querySelectorAll('figure.mermaid-fig svg').length);
  await b.close();
  console.log('本番 summary.html Mermaid描画:', ok, '/ 図数:', cnt, '/ pageerror:', errs.length);
})();
