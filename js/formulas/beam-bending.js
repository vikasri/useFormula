/* beam-bending. `num` comes from engine.js; the unit constants and
   convertField from js/shared/mechanics.js.

   One transverse load, anywhere on the span, with each end pinned, fixed or
   free. Rather than carry a table of standard cases, this builds the moment
   diagram from the reactions and integrates it: for a single point load the
   diagram is two straight lines, so the deflected shape is an exact cubic
   either side of the load and there is nothing to approximate. */

let beamSystem = 0;

const SEC_ROUND = 0, SEC_TUBE = 1, SEC_RECT = 2, SEC_BOX = 3, SEC_GIVEN = 4;
const END_PIN = 0, END_FIX = 1, END_FREE = 2;
/* The four beams that can be built out of those ends. */
const B_SS = 0, B_CANT = 1, B_FIXFIX = 2, B_PROP = 3;

const BEAM_UNITS = [
  { value: 0, label: 'SI (N, mm, MPa)', force: 'N', length: 'mm', stress: 'MPa',
    inertia: 'mm⁴', moment: 'N·mm' },
  { value: 1, label: 'English (lbf, in, psi)', force: 'lbf', length: 'in', stress: 'psi',
    inertia: 'in⁴', moment: 'lbf·in' },
];
function beamUnits(v) { return BEAM_UNITS[+v.sys === 1 ? 1 : 0]; }
function beamUnitsFor(v) {
  const u = beamUnits(v);
  return { len: u.length, a: u.length, P: u.force, E: u.stress, d: u.length,
           od: u.length, w: u.length, h: u.length, t: u.length,
           I: u.inertia, c: u.length };
}

/* Second moment of area about the axis the load bends the beam around, and the
   distance from that axis out to the face that carries the most stress.

   Not the same choice as a column: a column turns whichever way is easiest, so
   the smaller I governs there. A beam is bent about a known axis by a known
   load, so here the depth is the dimension in the plane of bending and it is
   that I which counts — the reason a joist is stood on edge. */
function beamSection(v) {
  const sec = +v.sec;
  if (sec === SEC_ROUND) {
    if (!(v.d > 0)) throw new Error('Diameter has to be above zero.');
    return { I: Math.PI * v.d ** 4 / 64, c: v.d / 2 };
  }
  if (sec === SEC_TUBE) {
    const D = v.od, di = D - 2 * v.t;
    if (!(D > 0) || !(v.t > 0)) throw new Error('Outside diameter and wall thickness both have to be above zero.');
    if (di <= 0) throw new Error('That wall is thicker than the radius, which leaves a solid bar.');
    return { I: Math.PI * (D ** 4 - di ** 4) / 64, c: D / 2 };
  }
  if (sec === SEC_RECT || sec === SEC_BOX) {
    const w = v.w, h = v.h;
    if (!(w > 0) || !(h > 0)) throw new Error('Width and depth both have to be above zero.');
    if (sec === SEC_RECT) return { I: w * h ** 3 / 12, c: h / 2 };
    if (!(v.t > 0)) throw new Error('Wall thickness has to be above zero.');
    if (Math.min(w, h) - 2 * v.t <= 0) throw new Error('That wall is thicker than half the shorter side, which leaves it solid.');
    return { I: (w * h ** 3 - (w - 2 * v.t) * (h - 2 * v.t) ** 3) / 12, c: h / 2 };
  }
  if (!(v.I > 0)) throw new Error('Second moment of area has to be above zero.');
  if (!(v.c > 0)) throw new Error('Distance to the outer fibre has to be above zero.');
  return { I: v.I, c: v.c };
}

/* Which beam a pair of ends makes, and whether it has to be solved back to
   front. A cantilever fixed on the right is the same problem as one fixed on
   the left with the load measured from the other side, so it is mirrored in
   and mirrored out rather than written twice. */
