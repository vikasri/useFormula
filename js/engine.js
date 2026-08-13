/* ============================================================
   useFormula — engine
   Rendering, routing, calculation, sliders and charts.

   DATA MODEL
   Topics are registered by js/topics.js (registerTopics).
   Formulas live one per file in js/formulas/<id>.js, each calling
   registerFormula({...}). js/index.js — generated — lists them all with
   their descriptive fields only, and is what every page loads; a formula's
   own page is the only one that loads its definition. No data lives here.

   Each formula:
     id, topic, name, desc, keywords
     eq       : human-readable equation string (display only)
     inputs   : [{ key, label, unit, hint, optional, advanced }]
                  advanced inputs move to a collapsed panel by the chart
     output   : { label, unit }
     compute  : function(v) -> number   (v = {key: value})
     format   : optional function(n) -> string  (defaults to num)
     defaults : optional {key: value}   pre-filled values
     sliders  : optional [{ key, span, floor, ceil, step }]
     series   : optional function(v) -> { points, xLabel, title, yTickFmt,
                  label, extra: [{ points, label, cls }] }   extra = more lines
     extras   : optional function(v, answer) -> [{ label, value, wide, detail }]
                  listed under the answer, two per row; detail rows go
                  below the chart under "Additional Information"
     advanced : optional { summary, intro, note(v, answer) -> string }
                  the panel holding the advanced inputs
     short    : optional shorter name for cards and shortcuts
     slug     : optional shorter web address, e.g. slug 'loan' puts
                  loan-payment at /loan/. Re-run tools/build-pages.py after
                  adding, renaming or removing a formula.
     title    : optional <title> for the page, when the formula's name alone
                  is not what someone would type into a search box
     blurb    : optional meta description, when `desc` is too terse to earn
                  a click from a results page
     about    : optional [ 'paragraph', … ] shown under the calculator.
                  What the formula does, what the inputs mean, what it
                  leaves out. Write it for a reader; a page with nothing but
                  a form on it gives a search engine nothing to rank.
   ============================================================ */

/* Registries. TOPICS comes from js/topics.js.

   FORMULAS is filled in two passes. js/index.js — generated, loaded by every
   page — lists every formula with only the fields the cards, the search and
   the related links read: id, slug, topic, name, short, desc, keywords. A
   calculator's own page then loads js/formulas/<id>.js on top, which carries
   the inputs, the compute function and the rest.

   The point of the split is that a page's weight does not grow with the site:
   opening one calculator never downloads the other ninety-nine. */
const TOPICS = [];
const FORMULAS = [];
function registerTopics(list) { TOPICS.push(...list); }
function registerIndex(list) { FORMULAS.push(...list); }
function registerFormula(def) {
  const at = FORMULAS.findIndex(f => f.id === def.id);
  if (at === -1) FORMULAS.push(def); else Object.assign(FORMULAS[at], def);
}

