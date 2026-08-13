/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
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
  blurb: 'What a lump sum grows to once its interest starts earning interest. Give it the starting amount, the rate per period and the number of periods.',
  about: [
    'Interest left in the account starts earning interest of its own. Run that for a few periods and the balance climbs faster each time round, because there is more sitting there to earn on.',
    'Whatever period you count in, quote the rate in it too. Ten months at 0.5% a month, not ten months at 6% a year.',
    'One sum, left alone. Nothing paid in, nothing taken out, rate fixed. For regular deposits use Annuity Value. To find how long a target takes, Savings Goal.',
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
    if (!(v.P > 0) || !(r > 0)) return rows;
    rows.push({ label: 'Doubles every', detail: true,
                value: (Math.log(2) / Math.log(1 + r)).toFixed(1) + ' periods' });
    /* The same rate on a bigger balance: the last period earns more than the
       first without anything about the deal changing. This is the whole of
       compounding, and it is the one thing the headline figure hides. */
    if (v.n >= 1) {
      rows.push({ label: 'Interest in the first period, then the last', wide: true, detail: true,
                  value: `${money(v.P * r)}, then ${money(out * r / (1 + r))}` });
    }
    /* Where the growth actually lands. Half the term earns nowhere near half
       the interest, which is why leaving it a few periods longer pays so well. */
    if (v.n >= 2) {
      const half = v.P * Math.pow(1 + r, v.n / 2);
      rows.push({ label: 'Interest in the first half of the term, then the second',
                  wide: true, detail: true,
                  value: `${money(half - v.P)}, then ${money(out - half)}` });
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
      title: 'The balance climbing, with the principal flat beneath it',
      xLabel: 'Periods',
      points: curve(p => v.P * Math.pow(1 + r, p)),
      label: 'Value',
      extra: [{ points: curve(() => v.P), label: 'Principal', cls: 'green' }],
      yTickFmt: kmoney,
    };
  },
});
