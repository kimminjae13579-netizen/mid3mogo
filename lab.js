'use strict';
// ======================================================================
// 5. 실험실 — 문제 세트를 만들어 저장하고, 문제 옆 칠판에서 작도·필기
//   #/lab            저장한 문제 세트 목록 (+ 문제 만들기)
//   #/lab/new        새 세트 만들기 · #/lab/edit/<id> 고치기
//   #/lab/set/<id>   문제 + 칠판 + 답안지(★ 즐겨찾기)   (id 'fav' = 즐겨찾기 문제 모음)
// 저장: IndexedDB 'labset:<id>' 세트, 'labfav' 즐겨찾기 ['연도-번호'], 'labb:<연도>-<번호>' 칠판
// ======================================================================

(function () {
  const s = document.createElement('style');
  s.textContent = `
.lab{flex:1;display:flex;min-height:0;overflow:hidden}
.lab-q{flex:0 0 38%;display:flex;flex-direction:column;min-width:0;min-height:0;border-right:2px solid var(--line);background:var(--bg)}
.lab-qhead,.lab-tools{flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;background:#f7f6f2;border-bottom:1px solid #bdb8ad;min-height:48px;flex-wrap:wrap}
.lab-qhead .t{font-family:var(--serif);font-weight:700;flex:1;white-space:nowrap}
.lab-qimg{flex:1;overflow:auto;padding:12px}
.lab-qimg .wrap{position:relative;background:#fff;border:1px solid #c9c5bb;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.lab-qimg img{display:block;width:100%;user-select:none;-webkit-user-drag:none}
.lab-crop{position:absolute;inset:0;cursor:crosshair;touch-action:none;background:rgba(29,59,110,.07)}
.lab-crop .r{position:absolute;border:2px dashed var(--accent);background:rgba(29,59,110,.10)}
.lab-crop .msg{position:sticky;top:0;display:block;text-align:center;background:var(--accent);color:#fff;font-size:14px;padding:6px}
.lab-b{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.lab-tools{gap:3px;padding:6px 8px}
.lab-tools .tg{height:44px;min-width:44px;padding:0 12px;border:1.5px solid transparent;background:transparent;border-radius:6px;font-size:16px;white-space:nowrap}
.lab-tools .tg:hover{background:#ece9e1}
.lab-tools .tg.on{border-color:var(--line);background:#fff}
.lab-tools .tg.big{font-size:22px;padding:0 8px}
.lab-tools .tg.danger{color:#c62828;margin-left:auto}
.lab-tools .tg.help{font-weight:700;color:var(--accent);border-color:#c9c5bb;border-radius:50%;padding:0}
.lab-copy{background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important}
.lab-copy.on{box-shadow:0 0 0 3px #f2c94c}
.lab-helpcard{position:absolute;z-index:50;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100% - 32px));background:#fff;border:1.5px solid var(--line);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:16px 18px}
.lab-helpcard h4{margin:0 0 10px;font-family:var(--serif);font-size:18px}
.lab-helpcard ul{margin:0;padding:0;list-style:none;display:grid;gap:8px;font-size:15px}
.lab-helpcard li{display:flex;gap:10px;align-items:flex-start}
.lab-helpcard b{flex:none;min-width:118px;color:var(--accent)}
.lab-helpcard .ok{margin-top:14px;width:100%;height:44px;font-size:16px}
.lab-tools .tg small{font-size:11px;color:var(--sub);margin-left:2px}
.lab-tools .sep{width:1px;height:24px;background:#bdb8ad;margin:0 3px}
.lab-tools .dot{display:inline-block;width:16px;height:16px;border-radius:50%;vertical-align:middle}
.lab-menu{position:absolute;z-index:40;background:#fff;border:1.5px solid var(--line);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.18);padding:4px;display:flex;flex-direction:column;min-width:170px}
.lab-menu button{border:0;background:transparent;text-align:left;padding:9px 12px;font-size:15px;border-radius:4px;white-space:nowrap}
.lab-menu button:hover,.lab-menu button.on{background:var(--hl)}
.lab-host{flex:1;position:relative;background:#fff;overflow:hidden}
.lab-fab{position:absolute;z-index:35;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:2px solid var(--line);background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.25);touch-action:none;display:flex;align-items:center;justify-content:center;padding:0;cursor:grab;user-select:none;transition:opacity .2s}
.lab-fab svg{width:30px;height:30px;pointer-events:none}
.lab-fab.dim{opacity:.22}
.lab-fab.open{background:#e3e9f4}
.lab-ring{position:absolute;z-index:36;pointer-events:none;animation:labpop .06s ease-out}
.lab-ring g{pointer-events:auto;cursor:pointer}
.lab-ring g>path{fill:#fff;stroke:#3a3a3a;stroke-width:1.5;filter:drop-shadow(0 2px 4px rgba(0,0,0,.18))}
.lab-ring g:hover>path{fill:#eef2fa}
.lab-ring g.on>path{fill:#1d4fb3;stroke:#1d4fb3}
.lab-ring text{font-size:12px;fill:#222;text-anchor:middle;dominant-baseline:middle;user-select:none;font-family:inherit}
.lab-ring g.on text{fill:#fff;font-weight:700}
.lab-ring g svg{color:#222}
.lab-ring g.on svg{color:#fff}
.lab-ring .col circle{stroke:#fff;stroke-width:3;filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))}
.lab-ring .col.on circle{stroke:#f2c94c;stroke-width:4}
@keyframes labpop{from{transform:scale(.4);opacity:0}}
.lab-host canvas{position:absolute;left:0;top:0;touch-action:none}
.lab-hint{position:absolute;left:10px;bottom:8px;font-size:14px;color:#555;background:rgba(255,255,255,.92);padding:4px 10px;border-radius:5px;pointer-events:none;max-width:calc(100% - 20px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .8s}
.lab-hint.fade{opacity:0}
.lab-pop{position:absolute;z-index:45;background:#fff;border:1.5px solid var(--line);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.18);padding:5px;display:flex;gap:5px}
.lab-pop button{border:1.5px solid var(--line);background:#fff;border-radius:4px;padding:8px 13px;font-size:14px;white-space:nowrap}
.lab-pop button:hover{background:var(--hl)}
.lab-formula{position:absolute;left:10px;right:10px;bottom:36px;display:flex;gap:6px;z-index:30}
.lab-formula input{flex:1;border:1.5px solid var(--line);border-radius:4px;padding:8px 10px;font-size:18px;font-family:var(--serif);min-width:0;background:#fff}
.lab-sheet{flex:none;background:var(--paper);border-top:2px solid var(--line);padding:6px 10px 8px;max-height:34%;overflow:auto}
.lab-sheet .hd{display:flex;align-items:center;gap:10px;margin-bottom:5px}
.lab-sheet h4{margin:0;font-family:var(--serif);letter-spacing:4px;font-size:15px}
.lab-sheet .flt label{font-size:12px;display:flex;align-items:center;gap:3px;color:var(--sub)}
.lab-sheet [data-rows]{display:flex;flex-wrap:wrap;gap:4px}
.lab-sheet .r{display:flex;align-items:center;gap:2px;padding:3px 7px 3px 2px;border:1px solid var(--soft);border-radius:4px;cursor:pointer;background:#fff}
.lab-sheet .r:hover{background:var(--hl)}
.lab-sheet .r.cur{background:#e3e9f4;border-color:#9fb3d6}
.lab-sheet .star{border:0;background:transparent;font-size:22px;line-height:1;color:#c4c0b6;padding:0 2px}
.lab-sheet .star.on{color:#e0a100}
.lab-sheet .n{font-family:var(--serif);font-weight:700;font-size:20px;min-width:24px;text-align:center}
.lab-new{border:1.5px dashed var(--line);background:var(--paper);padding:18px;width:100%;font-family:var(--serif);font-weight:700;font-size:19px;margin-bottom:14px;border-radius:2px}
.lab-new:hover{background:var(--hl)}
@media (max-width:900px){
  .lab{flex-direction:column}.lab-q{flex:0 0 42%;border-right:0;border-bottom:2px solid var(--line)}.lab-b{min-height:0}
}`;
  document.head.appendChild(s);
})();

// ---------------- 저장 ----------------
let LABFAV = null;
async function labFavs() { if (!LABFAV) LABFAV = new Set((await DB.get('labfav')) || []); return LABFAV; }
async function labToggleFav(k) { const f = await labFavs(); f.has(k) ? f.delete(k) : f.add(k); await DB.set('labfav', [...f]); return f.has(k); }
const labKey = (y, n) => `${y}-${n}`;

async function labRoute(b, c) {
  if (b === 'new') return labEdit(null);
  if (b === 'edit') return labEdit(c);
  if (b === 'set') return labView(c);
  return labHome();
}

// ---------------- 목록 ----------------
async function labHome() {
  const sets = (await DB.all('labset:')).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const favs = await labFavs();
  const body = h(`<div>
    <div class="section-tag">실험실</div>
    <button class="lab-new" data-new>＋ 문제 만들기</button>
    ${favs.size ? `<div class="list" style="margin-bottom:14px"><div class="item" data-open="fav"><div class="main"><div class="t">★ 즐겨찾기 문제</div><div class="m">답안지에서 별을 누른 문제 ${favs.size}개</div></div></div></div>` : ''}
    <div class="list">${sets.map(s => `<div class="item" data-open="${s.id}"><div class="main"><div class="t">${esc(s.title)}</div><div class="m">${s.items.length}문항 · ${fmtDate(s.updated || s.created)}</div></div>
      <div class="acts"><button class="btn small" data-edit="${s.id}">고치기</button><button class="btn small" data-del="${s.id}">삭제</button></div></div>`).join('')}</div>
    ${sets.length ? '' : '<p class="muted">아직 저장한 문제가 없습니다. [＋ 문제 만들기]로 문제를 골라 저장하세요.</p>'}
  </div>`);
  body.addEventListener('click', async e => {
    if (e.target.closest('[data-new]')) return go('#/lab/new');
    const ed = e.target.closest('[data-edit]'); if (ed) return go('#/lab/edit/' + ed.dataset.edit);
    const del = e.target.closest('[data-del]');
    if (del) { if (confirm('이 문제 세트를 삭제할까요? (칠판에 그린 것은 남습니다)')) { await DB.del('labset:' + del.dataset.del); labHome(); } return; }
    const o = e.target.closest('[data-open]'); if (o) go('#/lab/set/' + o.dataset.open);
  });
  mount(screen('실험실', {}, body));
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- 문제 만들기 (4. 파일 저장과 같은 방식으로 고르기) ----------------
async function labEdit(id) {
  const old = id ? await DB.get('labset:' + id) : null;
  if (id && !old) return go('#/lab');
  let sel = old ? old.items.slice() : [];
  const ctx = { H: await histories(), wrong: new Set((await DB.all('wrong:')).map(e => `${e.y}-${e.n}`)) };
  let year = YEARS[YEARS.length - 1], found = null;
  const has = (y, n) => sel.some(s => s.y === y && s.n === n);
  const EXAMPLES = ['4점 문제만', '2024~2026 21번~30번', '3학년 이차함수', '도형의 닮음', '2학년 도형의 성질 4점'];
  const body = h(`<div>
    <div class="section-tag">실험실 · ${old ? '문제 고치기' : '문제 만들기'}</div>
    <div class="field"><span class="muted">이름</span><input type="text" data-title value="${old ? esc(old.title) : ''}" placeholder="예: 3학년 원의 성질 수업"></div>
    <div class="h3">1. 원하는 문제를 말로 찾기</div>
    <div class="query"><input type="text" data-q placeholder="예: 2023~2026 4점 문제만 / 3학년 삼각비"><button class="btn" data-qgo>찾기</button></div>
    <div class="examples">${EXAMPLES.map(x => `<button data-ex>${x}</button>`).join('')}</div>
    <div class="qres" data-qres></div>
    <div class="h3">2. 직접 고르기</div>
    <div class="chips" data-years>${YEARS.map(y => `<button class="chip" data-y="${y}">${y}</button>`).join('')}</div>
    <div class="nums" style="margin-top:12px" data-nums></div>
    <div class="bulk">
      <button data-allyear></button>
      <button data-wrong>오답노트 문제 모두 추가</button>
      <select data-unit><option value="">단원 전체 추가 ▾</option>${GRADES.map(g => `<optgroup label="${g}학년">${unitsOf(g).map(u => `<option value="${u}">${unitName(u)}</option>`).join('')}</optgroup>`).join('')}</select>
    </div>
    <div class="h3">3. 고른 문제 <span class="muted" data-count></span> <button class="btn small" data-clear style="float:right">모두 비우기</button></div>
    <div class="sel-list" data-list></div>
    <div style="margin-top:22px;display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-cancel>취소</button><button class="btn primary" data-save>저장</button></div>
  </div>`);
  const nums = body.querySelector('[data-nums]'), list = body.querySelector('[data-list]'), qres = body.querySelector('[data-qres]'), qin = body.querySelector('[data-q]');
  const render = () => {
    body.querySelectorAll('[data-y]').forEach(c => c.classList.toggle('on', +c.dataset.y === year));
    body.querySelector('[data-allyear]').textContent = `${year}학년도 전체 추가`;
    nums.innerHTML = ALL_NUMS.map(k => `<button class="num ${has(year, k) ? 'sel' : ''}" data-k="${k}">${k}</button>`).join('');
    body.querySelector('[data-count]').textContent = `(${sel.length}문항)`;
    list.innerHTML = sel.length ? '' : '<div class="r muted">위에서 문제를 고르세요.</div>';
    sel.forEach((s, i) => {
      const it = item(s.y, s.n);
      const r = h(`<div class="r"><span class="k">${i + 1}.</span><span class="t">${s.y}학년도 ${s.n}번 · ${it.score}점 · ${unitShort(it.unit)}</span><button class="btn small" data-up ${i ? '' : 'disabled'}>↑</button><button class="btn small" data-down ${i < sel.length - 1 ? '' : 'disabled'}>↓</button><button class="btn small" data-x>✕</button></div>`);
      r.querySelector('[data-up]').onclick = () => { [sel[i - 1], sel[i]] = [sel[i], sel[i - 1]]; render(); };
      r.querySelector('[data-down]').onclick = () => { [sel[i + 1], sel[i]] = [sel[i], sel[i + 1]]; render(); };
      r.querySelector('[data-x]').onclick = () => { sel.splice(i, 1); render(); };
      list.appendChild(r);
    });
  };
  const add = (y, n) => { if (!has(y, n)) sel.push({ y, n }); };
  const runQuery = () => {
    const q = qin.value.trim();
    if (!q) { qres.innerHTML = ''; found = null; return; }
    const r = parseQuery(q, ctx);
    if (r.error) { qres.innerHTML = `<span style="color:var(--bad)">${r.error}</span>`; found = null; return; }
    found = r.items;
    qres.innerHTML = `<div>${r.tags.map(t => `<span class="tag">${t}</span>`).join('')} → <b>${found.length}문항</b></div>
      ${found.length ? `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primary" data-qadd>목록에 추가</button><button class="btn" data-qset>이 문제들로 새로 담기</button></div>` : ''}`;
  };
  let qt = null;
  qin.oninput = () => { clearTimeout(qt); qt = setTimeout(runQuery, 250); };
  qin.onkeydown = e => { if (e.key === 'Enter') runQuery(); };
  body.querySelector('[data-qgo]').onclick = runQuery;
  body.querySelector('.examples').onclick = e => { const b = e.target.closest('[data-ex]'); if (b) { qin.value = b.textContent; runQuery(); } };
  qres.onclick = e => {
    if (!found) return;
    const set = e.target.closest('[data-qset]');
    if (!set && !e.target.closest('[data-qadd]')) return;
    if (set) sel = [];
    const before = sel.length; found.forEach(s => add(s.y, s.n)); render();
    toast(`${sel.length - before}문항을 담았습니다`);
  };
  body.querySelector('[data-years]').onclick = e => { const c = e.target.closest('[data-y]'); if (c) { year = +c.dataset.y; render(); } };
  nums.onclick = e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = +b.dataset.k;
    if (has(year, k)) sel = sel.filter(s => !(s.y === year && s.n === k)); else add(year, k);
    render();
  };
  body.querySelector('[data-allyear]').onclick = () => { for (let k = 1; k <= 30; k++) add(year, k); render(); };
  body.querySelector('[data-wrong]').onclick = async () => {
    const w = (await DB.all('wrong:')).sort((a, b) => a.y - b.y || a.n - b.n);
    if (!w.length) return toast('오답노트가 비어 있습니다');
    w.forEach(e => add(e.y, e.n)); render();
  };
  body.querySelector('[data-unit]').onchange = e => {
    const u = +e.target.value; if (!u) return;
    for (const y of YEARS) for (const it of D[y]) if (it.unit === u) add(y, it.n);
    e.target.value = ''; render();
  };
  body.querySelector('[data-clear]').onclick = () => { if (sel.length && confirm('고른 문제를 모두 비울까요?')) { sel = []; render(); } };
  body.querySelector('[data-cancel]').onclick = () => go('#/lab');
  body.querySelector('[data-save]').onclick = async () => {
    if (!sel.length) return toast('문제를 먼저 고르세요');
    const title = body.querySelector('[data-title]').value.trim() || `${sel.length}문항 (${new Date().toLocaleDateString('ko-KR')})`;
    const s = old || { id: uid(), created: Date.now() };
    Object.assign(s, { title, items: sel, updated: Date.now() });
    await DB.set('labset:' + s.id, s);
    toast('저장했습니다'); go('#/lab');
  };
  render();
  mount(screen(old ? '문제 고치기' : '문제 만들기', { back: '#/lab' }, body));
}

// ---------------- 세트 보기: 문제 | 칠판 | 답안지 ----------------
async function labView(id) {
  const favs = await labFavs();
  let set;
  if (id === 'fav') {
    const items = [...favs].map(k => { const [y, n] = k.split('-').map(Number); return { y, n }; }).filter(s => D[s.y]).sort((a, b) => a.y - b.y || a.n - b.n);
    if (!items.length) { toast('즐겨찾기한 문제가 없습니다'); return go('#/lab'); }
    set = { id: 'fav', title: '★ 즐겨찾기 문제', items };
  } else {
    set = await DB.get('labset:' + id);
    if (!set) return go('#/lab');
  }
  let cur = Math.min(set.cur || 0, set.items.length - 1), board = null, onlyFav = false;
  const el = h(`<div style="display:flex;flex-direction:column;height:100%"></div>`);
  el.appendChild(topbar(esc(set.title), { back: '#/lab' }));
  // 왼쪽: 문제 + 그 아래 가로 답안지 / 오른쪽 전부: 칠판
  const lab = h(`<div class="lab">
    <div class="lab-q"><div class="lab-qhead"><span class="t"></span><button class="btn small lab-copy" data-copy>⧉ 그림 복사하기</button></div><div class="lab-qimg"><div class="wrap"><img alt="문제"></div></div>
      <div class="lab-sheet"><div class="hd"><h4>답안지</h4><span class="flt"><label><input type="checkbox" data-only> ★만 보기</label></span></div><div data-rows></div></div>
    </div>
    <div class="lab-b"></div>
  </div>`);
  el.appendChild(lab);
  const qT = lab.querySelector('.lab-qhead .t'), img = lab.querySelector('.lab-qimg img'), wrap = lab.querySelector('.lab-qimg .wrap');
  const bpane = lab.querySelector('.lab-b'), rows = lab.querySelector('[data-rows]');

  function renderSheet() {
    rows.innerHTML = '';
    set.items.forEach((s, i) => {
      const k = labKey(s.y, s.n), on = favs.has(k);
      if (onlyFav && !on) return;
      const r = h(`<div class="r ${i === cur ? 'cur' : ''}" title="${s.y}학년도 ${s.n}번"><button class="star ${on ? 'on' : ''}" title="즐겨찾기">${on ? '★' : '☆'}</button><span class="n">${s.n}</span></div>`);
      r.querySelector('.star').onclick = async e => { e.stopPropagation(); await labToggleFav(k); renderSheet(); };
      r.onclick = () => show(i);
      rows.appendChild(r);
    });
    if (!rows.children.length) rows.innerHTML = '<span class="muted" style="font-size:12px">별을 누른 문제가 없습니다</span>';
  }
  lab.querySelector('[data-only]').onchange = e => { onlyFav = e.target.checked; renderSheet(); };

  async function show(i) {
    if (board) { await board.flush(); board.destroy(); }
    cur = i;
    if (set.id !== 'fav') { set.cur = i; DB.set('labset:' + set.id, set); }
    const s = set.items[i], it = item(s.y, s.n);
    qT.textContent = `${i + 1}. ${s.y}학년도 3월 ${s.n}번 [${it.score}점]`;
    img.src = it.q.src;
    cropOff();
    const data = (await DB.get('labb:' + labKey(s.y, s.n))) || null;
    board = new Board(bpane, data, d => DB.set('labb:' + labKey(s.y, s.n), d));
    window.labBoard = board;   // (개발자 도구에서 살펴보기용)
    NAV = { prev: i > 0 ? () => show(i - 1) : null, next: i < set.items.length - 1 ? () => show(i + 1) : null };
    renderSheet();
  }

  // 그림 복사하기: 문제 그림의 그림 부분(미리 찾아 둔 자리, 없으면 드래그로 고름)에서 선분·원·점·글자를 찾아 칠판에 직접 그린 도형으로 넣는다
  let crop = null;
  function cropOff() { if (crop) { crop.remove(); crop = null; } lab.querySelector('[data-copy]').classList.remove('on'); }
  lab.querySelector('[data-copy]').onclick = () => {
    if (crop) return cropOff();
    // 미리 만들어 둔 그림(figs.js)이 있는 문제는 그것을 바로 넣는다
    const s = set.items[cur], pre = window.LAB_FIGS && window.LAB_FIGS[`${s.y}-${s.n}`];
    if (pre) { board.insertFigure(figFromDSL(pre)); toast('그림을 칠판에 옮겼습니다'); return; }
    // 나머지 문제: 미리 찾아 둔 그림 자리(LAB_FIGBOX)를 바로 읽어 옮긴다. 자리가 없는 문제만 드래그로 고름
    const fb = window.LAB_FIGBOX && window.LAB_FIGBOX[`${s.y}-${s.n}`];
    if (fb) {
      (async () => {
        try { if (!img.complete || !img.naturalWidth) await new Promise((ok, no) => { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', no, { once: true }); });
          const fig = await vectorizeFigure(img, fb.slice()); board.insertFigure(fig); toast('그림을 칠판에 옮겼습니다'); }
        catch (err) { console.error(err); toast('그림을 옮기지 못했습니다: ' + err.message); }
      })();
      return;
    }
    lab.querySelector('[data-copy]').classList.add('on');
    crop = h(`<div class="lab-crop"><span class="msg">그림 부분을 드래그해서 고르세요</span><div class="r" hidden></div></div>`);
    wrap.appendChild(crop);
    const r = crop.querySelector('.r'); let st = null;
    const P = e => { const b = wrap.getBoundingClientRect(); return [Math.max(0, Math.min(b.width, e.clientX - b.left)), Math.max(0, Math.min(b.height, e.clientY - b.top))]; };
    crop.onpointerdown = e => { try { crop.setPointerCapture(e.pointerId); } catch (_) {} st = P(e); r.hidden = false; Object.assign(r.style, { left: st[0] + 'px', top: st[1] + 'px', width: 0, height: 0 }); };
    crop.onpointermove = e => {
      if (!st) return; const p = P(e);
      Object.assign(r.style, { left: Math.min(st[0], p[0]) + 'px', top: Math.min(st[1], p[1]) + 'px', width: Math.abs(p[0] - st[0]) + 'px', height: Math.abs(p[1] - st[1]) + 'px' });
    };
    crop.onpointerup = async e => {
      if (!st) return; const p = P(e), a = st; st = null;
      const w = Math.abs(p[0] - a[0]), hh = Math.abs(p[1] - a[1]);
      if (w < 15 || hh < 15) { r.hidden = true; return; }
      const k = img.naturalWidth / wrap.clientWidth;
      const box = [Math.min(a[0], p[0]) * k, Math.min(a[1], p[1]) * k, w * k, hh * k].map(Math.round);
      cropOff();
      try { const fig = await vectorizeFigure(img, box); board.insertFigure(fig); toast(`그림을 칠판에 옮겼습니다 (선분 ${fig.segs.length} · 원 ${fig.circles.length} · 글자 ${fig.labels.length})`); }
      catch (err) { console.error(err); toast('그림을 옮기지 못했습니다: ' + err.message); }
    };
  };

  mount(el, () => { if (board) { board.flush(); board.destroy(); } });
  show(cur);
}

// ======================================================================
// 기하 계산
// ======================================================================
const V = {
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
  dot: (a, b) => a.x * b.x + a.y * b.y, cross: (a, b) => a.x * b.y - a.y * b.x, len: a => Math.hypot(a.x, a.y),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y), norm: a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  perp: a => ({ x: -a.y, y: a.x }), mid: (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }),
};
// 선(선분 t∈[0,1], 직선 t∈ℝ) 위 가장 가까운 점까지의 거리
function distToLn(p, g) {
  const dd = V.dot(g.d, g.d) || 1;
  let t = V.dot(V.sub(p, g.p), g.d) / dd;
  t = Math.max(g.t0, Math.min(g.t1, t));
  return { d: V.dist(p, V.add(g.p, V.mul(g.d, t))), t };
}
const angOf = (c, p) => Math.atan2(p.y - c.y, p.x - c.x);
const normA = a => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
// 호: 화면에서 시계 반대 방향(캔버스 각도 감소)으로 a0 → a1
function onArc(g, a) { if (!g.arc) return true; const span = normA(g.a0 - g.a1), t = normA(g.a0 - a); return t <= span + 1e-9; }
function distToCi(p, g) { const d = Math.abs(V.dist(p, g) - g.r); if (!g.arc || onArc(g, angOf(g, p))) return d; return Math.min(V.dist(p, ptOnCi(g, g.a0)), V.dist(p, ptOnCi(g, g.a1))); }
const ptOnCi = (g, a) => ({ x: g.x + g.r * Math.cos(a), y: g.y + g.r * Math.sin(a) });
function intersect(A, B) {
  const out = [];
  if (A.ln && B.ln) {
    const den = V.cross(A.d, B.d); if (Math.abs(den) < 1e-9) return out;
    const w = V.sub(B.p, A.p), t = V.cross(w, B.d) / den, u = V.cross(w, A.d) / den;
    if (t >= A.t0 - 1e-9 && t <= A.t1 + 1e-9 && u >= B.t0 - 1e-9 && u <= B.t1 + 1e-9) out.push(V.add(A.p, V.mul(A.d, t)));
    return out;
  }
  if (A.ci && B.ln) return intersect(B, A);
  if (A.ln && B.ci) {
    const f = V.sub(A.p, B), a = V.dot(A.d, A.d), b = 2 * V.dot(f, A.d), c = V.dot(f, f) - B.r * B.r, disc = b * b - 4 * a * c;
    if (disc < 0) return out;
    for (const s of disc === 0 ? [0] : [-1, 1]) {
      const t = (-b + s * Math.sqrt(disc)) / (2 * a);
      if (t >= A.t0 - 1e-9 && t <= A.t1 + 1e-9) { const p = V.add(A.p, V.mul(A.d, t)); if (onArc(B, angOf(B, p))) out.push(p); }
    }
    return out;
  }
  if (A.ci && B.ci) {
    const d = V.dist(A, B); if (d < 1e-9 || d > A.r + B.r || d < Math.abs(A.r - B.r)) return out;
    const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, A.r * A.r - a * a));
    const m = V.add(A, V.mul(V.sub(B, A), a / d)), n = V.norm(V.perp(V.sub(B, A)));
    for (const s of [-1, 1]) { const p = V.add(m, V.mul(n, s * hh)); if (onArc(A, angOf(A, p)) && onArc(B, angOf(B, p))) out.push(p); }
  }
  return out;
}
function triCenters(A, B, C) {
  const a = V.dist(B, C), b = V.dist(C, A), c = V.dist(A, B), per = a + b + c;
  const I = { x: (a * A.x + b * B.x + c * C.x) / per, y: (a * A.y + b * B.y + c * C.y) / per };
  const area = Math.abs(V.cross(V.sub(B, A), V.sub(C, A))) / 2;
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  const s2 = p => p.x * p.x + p.y * p.y;
  const O = Math.abs(d) < 1e-9 ? null : { x: (s2(A) * (B.y - C.y) + s2(B) * (C.y - A.y) + s2(C) * (A.y - B.y)) / d, y: (s2(A) * (C.x - B.x) + s2(B) * (A.x - C.x) + s2(C) * (B.x - A.x)) / d };
  return { I, r: per ? 2 * area / per : 0, O, R: O ? V.dist(O, A) : 0 };
}
function fitCircle(pts) {
  // Kåsa 최소제곱 원
  let sx = 0, sy = 0; const n = pts.length; for (const p of pts) { sx += p.x; sy += p.y; }
  const mx = sx / n, my = sy / n; let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of pts) { const u = p.x - mx, v = p.y - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
  const det = suu * svv - suv * suv; if (Math.abs(det) < 1e-9) return null;
  const b1 = (suuu + suvv) / 2, b2 = (svvv + svuu) / 2;
  const uc = (b1 * svv - b2 * suv) / det, vc = (b2 * suu - b1 * suv) / det;
  const c = { x: uc + mx, y: vc + my }; const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  let e = 0; for (const p of pts) { const d = V.dist(p, c) - r; e += d * d; }
  return { x: c.x, y: c.y, r, rms: Math.sqrt(e / n) };
}
function angleCoverage(pts, c) {
  let tot = 0, prev = angOf(c, pts[0]);
  for (let i = 1; i < pts.length; i++) { const a = angOf(c, pts[i]); let d = a - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; tot += d; prev = a; }
  return tot;   // 부호 있는 누적 회전각
}

