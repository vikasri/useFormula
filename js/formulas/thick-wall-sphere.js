/* thick-wall-sphere. `num` comes from engine.js; Lamé helpers and the unit
   systems from js/shared/mechanics.js.

   Main form is a sphere under internal pressure. External pressure is the
   panel, since it is 0 for almost everything anyone builds. */
registerFormula({
  id: 'thick-wall-sphere',
  slug: 'sphere',
  topic: 'mechanics',
  name: 'Thick Wall Pressurized Sphere',
  short: 'Thick Wall Sphere',
  desc: 'Hoop and radial stress through the wall of a pressurised sphere',
  keywords: 'thick wall sphere pressure vessel spherical hoop stress radial lame tangential internal external pressurised pressurized shell bore von mises design storage tank',
  title: 'Thick Wall Sphere Calculator: Hoop and Radial Stress',
  blurb: 'Lamé stresses through the wall of a pressurised sphere: hoop, radial, shear and von Mises, plotted from the inside face to the outside. SI or English.',
  about: [
    'Pressure inside a sphere pulls the wall apart the same amount in every direction, so there is one hoop stress and it makes no difference where you cut. It peaks at the internal surface and eases towards the outside. Radial stress does the reverse: minus the pressure at the inside face, zero at the outer one.',
    'For the same diameter and wall, a sphere sees roughly half the hoop stress a cylinder does. Hence the domed ends on pressure vessels, and hence spherical storage tanks.',
    'Assumes an even wall of isotropic material, elastic throughout, with stress still in step with strain. Openings, nozzles and welds all lift the local stress above these numbers. It is not a code check: where a vessel has to be certified, the code sets the allowable stress and the factors.',
  ],
  diagram: '/img/thick-wall-sphere.svg',
  diagramAlt: 'Section through a thick wall sphere, showing inner radius a, outer radius b, internal and external pressure, and the hoop and radial stresses.',
  eq: 'σθ(a) = (pᵢ(2a³ + b³) − 3pₒb³) / (2(b³ − a³))',
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: [{ value: 0, label: 'SI (MPa, mm)' },
                { value: 1, label: 'English (psi, inches)' }] },
    { key: 'p', label: 'Internal pressure', unit: 'MPa', hint: 'e.g. 10' },
    { key: 'di', label: 'Inner diameter', unit: 'mm', hint: 'e.g. 200' },
    { key: 't', label: 'Wall thickness', unit: 'mm', hint: 'e.g. 20' },
    { key: 'po', label: 'External pressure', unit: 'MPa', hint: 'blank = none',
      optional: true, advanced: true },
  ],
  output: { label: 'Hoop stress at the internal surface', unit: v => vesselUnits(v).pressure },
  unitsFor: vesselUnitsFor,
  compute: v => {
    const a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) throw new Error('Inner diameter and wall thickness must both be above zero.');
    return sphereStresses(v.p, v.po || 0, a, b, a).hoop;
  },
  format: n => num(+n.toFixed(3)),
  extras: (v, hoop) => {
    const u = vesselUnits(v), a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) return [];
    const at = r => sphereStresses(v.p, v.po || 0, a, b, r);
    const bore = at(a), out = at(b);
    const S = n => num(+n.toFixed(3)) + ' ' + u.pressure;
    const rows = [
      { label: 'Radial stress at the internal surface', value: S(bore.radial) },
      { label: 'Outer diameter', value: num(+(v.di + 2 * v.t).toFixed(3)) + ' ' + u.length },
      { label: 'Hoop stress at the outer surface', detail: true, value: S(out.hoop) },
      /* A magnitude, so unsigned. Hoop acts equally in two directions, so
         this pair is the largest of the three and there is no in-plane
         qualifier to make. */
      { label: 'Maximum shear at the internal surface', detail: true,
        value: S(Math.abs(bore.hoop - bore.radial) / 2) },
      /* Hoop acts in both surface directions, so two of the three principals
         are equal and von Mises collapses to the hoop-radial difference. */
      { label: 'Von Mises at the internal surface', detail: true,
        value: S(vonMises(bore.hoop, bore.hoop, bore.radial)) },
    ];
    /* Thin-wall is pd/4t for a sphere. How far it is out is the answer to
       "did I need the thick-wall equations at all". What drives it is the
       pressure difference across the wall, not the figure inside on its own. */
    const dp = v.p - (v.po || 0);
    const thin = dp * v.di / (4 * v.t);
    rows.push({ label: `Thin-wall estimate ${v.po > 0 ? '(pᵢ−pₒ)' : 'p'}d/4t, d the inner diameter`,
                wide: true, detail: true,
                value: `${S(thin)}, ${Math.abs((thin / hoop - 1) * 100).toFixed(1)}% `
                     + `${Math.abs(thin) < Math.abs(hoop) ? 'under' : 'over'} the figure above` });
    rows.push({ label: 'Wall ratio b/a', detail: true, value: (b / a).toFixed(3) });
    return rows;
  },

  /* Kept out of the main form: outside pressure is zero for nearly every
     vessel, and a field asking for it invites a number that should be 0. */
  advanced: {
    summary: 'What if there is pressure outside too?',
    intro: 'Usually there is nothing but air outside, so leave this blank. For a vessel sitting under water, or inside a larger pressure, put that figure in and both curves move.',
    note: (v, hoop) => {
      if (!(v.po > 0)) return '';
      const a = v.di / 2, b = a + v.t;
      const alone = sphereStresses(v.p, 0, a, b, a).hoop;
      const u = vesselUnits(v);
      const outer = sphereStresses(v.p, v.po, a, b, b).hoop;
      /* Nearly always the internal surface is the worse of the two, but with
         pressure outside it need not be, and the headline names a surface
         rather than claiming to be the larger. */
      const swap = Math.abs(outer) > Math.abs(hoop)
        ? ` Here the outer surface carries more than the inner: ${num(+outer.toFixed(3))} ${u.pressure} against ${num(+hoop.toFixed(3))}.`
        : '';
      return `${num(+v.po.toFixed(3))} ${u.pressure} outside brings the hoop stress at the internal surface to `
        + `${num(+hoop.toFixed(3))} ${u.pressure}, from ${num(+alone.toFixed(3))} with nothing outside.` + swap;
    },
  },
  defaults: { sys: 0, p: 10, di: 200, t: 20 },
  sliders: [
    { key: 'p', span: 20, floor: 0, step: 0.5 },
    { key: 't', span: 30, floor: 0.5, step: 0.5 },
  ],
  series: v => {
    const a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) return { points: [] };
    const N = 40, hoop = [], radial = [];
    for (let i = 0; i <= N; i++) {
      const r = a + (b - a) * i / N;
      const s = sphereStresses(v.p, v.po || 0, a, b, r);
      hoop.push({ x: r, y: s.hoop });
      radial.push({ x: r, y: s.radial });
    }
    /* Both plotted against radius, so the internal surface is at the left and
       the outer surface at the right — the wall read left to right. */
    return {
      title: 'Stress through the wall, inside to outside',
      xLabel: 'Radius (' + vesselUnits(v).length + ')',
      yLabel: 'Stress (' + vesselUnits(v).pressure + ')',
      points: hoop, label: 'Hoop',
      extra: [{ points: radial, label: 'Radial', cls: 'red' }],
      yTickFmt: n => num(+n.toFixed(1)),
      xTickFmt: n => +n.toFixed(1),
    };
  },
});
