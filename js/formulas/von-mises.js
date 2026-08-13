/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* von-mises. `num` comes from engine.js; the unit constants, convertField and
   MISES_LABEL/MISES_NOTE from js/shared/mechanics.js.

   Six numbers in, one out. The page draws the yield surface twice because the
   two pictures answer different questions: the cylinder says why hydrostatic
   pressure never yields anything, and the section says how much room is left
   before this particular state reaches the edge. */

let misesSystem = 0;

const MISES_UNITS = [
  { value: 0, label: 'SI (MPa)', stress: 'MPa' },
  { value: 1, label: 'English (psi)', stress: 'psi' },
];
function misesUnits(v) { return MISES_UNITS[+v.sys === 1 ? 1 : 0]; }

/* Principal stresses: the eigenvalues of the stress tensor, largest first.

   A symmetric 3x3 has three real eigenvalues and a closed form for them, so
   there is no iteration here and no convergence to worry about. The cubic is
   solved through its trigonometric form, which is the arrangement that stays
   accurate when two of the roots are close together. */
const SQRT3 = Math.sqrt(3), SQRT6 = Math.sqrt(6);

function principalStresses(t) {
  const { s11, s22, s33, s12, s13, s23 } = t;
  const p1 = s12 * s12 + s13 * s13 + s23 * s23;
  /* No shear: the axes given are already the principal ones. */
  if (p1 === 0) return [s11, s22, s33].sort((a, b) => b - a);
  const q = (s11 + s22 + s33) / 3;
  const p2 = (s11 - q) ** 2 + (s22 - q) ** 2 + (s33 - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6);
  const b11 = (s11 - q) / p, b22 = (s22 - q) / p, b33 = (s33 - q) / p;
  const b12 = s12 / p, b13 = s13 / p, b23 = s23 / p;
  const det = b11 * (b22 * b33 - b23 * b23)
            - b12 * (b12 * b33 - b23 * b13)
            + b13 * (b12 * b23 - b22 * b13);
  /* Rounding can push this a hair outside the range acos accepts. */
  const r = Math.max(-1, Math.min(1, det / 2));
  const phi = Math.acos(r) / 3;
  const e1 = q + 2 * p * Math.cos(phi);
  const e3 = q + 2 * p * Math.cos(phi + 2 * Math.PI / 3);
  return [e1, 3 * q - e1 - e3, e3];
}

function misesStress(t) {
  return Math.sqrt(0.5 * ((t.s11 - t.s22) ** 2 + (t.s22 - t.s33) ** 2 + (t.s33 - t.s11) ** 2)
    + 3 * (t.s12 * t.s12 + t.s13 * t.s13 + t.s23 * t.s23));
}

/* Everything the page and both drawings need, worked out once. */
function misesState(v) {
  const t = { s11: v.s11, s22: v.s22, s33: v.s33, s12: v.s12, s13: v.s13, s23: v.s23 };
  const raw = principalStresses(t);
  /* The closed form leaves a residue where an exact zero belongs — 1.4e-14
     rather than 0 — which is nothing as a stress and an eyesore on an axis
     label. Anything that small beside the largest of them is zero. */
  const big = Math.max(...raw.map(Math.abs));
  const [p1, p2, p3] = raw.map(x => (Math.abs(x) < big * 1e-12 ? 0 : x));
  const vm = misesStress(t);
  /* Where the state sits relative to the hydrostatic axis. Along that axis is
     equal stress in every direction, which distorts nothing and so yields
     nothing; only the distance from it counts. */
  const xi = (p1 + p2 + p3) / SQRT3;
  const a = (2 * p1 - p2 - p3) / SQRT6;
  const b = (p2 - p3) / Math.SQRT2;
  return {
    t, vm, p1, p2, p3, xi, a, b,
    rho: Math.hypot(a, b),
    mean: (p1 + p2 + p3) / 3,
    tresca: p1 - p3,
    fos: v.sy > 0 ? v.sy / vm : null,
    R: Math.sqrt(2 / 3) * (v.sy || 0),      // yield surface radius about the axis
  };
}