// ======================================================================
// 수식 → 함수
// ======================================================================
const FN_NAMES = ['sqrt', 'sin', 'cos', 'tan', 'abs', 'log', 'ln', 'exp', 'pi'];
function compileFormula(src, sliders, userFns) {
  let s = src.replace(/\s+/g, '').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/−/g, '-');
  let name = null, m;
  if ((m = s.match(/^y=(.+)$/))) s = m[1];
  else if ((m = s.match(/^([a-zA-Z])\(x\)=(.+)$/))) { name = m[1]; s = m[2]; }
  else return null;
  const toks = [], missing = new Set();
  const re = /(\d+\.?\d*|\.\d+)|([a-zA-Z]+)|([-+*/^(),|])/g; let t, last = 0;
  while ((t = re.exec(s))) {
    if (t.index !== last) throw new Error('알 수 없는 글자');
    last = re.lastIndex;
    if (t[1]) toks.push({ k: 'n', v: t[1] });
    else if (t[3]) toks.push({ k: 'o', v: t[3] });
    else {
      let w = t[2];
      while (w) {
        const f = FN_NAMES.find(f => w.startsWith(f));
        if (f) { toks.push({ k: f === 'pi' ? 'c' : 'f', v: f }); w = w.slice(f.length); }
        else { toks.push({ k: 'v', v: w[0] }); w = w.slice(1); }
      }
    }
  }
  if (last !== s.length) throw new Error('알 수 없는 글자');
  let i = 0;
  const peek = () => toks[i], eat = v => { if (toks[i] && toks[i].v === v) { i++; return true; } return false; };
  const startsPrimary = tk => tk && (tk.k === 'n' || tk.k === 'v' || tk.k === 'f' || tk.k === 'c' || tk.v === '(');
  function expr() { let a = term(); for (;;) { if (eat('+')) a = `(${a}+${term()})`; else if (eat('-')) a = `(${a}-${term()})`; else return a; } }
  function term() {
    let a = unary();
    for (;;) {
      if (eat('*')) a = `(${a}*${unary()})`; else if (eat('/')) a = `(${a}/${unary()})`;
      else if (startsPrimary(peek())) a = `(${a}*${power()})`; else return a;
    }
  }
  function unary() { if (eat('-')) return `(-${unary()})`; if (eat('+')) return unary(); return power(); }
  function power() { const b = primary(); if (eat('^')) return `Math.pow(${b},${unary()})`; return b; }
  function primary() {
    const tk = toks[i++]; if (!tk) throw new Error('식이 끝나지 않았습니다');
    if (tk.k === 'n') return tk.v;
    if (tk.k === 'c') return 'Math.PI';
    if (tk.v === '(') { const a = expr(); if (!eat(')')) throw new Error('괄호가 맞지 않습니다'); return `(${a})`; }
    if (tk.v === '|') { const a = expr(); if (!eat('|')) throw new Error('절댓값 기호가 맞지 않습니다'); return `Math.abs(${a})`; }
    if (tk.k === 'f') {
      const M = { sqrt: 'Math.sqrt', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', abs: 'Math.abs', log: 'Math.log10', ln: 'Math.log', exp: 'Math.exp' }[tk.v];
      if (peek() && peek().v === '(') { i++; const a = expr(); if (!eat(')')) throw new Error('괄호가 맞지 않습니다'); return `${M}(${a})`; }
      return `${M}(${power()})`;
    }
    if (tk.k === 'v') {
      if (tk.v === 'x') return 'x';
      if (userFns[tk.v] && peek() && peek().v === '(') { i++; const a = expr(); if (!eat(')')) throw new Error('괄호가 맞지 않습니다'); return `F.${tk.v}(${a})`; }
      if (tk.v === 'e') return 'Math.E';
      if (!(tk.v in sliders)) missing.add(tk.v);
      return `S.${tk.v}`;
    }
    throw new Error(`'${tk.v}' 자리가 이상합니다`);
  }
  const code = expr();
  if (i < toks.length) throw new Error('식을 끝까지 읽지 못했습니다');
  return { name, code, missing: [...missing] };
}

