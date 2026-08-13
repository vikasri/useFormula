/* euler-buckling. `num` comes from engine.js; MM_PER_IN, PSI_PER_MPA and
   convertField from js/shared/mechanics.js.

   Three choices at the top — units, section, end conditions — and then only
   the dimensions those choices call for. A solid bar is never asked for a wall
   thickness: the fields it does not use are hidden rather than ignored. */

/* What the numbers on screen currently mean, so the page knows which system it
   is coming from when the selector moves. */
let columnSystem = 0;

const SEC_ROUND = 0, SEC_TUBE = 1, SEC_RECT = 2, SEC_BOX = 3, SEC_GIVEN = 4;

/* Effective length factor for each pair of ends, theoretical values. The
   fixed-pinned figure is 0.6992, the root of tan u = u, normally quoted 0.7. */
const END_K = [1, 2, 0.5, 0.6992];

const COLUMN_UNITS = [
  { value: 0, label: 'SI (N, mm, MPa)', force: 'N', length: 'mm',
    stress: 'MPa', inertia: 'mm⁴', area: 'mm²' },
  { value: 1, label: 'English (lbf, in, psi)', force: 'lbf', length: 'in',
    stress: 'psi', inertia: 'in⁴', area: 'in²' },
];
function columnUnits(v) { return COLUMN_UNITS[+v.sys === 1 ? 1 : 0]; }
function columnUnitsFor(v) {
  const u = columnUnits(v);
  return { len: u.length, E: u.stress, d: u.length, od: u.length, t: u.length,
           w: u.length, h: u.length, I: u.inertia, area: u.area, sy: u.stress };
}

/* Second moment of area about the weaker axis, with the area alongside it.

   A column turns about whichever axis is easiest, so for anything that is not
   round it is the smaller I that governs — a joist stood on edge is stiff in
   bending and no stiffer than its thin dimension in buckling. Round sections
   are the same about every axis, which is why tube is the usual choice for a
   strut that could go either way. */
function sectionProps(v) {
  const sec = +v.sec;
  if (sec === SEC_ROUND) {
    if (!(v.d > 0)) throw new Error('Diameter has to be above zero.');
    return { I: Math.PI * v.d ** 4 / 64, A: Math.PI * v.d * v.d / 4 };
  }
  if (sec === SEC_TUBE) {
    const D = v.od, di = D - 2 * v.t;
    if (!(D > 0) || !(v.t > 0)) throw new Error('Outside diameter and wall thickness both have to be above zero.');
    if (di <= 0) throw new Error('That wall is thicker than the radius, which leaves a solid bar.');
    return { I: Math.PI * (D ** 4 - di ** 4) / 64, A: Math.PI * (D * D - di * di) / 4 };
  }
  if (sec === SEC_RECT || sec === SEC_BOX) {
    const w = v.w, h = v.h;
    if (!(w > 0) || !(h > 0)) throw new Error('Width and depth both have to be above zero.');
    const s = Math.min(w, h), l = Math.max(w, h);
    if (sec === SEC_RECT) return { I: l * s ** 3 / 12, A: w * h };
    if (!(v.t > 0)) throw new Error('Wall thickness has to be above zero.');
    if (s - 2 * v.t <= 0) throw new Error('That wall is thicker than half the shorter side, which leaves it solid.');
    return { I: (l * s ** 3 - (l - 2 * v.t) * (s - 2 * v.t) ** 3) / 12,
             A: w * h - (w - 2 * v.t) * (h - 2 * v.t) };
  }
  if (!(v.I > 0)) throw new Error('Second moment of area has to be above zero.');
  /* Area is optional here. Without it there is still a buckling load, just no
     stress and no slenderness to go with it. */
  return { I: v.I, A: v.area > 0 ? v.area : 0 };
}

/* Slenderness at which Euler's stress equals the yield stress. Below it the
   column reaches yield first and Euler is reading high. */
function eulerLimit(E, sy) { return Math.PI * Math.sqrt(E / sy); }

