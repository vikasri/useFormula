/* fv-annuity. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
  id: 'fv-annuity',
  topic: 'finance',
  name: 'Future Value of an Annuity',
  short: 'Value of Annuity',
  desc: 'Value of equal recurring deposits',
  keywords: 'future value annuity sip regular deposits savings recurring ordinary retirement contributions',
  eq: 'FV = PMT · ((1+r)ⁿ − 1) / r',
  inputs: [
    { key: 'PMT', label: 'Payment per period', unit: '$', hint: 'e.g. 500' },
    { key: 'rate', label: 'Return rate per period', unit: '%', hint: 'e.g. 5' },
    { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 120' },
  ],
  output: { label: 'Future value', unit: '' },
  compute: v => {
    const r = v.rate / 100;
    if (r === 0) return v.PMT * v.n;
    return v.PMT * (Math.pow(1 + r, v.n) - 1) / r;
  },
  format: money,
  defaults: { PMT: 500, rate: 5, n: 120 },
  sliders: [
    { key: 'rate', span: 5, floor: 0, step: 0.1 },
    { key: 'n', span: 60, floor: 1, step: 12 },
  ],
  series: v => {
    const r = v.rate / 100, n = Math.max(1, Math.round(v.n)), N = Math.min(n, 60), points = [];
    for (let i = 0; i <= N; i++) {
      const j = Math.round(i / N * n);
      const val = r === 0 ? v.PMT * j : v.PMT * (Math.pow(1 + r, j) - 1) / r;
      points.push({ x: j, y: val });
    }
    return { title: 'Accumulated value over time', xLabel: 'Periods', points, yTickFmt: kmoney };
  },
});
