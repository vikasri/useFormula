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
  blurb: 'Stress through the wall of a thick wall pressurised sphere, from the Lamé equations. Hoop, radial, shear and von Mises, in SI or English units.',
  about: [
    'A sphere under pressure is stretched around every direction at once, so the hoop stress is the same whichever way you cut it. It is largest at the bore and falls towards the outside, while the radial stress runs the other way: equal to minus the internal pressure at the bore, and zero at the outer surface if nothing presses on it.',
    'A sphere carries roughly half the hoop stress of a cylinder of the same diameter and wall, which is why pressure vessels are domed at the ends and why a spherical tank holds more for the same steel.',
    'Elastic, isotropic material and a wall of even thickness are assumed. Nozzles, welds, supports and openings concentrate stress well above these figures, and none of this is a code calculation — for a vessel that has to be certified, the governing code sets the allowable stress and the safety factors.',
  ],
  eq: 'σθ,max = (pᵢ(2a³ + b³) − 3pₒb³) / (2(b³ − a³))',
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
      { label: 'Radial stress at the bore', value: S(bore.radial) },
      { label: 'Outer diameter', value: num(+(v.di + 2 * v.t).toFixed(3)) + ' ' + u.length },
      { label: 'Hoop stress at the outer wall', detail: true, value: S(out.hoop) },
      { label: 'Maximum shear at the bore', detail: true, value: S((bore.hoop - bore.radial) / 2) },
      /* Hoop acts in both surface directions, so two of the three principals
         are equal and von Mises collapses to the hoop-radial difference. */
      { label: 'Von Mises at the bore', detail: true,
        value: S(vonMises(bore.hoop, bore.hoop, bore.radial)) },
    ];
    /* Thin-wall is pd/4t for a sphere. How far it is out is the answer to
       "did I need the thick-wall equations at all". */
    const thin = v.p * v.di / (4 * v.t);
    rows.push({ label: 'Thin-wall estimate pd/4t, against the figure above',
                wide: true, detail: true,
                value: `${S(thin)}, ${Math.abs((thin / hoop - 1) * 100).toFixed(1)}% `
                     + `${thin < hoop ? 'under' : 'over'}` });
    rows.push({ label: 'Wall ratio b/a', detail: true, value: (b / a).toFixed(3) });
    return rows;
  },

  /* Kept out of the main form: outside pressure is zero for nearly every
     vessel, and a field asking for it invites a number that should be 0. */
  advanced: {
    summary: 'What if there is pressure outside too?',
    intro: 'Blank means atmospheric outside, which is the usual case. Enter a figure for a vessel under water or inside another pressure, and both curves shift with it.',
    note: (v, hoop) => {
      if (!(v.po > 0)) return '';
      const a = v.di / 2, b = a + v.t;
      const alone = sphereStresses(v.p, 0, a, b, a).hoop;
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
      const s = sphereStresses(v.p, v.po || 0, a, b, r);
      hoop.push({ x: r, y: s.hoop });
      radial.push({ x: r, y: s.radial });
    }
    /* Both plotted against radius, so the bore is at the left and the outer
       surface at the right — the wall read left to right. */
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
