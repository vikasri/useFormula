/* compound-interest. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
  id: 'compound-interest',
  topic: 'finance',
  name: 'Compound Interest (Future Value)',
  short: 'Compound Interest',
  desc: 'What a lump sum grows to with compounding',
  keywords: 'compound interest future value savings investment growth apy deposit accumulate',
  eq: 'A = P · (1 + r/m)^(m·t)',
  inputs: [
    { key: 'P', label: 'Principal', unit: '$', hint: 'e.g. 10000' },
    { key: 'annualRate', label: 'Annual interest rate', unit: '%', hint: 'e.g. 5' },
    { key: 'm', label: 'Compounds per year', unit: '', hint: '12 = monthly, 1 = yearly' },
    { key: 't', label: 'Time', unit: 'years', hint: 'e.g. 10' },
  ],
  output: { label: 'Future value', unit: '' },
  compute: v => v.P * Math.pow(1 + (v.annualRate / 100) / v.m, v.m * v.t),
  format: money,
  defaults: { P: 10000, annualRate: 5, m: 12, t: 10 },
  sliders: [
    { key: 'annualRate', span: 5, floor: 0, step: 0.1 },
    { key: 't', span: 15, floor: 1, step: 1 },
  ],
  series: v => {
    const t = Math.max(1, v.t), N = Math.min(Math.max(4, Math.round(t * 4)), 60), points = [];
    for (let i = 0; i <= N; i++) {
      const yr = i / N * t;
      points.push({ x: yr, y: v.P * Math.pow(1 + (v.annualRate / 100) / v.m, v.m * yr) });
    }
    return { title: 'Value over time', xLabel: 'Years', points, yTickFmt: kmoney };
  },
});
