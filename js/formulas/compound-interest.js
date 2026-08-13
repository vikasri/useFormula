/* compound-interest. `money`, `kmoney` come from engine.js.

   Everything is per period, the same as Annuity Value and Savings Goal: a
   monthly rate with monthly periods gives a monthly answer. Three fields, one
   equation, no panel. */
registerFormula({
  id: 'compound-interest',
  slug: 'compound',
  topic: 'finance',
  name: 'Compound Interest Calculator',
  short: 'Compound Interest',
  desc: 'What a lump sum grows to when the interest earns interest',
  keywords: 'compound interest future value savings investment growth deposit accumulate lump sum principal doubling per period monthly yearly',
  title: 'Compound Interest Calculator: What a Lump Sum Grows To',
  blurb: 'See what a sum grows to when its interest earns interest too. Enter what you start with, the rate per period, and how many periods.',
  about: [
    'Leave a sum alone at a fixed rate and each period it earns interest on the interest already added, not just on what you started with. That is the whole of it, and it is why the line on the chart bends upward instead of running straight: the amount earning is bigger every period.',
    'The rate and the period have to describe the same stretch of time. A monthly rate with a number of months gives an answer in months; a yearly rate with a number of years gives one in years. 6% a year is roughly 0.5% a month, not 6%.',
    'This is a lump sum left to itself. It assumes the rate never changes and that nothing is paid in or taken out along the way — for regular deposits, the Annuity Value calculator is the one you want, and to find how long a target takes rather than what a sum reaches, Savings Goal. Tax, fees and inflation are not modelled.',
  ],
  eq: 'A = P · (1 + r)ⁿ',
  inputs: [
    { key: 'P', label: 'Principal', unit: '$', hint: 'e.g. 10000' },
    { key: 'rate', label: 'Interest rate per period', unit: '%', hint: 'e.g. 5' },
    { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 10' },
  ],
  output: { label: 'Future value', unit: '' },
  compute: v => v.P * Math.pow(1 + v.rate / 100, v.n),
  format: money,
  extras: (v, out) => {
    const r = v.rate / 100;
    const rows = [
      { label: 'Interest earned', value: money(out - v.P) },
      { label: 'Every $1 becomes', value: '$' + (v.P > 0 ? (out / v.P).toFixed(2) : '0.00') },
    ];
    if (v.P > 0 && r > 0) {
      rows.push({ label: 'Doubles every', detail: true,
                  value: (Math.log(2) / Math.log(1 + r)).toFixed(1) + ' periods' });
    }
    return rows;
  },
  defaults: { P: 10000, rate: 5, n: 10 },
  sliders: [
    { key: 'rate', span: 5, floor: 0, step: 0.1 },
    { key: 'n', span: 15, floor: 1, step: 1 },
  ],
  series: v => {
    const r = v.rate / 100, n = Math.max(1, v.n), N = Math.min(Math.max(4, Math.round(n * 4)), 60);
    const curve = fn => {
      const out = [];
      for (let i = 0; i <= N; i++) { const p = i / N * n; out.push({ x: p, y: fn(p) }); }
      return out;
    };
    /* The principal flat underneath, so the gap above it is the interest. */
    return {
      title: 'What it grows to, and how much of that you put in',
      xLabel: 'Periods',
      points: curve(p => v.P * Math.pow(1 + r, p)),
      label: 'Value',
      extra: [{ points: curve(() => v.P), label: 'Principal', cls: 'green' }],
      yTickFmt: kmoney,
    };
  },
});