// Formatting helpers (available to every topic file's format/series).
const money = n => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num   = n => (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : +n.toPrecision(6) + '');
const kmoney = n => { const a = Math.abs(n); if (a >= 1e6) return '$' + (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'; if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'k'; return '$' + Math.round(n); };

// Most-used formulas shown at the top of the home page (by formula id).
const FEATURED = ['loan-payment', 'compound-interest', 'annuity'];

/* The home page's heading and standfirst. tools/build-pages.py reads these
   two lines so the served HTML carries the same words the app renders. */
const HOME_TITLE = 'Free calculators for everyday formulas';
const HOME_INTRO = 'Loan payments, compound interest, annuities and physics. ' +
  'Enter what you know and get the answer. No account, nothing to install, no charge.';

/* Favourites live in this browser only: no account, no server, nothing leaves
   the machine. Cleared if the visitor clears site data. */
const FAV_KEY = 'useformula.favorites';
/* Cards per row, for both Most used and Your favorites. Kept at 3 so the row
   still fits across a phone screen without wrapping. */
const ROW_SLOTS = 3;

const app = document.getElementById('app');

/* Reads a switch from js/settings.js. Falls back to the default given here,
   so the site still renders if that file is missing or a key was removed. */
function setting(key, dflt) {
  return (typeof SETTINGS === 'object' && SETTINGS && key in SETTINGS) ? SETTINGS[key] : dflt;
}

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* Every page is a real file, written by tools/build-pages.py: /loan/,
   /topics/finance/, /about/. Links use these paths so a visitor can copy the
   address bar and a search engine has something to index; the old #formula/...
   addresses still work, see currentRoute.

   A formula sits at its id unless it sets `slug`, which puts a much-used
   calculator on a shorter one: loan-payment answers at /loan/. */
function slugOf(f) { return f.slug || f.id; }
function formulaURL(f) { return '/' + slugOf(f) + '/'; }
function topicURL(id) { return '/topics/' + id + '/'; }
function findFormula(key) { return FORMULAS.find(f => f.id === key || f.slug === key); }

/* localStorage throws in some private-browsing modes, so every use is guarded
   and the site stays usable with favourites simply doing nothing. */
function getFavs() {
  try {
    const list = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter(id => FORMULAS.some(f => f.id === id));   // drop ids no longer on the site
  } catch (e) { return []; }
}

function isFav(id) { return getFavs().indexOf(id) !== -1; }

/* Newest first, so the row shows what was saved most recently. */
function toggleFav(id, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  const list = getFavs();
  const at = list.indexOf(id);
  if (at === -1) list.unshift(id); else list.splice(at, 1);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}

  if (currentRoute().page === 'home') { renderHome(); return false; }   // the card moves rows, so redraw
  const on = isFav(id);                             // elsewhere: update in place, keep typed values
  document.querySelectorAll('[data-fav="' + id + '"]').forEach(el => {
    el.classList.toggle('on', on);
    el.textContent = on ? '♥' : '♡';
    el.title = on ? 'Saved. Click to remove' : 'Save to your favorites';
  });
  return false;
}

function heartHTML(id) {
  const on = isFav(id);
  return `<button class="heart${on ? ' on' : ''}" data-fav="${id}"
    title="${on ? 'Saved. Click to remove' : 'Save to your favorites'}"
    aria-label="${on ? 'Remove from favorites' : 'Save to favorites'}"
    onclick="return toggleFav('${id}', event)">${on ? '♥' : '♡'}</button>`;
}

/* Cards and shortcuts use `short` when a formula has one, so the blocks stay
   compact. The full name is kept for the formula's own page. */
function shortName(f) { return f.short || f.name; }

function formulaCardHTML(f, showTopic) {
  const topic = TOPICS.find(t => t.id === f.topic) || {};
  /* Separator lives inside the span so hiding the tag on small screens does not
     leave a stray "·" in front of Open. */
  const tag = showTopic === false ? '' :
    `<span class="topic-tag">${topic.icon || ''} ${esc(topic.name || '')} · </span>`;
  return `<a class="card" href="${formulaURL(f)}">
      ${heartHTML(f.id)}
      <div class="title">${esc(shortName(f))}</div>
      <div class="desc">${esc(f.desc)}</div>
      <div class="count">${tag}Open →</div>
    </a>`;
}

function byId(ids) { return ids.map(id => FORMULAS.find(f => f.id === id)).filter(Boolean); }

/* Sideways links to the rest of the topic, under every calculator. Gives a
   visitor somewhere to go once they have their answer, and gives each page
   more than one way in for a crawler — which matters more with every formula
   added, since the home page only has room for a handful. */
/* The prose under the calculator. Same text the generated page ships in its
   HTML, so a reader who arrives before the script does sees no less. */
function aboutFormulaHTML(f) {
  if (!f.about || !f.about.length) return '';
  return `
    <section class="explainer">
      <h2>About ${esc(shortName(f))}</h2>
      ${f.about.map(p => `<p>${esc(p)}</p>`).join('\n      ')}
    </section>`;
}

function relatedHTML(f) {
  const topic = TOPICS.find(t => t.id === f.topic) || {};
  const others = FORMULAS.filter(x => x.topic === f.topic && x.id !== f.id);
  if (!others.length) return '';
  return `
    <nav class="related">
      <h2>More ${esc(topic.name || '')} calculators</h2>
      <ul>${others.map(o => `<li><a href="${formulaURL(o)}">${esc(shortName(o))}</a>
        <span>${esc(o.desc)}</span></li>`).join('')}</ul>
    </nav>`;
}

function renderHome() {
  const cards = TOPICS.map(t => `<a class="card" href="${topicURL(t.id)}">
      <div class="icon">${t.icon}</div>
      <div class="title">${esc(t.name)}</div>
      <div class="desc">${esc(t.desc)}</div>
      <div class="count">Browse →</div>
    </a>`).join('');

  const featured = byId(FEATURED).slice(0, ROW_SLOTS).map(f => formulaCardHTML(f)).join('');

  /* Favourites row is always ROW_SLOTS wide: saved formulas first, then dashed
     slots so the row reads as something to fill rather than as a gap. */
  const favIds = getFavs();
  const shown = byId(favIds.slice(0, ROW_SLOTS));
  const empty = ROW_SLOTS - shown.length;
  const favCards = shown.map(f => formulaCardHTML(f)).join('') +
    Array.from({ length: empty }, (_, i) =>
      `<div class="card slot">${i === 0 ? 'Tap ♡ to save' : '♡'}</div>`).join('');
  const favNote = favIds.length > ROW_SLOTS
    ? `<span class="label-note">newest ${ROW_SLOTS} of ${favIds.length}</span>` : '';

  /* The heading and the line under it are the only words on the home page.
     They are here as well as in the generated HTML so the rendered page and
     the served one say the same thing. */
  app.innerHTML = `
    <h1>${esc(HOME_TITLE)}</h1>
    <p class="sub">${esc(HOME_INTRO)}</p>
    <div class="search">
      <span class="mag">🔍</span>
      <input id="searchBox" type="text" autocomplete="off" spellcheck="false"
             placeholder="Search by name or keyword"
             oninput="doSearch(this.value)">
    </div>
    <div id="searchResults"></div>
    <div id="belowSearch">
      <div class="section-label">📊 Popular calculators</div>
      <div class="grid featured-grid">${featured}</div>
      <div class="section-label next">❤️ Your favorites ${favNote}</div>
      <div class="grid featured-grid">${favCards}</div>
      <div class="section-label next">Browse by topic</div>
      <div class="grid">${cards}</div>
    </div>`;
  const sb = document.getElementById('searchBox');
  if (sb) sb.focus();
}

function doSearch(q) {
  q = (q || '').trim().toLowerCase();
  const results = document.getElementById('searchResults');
  const browse = document.getElementById('belowSearch');
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
  const cards = matches.map(f => formulaCardHTML(f)).join('');
  results.innerHTML = `<p class="results-head">${matches.length} formula${matches.length === 1 ? '' : 's'} found</p><div class="grid">${cards}</div>`;
}

function topicCardsHTML(list) {
  return list.map(f => formulaCardHTML(f, false)).join('');
}

function renderTopic(topicId) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return renderHome();
  const list = FORMULAS.filter(f => f.topic === topicId);
  const cards = topicCardsHTML(list) || `<p class="sub">No formulas here yet.</p>`;
  app.innerHTML = `
    <div class="crumbs"><a href="/">Home</a> › ${esc(topic.name)}</div>
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

/* The calculator itself: title, inputs, answer, breakdown, chart, sliders. */
function formulaBoxHTML(f) {
  const dflt = f.defaults || {};
  const fieldHTML = inp => `
    <div class="field${inp.optional ? ' optional' : ''}">
      <label>${esc(inp.label)}${inp.unit ? ` <span class="unit">(${esc(inp.unit)})</span>` : ''}</label>
      <input type="number" step="any" id="in_${inp.key}" placeholder="${esc(inp.hint || '')}"${dflt[inp.key] != null ? ` value="${dflt[inp.key]}"` : ''}${f.series ? ` onchange="onField('${f.id}','${inp.key}')"` : ''}>
    </div>`;

  /* Inputs marked advanced do not change the headline answer, so they are kept
     out of the main form and tucked into a panel next to the chart. */
  const fields = f.inputs.filter(i => !i.advanced).map(fieldHTML).join('');
  const advancedInputs = f.inputs.filter(i => i.advanced);
  const adv = f.advanced || {};
  const advancedPanel = advancedInputs.length ? `
    <details class="advanced">
      <summary>${esc(adv.summary || 'More options')}</summary>
      <div class="body">
        ${adv.intro ? `<p class="advanced-intro">${esc(adv.intro)}</p>` : ''}
        <div class="fields">${advancedInputs.map(fieldHTML).join('')}</div>
        <button type="button" class="clear-advanced" onclick="clearAdvanced('${f.id}')">Clear</button>
        <div class="advanced-note" id="advancedNote"></div>
      </div>
    </details>` : '';

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

  return `
    <div class="formula-box">
      <div class="formula-head">
        <div class="formula-title"><h1>${esc(f.name)}</h1></div>
        ${heartHTML(f.id)}
      </div>
      <p class="sub">${esc(f.desc)}</p>
      ${setting('showEquation', true) ? `<div class="eq">${esc(f.eq)}</div>` : ''}
      <div class="fields">${fields}</div>
      <button class="calc" onclick="doCalc('${f.id}')">Calculate</button>
      <div class="result" id="result">
        <div class="label" id="result-label"></div>
        <div class="value" id="result-value"></div>
      </div>
      ${f.extras ? `<div class="extras" id="extras"></div>` : ''}
      ${f.series ? `<div class="chart-wrap" id="chartWrap"></div>` : ''}
      ${f.sliders ? `<div class="sliders"><div class="sliders-label">Adjust to see the effect</div>${sliders}</div>` : ''}
      ${f.extras ? `<div class="extras" id="extrasDetail"></div>` : ''}
      ${advancedPanel}
      ${setting('missionLine', '') ? `<p class="mission">${esc(setting('missionLine', ''))}</p>` : ''}
    </div>`;
}

/* Also what 404.html runs, since Pages serves it at whatever address was
   asked for: the message matches the address instead of quietly showing home. */
function renderNotFound() {
  app.innerHTML = `
    <div class="prose">
      <h1>Page not found</h1>
      <p>That address does not match any calculator.
      <a href="/">Start from the home page</a>.</p>
    </div>`;
}

function renderFormula(key) {
  const f = findFormula(key);
  if (!f) return renderNotFound();
  /* Only the index is loaded here — this is an old #formula/... link landing
     on a page that never asked for this calculator's definition. Its own page
     does load it, so hand the visitor over to it, upgrading the address on the
     way. replace(), not assign(), so Back still leaves the site. */
  if (!f.inputs) { location.replace(formulaURL(f)); return; }
  const topic = TOPICS.find(t => t.id === f.topic);
  app.innerHTML = `
    <div class="crumbs">
      <a href="/">Home</a> ›
      <a href="${topicURL(topic.id)}">${esc(topic.name)}</a> ›
      ${esc(f.name)}
    </div>` + formulaBoxHTML(f) + aboutFormulaHTML(f) + relatedHTML(f);
  (f.sliders || []).forEach(s => paintSlider(document.getElementById('sl_' + s.key)));
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
      paintSlider(sl);
    });
    if (f.series) {
      const wrap = document.getElementById('chartWrap');
      if (wrap) wrap.innerHTML = renderChartSVG(f.series(v));
    }
    renderExtras(f, v, out);
    renderAdvancedNote(f, v, out);
  } catch (e) {
    box.classList.add('error');
    labEl.textContent = 'Cannot calculate';
    valEl.textContent = e.message;
    renderExtras(null);
  }
}

/* Empties every advanced input, which puts them back to their documented
   defaults (blank means nothing entered, and halfway for the timing) and drops
   the comparison lines from the chart. */
function clearAdvanced(id) {
  const f = FORMULAS.find(x => x.id === id);
  if (!f) return;
  f.inputs.filter(i => i.advanced).forEach(i => {
    const el = document.getElementById('in_' + i.key);
    if (el) el.value = '';
  });
  doCalc(id);
}

/* The outcome of the advanced panel's own inputs, shown inside that panel so
   the cause and its effect sit together. */
function renderAdvancedNote(f, v, out) {
  const el = document.getElementById('advancedNote');
  if (!el) return;
  let text = '';
  try { text = (f && f.advanced && f.advanced.note && f.advanced.note(v, out)) || ''; }
  catch (e) { text = ''; }
  el.textContent = text;
}

/* Optional breakdown under the answer: a formula supplies
   extras: (inputs, answer) -> [{ label, value }]. Kept in its own try so a
   problem here can never take down the answer itself. */
function renderExtras(f, v, out) {
  const el = document.getElementById('extras');
  if (!el) return;
  let rows = [];
  try {
    if (f && f.extras) rows = f.extras(v, out) || [];
  } catch (e) { rows = []; }
  /* Two per row. A row marked wide keeps the full width, for values too long
     to read in half of a phone screen. */
  const cell = r =>
    `<div class="extra${r.wide ? ' wide' : ''}"><span class="k">${esc(r.label)}</span><span class="v">${esc(r.value)}</span></div>`;
  const main = rows.filter(r => !r.detail);
  const detail = rows.filter(r => r.detail);

  el.innerHTML = `<div class="extra-grid">${main.map(cell).join('')}</div>`;
  el.classList.toggle('show', main.length > 0);

  /* The rest of the numbers live below the chart. A formula has a page to
     itself, so there is room to show them outright. */
  const box = document.getElementById('extrasDetail');
  if (!box) return;
  box.innerHTML = detail.length ? `
    <section class="breakdown">
      <h2>Additional Information</h2>
      <div class="extra-grid">${detail.map(cell).join('')}</div>
    </section>` : '';
  box.classList.toggle('show', detail.length > 0);
}

function sliderRange(s, val) {
  let min = val - s.span, max = val + s.span;
  if (s.floor != null && min < s.floor) min = s.floor;
  if (s.ceil != null && max > s.ceil) max = s.ceil;
  return { min: +min.toFixed(4), max: +max.toFixed(4) };
}

/* Fills the track up to the handle. WebKit has no pseudo-element for the
   filled part, so the share is handed to CSS as --pct. */
function paintSlider(sl) {
  if (!sl) return;
  const min = parseFloat(sl.min), max = parseFloat(sl.max), val = parseFloat(sl.value);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  sl.style.setProperty('--pct', Math.max(0, Math.min(100, pct)) + '%');
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
  paintSlider(document.getElementById('sl_' + key));   // keep the fill under the
  doCalc(id);                                          // handle even if the calc fails
}

/* series.points is the main line (drawn with a filled area under it).
   series.extra is an optional list of further lines plotted on the same axes:
   [{ points, label, cls }], where cls picks the colour, e.g. 'green'.
   A legend appears only when there is more than one line to tell apart. */
function renderChartSVG(series) {
  const pts = series.points || [];
  if (pts.length < 2) return '';
  const extra = (series.extra || []).filter(s => s.points && s.points.length > 1);
  const W = 560, H = 205, padL = 58, padR = 12, padT = 12, padB = 40;
  const scalePts = pts.concat(...extra.map(s => s.points));   // every line shares one y-scale
  const xs = scalePts.map(p => p.x), ys = scalePts.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys) || 1;
  const sx = x => padL + (xMax === xMin ? 0 : (x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const sy = y => (H - padB) - (yMax === yMin ? 0 : (y - yMin) / (yMax - yMin)) * (H - padT - padB);
  const yfmt = series.yTickFmt || (v => Math.round(v));
  const xfmt = series.xTickFmt || (v => Math.round(v * 10) / 10);
  const pathOf = ps => ps.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
  const linePath = pathOf(pts);
  const areaPath = 'M ' + sx(pts[0].x).toFixed(1) + ' ' + sy(yMin).toFixed(1) + ' ' +
    pts.map(p => 'L ' + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ') +
    ' L ' + sx(pts[pts.length - 1].x).toFixed(1) + ' ' + sy(yMin).toFixed(1) + ' Z';
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
  const extraLines = extra.map(s =>
    `<path d="${pathOf(s.points)}" class="cline ${esc(s.cls || '')}${s.dash ? ' dash' : ''}"/>` +
    (s.dash ? '' : `<circle cx="${sx(s.points[s.points.length - 1].x).toFixed(1)}" cy="${sy(s.points[s.points.length - 1].y).toFixed(1)}" r="4" class="dot ${esc(s.cls || '')}"/>`)
  ).join('');
  const legend = extra.length ? `<div class="chart-legend">
      <span class="lg"><i class="sw"></i>${esc(series.label || 'Value')}</span>
      ${extra.map(s => `<span class="lg"><i class="sw ${esc(s.cls || '')}${s.dash ? ' dash' : ''}"></i>${esc(s.label || '')}</span>`).join('')}
    </div>` : '';
  return `<div class="chart-title">${esc(series.title || '')}</div>${legend}
    <svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet" role="img">
      ${grid}
      <path d="${areaPath}" class="area"/>
      <path d="${linePath}" class="cline"/>
      ${extraLines}
      <circle cx="${sx(last.x).toFixed(1)}" cy="${sy(last.y).toFixed(1)}" r="4" class="dot"/>
      ${xlabels}
      <text x="${((padL + (W - padR)) / 2).toFixed(1)}" y="${H - 4}" class="axlab" text-anchor="middle">${esc(series.xLabel || '')}</text>
    </svg>`;
}

function renderAbout() {
  app.innerHTML = `
    <div class="crumbs"><a href="/">Home</a> › About</div>
    <div class="prose">
      <h1>About useFormula</h1>
      <p>useFormula is a free calculator for everyday formulas. Pick a formula, enter
      what you know, and get the answer. There is no account to make, nothing to
      install, and no charge.</p>
      <p>Topics today are Finance and Mechanics. More will follow.</p>

      <h2>Your favorites stay on your device</h2>
      <p>Tapping ♡ on a formula saves it in your own browser's storage. It is never
      sent to a server, never shared, and never used to identify you. Clearing your
      browser data removes it, and favorites do not follow you to another device.</p>

      <h2>Disclaimer</h2>
      <p>Results are estimates for general informational purposes only and are not
      professional advice. Verify all results with qualified professionals and
      authoritative sources before relying on them. useFormula disclaims any
      liability to the fullest extent permitted by law.</p>
    </div>`;
}

/* Which page to draw. The path is the address now — /loan-payment/ is its own
   file on the server — but the site ran on #formula/loan-payment for a while,
   so a hash is still honoured first and anything already shared keeps working. */
function currentRoute() {
  const h = location.hash.replace(/^#/, '');
  if (h) {
    const [page, arg] = h.split('/');
    if (page === 'formula') return { page: 'formula', arg };
    if (page === 'topic') return { page: 'topic', arg };
    if (page === 'about') return { page: 'about' };
  }
  /* index.html is dropped so the file and the directory it lives in are the
     same page, whether the server spells it out or not. */
  const parts = location.pathname.split('/').filter(p => p && p !== 'index.html');
  if (!parts.length) return { page: 'home' };
  if (parts[0] === 'topics') return { page: 'topic', arg: parts[1] };
  if (parts[0] === 'about') return { page: 'about' };
  return { page: 'formula', arg: parts[0] };
}

function route() {
  const r = currentRoute();
  if (r.page === 'topic') renderTopic(r.arg);
  else if (r.page === 'formula') renderFormula(r.arg);
  else if (r.page === 'about') renderAbout();
  else renderHome();
  window.scrollTo(0, 0);
}
