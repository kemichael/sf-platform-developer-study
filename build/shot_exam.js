const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exam.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'design_iterations');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const start = await p.evaluate(() => ({
    setCards: document.querySelectorAll('.set-card').length,
    title: document.querySelector('.exam-hero h1').textContent,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_start.png') });

  // セット1を開始
  await p.evaluate(() => document.querySelectorAll('.set-card')[0].click());
  await p.waitForTimeout(400);
  const quiz = await p.evaluate(() => ({
    qCards: document.querySelectorAll('.q-card').length,
    opts: document.querySelectorAll('.q-card .opt').length,
    multi: document.querySelectorAll('.q-card .q-multi').length,
    codeBlocks: document.querySelectorAll('.q-card .code-block').length,
    highlighted: document.querySelectorAll('.q-card .token').length,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_quiz.png') });

  // 全問に回答（正解と一部わざと不正解を混ぜる）：奇数問は正解、偶数問は誤答 or 未選択を避け全問回答
  const answered = await p.evaluate(() => {
    const data = window.__EXAM__.sets[0].questions;
    let cnt = 0;
    document.querySelectorAll('.q-card').forEach((card, i) => {
      const n = +card.dataset.n;
      const q = data.find(x => x.n === n);
      const opts = card.querySelectorAll('.opt');
      if (i % 3 === 0) {
        // わざと不正解：正解でない最初の選択肢を1つ
        const wrong = [...opts].find(o => !q.answer.includes(o.dataset.key));
        if (wrong) { wrong.click(); cnt++; }
      } else {
        // 正解：正解 letter をすべて選択
        q.answer.forEach(k => { const o = [...opts].find(x => x.dataset.key === k); if (o) o.click(); });
        cnt++;
      }
    });
    return { cnt, answeredText: document.getElementById('answeredCount').textContent };
  });

  // 採点（confirm が出ても OK）
  p.on('dialog', d => d.accept());
  await p.evaluate(() => document.getElementById('gradeBtn').click());
  await p.waitForTimeout(500);
  const result = await p.evaluate(() => ({
    pct: document.querySelector('.score-ring .pct') ? document.querySelector('.score-ring .pct').textContent : '(none)',
    verdict: document.querySelector('.verdict') ? document.querySelector('.verdict').textContent : '(none)',
    detail: document.querySelector('.detail') ? document.querySelector('.detail').textContent : '',
    correctCards: document.querySelectorAll('.q-card.is-correct').length,
    wrongCards: document.querySelectorAll('.q-card.is-wrong').length,
    explainsShown: document.querySelectorAll('.q-card.graded .explain').length,
    barHidden: document.getElementById('quizBar').hidden,
  }));
  await p.screenshot({ path: path.join(OUT, 'exam_result.png') });
  // 採点後の1問目付近
  await p.evaluate(() => { const c = document.querySelector('.q-card'); if (c) c.scrollIntoView(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'exam_graded.png') });

  // 「間違えonly」フィルタ
  const filtered = await p.evaluate(() => {
    document.getElementById('wrongOnly').click();
    return [...document.querySelectorAll('.q-card')].filter(c => c.style.display !== 'none').length;
  });

  // ダークモード
  await p.click('#themeToggle');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'exam_dark.png') });

  await b.close();
  console.log('START:', JSON.stringify(start));
  console.log('QUIZ:', JSON.stringify(quiz));
  console.log('ANSWERED:', JSON.stringify(answered));
  console.log('RESULT:', JSON.stringify(result));
  console.log('wrongOnly後の表示問数:', filtered);
  console.log('console errors:', errs.length);
  errs.slice(0, 8).forEach(e => console.log(' -', e));
})();
