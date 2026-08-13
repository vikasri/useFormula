/* thick-wall-cylinder. `num` comes from engine.js; Lamé helpers and the unit
   systems from js/shared/mechanics.js.

   Same shape as the sphere: internal pressure in the main form, outside
   pressure in the panel. */
registerFormula({
  id: 'thick-wall-cylinder',
  slug: 'cylinder',
  topic: 'mechanics',
  name: 'Thick Wall Cylinder',
  short: 'Thick Wall Cylinder',
  desc: 'Hoop, radial and axial stress through the wall of a pressurised cylinder',
  keywords: 'thick wall cylinder pressure vessel pipe tube hoop stress circumferential radial axial longitudinal lame internal external pressurised pressurized bore von mises gun barrel hydraulic',
  title: 'Thick Wall Cylinder Calculator: Hoop, Radial, Axial Stress',
  blurb: 'Stress through the wall of a thick wall pressurised cylinder, from the Lamé equations. Hoop, radial, axial, shear and von Mises, in SI or English units.',
  about: [
    'Pressure inside a cylinder stretches it around the circumference, and that hoop stress is the one that governs. It is largest at the bore and falls towards the outside, while the radial stress runs the other way: minus the internal pressure at the bore, and zero at the outer surface if nothing presses on it.',
    'A closed end adds an axial stress along the tube, uniform through the wall and about half the bore hoop stress. An open-ended cylinder — a gun barrel, a roller — carries none, so ignore that row if the ends are not capped.',
    'Elastic, isotropic material and an even wall are assumed, well away from the ends. Nozzles, welds, threads and supports concentrate stress above these figures, and none of this is a code calculation — for a vessel that must be certified, the governing code sets the allowable stress and the safety factors.',
  ],
  eq: 'σθ,max = (pᵢ(a² + b²) − 2pₒb²) / (b² − a²)',
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: [{ value: 0, label: 'SI — MPa and mm' },
                { value: 1, label: 'English — psi and inches' }] },
    { key: 'p', label: 'Internal pressure', unit: 'MPa', hint: 'e.g. 10' },
    { key: 'di', label: 'Inner diameter', unit: 'mm', hint: 'e.g. 200' },
    { key: 't', label: 'Wall thickness', unit: 'mm', hint: 'e.g. 20' },
    { key: 'po', label: 'External pressure', unit: 'MPa', hint: 'blank = none',
      optional: true, advanced: true },
  ],
  output: { label: 'Hoop stress at the bore', unit: v => vesselUnits(v).pressure },
  unitsFor: vesselUnitsFor,
  compute: v => {
    const a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) throw new Error('Inner diameter and wall thickness must both be above zero.');
    return cylinderStresses(v.p, v.po || 0, a, b, a).hoop;
  },
  format: n => num(+n.toFixed(3)),
  extras: (v, hoop) => {
    const u = vesselUnits(v), a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) return [];
    const at = r => cylinderStresses(v.p, v.po || 0, a, b, r);
    const bore = at(a), out = at(b);
    const S = n => num(+n.toFixed(3)) + ' ' + u.pressure;
    const rows = [
      { label: 'Radial stress at the bore', value: S(bore.radial) },
      { label: 'Axial stress, closed ends', value: S(bore.axial) },
      { label: 'Hoop stress at the outer wall', detail: true, value: S(out.hoop) },
      { label: 'Maximum shear at the bore', detail: true, value: S((bore.hoop - bore.radial) / 2) },
      { label: 'Von Mises at the bore', detail: true,
        value: S(vonMises(bore.hoop, bore.axial, bore.radial)) },
      { label: 'Outer diameter', detail: true,
        value: num(+(v.di + 2 * v.t).toFixed(3)) + ' ' + u.length },
    ];
    /* Thin-wall is pd/2t for a cylinder — twice the sphere's, for the same
       reason a sphere is the stronger shape. */
    const thin = v.p * v.di / (2 * v.t);
    rows.push({ label: 'Thin-wall estimate pd/2t, against the figure above',
                wide: true, detail: true,
                value: `${S(thin)}, ${Math.abs((thin / hoop - 1) * 100).toFixed(1)}% `
                     + `${thin < hoop ? 'under' : 'over'}` });
    rows.push({ label: 'Wall ratio b/a', detail: true, value: (b / a).toFixed(3) });
    return rows;
  },

  advanced: {
    summary: 'What if there is pressure outside too?',
    intro: 'Blank means atmospheric outside, which is the usual case. Enter a figure for a tube under water, in a borehole, or inside another pressure, and both curves shift with it.',
    note: (v, hoop) => {
      if (!(v.po > 0)) return '';
      const a = v.di / 2, b = a + v.t;
      const alone = cylinderStresses(v.p, 0, a, b, a).hoop;
      const u = vesselUnits(v);
      return `${num(+v.po.toFixed(3))} ${u.pressure} outside brings the bore hoop stress to `
        + `${num(+hoop.toFixed(3))} ${u.pressure}, from ${num(+alone.toFixed(3))} with nothing outside.`;
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
      const s = cylinderStresses(v.p, v.po || 0, a, b, r);
      hoop.push({ x: r, y: s.hoop });
      radial.push({ x: r, y: s.radial });
    }
    return {
      title: 'Stress through the wall, bore to outer surface',
      xLabel: 'Radius (' + vesselUnits(v).length + ')',
      points: hoop, label: 'Hoop',
      extra: [{ points: radial, label: 'Radial', cls: 'red' }],
      yTickFmt: n => num(+n.toFixed(1)),
      xTickFmt: n => +n.toFixed(1),
    };
  },
});
