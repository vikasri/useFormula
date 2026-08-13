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
  blurb: 'Lamé stresses in a pressurised tube: hoop, radial and axial for open or capped ends, with shear and von Mises at the internal surface. SI or English.',
  about: [
    'Pressure inside a tube tries to split it around the circumference, and that hoop stress is usually what governs. It is highest at the internal surface and drops towards the outside. Radial stress runs the opposite way, equal to minus the internal pressure at the inside face and zero at the outer one.',
    'Cap the ends and the pressure pushes along the axis as well, adding a stress that is even through the wall and about half the hoop figure. Leave them open, as on a gun barrel or a roller, and there is none. Both are listed because the difference does not go the way people expect: take the axial stress away and the von Mises figure rises.',
    'These hold well away from the ends, in a plain tube of even wall, and only while the material is elastic: past yield the wall starts redistributing stress and these figures read high. Threads, ports, welds and supports concentrate stress locally. Nothing here is a code calculation.',
  ],
  diagram: '/img/thick-wall-cylinder.svg',
  diagramAlt: 'Section across a thick wall cylinder, showing inner radius a, outer radius b, internal and external pressure, and the hoop, radial and axial stresses.',
  eq: 'σθ,max = (pᵢ(a² + b²) − 2pₒb²) / (b² − a²)',
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
    return cylinderStresses(v.p, v.po || 0, a, b, a).hoop;
  },
  format: n => num(+n.toFixed(3)),
  extras: (v, hoop) => {
    const u = vesselUnits(v), a = v.di / 2, b = a + v.t;
    if (!(a > 0) || !(v.t > 0)) return [];
    const at = r => cylinderStresses(v.p, v.po || 0, a, b, r);
    const bore = at(a), out = at(b);
    const S = n => num(+n.toFixed(3)) + ' ' + u.pressure;
    /* Both end conditions, side by side. Whether the ends are capped is a fact
       about the part, not about the pressure, and it changes the third
       principal stress — so it changes von Mises, and by more than people
       expect: an open end is the worse of the two here. */
    const rows = [
      { label: 'Radial stress at the internal surface', value: S(bore.radial) },
      { label: 'Hoop stress at the outer surface', value: S(out.hoop) },
      { label: 'Axial stress, open ends', value: S(0) },
      { label: 'Axial stress, capped ends', value: S(bore.axial) },
      { label: 'Maximum shear at the internal surface', detail: true, value: S((bore.hoop - bore.radial) / 2) },
      { label: 'Outer diameter', detail: true,
        value: num(+(v.di + 2 * v.t).toFixed(3)) + ' ' + u.length },
      { label: 'Von Mises at the internal surface, open ends then capped', wide: true, detail: true,
        value: `${S(vonMises(bore.hoop, 0, bore.radial))}, `
             + `then ${S(vonMises(bore.hoop, bore.axial, bore.radial))}` },
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
    intro: 'Leave this blank for a tube in open air. Down a borehole, under water, or inside a jacket there is pressure on the outside as well: put it in and both curves move.',
    note: (v, hoop) => {
      if (!(v.po > 0)) return '';
      const a = v.di / 2, b = a + v.t;
      const alone = cylinderStresses(v.p, 0, a, b, a).hoop;
      const u = vesselUnits(v);
      return `${num(+v.po.toFixed(3))} ${u.pressure} outside brings the hoop stress at the internal surface to `
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
