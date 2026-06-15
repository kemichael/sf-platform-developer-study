(function () {
  'use strict';
  const LS_THEME = 'sfpd-theme';

  // テーマ（本編とキー共有）
  const applyTheme = th => { document.documentElement.setAttribute('data-theme', th); localStorage.setItem(LS_THEME, th); };
  applyTheme(localStorage.getItem(LS_THEME) || 'light');

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const langLabel = l => ({ apex: 'Apex', java: 'Java', sql: 'SOQL / SQL', soql: 'SOQL', js: 'JavaScript', javascript: 'JavaScript', html: 'HTML', markup: 'HTML', xml: 'XML', bash: 'シェル', shell: 'シェル', json: 'JSON', css: 'CSS' }[(l || '').toLowerCase()] || (l ? l.toUpperCase() : 'コード'));
  const prismLang = l => { l = (l || '').toLowerCase(); if (l === 'soql') return 'sql'; if (l === 'shell' || l === 'sh') return 'bash'; if (l === 'xml') return 'markup'; if (l === 'js') return 'javascript'; return l; };

  const CALLOUTS = {
    '用語': { cls: 'term', label: '用語解説', icon: 'i-book' },
    '例': { cls: 'example', label: '具体例', icon: 'i-bulb' },
    'ポイント': { cls: 'tip', label: '試験ポイント', icon: 'i-target' },
    '注意': { cls: 'warning', label: '注意', icon: 'i-alert' },
    '手順': { cls: 'steps', label: '操作手順', icon: 'i-list' },
    'まとめ': { cls: 'summary', label: 'まとめ', icon: 'i-flag' },
  };

  function transformCallouts(host) {
    host.querySelectorAll('blockquote').forEach(bq => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;
      const m = firstP.textContent.match(/^\s*\[!(用語|例|ポイント|注意|手順|まとめ)\]\s*(.*)$/);
      if (!m) return;
      const def = CALLOUTS[m[1]];
      const title = (m[2] || '').trim();
      const box = document.createElement('div'); box.className = 'callout ' + def.cls;
      const head = document.createElement('div'); head.className = 'callout-head';
      head.innerHTML = '<svg class="ico"><use href="#' + def.icon + '"/></svg><span>' + escapeHtml(def.label) + (title ? '：' + escapeHtml(title) : '') + '</span>';
      const body = document.createElement('div'); body.className = 'callout-body';
      firstP.remove();
      while (bq.firstChild) body.appendChild(bq.firstChild);
      box.appendChild(head); box.appendChild(body);
      bq.parentNode.replaceChild(box, bq);
    });
  }

  function render() {
    const host = document.getElementById('doc');
    host.innerHTML = window.marked ? marked.parse(window.__DOC__ || '') : '';
    transformCallouts(host);
    host.querySelectorAll('h1,h2,h3').forEach((h, i) => { h.id = 'h-' + i; });
    host.querySelectorAll('table').forEach(tb => { const w = document.createElement('div'); w.className = 'table-wrap'; tb.parentNode.insertBefore(w, tb); w.appendChild(tb); });

    host.querySelectorAll('pre > code').forEach(code => {
      const pre = code.parentElement;
      const cls = (code.className || '').match(/language-([\w-]+)/);
      const lang = cls ? cls[1] : '';
      if (lang === 'mermaid') {
        const ph = document.createElement('div'); ph.className = 'mermaid-src'; ph.setAttribute('data-code', code.textContent);
        pre.replaceWith(ph); return;
      }
      if (!lang || lang === 'text' || lang === 'plain') {
        const isFig = /[─│┌┐└┘├┤┬┴┼▼▲◀▶←→↓↑⇒⇄║═╔╗╚╝•·]/.test(code.textContent);
        const fig = document.createElement('figure'); fig.className = 'diagram' + (isFig ? ' is-figure' : '');
        fig.innerHTML = '<span class="diagram-tag">' + (isFig ? '図解' : 'コード例') + '</span>';
        pre.parentNode.insertBefore(fig, pre); fig.appendChild(pre); return;
      }
      const pl = prismLang(lang);
      if (pl && window.Prism && Prism.languages[pl]) { code.className = 'language-' + pl; try { Prism.highlightElement(code); } catch (e) {} }
      const block = document.createElement('div'); block.className = 'code-block';
      const bar = document.createElement('div'); bar.className = 'code-bar';
      bar.innerHTML = '<span class="code-lang">' + escapeHtml(langLabel(lang)) + '</span><button class="copy-btn" type="button"><svg class="ico"><use href="#i-copy"/></svg><span class="ct">コピー</span></button>';
      pre.parentNode.insertBefore(block, pre); block.appendChild(bar); block.appendChild(pre);
      bar.querySelector('.copy-btn').addEventListener('click', function () {
        const txt = code.textContent, lbl = this.querySelector('.ct');
        const ok = () => { this.classList.add('copied'); lbl.textContent = 'コピー完了'; setTimeout(() => { this.classList.remove('copied'); lbl.textContent = 'コピー'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok).catch(() => {});
      });
    });
    renderMermaid(host);
  }

  let seq = 0;
  function renderMermaid(container) {
    if (!window.mermaid) return;
    const nodes = [].slice.call(container.querySelectorAll('.mermaid-src'));
    if (!nodes.length) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    try { mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'loose', fontFamily: 'inherit', flowchart: { curve: 'basis', useMaxWidth: true } }); } catch (e) {}
    nodes.forEach(node => {
      const code = node.getAttribute('data-code') || '';
      const id = 'mmd-' + (++seq) + '-' + Math.floor(Math.random() * 1e6);
      mermaid.render(id, code).then(res => {
        const fig = document.createElement('figure'); fig.className = 'diagram is-figure mermaid-fig';
        fig.innerHTML = '<span class="diagram-tag">図解</span>' + res.svg;
        if (node.parentNode) node.replaceWith(fig);
      }).catch(() => {
        const fig = document.createElement('figure'); fig.className = 'diagram';
        const pre = document.createElement('pre'); pre.textContent = code; fig.appendChild(pre);
        if (node.parentNode) node.replaceWith(fig);
      });
    });
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    render();
  });

  render();
})();