registerFormula({
  id: 'euler-buckling',
  slug: 'buckling',
  topic: 'mechanics',
  name: 'Euler Buckling',
  short: 'Euler Buckling',
  desc: 'Load at which a slender column stops being straight',
  keywords: 'euler buckling column critical load slender strut compression member effective length factor K pinned fixed free end conditions second moment of area radius of gyration slenderness ratio elastic instability crippling load pcr',
  title: 'Euler Buckling Calculator: Critical Load for a Column',
  blurb: 'Critical buckling load for a column: round, rectangular or hollow section, the four standard end conditions, with stress and slenderness. SI or English.',
  diagram: '/img/euler-buckling.svg',
  diagramAlt: 'Four columns under load showing how they buckle: pinned at both ends K = 1, fixed at one end and free at the other K = 2, fixed at both ends K = 0.5, and fixed at one end and pinned at the other K = 0.7.',
  about: [
    'A short column crushes. A long one goes sideways well before the material is anywhere near giving up, and that sideways load is what this works out. It turns on stiffness and shape alone: a mild steel strut and a high tensile one of the same size buckle at exactly the same load, because E is much the same for both.',
    'The ends matter more than anything else on the form. Fix both instead of pinning them and the load goes up four times; leave one free instead of pinned and it drops to a quarter. All of that is the K factor, and the effective length KL it produces is the length of a pinned-pinned column that would fail at the same load.',
    'A column turns about whichever axis is easiest, so the smaller second moment of area is the one that counts. That is the figure taken here for a rectangle, and it is why a plank on edge is far weaker as a strut than its depth suggests.',
    'Euler assumes a column straight to begin with, loaded down its axis, and still elastic at the moment it goes. Real ones are neither straight nor loaded that neatly, and carry less. Stocky columns reach yield before they ever buckle, which puts them outside this altogether: put a yield strength in the panel and it will say which comes first. There is no factor of safety here and this follows no design code.',
  ],
  eq: 'Pcr = π²EI / (KL)²',
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: COLUMN_UNITS.map(u => ({ value: u.value, label: u.label })) },
    { key: 'sec', label: 'Cross section', full: true,
      options: [{ value: SEC_ROUND, label: 'Solid round bar' },
                { value: SEC_TUBE, label: 'Round tube' },
                { value: SEC_RECT, label: 'Solid rectangle' },
                { value: SEC_BOX, label: 'Rectangular tube' },
                { value: SEC_GIVEN, label: 'Second moment of area, entered directly' }] },
    { key: 'bc', label: 'End conditions', full: true,
      options: [{ value: 0, label: 'Pinned both ends (K = 1)' },
                { value: 1, label: 'Fixed one end, free the other (K = 2)' },
                { value: 2, label: 'Fixed both ends (K = 0.5)' },
                { value: 3, label: 'Fixed one end, pinned the other (K ≈ 0.7)' }] },
    { key: 'd', label: 'Diameter', unit: 'mm', hint: 'e.g. 25',
      showIf: v => +v.sec === SEC_ROUND },
    { key: 'od', label: 'Outside diameter', unit: 'mm', hint: 'e.g. 50',
      showIf: v => +v.sec === SEC_TUBE },
    { key: 'w', label: 'Width', unit: 'mm', hint: 'e.g. 50',
      showIf: v => +v.sec === SEC_RECT || +v.sec === SEC_BOX },
    { key: 'h', label: 'Depth', unit: 'mm', hint: 'e.g. 25',
      showIf: v => +v.sec === SEC_RECT || +v.sec === SEC_BOX },
    { key: 't', label: 'Wall thickness', unit: 'mm', hint: 'e.g. 3',
      showIf: v => +v.sec === SEC_TUBE || +v.sec === SEC_BOX },
    { key: 'I', label: 'Second moment of area', unit: 'mm⁴', hint: 'weak axis',
      showIf: v => +v.sec === SEC_GIVEN },
    { key: 'area', label: 'Cross-sectional area', unit: 'mm²',
      hint: 'blank = skip stress', optional: true,
      showIf: v => +v.sec === SEC_GIVEN },
    { key: 'len', label: 'Length', unit: 'mm', hint: 'e.g. 1000' },
    { key: 'E', label: 'Modulus of elasticity', unit: 'MPa', hint: '200000 for steel' },
    { key: 'sy', label: 'Yield strength', unit: 'MPa', hint: 'blank = skip the check',
      optional: true, advanced: true },
  ],
  output: { label: 'Critical buckling load', unit: v => columnUnits(v).force },
  unitsFor: columnUnitsFor,

  /* Carry the figures across when the system changes. Without this, 200000 MPa
     would quietly become 200000 psi, which is a soft plastic. */
  onFieldChange: key => {
    if (key !== 'sys') return;
    const now = +document.getElementById('in_sys').value;
    if (now === columnSystem) return;
    const toEnglish = now === 1;
    const len = toEnglish ? 1 / MM_PER_IN : MM_PER_IN;
    const str = toEnglish ? PSI_PER_MPA : 1 / PSI_PER_MPA;
    ['d', 'od', 'w', 'h', 't', 'len'].forEach(k => convertField(k, len));
    ['E', 'sy'].forEach(k => convertField(k, str));
    convertField('I', len ** 4);
    convertField('area', len * len);
    /* The length slider spans an absolute distance, so its range has to move
       with the unit too, or 800 mm of travel becomes 800 inches. */
    const s = FORMULAS.find(x => x.id === 'euler-buckling').sliders[0];
    s.span = toEnglish ? 32 : 800;
    s.floor = toEnglish ? 0.5 : 10;
    s.step = toEnglish ? 0.5 : 10;
    const now_len = parseFloat(document.getElementById('in_len').value);
    if (isFinite(now_len)) recenterSlider(s, now_len);
    columnSystem = now;
  },

  compute: v => {
    const { I } = sectionProps(v);
    if (!(v.len > 0)) throw new Error('Length has to be above zero.');
    if (!(v.E > 0)) throw new Error('Modulus of elasticity has to be above zero.');
    const KL = END_K[+v.bc] * v.len;
    return Math.PI * Math.PI * v.E * I / (KL * KL);
  },
  format: n => num(+n.toFixed(n < 100 ? 2 : 0)),
  extras: (v, P) => {
    const u = columnUnits(v);
    let p;
    try { p = sectionProps(v); } catch (e) { return []; }
    if (!(v.len > 0) || !(v.E > 0)) return [];
    const K = END_K[+v.bc], KL = K * v.len;
    const F = n => num(+n.toFixed(n < 100 ? 2 : 0)) + ' ' + u.force;
    const L = n => num(+n.toFixed(2)) + ' ' + u.length;
    const rows = [];
    /* Without an area there is no stress and no slenderness — which is the
       trade for entering I straight from a table. */
    if (p.A > 0) {
      const r = Math.sqrt(p.I / p.A), lam = KL / r;
      rows.push({ label: 'Stress at that load', value: num(+(P / p.A).toFixed(2)) + ' ' + u.stress });
      rows.push({ label: 'Slenderness ratio KL/r', value: num(+lam.toFixed(1)) });
      if (v.sy > 0) {
        const squash = p.A * v.sy, lim = eulerLimit(v.E, v.sy);
        rows.push({ label: 'Whichever comes first', wide: true,
                    value: lam >= lim
                      ? `buckling, at ${F(P)}`
                      : `yielding, at ${F(squash)} — this column is too stocky for Euler` });
        rows.push({ label: 'Load to squash it, area × yield', detail: true, value: F(squash) });
        rows.push({ label: 'Slenderness Euler needs, π√(E/σy)', detail: true, value: num(+lim.toFixed(1)) });
      }
      rows.push({ label: 'Radius of gyration r', detail: true, value: L(r) });
      rows.push({ label: 'Cross-sectional area', detail: true,
                  value: num(+p.A.toFixed(2)) + ' ' + u.area });
    }
    rows.push({ label: 'Second moment of area, weak axis', detail: true,
                value: num(+p.I.toPrecision(6)) + ' ' + u.inertia });
    rows.push({ label: 'Effective length KL', detail: true, value: L(KL) });
    rows.push({ label: 'Effective length factor K', detail: true, value: K });
    return rows;
  },

  advanced: {
    summary: 'Is this column slender enough for Euler?',
    intro: 'Euler describes a column that bends away long before the material yields. Give it a yield strength and it will work out where the changeover sits and say which side yours is on. Around 250 MPa for mild steel, 36000 psi.',
    note: (v, P) => {
      if (!(v.sy > 0) || !(v.E > 0)) return '';
      let p;
      try { p = sectionProps(v); } catch (e) { return ''; }
      if (!(p.A > 0) || !(v.len > 0)) return '';
      const u = columnUnits(v);
      const lam = END_K[+v.bc] * v.len / Math.sqrt(p.I / p.A);
      const lim = eulerLimit(v.E, v.sy);
      return lam >= lim
        ? `Slenderness ${lam.toFixed(0)}, against the ${lim.toFixed(0)} Euler needs at this yield strength. `
          + `The column bends away first, so the ${num(+P.toFixed(0))} ${u.force} above holds.`
        : `Slenderness ${lam.toFixed(0)}, below the ${lim.toFixed(0)} Euler needs at this yield strength. `
          + `The material yields before it buckles, so the figure above is higher than the column will ever reach.`;
    },
  },
  defaults: { sys: 0, sec: SEC_ROUND, bc: 0, d: 25, len: 1000, E: 200000 },
  /* Length only. It is the one that matters most, and the inverse square is
     the whole point of the calculator. */
  sliders: [
    { key: 'len', span: 800, floor: 10, step: 10 },
  ],
  series: v => {
    let p;
    try { p = sectionProps(v); } catch (e) { return { points: [] }; }
    if (!(v.len > 0) || !(v.E > 0)) return { points: [] };
    const K = END_K[+v.bc], N = 40, pts = [];
    const from = v.len * 0.5, to = v.len * 2;
    for (let i = 0; i <= N; i++) {
      const x = from + (to - from) * i / N;
      pts.push({ x, y: Math.PI * Math.PI * v.E * p.I / ((K * x) ** 2) });
    }
    const out = {
      title: 'Buckling load against length',
      xLabel: 'Length (' + columnUnits(v).length + ')',
      yLabel: 'Load (' + columnUnits(v).force + ')',
      points: pts, label: 'Euler',
      yTickFmt: n => num(+n.toPrecision(3)),
      xTickFmt: n => +n.toFixed(0),
    };
    /* With a yield strength in hand the flat squash load can go alongside, and
       where the two cross is where the column changes how it fails. */
    if (v.sy > 0 && p.A > 0) {
      const squash = p.A * v.sy;
      out.extra = [{ points: pts.map(q => ({ x: q.x, y: squash })),
                     label: 'Squash', cls: 'red' }];
    }
    return out;
  },
});
