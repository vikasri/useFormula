/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
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
  eq: 'σθ(a) = (pᵢ(a² + b²) − 2pₒb²) / (b² − a²)',
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
    /* Both end conditions, because whether the ends are capped changes the
       third principal stress and so changes this — and not the way people
       expect: the open end is the worse of the two here. */
    const vmOpen = peakMises(a, b, r => { const s = at(r); return [s.hoop, 0, s.radial]; });
    const vmCap = peakMises(a, b, r => { const s = at(r); return [s.hoop, s.axial, s.radial]; });
    const rows = [
      { label: MISES_LABEL, wide: true, note: MISES_NOTE,
        value: `${S(vmOpen)} with open ends, ${S(vmCap)} capped` },
      { label: 'Radial stress at the internal surface', value: S(bore.radial) },
      { label: 'Hoop stress at the outer surface', value: S(out.hoop) },
      { label: 'Axial stress, open ends', value: S(0) },
      { label: 'Axial stress, capped ends', value: S(bore.axial) },
      /* A magnitude, so unsigned — and hoop against radial is the in-plane
         pair, which is the whole story only while axial sits between them. */
      { label: 'Maximum in-plane shear at the internal surface', detail: true,
        value: S(Math.abs(bore.hoop - bore.radial) / 2) },
      { label: 'Outer diameter', detail: true,
        value: num(+(v.di + 2 * v.t).toFixed(3)) + ' ' + u.length },
    ];
    /* Thin-wall is pd/2t for a cylinder — twice the sphere's, for the same
       reason a sphere is the stronger shape. What drives it is the pressure
       difference across the wall: equal pressure inside and out puts no hoop
       stress anywhere, whatever the two figures are. */
    const dp = v.p - (v.po || 0);
    const thin = dp * v.di / (2 * v.t);
    rows.push({ label: `Thin-wall estimate ${v.po > 0 ? '(pᵢ−pₒ)' : 'p'}d/2t, d the inner diameter`,
                wide: true, detail: true,
                /* Both are the same sign, so the comparison is of magnitudes:
                   under external pressure both go negative together. */
                value: `${S(thin)}, ${Math.abs((thin / hoop - 1) * 100).toFixed(1)}% `
                     + `${Math.abs(thin) < Math.abs(hoop) ? 'under' : 'over'} the figure above` });
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
      const outer = cylinderStresses(v.p, v.po, a, b, b).hoop;
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