// ======================================================================
// 칠판
// ======================================================================
const REF_KEYS = ['a', 'b', 'd', 'v', 'p', 'o', 'o1', 'o2', 'cen', 'lnr'];
const cleanJSON = d => JSON.stringify(d, (k, v) => k[0] === '_' ? undefined : v);   // _로 시작하는 캐시(그림, 함수)는 저장하지 않음
const TOOLS = {
  select: { g: 'sel', name: '선택', tip: '끌면 옮기기 · 빈 곳을 끌거나 꾹 누른 뒤 끌면 여러 개 고르기', hint: '도형을 끌어 옮깁니다. 빈 곳을 끌거나, 한 곳을 꾹 누른 뒤 끌면 여러 개를 함께 고릅니다(↘ 손잡이로 확대·축소, Delete 키로 지움). 선분 가운데를 끌면 평행이동, 끝점을 선 방향으로 끌면 길이 조절.' },
  gsel: { g: 'sel', name: '그룹선택', hint: '드래그해서 여러 도형을 고르고, 고른 것을 끌어 함께 옮깁니다. 오른쪽 아래 ↘ 손잡이로 확대·축소, Delete 키로 지웁니다.' },
  slider: { g: 'sel', name: '슬라이더', hint: '슬라이더를 놓을 곳을 누르세요. 두 번 누르면 범위를 바꿉니다. 수식에 이름(a, b …)을 쓰면 연결됩니다.' },
  point: { g: 'pt', name: '점', hint: '점을 찍을 곳을 누르세요.' },
  inter: { g: 'pt', name: '교점', hint: '교점을 만들 두 도형을 차례로 누르세요.' },
  mid: { g: 'pt', name: '중점', hint: '선분 하나 또는 두 점을 누르세요.' },
  seg: { g: 'ln', name: '선분', tip: '두 점을 차례로 누르거나 끌기', hint: '두 점을 차례로 누르거나 드래그하세요.' },
  par: { g: 'ln', name: '평행선', tip: '선을 누른 뒤 지날 점 누르기', hint: '선분(직선)을 누른 뒤, 지날 점을 누르세요.' },
  perp: { g: 'ln', name: '수선', tip: '선을 누른 뒤 지날 점 누르기', hint: '선분(직선)을 누른 뒤, 지날 점을 누르세요.' },
  pbis: { g: 'ln', name: '수직이등분선', tip: '선분 하나 또는 두 점 누르기', hint: '선분 하나 또는 두 점을 누르세요.' },
  abis: { g: 'ln', name: '각의 이등분선', tip: '세 점 누르기 (가운데가 꼭짓점)', hint: '세 점을 차례로 누르세요 (가운데가 꼭짓점).' },
  tan: { g: 'ln', name: '접선', tip: '원 밖의 점 → 원 누르기', hint: '원 밖의 점을 누른 뒤, 원을 누르세요.' },
  circ: { g: 'ci', name: '원: 중심과 한 점', hint: '중심을 누른 뒤 원 위의 점을 누르세요 (드래그도 됩니다).' },
  circ3: { g: 'ci', name: '원: 세 점', hint: '원 위의 세 점을 차례로 누르세요.' },
  arc: { g: 'ci', name: '호', hint: '중심, 호의 시작점, 끝점을 차례로 누르세요 (시계 반대 방향).' },
  sector: { g: 'ci', name: '부채꼴', hint: '중심, 호의 시작점, 끝점을 차례로 누르세요 (시계 반대 방향).' },
  len: { g: 'me', name: '길이', hint: '선분 하나 또는 두 점을 누르세요.' },
  ang: { g: 'me', name: '각도', hint: '세 점을 차례로 누르세요 (가운데가 꼭짓점).' },
  trans: { g: 'me', name: '평행이동', hint: '옮길 도형을 누른 뒤(그룹선택한 것도 됨), 옮길 방향으로 드래그하세요.' },
  formula: { g: 'fx', name: '수식', tip: '예: y=x^2-2,  y=a/x,  f(x)=a sin x', hint: '예: y=x^2-2, f(x)=a sin x, y=2x+b (모르는 문자는 슬라이더가 됩니다). 그래프가 아닌 글은 칠판에 글자로 들어갑니다.' },
  pen: { g: 'pen', name: '펜', tip: '쓰다가 0.4초 멈추면 직선·원으로', hint: '그리다가 펜을 떼지 않고 0.4초 멈추면 직선·원으로 바뀝니다. 꼭짓점·선분·원을 0.3초 누르고 움직이면 옮겨집니다. 꼭짓점 근처에 호를 그리면 각 표시가 됩니다.' },
  draw: { g: 'draw', name: '도형', tip: '누르면 점 · 끌면 선 · 동그라미는 원 · 꺾어 닫으면 다각형', hint: '누르면 점, 끌면 직선, 동그라미는 원, 삼각형·사각형처럼 꺾어서 닫으면 다각형. 교점·점을 두 번 누르면 이름, 이름은 끌어서 옮김. 선분 양 끝점을 하나씩 누르거나 휜 곡선으로 이으면 길이 표시, 꼭짓점 근처 호는 각 표시. 선이 만나면 점이 자동으로. 원은 끌면 이동, 두 번 눌러 끌면 반지름만.' },
  eraser: { g: 'er', name: '지우개', tip: '지울 것을 문지르기', hint: '지울 것을 문지르세요.' },
};
const GROUPS = [
  { g: 'sel', name: '선택', items: ['gsel', 'slider'], main: 'select' },
  { g: 'ln', name: '선분', items: ['par', 'perp', 'pbis', 'abis', 'tan'] },
  { g: 'ci', name: '원', items: ['circ', 'circ3', 'arc'] },
  { g: 'me', name: '각도', items: ['ang', 'trans'] },
];
// 연필 버튼을 누르면 둥글게 펼쳐지는 도구 (수식은 위 막대)
const FAB_TOOLS = [['select', '선택'], ['draw', '도형'], ['seg', '선분'], ['eraser', '지우개'], ['pen', '펜']];
// [선분]을 누르면 펼쳐지는 작도 도구
const LINE_TOOLS = [['seg', '선분'], ['par', '평행선'], ['perp', '수선'], ['pbis', '수직이등분'], ['abis', '각이등분'], ['tan', '접선']];
const VISIBLE_TOOLS = new Set([...FAB_TOOLS.map(t => t[0]), ...LINE_TOOLS.map(t => t[0]), 'formula']);
const ICO = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="2" fill="currentColor" stroke="none"/>`;
const TOOL_ICONS = {
  select: '<path d="M6 3l12 8.5-5.2 1.2L10 18.5z"/>',
  draw: '<path d="M12 4.5L4.5 18.5h15z"/>' + DOT(12, 4.5) + DOT(4.5, 18.5) + DOT(19.5, 18.5),
  seg: '<path d="M5 18L19 6"/>' + DOT(5, 18) + DOT(19, 6),
  eraser: '<path d="M7 20h13"/><path d="M4.6 14.4l8.8-8.8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 18H8.2z"/><path d="M9.5 9.5l5 5"/>',
  pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.5 1.5L5 15Z"/><path d="M14 6l3 3"/>',
  par: '<path d="M3 15L15 5M9 19L21 9"/>',
  perp: '<path d="M4 19h16M12 19V4"/><path d="M12 15h4v4"/>',
  pbis: '<path d="M3 16h18M12 4v16"/><path d="M12 12.5h3.5v3.5"/>' + DOT(4, 16) + DOT(20, 16),
  abis: '<path d="M4 19h16M4 19L16 5M4 19l15.5-7.5"/>',
  tan: '<circle cx="12" cy="14" r="6"/><path d="M3 8h18"/>' + DOT(12, 8),
  formula: '<path d="M10 4c-2 0-3 1-3 3v13M4 10h7"/><path d="M14 11l6 8M20 11l-6 8"/>',
};
const toolIcon = t => ICO(TOOL_ICONS[t] || TOOL_ICONS.pen);
const PENCIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.5 1.5L5 15Z"/><path d="M14 6l3 3"/></svg>';
const COLORS = ['#111111', '#c62828', '#1d4fb3'];
const LAB_FONT = '"Noto Serif KR","Times New Roman",serif';
let LABPEN = { tool: 'pen', color: '#111111' };
try { Object.assign(LABPEN, JSON.parse(localStorage.getItem('labpen') || '{}')); } catch (e) {}
const saveLabPen = () => { try { localStorage.setItem('labpen', JSON.stringify(LABPEN)); } catch (e) {} };

class Board {
  constructor(pane, data, onSave) {
    this.pane = pane; this.onSave = onSave;
    this.data = data && data.objs ? data : { objs: [], seq: 1, axes: false };
    this.undoStack = []; this.redoStack = [];
    this.tool = VISIBLE_TOOLS.has(LABPEN.tool) ? LABPEN.tool : 'draw'; this.color = LABPEN.color;
    this.lastSub = { pt: 'point', ln: 'seg', ci: 'circ', me: 'len' };
    pane.innerHTML = '';
    this.toolbar = this.makeToolbar(); pane.appendChild(this.toolbar);
    this.host = h(`<div class="lab-host"><canvas></canvas><div class="lab-hint"></div></div>`); pane.appendChild(this.host);
    this.cv = this.host.querySelector('canvas'); this.hintEl = this.host.querySelector('.lab-hint');
    this.makeFab();
    this.picks = []; this.sel = new Set(); this.hover = null; this.drag = null; this.stroke = null; this.preview = null;
    this.cv.addEventListener('pointerdown', e => this.down(e));
    this.cv.addEventListener('pointermove', e => this.move(e));
    this.cv.addEventListener('pointerup', e => this.up(e));
    this.cv.addEventListener('pointercancel', e => this.up(e, true));
    this.cv.addEventListener('pointerleave', () => { if (!this.drag && !this.stroke) { this.hover = null; this.mouse = null; this.draw(); } });
    this.cv.addEventListener('contextmenu', e => e.preventDefault());
    this.onKey = e => this.key(e); document.addEventListener('keydown', this.onKey);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.host);
    this.setTool(this.tool); this.resize();
    try { if (!localStorage.getItem('labhelp')) setTimeout(() => this.showHelp(), 300); } catch (e) {}
  }
  destroy() { this.ro.disconnect(); document.removeEventListener('keydown', this.onKey); clearTimeout(this.saveT); this.closePop(); this.closeRing(); }
  save() { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 500); }
  flush() { clearTimeout(this.saveT); return this.onSave(JSON.parse(cleanJSON(this.data))); }
  snap() { this.undoStack.push(cleanJSON(this.data)); if (this.undoStack.length > 80) this.undoStack.shift(); this.redoStack = []; }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(cleanJSON(this.data)); this.data = JSON.parse(this.undoStack.pop()); this.afterEdit(); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(cleanJSON(this.data)); this.data = JSON.parse(this.redoStack.pop()); this.afterEdit(); }
  afterEdit() { this.sel.clear(); this.picks = []; this.compute(); this.draw(); this.save(); }
  afterEditKeepSel() { this.compute(); this.draw(); this.save(); }   // 그룹을 옮기거나 키운 뒤에도 계속 고른 채로

  // ---------- 도구 막대 ----------
  makeToolbar() {
    const bar = h(`<div class="lab-tools">
      <button class="tg big" data-a="undo" title="되돌리기">↶</button><button class="tg big" data-a="redo" title="다시">↷</button>
      <span class="sep"></span>
      <button class="tg" data-a="axes">좌표축</button>
      <button class="tg" data-t="formula">수식</button>
      <button class="tg danger" data-a="clear">모두 지우기</button>
      <button class="tg help" data-a="help" title="쓰는 법">?</button>
    </div>`);
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) this.setTool(b.dataset.t);
      if (b.dataset.c) { this.color = LABPEN.color = b.dataset.c; saveLabPen(); this.syncBar(); }
      if (b.dataset.a === 'undo') this.undo();
      if (b.dataset.a === 'redo') this.redo();
      if (b.dataset.a === 'help') this.showHelp();
      if (b.dataset.a === 'axes') { this.snap(); this.data.axes = !this.data.axes; this.afterEdit(); this.syncBar(); }
      if (b.dataset.a === 'clear' && this.data.objs.length && confirm('칠판을 모두 지울까요?')) { this.snap(); this.data.objs = []; this.data.axes = false; this.afterEdit(); this.syncBar(); }
    });
    return bar;
  }
  // ---------- 연필 버튼: 누르면 도구가 둥글게 펼쳐지고, 끌면 위치를 옮김 ----------
  makeFab() {
    const fab = h(`<button class="lab-fab" title="도구 고르기">${PENCIL_SVG}</button>`);
    this.host.appendChild(fab); this.fab = fab;
    const pos = Object.assign({ x: 0.93, y: 0.1 }, LABPEN.fab || {});
    this.placeFab = () => {
      const W = this.host.clientWidth, H = this.host.clientHeight; if (!W) return;
      const x = Math.max(32, Math.min(W - 32, pos.x * W)), y = Math.max(32, Math.min(H - 32, pos.y * H));
      fab.style.left = x + 'px'; fab.style.top = y + 'px'; this.fabXY = { x, y };
    };
    let st = null;
    fab.addEventListener('pointerdown', e => { e.stopPropagation(); try { fab.setPointerCapture(e.pointerId); } catch (_) {} st = { x: e.clientX, y: e.clientY, moved: false }; });
    fab.addEventListener('pointermove', e => {
      if (!st) return;
      if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 7) return;
      if (!st.moved) { st.moved = true; this.closeRing(); fab.style.cursor = 'grabbing'; }
      const r = this.host.getBoundingClientRect(); pos.x = (e.clientX - r.left) / r.width; pos.y = (e.clientY - r.top) / r.height; this.placeFab();
    });
    const end = () => {
      if (!st) return; const m = st.moved; st = null; fab.style.cursor = '';
      if (m) { const W = this.host.clientWidth, H = this.host.clientHeight; pos.x = this.fabXY.x / W; pos.y = this.fabXY.y / H; LABPEN.fab = { x: pos.x, y: pos.y }; saveLabPen(); }
      else {
        const now = performance.now();
        if (this.fabTap && now - this.fabTap < 330) { this.fabTap = 0; this.closeRing(); this.setTool('pen'); return; }   // 두 번 누르면 바로 [펜]
        this.fabTap = now;
        if (this.ring) this.closeRing(); else this.openRing();
      }
    };
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', () => { st = null; fab.style.cursor = ''; });
    this.placeFab();
  }
  openRing(level) {
    this.closePop(); this.closeRing();
    const lines = level === 'line', items = lines ? LINE_TOOLS : FAB_TOOLS, n = items.length;
    const Ri = 35, Ro = lines ? 112 : 102, W = this.host.clientWidth, H = this.host.clientHeight;
    // 한 바퀴가 칠판 안에 들어오도록 연필을 안쪽으로 옮김
    const LP = LABPEN.fab || (LABPEN.fab = { x: 0.93, y: 0.1 });
    const M = lines ? Ro + 4 : Ro + 36;   // 색 고르기 동그라미까지 들어오게
    const cx = Math.max(M, Math.min(W - M, this.fabXY.x)), cy = Math.max(M, Math.min(H - M, this.fabXY.y));
    if (cx !== this.fabXY.x || cy !== this.fabXY.y) { LP.x = cx / W; LP.y = cy / H; saveLabPen(); this.fab.style.left = cx + 'px'; this.fab.style.top = cy + 'px'; this.fabXY = { x: cx, y: cy }; }
    const S = Ro + 36, pt = (r, a) => `${(S + r * Math.cos(a)).toFixed(1)} ${(S + r * Math.sin(a)).toFixed(1)}`;
    const gapO = 3 / Ro, gapI = 3 / Ri, step = 2 * Math.PI / n, a00 = -Math.PI / 2 - step / 2;
    const lineOn = LINE_TOOLS.some(t => t[0] === this.tool);
    let svg = `<svg class="lab-ring" width="${2 * S}" height="${2 * S}" style="left:${cx - S}px;top:${cy - S}px">`;
    items.forEach(([t, nm], i) => {
      const a0 = a00 + i * step, a1 = a0 + step, big = step > Math.PI ? 1 : 0;
      const d = `M ${pt(Ro, a0 + gapO)} A ${Ro} ${Ro} 0 ${big} 1 ${pt(Ro, a1 - gapO)} L ${pt(Ri, a1 - gapI)} A ${Ri} ${Ri} 0 ${big} 0 ${pt(Ri, a0 + gapI)} Z`;
      const am = (a0 + a1) / 2, rm = (Ri + Ro) / 2 + 2, tx = S + rm * Math.cos(am), ty = S + rm * Math.sin(am);
      // [선분] 칸: 지금 쓰는 작도 도구를 보여 줌
      const cur = !lines && t === 'seg' && lineOn ? LINE_TOOLS.find(x => x[0] === this.tool) : null;
      const label = cur ? cur[1] + ' ▸' : (!lines && t === 'seg' ? '선분 ▸' : nm), icon = cur ? cur[0] : t;
      const on = this.tool === t || (!lines && t === 'seg' && lineOn);
      svg += `<g data-t="${t}" class="${on ? 'on' : ''}"><path d="${d}"/>` +
        `<svg x="${(tx - 13).toFixed(1)}" y="${(ty - 21).toFixed(1)}" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TOOL_ICONS[icon]}</svg>` +
        `<text x="${tx.toFixed(1)}" y="${(ty + 15).toFixed(1)}">${label}</text></g>`;
    });
    if (!lines) COLORS.forEach((c, i) => {   // 펜·도형 색: 바깥 위쪽 세 동그라미
      const a = -Math.PI / 2 + (i - 1) * 0.26, x = S + (Ro + 20) * Math.cos(a), y = S + (Ro + 20) * Math.sin(a);
      svg += `<g class="col ${c === this.color ? 'on' : ''}" data-c="${c}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${c}"/></g>`;
    });
    svg += '</svg>';
    const ring = h(svg);
    ring.addEventListener('pointerdown', e => e.stopPropagation());
    ring.addEventListener('click', e => {
      const cg = e.target.closest('[data-c]');
      if (cg) { this.color = LABPEN.color = cg.dataset.c; saveLabPen(); this.syncBar(); this.openRing(); return; }
      const g = e.target.closest('[data-t]'); if (!g) return;
      if (!lines && g.dataset.t === 'seg') { this.openRing('line'); return; }   // 선분 → 작도 도구들
      this.setTool(g.dataset.t); this.closeRing();
    });
    this.host.appendChild(ring); this.ring = ring; this.fab.classList.add('open');
    setTimeout(() => { this.ringAway = ev => { if (this.ring && !this.ring.contains(ev.target) && !this.fab.contains(ev.target)) this.closeRing(); }; document.addEventListener('pointerdown', this.ringAway, true); }, 0);
  }
  closeRing() {
    if (this.ring) { this.ring.remove(); this.ring = null; }
    if (this.fab) this.fab.classList.remove('open');
    if (this.ringAway) { document.removeEventListener('pointerdown', this.ringAway, true); this.ringAway = null; }
  }
  openMenu(btn, G) {
    this.closePop();
    const m = h(`<div class="lab-menu">${G.items.map(t => `<button data-t="${t}" class="${this.tool === t ? 'on' : ''}">${TOOLS[t].name}</button>`).join('')}</div>`);
    const pr = this.pane.getBoundingClientRect(), br = btn.getBoundingClientRect();
    m.style.left = (br.left - pr.left) + 'px'; m.style.top = (br.bottom - pr.top + 2) + 'px';
    m.onclick = e => { const b = e.target.closest('[data-t]'); if (b) { this.setTool(b.dataset.t); this.closePop(); } };
    this.pane.appendChild(m); this.pop = m;
    setTimeout(() => { this.popAway = ev => { if (!m.contains(ev.target) && ev.target !== btn) this.closePop(); }; document.addEventListener('pointerdown', this.popAway); }, 0);
  }
  closePop() {
    if (this.pop) { this.pop.remove(); this.pop = null; }
    if (this.popAway) { document.removeEventListener('pointerdown', this.popAway); this.popAway = null; }
    if (this.popClose) { const f = this.popClose; this.popClose = null; f(); }
  }
  setTool(t) {
    this.tool = t; LABPEN.tool = t; saveLabPen();
    if (t !== 'gsel' && t !== 'trans') this.sel.clear();
    this.transIds = null;
    if (TOOLS[t].g && this.lastSub[TOOLS[t].g] !== undefined) this.lastSub[TOOLS[t].g] = t;
    this.picks = []; this.preview = null; this.circleMode = null;
    this.say(TOOLS[t].tip || TOOLS[t].hint);
    if (this.formulaBar) { this.formulaBar.remove(); this.formulaBar = null; }
    if (t === 'formula') this.openFormula();
    this.cv && (this.cv.style.cursor = t === 'pen' || t === 'draw' ? 'crosshair' : t === 'eraser' ? 'cell' : 'default');
    this.syncBar(); this.draw && this.ctx && this.draw();
  }
  // 숨은 기능 안내 카드 ([?], 처음 한 번은 저절로)
  showHelp() {
    if (this.helpEl) return this.helpEl.remove(), this.helpEl = null;
    const c = h(`<div class="lab-helpcard"><h4>칠판 쓰는 법</h4><ul>
      <li><b>연필 버튼</b><span>누르면 도구 · 두 번 누르면 펜 · 끌면 자리 옮기기</span></li>
      <li><b>선분 칸</b><span>평행선 · 수선 · 수직이등분선 · 각의 이등분선 · 접선</span></li>
      <li><b>도형</b><span>누르면 점 · 끌면 선 · 동그라미는 원 · 꺾어 닫으면 다각형</span></li>
      <li><b>교점 두 번 누르기</b><span>점과 이름 (A, B …) 붙이기, 이름이 있으면 바꾸기</span></li>
      <li><b>점 이름 끌기</b><span>이름 자리 옮기기</span></li>
      <li><b>선택 + 꾹 누르고 끌기</b><span>여러 개 함께 고르기 · ↘ 손잡이로 크기</span></li>
      <li><b>그림 복사하기</b><span>문제 그림을 칠판으로 옮기기</span></li>
    </ul><button class="btn primary ok">알겠어요</button></div>`);
    c.querySelector('.ok').onclick = () => { c.remove(); this.helpEl = null; };
    c.addEventListener('pointerdown', e => e.stopPropagation());
    this.host.appendChild(c); this.helpEl = c;
    try { localStorage.setItem('labhelp', '1'); } catch (e) {}
  }
  // 아래 안내 한 줄: 3초 뒤 흐려짐
  say(text) {
    this.hintEl.textContent = text; this.hintEl.classList.remove('fade');
    clearTimeout(this.sayT); this.sayT = setTimeout(() => this.hintEl.classList.add('fade'), 3200);
  }
  syncBar() {
    this.toolbar.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === this.tool));
    const ax = this.toolbar.querySelector('[data-a="axes"]'); ax && ax.classList.toggle('on', !!this.data.axes);
    if (this.fab) { this.fab.style.color = this.color; this.fab.innerHTML = toolIcon(this.tool); this.fab.title = `${TOOLS[this.tool].name} (누르면 도구 · 두 번 누르면 펜 · 끌면 옮기기)`; }
  }
  openFormula() {
    const f = h(`<form class="lab-formula"><input placeholder="수식을 입력하세요  예: y=x^2-2   f(x)=a sin x" autocomplete="off"><button class="btn primary">넣기</button></form>`);
    const inp = f.querySelector('input');
    f.onsubmit = e => {
      e.preventDefault(); const src = inp.value.trim(); if (!src) return;
      if (this.addFormula(src)) inp.value = '';
    };
    this.host.appendChild(f); this.formulaBar = f; setTimeout(() => inp.focus(), 0);
  }
  addFormula(src) {
    const sliders = {}; this.data.objs.filter(o => o.t === 'slider').forEach(o => sliders[o.name] = o.v);
    const fns = {}; this.data.objs.filter(o => o.t === 'graph' && o.name).forEach(o => fns[o.name] = 1);
    let r;
    try { r = compileFormula(src, sliders, fns); } catch (e) { toast('수식을 읽지 못했습니다: ' + e.message); return false; }
    this.snap();
    if (!r) {   // 그래프가 아니면 글자로
      const W = this.W, H = this.H;
      this.add({ t: 'text', x: W / 2 - 40, y: H / 2, s: src, sz: 22, col: this.color });
      this.afterEdit(); toast('글자로 넣었습니다. [선택]으로 끌어 옮길 수 있습니다'); return true;
    }
    let sy = 30 + 40 * this.data.objs.filter(o => o.t === 'slider').length;
    for (const nm of r.missing) { this.add({ t: 'slider', name: nm, min: -5, max: 5, v: 1, x: 16, y: sy }); sy += 40; }
    if (r.name) this.data.objs.filter(o => o.t === 'graph' && o.name === r.name).forEach(o => this.remove(o.id, true));
    this.add({ t: 'graph', src, name: r.name, code: r.code, col: this.color });
    this.data.axes = true; this.afterEdit(); this.syncBar(); return true;
  }

  // ---------- 크기 ----------
  resize() {
    const r = this.host.getBoundingClientRect(); if (!r.width) return;
    this.W = r.width; this.H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
    this.ctx = this.cv.getContext('2d'); this.compute(); this.draw();
    if (this.placeFab) { const sz = this.W + 'x' + this.H; if (sz !== this.lastSz) { this.lastSz = sz; this.placeFab(); this.closeRing(); } }
  }

  // ---------- 객체 ----------
  obj(id) { return this.data.objs.find(o => o.id === id); }
  add(o) { o.id = this.data.seq++; this.data.objs.push(o); return o; }
  refsOf(o) { return REF_KEYS.filter(k => typeof o[k] === 'number' && !(k === 'v' && o.t === 'slider')).map(k => o[k]); }
  remove(id, quiet) {
    const kill = new Set([id]);
    let grew = true;
    while (grew) { grew = false; for (const o of this.data.objs) if (!kill.has(o.id) && this.refsOf(o).some(r => kill.has(r))) { kill.add(o.id); grew = true; } }
    this.data.objs = this.data.objs.filter(o => !kill.has(o.id));
    this.cleanup();
  }
  cleanup() {   // 아무도 쓰지 않는 자동 점 지우기
    const used = new Set(); this.data.objs.forEach(o => this.refsOf(o).forEach(r => used.add(r)));
    this.data.objs = this.data.objs.filter(o => !(o.t === 'pt' && o.k !== 'inter' && (o.auto || o.st === 'hid') && !used.has(o.id)));   // 교점은 두 도형이 있는 동안 남김
  }
  nextName() {
    // 점 이름과, 그림 복사로 들어온 글자(A, B, O …)에 이미 쓰인 이름은 건너뜀
    const used = new Set(this.data.objs.filter(o => (o.t === 'pt' && o.name) || (o.t === 'text' && /^[A-Z]$/.test(o.s))).map(o => o.name || o.s));
    // 알파벳 순서를 이어 감: A부터 이어진 이름(한두 글자 건너뛴 것까지)의 마지막 다음 글자부터.
    //   예) A B C D (+ O) → E,  A B C E → F.  O·I처럼 뚝 떨어진 이름은 순서에 넣지 않음
    const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let last = -1; for (let i = 0; i < AL.length; i++) if (used.has(AL[i])) { if (i - last <= 2) last = i; else break; }
    for (let i = last + 1; i < AL.length; i++) if (!used.has(AL[i])) return AL[i];
    for (const c of AL) if (!used.has(c)) return c;
    for (let i = 1; ; i++) if (!used.has('P' + i)) return 'P' + i;
  }
  newPoint(p, style = 'small', extra = {}) {
    const o = this.add(Object.assign({ t: 'pt', k: 'free', x: p.x, y: p.y, st: style, col: style === 'hid' ? '#111' : this.color }, extra));
    if (style === 'big') o.name = this.nextName();
    if (style !== 'big') o.auto = true;
    if (this.geo) this.geo.set(o.id, { pt: true, x: o.x, y: o.y });   // 바로 쓸 수 있게 위치를 넣어 둠
    return o;
  }

  // 정의에서 위치 계산 (만든 순서대로 — 의존하는 것은 늘 먼저 만들어짐)
  compute() {
    const G = this.geo = new Map();
    const P = id => { const g = G.get(id); return g && g.pt ? g : null; };
    const L = id => { const g = G.get(id); return g && g.ln ? g : null; };
    const C = id => { const g = G.get(id); return g && g.ci ? g : null; };
    // 자유점은 순서와 상관없이 먼저 (선분을 나눌 때 나중에 만든 점을 앞의 선분이 쓰므로)
    for (const o of this.data.objs) if (o.t === 'pt' && o.k === 'free') G.set(o.id, { pt: true, x: o.x, y: o.y });
    for (const o of this.data.objs) {
      let g = null;
      if (o.t === 'pt' && o.k === 'free') continue;
      try {
        if (o.t === 'pt') {
          if (o.k === 'free') g = { x: o.x, y: o.y };
          else if (o.k === 'mid') { const a = P(o.a), b = P(o.b); if (a && b) g = V.mid(a, b); }
          else if (o.k === 'inter') {
            const A = G.get(o.o1), B = G.get(o.o2);
            if (A && B) { const xs = intersect(A, B); if (xs.length) { g = xs.reduce((m, p) => V.dist(p, o) < V.dist(m, o) ? p : m); o.x = g.x; o.y = g.y; } }
          } else if (o.k === 'ic' || o.k === 'cc') {
            const a = P(o.a), b = P(o.b), c = P(o.d); if (a && b && c) { const T = triCenters(a, b, c); g = o.k === 'ic' ? T.I : T.O; }
          }
          if (g) g = { pt: true, x: g.x, y: g.y };
        } else if (o.t === 'seg') {
          const a = P(o.a), b = P(o.b); if (a && b) g = { ln: true, p: a, d: V.sub(b, a), t0: 0, t1: 1, seg: true };
        } else if (o.t === 'line') {
          let p, d;
          if (o.k === 'par' || o.k === 'perp') { const l = L(o.o), q = P(o.p); if (l && q) { p = q; d = o.k === 'par' ? l.d : V.perp(l.d); } }
          else if (o.k === 'pbis') { const a = P(o.a), b = P(o.b); if (a && b && V.dist(a, b) > 1e-6) { p = V.mid(a, b); d = V.perp(V.sub(b, a)); } }
          else if (o.k === 'abis') { const a = P(o.a), v = P(o.v), b = P(o.b); if (a && v && b) { let w = V.add(V.norm(V.sub(a, v)), V.norm(V.sub(b, v))); if (V.len(w) < 1e-6) w = V.perp(V.sub(a, v)); p = v; d = w; } }
          else if (o.k === 'tan') {
            const q = P(o.p), c = C(o.o);
            if (q && c) { const dd = V.dist(q, c); if (dd > c.r + 1e-6) { const th = angOf(c, q), al = Math.acos(c.r / dd), a = th + (o.i ? al : -al); const T = ptOnCi(c, a); p = q; d = V.sub(T, q); } }
          } else if (o.k === '2p') { const a = P(o.a), b = P(o.b); if (a && b) { p = a; d = V.sub(b, a); } }
          if (p && V.len(d) > 1e-9) g = { ln: true, p, d: V.norm(d), t0: -1e6, t1: 1e6 };
        } else if (o.t === 'circ') {
          if (o.k === 'cp') { const c = P(o.cen), q = P(o.p); if (c && q) g = { x: c.x, y: c.y, r: V.dist(c, q) }; }
          else if (o.k === 'cr') { const c = P(o.cen); if (c) g = { x: c.x, y: c.y, r: o.r }; }
          else if (o.k === '3p' || o.k === 'cc') { const a = P(o.a), b = P(o.b), c = P(o.d); if (a && b && c) { const T = triCenters(a, b, c); if (T.O) g = { x: T.O.x, y: T.O.y, r: T.R }; } }
          else if (o.k === 'inc') { const a = P(o.a), b = P(o.b), c = P(o.d); if (a && b && c) { const T = triCenters(a, b, c); g = { x: T.I.x, y: T.I.y, r: T.r }; } }
          if (g) g.ci = true;
        } else if (o.t === 'arc') {
          const c = P(o.cen);
          if (c) {
            if (o.k === 'cr') g = { ci: true, arc: true, x: c.x, y: c.y, r: o.r, a0: o.a0, a1: o.a1, sec: o.sec };
            else { const a = P(o.a), b = P(o.b); if (a && b) g = { ci: true, arc: true, x: c.x, y: c.y, r: V.dist(c, a), a0: angOf(c, a), a1: angOf(c, b), sec: o.sec }; }
          }
        } else if (o.t === 'ang') {
          const a = P(o.a), v = P(o.v), Ln = o.lnr != null ? L(o.lnr) : null;
          const b = Ln && v ? V.add(v, V.mul(V.norm(Ln.d), 40)) : P(o.b);   // lnr: 직선 방향을 한쪽 변으로 (수직이등분선의 직각 표시)
          if (a && v && b) g = { ang: true, a, v, b };
        }
        else if (o.t === 'len') {
          if (o.o) { const l = L(o.o); if (l) g = { lab: true, a: l.p, b: V.add(l.p, l.d) }; }
          else { const a = P(o.a), b = P(o.b); if (a && b) g = { lab: true, a, b }; }
        }
      } catch (e) { g = null; }
      if (g) G.set(o.id, g);
    }
    // 그래프 함수
    this.S = {}; this.F = {};
    this.data.objs.filter(o => o.t === 'slider').forEach(o => this.S[o.name] = o.v);
    for (const o of this.data.objs) if (o.t === 'graph') {
      try { o._f = new Function('x', 'S', 'F', 'return ' + o.code); if (o.name) { const f = o._f, S = this.S, F = this.F; this.F[o.name] = x => f(x, S, F); } } catch (e) { o._f = null; }
    }
  }
  get unit() { return 40; }
  get origin() {
    // 그림 복사로 들어온 x축·y축이 있으면 두 축의 교점이 원점 (그림을 옮기거나 키워도 따라감)
    const ax = this.data.axSegs, gx = ax && this.geo && this.geo.get(ax[0]), gy = ax && this.geo && this.geo.get(ax[1]);
    if (gx && gy && gx.d && gy.d) {
      const den = gx.d.x * gy.d.y - gx.d.y * gy.d.x;
      if (Math.abs(den) > 1e-6) { const t = ((gy.p.x - gx.p.x) * gy.d.y - (gy.p.y - gx.p.y) * gy.d.x) / den; return { x: gx.p.x + gx.d.x * t, y: gx.p.y + gx.d.y * t }; }
    }
    return { x: Math.round(this.W / 2), y: Math.round(this.H / 2) };
  }

  // ---------- 그리기 ----------
  draw() {
    const g = this.ctx; if (!g) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    if (this.data.axes) this.drawAxes(g);
    if (this.triHL) {
      const P = this.triHL.map(id => this.geo.get(id));
      if (P.every(Boolean)) { g.save(); g.fillStyle = 'rgba(224,161,0,.18)'; g.strokeStyle = 'rgba(224,161,0,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(P[0].x, P[0].y); g.lineTo(P[1].x, P[1].y); g.lineTo(P[2].x, P[2].y); g.closePath(); g.fill(); g.stroke(); g.restore(); }
    }
    const hl = new Set([...this.sel, ...(this.hover ? [this.hover] : []), ...(this.pendPt && performance.now() - this.pendPt.t < 4000 ? [this.pendPt.id] : []), ...this.picks.filter(p => typeof p === 'number'), ...(this.drag && this.drag.ids ? this.drag.ids : [])]);
    // 아래층: 면 → 선 → 점·글자
    for (const o of this.data.objs) if (o.t === 'arc' && o.sec) this.drawObj(g, o, hl.has(o.id));
    for (const o of this.data.objs) if (!(o.t === 'arc' && o.sec) && o.t !== 'pt' && o.t !== 'text' && o.t !== 'img' && o.t !== 'slider') this.drawObj(g, o, hl.has(o.id));
    for (const o of this.data.objs) if (o.t === 'img' || o.t === 'text') this.drawObj(g, o, hl.has(o.id));
    for (const o of this.data.objs) if (o.t === 'pt') this.drawObj(g, o, hl.has(o.id));
    for (const o of this.data.objs) if (o.t === 'slider') this.drawObj(g, o, hl.has(o.id));
    // 미리보기 / 획
    if (this.preview) this.drawPreview(g);
    if (this.stroke) this.drawStroke(g);
    if (this.rect) { g.save(); g.strokeStyle = '#1d4fb3'; g.setLineDash([5, 4]); g.fillStyle = 'rgba(29,79,179,.06)'; const [a, b] = this.rect; g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); g.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g.restore(); }
    if (this.sel.size && (this.tool === 'gsel' || this.tool === 'select')) {
      const bb = this.selBox();
      if (bb) {
        g.save(); g.strokeStyle = 'rgba(29,79,179,.7)'; g.setLineDash([4, 4]); g.strokeRect(bb.x0 - 4, bb.y0 - 4, bb.x1 - bb.x0 + 8, bb.y1 - bb.y0 + 8); g.setLineDash([]);
        // 크기 조절 손잡이 (오른쪽 아래)
        const hx = bb.x1 + 4, hy = bb.y1 + 4; g.fillStyle = '#fff'; g.strokeStyle = '#1d4fb3'; g.lineWidth = 2;
        g.fillStyle = '#1d4fb3'; g.beginPath(); g.arc(hx, hy, 16, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(hx - 6, hy - 6); g.lineTo(hx + 6, hy + 6); g.moveTo(hx + 6, hy); g.lineTo(hx + 6, hy + 6); g.lineTo(hx, hy + 6); g.moveTo(hx - 6, hy); g.lineTo(hx - 6, hy - 6); g.lineTo(hx, hy - 6); g.stroke();
        g.restore();
      }
    }
  }
  drawAxes(g) {
    const O = this.origin, u = this.unit;
    g.save(); g.lineWidth = 1;
    g.strokeStyle = '#eceae4';
    for (let x = O.x % u; x < this.W; x += u) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, this.H); g.stroke(); }
    for (let y = O.y % u; y < this.H; y += u) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(this.W, y + .5); g.stroke(); }
    g.strokeStyle = '#555'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(0, O.y + .5); g.lineTo(this.W, O.y + .5); g.moveTo(O.x + .5, 0); g.lineTo(O.x + .5, this.H); g.stroke();
    g.fillStyle = '#666'; g.font = `12px ${LAB_FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    for (let x = O.x % u, k = Math.round((O.x % u - O.x) / u); x < this.W; x += u, k++) if (k) g.fillText(k, x, O.y + 4);
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let y = O.y % u, k = Math.round((O.y - O.y % u) / u); y < this.H; y += u, k--) if (k) g.fillText(k, O.x - 5, y);
    g.font = `italic 16px ${LAB_FONT}`; g.fillStyle = '#333'; g.textAlign = 'right'; g.textBaseline = 'bottom';
    g.fillText('x', this.W - 6, O.y - 3); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('y', O.x + 6, 4); g.fillText('O', O.x + 4, O.y + 3);
    g.restore();
  }
  drawObj(g, o, hl) {
    const G = this.geo.get(o.id), col = o.col || '#111';
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const under = (fn) => { if (!hl) return; g.save(); g.strokeStyle = 'rgba(29,79,179,.28)'; g.lineWidth = 9; fn(); g.stroke(); g.restore(); };
    if (o.t === 'seg' || o.t === 'line') {
      if (!G) return g.restore();
      const a = o.t === 'seg' ? G.p : V.add(G.p, V.mul(G.d, -4000)), b = o.t === 'seg' ? V.add(G.p, G.d) : V.add(G.p, V.mul(G.d, 4000));
      const path = () => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); };
      under(path); g.strokeStyle = col; g.lineWidth = o.w || 2.2; if (o.dash) g.setLineDash([7, 6]); path(); g.stroke();
    } else if (o.t === 'circ' || o.t === 'arc') {
      if (!G) return g.restore();
      const path = () => { g.beginPath(); if (G.arc) { if (G.sec) g.moveTo(G.x, G.y); g.arc(G.x, G.y, G.r, G.a0, G.a1, true); if (G.sec) g.closePath(); } else g.arc(G.x, G.y, G.r, 0, Math.PI * 2); };
      under(path);
      if (G.sec) { g.fillStyle = hexA(col, .12); path(); g.fill(); }
      g.strokeStyle = col; g.lineWidth = o.w || 2.2; if (o.dash) g.setLineDash([7, 6]); path(); g.stroke();
    } else if (o.t === 'pt') {
      if (!G) return g.restore();
      const show = o.st !== 'hid';
      if (hl || (!show && this.drag && this.drag.id === o.id)) { g.fillStyle = 'rgba(29,79,179,.25)'; g.beginPath(); g.arc(G.x, G.y, 9, 0, 7); g.fill(); }
      if (show) {
        const r = o.st === 'big' ? 3.8 : 2.4;
        g.fillStyle = o.k === 'free' ? (o.col || '#111') : '#555'; g.beginPath(); g.arc(G.x, G.y, r, 0, 7); g.fill();
        if (o.name) { if (o.nx === undefined || (!o.nmv && Math.hypot(o.nx, o.ny) < 23)) this.placeName(o, G); g.font = `italic 38px ${LAB_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.col || '#111'; g.fillText(o.name, G.x + o.nx, G.y + o.ny); }
      }
    } else if (o.t === 'ink') {
      const p = o.pts; g.strokeStyle = col; g.lineWidth = o.w || 2.6;
      const path = () => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) { if (i + 2 < p.length) g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2); else g.lineTo(p[i], p[i + 1]); } };
      under(path); path(); g.stroke();
    } else if (o.t === 'text') {
      const sz = o.sz || 20, parts = fracParts(o.s), hasF = parts.some(p => p.f);
      const font = k => `${o.it ? 'italic ' : ''}${Math.round(sz * k)}px ${LAB_FONT}`;
      g.textBaseline = 'middle'; g.textAlign = 'left';
      const wid = p => { if (!p.f) { g.font = font(1); return g.measureText(p.s).width; } g.font = font(0.88); return Math.max(g.measureText(p.n).width, g.measureText(p.d).width) + sz * 0.2; };
      const ws = parts.map(wid), w = ws.reduce((a, b) => a + b, 0); o._w = w; o._h = hasF ? sz * 2.1 : sz;
      if (hl) { g.fillStyle = 'rgba(29,79,179,.15)'; g.fillRect(o.x - w / 2 - 4, o.y - o._h / 2 - 3, w + 8, o._h + 6); }
      g.fillStyle = g.strokeStyle = o.col || '#111';
      // 분수(a/x, 2√3/3 …)는 위아래로: 분자 / 가로줄 / 분모
      let x = o.x - w / 2, my = o.y - (hasF ? sz * 0.06 : 0);
      parts.forEach((p, i) => {
        if (!p.f) { g.font = font(1); g.fillText(p.s, x, o.y); }
        else {
          g.font = font(0.88); g.textAlign = 'center'; const cx = x + ws[i] / 2;
          g.fillText(p.n, cx, my - sz * 0.5); g.fillText(p.d, cx, my + sz * 0.56);
          g.lineWidth = Math.max(1, sz / 16); g.beginPath(); g.moveTo(x + sz * 0.06, my); g.lineTo(x + ws[i] - sz * 0.06, my); g.stroke(); g.textAlign = 'left';
        }
        x += ws[i];
      });
    } else if (o.t === 'img') {
      if (!o._im) { o._im = new Image(); o._im.onload = () => this.draw(); o._im.src = o.src; }
      if (o._im.complete) g.drawImage(o._im, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      if (hl) { g.strokeStyle = 'rgba(29,79,179,.5)'; g.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h); }
    } else if (o.t === 'ldeco') {
      // 꾸미기: 길이 표시 — 두 점 사이를 바깥으로 휜 곡선 + 글자(두 번 눌러 입력)
      const A = this.geo.get(o.a), B = this.geo.get(o.b); if (!A || !B) return g.restore();
      const n = V.norm(V.perp(V.sub(B, A))), M = V.mid(A, B), C = V.add(M, V.mul(n, o.h * 2));
      const path = () => { g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(C.x, C.y, B.x, B.y); };
      under(path); g.strokeStyle = col; g.lineWidth = 1.5; path(); g.stroke();
      if (o.lab) {
        const q = V.add(M, V.mul(n, o.h + Math.sign(o.h) * 14));
        g.font = `${/^[a-z]$/i.test(o.lab) ? 'italic ' : ''}19px ${LAB_FONT}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.lab, q.x, q.y);
      }
    } else if (o.t === 'ang') {
      if (!G) return g.restore(); this.drawAngle(g, o, G, hl);
    } else if (o.t === 'len') {
      if (!G) return g.restore();
      const m = V.mid(G.a, G.b), n = V.norm(V.perp(V.sub(G.b, G.a))), L = V.dist(G.a, G.b) / this.unit;
      const q = V.add(m, V.mul(n, n.y < 0 ? -18 : 18));   // 선분 아래쪽에 (점 이름은 위쪽)
      g.font = `15px ${LAB_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const s = (Math.round(L * 100) / 100).toString(), w = g.measureText(s).width;
      g.fillStyle = hl ? '#dfe7f5' : 'rgba(255,255,255,.85)'; g.fillRect(q.x - w / 2 - 3, q.y - 9, w + 6, 18);
      g.fillStyle = o.col || '#1d4fb3'; g.fillText(s, q.x, q.y);
    } else if (o.t === 'graph') {
      if (!o._f) return g.restore();
      const O = this.origin, u = this.unit;
      g.strokeStyle = col; g.lineWidth = 2.4; g.beginPath(); let pen = false, py0 = null;
      for (let px = 0; px <= this.W; px += 1.5) {
        let y; try { y = o._f((px - O.x) / u, this.S, this.F); } catch (e) { y = NaN; }
        const py = O.y - y * u;
        if (!isFinite(py) || Math.abs(py) > 1e5 || (py0 !== null && Math.abs(py - py0) > this.H * 2)) { pen = false; py0 = null; continue; }
        if (pen) g.lineTo(px, py); else { g.moveTo(px, py); pen = true; }
        py0 = py;
      }
      if (hl) { g.save(); g.strokeStyle = 'rgba(29,79,179,.28)'; g.lineWidth = 9; g.stroke(); g.restore(); }
      g.stroke();
      g.font = `italic 16px ${LAB_FONT}`; g.fillStyle = col; g.textAlign = 'left';
      const lx = this.W - 150; let ly; try { ly = O.y - o._f((lx - O.x) / u, this.S, this.F) * u; } catch (e) { ly = NaN; }
      if (isFinite(ly) && ly > 14 && ly < this.H - 14) g.fillText(o.name ? `${o.name}(x)` : o.src, lx + 6, ly - 10);
    } else if (o.t === 'slider') {
      const W = 140; const t = (o.v - o.min) / (o.max - o.min);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(o.x - 6, o.y - 22, W + 12, 34);
      g.strokeStyle = hl ? '#1d4fb3' : '#999'; g.lineWidth = 3; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + W, o.y); g.stroke();
      g.fillStyle = '#1d3b6e'; g.beginPath(); g.arc(o.x + W * t, o.y, 7, 0, 7); g.fill();
      g.font = `italic 15px ${LAB_FONT}`; g.fillStyle = '#111'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(`${o.name} = ${Math.round(o.v * 100) / 100}`, o.x, o.y - 9);
    } else if (o.t === 'vec') {
      g.strokeStyle = '#888'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(o.x2, o.y2); g.stroke(); g.setLineDash([]);
      const d = V.norm({ x: o.x2 - o.x1, y: o.y2 - o.y1 }), n = V.perp(d);
      g.fillStyle = '#888'; g.beginPath(); g.moveTo(o.x2, o.y2); g.lineTo(o.x2 - d.x * 11 + n.x * 5, o.y2 - d.y * 11 + n.y * 5); g.lineTo(o.x2 - d.x * 11 - n.x * 5, o.y2 - d.y * 11 - n.y * 5); g.fill();
    }
    g.restore();
  }
  drawAngle(g, o, G, hl) {
    const a0 = angOf(G.v, G.a), a1 = angOf(G.v, G.b);
    let d = normA(a1 - a0); let from = a0, to = a1;
    if (d > Math.PI) { from = a1; to = a0; d = 2 * Math.PI - d; }
    const r = o.r || 22, deg = d * 180 / Math.PI;
    g.strokeStyle = hl ? '#1d4fb3' : (o.col || '#111'); g.lineWidth = 1.6;
    if (o.rt || Math.abs(deg - 90) < 0.6 || (o.pen && Math.abs(deg - 90) < 2.5)) {
      const s = Math.min(r * 0.75, 16), u = V.norm(V.sub(G.a, G.v)), w = V.norm(V.sub(G.b, G.v));
      const p1 = V.add(G.v, V.mul(u, s)), p2 = V.add(p1, V.mul(w, s)), p3 = V.add(G.v, V.mul(w, s));
      g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.lineTo(p3.x, p3.y); g.stroke();
    } else { g.beginPath(); g.arc(G.v.x, G.v.y, r, from, from + d); g.stroke(); }
    if (o.val) {
      const mid = from + d / 2, q = { x: G.v.x + Math.cos(mid) * (r + 16), y: G.v.y + Math.sin(mid) * (r + 16) };
      g.font = `14px ${LAB_FONT}`; g.fillStyle = o.col || '#1d4fb3'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${Math.round(deg * 10) / 10}°`, q.x, q.y);
    }
  }
  drawStroke(g) {
    const s = this.stroke;
    g.save(); g.strokeStyle = s.col; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2.6;
    if (s.shape) {
      g.lineWidth = 2.2; g.beginPath();
      if (s.shape.t === 'seg') { g.moveTo(s.shape.a.x, s.shape.a.y); g.lineTo(s.shape.b.x, s.shape.b.y); }
      else g.arc(s.shape.x, s.shape.y, s.shape.r, 0, 7);
      g.stroke();
    } else if (s.pts.length) {
      g.beginPath(); g.moveTo(s.pts[0].x, s.pts[0].y); for (const p of s.pts) g.lineTo(p.x, p.y); g.stroke();
    }
    g.restore();
  }
  drawPreview(g) {
    const P = this.preview; if (!P) return;
    g.save(); g.strokeStyle = 'rgba(29,79,179,.7)'; g.lineWidth = 1.8; g.setLineDash([6, 5]); g.beginPath();
    if (P.t === 'seg') { g.moveTo(P.a.x, P.a.y); g.lineTo(P.b.x, P.b.y); }
    if (P.t === 'circ') g.arc(P.c.x, P.c.y, P.r, 0, 7);
    if (P.t === 'vec') { g.moveTo(P.a.x, P.a.y); g.lineTo(P.b.x, P.b.y); }
    g.stroke(); g.restore();
  }

  // ---------- 찾기 ----------
  pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  // 누른 곳의 객체 (kinds: 고를 종류)
  hitTest(p, tol, kinds) {
    const ok = t => !kinds || kinds.includes(t);
    let best = null, bd = Infinity;
    const consider = (o, d, pri) => { const s = d - pri; if (d <= tol && s < bd) { bd = s; best = o; } };
    for (const o of this.data.objs) {
      const G = this.geo.get(o.id);
      if (o.t === 'pt' && ok('pt') && G) consider(o, V.dist(p, G), 6);
      else if (o.t === 'slider' && ok('slider')) { if (p.x > o.x - 10 && p.x < o.x + 150 && p.y > o.y - 24 && p.y < o.y + 12) consider(o, 0, 5); }
      else if (o.t === 'text' && ok('text')) { const w = (o._w || 20) / 2 + 4, hh = (o._h || 20) / 2 + 4; if (Math.abs(p.x - o.x) < w && Math.abs(p.y - o.y) < hh) consider(o, 0, 2); }
      else if (o.t === 'img' && ok('text')) { if (Math.abs(p.x - o.x) < o.w / 2 && Math.abs(p.y - o.y) < o.h / 2) consider(o, 0, 1); }
      else if ((o.t === 'seg' || o.t === 'line') && ok('ln') && G) consider(o, distToLn(p, G).d, 0);
      else if ((o.t === 'circ' || o.t === 'arc') && ok('ci') && G) consider(o, distToCi(p, G), 0);
      else if (o.t === 'ink' && ok('ink')) { let d = Infinity; for (let i = 0; i < o.pts.length; i += 2) d = Math.min(d, Math.hypot(p.x - o.pts[i], p.y - o.pts[i + 1])); consider(o, d, -1); }
      else if (o.t === 'graph' && ok('graph') && o._f) { const O = this.origin, u = this.unit; let y; try { y = O.y - o._f((p.x - O.x) / u, this.S, this.F) * u; } catch (e) { y = NaN; } if (isFinite(y)) consider(o, Math.abs(y - p.y), -1); }
      else if (o.t === 'ldeco' && ok('deco')) {
        const A = this.geo.get(o.a), B = this.geo.get(o.b);
        if (A && B) {
          const n = V.norm(V.perp(V.sub(B, A))), C = V.add(V.mid(A, B), V.mul(n, o.h * 2)); let d = Infinity;
          for (let k = 1; k < 12; k++) { const t = k / 12, q = { x: (1 - t) * (1 - t) * A.x + 2 * t * (1 - t) * C.x + t * t * B.x, y: (1 - t) * (1 - t) * A.y + 2 * t * (1 - t) * C.y + t * t * B.y }; d = Math.min(d, V.dist(p, q)); }
          const lq = V.add(V.mid(A, B), V.mul(n, o.h + Math.sign(o.h) * 14)); if (o.lab) d = Math.min(d, V.dist(p, lq) - 4);
          consider(o, d, -1);
        }
      }
      else if ((o.t === 'ang' || o.t === 'len' || o.t === 'vec') && ok('deco')) {
        if (o.t === 'ang' && G) consider(o, Math.abs(V.dist(p, G.v) - (o.r || 22)), -2);
        if (o.t === 'len' && G) consider(o, V.dist(p, V.mid(G.a, G.b)), -2);
        if (o.t === 'vec') consider(o, distToLn(p, { p: { x: o.x1, y: o.y1 }, d: { x: o.x2 - o.x1, y: o.y2 - o.y1 }, t0: 0, t1: 1 }).d, -2);
      }
    }
    return best;
  }
  segsOf(pid) { return this.data.objs.filter(o => o.t === 'seg' && (o.a === pid || o.b === pid)); }
  // 점 고르기: 가까운 점이 있으면 그 점, 없으면 새 점
  pickPoint(p, tol, style = 'small') {
    const hit = this.hitTest(p, tol, ['pt']);
    if (hit) return hit;
    return this.newPoint(p, style);
  }

  // ---------- 입력 ----------
  down(e) {
    if (e.button === 2) return;
    this.closePop();
    if (this.fab) this.fab.classList.add('dim');
    const p = this.pos(e), tol = e.pointerType === 'touch' ? 18 : 11;
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
    this.downAt = { p, t: performance.now(), id: e.pointerId }; this.moved = false;
    const t = this.tool;
    if (this.circleMode) {
      const c = this.hitTest(p, tol + 10, ['ci']);
      if (c && c.id === this.circleMode.id) { this.snap(); this.drag = { kind: this.circleMode.kind === 'move' ? 'cmove' : 'csize', id: c.id, last: p }; return; }
      this.circleMode = null; this.say(TOOLS[t].tip || TOOLS[t].hint);
    }
    // 원을 두 번 누르고 두 번째에 누른 채로 끌면: 중심은 그대로, 반지름만
    const now = performance.now(), lt = this.lastTap;
    if (lt && now - lt.t < 380 && V.dist(p, lt.p) < 16 && ['select', 'draw', 'pen'].includes(t)) {
      const c = this.hitTest(p, tol + 4, ['ci']);
      if (c && !this.hitTest(p, tol, ['pt'])) {
        if (lt.created) { this.data = JSON.parse(this.undoStack.pop()); this.compute(); }
        this.lastTap = null; this.snap(); this.stroke = null;
        this.drag = { kind: 'csize', id: c.id, ids: [c.id], last: p }; this.draw(); return;
      }
    }
    if (t === 'select' || t === 'gsel') {
      const bb = this.sel.size ? this.selBox() : null;
      if (bb && Math.abs(p.x - (bb.x1 + 4)) < 24 && Math.abs(p.y - (bb.y1 + 4)) < 24) {
        // 손잡이를 끌면 왼쪽 위 모서리를 고정하고 확대·축소
        this.snap(); this.drag = { kind: 'gscale', o: { x: bb.x0 - 4, y: bb.y0 - 4 }, last: p }; return;
      }
      if (bb && p.x > bb.x0 - 10 && p.x < bb.x1 + 10 && p.y > bb.y0 - 10 && p.y < bb.y1 + 10) { this.snap(); this.drag = { kind: 'group', last: p }; return; }
      this.sel.clear();
      const hit = this.dragHit(p, tol);
      if (hit) {
        this.snap(); this.startDrag(hit, p);
        // 움직이지 않고 0.4초 꾹 누르면 그 자리부터 범위를 끌어 그룹선택
        this.lpT = setTimeout(() => { if (!this.moved && this.drag) { this.drag = null; this.undoStack.pop(); this.rect = [p, p]; this.say('끌어서 함께 고를 범위를 정하세요.'); if (navigator.vibrate) navigator.vibrate(20); this.draw(); } }, 400);
        return;
      }
      this.rect = [p, p]; this.draw(); return;
    }
    if (t === 'eraser') { this.snap(); this.erasing = true; this.eraseAt(p, tol); return; }
    if (t === 'pen' || t === 'draw') {
      const hit = this.dragHit(p, tol);
      if (t === 'draw' && hit && hit.kind === 'pname') { this.snap(); this.startDrag(hit, p); return; }   // 점 이름은 바로 끌어 옮김
      if (t === 'draw' && hit && hit.kind === 'circ') { this.snap(); this.startDrag(hit, p); return; }   // 원은 누른 채로 끌면 바로 이동
      this.stroke = { pts: [p], col: this.color, t0: performance.now(), mode: t };
      if (hit) this.lpT = setTimeout(() => { if (!this.moved && this.stroke) { this.stroke = null; this.snap(); this.startDrag(hit, p, true); this.draw(); } }, 300);
      if (t === 'pen') this.armHold(p);
      return;
    }
    if (t === 'slider') {
      const s = this.hitTest(p, tol, ['slider']); if (s) { this.snap(); this.startDrag(s, p); return; }
      this.snap();
      const used = new Set(this.data.objs.filter(o => o.t === 'slider').map(o => o.name));
      const nm = [...'abcdkmnpqrst'].find(c => !used.has(c)) || 'a';
      this.add({ t: 'slider', name: nm, min: -5, max: 5, v: 1, x: p.x - 70, y: p.y }); this.afterEdit(); return;
    }
    if (t === 'trans') {
      if (!this.transIds) {
        const ids = this.sel.size ? [...this.sel] : (() => { const o = this.hitTest(p, tol, ['ln', 'ci', 'ink', 'text']) || this.hitTest(p, tol, ['pt']); return o ? [o.id] : null; })();
        if (ids) { this.transIds = ids; this.picks = ids.slice(); this.say('이제 옮길 방향과 거리만큼 드래그하세요.'); this.draw(); }
        return;
      }
      this.preview = { t: 'vec', a: p, b: p }; return;
    }
    this.toolDown(p, tol);
  }
  move(e) {
    const p = this.pos(e), tol = e.pointerType === 'touch' ? 18 : 11;
    this.mouse = p;
    if (this.downAt && V.dist(p, this.downAt.p) > 5) { this.moved = true; clearTimeout(this.lpT); }
    if (this.drag) { this.doDrag(p); return; }
    if (this.rect) { this.rect[1] = p; this.draw(); return; }
    if (this.erasing) { this.eraseAt(p, tol); return; }
    if (this.stroke) {
      if (this.stroke.shape) return;            // 이미 직선·원으로 바뀜
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) this.stroke.pts.push(this.pos(ev));
      if (this.stroke.mode === 'pen' && V.dist(p, this.holdAt) > 3) this.armHold(p);
      this.draw(); return;
    }
    if (this.preview && this.preview.t === 'vec' && this.downAt) { this.preview.b = p; this.draw(); return; }
    // 마우스를 올려 두었을 때: 고를 수 있는 것 표시 + 작도 미리보기
    if (!e.buttons) {
      const kinds = this.kindsFor();
      const hv = kinds ? this.hitTest(p, tol, kinds) : (['select', 'pen', 'draw'].includes(this.tool) ? this.dragHit(p, tol) : null);
      const id = hv ? (hv.o ? hv.o.id : hv.id) : null;
      if (id !== this.hover) this.hover = id;
      this.updatePreview(p);
      this.draw();
    } else if (this.picks.length && (this.tool === 'seg' || this.tool === 'circ')) { this.updatePreview(p); this.draw(); }
  }
  up(e, cancel) {
    clearTimeout(this.lpT); clearTimeout(this.holdT);
    if (this.fab) this.fab.classList.remove('dim');
    const p = this.pos(e), tol = e.pointerType === 'touch' ? 18 : 11;
    const tap = this.downAt && !this.moved && performance.now() - this.downAt.t < 450;
    this.downAt = null;
    if (this.drag) {
      const d = this.drag; this.drag = null;
      if (d.moved || d.kind === 'group' || d.kind === 'gscale') this.dropDeadInter();
      if (d.kind === 'group' || d.kind === 'gscale') this.afterEditKeepSel();
      else if (d.moved) this.afterEdit(); else { this.undoStack.pop(); this.draw(); }
      if (tap) this.tapped(p, tol);
      return;
    }
    if (this.rect) { const [a, b] = this.rect; this.rect = null; this.selectRect(a, b); this.say(this.sel.size ? '끌면 함께 옮기기 · ↘ 손잡이로 크기 · Delete 키로 지우기' : TOOLS[this.tool].hint); this.draw(); return; }
    if (this.erasing) { this.erasing = false; this.afterEdit(); return; }
    if (this.stroke) { const s = this.stroke; this.stroke = null; if (!cancel) this.finishStroke(s, tap, p, tol); this.draw(); return; }
    if (this.preview && this.preview.t === 'vec') { const P = this.preview; this.preview = null; if (V.dist(P.a, P.b) > 6) this.translateCopy(P.a, P.b); this.draw(); return; }
    if (tap) this.tapped(p, tol);
    else if (this.picks.length && (this.tool === 'seg' || this.tool === 'circ') && !cancel) this.toolDown(p, tol, true);   // 드래그로 그리기
  }
  key(e) {
    if (/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel.size) { e.preventDefault(); this.snap(); [...this.sel].forEach(id => this.obj(id) && this.remove(id)); this.afterEdit(); }
    if ((e.key === '+' || e.key === '=' || e.key === '-') && this.sel.size && (this.tool === 'gsel' || this.tool === 'select') && !e.ctrlKey && !e.metaKey) {
      const bb = this.selBox(); if (bb) { e.preventDefault(); this.snap(); this.scaleGroup(e.key === '-' ? 1 / 1.1 : 1.1, { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 }); this.afterEditKeepSel(); }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
    if (e.key === 'Escape') { this.picks = []; this.preview = null; this.transIds = null; this.sel.clear(); this.setTool(this.tool); }
  }
  kindsFor() {
    const t = this.tool, n = this.picks.length;
    if (['point', 'seg', 'abis', 'ang', 'circ', 'circ3', 'arc', 'sector'].includes(t)) return ['pt'];
    if (t === 'inter') return ['ln', 'ci'];
    if (t === 'mid' || t === 'pbis' || t === 'len') return n ? ['pt'] : ['pt', 'ln'];
    if (t === 'par' || t === 'perp') return n ? ['pt'] : ['ln'];
    if (t === 'tan') return n ? ['ci'] : ['pt'];
    if (t === 'trans') return this.transIds ? [] : ['ln', 'ci', 'ink', 'text', 'pt'];
    if (t === 'eraser') return ['pt', 'ln', 'ci', 'ink', 'text', 'graph', 'deco', 'slider'];
    if (t === 'slider') return ['slider'];
    return null;
  }
  updatePreview(p) {
    const t = this.tool, P = this.picks;
    this.preview = null;
    const G = id => this.geo.get(id);
    if (t === 'seg' && P.length === 1 && G(P[0])) this.preview = { t: 'seg', a: G(P[0]), b: p };
    if (t === 'circ' && P.length === 1 && G(P[0])) this.preview = { t: 'circ', c: G(P[0]), r: V.dist(G(P[0]), p) };
  }

  // 두 번 누르기
  tapped(p, tol) {
    const now = performance.now();
    if (this.lastTap && now - this.lastTap.t < 380 && V.dist(p, this.lastTap.p) < 14) { this.lastTap = null; this.doubleTap(p, tol); return; }
    this.lastTap = { t: now, p };
    if (this.tool === 'select' && !this.hitTest(p, tol)) { this.sel.clear(); this.draw(); }
  }
  doubleTap(p, tol) {
    if (!['select', 'pen', 'draw', 'gsel', 'slider'].includes(this.tool)) return;
    const hit = this.hitTest(p, tol + 4, ['pt', 'ci', 'text', 'slider', 'deco']);
    if (hit && hit.t === 'ldeco') { const s = prompt('길이 표시 글자 (예: 4, x)', hit.lab || ''); if (s != null) { this.snap(); hit.lab = s.trim(); this.afterEdit(); } return; }
    if (hit && hit.t === 'pt' && (hit.k === 'ic' || hit.k === 'cc')) {
      const ic = hit.k === 'ic';
      return this.popup(p, [[ic ? '내접원 그리기' : '외접원 그리기', () => { this.snap(); this.add({ t: 'circ', k: ic ? 'inc' : 'cc', a: hit.a, b: hit.b, d: hit.d, col: this.color }); this.afterEdit(); }]]);
    }
    if (hit && hit.t === 'pt' && !hit.name) { this.snap(); hit.st = 'big'; hit.auto = false; hit.name = this.nextName(); delete hit.nx; this.afterEdit(); return; }   // 교점 등: 두 번 누르면 이름
    if (hit && hit.t === 'pt' && hit.name) {
      const s = prompt('점 이름 바꾸기', hit.name);
      if (s != null && s.trim()) { this.snap(); const other = this.data.objs.find(o => o.t === 'pt' && o.name === s.trim() && o !== hit); if (other) other.name = hit.name; hit.name = s.trim(); this.afterEdit(); }
      return;
    }
    if (hit && hit.t === 'text') { const s = prompt('글자 고치기', hit.s); if (s != null) { this.snap(); if (s.trim()) hit.s = s; else this.remove(hit.id); this.afterEdit(); } return; }
    if (hit && hit.t === 'slider') {
      const s = prompt(`${hit.name}의 범위 (최솟값, 최댓값)`, `${hit.min}, ${hit.max}`);
      if (s) { const [a, b] = s.split(/[,\s]+/).map(Number); if (isFinite(a) && isFinite(b) && a < b) { this.snap(); hit.min = a; hit.max = b; hit.v = Math.min(b, Math.max(a, hit.v)); this.afterEdit(); } }
      return;
    }
    const tris = this.triangleAt(p);
    if (tris.length) this.triPopup(p, tris, 0);
  }
  // 삼각형 메뉴: 고른 삼각형을 칠해 보여 주고, 여러 개가 겹치면 [다른 삼각형]으로 바꿈
  triPopup(p, tris, i) {
    const [a, b, d] = tris[i], name = this.triName(tris[i]);
    this.triHL = tris[i]; this.draw();
    const items = [
      [`${name} 내심 그리기`.trim(), () => { this.triHL = null; this.snap(); this.add({ t: 'pt', k: 'ic', a, b, d, st: 'big', name: this.nameOr('I'), col: this.color }); this.afterEdit(); }],
      [`${name} 외심 그리기`.trim(), () => { this.triHL = null; this.snap(); this.add({ t: 'pt', k: 'cc', a, b, d, st: 'big', name: this.nameOr('O'), col: this.color }); this.afterEdit(); }],
    ];
    if (tris.length > 1) items.push(['다른 삼각형 ▸', () => this.triPopup(p, tris, (i + 1) % tris.length)]);
    this.popup(p, items, () => { this.triHL = null; this.draw(); });
  }
  // 점 이름 자리: 점 둘레 16방향 중 선·원·다른 이름에서 가장 먼 곳 (같으면 오른쪽 위)
  placeName(o, G) {
    const lines = this.data.objs.filter(q => ['seg', 'line', 'circ', 'arc', 'ang'].includes(q.t)).map(q => [q, this.geo.get(q.id)]).filter(x => x[1]);
    const others = this.data.objs.filter(q => q.t === 'pt' && q.name && q !== o && q.nx !== undefined).map(q => { const g = this.geo.get(q.id); return g && { x: g.x + q.nx, y: g.y + q.ny }; }).filter(Boolean);
    let best = null;
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 4 + i * Math.PI / 8, c = { x: G.x + 25 * Math.cos(a), y: G.y + 25 * Math.sin(a) };
      let d = 99;
      for (const [q, g] of lines) {
        if (q.t === 'ang') { const v = this.geo.get(q.v); if (v) d = Math.min(d, V.dist(c, v) + 4); continue; }
        if (g.ci) d = Math.min(d, distToCi(c, g)); else if (g.d) d = Math.min(d, distToLn(c, q.t === 'seg' ? g : { p: g.p, d: g.d, t0: -1e4, t1: 1e4 }).d);
      }
      for (const q of others) d = Math.min(d, V.dist(c, q) - 6);
      const sc = Math.min(d, 26) - i * 0.01;
      if (!best || sc > best.sc) best = { sc, c };
    }
    o.nx = Math.round(best.c.x - G.x); o.ny = Math.round(best.c.y - G.y);
  }
  // 점 이름 글자를 눌렀는지
  nameHit(p) {
    for (const o of this.data.objs) if (o.t === 'pt' && o.name && o.nx !== undefined) { const g = this.geo.get(o.id); if (g && Math.abs(p.x - g.x - o.nx) < 14 && Math.abs(p.y - g.y - o.ny) < 16) return { kind: 'pname', o }; }
    return null;
  }
  // 수직이등분선 + 중점에 직각 표시
  addPbis(a, b) {
    const ln = this.add({ t: 'line', k: 'pbis', a, b, col: this.color });
    const m = this.add({ t: 'pt', k: 'mid', a, b, st: 'hid', col: this.color });
    this.add({ t: 'ang', a, v: m.id, lnr: ln.id, r: 16, rt: true, col: this.color });
  }
  nameOr(c) { return this.data.objs.some(o => o.t === 'pt' && o.name === c) ? this.nextName() : c; }
  setCircleMode(c, kind) {
    this.circleMode = { id: c.id, kind };
    this.say(kind === 'move' ? '원을 누른 채로 끌면 크기는 그대로 옮겨집니다.' : '원을 누른 채로 끌면 중심은 그대로, 반지름만 바뀝니다.');
    this.hover = c.id; this.draw();
  }
  popup(p, items, onClose) {
    this.closePop(); this.popClose = onClose || null;
    const m = h(`<div class="lab-pop">${items.map((it, i) => `<button data-i="${i}">${it[0]}</button>`).join('')}</div>`);
    const pr = this.pane.getBoundingClientRect(), hr = this.host.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(p.x + hr.left - pr.left + 8, pr.width - 260)) + 'px';
    m.style.top = Math.max(4, p.y + hr.top - pr.top + 8) + 'px';
    m.onclick = e => { const b = e.target.closest('[data-i]'); if (b) { this.closePop(); items[+b.dataset.i][1](); } };
    this.pane.appendChild(m); this.pop = m;
    setTimeout(() => { this.popAway = ev => { if (!m.contains(ev.target)) this.closePop(); }; document.addEventListener('pointerdown', this.popAway); }, 0);
  }
  // 삼각형 찾기: 한 직선 위로 이어진 선분들(중간에 점이 있어도)을 한 변으로 보고,
  // 세 점이 서로 변으로 이어진 삼각형 중 누른 곳을 품는 가장 작은 것
  // 두 점이 한 직선 위의 선분(들)로 이어져 있는지
  linkedPts(u, v) { return this.lineSets().some(S => S.has(u) && S.has(v)); }
  // 길이 표시가 휘는 쪽: 그림 가운데의 반대쪽
  ldecoSide(a, b) {
    const A = this.geo.get(a), B = this.geo.get(b), n = V.norm(V.perp(V.sub(B, A))), M = V.mid(A, B);
    const ps = this.data.objs.filter(o => o.t === 'pt' && this.geo.get(o.id) && o.id !== a && o.id !== b).map(o => this.geo.get(o.id));
    if (!ps.length) return n.y > 0 ? -1 : 1;
    const c = ps.reduce((s, q) => ({ x: s.x + q.x / ps.length, y: s.y + q.y / ps.length }), { x: 0, y: 0 });
    return V.dot(V.sub(c, M), n) > 0 ? -1 : 1;
  }
  lineSets() {
    const segs = this.data.objs.filter(o => o.t === 'seg' && this.geo.get(o.id));
    const par = segs.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i], B = segs[j];
      const sh = [A.a, A.b].find(x => x === B.a || x === B.b); if (sh === undefined) continue;
      const o1 = A.a === sh ? A.b : A.a, o2 = B.a === sh ? B.b : B.a, P1 = this.geo.get(o1), P2 = this.geo.get(o2);
      if (!P1 || !P2) continue;
      const r = distToLn(this.geo.get(sh), { p: P1, d: V.sub(P2, P1), t0: 0, t1: 1 });
      if (r.d <= 3 && r.t > 0 && r.t < 1) par[find(i)] = find(j);
    }
    const lines = new Map();
    segs.forEach((s, i) => { const r = find(i); if (!lines.has(r)) lines.set(r, new Set()); lines.get(r).add(s.a).add(s.b); });
    return [...lines.values()];
  }
  triangleAt(p) {
    const segs = this.data.objs.filter(o => o.t === 'seg' && this.geo.get(o.id));
    const par = segs.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i], B = segs[j];
      const sh = [A.a, A.b].find(x => x === B.a || x === B.b); if (sh === undefined) continue;
      // 공유한 점이 두 먼 끝을 잇는 직선에서 3px 안쪽이면 한 변
      const o1 = A.a === sh ? A.b : A.a, o2 = B.a === sh ? B.b : B.a, P1 = this.geo.get(o1), P2 = this.geo.get(o2);
      if (!P1 || !P2) continue;
      const r = distToLn(this.geo.get(sh), { p: P1, d: V.sub(P2, P1), t0: 0, t1: 1 });
      if (r.d <= 3 && r.t > 0 && r.t < 1) par[find(i)] = find(j);
    }
    const lines = new Map();
    segs.forEach((s, i) => { const r = find(i); if (!lines.has(r)) lines.set(r, new Set()); lines.get(r).add(s.a).add(s.b); });
    const sets = [...lines.values()], pts = [...new Set(segs.flatMap(s => [s.a, s.b]))];
    const linked = (u, v) => sets.some(S => S.has(u) && S.has(v));
    const found = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if (!linked(pts[i], pts[j])) continue;
      for (let k = j + 1; k < pts.length; k++) {
        const a = pts[i], b = pts[j], c = pts[k];
        if (!linked(b, c) || !linked(a, c) || sets.some(S => S.has(a) && S.has(b) && S.has(c))) continue;
        const A = this.geo.get(a), B = this.geo.get(b), C = this.geo.get(c); if (!A || !B || !C) continue;
        const ar = Math.abs(V.cross(V.sub(B, A), V.sub(C, A))); if (ar < 50) continue;
        const s1 = V.cross(V.sub(B, A), V.sub(p, A)), s2 = V.cross(V.sub(C, B), V.sub(p, B)), s3 = V.cross(V.sub(A, C), V.sub(p, C));
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) found.push({ ids: [a, b, c], ar });
      }
    }
    return found.sort((x, y) => x.ar - y.ar).map(f => f.ids);   // 작은 것부터
  }
  // 꼭짓점 이름: 점 이름이 있으면 그것, 없으면 가까이 있는 글자(그림 복사로 들어온 A, B …)
  vertexName(id) {
    const o = this.obj(id); if (o && o.name) return o.name;
    const g = this.geo.get(id); let best = null, bd = 40;
    for (const t of this.data.objs) if (t.t === 'text' && /^[A-Z]['′]?$/.test(t.s)) { const d = V.dist(t, g); if (d < bd) { bd = d; best = t.s; } }
    return best;
  }
  triName(ids) { const n = ids.map(id => this.vertexName(id)); return n.every(Boolean) ? '△' + n.sort().join('') : ''; }

  // ---------- 작도 도구 ----------
  toolDown(p, tol, fromDrag) {
    const t = this.tool, P = this.picks, G = id => this.geo.get(id);
    const done = () => { this.picks = []; this.preview = null; this.afterEdit(); };
    const pt = (style) => this.pickPoint(p, tol, style).id;
    if (t === 'point') { this.snap(); const hit = this.hitTest(p, tol, ['pt']); if (!hit) this.newPoint(p, 'big'); else if (hit.st !== 'big') { hit.st = 'big'; hit.auto = false; hit.name = hit.name || this.nextName(); } return done(); }
    if (!P.length) this.snap();
    if (t === 'seg') {
      if (fromDrag && P.length === 1 && V.dist(G(P[0]), p) < 8) return;
      const id = pt('small'); if (P.length && id === P[0]) return;
      P.push(id); if (P.length === 2) { this.add({ t: 'seg', a: P[0], b: P[1], col: this.color }); return done(); }
    } else if (t === 'circ') {
      if (fromDrag && P.length === 1 && V.dist(G(P[0]), p) < 8) return;
      const id = pt('small'); if (P.length && id === P[0]) return;
      P.push(id); if (P.length === 2) { this.add({ t: 'circ', k: 'cp', cen: P[0], p: P[1], col: this.color }); return done(); }
    } else if (t === 'circ3' || t === 'abis' || t === 'ang' || t === 'arc' || t === 'sector') {
      const id = pt('small'); if (P.includes(id)) return;
      P.push(id);
      if (P.length === 3) {
        if (t === 'circ3') this.add({ t: 'circ', k: '3p', a: P[0], b: P[1], d: P[2], col: this.color });
        if (t === 'abis') this.add({ t: 'line', k: 'abis', a: P[0], v: P[1], b: P[2], col: this.color });
        if (t === 'ang') this.add({ t: 'ang', a: P[0], v: P[1], b: P[2], val: true, r: 24, col: this.color });
        if (t === 'arc' || t === 'sector') {
          // 끝점을 원 위로 옮겨 둔다(반지름 = 중심~시작점)
          const c = G(P[0]), a = G(P[1]), b = this.obj(P[2]);
          if (b.k === 'free' && c && a) { const r = V.dist(c, a), ang = angOf(c, G(P[2])); b.x = c.x + r * Math.cos(ang); b.y = c.y + r * Math.sin(ang); }
          this.add({ t: 'arc', cen: P[0], a: P[1], b: P[2], sec: t === 'sector', col: this.color });
        }
        return done();
      }
    } else if (t === 'inter') {
      const o = this.hitTest(p, tol, ['ln', 'ci']); if (!o || P.includes(o.id)) return;
      P.push(o.id);
      if (P.length === 2) {
        const xs = intersect(G(P[0]), G(P[1]));
        if (!xs.length) { toast('두 도형이 만나지 않습니다'); this.picks = []; this.undoStack.pop(); this.draw(); return; }
        const q = xs.reduce((m, x) => V.dist(x, p) < V.dist(m, p) ? x : m);
        if (!this.hitTest(q, 3, ['pt'])) this.add({ t: 'pt', k: 'inter', o1: P[0], o2: P[1], x: q.x, y: q.y, st: 'big', name: this.nextName(), col: this.color });
        return done();
      }
    } else if (t === 'mid' || t === 'pbis' || t === 'len') {
      if (!P.length) {
        const ph = this.hitTest(p, tol, ['pt']);
        const s = !ph && this.hitTest(p, tol, ['ln']);
        if (s && s.t === 'seg') {
          if (t === 'mid') this.add({ t: 'pt', k: 'mid', a: s.a, b: s.b, st: 'big', name: this.nextName(), col: this.color });
          if (t === 'pbis') this.addPbis(s.a, s.b);
          if (t === 'len') this.add({ t: 'len', o: s.id, col: '#1d4fb3' });
          return done();
        }
      }
      const id = pt('small'); if (P.includes(id)) return;
      P.push(id);
      if (P.length === 2) {
        if (t === 'mid') this.add({ t: 'pt', k: 'mid', a: P[0], b: P[1], st: 'big', name: this.nextName(), col: this.color });
        if (t === 'pbis') this.addPbis(P[0], P[1]);
        if (t === 'len') this.add({ t: 'len', a: P[0], b: P[1], col: '#1d4fb3' });
        return done();
      }
    } else if (t === 'par' || t === 'perp') {
      if (!P.length) { const l = this.hitTest(p, tol, ['ln']); if (l) P.push(l.id); else this.undoStack.pop(); }
      else { const id = pt('small'); this.add({ t: 'line', k: t, o: P[0], p: id, col: this.color }); return done(); }
    } else if (t === 'tan') {
      if (!P.length) P.push(pt('small'));
      else {
        const c = this.hitTest(p, tol, ['ci']); if (!c) return;
        const q = G(P[0]), g = G(c.id);
        if (V.dist(q, g) <= g.r + 1e-6) { toast('원 밖의 점을 골라야 접선이 생깁니다'); this.picks = []; this.cleanup(); this.compute(); this.draw(); return; }
        this.add({ t: 'line', k: 'tan', p: P[0], o: c.id, i: 0, col: this.color }); this.add({ t: 'line', k: 'tan', p: P[0], o: c.id, i: 1, col: this.color });
        return done();
      }
    }
    this.compute(); this.draw();
  }

  // ---------- 끌기 ----------
  // 무엇을 어떻게 끌지: 꼭짓점(선분 2개 이상)은 자유 이동, 선분 하나의 끝점은 반대쪽 끝점 중심 회전, 선분 가운데는 평행이동
  dragHit(p, tol) {
    const nh = this.nameHit(p); if (nh && !this.hitTest(p, 7, ['pt'])) return nh;
    const hit = this.hitTest(p, tol, ['pt', 'slider', 'text', 'ln', 'ci', 'ink']);
    if (!hit) return null;
    if (hit.t === 'pt') {
      if (hit.k === 'inter') { const s1 = this.obj(hit.o1), s2 = this.obj(hit.o2); return s1 && s2 && s1.t === 'seg' && s2.t === 'seg' ? { kind: 'isplit', o: hit } : null; }
      if (hit.k !== 'free') return null;
      const segs = this.segsOf(hit.id);
      if (segs.length === 1 && this.isFree(segs[0].a === hit.id ? segs[0].b : segs[0].a) !== null) return { kind: 'rot', o: hit, seg: segs[0] };
      return { kind: 'pt', o: hit };
    }
    if (hit.t === 'seg') {
      const G = this.geo.get(hit.id), { t } = distToLn(p, G), L = V.len(G.d);
      // 두 선분이 엇갈려 만나는 곳(끝점이 아닌 교점)을 누르면 그 자리에서 나눠 꼭짓점으로
      const cross = this.crossingAt(p, tol, hit);
      if (cross) return { kind: 'split', o: hit, other: cross.other, at: cross.at };
      if (t * L < 14 || (1 - t) * L < 14) { const pid = t < 0.5 ? hit.a : hit.b; const po = this.obj(pid); if (po && po.k === 'free') return this.dragHit(this.geo.get(pid), 30) || { kind: 'pt', o: po }; }
      return { kind: 'seg', o: hit };
    }
    if (hit.t === 'circ' || hit.t === 'arc') return { kind: 'circ', o: hit };
    if (hit.t === 'line') return null;
    return { kind: 'free', o: hit };
  }
  isFree(id) { const o = this.obj(id); return o && o.t === 'pt' ? o : null; }
  crossingAt(p, tol, seg) {
    const A = this.geo.get(seg.id);
    for (const o of this.data.objs) if (o.t === 'seg' && o.id !== seg.id && o.a !== seg.a && o.a !== seg.b && o.b !== seg.a && o.b !== seg.b) {
      const xs = intersect(A, this.geo.get(o.id));
      if (xs.length && V.dist(xs[0], p) < tol) {
        const ends = [seg.a, seg.b, o.a, o.b].map(id => this.geo.get(id));
        if (ends.every(e => V.dist(e, xs[0]) > 6)) return { other: o, at: xs[0] };
      }
    }
    return null;
  }
  startDrag(hit, p, longPress) {
    this.closePop();
    const o = hit.o || hit;
    if (hit.kind === 'split') {
      // 엇갈린 두 선분을 교점에서 나눠 네 선분이 한 점을 공유하게 한다
      const X = this.newPoint(hit.at, 'hid');
      for (const s of [hit.o, hit.other]) this.splitSeg(s, X.id);
      this.compute();
      this.drag = { kind: 'pt', id: X.id, ids: [X.id], last: p, moved: true }; this.draw(); return;
    }
    if (hit.kind === 'isplit') {
      // 자동으로 생긴 교점을 끌면: 두 선분을 그 점에서 나누고 점을 자유롭게 (이름은 그대로)
      const X = hit.o, at = this.geo.get(X.id);
      for (const s of [this.obj(X.o1), this.obj(X.o2)]) if (s.a !== X.id && s.b !== X.id) this.splitSeg(s, X.id);
      Object.assign(X, { k: 'free', x: at.x, y: at.y }); delete X.o1; delete X.o2;
      this.compute();
      this.drag = { kind: 'pt', id: X.id, ids: [X.id], last: p, moved: true }; this.draw(); return;
    }
    this.drag = { kind: hit.kind || (o.t === 'slider' ? 'slider' : 'free'), id: o.id, ids: [o.id], last: p, seg: hit.seg };
    if (o.t === 'slider') {
      const W = 140; this.drag.kind = (p.y > o.y - 12 && Math.abs(p.x - (o.x + W * (o.v - o.min) / (o.max - o.min))) < 14) || p.y > o.y - 8 ? 'slider' : 'smove';
    }
    if (hit.kind === 'circ') this.drag.kind = 'cmove';
    if (longPress) this.drag.moved = true;
    this.draw();
  }
  movePoint(id, dx, dy) { const o = this.obj(id); if (o && o.t === 'pt' && o.k === 'free') { o.x += dx; o.y += dy; return true; } return false; }
  doDrag(p) {
    const d = this.drag, o = this.obj(d.id), dx = p.x - d.last.x, dy = p.y - d.last.y;
    d.last = p; d.moved = true;
    if (d.kind === 'pt') { if (o) { o.x = p.x; o.y = p.y; } }
    else if (d.kind === 'rot') {
      // 끝점을 선 안쪽으로 끌면 짧게, 바깥쪽으로 끌면 길게 (기울기는 그대로)
      const other = this.geo.get(d.seg.a === o.id ? d.seg.b : d.seg.a), cur = this.geo.get(o.id);
      const u = V.norm(V.sub(cur, other)), t = Math.max(6, V.dot(V.sub(p, other), u));
      o.x = other.x + u.x * t; o.y = other.y + u.y * t;
    } else if (d.kind === 'seg') {
      const a = this.obj(o.a), b = this.obj(o.b);
      if (a && b && a.k === 'free' && b.k === 'free') { a.x += dx; a.y += dy; b.x += dx; b.y += dy; }
    } else if (d.kind === 'cmove') this.moveCircle(o, dx, dy);
    else if (d.kind === 'csize') this.resizeCircle(o, p);
    else if (d.kind === 'slider') { const t = Math.max(0, Math.min(1, (p.x - o.x) / 140)); o.v = Math.round((o.min + t * (o.max - o.min)) * 10) / 10; }
    else if (d.kind === 'smove') { o.x += dx; o.y += dy; }
    else if (d.kind === 'free') {
      if (o.t === 'ink') for (let i = 0; i < o.pts.length; i += 2) { o.pts[i] += dx; o.pts[i + 1] += dy; }
      else if (o.t === 'text' || o.t === 'img') { o.x += dx; o.y += dy; }
    } else if (d.kind === 'pname') { const G = this.geo.get(o.id); if (G) { const v = { x: p.x - G.x, y: p.y - G.y }, L = Math.hypot(v.x, v.y), k = L > 60 ? 60 / L : 1; o.nx = Math.round(v.x * k); o.ny = Math.round(v.y * k); o.nmv = true; } }
    else if (d.kind === 'group') this.moveGroup(dx, dy);
    else if (d.kind === 'gscale') {
      const prev = { x: p.x - dx, y: p.y - dy }, d0 = V.dist(prev, d.o), d1 = V.dist(p, d.o);
      if (d0 > 10 && d1 > 10) this.scaleGroup(d1 / d0, d.o);
    }
    this.compute();
    if (this.tool === 'draw' || this.tool === 'select') this.liveInter(d);
    this.draw();
  }
  circlePoints(o) { return ['cen', 'p', 'a', 'b', 'd'].map(k => o[k]).filter(x => typeof x === 'number'); }
  moveCircle(o, dx, dy) { for (const id of this.circlePoints(o)) this.movePoint(id, dx, dy); }
  resizeCircle(o, p) {
    const G = this.geo.get(o.id); if (!G) return;
    const r = Math.max(4, V.dist(p, G));
    if (o.k === 'cr') o.r = r;
    else if (o.t === 'arc' && o.k !== 'cr') { for (const k of ['a', 'b']) { const q = this.obj(o[k]); if (q && q.k === 'free') { const a = angOf(G, q); q.x = G.x + r * Math.cos(a); q.y = G.y + r * Math.sin(a); } } }
    else if (o.k === 'cp') { const q = this.obj(o.p); if (q && q.k === 'free') { const a = angOf(G, q); q.x = G.x + r * Math.cos(a); q.y = G.y + r * Math.sin(a); } }
    else if (o.k === '3p') { const k = r / G.r; for (const id of [o.a, o.b, o.d]) { const q = this.obj(id); if (q && q.k === 'free') { q.x = G.x + (q.x - G.x) * k; q.y = G.y + (q.y - G.y) * k; } } }
    else toast('이 원은 크기를 바꿀 수 없습니다 (삼각형에 맞춰진 원)');
  }

  // ---------- 그룹 ----------
  objPoints(o) {   // 이 객체를 움직이려면 옮길 자유점들
    const out = new Set(), walk = id => { const q = this.obj(id); if (!q) return; if (q.t === 'pt' && q.k === 'free') out.add(id); else this.refsOf(q).forEach(walk); };
    if (o.t === 'pt') walk(o.id); else this.refsOf(o).forEach(walk);
    return out;
  }
  selectRect(a, b) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const inR = q => q && q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1;
    this.sel.clear();
    for (const o of this.data.objs) {
      const G = this.geo.get(o.id);
      let ok = false;
      if (o.t === 'pt') ok = inR(G);
      else if (o.t === 'ink') { ok = true; for (let i = 0; i < o.pts.length; i += 2) if (!inR({ x: o.pts[i], y: o.pts[i + 1] })) { ok = false; break; } }
      else if (o.t === 'text' || o.t === 'img' || o.t === 'slider') ok = inR(o);
      else if (o.t === 'graph') ok = false;
      else { const ps = [...this.objPoints(o)]; ok = ps.length > 0 && ps.every(id => inR(this.geo.get(id))); }
      if (ok) this.sel.add(o.id);
    }
    if (this.sel.size) this.say(`${this.sel.size}개를 골랐습니다. 끌어서 옮기거나 Delete 키로 지웁니다.`);
  }
  selBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const addP = q => { if (!q) return; x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); };
    for (const id of this.sel) {
      const o = this.obj(id); if (!o) continue; const G = this.geo.get(id);
      if (o.t === 'ink') for (let i = 0; i < o.pts.length; i += 2) addP({ x: o.pts[i], y: o.pts[i + 1] });
      else if (o.t === 'text' || o.t === 'img') { const hw = (o.t === 'img' ? o.w : o._w || 0) / 2, hh = (o.t === 'img' ? o.h : o._h || 0) / 2; addP({ x: o.x - hw, y: o.y - hh }); addP({ x: o.x + hw, y: o.y + hh }); }
      else if (o.t === 'slider') addP(o);
      else if (o.t === 'pt' && o.st === 'hid') continue;      // 숨은 점(원의 중심 등)은 테두리에 넣지 않음 — 선분 끝점은 선분이 넣음
      else if (G && G.arc) {   // 호: 실제로 그려진 부분만 (시계 반대 방향, a0 → a1)
        let span = G.a0 - G.a1; while (span <= 0) span += 2 * Math.PI; while (span > 2 * Math.PI) span -= 2 * Math.PI;
        for (let i = 0; i <= 24; i++) { const a = G.a0 - span * i / 24; addP({ x: G.x + G.r * Math.cos(a), y: G.y + G.r * Math.sin(a) }); }
      }
      else if (G && G.ci) { addP({ x: G.x - G.r, y: G.y - G.r }); addP({ x: G.x + G.r, y: G.y + G.r }); }
      else this.objPoints(o).forEach(pid => addP(this.geo.get(pid)));
    }
    return isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  moveGroup(dx, dy) {
    const pts = new Set();
    for (const id of this.sel) {
      const o = this.obj(id); if (!o) continue;
      if (o.t === 'ink') for (let i = 0; i < o.pts.length; i += 2) { o.pts[i] += dx; o.pts[i + 1] += dy; }
      else if (o.t === 'text' || o.t === 'img' || o.t === 'slider') { o.x += dx; o.y += dy; }
      else this.objPoints(o).forEach(p => pts.add(p));
    }
    pts.forEach(id => this.movePoint(id, dx, dy));
  }

  // 고른 것 전체를 기준점 o를 중심으로 k배
  scaleGroup(k, o) {
    const sp = q => ({ x: o.x + (q.x - o.x) * k, y: o.y + (q.y - o.y) * k });
    const pts = new Set();
    for (const id of this.sel) {
      const ob = this.obj(id); if (!ob) continue;
      if (ob.t === 'ink') { for (let i = 0; i < ob.pts.length; i += 2) { const q = sp({ x: ob.pts[i], y: ob.pts[i + 1] }); ob.pts[i] = q.x; ob.pts[i + 1] = q.y; } }
      else if (ob.t === 'text') { Object.assign(ob, sp(ob)); ob.sz = Math.max(8, (ob.sz || 20) * k); }
      else if (ob.t === 'img') { Object.assign(ob, sp(ob)); ob.w *= k; ob.h *= k; }
      else if (ob.t === 'slider') Object.assign(ob, sp(ob));
      else {
        this.objPoints(ob).forEach(p => pts.add(p));
        if (ob.k === 'cr' && ob.r) ob.r *= k;                // 반지름으로 정한 원·호
        if (ob.t === 'ldeco') ob.h *= k;
        if (ob.t === 'ang' && ob.r) ob.r = Math.max(8, ob.r * k);
      }
    }
    pts.forEach(id => { const q = this.obj(id); if (q && q.k === 'free') Object.assign(q, sp(q)); });
  }
  // ---------- 평행이동 (복사본) ----------
  translateCopy(a, b) {
    const ids = this.transIds || []; this.transIds = null; this.picks = [];
    if (!ids.length) return;
    this.snap();
    const dx = b.x - a.x, dy = b.y - a.y, map = new Map();
    const copyPt = id => {
      if (map.has(id)) return map.get(id);
      const src = this.obj(id), G = this.geo.get(id); if (!G) return null;
      const n = this.add({ t: 'pt', k: 'free', x: G.x + dx, y: G.y + dy, st: src.st === 'big' ? 'big' : src.st, col: src.col, auto: src.st !== 'big' });
      if (src.name) n.name = src.name + "'";
      map.set(id, n.id); return n.id;
    };
    for (const id of ids) {
      const o = this.obj(id), G = this.geo.get(id); if (!o) continue;
      if (o.t === 'pt') copyPt(id);
      else if (o.t === 'seg') this.add({ t: 'seg', a: copyPt(o.a), b: copyPt(o.b), col: o.col, dash: o.dash });
      else if (o.t === 'line' && G) { const p1 = this.newPoint({ x: G.p.x + dx, y: G.p.y + dy }, 'hid'), p2 = this.newPoint({ x: G.p.x + G.d.x * 50 + dx, y: G.p.y + G.d.y * 50 + dy }, 'hid'); this.add({ t: 'line', k: '2p', a: p1.id, b: p2.id, col: o.col }); }
      else if ((o.t === 'circ' || o.t === 'arc') && G) {
        const c = this.newPoint({ x: G.x + dx, y: G.y + dy }, 'hid');
        if (o.t === 'circ') this.add({ t: 'circ', k: 'cr', cen: c.id, r: G.r, col: o.col, dash: o.dash });
        else this.add({ t: 'arc', k: 'cr', cen: c.id, r: G.r, a0: G.a0, a1: G.a1, sec: o.sec, col: o.col });
      } else if (o.t === 'ink') this.add({ t: 'ink', pts: o.pts.map((v, i) => v + (i % 2 ? dy : dx)), col: o.col, w: o.w });
      else if (o.t === 'text') this.add({ t: 'text', x: o.x + dx, y: o.y + dy, s: o.s, sz: o.sz, it: o.it, col: o.col });
      else if (o.t === 'img') this.add({ t: 'img', x: o.x + dx, y: o.y + dy, w: o.w, h: o.h, src: o.src });
    }
    this.add({ t: 'vec', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    this.sel.clear(); this.say(TOOLS.trans.hint); this.afterEdit();
  }

  // ---------- 지우개 ----------
  eraseAt(p, tol) {
    const hit = this.hitTest(p, tol, ['pt', 'ln', 'ci', 'ink', 'text', 'graph', 'deco', 'slider']);
    if (!hit) return;
    if (hit.t === 'pt' && hit.st === 'hid') return;
    this.remove(hit.id); this.compute(); this.draw();
  }

  // ---------- 펜 ----------
  armHold(p) {
    this.holdAt = p; clearTimeout(this.holdT);
    this.holdT = setTimeout(() => {
      const s = this.stroke; if (!s || s.shape) return;
      const sh = recognizeShape(s.pts); if (sh) { s.shape = sh; this.draw(); }
    }, 400);
  }
  // ---------- 그리기: 손을 떼는 순간 알아봄 ----------
  // 누르기 → 점(이름), 동그라미 → 원, 두 점을 잇는 곡선 → 길이 표시, 꼭짓점 근처 호 → 각 표시, 나머지 → 직선
  finishDraw(s, tap, p, tol) {
    const now = performance.now();
    if (tap || pathLen(s.pts) < 6) {
      const lt = this.lastTap;
      if (lt && now - lt.t < 380 && V.dist(p, lt.p) < 14) {        // 두 번 누르기: 첫 번째에 생긴 점은 없던 일로
        this.lastTap = null;
        if (lt.created) { this.data = JSON.parse(this.undoStack.pop()); this.compute(); }
        this.doubleTap(p, tol); this.draw(); return;
      }
      let created = null;
      const hp = this.hitTest(p, tol, ['pt']);
      if (hp) {
        // 선분 양 끝점을 하나씩 누르면 → 꾸미기: 길이 표시 (글자 없이)
        const pend = this.pendPt;
        if (pend && pend.id !== hp.id && now - pend.t < 4000 && this.linkedPts(pend.id, hp.id)) {
          const dup = this.data.objs.some(o => o.t === 'ldeco' && ((o.a === pend.id && o.b === hp.id) || (o.a === hp.id && o.b === pend.id)));
          if (!dup) { this.snap(); this.add({ t: 'ldeco', a: pend.id, b: hp.id, h: this.ldecoSide(pend.id, hp.id) * 18, lab: '', col: this.color }); this.afterEdit(); }
          this.pendPt = null;
        } else this.pendPt = { id: hp.id, t: now };
        this.draw();
      } else if (!this.hitTest(p, tol, ['slider', 'text'])) { this.pendPt = null; this.snap(); created = this.newPoint(p, 'big').id; this.afterEdit(); }
      this.lastTap = { t: now, p, created };
      return;
    }
    this.snap();
    const pts = s.pts, e1 = pts[0], e2 = pts[pts.length - 1], added = [];
    const pa = this.hitTest(e1, 16, ['pt']), pb = this.hitTest(e2, 16, ['pt']);
    if (pa && pb && pa.id !== pb.id) {
      const A = this.geo.get(pa.id), B = this.geo.get(pb.id), L = V.dist(A, B), n = V.norm(V.perp(V.sub(B, A)));
      let hh = 0; for (const q of pts) { const d = V.dot(V.sub(q, A), n); if (Math.abs(d) > Math.abs(hh)) hh = d; }
      if (L > 15 && Math.abs(hh) > Math.max(10, L * 0.12)) {
        this.add({ t: 'ldeco', a: pa.id, b: pb.id, h: Math.sign(hh) * Math.min(80, Math.max(12, Math.abs(hh) * 0.8)), lab: '', col: s.col });
        this.afterEdit(); return;
      }
    }
    if (this.angleFromArc(s)) { this.afterEdit(); return; }
    // 닫힌 꺾은선(삼각형, 사각형 …) → 다각형: 꼭짓점을 공유하는 선분들
    const poly = recognizePolygon(pts);
    if (poly) {
      const ids = [];
      for (const q of poly) { const id = this.penEnd(q, ids[ids.length - 1]); if (!ids.includes(id)) ids.push(id); }
      if (ids.length >= 3) {
        // 꼭짓점 이름은 그린 순서대로 A, B, C …
        for (const id of ids) { const o = this.obj(id); if (o && o.t === 'pt' && !o.name) { o.st = 'big'; o.auto = false; o.name = this.nextName(); } }
        ids.forEach((a, i) => { const b = ids[(i + 1) % ids.length]; if (!this.data.objs.some(o => o.t === 'seg' && ((o.a === a && o.b === b) || (o.a === b && o.b === a)))) added.push(this.add({ t: 'seg', a, b, col: s.col }).id); });
        this.compute(); this.autoPoints(added); this.afterEdit(); return;
      }
    }
    const sh = recognizeShape(pts);
    if (sh && sh.t === 'circ') {
      const c = this.newPoint({ x: sh.x, y: sh.y }, 'hid');
      added.push(this.add({ t: 'circ', k: 'cr', cen: c.id, r: sh.r, col: s.col }).id);
    } else {
      const a = this.penEnd(e1), b = this.penEnd(e2, a);
      if (a !== b) added.push(this.add({ t: 'seg', a, b, col: s.col }).id);
    }
    this.compute(); this.autoPoints(added); this.afterEdit();
  }
  // 새 선·원이 다른 선·원과 만나는 곳에 점을 만들고 이름을 붙임 (이미 점이 있으면 그 점에 이름)
  // live: 끄는 중 (이미 있는 점에 이름을 새로 붙이지는 않음)
  autoPoints(ids, live, inside) {
    const lines = this.data.objs.filter(o => ['seg', 'line', 'circ', 'arc'].includes(o.t) && this.geo.get(o.id));
    for (const id of ids) {
      const gn = this.geo.get(id); if (!gn) continue;
      for (const o of lines) {
        if (o.id === id || (inside && inside.has(o.id))) continue;   // 함께 옮기는 것끼리는 원래 모양 그대로이므로 건너뜀
        const xs = intersect(gn, this.geo.get(o.id)).filter(X => X.x >= -5 && X.y >= -5 && X.x <= this.W + 5 && X.y <= this.H + 5);
        if (!xs.length) continue;
        // 이 두 도형의 교점이 이미 있으면(잠시 떨어져 안 보이는 것 포함) 새로 만들지 않음
        const pair = this.data.objs.filter(q => q.t === 'pt' && q.k === 'inter' && ((q.o1 === o.id && q.o2 === id) || (q.o1 === id && q.o2 === o.id)));
        if (pair.length >= xs.length) continue;
        for (const X of xs) {
          const ex = this.hitTest(X, 8, ['pt']);
          if (ex) continue;
          const q = this.add({ t: 'pt', k: 'inter', o1: o.id, o2: id, x: X.x, y: X.y, st: 'hid', col: '#111', ai: true });   // 점 모양 없이 — 두 번 누르면 점과 이름
          this.geo.set(q.id, { pt: true, x: X.x, y: X.y });
        }
      }
    }
  }
  // 끄는 동안 교점 표시: 움직인 점에 붙은 선·원들의 교점을 바로 만듦
  liveInter(d) {
    const moved = new Set();
    const o = d.id != null ? this.obj(d.id) : null;
    if ((d.kind === 'pt' || d.kind === 'rot') && o) moved.add(o.id);
    else if (d.kind === 'seg' && o) { moved.add(o.a); moved.add(o.b); }
    else if ((d.kind === 'cmove' || d.kind === 'csize') && o) { this.objPoints(o).forEach(x => moved.add(x)); }
    else if (d.kind === 'group' || d.kind === 'gscale') for (const id of this.sel) { const ob = this.obj(id); if (ob) this.objPoints(ob).forEach(x => moved.add(x)); }
    const ids = this.data.objs.filter(q => ['seg', 'line', 'circ', 'arc'].includes(q.t) && (q.id === d.id || [...this.objPoints(q)].some(x => moved.has(x)))).map(q => q.id);
    if (!ids.length) return;
    const group = d.kind === 'group' || d.kind === 'gscale';
    const n = this.data.objs.length; this.autoPoints(ids, true, group ? new Set(ids) : null);
    if (this.data.objs.length !== n) this.compute();
  }
  // 끌기가 끝났을 때 더 이상 만나지 않는 자동 교점은 지움
  dropDeadInter() {
    this.compute();
    this.data.objs.filter(o => o.t === 'pt' && o.k === 'inter' && o.ai && !this.geo.get(o.id)).forEach(o => this.obj(o.id) && this.remove(o.id));
  }
  // 선분 s를 그 위의 점 X에서 둘로 나눔 (새 조각은 s 바로 뒤에 넣어 계산 순서를 지킴, 뒤쪽 교점은 새 조각을 따르게)
  splitSeg(s, X) {
    const G0 = this.geo.get(s.id), at = this.geo.get(X), dd = G0 ? V.dot(G0.d, G0.d) || 1 : 1;
    const tX = G0 && at ? V.dot(V.sub(at, G0.p), G0.d) / dd : 0.5;
    const ns = { t: 'seg', a: X, b: s.b, col: s.col, dash: s.dash, w: s.w, id: this.data.seq++ };
    s.b = X; this.data.objs.splice(this.data.objs.indexOf(s) + 1, 0, ns);
    if (G0) for (const o of this.data.objs) if (o.t === 'pt' && o.k === 'inter' && (o.o1 === s.id || o.o2 === s.id) && V.dot(V.sub(o, G0.p), G0.d) / dd > tX) { if (o.o1 === s.id) o.o1 = ns.id; else o.o2 = ns.id; }
    return ns;
  }
  finishStroke(s, tap, p, tol) {
    if (s.mode === 'draw') return this.finishDraw(s, tap, p, tol);
    if (tap || pathLen(s.pts) < 6) { this.tapped(p, tol); return; }
    this.snap();
    if (s.shape && s.shape.t === 'seg') {
      const a = this.penEnd(s.shape.a), b = this.penEnd(s.shape.b, a);
      if (a !== b) this.add({ t: 'seg', a, b, col: s.col });
    } else if (s.shape && s.shape.t === 'circ') {
      const c = this.newPoint({ x: s.shape.x, y: s.shape.y }, 'hid');
      this.add({ t: 'circ', k: 'cr', cen: c.id, r: s.shape.r, col: s.col });
    } else if (!this.angleFromArc(s)) {
      const pts = simplify(s.pts, 0.8); const flat = []; pts.forEach(q => flat.push(Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10));
      this.add({ t: 'ink', pts: flat, col: s.col });
    }
    this.afterEdit();
  }
  // 펜으로 그은 선분의 끝: 가까운 점에 붙이고, 다른 선분 위면 그 선분을 나눠 꼭짓점을 공유
  penEnd(q, notId) {
    const hit = this.hitTest(q, 13, ['pt']); if (hit && hit.id !== notId) return hit.id;
    const s = this.hitTest(q, 9, ['ln']);
    if (s && s.t === 'seg' && this.obj(s.a).k === 'free' && this.obj(s.b).k === 'free') {
      const G = this.geo.get(s.id), { t } = distToLn(q, G);
      if (t > 0.04 && t < 0.96) {
        const at = V.add(G.p, V.mul(G.d, t)), X = this.newPoint(at, 'hid');
        this.splitSeg(s, X.id); this.compute();
        return X.id;
      }
    }
    return this.newPoint(q, 'hid').id;
  }
  // 두 선분이 만나는 곳 근처에 그은 호 → 각 표시 (90°는 직각 표시)
  angleFromArc(s) {
    const pts = s.pts, e1 = pts[0], e2 = pts[pts.length - 1];
    if (recognizeShape(pts, true)) return false;   // 거의 곧은 선이면 아님
    const near = q => this.data.objs.filter(o => o.t === 'seg' && this.geo.get(o.id) && distToLn(q, this.geo.get(o.id)).d < 14);
    for (const s1 of near(e1)) for (const s2 of near(e2)) {
      if (s1.id === s2.id) continue;
      const A = this.geo.get(s1.id), B = this.geo.get(s2.id);
      const full = g => ({ ln: true, p: g.p, d: g.d, t0: -0.08, t1: 1.08 });
      const xs = intersect(full(A), full(B)); if (!xs.length) continue;
      const X = xs[0];
      const ds = pts.map(q => V.dist(q, X)), m = ds.reduce((a, b) => a + b, 0) / ds.length;
      const sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) * (b - m), 0) / ds.length);
      if (m < 6 || m > 90 || sd / m > 0.28) continue;
      // 꼭짓점: 공유한 점이 있으면 그 점, 아니면 교점(숨은 점)
      const shared = [s1.a, s1.b].find(id => id === s2.a || id === s2.b);
      let v = shared;
      if (!v) { const hp = this.hitTest(X, 6, ['pt']); v = hp ? hp.id : this.add({ t: 'pt', k: 'inter', o1: s1.id, o2: s2.id, x: X.x, y: X.y, st: 'hid' }).id; }
      const arm = (sg, e) => { const ga = this.geo.get(sg.a), gb = this.geo.get(sg.b); const pick = [[sg.a, ga], [sg.b, gb]].filter(([id, g]) => id !== v && V.dist(g, X) > 3); const side = pick.find(([, g]) => V.dot(V.sub(g, X), V.sub(e, X)) > 0) || pick[0]; return side && side[0]; };
      const a = arm(s1, e1), b = arm(s2, e2); if (!a || !b) continue;
      this.add({ t: 'ang', a, v, b, r: Math.round(m), pen: true, col: s.col });
      return true;
    }
    return false;
  }

  // ---------- 그림 복사 결과 넣기 ----------
  insertFigure(fig) {
    this.snap();
    const k = Math.min((this.W * 0.8) / fig.w, (this.H * 0.8) / fig.h, 1.5);   // 칠판의 8할 정도 (풀이 쓸 자리 남김)
    const ox = (this.W - fig.w * k) / 2, oy = (this.H - fig.h * k) / 2, T = q => ({ x: ox + q.x * k, y: oy + q.y * k });
    const newIds = [], pid = new Map();
    const P = (i) => { if (!pid.has(i)) { const q = fig.points[i]; const o = this.newPoint(T(q), q.dot ? 'small' : 'hid'); o.auto = false; pid.set(i, o.id); newIds.push(o.id); } return pid.get(i); };
    const segIds = fig.segs.map(s => { const id = this.add({ t: 'seg', a: P(s.a), b: P(s.b), col: '#111', dash: s.dash || undefined }).id; newIds.push(id); return id; });
    // x축·y축 찾기: 글자 O 가까이를 지나는 가장 긴 가로 선분과 세로 선분
    const O = fig.labels.find(L => L.s === 'O');
    if (O && fig.labels.some(L => L.s === 'x' || L.s === 'y')) {
      const ox = O.x + O.w / 2, oy = O.y + O.h / 2, near = Math.max(fig.w, fig.h) * 0.09;
      let bh = null, bv = null;
      fig.segs.forEach((s, i) => {
        const a = fig.points[s.a], b = fig.points[s.b], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
        if (Math.abs(dy) < L * 0.03 && Math.abs((a.y + b.y) / 2 - oy) < near && L > fig.w * 0.15 && (!bh || L > bh.L)) bh = { i, L };
        if (Math.abs(dx) < L * 0.03 && Math.abs((a.x + b.x) / 2 - ox) < near && L > fig.h * 0.15 && (!bv || L > bv.L)) bv = { i, L };
      });
      if (bh && bv) this.data.axSegs = [segIds[bh.i], segIds[bv.i]];
    }
    for (const c of fig.circles) {
      const cen = this.newPoint(T(c), 'hid'); cen.auto = false; newIds.push(cen.id);
      if (c.full) newIds.push(this.add({ t: 'circ', k: 'cr', cen: cen.id, r: c.r * k, col: '#111', dash: c.dash || undefined }).id);
      else newIds.push(this.add({ t: 'arc', k: 'cr', cen: cen.id, r: c.r * k, a0: c.a0, a1: c.a1, col: '#111', dash: c.dash || undefined }).id);
    }
    fig.points.forEach((q, i) => { if (q.dot && !q.gone) P(i); });
    // 직각 표시: 원래 그림의 ㄱ자 표시 대신 직각 기호 (rt: 선이 1~2° 어긋나도 직각으로 그림)
    for (const r of fig.rights || []) newIds.push(this.add({ t: 'ang', a: P(r.a), v: P(r.v), b: P(r.b), r: Math.max(12, Math.round(14 * k)), pen: true, rt: true, col: '#111' }).id);
    for (const cv of fig.curves) { const flat = []; cv.forEach(q => { const t = T(q); flat.push(Math.round(t.x * 10) / 10, Math.round(t.y * 10) / 10); }); newIds.push(this.add({ t: 'ink', pts: flat, col: '#111', w: 2.2 }).id); }
    for (const L of fig.labels) {
      const c = T({ x: L.x + L.w / 2, y: L.y + L.h / 2 });
      if (L.s) newIds.push(this.add({ t: 'text', x: c.x, y: c.y, s: L.s, sz: Math.max(13, Math.round(L.h * k * 1.25)), it: L.it, col: '#111' }).id);
      else newIds.push(this.add({ t: 'img', x: c.x, y: c.y, w: L.w * k, h: L.h * k, src: L.src }).id);
    }
    this.compute();
    this.setTool('select'); this.sel = new Set(newIds);
    this.say('그림 전체가 골라져 있습니다 · 끌면 옮기기 · ↘ 손잡이로 크기');
    this.draw(); this.save();
  }
}
// ======================================================================
// 미리 만든 그림(figs.js의 설명) → 그림 복사 결과와 같은 모양
//   pts: { A: [x, y] 또는 [x, y, 'dot'] }   좌표는 문제 그림에서 자른 영역(box) 기준 픽셀
//   segs: ['A B', 'B C -'(점선), 'O X >'(화살표 끝)]
//   circ: [{ c: [x, y] 또는 'O', r, a: [시작, 끝](호, 캔버스 각도·시계 반대로 그림), dash }]
//   curves: [{ para: [a, b, c], x: [x0, x1] }  y = a x² + b x + c
//            { hyp: [k, p, q], x: [x0, x1] }   y = k / (x − p) + q
//            { pts: [[x, y], …] }, dash ]
//   txt / names: [[글자, 가운데 x, 가운데 y, 높이, 기울임(선택)]]   right: [['A', 'H', 'B']] (H에서 직각)
// ======================================================================
function figFromDSL(d) {
  const names = Object.keys(d.pts || {}), idx = Object.fromEntries(names.map((k, i) => [k, i]));
  const points = names.map(k => { const p = d.pts[k]; return { x: p[0], y: p[1], dot: p[2] === 'dot' }; });
  const P = k => { if (!(k in idx)) throw new Error(`${d.key}: 점 ${k}이 없습니다`); return idx[k]; };
  const segs = [];
  const addPt = (x, y) => { points.push({ x, y }); return points.length - 1; };
  for (const s of d.segs || []) {
    const [a, b, f] = s.split(/\s+/);
    segs.push({ a: P(a), b: P(b), dash: f === '-' });
    if (f === '>') {   // 화살표: 끝점 b에서 두 갈래
      const A = points[P(a)], B = points[P(b)], u = V.norm(V.sub(B, A)), n = V.perp(u), L = 9;
      for (const sg of [1, -1]) segs.push({ a: P(b), b: addPt(B.x - u.x * L + n.x * L * 0.55 * sg, B.y - u.y * L + n.y * L * 0.55 * sg) });
    }
  }
  const circles = (d.circ || []).map(c => {
    const C = typeof c.c === 'string' ? points[P(c.c)] : { x: c.c[0], y: c.c[1] };
    return c.a ? { x: C.x, y: C.y, r: c.r, full: false, a0: c.a[0], a1: c.a[1], dash: !!c.dash } : { x: C.x, y: C.y, r: c.r, full: true, dash: !!c.dash };
  });
  const curves = (d.curves || []).map(cv => {
    if (cv.pts) return cv.pts.map(([x, y]) => ({ x, y }));
    const out = [], [x0, x1] = cv.x, step = Math.max(1, (x1 - x0) / 160);
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      const y = cv.para ? cv.para[0] * x * x + cv.para[1] * x + cv.para[2] : cv.hyp[0] / (x - cv.hyp[1]) + cv.hyp[2];
      if (isFinite(y) && y > -d.h && y < 2 * d.h) out.push({ x, y });
    }
    return out;
  });
  // 기울임: 따로 정하지 않으면 소문자(x, y, f(x) …)가 있는 글자만. 점 이름·숫자는 바로 세움 (시험지와 같게)
  const labels = [...(d.names || []), ...(d.txt || [])].map(([s, x, y, hh, it]) => ({ s, x, y: y - hh / 2, w: 0, h: hh, it: it === undefined ? /[a-z]/.test(s) : !!it }));
  const rights = (d.right || []).map(([a, v, b]) => ({ a: P(a), v: P(v), b: P(b) }));
  return { w: d.w, h: d.h, points, segs, circles, curves, labels, rights };
}
// (개발용) 그림 설명을 캔버스에 그려 본다
function drawFigDSL(g, d) {
  const f = figFromDSL(d), P = f.points;
  g.save(); g.lineCap = 'round'; g.strokeStyle = '#111'; g.lineWidth = 2.2;
  for (const s of f.segs) { g.setLineDash(s.dash ? [7, 6] : []); g.beginPath(); g.moveTo(P[s.a].x, P[s.a].y); g.lineTo(P[s.b].x, P[s.b].y); g.stroke(); }
  for (const c of f.circles) { g.setLineDash(c.dash ? [7, 6] : []); g.beginPath(); if (c.full) g.arc(c.x, c.y, c.r, 0, 7); else g.arc(c.x, c.y, c.r, c.a0, c.a1, true); g.stroke(); }
  g.setLineDash([]); g.strokeStyle = '#0a5'; g.lineWidth = 2.4;
  for (const cv of f.curves) { g.beginPath(); cv.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); }
  g.fillStyle = '#111'; for (const p of P) if (p.dot) { g.beginPath(); g.arc(p.x, p.y, 3.5, 0, 7); g.fill(); }
  g.strokeStyle = '#06f'; g.lineWidth = 2;
  for (const r of f.rights) { const v = P[r.v], u = V.norm(V.sub(P[r.a], v)), w = V.norm(V.sub(P[r.b], v)), s = 12; g.beginPath(); g.moveTo(v.x + u.x * s, v.y + u.y * s); g.lineTo(v.x + u.x * s + w.x * s, v.y + u.y * s + w.y * s); g.lineTo(v.x + w.x * s, v.y + w.y * s); g.stroke(); }
  g.fillStyle = '#c00'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const L of f.labels) { g.font = `${L.it ? 'italic ' : ''}${Math.round(L.h * 1.25)}px "Times New Roman", serif`; g.fillText(L.s, L.x, L.y + L.h / 2); }
  g.restore();
}
// 글자 속 분수: '2√3/3', 'a/x', '1/2x'(= ½x) → [{s}, {f, n, d}, …]. 분모는 숫자 묶음 또는 글자 하나
function fracParts(s) {
  const out = [], re = /([0-9a-z√]+)\/(\d+|[a-z])/g; let m, at = 0;
  while ((m = re.exec(s))) { if (m.index > at) out.push({ s: s.slice(at, m.index) }); out.push({ f: true, n: m[1], d: m[2] }); at = re.lastIndex; }
  if (at < s.length) out.push({ s: s.slice(at) });
  return out;
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function pathLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += V.dist(pts[i], pts[i - 1]); return s; }
// Douglas–Peucker
function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [i, j] = st.pop(); let md = 0, mi = -1;
    const g = { p: pts[i], d: V.sub(pts[j], pts[i]), t0: 0, t1: 1 };
    for (let k = i + 1; k < j; k++) { const d = distToLn(pts[k], g).d; if (d > md) { md = d; mi = k; } }
    if (md > eps) { keep[mi] = 1; st.push([i, mi], [mi, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// 손으로 그린 닫힌 획 → 다각형 꼭짓점 (3~8개). 동그라미에 가까우면 null
function recognizePolygon(pts) {
  if (pts.length < 8 || pathLen(pts) < 60) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const diag = Math.hypot(x1 - x0, y1 - y0); if (diag < 35) return null;
  const close = Math.max(24, diag * 0.2);
  if (V.dist(pts[0], pts[pts.length - 1]) > close) return null;               // 닫힌 모양만
  const c = fitCircle(pts); if (c && c.rms < c.r * 0.075) return null;        // 동그라미는 원으로
  // 시작점에서 가장 먼 점으로 둘로 나눠 각각 꺾인 곳 찾기
  let k = 0, md = 0; pts.forEach((q, i) => { const d = V.dist(q, pts[0]); if (d > md) { md = d; k = i; } });
  const eps = Math.max(7, diag * 0.07);
  let vs = [...simplify(pts.slice(0, k + 1), eps), ...simplify(pts.slice(k), eps).slice(1)];
  if (vs.length > 1 && V.dist(vs[0], vs[vs.length - 1]) < close) vs.pop();
  // 너무 가까운 꼭짓점·거의 곧은 꼭짓점(시작점이 변 가운데였던 경우 등)은 빼기
  for (let changed = true; changed && vs.length > 3;) {
    changed = false;
    for (let i = 0; i < vs.length && vs.length > 3; i++) {
      const a = vs[(i + vs.length - 1) % vs.length], v = vs[i], b = vs[(i + 1) % vs.length];
      const u = V.norm(V.sub(v, a)), w = V.norm(V.sub(b, v)), turn = Math.acos(Math.max(-1, Math.min(1, V.dot(u, w))));
      if (V.dist(a, v) < diag * 0.1 || turn < 0.38) { vs.splice(i, 1); changed = true; break; }
    }
  }
  if (vs.length < 3 || vs.length > 8) return null;
  // 획이 다각형 변에서 멀리 벗어나면 다각형 아님
  const segD = q => Math.min(...vs.map((a, i) => distToLn(q, { p: a, d: V.sub(vs[(i + 1) % vs.length], a), t0: 0, t1: 1 }).d));
  let far = 0; for (const q of pts) far = Math.max(far, segD(q));
  if (far > Math.max(10, diag * 0.12)) return null;
  return vs;
}
// 손으로 그린 획 → 직선 또는 원(타원 아님)
function recognizeShape(pts, lineOnly) {
  if (pts.length < 4) return null;
  const L = pathLen(pts); if (L < 18) return null;
  const a = pts[0], b = pts[pts.length - 1], chord = V.dist(a, b);
  const g = { p: a, d: V.sub(b, a), t0: 0, t1: 1 };
  let md = 0; for (const q of pts) md = Math.max(md, distToLn(q, g).d);
  if (chord > 15 && md < Math.max(5, chord * 0.07) && L < chord * 1.25) return { t: 'seg', a, b };
  if (lineOnly) return null;
  const c = fitCircle(pts); if (!c || c.r < 8) return null;
  const cov = Math.abs(angleCoverage(pts, c));
  if (cov > Math.PI * 1.55 && c.rms < c.r * 0.16) return { t: 'circ', x: c.x, y: c.y, r: c.r };
  return null;
}

// ======================================================================
// 그림 복사: 문제 그림(래스터)에서 선분·원·점·글자를 찾아 벡터 도형으로
// ======================================================================
async function vectorizeFigure(img, [sx, sy, sw, sh]) {
  if (!img.complete) await new Promise(r => img.onload = r);
  const W = sw, H = sh, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const px = g.getImageData(0, 0, W, H).data, bin = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) bin[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) < 165 ? 1 : 0;
  const scale = img.naturalWidth / 1000;            // 문제 그림 폭 1000 기준 배율
  // 1) 연결 요소
  const lab = new Int32Array(W * H).fill(-1), comps = [];
  for (let i = 0; i < W * H; i++) if (bin[i] && lab[i] < 0) {
    const c = { px: [], x0: W, y0: H, x1: 0, y1: 0 }, st = [i]; lab[i] = comps.length;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j / W) | 0; c.px.push(j);
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = Y * W + X; if (bin[k] && lab[k] < 0) { lab[k] = comps.length; st.push(k); }
      }
    }
    c.w = c.x1 - c.x0 + 1; c.h = c.y1 - c.y0 + 1; comps.push(c);
  }
  // 2) 분류: 점(작고 꽉 찬 원), 글자(작은 덩어리), 그림
  const TXT = 34 * scale, DOT = 11 * scale;
  const dots = [], texts = [], draw = new Uint8Array(W * H), tiny = [];
  // 등호(=): 짧고 얇은 가로 막대 두 개가 위아래로 가까이 있으면 글자 하나로 (그림 선분이나 ′ 표시로 잘못 가던 것)
  const bars = comps.filter(c => c.h <= 4 * scale && c.w >= 7 * scale && c.w <= 32 * scale);
  for (const a of bars) {
    if (a.eq) continue;
    const b = bars.find(b => b !== a && !b.eq && Math.abs((b.y0 + b.y1) - (a.y0 + a.y1)) / 2 >= 4 * scale && Math.abs((b.y0 + b.y1) - (a.y0 + a.y1)) / 2 <= 14 * scale
      && Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) >= 0.7 * Math.min(a.w, b.w));
    if (!b) continue;
    a.eq = b.eq = true;
    const m = { px: [...a.px, ...b.px], x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), forced: '=' };
    m.w = m.x1 - m.x0 + 1; m.h = m.y1 - m.y0 + 1; texts.push(m);
  }
  for (const c of comps) {
    if (c.eq) continue;
    const n = c.px.length, mx = Math.max(c.w, c.h);
    if (n < 2) continue;
    if (mx <= DOT) { tiny.push(c); continue; }
    const mn = Math.min(c.w, c.h), thinLine = mn <= 3 * scale && mx > 8 * scale;
    if (mx <= TXT && !thinLine && c.h >= 6 * scale) { texts.push(c); continue; }
    if (mx <= TXT && thinLine && mx < 10 * scale) continue;   // 아주 짧은 표식은 버림
    for (const j of c.px) draw[j] = 1;
  }
  // 작은 조각들: 줄지어 있으면 점선(원·호 또는 선분), 혼자면 점 표시
  const tc = tiny.map(c => ({ c, x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, g: -1 }));
  const link = 16 * scale; let gid = 0;
  for (const a of tc) if (a.g < 0) { a.g = gid; const st = [a]; while (st.length) { const p = st.pop(); for (const b of tc) if (b.g < 0 && V.dist(p, b) <= link) { b.g = gid; st.push(b); } } gid++; }
  const dashArcs = [], dashSegs = [];
  for (let k = 0; k < gid; k++) {
    const mem = tc.filter(t => t.g === k);
    if (mem.length >= 4) {
      const c = fitCircle(mem);
      const a0 = mem[0], fl = mem.reduce((m, t) => V.dist(t, a0) > V.dist(m, a0) ? t : m), fr = mem.reduce((m, t) => V.dist(t, fl) > V.dist(m, fl) ? t : m);
      const gl = { p: fl, d: V.sub(fr, fl), t0: 0, t1: 1 }; let md = 0; for (const t of mem) md = Math.max(md, distToLn(t, gl).d);
      if (md < 2.5 * scale) dashSegs.push({ a: { x: fl.x, y: fl.y }, b: { x: fr.x, y: fr.y }, cov: 1 });
      else if (c && c.rms < 2.5 * scale && c.r < 1.5 * Math.max(W, H)) {
        // 조각 사이 각도를 메워 둔다
        const angs = []; mem.forEach(t => angs.push(angOf(c, t)));
        dashArcs.push({ x: c.x, y: c.y, r: c.r, angs, n: mem.length, dash: true });
      }
      continue;
    }
    for (const t of mem) {
      const n = t.c.px.length, mx = Math.max(t.c.w, t.c.h), mn = Math.min(t.c.w, t.c.h);
      if (n / (t.c.w * t.c.h) > 0.55 && mx >= 4 * scale && mn >= mx * 0.6) dots.push({ x: t.x, y: t.y });
    }
  }
  // 3) 얇게 (Zhang–Suen)
  thin(draw, W, H);
  // 4) 뼈대를 사슬로
  const chains = traceChains(draw, W, H);
  // 4-1) 그래프 곡선: 축이나 다른 선과 엇갈리는 곳에서 끊긴 조각을 이어 붙여 포물선·반비례 곡선으로 맞춘다
  //      (끊긴 짧은 조각이 선분이 되어 곡선이 꺾이거나 다른 선 뒤로 숨던 것)
  const graph = fitGraphCurves(chains, scale);
  // 5) 사슬 → 선분 / 호 / 곡선
  let segs = [], arcs = [], curves = graph.curves.slice();
  const tryArc = sub => {
    if (sub.length < 12) return false;
    const c = fitCircle(sub);
    if (!c || c.r <= 6 || c.r > 1.5 * Math.max(W, H) || c.rms > Math.max(0.8, Math.min(1.6, c.r * 0.012))) return false;
    // 진짜로 굽은 것만 (현에서 가장 먼 거리 = 활꼴 높이가 충분히 클 때)
    const a = sub[0], b = sub[sub.length - 1], gl = { p: a, d: V.sub(b, a), t0: 0, t1: 1 };
    let sag = 0; for (const q of sub) sag = Math.max(sag, distToLn(q, gl).d);
    if (Math.abs(angleCoverage(sub, c)) < 0.6 || !(sag > 5 || V.dist(a, b) < 4)) return false;
    arcs.push({ x: c.x, y: c.y, r: c.r, angs: sub.map(q => angOf(c, q)), n: sub.length }); return true;
  };
  for (const [ci, ch] of chains.entries()) {
    if (ch.length < 6 || graph.used.has(ci)) continue;
    if (!recognizeShape(ch, true) && tryArc(ch)) continue;
    // 꺾이는 곳(30° 넘게)에서만 나눔 → 곧은 조각은 선분, 완만하게 휘는 조각은 곡선(그래프 등)
    const sp = simplify(ch, 1.5), runs = []; let run = [sp[0]];
    for (let i = 1; i < sp.length; i++) {
      run.push(sp[i]);
      if (i < sp.length - 1) {
        const u = V.norm(V.sub(sp[i], sp[i - 1])), w = V.norm(V.sub(sp[i + 1], sp[i]));
        if (Math.acos(Math.max(-1, Math.min(1, V.dot(u, w)))) > Math.PI / 6) { runs.push(run); run = [sp[i]]; }
      }
    }
    runs.push(run);
    for (const r of runs) {
      const lens = []; for (let i = 1; i < r.length; i++) lens.push(V.dist(r[i - 1], r[i]));
      const i0 = ch.indexOf(r[0]), i1 = ch.indexOf(r[r.length - 1]), sub = ch.slice(Math.min(i0, i1), Math.max(i0, i1) + 1);
      // 전체가 현에서 2px 안쪽이면 (픽셀 흔들림일 뿐) 곧은 선분
      const A0 = r[0], A1 = r[r.length - 1], chord = V.dist(A0, A1), gl = { p: A0, d: V.sub(A1, A0), t0: 0, t1: 1 };
      let dev = 0; for (const q of sub) dev = Math.max(dev, distToLn(q, gl).d);
      if (r.length > 2 && chord >= 6 && dev <= Math.max(2.2, chord * 0.012)) { segs.push({ a: { ...A0 }, b: { ...A1 }, cov: chord }); continue; }
      const isCurve = r.length >= 4 || (r.length === 3 && Math.min(...lens) < 20);
      if (!isCurve) { for (let i = 1; i < r.length; i++) if (lens[i - 1] >= 6) segs.push({ a: { ...r[i - 1] }, b: { ...r[i] }, cov: lens[i - 1] }); continue; }
      if (tryArc(sub)) continue;
      curves.push(simplify(sub, 0.9));
    }
  }
  // 6) 같은 직선 위 조각 합치기 (점선 포함)
  const dir = s => V.norm(V.sub(s.b, s.a));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i], B = segs[j], u = dir(A), w = dir(B);
      if (Math.abs(V.cross(u, w)) > 0.06) continue;
      const g0 = { p: A.a, d: u, t0: -1e9, t1: 1e9 };
      if (distToLn(B.a, g0).d > 2.6 || distToLn(B.b, g0).d > 2.6) continue;
      const tA = [0, V.dot(V.sub(A.b, A.a), u)], tB = [V.dot(V.sub(B.a, A.a), u), V.dot(V.sub(B.b, A.a), u)].sort((x, y) => x - y);
      const gap = Math.max(tB[0] - tA[1], tA[0] - tB[1]);
      if (gap > 14 * Math.max(1, scale)) continue;
      const lo = Math.min(tA[0], tB[0]), hi = Math.max(tA[1], tB[1]);
      segs[i] = { a: V.add(A.a, V.mul(u, lo)), b: V.add(A.a, V.mul(u, hi)), cov: A.cov + B.cov };
      segs.splice(j, 1); merged = true; break outer;
    }
  }
  segs = segs.filter(s => V.dist(s.a, s.b) >= 8 * scale);
  for (const s of segs) { s.dash = s.cov / V.dist(s.a, s.b) < 0.72 && V.dist(s.a, s.b) > 30; const u = dir(s), e = 1.2 * scale; s.a = V.sub(s.a, V.mul(u, e)); s.b = V.add(s.b, V.mul(u, e)); }
  for (const s of dashSegs) segs.push({ ...s, dash: true });
  // 7) 호 합치기 → 원/호
  const circles = [];
  arcs.sort((a, b) => b.n - a.n);
  for (const a of arcs) {
    const m = circles.find(c => V.dist(c, a) < Math.max(3, c.r * 0.07) && Math.abs(c.r - a.r) < Math.max(3, c.r * 0.07));
    if (m) { const t = m.n + a.n; m.x = (m.x * m.n + a.x * a.n) / t; m.y = (m.y * m.n + a.y * a.n) / t; m.r = (m.r * m.n + a.r * a.n) / t; m.n = t; m.angs.push(...a.angs); }
    else circles.push({ ...a, angs: a.angs.slice() });
  }
  const outC = [];
  for (const c of circles) {
    const bins = new Uint8Array(360); for (const a of c.angs) bins[Math.floor(normA(a) * 180 / Math.PI) % 360] = 1;
    const filled = bins.reduce((s, v) => s + v, 0);
    if (filled < 20) continue;
    // 빈 곳이 짧으면(점선) 메움
    const gaps = []; let i0 = bins.indexOf(1);
    for (let k = 1, run = 0; k <= 360; k++) { const i = (i0 + k) % 360; if (!bins[i]) run++; else { if (run) gaps.push([i, run]); run = 0; } }
    const big = gaps.filter(([, r]) => r > 22);
    const dash = filled < 300 && gaps.length > 6 && !big.length;
    if (!big.length) { outC.push({ x: c.x, y: c.y, r: c.r, full: true, dash }); continue; }
    const [endI, run] = big.reduce((m, x) => x[1] > m[1] ? x : m);    // 가장 큰 빈 곳을 빼고 나머지가 호
    const gapStart = (endI - run + 360) % 360;
    // 캔버스 각도로 a0(시작) → a1, 시계 반대(각도 감소) 방향으로 그림: 빈 곳 끝(endI)에서 시작해 빈 곳 시작(gapStart)까지 증가 방향 = 반대로 지정
    outC.push({ x: c.x, y: c.y, r: c.r, full: false, a0: (gapStart) * Math.PI / 180, a1: endI * Math.PI / 180 });
  }
  // 점선 원·호: 가장 크게 빈 각도를 빼고 나머지
  for (const c of dashArcs) {
    const A = c.angs.map(normA).sort((a, b) => a - b); let gi = A.length - 1, gmax = A[0] + 2 * Math.PI - A[A.length - 1];
    for (let i = 0; i < A.length - 1; i++) if (A[i + 1] - A[i] > gmax) { gmax = A[i + 1] - A[i]; gi = i; }
    if (gmax < 0.7) outC.push({ x: c.x, y: c.y, r: c.r, full: true, dash: true });
    else outC.push({ x: c.x, y: c.y, r: c.r, full: false, dash: true, a0: A[gi], a1: A[(gi + 1) % A.length] });
  }
  // 8) 끝점 모으기 → 공유 점, T자 연결은 선분을 나눔. 선분마다 처음 맞춘 직선(p, u)을 기억해 둔다
  const sc1 = Math.max(1, scale);
  const points = [];
  const ptIdx = q => { let best = -1, bd = 7 * sc1; points.forEach((p, i) => { const d = V.dist(p, q); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { const p = points[best]; p.x = (p.x * p.n + q.x) / (p.n + 1); p.y = (p.y * p.n + q.y) / (p.n + 1); p.n++; return best; } points.push({ x: q.x, y: q.y, n: 1 }); return points.length - 1; };
  let S = segs.map(s => ({ a: ptIdx(s.a), b: ptIdx(s.b), dash: s.dash, p: { ...s.a }, u: dir(s) }));
  for (let pi = 0; pi < points.length; pi++) {
    const q = points[pi];
    for (let si = 0; si < S.length; si++) {
      const s = S[si]; if (s.a === pi || s.b === pi) continue;
      const A = points[s.a], B = points[s.b], gl = { p: A, d: V.sub(B, A), t0: 0, t1: 1 }, r = distToLn(q, gl);
      if (r.d < 5 * sc1 && r.t > 0.03 && r.t < 0.97) { const b = s.b; s.b = pi; S.push({ a: pi, b, dash: s.dash, p: s.p, u: s.u }); }
    }
  }
  S = S.filter(s => s.a !== s.b);
  const lenOf = s => V.dist(points[s.a], points[s.b]);
  const other = (s, i) => s.a === i ? s.b : s.a;
  const at = i => S.filter(s => s.a === i || s.b === i);
  // 8-1) 직각 표시: 짧은 두 선분이 직각으로 꺾인 ㄱ자이고, 그 두 끝이 각각 긴 선 위에 있으면
  //      꼭짓점(꺾인 점의 맞은편)에 직각 표시로 바꾸고, ㄱ자 선분은 지운다
  const rights = [];
  const MARK = 30 * scale;
  for (let ci = 0; ci < points.length; ci++) {
    const sh = at(ci).filter(s => !s.dash && lenOf(s) <= MARK && lenOf(s) >= 3 * scale);
    for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) {
      const p1 = other(sh[i], ci), p2 = other(sh[j], ci), C = points[ci], P1 = points[p1], P2 = points[p2];
      const d1 = V.norm(V.sub(P1, C)), d2 = V.norm(V.sub(P2, C));
      if (Math.abs(V.dot(d1, d2)) > 0.26) continue;                         // 직각에서 15° 넘게 벗어나면 아님
      const Vq = V.add(P1, V.sub(P2, C));                                    // 꼭짓점 = P1 + P2 − C
      // 꼭짓점에서 P1, P2 쪽으로 긴 선분이 나가 있어야 한다
      const longAt = (P, d) => S.find(s => s !== sh[i] && s !== sh[j] && lenOf(s) > MARK && Math.abs(V.cross(s.u, d)) < 0.2 && distToLn(P, { p: points[s.a], d: V.sub(points[s.b], points[s.a]), t0: -0.05, t1: 1.05 }).d < 4 * sc1);
      const L1 = longAt(P1, V.norm(V.sub(P1, Vq))), L2 = longAt(P2, V.norm(V.sub(P2, Vq)));
      if (!L1 || !L2) continue;
      rights.push({ x: Vq.x, y: Vq.y, d1: V.norm(V.sub(P1, Vq)), d2: V.norm(V.sub(P2, Vq)) });
      S = S.filter(s => s !== sh[i] && s !== sh[j]);
      i = j = sh.length;
    }
  }
  // 두 선분만 만나는 점이 거의 일직선 위면(픽셀 흔들림으로 갈라진 것) 하나로 합침
  for (let changed = true; changed;) {
    changed = false;
    for (let pi = 0; pi < points.length && !changed; pi++) {
      const at = S.filter(s => s.a === pi || s.b === pi); if (at.length !== 2 || at[0].dash !== at[1].dash) continue;
      const o1 = at[0].a === pi ? at[0].b : at[0].a, o2 = at[1].a === pi ? at[1].b : at[1].a; if (o1 === o2) continue;
      const g = { p: points[o1], d: V.sub(points[o2], points[o1]), t0: 0, t1: 1 }, r = distToLn(points[pi], g);
      if (r.d <= 2.5 * Math.max(1, scale) && r.t > 0 && r.t < 1) { S = S.filter(s => s !== at[0] && s !== at[1]); S.push({ a: o1, b: o2, dash: at[0].dash, p: { ...points[o1] }, u: V.norm(V.sub(points[o2], points[o1])) }); changed = true; }
    }
  }
  // 8-2) 꼭짓점 모으기: 가까이 있는 두 끝점의 선이 서로 만나는 곳이 두 끝점 모두와 가까우면, 그 교점 하나로 합친다
  //      (선을 얇게 하면 꼭짓점 근처가 조금씩 어긋나서 한 점에 모이지 않던 것)
  const cross = (s, t) => { const den = V.cross(s.u, t.u); if (Math.abs(den) < 0.17) return null; const k = V.cross(V.sub(t.p, s.p), t.u) / den; return V.add(s.p, V.mul(s.u, k)); };
  const SNAP = 22 * sc1;   // 뾰족한 꼭짓점은 얇게 할 때 갈림이 17px쯤 아래로 내려온다
  const mergePt = (keep, gone, X) => { for (const s of S) { if (s.a === gone) s.a = keep; if (s.b === gone) s.b = keep; } points[keep].x = X.x; points[keep].y = X.y; points[gone].gone = true; };
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < points.length && !changed; i++) if (!points[i].gone) for (let j = i + 1; j < points.length && !changed; j++) {
      if (points[j].gone || V.dist(points[i], points[j]) > SNAP) continue;
      const si = at(i), sj = at(j); if (!si.length || !sj.length) continue;
      // 두 점을 잇는 선분이 있으면: 아주 짧은 부스러기이거나, 뾰족한 꼭짓점에서 두 선이 뭉쳐 생긴 줄기
      // (이어진 선과 거의 같은 방향)일 때만 합치고, 아니면 진짜 짧은 선분이므로 둘 다 살림
      const link = S.find(s => (s.a === i && s.b === j) || (s.a === j && s.b === i));
      const dij = V.dist(points[i], points[j]);
      if (link) {
        const d = V.norm(V.sub(points[i], points[j]));
        const trunk = [...si, ...sj].some(s => s !== link && Math.abs(V.cross(s.u, d)) < 0.35);
        if (dij > SNAP / 2 && !trunk) continue;
      }
      const lim = link ? Math.max(SNAP, dij + 4 * sc1) : SNAP;
      for (const s of si) { if (s === link) continue; for (const t of sj) { if (t === link) continue; const X = cross(s, t); if (X && V.dist(X, points[i]) < lim && V.dist(X, points[j]) < lim) { mergePt(i, j, X); changed = true; break; } } if (changed) break; }
    }
  }
  S = S.filter(s => s.a !== s.b);
  // 8-3) 두 개 넘는 선이 모이는 점은 그 선들이 가장 잘 만나는 자리(최소제곱 교점)로 옮긴다
  for (let i = 0; i < points.length; i++) {
    if (points[i].gone) continue;
    const ls = at(i); if (ls.length < 2) continue;
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    for (const s of ls) { const n = V.perp(s.u), c = V.dot(n, s.p); a11 += n.x * n.x; a12 += n.x * n.y; a22 += n.y * n.y; b1 += n.x * c; b2 += n.y * c; }
    const det = a11 * a22 - a12 * a12; if (Math.abs(det) < 0.05 * ls.length) continue;   // 거의 한 방향뿐이면 그대로
    const X = { x: (a22 * b1 - a12 * b2) / det, y: (a11 * b2 - a12 * b1) / det };
    if (V.dist(X, points[i]) < SNAP) { points[i].x = X.x; points[i].y = X.y; }
  }
  // 8-4) 직각 표시를 점 이름으로: 꼭짓점과, 그 점에서 두 방향으로 나간 선분의 다른 끝
  const rightOut = [];
  for (const R of rights) {
    let v = -1, bd = SNAP; points.forEach((p, i) => { if (!p.gone && V.dist(p, R) < bd) { bd = V.dist(p, R); v = i; } });
    if (v < 0) continue;
    const toward = d => { const s = at(v).find(s => V.dot(V.norm(V.sub(points[other(s, v)], points[v])), d) > 0.95); return s ? other(s, v) : -1; };
    const a = toward(R.d1), b = toward(R.d2);
    if (a >= 0 && b >= 0) rightOut.push({ a, v, b });
  }
  for (const d of dots) { let best = -1, bd = 9 * Math.max(1, scale); points.forEach((p, i) => { const dd = V.dist(p, d); if (!p.gone && dd < bd) { bd = dd; best = i; } }); if (best >= 0) points[best].dot = true; else points.push({ x: d.x, y: d.y, n: 1, dot: true }); }
  // 9) 글자 읽기
  const labels = readLabels(texts, bin, W, H, cv, scale);
  // 9-1) 숫자인지 점 이름인지: 1과 I, 0과 O는 모양으로 가리기 어렵다.
  //      숫자가 하나라도 섞여 있거나, 꼭짓점·점과 떨어져 변 옆(길이 자리)에 있으면 숫자로 읽는다
  const used = points.filter(p => !p.gone && (p.dot || S.some(s => points[s.a] === p || points[s.b] === p)));
  const anchors = [...used, ...outC.map(c => ({ x: c.x, y: c.y }))];
  for (const L of labels) {
    if (!L.s || !L.dig || L.s === L.dig) continue;
    const c = { x: L.x + L.w / 2, y: L.y + L.h / 2 }, near = Math.min(Infinity, ...anchors.map(p => V.dist(p, c)));
    if (!/^[0-9IlOo|]+$/.test(L.s)) continue;                        // 2a, x2 처럼 진짜 글자가 섞이면 그대로
    // 닮은 글자(I l | O o)만 그 글자의 숫자 읽기로 바꿈. 세리프체 7도 I로 읽히므로 1로 정하지 않고 숫자 견본에 맡긴다
    const asNum = () => { L.s = [...L.s].map((ch, i) => /[IlOo|]/.test(ch) ? (L.dig[i] || ch) : ch).join(''); L.it = false; };
    if (/[0-9]/.test(L.s)) { asNum(); continue; }                    // 숫자가 섞여 있으면 모두 숫자 (I3 → 13)
    // I 하나뿐이면 모양 점수로: 점 이름 I(내심 등)는 숫자 1보다 0.04 넘게 더 닮고, 숫자 1은 차이가 0.02 안쪽이다
    if (/^[Il|]$/.test(L.s)) { if (L.gap < 0.03) asNum(); continue; }
    // O 하나뿐이면: 꼭짓점과 떨어져 있고, 변의 가운데 쪽이나 점선 호(길이 표시) 바로 옆에 있을 때만 숫자 0
    const sz = Math.max(L.w, L.h);
    if (near <= sz * 1.6 + 8 * scale) continue;
    const bySide = S.some(s => { const A = points[s.a], B = points[s.b], r = distToLn(c, { p: A, d: V.sub(B, A), t0: 0, t1: 1 }); return r.t > 0.2 && r.t < 0.8 && r.d < sz * 2.2; })
      || outC.some(o => o.dash && Math.abs(V.dist(o, c) - o.r) < sz * 1.8);
    if (bySide) asNum();
  }
  return { w: W, h: H, segs: S, points, circles: outC, curves, labels, rights: rightOut };
}

