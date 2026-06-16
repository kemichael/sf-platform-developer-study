/* まとめパート・総まとめページ・豆知識コールアウトの描画確認用スクショ */
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const INDEX = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'design_iterations');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1100 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message)));
  await p.goto(INDEX, { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.mermaid, { timeout: 15000 });

  // ① 単元ページ（数式項目の使用）末尾のまとめ＋豆知識
  await p.evaluate(() => { location.hash = '#/t2-u0'; });
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  const triviaCnt = await p.evaluate(() => document.querySelectorAll('.callout.trivia').length);
  await p.screenshot({ path: path.join(OUT, 'verify_unit_summary.png') });

  // ② カテゴリー総まとめページ（数式と入力規則 = t2 の最終ユニット t2-u3）
  await p.evaluate(() => { location.hash = '#/t2-u3'; });
  await p.waitForTimeout(1800);
  const mmCnt = await p.evaluate(() => document.querySelectorAll('figure.mermaid-fig svg').length);
  const title = await p.evaluate(() => document.querySelector('.unit-title')?.textContent);
  await p.screenshot({ path: path.join(OUT, 'verify_category_top.png') });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'verify_category_bottom.png') });

  // ③ ダークテーマでも崩れないか（総まとめページ）
  await p.evaluate(() => document.getElementById('themeToggle').click());
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'verify_category_dark.png') });

  await b.close();
  console.log('豆知識コールアウト数(単元):', triviaCnt);
  console.log('総まとめページ Mermaid 描画数:', mmCnt, '/ タイトル:', title);
  console.log('pageerror:', errs.length, errs.slice(0, 3));
})();