function beamCase(l, r) {
  const cases = {
    '0,0': { kind: B_SS, mirror: false },
    '1,2': { kind: B_CANT, mirror: false },
    '2,1': { kind: B_CANT, mirror: true },
    '1,1': { kind: B_FIXFIX, mirror: false },
    '1,0': { kind: B_PROP, mirror: false },
    '0,1': { kind: B_PROP, mirror: true },
  };
  const hit = cases[l + ',' + r];
  if (hit) return hit;
  if (l === END_FREE && r === END_FREE)
    throw new Error('Free at both ends is not a beam. Nothing is holding it up.');
  throw new Error('A pin at one end and nothing at the other lets the beam turn and fall. Fix the free end, or pin both.');
}

/* Moment at the left end and the reaction there. Everything else follows from
   statics, so this is the only place the four cases differ. */
function beamStart(kind, P, L, a) {
  const b = L - a;
  if (kind === B_SS) return { M0: 0, RA: P * b / L };
  if (kind === B_CANT) return { M0: -P * a, RA: P };
  if (kind === B_FIXFIX) return { M0: -P * a * b * b / (L * L), RA: P * b * b * (3 * a + b) / L ** 3 };
  return { M0: -P * b * (L * L - b * b) / (2 * L * L), RA: P * b * (3 * L * L - b * b) / (2 * L ** 3) };
}

/* The beam as two spans, each carrying a straight length of moment diagram and
   the slope and deflection handed on from the one before. On each,
     M(u) = m0 + s·u,  θ = θ0 + (m0u + su²/2)/EI,  y = y0 + θ0u + (m0u²/2 + su³/6)/EI
   which is exact, not a step size. */
function beamSpans(kind, P, L, a, EI) {
  const { M0, RA } = beamStart(kind, P, L, a);
  const raw = [[0, a, M0, RA], [a, L - a, M0 + RA * a, RA - P]];
  const march = th0 => {
    let th = th0, y = 0;
    const out = [];
    for (const [x0, ln, m0, s] of raw) {
      out.push({ x0, ln, m0, s, th0: th, y0: y });
      y += th * ln + (m0 * ln * ln / 2 + s * ln ** 3 / 6) / EI;
      th += (m0 * ln + s * ln * ln / 2) / EI;
    }
    return { out, yEnd: y };
  };
  const first = march(0);
  /* A beam held at both ends starts at whatever slope lands the far end back on
     zero. y depends on that slope linearly, so it takes no searching. */
  return kind === B_SS ? march(-first.yEnd / L).out : first.out;
}

function beamDefl(spans, EI, x) {
  const sp = x <= spans[0].x0 + spans[0].ln ? spans[0] : spans[1];
  const u = Math.min(Math.max(x - sp.x0, 0), sp.ln);
  return sp.y0 + sp.th0 * u + (sp.m0 * u * u / 2 + sp.s * u ** 3 / 6) / EI;
}

function beamMoment(kind, P, L, a, x) {
  const { M0, RA } = beamStart(kind, P, L, a);
  return M0 + RA * x - (x > a ? P * (x - a) : 0);
}

/* Where the beam is worst. The moment diagram is straight between the ends and
   the load, so its peak is at one of those three. The slope is a quadratic on
   each span, so the places the beam stops falling and starts rising come out of
   the quadratic formula — no scanning, and no peak missed between samples. */
function beamPeaks(v) {
  const sec = beamSection(v);
  const { kind, mirror } = beamCase(+v.endL, +v.endR);
  const L = v.len;
  if (!(L > 0)) throw new Error('Span has to be above zero.');
  if (!(v.E > 0)) throw new Error('Modulus of elasticity has to be above zero.');
  if (!(v.a >= 0) || v.a > L) throw new Error('The load has to sit on the beam, between zero and the span.');
  const a = mirror ? L - v.a : v.a;
  const EI = v.E * sec.I;
  const spans = beamSpans(kind, v.P, L, a, EI);
  const at = x => beamMoment(kind, v.P, L, a, x);

  let xM = 0;
  for (const x of [0, a, L]) if (Math.abs(at(x)) > Math.abs(at(xM))) xM = x;

  const cand = [0, a, L];
  for (const sp of spans) {
    const A = sp.s / (2 * EI), B = sp.m0 / EI, C = sp.th0;
    if (Math.abs(A) < 1e-18) {
      if (Math.abs(B) > 1e-18) cand.push(sp.x0 - C / B);
    } else {
      const disc = B * B - 4 * A * C;
      if (disc >= 0) {
        for (const r of [(-B + Math.sqrt(disc)) / (2 * A), (-B - Math.sqrt(disc)) / (2 * A)])
          if (r >= 0 && r <= sp.ln) cand.push(sp.x0 + r);
      }
    }
  }
  let xD = 0;
  for (const x of cand) {
    if (!(x >= 0 && x <= L)) continue;
    if (Math.abs(beamDefl(spans, EI, x)) > Math.abs(beamDefl(spans, EI, xD))) xD = x;
  }

  /* Positions come back the way round the visitor entered them. */
  const un = x => (mirror ? L - x : x);
  return {
    sec, kind, mirror, L, a, EI, spans, at,
    M: at(xM), xM: un(xM),
    defl: beamDefl(spans, EI, xD), xD: un(xD),
    atLoad: beamDefl(spans, EI, a),
    M0: at(0), ML: at(L),
    R0: beamStart(kind, v.P, L, a).RA,
  };
}