/* ---- the two drawings ---------------------------------------------------
   Both are built from the numbers on the form, so they move as it is edited.
   Colours follow the site: blue for figures, green for inside the surface,
   red for outside it. */

const FIG_INK = '#263238', FIG_GREY = '#5f6e75', FIG_BLUE = '#2f6bff',
      FIG_GOOD = '#16a34a', FIG_BAD = '#dc2626', FIG_WARM = '#e76f51';

function figOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="figure" role="img"`;
}

/* The stress element: a cube with its faces square to the 1, 2, 3 axes,
   carrying the six components as they were typed. Drawn in cabinet projection
   — the 3 axis at 30 degrees and half length — which is the arrangement a
   mechanics textbook uses, and the one that leaves all three visible faces
   distinguishable.

   Sign is shown by direction rather than by a minus sign in a label: an arrow
   pointing out of a face is tension, one pointing into it is compression. That
   is the convention the reader already has in their head from the page above
   the form. */
function misesFigureElement(v, u) {
  const W = 520, H = 350, S = 86, OX = 118, OY = 228;
  const AX = 0.433, AY = 0.25;                       // where the 3 axis goes
  const P = (x, y, z) => [OX + (x + AX * z) * S, OY + (-y - AY * z) * S];
  const at = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const poly = pts => pts.map(c => P(...c)).map(at).join(' L ');
  const zero = n => !n || Math.abs(n) < 1e-12;
  /* Signed, as it was typed. The arrow already says which way it acts, but a
     reader who entered -60 should see -60 and not have to trust the drawing. */
  const fmt = n => num(+(+n).toPrecision(4));

  /* Out of the face for tension, into it for compression. */
  const arrow = (from, to, col, w) => {
    const A = P(...from), B = P(...to);
    return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}"
      y2="${B[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" marker-end="url(#se-${col === FIG_BLUE ? 'n' : 's'})"/>`;
  };
  /* Labels are collected rather than drawn, so they can be moved apart before
     anything is written. Six components on three visible faces will collide in
     some combination whatever fixed offsets are chosen, and a state with every
     component filled in is a state someone will enter. */
  const marks = [];
  const label = (p, dx, dy, text, col, anchor) => {
    const A = P(...p);
    marks.push({ x: A[0] + dx, y: A[1] + dy, text, col, anchor });
  };
  const drawLabels = () => {
    const done = [];
    for (const m of marks.slice().sort((a, b) => a.y - b.y)) {
      /* Push down until clear of everything already placed. */
      while (done.some(d => Math.abs(d.y - m.y) < 15 &&
                            Math.abs(d.x - m.x) < 96 && d.anchor === m.anchor)) {
        m.y += 15;
      }
      done.push(m);
    }
    return done.map(m => `<text x="${m.x.toFixed(1)}" y="${m.y.toFixed(1)}" fill="${m.col}"
      text-anchor="${m.anchor}" font-weight="600">${m.text}</text>`).join('');
  };

  let g = '';
  /* Direct stress, one arrow per visible face, along that face's own axis. */
  const direct = [
    ['s11', [1, 0.5, 0.5], [1, 0, 0], 0.62, '\u03C3\u2081\u2081', 10, 4, 'start'],
    ['s22', [0.5, 1, 0.5], [0, 1, 0], 0.62, '\u03C3\u2082\u2082', 0, -10, 'middle'],
    ['s33', [0.5, 0.5, 1], [0, 0, 1], 1.15, '\u03C3\u2083\u2083', 8, -6, 'start'],
  ];
  for (const [k, c, d, len, name, dx, dy, anchor] of direct) {
    const val = v[k] || 0;
    if (zero(val)) continue;
    const out = [c[0] + d[0] * len, c[1] + d[1] * len, c[2] + d[2] * len];
    g += val > 0 ? arrow(c, out, FIG_BLUE, 2) : arrow(out, c, FIG_BLUE, 2);
    g += label(out, dx, dy, `${name} = ${fmt(val)}`, FIG_BLUE, anchor);
  }

  /* Shear in complementary pairs: a component on one face is matched by an
     equal one on the face it shares an edge with, which is why the tensor is
     symmetric and why only six numbers are asked for. */
  const shear = [
    ['s12', '\u03C3\u2081\u2082', [[1, 0.16, 0.3], [1, 0.84, 0.3]],
      [[0.16, 1, 0.7], [0.84, 1, 0.7]], 12, -4],
    ['s13', '\u03C3\u2081\u2083', [[1, 0.72, 0.14], [1, 0.72, 0.86]],
      [[0.14, 0.28, 1], [0.86, 0.28, 1]], 12, 14],
    ['s23', '\u03C3\u2082\u2083', [[0.3, 1, 0.14], [0.3, 1, 0.86]],
      [[0.72, 0.14, 1], [0.72, 0.86, 1]], -10, -8],
  ];
  for (const [k, name, pairA, pairB, dx, dy] of shear) {
    const val = v[k] || 0;
    if (zero(val)) continue;
    for (const [a, b] of [pairA, pairB]) {
      g += val > 0 ? arrow(a, b, FIG_WARM, 1.8) : arrow(b, a, FIG_WARM, 1.8);
    }
    g += label(val > 0 ? pairA[1] : pairA[0], dx, dy,
               `${name} = ${fmt(val)}`, FIG_WARM, dx < 0 ? 'end' : 'start');
  }

  return `${figOpen(W, H)} aria-label="A stress element: a cube with the six stress components
    drawn on its faces as they were entered.">
    <defs>
      <marker id="se-n" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0 0 L8 4 L0 8 Z" fill="${FIG_BLUE}"/></marker>
      <marker id="se-s" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0 0 L8 4 L0 8 Z" fill="${FIG_WARM}"/></marker>
      <marker id="se-a" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="4" markerHeight="4" orient="auto">
        <path d="M0 0 L8 4 L0 8 Z" fill="${FIG_GREY}"/></marker>
    </defs>
    <g font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="12.5">
      <path d="M ${poly([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]])} Z"
            fill="#ffffff" stroke="${FIG_INK}" stroke-width="1.5"/>
      <path d="M ${poly([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]])} Z"
            fill="#fbece6" fill-opacity="0.55" stroke="${FIG_INK}" stroke-width="1.5"/>
      <path d="M ${poly([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]])} Z"
            fill="#fbece6" fill-opacity="0.3" stroke="${FIG_INK}" stroke-width="1.5"/>
      ${g}
      ${drawLabels()}
      <g stroke="${FIG_GREY}" stroke-width="1.2" marker-end="url(#se-a)" opacity="0.9">
        <line x1="34" y1="${H - 30}" x2="70" y2="${H - 30}"/>
        <line x1="34" y1="${H - 30}" x2="34" y2="${H - 66}"/>
        <line x1="34" y1="${H - 30}" x2="${(34 + 36 * AX / 0.5).toFixed(1)}" y2="${(H - 30 - 36 * AY / 0.5).toFixed(1)}"/>
      </g>
      <g fill="${FIG_GREY}" font-size="11.5" font-style="italic">
        <text x="75" y="${H - 26}">1</text>
        <text x="30" y="${H - 70}">2</text>
        <text x="${(34 + 36 * AX / 0.5 + 5).toFixed(1)}" y="${(H - 30 - 36 * AY / 0.5 - 3).toFixed(1)}">3</text>
      </g>
    </g></svg>`;
}