// 끊긴 사슬 조각을 매끄럽게 이어지는 것끼리 잇고, 세로축 포물선 y = ax² + bx + c 또는 y = k/(x − p) + q 로 맞춘다.
// 반환: { curves: [[{x, y}, …]] (식에서 다시 뽑은 점), used: 곡선에 쓰인 사슬 번호 }
function fitGraphCurves(chains, scale) {
  const out = { curves: [], used: new Set() };
  // 사슬 끝마다 바깥쪽 방향
  const ends = [];
  chains.forEach((ch, i) => {
    if (ch.length < 4) return;
    const k = Math.min(10, ch.length - 1);
    ends.push({ i, at: 0, p: ch[0], d: V.norm(V.sub(ch[0], ch[k])) });
    ends.push({ i, at: 1, p: ch[ch.length - 1], d: V.norm(V.sub(ch[ch.length - 1], ch[ch.length - 1 - k])) });
  });
  // 같은 갈림점에서 거의 반대 방향(155° 넘게 곧게 이어짐)인 두 끝을 짝지음
  const cand = [];
  for (let a = 0; a < ends.length; a++) for (let b = a + 1; b < ends.length; b++) {
    const A = ends[a], B = ends[b];
    if (A.i === B.i || V.dist(A.p, B.p) > 4) continue;
    const dt = V.dot(A.d, B.d); if (dt < -0.9) cand.push([dt, a, b]);
  }
  cand.sort((x, y) => x[0] - y[0]);
  const link = new Map();
  for (const [, a, b] of cand) if (!link.has(a) && !link.has(b)) { link.set(a, b); link.set(b, a); }
  const endIdx = (i, at) => ends.findIndex(e => e.i === i && e.at === at);
  // 이어진 사슬 묶음을 따라가며 점을 한 줄로
  const seen = new Set();
  const walk = (i, from) => {   // from: 이 사슬에 들어온 끝(0 또는 1)
    const pts = [], ids = [];
    let cur = i, inAt = from;
    while (cur != null && !seen.has(cur)) {
      seen.add(cur); ids.push(cur);
      const ch = inAt === 0 ? chains[cur] : chains[cur].slice().reverse();
      pts.push(...ch);
      const outEnd = endIdx(cur, 1 - inAt), nx = outEnd >= 0 ? link.get(outEnd) : undefined;
      if (nx === undefined) break;
      cur = ends[nx].i; inAt = ends[nx].at;
    }
    return { pts, ids };
  };
  const starts = [];
  chains.forEach((ch, i) => { if (ch.length < 4) return; const e0 = endIdx(i, 0), e1 = endIdx(i, 1); if (!link.has(e0)) starts.push([i, 0]); else if (!link.has(e1)) starts.push([i, 1]); });
  const groups = starts.map(([i, at]) => seen.has(i) ? null : walk(i, at)).filter(Boolean);
  const tol = 1.8 * Math.max(1, scale);
  for (const g of groups) {
    const P = g.pts; if (P.length < 40) continue;
    const xs = P.map(q => q.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 - x0 < 20 * scale || pathLen(P) < 50 * scale) continue;
    // 곧은 선(축 등)은 그대로 둠: 현에서 충분히 휘어야 곡선
    const a = P[0], b = P[P.length - 1], gl = { p: a, d: V.sub(b, a), t0: -1e9, t1: 1e9 };
    let sag = 0; for (const q of P) sag = Math.max(sag, distToLn(q, gl).d);
    if (sag < 10 * scale) continue;
    // 원(호)이 더 잘 맞으면 원래 처리에 맡김
    const ci = fitCircle(P); if (ci && ci.rms < tol * 0.7 && ci.r < 4000) continue;
    let fn = null;
    const pa = fitParaY(P);
    if (pa && pa.rms < tol) fn = x => pa.a * x * x + pa.b * x + pa.c;
    else {
      const hy = fitHypY(P);
      if (hy && hy.rms < tol && P.every(q => Math.sign(q.x - hy.p) === Math.sign(P[0].x - hy.p))) fn = x => hy.k / (x - hy.p) + hy.q;
    }
    if (!fn) continue;
    const curve = []; for (let x = x0; x <= x1 + 0.01; x += 2) curve.push({ x, y: fn(x) });
    out.curves.push(curve); g.ids.forEach(i => out.used.add(i));
  }
  return out;
}
// 최소제곱: y = a x² + b x + c
function fitParaY(P) {
  const mx = P.reduce((s, q) => s + q.x, 0) / P.length;   // 수치 안정: x를 가운데로 옮겨 계산
  const S = [0, 0, 0, 0, 0], T = [0, 0, 0];
  for (const q of P) { const x = q.x - mx; let xp = 1; for (let k = 0; k < 5; k++) { S[k] += xp; if (k < 3) T[k] += q.y * xp; xp *= x; } }
  const M = [[S[4], S[3], S[2]], [S[3], S[2], S[1]], [S[2], S[1], S[0]]], sol = solve3(M, [T[2], T[1], T[0]]);
  if (!sol) return null;
  const [A2, B2, C2] = sol, a = A2, b = B2 - 2 * A2 * mx, c = A2 * mx * mx - B2 * mx + C2;
  let e = 0; for (const q of P) e += (a * q.x * q.x + b * q.x + c - q.y) ** 2;
  return { a, b, c, rms: Math.sqrt(e / P.length) };
}
// 최소제곱: y = k/(x − p) + q  ⇔  x·y = q·x + p·y + (k − p·q)
function fitHypY(P) {
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
  for (const t of P) { const r = [t.x, t.y, 1], z = t.x * t.y; for (let i = 0; i < 3; i++) { B[i] += r[i] * z; for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j]; } }
  const sol = solve3(M, B); if (!sol) return null;
  const [q, p, c0] = sol, k = c0 + p * q;
  let e = 0; for (const t of P) e += (k / (t.x - p) + q - t.y) ** 2;
  return { k, p, q, rms: Math.sqrt(e / P.length) };
}
function solve3(M, B) {
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M); if (!isFinite(D) || Math.abs(D) < 1e-12) return null;
  return [0, 1, 2].map(i => det(M.map((r, ri) => r.map((v, ci) => ci === i ? B[ri] : v))) / D);
}
function thin(m, W, H) {
  const nb = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? m[y * W + x] : 0;
  let changed = true; const del = [];
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        const p2 = nb(x, y - 1), p3 = nb(x + 1, y - 1), p4 = nb(x + 1, y), p5 = nb(x + 1, y + 1), p6 = nb(x, y + 1), p7 = nb(x - 1, y + 1), p8 = nb(x - 1, y), p9 = nb(x - 1, y - 1);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (B < 2 || B > 6) continue;
        const s = [p2, p3, p4, p5, p6, p7, p8, p9, p2]; let A = 0; for (let i = 0; i < 8; i++) if (!s[i] && s[i + 1]) A++;
        if (A !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
        del.push(y * W + x);
      }
      if (del.length) { changed = true; for (const i of del) m[i] = 0; }
    }
  }
}
function traceChains(m, W, H) {
  const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  // 이웃: 상하좌우 + (사이의 상하좌우가 비어 있을 때만) 대각선 → 계단 모양 대각선이 갈림길로 잘못 잡히지 않음
  const at = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && m[Y * W + X];
  const nbs = i => {
    const x = i % W, y = (i / W) | 0, out = [];
    for (const [dx, dy] of N8) {
      const X = x + dx, Y = y + dy; if (!at(X, Y)) continue;
      if (dx && dy && (at(x + dx, y) || at(x, y + dy))) continue;
      out.push(Y * W + X);
    }
    return out;
  };
  const deg = new Uint8Array(W * H); const on = [];
  for (let i = 0; i < W * H; i++) if (m[i]) { deg[i] = nbs(i).length; on.push(i); }
  const isNode = i => deg[i] !== 2;
  const used = new Set(), chains = [], P = i => ({ x: i % W, y: (i / W) | 0 });
  const key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
  for (const n of on) if (isNode(n)) for (const s of nbs(n)) {
    if (used.has(key(n, s))) continue;
    const path = [n]; let prev = n, cur = s; used.add(key(n, s));
    for (;;) {
      path.push(cur);
      if (isNode(cur)) break;
      const nx = nbs(cur).filter(k => k !== prev && !used.has(key(cur, k)));
      if (!nx.length) break;
      const k = nx[0]; used.add(key(cur, k)); prev = cur; cur = k;
      if (path.length > 20000) break;
    }
    chains.push(path.map(P));
  }
  // 갈림 없는 고리(원)
  for (const i of on) if (!isNode(i)) {
    const n = nbs(i); if (n.every(k => used.has(key(i, k)))) continue;
    const path = [i]; let prev = i, cur = n.find(k => !used.has(key(i, k))); used.add(key(i, cur));
    while (cur !== i && path.length < 20000) { path.push(cur); const nx = nbs(cur).filter(k => k !== prev && !used.has(key(cur, k))); if (!nx.length) break; used.add(key(cur, nx[0])); prev = cur; cur = nx[0]; }
    chains.push(path.map(P));
  }
  return chains;
}

