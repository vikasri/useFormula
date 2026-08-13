/* growing-annuity. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
  id: 'growing-annuity',
  topic: 'finance',
  name: 'Growing Annuity (Future Net Income)',
  short: 'Growing Annuity',
  desc: 'Recurring income growing at a constant rate, valued at a future point',
  keywords: 'growing annuity future net income stream growth rate recurring dividend pension retirement graduated',
  eq: 'FV = PMT · ((1+r)ⁿ − (1+g)ⁿ) / (r − g)',
  inputs: [
    { key: 'PMT', label: 'First payment / income', unit: '$', hint: 'e.g. 1000' },
    { key: 'rate', label: 'Return (discount) rate per period', unit: '%', hint: 'e.g. 6' },
    { key: 'growth', label: 'Income growth rate per period', unit: '%', hint: 'e.g. 3' },
    { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 20' },
  ],
  output: { label: 'Future value of income stream', unit: '' },
  compute: v => {
    const r = v.rate / 100, g = v.growth / 100, n = v.n;
    if (Math.abs(r - g) < 1e-9) return v.PMT * n * Math.pow(1 + r, n - 1);
    return v.PMT * (Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g);
  },
  format: money,
  defaults: { PMT: 1000, rate: 6, growth: 3, n: 20 },
  sliders: [
    { key: 'rate', span: 5, floor: 0, step: 0.1 },
    { key: 'growth', span: 5, floor: 0, step: 0.1 },
  ],
  series: v => {
    const r = v.rate / 100, g = v.growth / 100, n = Math.max(1, Math.round(v.n)), N = Math.min(n, 60), points = [];
    for (let i = 0; i <= N; i++) {
      const j = Math.round(i / N * n);
      const val = Math.abs(r - g) < 1e-9 ? v.PMT * j * Math.pow(1 + r, Math.max(0, j - 1))
        : v.PMT * (Math.pow(1 + r, j) - Math.pow(1 + g, j)) / (r - g);
      points.push({ x: j, y: val });
    }
    return { title: 'Accumulated value over time', xLabel: 'Periods', points, yTickFmt: kmoney };
  },
});