/* The yield surface in three dimensions: a cylinder of radius sqrt(2/3)*sy
   wrapped around the line of equal stress in every direction. Viewed with that
   line running up the page and tilted a little towards the reader, so the
   circular sections read as ellipses rather than as flat lines. */
function misesFigure3D(s, u) {
  const W = 520, H = 330, TILT = 22 * Math.PI / 180;
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const R = s.R;
  if (!(R > 0)) return '';
  /* Drawn at the state's own level on the axis, so the cylinder is always the
     same readable size. Nothing is lost by it: how far along the axis a state
     sits has no bearing on whether it yields, which is the point the caption
     is making, and a strongly hydrostatic state would otherwise stretch this
     into an unreadable sliver. */
  const L = 1.35 * R;
  const yOf = (xi, b) => -xi * ct + b * st;
  const px = s.a, py = yOf(0, s.b);
  const halfX = Math.max(R, Math.abs(px)) * 1.16;
  const halfY = (L * ct + R * st) * 1.06;
  const k = Math.min((W - 120) / (2 * halfX), (H - 66) / (2 * halfY));
  const cx = W / 2 - 18, cy = H / 2 + 2;
  const X = x => (cx + x * k).toFixed(1), Y = y => (cy + y * k).toFixed(1);
  const rx = (R * k).toFixed(1), ry = (R * st * k).toFixed(1);
  const inside = s.rho <= R;
  const dot = inside ? FIG_GOOD : FIG_BAD;
  return `${figOpen(W, H)} aria-label="The von Mises yield surface drawn as a cylinder of radius
    root two thirds times the yield strength, wrapped around the axis of equal stress in every
    direction. The stress state is marked ${inside ? 'inside' : 'outside'} it.">
    <g font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="12.5">
      <ellipse cx="${X(0)}" cy="${Y(yOf(-L, 0))}" rx="${rx}" ry="${ry}"
               fill="none" stroke="${FIG_BLUE}" stroke-width="1.6" opacity="0.55"/>
      <line x1="${X(-R)}" y1="${Y(yOf(-L, 0))}" x2="${X(-R)}" y2="${Y(yOf(L, 0))}"
            stroke="${FIG_BLUE}" stroke-width="1.6" opacity="0.75"/>
      <line x1="${X(R)}" y1="${Y(yOf(-L, 0))}" x2="${X(R)}" y2="${Y(yOf(L, 0))}"
            stroke="${FIG_BLUE}" stroke-width="1.6" opacity="0.75"/>
      <line x1="${X(0)}" y1="${Y(yOf(-L * 1.12, 0))}" x2="${X(0)}" y2="${Y(yOf(L * 1.12, 0))}"
            stroke="${FIG_INK}" stroke-width="1.1" stroke-dasharray="5 4" opacity="0.5"/>
      <ellipse cx="${X(0)}" cy="${Y(yOf(0, 0))}" rx="${rx}" ry="${ry}"
               fill="${FIG_BLUE}" fill-opacity="0.09" stroke="${FIG_BLUE}"
               stroke-width="1.3" stroke-dasharray="4 3" opacity="0.85"/>
      <ellipse cx="${X(0)}" cy="${Y(yOf(L, 0))}" rx="${rx}" ry="${ry}"
               fill="none" stroke="${FIG_BLUE}" stroke-width="1.8"/>
      <line x1="${X(0)}" y1="${Y(yOf(0, 0))}" x2="${X(px)}" y2="${Y(py)}"
            stroke="${dot}" stroke-width="1.5"/>
      <circle cx="${X(px)}" cy="${Y(py)}" r="5.5" fill="${dot}"/>
      <text x="${(+X(px) + 10).toFixed(1)}" y="${(+Y(py) + 4).toFixed(1)}" fill="${dot}"
            text-anchor="start" font-weight="600">your stress state</text>
      <text x="${X(0)}" y="${(+Y(yOf(L * 1.12, 0)) - 8).toFixed(1)}" fill="${FIG_GREY}"
            text-anchor="middle">equal stress in every direction</text>
      <text x="${(W - 6).toFixed(0)}" y="${(+Y(yOf(-L, 0)) + 20).toFixed(1)}" fill="${FIG_BLUE}"
            text-anchor="end">radius &#8730;(2/3)&#183;&#963;&#7522; = ${num(+s.R.toFixed(1))} ${u.stress}</text>
    </g></svg>`;
}

