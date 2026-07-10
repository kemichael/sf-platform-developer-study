(function () {
  'use strict';
  const DATA = window.__EXAM__ || { sets: [] };
  const LS_THEME = 'sfpd-theme';
  const LS_TAB = 'sfpd-kaisetsu-tab';
  const LS_LEARNED = 'sfpd-kaisetsu-learned';
  const LS_HIDE = 'sfpd-kaisetsu-hidelearned';
  const LS_SELF = 'sfpd-kaisetsu-selfcheck';
  const CHUNK = 60; // 1フレームあたりの描画カード数（全セット表示時の固まり防止）

  // ----- テーマ（他ページとキー共有） -----
  const applyTheme = th => { document.documentElement.setAttribute('data-theme', th); localStorage.setItem(LS_THEME, th); };
  applyTheme(localStorage.getItem(LS_THEME) || 'light');
  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const prismLang = l => { l = (l || '').toLowerCase(); if (l === 'soql') return 'sql'; if (l === 'xml') return 'markup'; if (l === 'js') return 'javascript'; return l; };

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  // Markdown 文字列 → HTML（コードブロックは Prism でハイライト）
  function mdHTML(md) {
    return window.marked ? marked.parse(md || '') : escapeHtml(md || '');
  }
  function enhanceCode(host) {
    host.querySelectorAll('pre > code').forEach(code => {
      const pre = code.parentElement;
      const cls = (code.className || '').match(/language-([\w-]+)/);
      const pl = prismLang(cls ? cls[1] : '');
      if (pl && window.Prism && Prism.languages[pl]) {
        code.className = 'language-' + pl;
        try { Prism.highlightElement(code); } catch (e) {}
      }
      const block = document.createElement('div'); block.className = 'code-block';
      const bar = document.createElement('div'); bar.className = 'code-bar';
      bar.innerHTML = '<span class="code-lang">' + escapeHtml((cls ? cls[1] : 'コード').toUpperCase()) +
        '</span><button class="copy-btn" type="button"><svg class="ico"><use href="#i-copy"/></svg><span class="ct">コピー</span></button>';
      pre.parentNode.insertBefore(block, pre); block.appendChild(bar); block.appendChild(pre);
      bar.querySelector('.copy-btn').addEventListener('click', function () {
        const txt = code.textContent, lbl = this.querySelector('.ct');
        const ok = () => { this.classList.add('copied'); lbl.textContent = 'コピー完了'; setTimeout(() => { this.classList.remove('copied'); lbl.textContent = 'コピー'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(() => {});
      });
    });
  }

  // ----- 全問題をフラット化（検索用テキストも前計算） -----
  const ALL = [];
  DATA.sets.forEach((s, si) => {
    s.questions.forEach(q => {
      ALL.push({
        set: s, si, q,
        key: s.id + ':' + q.n,
        hay: (q.text + ' ' + q.options.map(o => o.key + ' ' + o.text).join(' ') + ' ' +
          (q.explanation || '') + ' ' + (q.category || '')).toLowerCase(),
      });
    });
  });

  // ----- 状態 -----
  let learned = {};
  try { learned = JSON.parse(localStorage.getItem(LS_LEARNED) || '{}') || {}; } catch (e) { learned = {}; }
  let tab = localStorage.getItem(LS_TAB) || 'all';
  if (tab !== 'all' && !DATA.sets.some(s => s.id === tab)) tab = 'all';
  let query = '';
  let renderToken = 0; // 描画中に条件が変わったら旧チャンク描画を打ち切る

  // ----- DOM 参照 -----
  const setTabs = document.getElementById('setTabs');
  const searchWrap = document.getElementById('searchWrap');
  const searchBox = document.getElementById('searchBox');
  const clearBtn = document.getElementById('clearBtn');
  const hideLearnedEl = document.getElementById('hideLearned');
  const selfCheckEl = document.getElementById('selfCheck');
  const qList = document.getElementById('qList');
  const statLine = document.getElementById('statLine');
  const emptyMsg = document.getElementById('emptyMsg');

  hideLearnedEl.checked = localStorage.getItem(LS_HIDE) === '1';
  selfCheckEl.checked = localStorage.getItem(LS_SELF) === '1';
  qList.classList.toggle('hide-ans', selfCheckEl.checked);

  function saveLearned() { localStorage.setItem(LS_LEARNED, JSON.stringify(learned)); }
  function learnedTotal() { return ALL.filter(it => learned[it.key]).length; }

  function currentItems() {
    return ALL.filter(it =>
      (tab === 'all' || it.set.id === tab) &&
      (!query || it.hay.includes(query)) &&
      (!hideLearnedEl.checked || !learned[it.key]));
  }

  // ----- セットタブ -----
  function renderTabs() {
    setTabs.innerHTML = '';
    const mk = (id, label, cnt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab-btn' + (tab === id ? ' active' : '');
      b.innerHTML = escapeHtml(label) + '<span class="cnt">' + cnt + '</span>';
      b.title = id === 'all' ? '全セットを表示' : (DATA.sets.find(s => s.id === id) || {}).title || '';
      b.addEventListener('click', () => {
        if (tab === id) return;
        tab = id;
        localStorage.setItem(LS_TAB, tab);
        renderTabs();
        render();
        window.scrollTo(0, 0);
      });
      setTabs.appendChild(b);
    };
    mk('all', 'すべて', ALL.length);
    DATA.sets.forEach((s, i) => mk(s.id, 'SET ' + (i + 1), s.questions.length));
  }

  // ----- 問題カード -----
  function buildCard(it) {
    const q = it.q;
    const card = document.createElement('div');
    card.className = 'q-card' + (learned[it.key] ? ' learned' : '');
    card.id = 'q-' + it.set.id + '-' + q.n;

    const top = document.createElement('div');
    top.className = 'q-top';
    top.innerHTML = '<span class="q-set">SET ' + (it.si + 1) + '</span>' +
      '<span class="q-num">Q' + q.n + '</span>' +
      (q.category ? '<span class="q-cat">' + escapeHtml(q.category) + '</span>' : '') +
      (q.multi ? '<span class="q-multi">複数選択</span>' : '');
    const learnBtn = document.createElement('button');
    learnBtn.type = 'button';
    learnBtn.className = 'learn-btn' + (learned[it.key] ? ' active' : '');
    learnBtn.innerHTML = '<svg class="ico"><use href="#i-check"/></svg>覚えた';
    learnBtn.setAttribute('aria-pressed', learned[it.key] ? 'true' : 'false');
    learnBtn.addEventListener('click', () => toggleLearned(it, card, learnBtn));
    top.appendChild(learnBtn);
    card.appendChild(top);

    const text = document.createElement('div');
    text.className = 'q-text';
    text.innerHTML = mdHTML(q.text);
    enhanceCode(text);
    card.appendChild(text);

    const opts = document.createElement('div');
    opts.className = 'opts';
    q.options.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'opt' + ((q.answer || []).includes(o.key) ? ' correct' : '');
      opt.innerHTML = '<span class="mark">' + o.key + '</span><span class="otext">' +
        mdHTML(o.text).replace(/^<p>|<\/p>\s*$/g, '') + '</span>';
      enhanceCode(opt);
      opts.appendChild(opt);
    });
    card.appendChild(opts);

    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.innerHTML = '<div class="explain-head"><svg class="ico"><use href="#i-bulb"/></svg>解説' +
      '<span class="ans">正解：' + (q.answer || []).join('・') + '</span></div>' +
      '<div class="explain-body"></div>';
    const body = exp.querySelector('.explain-body');
    body.innerHTML = mdHTML(q.explanation);
    enhanceCode(body);
    card.appendChild(exp);

    // 自己チェックモード用：解答と解説の開示ボタン
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'reveal-btn';
    reveal.innerHTML = '<svg class="ico"><use href="#i-eye"/></svg>解答と解説を表示';
    reveal.addEventListener('click', () => card.classList.add('revealed'));
    card.appendChild(reveal);

    return card;
  }

  function toggleLearned(it, card, btn) {
    if (learned[it.key]) delete learned[it.key];
    else learned[it.key] = 1;
    saveLearned();
    const on = !!learned[it.key];
    card.classList.toggle('learned', on);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && hideLearnedEl.checked) card.remove(); // フィルタ中は即座に非表示
    updateStats();
  }

  function updateStats() {
    const shown = qList.querySelectorAll('.q-card').length;
    statLine.innerHTML = '表示 <b>' + shown + '</b> 問' +
      (query ? '（検索: ' + escapeHtml(query) + '）' : '') +
      '<span class="learned-stat">覚えた ' + learnedTotal() + ' / ' + ALL.length + ' 問</span>';
    emptyMsg.hidden = shown > 0;
  }

  // ----- 一覧描画（チャンク分割で全 400 問超でも固まらないように） -----
  function render() {
    const items = currentItems();
    const token = ++renderToken;
    qList.innerHTML = '';
    qList.querySelectorAll('.revealed').forEach(c => c.classList.remove('revealed'));
    let i = 0;
    function step() {
      if (token !== renderToken) return; // 条件が変わったので中断
      const frag = document.createDocumentFragment();
      for (let end = Math.min(i + CHUNK, items.length); i < end; i++) frag.appendChild(buildCard(items[i]));
      qList.appendChild(frag);
      if (i < items.length) requestAnimationFrame(step);
      else updateStats();
    }
    if (items.length) step();
    else updateStats();
  }

  // ----- 検索 -----
  let debounceId = 0;
  function applyQuery(v) {
    query = (v || '').trim().toLowerCase();
    searchWrap.classList.toggle('has-q', !!query);
    render();
  }
  searchBox.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => applyQuery(searchBox.value), 180);
  });
  clearBtn.addEventListener('click', () => {
    searchBox.value = '';
    applyQuery('');
    searchBox.focus();
  });

  // ----- フィルタ・モード切替 -----
  hideLearnedEl.addEventListener('change', () => {
    localStorage.setItem(LS_HIDE, hideLearnedEl.checked ? '1' : '0');
    render();
  });
  selfCheckEl.addEventListener('change', () => {
    localStorage.setItem(LS_SELF, selfCheckEl.checked ? '1' : '0');
    qList.classList.toggle('hide-ans', selfCheckEl.checked);
    // ON にし直したときは開示状態をリセットして全カードを伏せる
    if (selfCheckEl.checked) qList.querySelectorAll('.q-card.revealed').forEach(c => c.classList.remove('revealed'));
  });

  // ----- 初期化 -----
  renderTabs();
  render();
})();
