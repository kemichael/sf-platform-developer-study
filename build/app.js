(function () {
  'use strict';
  const DATA = window.__COURSE__ || { topics: [] };
  const LS = { theme: 'sfpd-theme', done: 'sfpd-done', last: 'sfpd-last' };

  // ----- ユニットのフラットな索引(前後移動・検索・直接参照用) -----
  const units = [];
  const unitById = {};
  DATA.topics.forEach((t, ti) => {
    t.units.forEach((u, ui) => {
      u._t = t; u._ti = ti; u._ui = ui; u._idx = units.length;
      units.push(u); unitById[u.id] = u;
    });
  });

  // ----- 進捗(localStorage) -----
  let done = {};
  try { done = JSON.parse(localStorage.getItem(LS.done) || '{}'); } catch (e) { done = {}; }
  const saveDone = () => localStorage.setItem(LS.done, JSON.stringify(done));
  const isDone = id => !!done[id];
  const topicDoneCount = t => t.units.filter(u => isDone(u.id)).length;
  const globalDoneCount = () => units.filter(u => isDone(u.id)).length;

  // ----- テーマ -----
  const applyTheme = th => {
    document.documentElement.setAttribute('data-theme', th);
    localStorage.setItem(LS.theme, th);
  };
  applyTheme(localStorage.getItem(LS.theme) || 'light');
  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    // Mermaid 図のテーマを切り替えるため、ユニット表示中なら再描画
    if (location.hash.indexOf('#/') === 0 && document.getElementById('searchResults').hidden) route();
  });

  // ----- marked 設定 -----
  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const langLabel = l => ({ apex: 'Apex', java: 'Java', sql: 'SOQL / SQL', soql: 'SOQL', js: 'JavaScript', javascript: 'JavaScript', html: 'HTML', markup: 'HTML', xml: 'XML', bash: 'シェル', shell: 'シェル', json: 'JSON', css: 'CSS' }[(l || '').toLowerCase()] || (l ? l.toUpperCase() : 'コード'));
  const prismLang = l => { l = (l || '').toLowerCase(); if (l === 'soql') return 'sql'; if (l === 'shell' || l === 'sh') return 'bash'; if (l === 'xml') return 'markup'; if (l === 'js') return 'javascript'; return l; };

  // コールアウト種別の定義(GitHub風アラート [!用語] 等を装飾ボックスに変換)
  const CALLOUTS = {
    '用語': { cls: 'term', label: '用語解説', icon: 'i-book' },
    '例':   { cls: 'example', label: '具体例', icon: 'i-bulb' },
    'ポイント': { cls: 'tip', label: '試験ポイント', icon: 'i-target' },
    '注意': { cls: 'warning', label: '注意', icon: 'i-alert' },
    '手順': { cls: 'steps', label: '操作手順', icon: 'i-list' },
    'まとめ': { cls: 'summary', label: 'まとめ', icon: 'i-flag' },
    '豆知識': { cls: 'trivia', label: '豆知識', icon: 'i-star' },
  };

  function transformCallouts(host) {
    host.querySelectorAll('blockquote').forEach(bq => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;
      const m = firstP.textContent.match(/^\s*\[!(用語|例|ポイント|注意|手順|まとめ|豆知識)\]\s*(.*)$/);
      if (!m) return;
      const def = CALLOUTS[m[1]];
      const title = (m[2] || '').trim();
      const box = document.createElement('div');
      box.className = 'callout ' + def.cls;
      const head = document.createElement('div');
      head.className = 'callout-head';
      head.innerHTML = '<svg class="ico"><use href="#' + def.icon + '"/></svg><span>' +
        escapeHtml(def.label) + (title ? '：' + escapeHtml(title) : '') + '</span>';
      const body = document.createElement('div');
      body.className = 'callout-body';
      firstP.remove();
      while (bq.firstChild) body.appendChild(bq.firstChild);
      box.appendChild(head); box.appendChild(body);
      bq.parentNode.replaceChild(box, bq);
    });
  }

  // 「学習の目的」見出し＋直後のリストを、目立つ要点カードにまとめる
  function transformGoals(host) {
    const heads = [].slice.call(host.querySelectorAll('h1,h2,h3'));
    for (const h of heads) {
      const t = h.textContent.trim();
      if (!(t.length <= 16 && /(学習の目的|この単元で学ぶこと|学習目標)/.test(t))) continue;
      const card = document.createElement('div');
      card.className = 'goals';
      h.parentNode.insertBefore(card, h);
      // 見出しにアイコンを付与してカード内へ
      h.classList.add('goals-head');
      h.innerHTML = '<svg class="ico"><use href="#i-target"/></svg>この単元で学ぶこと';
      card.appendChild(h);
      // 次の見出し/区切り線までをカードに取り込む
      while (card.nextSibling) {
        const n = card.nextSibling;
        if (n.nodeType === 1 && (/^H[1-3]$/.test(n.nodeName) || n.nodeName === 'HR')) break;
        card.appendChild(n);
      }
      break; // 最初の1つだけ
    }
  }

  // Markdown 文字列 → 後処理済み HTML 要素
  function renderMarkdown(md) {
    const host = document.createElement('div');
    host.className = 'prose';
    host.innerHTML = window.marked ? marked.parse(md) : escapeHtml(md);

    transformCallouts(host);

    let hc = 0;
    host.querySelectorAll('h1,h2,h3').forEach(h => { h.id = 'h-' + (hc++); });

    // 「学習の目的」を要点サマリーカードに変換
    transformGoals(host);

    host.querySelectorAll('table').forEach(tb => {
      const w = document.createElement('div'); w.className = 'table-wrap';
      tb.parentNode.insertBefore(w, tb); w.appendChild(tb);
    });

    host.querySelectorAll('pre > code').forEach(code => {
      const pre = code.parentElement;
      const cls = (code.className || '').match(/language-([\w-]+)/);
      const lang = cls ? cls[1] : '';

      // mermaid フェンスは後で SVG に描画するためのプレースホルダに置き換える
      if (lang === 'mermaid') {
        const ph = document.createElement('div');
        ph.className = 'mermaid-src';
        ph.setAttribute('data-code', code.textContent);
        pre.replaceWith(ph);
        return;
      }

      // 言語なし/text フェンスは「図解・例」パネルとして描画(コード扱いしない)
      if (!lang || lang === 'text' || lang === 'plain' || lang === 'plaintext') {
        const isFig = /[─│┌┐└┘├┤┬┴┼▼▲◀▶◁▷←→↓↑⇒⇄║═╔╗╚╝•·]/.test(code.textContent);
        const fig = document.createElement('figure');
        fig.className = 'diagram' + (isFig ? ' is-figure' : '');
        fig.innerHTML = '<span class="diagram-tag">' + (isFig ? '図解' : 'コード例') + '</span>';
        pre.parentNode.insertBefore(fig, pre);
        fig.appendChild(pre);
        return;
      }

      const pl = prismLang(lang);
      if (pl && window.Prism && Prism.languages[pl]) {
        code.className = 'language-' + pl;
        try { Prism.highlightElement(code); } catch (e) {}
      }
      const block = document.createElement('div'); block.className = 'code-block';
      const bar = document.createElement('div'); bar.className = 'code-bar';
      bar.innerHTML = '<span class="code-lang">' + escapeHtml(langLabel(lang)) +
        '</span><button class="copy-btn" type="button"><svg class="ico"><use href="#i-copy"/></svg><span class="ct">コピー</span></button>';
      pre.parentNode.insertBefore(block, pre);
      block.appendChild(bar); block.appendChild(pre);
      bar.querySelector('.copy-btn').addEventListener('click', function () {
        const txt = code.textContent;
        const lbl = this.querySelector('.ct');
        const ok = () => { this.classList.add('copied'); lbl.textContent = 'コピー完了'; setTimeout(() => { this.classList.remove('copied'); lbl.textContent = 'コピー'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(() => fallbackCopy(txt, ok));
        else fallbackCopy(txt, ok);
      });
    });
    return host;
  }
  function fallbackCopy(txt, ok) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) {} document.body.removeChild(ta);
  }

  // ----- サイドバー描画 -----
  const nav = document.getElementById('nav');
  function buildNav() {
    nav.innerHTML = '';
    DATA.topics.forEach((t, ti) => {
      const topic = document.createElement('div');
      topic.className = 'nav-topic'; topic.dataset.ti = ti;
      const btn = document.createElement('button');
      btn.innerHTML = '<span class="t-num">' + t.num + '</span>' +
        '<span class="t-title">' + escapeHtml(t.title) + '</span>' +
        '<span class="t-done">' + topicDoneCount(t) + '/' + t.units.length + '</span>' +
        '<svg class="ico t-chev"><use href="#i-chevron"/></svg>';
      btn.addEventListener('click', () => topic.classList.toggle('open'));
      topic.appendChild(btn);

      const list = document.createElement('div'); list.className = 'nav-units';
      let lastSection = null;
      t.units.forEach(u => {
        if (u.section && u.section !== lastSection) {
          const s = document.createElement('div'); s.className = 'nav-section';
          s.textContent = u.section; list.appendChild(s); lastSection = u.section;
        }
        const ub = document.createElement('button');
        ub.className = 'nav-unit' + (isDone(u.id) ? ' done' : '');
        ub.dataset.id = u.id;
        ub.innerHTML = '<span class="dot"><svg class="ico"><use href="#i-check"/></svg></span><span>' + escapeHtml(u.title) + '</span>';
        ub.addEventListener('click', () => { go('#/' + u.id); closeDrawer(); });
        list.appendChild(ub);
      });
      topic.appendChild(list);
      nav.appendChild(topic);
    });
  }
  function syncNavState(activeId) {
    nav.querySelectorAll('.nav-unit').forEach(b => b.classList.toggle('active', b.dataset.id === activeId));
    nav.querySelectorAll('.nav-topic').forEach(tp => {
      const t = DATA.topics[+tp.dataset.ti];
      tp.querySelector('.t-done').textContent = topicDoneCount(t) + '/' + t.units.length;
      tp.querySelectorAll('.nav-unit').forEach(b => b.classList.toggle('done', isDone(b.dataset.id)));
    });
    if (activeId) {
      const u = unitById[activeId];
      if (u) { const tp = nav.querySelector('.nav-topic[data-ti="' + u._ti + '"]'); if (tp && !tp.classList.contains('open')) tp.classList.add('open'); }
      const act = nav.querySelector('.nav-unit.active');
      if (act) act.scrollIntoView({ block: 'nearest' });
    }
  }

  // ----- 全体進捗バー -----
  function updateGlobalProgress() {
    const pct = units.length ? Math.round(globalDoneCount() / units.length * 100) : 0;
    document.getElementById('globalBar').style.width = pct + '%';
    document.getElementById('globalPct').textContent = pct + '%';
  }

  // ----- 記事描画 -----
  const articleEl = document.getElementById('article');
  const tocEl = document.getElementById('toc');
  const contentEl = document.getElementById('content');

  function renderUnit(u) {
    document.getElementById('searchResults').hidden = true;
    articleEl.hidden = false;
    localStorage.setItem(LS.last, u.id);

    const t = u._t;
    const head = document.createElement('div'); head.className = 'unit-head';
    const crumb = '<div class="crumb"><b>' + t.num + '</b><span class="sep">›</span><b>' + escapeHtml(t.title) + '</b>' +
      (u.section ? '<span class="sep">›</span><span>' + escapeHtml(u.section) + '</span>' : '') + '</div>';
    head.innerHTML = crumb +
      '<span class="unit-eyebrow"><svg class="ico"><use href="#i-book"/></svg>ユニット ' + (u._ui + 1) + ' / ' + t.units.length + '</span>' +
      '<h1 class="unit-title">' + escapeHtml(u.title) + '</h1>';
    const doneBtn = document.createElement('button');
    doneBtn.className = 'done-toggle' + (isDone(u.id) ? ' done' : '');
    doneBtn.innerHTML = '<span class="box"><svg class="ico"><use href="#i-check"/></svg></span><span class="lbl">' +
      (isDone(u.id) ? 'このユニットを完了済み' : 'このユニットを完了にする') + '</span>';
    doneBtn.addEventListener('click', () => {
      if (isDone(u.id)) delete done[u.id]; else done[u.id] = 1;
      saveDone();
      doneBtn.classList.toggle('done', isDone(u.id));
      doneBtn.querySelector('.lbl').textContent = isDone(u.id) ? 'このユニットを完了済み' : 'このユニットを完了にする';
      syncNavState(u.id); updateGlobalProgress();
    });
    head.appendChild(doneBtn);

    const body = renderMarkdown(u.content);

    const prev = units[u._idx - 1], next = units[u._idx + 1];
    const pager = document.createElement('nav'); pager.className = 'pager';
    pager.innerHTML =
      (prev ? '<a href="#/' + prev.id + '"><span class="lbl"><svg class="ico"><use href="#i-arrow-left"/></svg>前のユニット</span><span class="ttl">' + escapeHtml(prev.title) + '</span></a>' : '<a class="empty"></a>') +
      (next ? '<a class="next" href="#/' + next.id + '"><span class="lbl">次のユニット<svg class="ico"><use href="#i-arrow-right"/></svg></span><span class="ttl">' + escapeHtml(next.title) + '</span></a>' : '<a class="empty"></a>');

    articleEl.innerHTML = '';
    articleEl.appendChild(head);
    articleEl.appendChild(body);
    articleEl.appendChild(pager);

    buildToc(body);
    syncNavState(u.id);
    renderMermaidIn(articleEl);
    contentEl.scrollTop = 0; window.scrollTo(0, 0);
    document.title = u.title + ' | Platform デベロッパー学習ノート';
  }

  // ----- Mermaid 図のレンダリング -----
  let mermaidSeq = 0;
  function renderMermaidIn(container) {
    if (!window.mermaid) return;
    const nodes = [].slice.call(container.querySelectorAll('.mermaid-src'));
    if (!nodes.length) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        flowchart: { curve: 'basis', useMaxWidth: true },
        themeVariables: { fontSize: '14px' },
      });
    } catch (e) {}
    nodes.forEach(node => {
      const codeText = node.getAttribute('data-code') || '';
      const id = 'mmd-' + (++mermaidSeq) + '-' + Math.floor(Math.random() * 1e6);
      mermaid.render(id, codeText).then(res => {
        const fig = document.createElement('figure');
        fig.className = 'diagram is-figure mermaid-fig';
        fig.innerHTML = '<span class="diagram-tag">図解</span>' + res.svg;
        if (node.parentNode) node.replaceWith(fig);
      }).catch(() => {
        // 失敗時はコードをそのまま図解パネルに表示(壊さない)
        const fig = document.createElement('figure');
        fig.className = 'diagram';
        const pre = document.createElement('pre');
        pre.textContent = codeText;
        fig.appendChild(pre);
        if (node.parentNode) node.replaceWith(fig);
      });
    });
  }

  // ----- オンページ目次 + スクロールスパイ -----
  let spyHandler = null;
  function buildToc(body) {
    const heads = [].slice.call(body.querySelectorAll('h2,h3'));
    if (spyHandler) { window.removeEventListener('scroll', spyHandler, true); spyHandler = null; }
    if (heads.length < 2) { tocEl.innerHTML = ''; return; }
    let html = '<div class="toc-inner"><div class="toc-title">このページの内容</div>';
    heads.forEach(h => {
      html += '<a href="#" data-tid="' + h.id + '" class="' + (h.tagName === 'H3' ? 'lv3' : '') + '">' + escapeHtml(h.textContent) + '</a>';
    });
    tocEl.innerHTML = html + '</div>';
    tocEl.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const el = document.getElementById(a.dataset.tid);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    }));
    const links = [].slice.call(tocEl.querySelectorAll('a'));
    spyHandler = () => {
      let cur = heads[0];
      for (const h of heads) { if (h.getBoundingClientRect().top <= 90) cur = h; else break; }
      links.forEach(l => l.classList.toggle('active', l.dataset.tid === cur.id));
    };
    window.addEventListener('scroll', spyHandler, true);
    spyHandler();
  }

  // ----- ホーム(ダッシュボード) -----
  function renderHome() {
    document.getElementById('searchResults').hidden = true;
    articleEl.hidden = false;
    tocEl.innerHTML = '';
    if (spyHandler) { window.removeEventListener('scroll', spyHandler, true); spyHandler = null; }
    syncNavState(null);
    const gpct = units.length ? Math.round(globalDoneCount() / units.length * 100) : 0;
    const last = localStorage.getItem(LS.last);
    const lastU = last && unitById[last];

    let cards = '';
    DATA.topics.forEach(t => {
      const dc = topicDoneCount(t), pct = Math.round(dc / t.units.length * 100);
      cards += '<a class="topic-card' + (dc === t.units.length ? ' complete' : '') + '" href="#/' + t.units[0].id + '">' +
        '<div class="tc-top"><span class="tc-num">' + t.num + '</span><span class="tc-title">' + escapeHtml(t.title) + '</span></div>' +
        '<div class="tc-bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="tc-meta"><span>' + t.units.length + ' ユニット</span><span>' + pct + '% 完了</span></div></a>';
    });

    articleEl.innerHTML =
      '<div class="home"><div class="hero">' +
      '<h1>Salesforce 認定 Platform デベロッパー 学習ノート</h1>' +
      '<p>Trailhead の教材をもとに、試験範囲を体系的に学習できる完全オフライン教材です。左のメニューから各トピックを開き、ユニットを読み進めて「完了」をチェックしながら進捗を管理しましょう。</p>' +
      '<div class="hero-stats"><div><b>' + DATA.topics.length + '</b><span>トピック</span></div>' +
      '<div><b>' + units.length + '</b><span>ユニット</span></div>' +
      '<div><b>' + gpct + '%</b><span>学習進捗</span></div></div></div>' +
      '<div class="home-prog"><span class="big-pct">' + gpct + '%</span>' +
      '<div class="big-bar"><span style="width:' + gpct + '%"></span></div>' +
      (lastU ? '<div class="resume"><a href="#/' + lastU.id + '"><svg class="ico"><use href="#i-book"/></svg>学習を再開</a></div>' : '') +
      '</div>' +
      '<h2 class="sec"><svg class="ico" style="width:16px;color:var(--blue)"><use href="#i-target"/></svg>トピック一覧</h2>' +
      '<div class="topic-grid">' + cards + '</div></div>';
    contentEl.scrollTop = 0; window.scrollTo(0, 0);
    document.title = 'Platform デベロッパー学習ノート';
  }

  // ----- 検索 -----
  const searchInput = document.getElementById('searchInput');
  const searchCount = document.getElementById('searchCount');
  const searchResults = document.getElementById('searchResults');
  let searchTimer = null;

  function plain(md) { return md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`_\|]/g, ' ').replace(/\s+/g, ' '); }
  units.forEach(u => { u._plain = plain(u.content); u._lc = (u.title + ' ' + u._plain).toLowerCase(); });

  function runSearch(q) {
    q = q.trim();
    if (!q) { searchResults.hidden = true; articleEl.hidden = false; searchCount.textContent = ''; return; }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = units.filter(u => terms.every(t => u._lc.includes(t)));
    searchCount.textContent = hits.length + '件';
    articleEl.hidden = true; tocEl.innerHTML = ''; searchResults.hidden = false;
    if (!hits.length) {
      searchResults.innerHTML = '<div class="sr-empty">「' + escapeHtml(q) + '」に一致する教材は見つかりませんでした。</div>';
      return;
    }
    const re = new RegExp('(' + terms.map(escapeReg).join('|') + ')', 'gi');
    let html = '<div class="sr-head"><b>' + hits.length + '</b> 件のユニットが一致しました</div>';
    hits.forEach(u => {
      html += '<a class="sr-item" href="#/' + u.id + '">' +
        '<div class="sr-crumb">' + u._t.num + '. ' + escapeHtml(u._t.title) + (u.section ? ' › ' + escapeHtml(u.section) : '') + '</div>' +
        '<div class="sr-title">' + hl(u.title, re) + '</div>' +
        '<div class="sr-snippet">' + snippet(u._plain, terms[0], re) + '</div></a>';
    });
    searchResults.innerHTML = html;
    contentEl.scrollTop = 0;
  }
  function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hl(text, re) { return escapeHtml(text).replace(re, '<mark>$1</mark>'); }
  function snippet(text, term, re) {
    const i = text.toLowerCase().indexOf(term);
    let s = i < 0 ? text.slice(0, 160) : text.slice(Math.max(0, i - 60), i + 120);
    if (i > 60) s = '…' + s;
    return hl(s, re);
  }
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(searchInput.value), 160);
  });

  // ----- ルーティング -----
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    const h = location.hash;
    if (h.indexOf('#/') === 0) {
      const u = unitById[h.slice(2)];
      if (u) { renderUnit(u); return; }
    }
    renderHome();
  }
  window.addEventListener('hashchange', route);

  // ----- モバイルドロワー -----
  const sidebar = document.getElementById('sidebar'), scrim = document.getElementById('scrim');
  function closeDrawer() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); });
  scrim.addEventListener('click', closeDrawer);

  // ----- キーボードショートカット -----
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
    else if (e.key === 'Escape' && document.activeElement === searchInput) { searchInput.value = ''; runSearch(''); searchInput.blur(); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement !== searchInput && searchResults.hidden) {
      const cur = unitById[location.hash.slice(2)];
      if (cur) { const n = units[cur._idx + (e.key === 'ArrowRight' ? 1 : -1)]; if (n) go('#/' + n.id); }
    }
  });

  // ----- 初期化 -----
  buildNav();
  updateGlobalProgress();
  route();
})();