/* The same surface cut through the plane of the third principal stress, which
   is the picture with numbers on it: an ellipse for von Mises, and Tresca's
   hexagon sitting inside it wherever the two disagree. */
function misesFigure2D(s, u) {
  const W = 520, H = 380, sy = s.R > 0 ? s.R / Math.sqrt(2 / 3) : 0;
  if (!(sy > 0)) return '';
  const c = s.p3;
  /* In coordinates measured from (c, c) the section is u^2 - uv + v^2 = sy^2,
     an ellipse at 45 degrees: sqrt(2)*sy along the diagonal, sqrt(2/3)*sy
     across it. */
  const ell = [];
  for (let i = 0; i <= 96; i++) {
    const th = i / 96 * 2 * Math.PI;
    const P = Math.SQRT2 * sy * Math.cos(th), Q = Math.sqrt(2 / 3) * sy * Math.sin(th);
    ell.push([c + (P + Q) / Math.SQRT2, c + (P - Q) / Math.SQRT2]);
  }
  const hexPts = [[c + sy, c], [c + sy, c + sy], [c, c + sy],
                  [c - sy, c], [c - sy, c - sy], [c, c - sy]];
  const all = ell.concat(hexPts, [[s.p1, s.p2], [0, 0]]);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const lo = Math.min(...xs, ...ys), hi = Math.max(...xs, ...ys);
  const pad = (hi - lo) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  /* One scale for both axes, or the ellipse would not look like one. */
  const box = 300, ox = (W - box) / 2 + 10, oy = 22;
  const k = box / (max - min);
  const X = x => (ox + (x - min) * k).toFixed(1);
  const Y = y => (oy + (max - y) * k).toFixed(1);
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join(' ');
  const inside = s.vm <= sy;
  const dot = inside ? FIG_GOOD : FIG_BAD;
  const tick = n => num(+n.toPrecision(3));
  return `${figOpen(W, H)} aria-label="The yield surface cut through the third principal stress:
    an ellipse for von Mises with Tresca's hexagon inside it, and the stress state marked
    ${inside ? 'inside' : 'outside'} the ellipse.">
    <g font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="12">
      <line x1="${X(min)}" y1="${Y(0)}" x2="${X(max)}" y2="${Y(0)}" stroke="${FIG_INK}"
            stroke-width="1" opacity="0.45"/>
      <line x1="${X(0)}" y1="${Y(min)}" x2="${X(0)}" y2="${Y(max)}" stroke="${FIG_INK}"
            stroke-width="1" opacity="0.45"/>
      <path d="${path(ell)} Z" fill="${FIG_BLUE}" fill-opacity="0.08" stroke="${FIG_BLUE}"
            stroke-width="2"/>
      <path d="${path(hexPts)} Z" fill="none" stroke="${FIG_WARM}" stroke-width="1.6"
            stroke-dasharray="5 4"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(s.p1)}" y2="${Y(s.p2)}" stroke="${dot}"
            stroke-width="1.4" opacity="0.75"/>
      <circle cx="${X(s.p1)}" cy="${Y(s.p2)}" r="5.5" fill="${dot}"/>
      <text x="${X(max)}" y="${(+Y(0) + 16).toFixed(1)}" fill="${FIG_GREY}" text-anchor="end"
            font-style="italic">&#963;&#8321;</text>
      <text x="${(+X(0) + 6).toFixed(1)}" y="${(+Y(max) + 2).toFixed(1)}" fill="${FIG_GREY}"
            font-style="italic">&#963;&#8322;</text>
      <text x="${X(c + Math.SQRT2 * sy * 0.72)}" y="${Y(c + Math.SQRT2 * sy * 0.72)}"
            fill="${FIG_BLUE}" font-weight="600">von Mises</text>
      <text x="${(+X(c - sy) - 6).toFixed(1)}" y="${(+Y(c) + 14).toFixed(1)}" fill="${FIG_WARM}"
            text-anchor="end">Tresca</text>
      <text x="${X(s.p1)}" y="${(+Y(s.p2) - 11).toFixed(1)}" fill="${dot}" text-anchor="middle"
            font-weight="600">(${tick(s.p1)}, ${tick(s.p2)})</text>
      <text x="${(W / 2).toFixed(0)}" y="${H - 10}" fill="${FIG_GREY}" text-anchor="middle">
        cut at &#963;&#8323; = ${tick(s.p3)} ${u.stress}, with &#963;&#7522; = ${tick(sy)} ${u.stress}</text>
    </g></svg>`;
}

