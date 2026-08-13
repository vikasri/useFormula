/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* spinning-disk. `num` comes from engine.js; the stress equations, the unit
   systems and the Poisson default from js/shared/mechanics.js.

   Speed, size and material in the main form. Poisson's ratio is in the panel:
   it is 0.3 for practically every metal and moves the answer by a percent or
   two, so it is not worth a field of its own on the way in. */

/* What the numbers on screen currently mean. Switching the selector rewrites
   them, so the page has to remember which system it just came from. */
let diskSystem = 0;

registerFormula({
  id: 'spinning-disk',
  slug: 'spinningdisk',
  topic: 'mechanics',
  name: 'Hollow Spinning Disk',
  short: 'Spinning Disk',
  desc: 'Stress raised in a rotating disk by its own mass',
  keywords: 'spinning disk rotating hollow annular stress hoop tangential radial centrifugal flywheel rotor turbine bore burst speed rpm angular velocity poisson plane stress',
  title: 'Spinning Disk Calculator: Stress in a Rotating Hollow Disk',
  blurb: 'Hoop and radial stress in a hollow disk spinning at speed, with the bore figure that governs and the rim speed alongside it. SI or English.',
  diagram: '/img/spinning-disk.svg',
  diagramAlt: 'A hollow disk of uniform thickness spinning about its centre, with internal radius a, outer radius b, and the hoop and radial stresses in the material.',
  about: [
    'Nothing is pushing on a spinning disk. The stress comes from its own mass: every part of it is trying to carry on in a straight line, and the material inboard has to hold it in. That pull is worst at the internal surface, where the least material is doing the most holding.',
    'Cutting a hole in the middle roughly doubles the peak stress, however small the hole. A solid disk carries its highest stress at the dead centre; put a hole there and what remains at its edge takes twice the load. Additional Information compares the two.',
    'Switching the unit system here converts the numbers, since ρω²r² carries dimensions and the arithmetic genuinely changes. Rev/min means the same thing either way, so only the diameters and the density move.',
    'Uniform thickness, free at both faces, thin enough to treat as plane stress, and elastic throughout — once any of it yields the stress redistributes and these numbers no longer hold. Blades, a shrunk-on rim, a keyway or a press fit all change it, and none of that is here. Nor is any allowance for temperature, creep or the margin a real rotor is designed to.',
  ],
  eq: 'σθ,max = ((3+ν)/4) · ρω² · (b² + a²(1−ν)/(3+ν))',
  inputs: [
    { key: 'sys', label: 'Units', full: true,
      options: [{ value: 0, label: 'SI (MPa, mm, kg/m³)' },
                { value: 1, label: 'English (psi, in, lb/in³)' }] },
    { key: 'rpm', label: 'Rotational speed', unit: 'rpm', hint: 'e.g. 10000' },
    { key: 'do', label: 'Outer diameter', unit: 'mm', hint: 'e.g. 500' },
    { key: 'di', label: 'Internal diameter', unit: 'mm', hint: 'e.g. 100' },
    { key: 'rho', label: 'Density', unit: 'kg/m³', hint: '7850 for steel' },
    { key: 'nu', label: "Poisson's ratio", unit: '', hint: 'blank = 0.3',
      optional: true, advanced: true },
  ],
  output: { label: 'Hoop stress at the internal surface', unit: v => diskUnits(v).stress },
  unitsFor: diskUnitsFor,

  /* Carry the figures across when the system changes. Without this, 7850 kg/m³
     would quietly become 7850 lb/in³, which is denser than any solid. */
  onFieldChange: key => {
    if (key !== 'sys') return;
    const now = +document.getElementById('in_sys').value;
    if (now === diskSystem) return;
    const toEnglish = now === 1;
    convertField('do', toEnglish ? 1 / MM_PER_IN : MM_PER_IN);
    convertField('di', toEnglish ? 1 / MM_PER_IN : MM_PER_IN);
    convertField('rho', toEnglish ? 1 / KGM3_PER_LBIN3 : KGM3_PER_LBIN3);
    diskSystem = now;
  },

  compute: v => {
    const a = v.di / 2, b = v.do / 2;
    if (!(a > 0) || !(b > a)) throw new Error('The outer diameter has to be larger than the internal one, and both above zero.');
    return diskStresses(v.rho, rpmToRad(v.rpm), diskPoisson(v), a, b, a, diskUnits(v).scale).hoop;
  },
  format: n => num(+n.toFixed(2)),
  extras: (v, hoop) => {
    const u = diskUnits(v), a = v.di / 2, b = v.do / 2;
    const nu = diskPoisson(v), w = rpmToRad(v.rpm);
    if (!(a > 0) || !(b > a)) return [];
    const at = r => diskStresses(v.rho, w, nu, a, b, r, u.scale);
    const S = n => num(+n.toFixed(2)) + ' ' + u.stress;
    /* Plane stress: nothing acts through the thickness, so the third
       principal is zero. */
    const vmMax = peakMises(a, b, r => { const s = at(r); return [s.hoop, s.radial, 0]; });
    const rows = [
      { label: MISES_LABEL, wide: true, value: `${S(vmMax)} — ${MISES_NOTE}` },
      { label: 'Hoop stress at the rim', value: S(at(b).hoop) },
      /* Radial stress is zero at both faces and peaks between them. */
      { label: 'Peak radial stress', value: S(at(Math.sqrt(a * b)).radial) },
      { label: 'Peak radial stress sits at a radius of', detail: true,
        value: num(+Math.sqrt(a * b).toFixed(2)) + ' ' + u.length },
      { label: 'Rim speed', detail: true,
        value: num(+(w * b / u.perSpeed).toFixed(1)) + ' ' + u.speed },
    ];
    /* The point of the second paragraph, in a number. */
    const solid = (3 + nu) * v.rho * w * w * b * b / 8 * u.scale;
    if (solid > 0) {
      rows.push({ label: 'Solid disk of the same size, at its centre', wide: true, detail: true,
                  value: `${S(solid)}, so the hole costs you ${(hoop / solid).toFixed(2)}×` });
    }
    return rows;
  },

  advanced: {
    summary: "What if Poisson's ratio is not 0.3?",
    intro: 'Near enough every metal sits at 0.3, so leave this alone unless you have a figure for the material in hand. Rubber approaches 0.5 and cork is close to 0.',
    note: (v, hoop) => {
      if (!(v.nu > 0)) return '';
      const a = v.di / 2, b = v.do / 2, u = diskUnits(v);
      if (!(a > 0) || !(b > a)) return '';
      const at3 = diskStresses(v.rho, rpmToRad(v.rpm), 0.3, a, b, a, u.scale).hoop;
      return `At ν = ${+v.nu} the internal surface sees ${num(+hoop.toFixed(2))} ${u.stress}, `
        + `against ${num(+at3.toFixed(2))} at the usual 0.3.`;
    },
  },
  defaults: { sys: 0, rpm: 10000, do: 500, di: 100, rho: 7850 },
  /* Speed only. It is the same number in both systems, so switching units
     cannot leave a slider holding a range in the wrong one. */
  sliders: [
    { key: 'rpm', span: 8000, floor: 0, step: 100 },
  ],
  series: v => {
    const u = diskUnits(v), a = v.di / 2, b = v.do / 2;
    const nu = diskPoisson(v), w = rpmToRad(v.rpm);
    if (!(a > 0) || !(b > a)) return { points: [] };
    const N = 40, hoop = [], radial = [];
    for (let i = 0; i <= N; i++) {
      const r = a + (b - a) * i / N;
      const s = diskStresses(v.rho, w, nu, a, b, r, u.scale);
      hoop.push({ x: r, y: s.hoop });
      radial.push({ x: r, y: s.radial });
    }
    return {
      title: 'Stress across the disk, inside to rim',
      xLabel: 'Radius (' + u.length + ')',
      yLabel: 'Stress (' + u.stress + ')',
      points: hoop, label: 'Hoop',
      extra: [{ points: radial, label: 'Radial', cls: 'red' }],
      yTickFmt: n => num(+n.toFixed(0)),
      xTickFmt: n => +n.toFixed(1),
    };
  },
});
