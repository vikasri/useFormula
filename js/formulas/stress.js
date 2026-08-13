/* stress. `num` comes from engine.js. */
registerFormula({
  id: 'stress',
  topic: 'mechanics',
  name: 'Stress Calculator',
  short: 'Stress',
  desc: 'Force spread over the area carrying it',
  keywords: 'stress force area pressure pascal megapascal MPa tensile compressive axial normal load cross section strength material sigma',
  title: 'Stress Calculator: Force Over Area, in MPa',
  blurb: 'The stress a load puts on a section: force divided by the area carrying it, in MPa, with the area needed to bring it down.',
  about: [
    'Stress is the load shared out over the area carrying it. The same force through a smaller section is a higher stress, which is why a thin wire snaps under a weight a thick bar shrugs off — the force has not changed, only the area it is spread across.',
    'Newtons over square millimetres come out directly in megapascals: 1 N/mm² is 1 MPa exactly, so no conversion is needed between the two. For a round bar the area is π·d²/4, which is 78.5 mm² for a 10 mm bar, not 100.',
    'This is the average stress over the section, and it assumes the load is axial and spread evenly across it. Real parts are not so obliging: a hole, a notch, a sharp internal corner or an off-centre load concentrates stress well above the average, often by a factor of two or three, and that is where things actually break.',
    'It says nothing about whether the part is safe. That is a comparison against the material — its yield strength, its fatigue limit under repeated loading, and whatever safety factor the job calls for. Mild steel yields somewhere near 250 MPa and many aluminium alloys well below that, but the figure for the material actually in front of you is the one that counts.',
  ],
  eq: 'σ = F / A',
  inputs: [
    { key: 'F', label: 'Force', unit: 'N', hint: 'e.g. 5000' },
    { key: 'A', label: 'Cross-sectional area', unit: 'mm²', hint: 'e.g. 100' },
  ],
  output: { label: 'Stress', unit: 'MPa' },
  compute: v => v.F / v.A,
  format: num,
  defaults: { F: 5000, A: 100 },
  sliders: [
    { key: 'A', span: 150, floor: 1, step: 1 },
    { key: 'F', span: 8000, floor: 0, step: 100 },
  ],
  extras: (v, s) => {
    const rows = [{ label: 'In pascals', value: num(s * 1e6) + ' Pa' }];
    if (!(s > 0) || !(v.A > 0)) return rows;
    /* Round bar of the same area, since diameter is what gets measured. */
    rows.push({ label: 'Same area as a round bar of', value: Math.sqrt(4 * v.A / Math.PI).toFixed(1) + ' mm' });
    rows.push({ label: 'To halve the stress, the area must be', detail: true,
                value: num(v.A * 2) + ' mm²' });
    /* A yardstick, not a verdict — the material in hand is what settles it. */
    rows.push({ label: 'Against mild steel yielding near 250 MPa, this is', wide: true, detail: true,
                value: (s / 250 * 100).toFixed(1) + '% of the way there' });
    return rows;
  },
  series: v => {
    if (!(v.F > 0) || !(v.A > 0)) return { points: [] };
    /* Stress against area is a hyperbola: the first millimetres of extra
       section buy far more than the last, which the single figure hides. */
    const lo = Math.max(1, v.A * 0.25), hi = v.A * 2.5, N = 40, points = [];
    for (let i = 0; i <= N; i++) {
      const a = lo + (hi - lo) * i / N;
      points.push({ x: a, y: v.F / a });
    }
    return {
      title: 'How the stress falls as the section grows',
      xLabel: 'Area (mm²)',
      points, label: 'Stress (MPa)',
      yTickFmt: n => num(Math.round(n)),
      xTickFmt: n => Math.round(n),
    };
  },
});