// 글자 읽기: 문제지 글꼴과 비슷한 세리프체로 그린 글자 견본과 겹쳐 보고 가장 닮은 글자를 고른다
let GLYPHS = null;
function glyphs() {
  if (GLYPHS) return GLYPHS;
  GLYPHS = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d', { willReadFrequently: true });
  for (const it of [true, false]) for (const ch of chars) {
    for (const font of ['"Times New Roman"', '"Noto Serif KR"', 'serif']) {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 120, 120); g.fillStyle = '#000'; g.font = `${it ? 'italic ' : ''}80px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(ch, 60, 60);
      const d = g.getImageData(0, 0, 120, 120).data, b = new Uint8Array(120 * 120); let x0 = 120, y0 = 120, x1 = -1, y1 = -1;
      for (let i = 0; i < 14400; i++) if (d[i * 4] < 128) { b[i] = 1; const x = i % 120, y = (i / 120) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) continue;
      const get = (x, y) => b[y * 120 + x];
      GLYPHS.push({ ch, it, ar: (x1 - x0 + 1) / (y1 - y0 + 1), v: normGlyph(get, x0, y0, x1 - x0 + 1, y1 - y0 + 1), holes: countHoles(get, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 6) });
    }
  }
  return GLYPHS;
}
const GN = 20;
// 글자 속 구멍 개수 (B=2, A·D·O=1, C·E=0) — 바깥 테두리에서 닿지 않는 빈 칸 덩어리
function countHoles(get, x0, y0, w, h, minPx) {
  const W = w + 2, H = h + 2, seen = new Uint8Array(W * H);
  const bg = (x, y) => x === 0 || y === 0 || x === W - 1 || y === H - 1 || !get(x0 + x - 1, y0 + y - 1);
  const fill = (s) => { const st = [s]; seen[s] = 1; let n = 0; while (st.length) { const j = st.pop(); n++; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const k = Y * W + X; if (!seen[k] && bg(X, Y)) { seen[k] = 1; st.push(k); } } } return n; };
  fill(0);
  let holes = 0;
  for (let i = 0; i < W * H; i++) if (!seen[i] && bg(i % W, (i / W) | 0)) { if (fill(i) >= minPx) holes++; }
  return holes;
}
function normGlyph(get, x0, y0, w, h) {
  const v = new Float32Array(GN * GN), s = Math.max(w, h) / GN, ox = (Math.max(w, h) - w) / 2, oy = (Math.max(w, h) - h) / 2;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    let cnt = 0, tot = 0;
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
      const x = Math.floor((i + (xx + .5) / 3) * s - ox), y = Math.floor((j + (yy + .5) / 3) * s - oy); tot++;
      if (x >= 0 && y >= 0 && x < w && y < h && get(x0 + x, y0 + y)) cnt++;
    }
    v[j * GN + i] = cnt / tot;
  }
  return v;
}
function readLabels(texts, bin, W, H, cv, scale) {
  // 가까운 덩어리끼리 묶기 (예: 10, A′)
  const gap = 5 * scale, groups = [];
  for (const c of texts.sort((a, b) => a.x0 - b.x0)) {
    const gr = groups.find(G => c.x0 <= G.x1 + gap && c.x1 >= G.x0 - gap && c.y0 <= G.y1 + gap && c.y1 >= G.y0 - gap);
    if (gr) { gr.cs.push(c); gr.x0 = Math.min(gr.x0, c.x0); gr.y0 = Math.min(gr.y0, c.y0); gr.x1 = Math.max(gr.x1, c.x1); gr.y1 = Math.max(gr.y1, c.y1); }
    else groups.push({ cs: [c], x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 });
  }
  const G = glyphs(), out = [];
  const tallest = Math.max(1, ...texts.map(c => c.h));
  for (const gr of groups) {
    let s = '', ok = true, italic = false, ds = '', dok = true, dmin = 1, lmin = 1;   // ds: 모두 숫자로 읽었을 때
    const main = gr.cs.filter(c => c.forced || c.h >= (gr.y1 - gr.y0 + 1) * 0.45);
    for (const c of main.sort((a, b) => a.x0 - b.x0)) {
      if (c.forced) { s += ` ${c.forced} `; dok = false; continue; }   // 모양으로 정해진 글자(=)
      const mine = new Set(c.px), get = (x, y) => mine.has(y * W + x) ? 1 : 0;
      const v = normGlyph(get, c.x0, c.y0, c.w, c.h), ar = c.w / c.h;
      const holes = countHoles(get, c.x0, c.y0, c.w, c.h, Math.max(2, Math.round(c.w * c.h * 0.012)));
      let best = null, bs = -1, bestD = null, bd = -1;
      for (const t of G) {
        let inter = 0, sa = 0, sb = 0;
        for (let i = 0; i < GN * GN; i++) { inter += Math.min(v[i], t.v[i]); sa += v[i]; sb += t.v[i]; }
        // 모양이 겹치는 정도 − 가로세로 비율 차이 − 구멍 개수 차이 (+ 그림 속 이름은 대개 대문자)
        const shape = 2 * inter / (sa + sb) - 0.35 * Math.abs(Math.log(ar / t.ar)) - 0.12 * Math.abs(holes - t.holes);
        const sc = shape + (/[A-Z]/.test(t.ch) ? 0.03 : 0);
        if (sc > bs) { bs = sc; best = t; }
        if (/[0-9]/.test(t.ch) && shape > bd) { bd = shape; bestD = t; }
      }
      // 숫자 1과 대문자 I, 0과 O는 모양이 거의 같다: 숫자로도 읽어 두고, 나중에 놓인 자리를 보고 고른다
      if (bestD && bd >= 0.5) { ds += bestD.ch; dmin = Math.min(dmin, bd); } else dok = false;
      if (!best || bs < 0.6) { ok = false; continue; }   // 자신 없으면 틀린 글자 대신 그 부분 그림으로
      lmin = Math.min(lmin, bs - (/[A-Z]/.test(best.ch) ? 0.03 : 0));
      let ch = best.ch;
      if ('cosvwz'.includes(ch) && c.h >= tallest * 0.8) ch = ch.toUpperCase();   // 키가 큰 c, o, s… 는 대문자
      s += ch; italic = italic || (best.it && /[A-Za-z]/.test(ch));
    }
    const prime = gr.cs.length > main.length;
    if (ok && prime) s += '′';
    const box = { x: gr.x0, y: gr.y0, w: gr.x1 - gr.x0 + 1, h: gr.y1 - gr.y0 + 1 };
    const dig = dok && !prime && ds ? ds : null;
    s = s.trim();
    if (ok && s) out.push({ ...box, s, it: italic, dig, gap: dig ? lmin - dmin : 0 });   // gap: 글자로 읽은 쪽이 숫자보다 얼마나 더 닮았나
    else if (dig && dmin >= 0.6) out.push({ ...box, s: dig, it: false, dig });   // 글자로는 못 읽었지만 숫자로는 확실할 때
    else {   // 읽지 못한 글자(한글 등)는 그 부분만 작은 그림으로
      const c = document.createElement('canvas'); c.width = box.w + 4; c.height = box.h + 4;
      c.getContext('2d').drawImage(cv, box.x - 2, box.y - 2, box.w + 4, box.h + 4, 0, 0, box.w + 4, box.h + 4);
      out.push({ ...box, src: c.toDataURL('image/png') });
    }
  }
  return out;
}
