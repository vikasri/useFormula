/* ============================================================
   useFormula — engine
   Rendering, routing, calculation, sliders and charts.

   DATA MODEL
   Topics are registered by js/topics.js (registerTopics).
   Formulas are registered by one file per topic
   (js/finance.js, js/mechanics.js)
   via registerFormulas([...]). No data lives in this file.

   Each formula:
     id, topic, name, desc, keywords
     eq       : human-readable equation string (display only)
     inputs   : [{ key, label, unit, hint, optional }]
     output   : { label, unit }
     compute  : function(v) -> number   (v = {key: value})
     format   : optional function(n) -> string  (defaults to num)
     defaults : optional {key: value}   pre-filled values
     sliders  : optional [{ key, span, floor, ceil, step }]
     series   : optional function(v) -> { points, xLabel, title, yTickFmt }
   ============================================================ */

// Registries — populated by the topic files, then read by the renderers.
const TOPICS = [];
const FORMULAS = [];
function registerTopics(list) { TOPICS.push(...list); }
function registerFormulas(list) { FORMULAS.push(...list); }

// Formatting helpers (available to every topic file's format/series).
const money = n => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num   = n => (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : +n.toPrecision(6) + '');
const kmoney = n => { const a = Math.abs(n); if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'; if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'k'; return '$' + Math.round(n); };

// Most-used formulas shown at the top of the home page (by formula id).
const FEATURED = ['loan-payment', 'compound-interest', 'fv-annuity'];

const app = document.getElementById('app');

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderHome() {
  const cards = TOPICS.map(t => {
    const count = FORMULAS.filter(f => f.topic === t.id).length;
    return `<a class="card" onclick="location.hash='topic/${t.id}'">
      <div class="icon">${t.icon}</div>
      <div class="title">${esc(t.name)}</div>
      <div class="desc">${esc(t.desc)}</div>
      <div class="count">${count} formula${count===1?'':'s'} →</div>
    </a>`;
  }).join('');
  const featured = FEATURED.map(id => {
    const f = FORMULAS.find(x => x.id === id);
    if (!f) return '';
    const topic = TOPICS.find(t => t.id === f.topic) || {};
    return `<a class="card" onclick="location.hash='formula/${f.id}'">
      <div class="title">${esc(f.name)}</div>
      <div class="desc">${esc(f.desc)}</div>
      <div class="count"><span class="topic-tag">${topic.icon || ''} ${esc(topic.name || '')}</span> · Open →</div>
    </a>`;
  }).join('');
  app.innerHTML = `
    <h1>Find the formula and answers to your questions</h1>
    <p class="sub">Search for a formula or Browse by topic.</p>
    <div class="section-label">⭐ Most used</div>
    <div class="grid featured-grid">${featured}</div>
    <div class="search">
      <span class="mag">🔍</span>
      <input id="searchBox" type="text" autocomplete="off" spellcheck="false"
             placeholder="Search by name or keyword"
             oninput="doSearch(this.value)">
    </div>
    <div id="searchResults"></div>
    <div id="browse">
      <div class="section-label">Browse by topic</div>
      <div class="grid">${cards}</div>
    </div>`;
  const sb = document.getElementById('searchBox');
  if (sb) sb.focus();
}

function doSearch(q) {
  q = (q || '').trim().toLowerCase();
  const results = document.getElementById('searchResults');
  const browse = document.getElementById('browse');
  if (!results || !browse) return;
  if (!q) { results.innerHTML = ''; browse.style.display = ''; return; }
  browse.style.display = 'none';
  const terms = q.split(/\s+/);
  const matches = FORMULAS.filter(f => {
    const topic = TOPICS.find(t => t.id === f.topic) || {};
    const hay = (f.name + ' ' + f.desc + ' ' + (f.keywords || '') + ' ' + (topic.name || '')).toLowerCase();
    return terms.every(t => hay.includes(t));
  });
  if (!matches.length) {
    results.innerHTML = `<p class="sub">No formulas match “${esc(q)}”. Try another word.</p>`;
    return;
  }
  const cards = matches.map(f => {
    const topic = TOPICS.find(t => t.id === f.topic) || {};
    return `<a class="card" onclick="location.hash='formula/${f.id}'">
      <div class="title">${esc(f.name)}</div>
      <div class="desc">${esc(f.desc)}</div>
      <div class="count"><span class="topic-tag">${topic.icon || ''} ${esc(topic.name || '')}</span> · Open →</div>
    </a>`;
  }).join('');
  results.innerHTML = `<p class="results-head">${matches.length} formula${matches.length === 1 ? '' : 's'} found</p><div class="grid">${cards}</div>`;
}

function topicCardsHTML(list) {
  return list.map(f => `
    <a class="card" onclick="location.hash='formula/${f.id}'">
      <div class="title">${esc(f.name)}</div>
      <div class="desc">${esc(f.desc)}</div>
      <div class="count">Open →</div>
    </a>`).join('');
}

function renderTopic(topicId) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return renderHome();
  const list = FORMULAS.filter(f => f.topic === topicId);
  const cards = topicCardsHTML(list) || `<p class="sub">No formulas here yet.</p>`;
  app.innerHTML = `
    <div class="crumbs"><a onclick="location.hash=''">Home</a> › ${esc(topic.name)}</div>
    <h1>${topic.icon} ${esc(topic.name)}</h1>
    <p class="sub">${esc(topic.desc)}</p>
    <div class="search">
      <span class="mag">🔍</span>
      <input id="searchBox" type="text" autocomplete="off" spellcheck="false"
             placeholder="Search within ${esc(topic.name)}"
             oninput="doTopicSearch('${topic.id}', this.value)">
    </div>
    <div id="topicResults"><div class="grid">${cards}</div></div>`;
  const sb = document.getElementById('searchBox');
  if (sb) sb.focus();
}

