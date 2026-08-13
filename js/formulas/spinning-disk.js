/* spinning-disk. `num` comes from engine.js; the stress equations and the
   Poisson default from js/shared/mechanics.js.

   Speed, size and material in the main form. Poisson's ratio is in the panel:
   it is 0.3 for practically every metal and moves the answer by a few per
   cent, so it is not worth a field of its own on the way in. */
registerFormula({
  id: 'spinning-disk',
  slug: 'spinningdisk',
  topic: 'mechanics',
  name: 'Hollow Spinning Disk',
  short: 'Spinning Disk',
  desc: 'Stress raised in a rotating disk by its own mass',
  keywords: 'spinning disk rotating hollow annular stress hoop tangential radial centrifugal flywheel rotor turbine bore burst speed rpm angular velocity poisson plane stress',
  title: 'Spinning Disk Calculator: Stress in a Rotating Hollow Disk',
  blurb: 'Hoop and radial stress in a hollow disk spinning at speed, with the bore figure that governs and the tip speed alongside it.',
  diagram: '/img/spinning-disk.svg',
  diagramAlt: 'A hollow disk of uniform thickness spinning about its centre, with bore radius a, outer radius b, and the hoop and radial stresses in the material.',
  about: [
    'Nothing is pushing on a spinning disk. The stress comes from its own mass: every part of it is trying to carry on in a straight line, and the material inboard has to hold it in. That pull is worst at the bore, where the least material is doing the most holding.',
    'Cutting a hole in the middle roughly doubles the peak stress, however small the hole. A solid disk carries its highest stress at the dead centre; put a bore in and the material that used to sit there is gone, so what remains at the edge of the hole takes twice the load. The figure under Additional Information compares the two.',
    'Uniform thickness, free at both faces, thin enough to treat as plane stress. Blades, a shrunk-on rim, a keyway or a press fit all change it, and none of that is here. Nor is any allowance for temperature, creep or the margin a real rotor is designed to.',
  ],
  eq: 'σθ,max = ((3+ν)/4) · ρω² · (b² + a²(1−ν)/(3+ν))',
  inputs: [
    { key: 'rpm', label: 'Rotational speed', unit: 'rpm', hint: 'e.g. 10000' },
    { key: 'do', label: 'Outer diameter', unit: 'mm', hint: 'e.g. 500' },
    { key: 'di', label: 'Bore diameter', unit: 'mm', hint: 'e.g. 100' },
    { key: 'rho', label: 'Density', unit: 'kg/m³', hint: '7850 for steel' },
    { key: 'nu', label: "Poisson's ratio", unit: '', hint: 'blank = 0.3',
      optional: true, advanced: true },
  ],
  output: { label: 'Hoop stress at the bore', unit: 'MPa' },
  compute: v => {
    const a = v.di / 2, b = v.do / 2;
    if (!(a > 0) || !(b > a)) throw new Error('The outer diameter has to be larger than the bore, and both above zero.');
    return diskStresses(v.rho, rpmToRad(v.rpm), diskPoisson(v), a, b, a).hoop;
  },
  format: n => num(+n.toFixed(2)),
  extras: (v, hoop) => {
    const a = v.di / 2, b = v.do / 2, nu = diskPoisson(v), w = rpmToRad(v.rpm);
    if (!(a > 0) || !(b > a)) return [];
    const at = r => diskStresses(v.rho, w, nu, a, b, r);
    const S = n => num(+n.toFixed(2)) + ' MPa';
    const rows = [
      { label: 'Hoop stress at the rim', value: S(at(b).hoop) },
      /* Radial stress is zero at both faces and peaks between them. */
      { label: 'Peak radial stress', value: S(at(Math.sqrt(a * b)).radial) },
      { label: 'Peak radial stress sits at a radius of', detail: true,
        value: num(+Math.sqrt(a * b).toFixed(1)) + ' mm' },
      { label: 'Rim speed', detail: true, value: num(+(w * b / 1000).toFixed(1)) + ' m/s' },
    ];
    /* The point of the second paragraph, in a number: the bore roughly
       doubles what a solid disk of the same size would see. */
    const solid = (3 + nu) * v.rho * w * w * b * b / 8 / 1e12;
    if (solid > 0) {
      rows.push({ label: 'Solid disk of the same size, at its centre', wide: true, detail: true,
                  value: `${S(solid)}, so the bore costs you ${(hoop / solid).toFixed(2)}×` });
    }
    return rows;
  },

  advanced: {
    summary: "What if Poisson's ratio is not 0.3?",
    intro: 'Near enough every metal sits at 0.3, so leave this alone unless you have a figure for the material in hand. Rubber approaches 0.5 and cork is close to 0.',
    note: (v, hoop) => {
      if (!(v.nu > 0)) return '';
      const a = v.di / 2, b = v.do / 2;
      if (!(a > 0) || !(b > a)) return '';
      const at3 = diskStresses(v.rho, rpmToRad(v.rpm), 0.3, a, b, a).hoop;
      return `At ν = ${+v.nu} the bore sees ${num(+hoop.toFixed(2))} MPa, against `
        + `${num(+at3.toFixed(2))} at the usual 0.3.`;
    },
  },
  defaults: { rpm: 10000, do: 500, di: 100, rho: 7850 },
  sliders: [
    { key: 'rpm', span: 8000, floor: 0, step: 100 },
    { key: 'di', span: 150, floor: 1, step: 1 },
  ],
  series: v => {
    const a = v.di / 2, b = v.do / 2, nu = diskPoisson(v), w = rpmToRad(v.rpm);
    if (!(a > 0) || !(b > a)) return { points: [] };
    const N = 40, hoop = [], radial = [];
    for (let i = 0; i <= N; i++) {
      const r = a + (b - a) * i / N;
      const s = diskStresses(v.rho, w, nu, a, b, r);
      hoop.push({ x: r, y: s.hoop });
      radial.push({ x: r, y: s.radial });
    }
    return {
      title: 'Stress across the disk, bore to rim',
      xLabel: 'Radius (mm)',
      points: hoop, label: 'Hoop',
      extra: [{ points: radial, label: 'Radial', cls: 'red' }],
      yTickFmt: n => num(+n.toFixed(0)),
      xTickFmt: n => +n.toFixed(0),
    };
  },
});