registerFormula({
  id: 'von-mises',
  slug: 'vonmises',
  topic: 'mechanics',
  name: 'Von Mises Stress',
  short: 'Von Mises Stress',
  desc: 'One equivalent stress from a full 3D stress state, and the margin left before yield',
  keywords: 'von mises stress calculator equivalent effective stress yield criterion distortion energy factor of safety principal stresses tensor sigma 11 22 33 12 13 23 tresca hexagon yield surface ductile multiaxial triaxial octahedral shear invariant',
  title: 'Von Mises Stress Calculator: Equivalent Stress and Factor of Safety',
  blurb: 'Enter the six components of a 3D stress state and get the equivalent von Mises stress, the principal stresses and the factor of safety against yield, with the yield surface drawn.',
  eq: 'σvm² = ½[(σ₁₁−σ₂₂)² + (σ₂₂−σ₃₃)² + (σ₃₃−σ₁₁)²] + 3(σ₁₂² + σ₂₃² + σ₁₃²)',
  inputNote: 'Enter tensile stress as positive and compressive stress as negative.',
  explain: 'Von Mises stress converts a multiaxial stress state into one equivalent stress. '
    + "For a ductile material, yielding is predicted when the equivalent stress reaches the material's yield strength.",
  about: [
    'A point in a loaded part is rarely pulled in one direction only. It is stretched one way, squeezed another and sheared at the same time, which is six numbers, and a material data sheet gives you one: the yield strength, measured by pulling a bar. Von Mises is how the six are reduced to something that can be compared with the one.',
    'What it measures is distortion — change of shape, not change of size. Squeeze something equally hard from every direction and it gets smaller without changing shape, and a ductile metal will take enormous pressure that way without yielding. That is why the yield surface is a cylinder rather than a closed shape: it runs on forever along the line of equal stress in every direction, and only distance away from that line counts.',
    'Tresca is drawn alongside because it answers the same question differently, using the largest shear stress rather than the distortion energy. Its hexagon sits inside the ellipse and touches it at six points, so Tresca never permits more than von Mises and sometimes permits about 15% less. Codes often prefer it for exactly that reason.',
    'This is a criterion for ductile materials that yield, not for brittle ones that crack, and it says nothing about fatigue, fracture, buckling or creep. The stresses are taken as given and elastic. There is no factor of safety built in beyond the one reported, and this follows no design code.',
  ],
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: MISES_UNITS.map(u => ({ value: u.value, label: u.label })) },
    { key: 's11', label: 'σ₁₁', unit: 'MPa', hint: 'e.g. 150' },
    { key: 's22', label: 'σ₂₂', unit: 'MPa', hint: 'e.g. 50' },
    { key: 's33', label: 'σ₃₃', unit: 'MPa', hint: 'e.g. 0' },
    { key: 's12', label: 'σ₁₂', unit: 'MPa', hint: 'blank = 0', optional: true },
    { key: 's13', label: 'σ₁₃', unit: 'MPa', hint: 'blank = 0', optional: true },
    { key: 's23', label: 'σ₂₃', unit: 'MPa', hint: 'blank = 0', optional: true },
    { key: 'sy', label: 'Yield strength of the material', unit: 'MPa', full: true,
      hint: '250 for mild steel' },
  ],
  output: { label: 'Equivalent (von Mises) stress', unit: v => misesUnits(v).stress },
  unitsFor: v => {
    const u = misesUnits(v).stress;
    return { s11: u, s22: u, s33: u, s12: u, s13: u, s23: u, sy: u };
  },

  onFieldChange: key => {
    if (key !== 'sys') return;
    const now = +document.getElementById('in_sys').value;
    if (now === misesSystem) return;
    const f = now === 1 ? PSI_PER_MPA : 1 / PSI_PER_MPA;
    ['s11', 's22', 's33', 's12', 's13', 's23', 'sy'].forEach(k => convertField(k, f));
    const s = FORMULAS.find(x => x.id === 'von-mises').sliders[0];
    s.span = now === 1 ? 30000 : 200;
    s.step = now === 1 ? 500 : 5;
    const at = parseFloat(document.getElementById('in_s11').value);
    if (isFinite(at)) recenterSlider(s, at);
    misesSystem = now;
  },

  compute: v => {
    if (!(v.sy > 0)) throw new Error('Yield strength has to be above zero.');
    const s = misesState(v);
    /* Zero von Mises is a real answer, not a missing one: equal stress in
       every direction distorts nothing. Only an empty form is an error. */
    if (['s11', 's22', 's33', 's12', 's13', 's23'].every(k => !v[k])) {
      throw new Error('Every component is zero, so there is no stress state to reduce.');
    }
    return s.vm;
  },
  format: n => num(+n.toFixed(n < 100 ? 3 : 2)),
  extras: v => {
    if (!(v.sy > 0)) return [];
    const s = misesState(v), u = misesUnits(v);
    const S = n => num(+n.toFixed(n === 0 ? 0 : 3)) + ' ' + u.stress;
    const rows = [
      s.vm > 0
        ? { label: 'Factor of safety against yield', value: (+s.fos.toFixed(3)) + '×',
            note: s.fos >= 1
              ? 'yield is predicted when this reaches 1.0'
              : 'below 1.0: this state is past yield' }
        /* Pressed equally from every side. There is no distortion to yield by,
           so no yield strength is ever reached. */
        : { label: 'Factor of safety against yield', value: 'never reaches yield',
            note: 'equal stress in every direction changes size, not shape, so this criterion is never met' },
      { label: 'Principal stresses σ₁, σ₂, σ₃', wide: true,
        value: `${S(s.p1)}, ${S(s.p2)}, ${S(s.p3)}`,
        note: 'the same stress state with the shear taken out, on its own axes' },
      { label: 'Tresca equivalent stress σ₁ − σ₃', detail: true, value: S(s.tresca),
        note: `factor of safety ${(v.sy / s.tresca).toFixed(3)}×, the more cautious of the two` },
      { label: 'Maximum shear stress (σ₁ − σ₃)/2', detail: true, value: S(s.tresca / 2) },
      { label: 'Mean (hydrostatic) stress', detail: true, value: S(s.mean),
        note: 'changes size, not shape, so it does not bring on yield' },
      { label: 'Distance from the axis of equal stress', detail: true, value: S(s.rho),
        note: `the yield surface sits at ${S(s.R)}` },
    ];
    return rows;
  },

  defaults: { sys: 0, s11: 150, s22: 50, s33: 0, s12: 40, sy: 250 },
  sliders: [
    { key: 's11', span: 200, step: 5 },
  ],
  series: v => {
    if (!(v.sy > 0)) return [];
    const s = misesState(v), u = misesUnits(v);
    return [
      { svg: misesFigureElement(v, u),
        title: 'The stress state you entered, on a stress element',
        caption: 'Blue is direct stress and orange is shear. An arrow pointing out of a face is '
          + 'tension, one pointing into it is compression. Shear comes in pairs because a '
          + 'component on one face is matched on the face beside it — which is why the tensor is '
          + 'symmetric, and why six numbers describe it rather than nine.' },
      { svg: misesFigure3D(s, u),
        title: 'The yield surface, and where this state sits in it',
        caption: 'A cylinder around the line of equal stress in every direction. Sliding along '
          + 'that line changes the size of a part, not its shape, so it never causes yield — only '
          + 'the distance out from it does. Yield begins where the state reaches the wall.' },
      { svg: misesFigure2D(s, u),
        title: 'The same surface, cut through σ₃',
        caption: 'Inside the ellipse the material is elastic; on it, yielding starts. Tresca’s '
          + 'hexagon is the same prediction made from the largest shear stress instead, and it '
          + 'sits inside, so it never allows more than von Mises does.' },
    ];
  },
});