function doTopicSearch(topicId, q) {
  q = (q || '').trim().toLowerCase();
  const box = document.getElementById('topicResults');
  if (!box) return;
  const topic = TOPICS.find(t => t.id === topicId) || {};
  const list = FORMULAS.filter(f => f.topic === topicId);
  if (!q) { box.innerHTML = `<div class="grid">${topicCardsHTML(list)}</div>`; return; }
  const terms = q.split(/\s+/);
  const matches = list.filter(f => {
    const hay = (f.name + ' ' + f.desc + ' ' + (f.keywords || '')).toLowerCase();
    return terms.every(t => hay.includes(t));
  });
  if (!matches.length) {
    box.innerHTML = `<p class="sub">No ${esc(topic.name || '')} formulas match “${esc(q)}”.</p>`;
    return;
  }
  box.innerHTML = `<p class="results-head">${matches.length} of ${list.length} shown</p><div class="grid">${topicCardsHTML(matches)}</div>`;
}

function renderFormula(id) {
  const f = FORMULAS.find(x => x.id === id);
  if (!f) return renderHome();
  const topic = TOPICS.find(t => t.id === f.topic);
  const dflt = f.defaults || {};
  const fields = f.inputs.map(inp => `
    <div class="field">
      <label>${esc(inp.label)}${inp.unit ? ` <span class="unit">(${esc(inp.unit)})</span>` : ''}</label>
      <input type="number" step="any" id="in_${inp.key}" placeholder="${esc(inp.hint || '')}"${dflt[inp.key] != null ? ` value="${dflt[inp.key]}"` : ''}${f.series ? ` onchange="onField('${f.id}','${inp.key}')"` : ''}>
    </div>`).join('');

  const sliders = (f.sliders || []).map(s => {
    const inp = f.inputs.find(i => i.key === s.key) || {};
    const val = dflt[s.key] != null ? dflt[s.key] : 0;
    const rng = sliderRange(s, val);
    const suffix = inp.unit === '%' ? '%' : '';
    return `<div class="slider">
      <div class="slider-head"><span>${esc(inp.label || s.key)}</span><span class="slider-val" id="sv_${s.key}">${val}${suffix}</span></div>
      <input type="range" id="sl_${s.key}" min="${rng.min}" max="${rng.max}" step="${s.step}" value="${val}" oninput="onSlider('${f.id}','${s.key}',this.value)">
    </div>`;
  }).join('');

  app.innerHTML = `
    <div class="crumbs">
      <a onclick="location.hash=''">Home</a> ›
      <a onclick="location.hash='topic/${topic.id}'">${esc(topic.name)}</a> ›
      ${esc(f.name)}
    </div>
    <div class="formula-box">
      <h1>${esc(f.name)}</h1>
      <p class="sub">${esc(f.desc)}</p>
      <div class="eq">${esc(f.eq)}</div>
      ${fields}
      <button class="calc" onclick="doCalc('${f.id}')">Calculate</button>
      <div class="result" id="result">
        <div class="label" id="result-label"></div>
        <div class="value" id="result-value"></div>
      </div>
      ${f.series ? `<div class="chart-wrap" id="chartWrap"></div>` : ''}
      ${f.sliders ? `<div class="sliders"><div class="sliders-label">Adjust to see the effect</div>${sliders}</div>` : ''}
    </div>`;
  if (f.series) doCalc(f.id);
}