registerFormula({
  id: 'beam-bending',
  slug: 'beam',
  topic: 'mechanics',
  name: 'Beam Bending',
  short: 'Beam Bending',
  desc: 'Maximum stress and deflection in a beam under a point load',
  keywords: 'beam bending calculator maximum stress deflection point load simply supported cantilever fixed built-in propped end conditions boundary conditions bending moment diagram section modulus flexural transverse load span reactions slope joist',
  title: 'Beam Bending Calculator: Maximum Stress and Deflection',
  blurb: 'Maximum bending stress and deflection for a point load anywhere on the span, each end pinned, fixed or free. SI or English.',
  diagram: '/img/beam-bending.svg',
  diagramAlt: 'A beam of span L carrying a point load P at distance a from its left end, shown sagging, with a key to the pinned, fixed and free end conditions.',
  about: [
    'A beam carries a load across a gap by bending. One face stretches, the other squashes, and the further those faces sit from the middle the less stress it takes to hold the load — which is the whole reason a joist is stood on edge rather than laid flat.',
    'The ends decide most of the answer. A cantilever holding a load at its tip bends sixteen times as far as the same beam simply supported; building both ends in instead quarters it. Each end here is pinned, fixed or free, and the combinations that would let the beam turn and fall are refused rather than answered.',
    'Stress and deflection rarely peak in the same place and neither stands in for the other. A beam can sit well below its yield stress and still sag more than anyone will put up with, which is why floors are held to a fraction of the span rather than to a stress. That check is in the panel.',
    'One point load, constant section, small deflections, and the material still elastic — below the stress at which it would take a permanent set. Self weight is not included, and nor is shear deflection, which starts to tell on beams that are short and deep. There is no factor of safety here and this follows no design code.',
  ],
  eq: 'σmax = Mmax·c / I',
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: BEAM_UNITS.map(u => ({ value: u.value, label: u.label })) },
    { key: 'sec', label: 'Cross section', full: true,
      options: [{ value: SEC_ROUND, label: 'Solid round bar' },
                { value: SEC_TUBE, label: 'Round tube' },
                { value: SEC_RECT, label: 'Solid rectangle' },
                { value: SEC_BOX, label: 'Rectangular tube' },
                { value: SEC_GIVEN, label: 'Section properties, entered directly' }] },
    { key: 'endL', label: 'Left end',
      options: [{ value: END_PIN, label: 'Pinned' }, { value: END_FIX, label: 'Fixed' },
                { value: END_FREE, label: 'Free' }] },
    { key: 'endR', label: 'Right end',
      options: [{ value: END_PIN, label: 'Pinned' }, { value: END_FIX, label: 'Fixed' },
                { value: END_FREE, label: 'Free' }] },
    { key: 'd', label: 'Diameter', unit: 'mm', hint: 'e.g. 25',
      showIf: v => +v.sec === SEC_ROUND },
    { key: 'od', label: 'Outside diameter', unit: 'mm', hint: 'e.g. 50',
      showIf: v => +v.sec === SEC_TUBE },
    { key: 'w', label: 'Width', unit: 'mm', hint: 'e.g. 50',
      showIf: v => +v.sec === SEC_RECT || +v.sec === SEC_BOX },
    { key: 'h', label: 'Depth, in the plane of bending', unit: 'mm', hint: 'e.g. 100',
      showIf: v => +v.sec === SEC_RECT || +v.sec === SEC_BOX },
    { key: 't', label: 'Wall thickness', unit: 'mm', hint: 'e.g. 3',
      showIf: v => +v.sec === SEC_TUBE || +v.sec === SEC_BOX },
    { key: 'I', label: 'Second moment of area', unit: 'mm⁴', hint: 'bending axis',
      showIf: v => +v.sec === SEC_GIVEN },
    { key: 'c', label: 'Distance to the outer fibre', unit: 'mm', hint: 'half the depth',
      showIf: v => +v.sec === SEC_GIVEN },
    { key: 'len', label: 'Span', unit: 'mm', hint: 'e.g. 2000' },
    { key: 'P', label: 'Load', unit: 'N', hint: 'e.g. 1000' },
    { key: 'a', label: 'Load position, from the left end', unit: 'mm', hint: 'e.g. 1000' },
    { key: 'E', label: 'Modulus of elasticity', unit: 'MPa', hint: '200000 for steel' },
    { key: 'lim', label: 'Deflection limit, span ÷', unit: '', hint: 'e.g. 360',
      optional: true, advanced: true },
  ],
  output: { label: 'Maximum bending stress', unit: v => beamUnits(v).stress },
  unitsFor: beamUnitsFor,

  onFieldChange: key => {
    if (key === 'len') return fitLoadSlider();
    if (key !== 'sys') return;
    const now = +document.getElementById('in_sys').value;
    if (now === beamSystem) return;
    const toEnglish = now === 1;
    const len = toEnglish ? 1 / MM_PER_IN : MM_PER_IN;
    ['d', 'od', 'w', 'h', 't', 'c', 'len', 'a'].forEach(k => convertField(k, len));
    convertField('E', toEnglish ? PSI_PER_MPA : 1 / PSI_PER_MPA);
    convertField('P', toEnglish ? 1 / N_PER_LBF : N_PER_LBF);
    convertField('I', len ** 4);
    fitLoadSlider();
    beamSystem = now;
  },

  compute: v => {
    const p = beamPeaks(v);
    return Math.abs(p.M) * p.sec.c / p.sec.I;
  },
  format: n => num(+n.toFixed(n < 100 ? 3 : 1)),
  extras: v => {
    let p;
    try { p = beamPeaks(v); } catch (e) { return []; }
    const u = beamUnits(v);
    const D = n => num(+Math.abs(n).toFixed(Math.abs(n) < 10 ? 4 : 2)) + ' ' + u.length;
    /* Six significant figures turns 4166666.7 into 4166670, which reads like a
       rounder number than it is. Above a thousand the whole number is shorter
       and truer than any rounding of it. */
    const big = n => num(Math.abs(n) >= 1000 ? Math.round(n) : +(+n).toPrecision(4));
    const M = n => big(Math.abs(n)) + ' ' + u.moment;
    const X = n => num(+n.toFixed(1)) + ' ' + u.length + ' from the left';
    const rows = [
      { label: 'Maximum deflection', value: D(p.defl) },
      { label: 'Maximum bending moment', value: M(p.M) },
      { label: 'Where the stress is worst', detail: true, value: X(p.xM) },
      { label: 'Where the deflection is worst', detail: true, value: X(p.xD) },
      { label: 'Deflection under the load', detail: true, value: D(p.atLoad) },
    ];
    /* A moment at an end means that end is holding the beam against turning,
       which only a fixed end does. */
    if (Math.abs(p.M0) > 1e-9) rows.push({ label: 'Moment at the left end', detail: true, value: M(p.M0) });
    if (Math.abs(p.ML) > 1e-9) rows.push({ label: 'Moment at the right end', detail: true, value: M(p.ML) });
    rows.push({ label: 'Section modulus I/c', detail: true,
                value: big(p.sec.I / p.sec.c) + ' ' + u.length + '³' });
    rows.push({ label: 'Second moment of area', detail: true,
                value: big(p.sec.I) + ' ' + u.inertia });
    rows.push({ label: 'Distance to the outer fibre', detail: true, value: D(p.sec.c) });
    return rows;
  },

  advanced: {
    summary: 'Does it pass a deflection limit?',
    intro: 'Beams are usually held to a fraction of their span rather than to a stress. Floors are commonly span ÷ 360, roofs ÷ 240, and something you only have to walk on ÷ 180. Put the denominator in and it will say whether this one clears it.',
    note: v => {
      if (!(v.lim > 0)) return '';
      let p;
      try { p = beamPeaks(v); } catch (e) { return ''; }
      const u = beamUnits(v), allowed = p.L / v.lim, got = Math.abs(p.defl);
      const n = x => num(+x.toFixed(x < 10 ? 4 : 2)) + ' ' + u.length;
      return got <= allowed
        ? `Span ÷ ${+v.lim} allows ${n(allowed)} and this beam moves ${n(got)}, so it clears it with ${((1 - got / allowed) * 100).toFixed(0)}% to spare.`
        : `Span ÷ ${+v.lim} allows ${n(allowed)} and this beam moves ${n(got)} — over by ${((got / allowed - 1) * 100).toFixed(0)}%.`;
    },
  },
  defaults: { sys: 0, sec: SEC_RECT, endL: END_PIN, endR: END_PIN,
              w: 50, h: 100, len: 2000, P: 1000, a: 1000, E: 200000 },
  sliders: [
    { key: 'a', span: 2000, floor: 0, ceil: 2000, step: 10 },
  ],
  series: v => {
    let p;
    try { p = beamPeaks(v); } catch (e) { return { points: [] }; }
    /* Both curves turn a corner under the load, and the stress diagram peaks
       there. An even spread would cut that corner off unless it happened to
       land on it, so the load position is a point in its own right. */
    const N = 60, xs = [v.a];
    for (let i = 0; i <= N; i++) xs.push(p.L * i / N);
    xs.sort((m, n) => m - n);
    const pts = xs.map(x => ({ x, y: beamDefl(p.spans, p.EI, p.mirror ? p.L - x : x) }));
    /* A held end comes out of the arithmetic as 1e-17 rather than 0, which is
       zero for every purpose except the axis label printed beside it. */
    const big = Math.max(...pts.map(q => Math.abs(q.y)));
    for (const q of pts) if (Math.abs(q.y) < big * 1e-9) q.y = 0;
    /* Bending stress at the outer fibre, the figure the headline answer is the
       peak of. It follows the moment, so it is negative where the beam hogs —
       over a built-in end the top face is the one in tension. */
    const sig = pts.map(q => ({
      x: q.x,
      y: p.at(p.mirror ? p.L - q.x : q.x) * p.sec.c / p.sec.I,
    }));
    const u = beamUnits(v), x = n => +n.toFixed(0);
    return [{
      title: 'How the beam sits under the load',
      xLabel: 'Distance from the left end (' + u.length + ')',
      yLabel: 'Deflection (' + u.length + ')',
      points: pts, label: 'Deflection',
      yTickFmt: n => +n.toPrecision(3),
      xTickFmt: x,
    }, {
      title: 'Bending stress along the beam',
      xLabel: 'Distance from the left end (' + u.length + ')',
      yLabel: 'Stress (' + u.stress + ')',
      points: sig, label: 'Stress',
      yTickFmt: n => +n.toPrecision(3),
      xTickFmt: x,
    }];
  },
});

/* The load can sit anywhere on the beam and nowhere else, so the slider spans
   exactly the beam. It has to be refitted whenever the span changes, in either
   unit. */
function fitLoadSlider() {
  const f = FORMULAS.find(x => x.id === 'beam-bending');
  const L = parseFloat(document.getElementById('in_len').value);
  if (!isFinite(L) || !(L > 0)) return;
  const s = f.sliders[0];
  s.span = L; s.floor = 0; s.ceil = L; s.step = +(L / 200).toPrecision(1);
  const a = parseFloat(document.getElementById('in_a').value);
  recenterSlider(s, isFinite(a) ? Math.min(Math.max(a, 0), L) : L / 2);
}