function doCalc(id) {
  const f = FORMULAS.find(x => x.id === id);
  const box = document.getElementById('result');
  const valEl = document.getElementById('result-value');
  const labEl = document.getElementById('result-label');
  const v = {};
  let missing = [];
  for (const inp of f.inputs) {
    const raw = document.getElementById('in_' + inp.key).value.trim();
    if (raw === '') {
      if (inp.optional) { v[inp.key] = 0; continue; }
      missing.push(inp.label);
      continue;
    }
    v[inp.key] = parseFloat(raw);
  }
  box.classList.add('show');
  if (missing.length) {
    box.classList.add('error');
    labEl.textContent = 'Missing values';
    valEl.textContent = 'Please fill in: ' + missing.join(', ');
    return;
  }
  try {
    const out = f.compute(v);
    if (!isFinite(out)) throw new Error('Result is undefined for these inputs.');
    box.classList.remove('error');
    labEl.textContent = f.output.label;
    const shown = (f.format || num)(out);
    valEl.innerHTML = esc(shown) + (f.output.unit ? ` <span class="u">${esc(f.output.unit)}</span>` : '');
    (f.sliders || []).forEach(s => {
      const sl = document.getElementById('sl_' + s.key);
      const sv = document.getElementById('sv_' + s.key);
      const inp = f.inputs.find(i => i.key === s.key) || {};
      if (v[s.key] != null) {
        if (sl) sl.value = v[s.key];
        if (sv) sv.textContent = v[s.key] + (inp.unit === '%' ? '%' : '');
      }
    });
    if (f.series) {
      const wrap = document.getElementById('chartWrap');
      if (wrap) wrap.innerHTML = renderChartSVG(f.series(v));
    }
  } catch (e) {
    box.classList.add('error');
    labEl.textContent = 'Cannot calculate';
    valEl.textContent = e.message;
  }
}

function sliderRange(s, val) {
  let min = val - s.span, max = val + s.span;
  if (s.floor != null && min < s.floor) min = s.floor;
  if (s.ceil != null && max > s.ceil) max = s.ceil;
  return { min: +min.toFixed(4), max: +max.toFixed(4) };
}

function recenterSlider(s, val) {
  const sl = document.getElementById('sl_' + s.key);
  if (!sl) return;
  const rng = sliderRange(s, val);
  sl.min = rng.min;
  sl.max = rng.max;
  sl.value = val;
}

// Called when a value is typed into a field: recenter that field's slider
// so its range spans both below and above the entered value, then recompute.
function onField(id, key) {
  const f = FORMULAS.find(x => x.id === id);
  const s = (f.sliders || []).find(sl => sl.key === key);
  if (s) {
    const val = parseFloat(document.getElementById('in_' + key).value);
    if (isFinite(val)) recenterSlider(s, val);
  }
  doCalc(id);
}

function onSlider(id, key, val) {
  const input = document.getElementById('in_' + key);
  if (input) input.value = val;
  doCalc(id);
}

function renderChartSVG(series) {
  const pts = series.points || [];
  if (pts.length < 2) return '';
  const W = 560, H = 205, padL = 58, padR = 12, padT = 12, padB = 40;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys) || 1;
  const sx = x => padL + (xMax === xMin ? 0 : (x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = y => (H - padB) - (yMax === yMin ? 0 : (y - yMin) / (yMax - yMin)) * (H - padT - padB);
  const yfmt = series.yTickFmt || (v => Math.round(v));
  const xfmt = series.xTickFmt || (v => Math.round(v * 10) / 10);
  const linePath = pts.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
  const areaPath = 'M ' + sx(xs[0]).toFixed(1) + ' ' + sy(yMin).toFixed(1) + ' ' +
    pts.map(p => 'L ' + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ') +
    ' L ' + sx(xs[xs.length - 1]).toFixed(1) + ' ' + sy(yMin).toFixed(1) + ' Z';
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const yv = yMin + (yMax - yMin) * i / 4, yy = sy(yv);
    grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" class="grid"/>` +
            `<text x="${padL - 8}" y="${(yy + 4).toFixed(1)}" class="ylab" text-anchor="end">${esc(String(yfmt(yv)))}</text>`;
  }
  let xlabels = '';
  [0, 0.25, 0.5, 0.75, 1].forEach(fr => {
    const xv = xMin + (xMax - xMin) * fr, xx = sx(xv);
    xlabels += `<text x="${xx.toFixed(1)}" y="${H - 22}" class="xlab" text-anchor="middle">${esc(String(xfmt(xv)))}</text>`;
  });
  const last = pts[pts.length - 1];
  return `<div class="chart-title">${esc(series.title || '')}</div>
    <svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet" role="img">
      ${grid}
      <path d="${areaPath}" class="area"/>
      <path d="${linePath}" class="cline"/>
      <circle cx="${sx(last.x).toFixed(1)}" cy="${sy(last.y).toFixed(1)}" r="4" class="dot"/>
      ${xlabels}
      <text x="${((padL + (W - padR)) / 2).toFixed(1)}" y="${H - 4}" class="axlab" text-anchor="middle">${esc(series.xLabel || '')}</text>
    </svg>`;
}

function route() {
  const h = location.hash.replace(/^#/, '');
  const [page, arg] = h.split('/');
  if (page === 'topic') renderTopic(arg);
  else if (page === 'formula') renderFormula(arg);
  else renderHome();
  window.scrollTo(0, 0);
}
