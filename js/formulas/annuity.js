/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* annuity. `money`, `num`, `kmoney` come from engine.js; annuity helpers from
   js/shared/finance.js.

   One formula, two cases. The main form is the ordinary annuity — level
   payments — and that is what the page opens on. Growth lives in the panel, and
   turns the same expression into the growing annuity, so there is no second
   calculator to keep in step with this one. */
registerFormula({
  id: 'annuity',
  topic: 'finance',
  name: 'Annuity Value',
  short: 'Annuity',
  desc: 'What regular payments add up to by a future date',
  keywords: 'annuity future value regular payments deposits sip savings recurring contributions retirement pension growing graduated escalating income stream level ordinary compounding',
  title: 'Annuity Calculator: Future Value of Regular Payments',
  blurb: 'What regular payments add up to by a future date. Level payments to start with, or set a growth rate if each one is bigger than the last.',
  about: [
    'Put the same amount away each period and this is what you finish with. The first payment compounds for the whole term. The last one earns nothing at all. Stack those up and the total lands well above the sum of what you paid in.',
    'Keep the rate on the same footing as the period. Paying in monthly means a monthly rate, near enough 0.5% a month for 6% a year.',
    'Growth starts at zero, which is the plain annuity. Raise it and every payment is a little larger than the one before, as a contribution tied to a salary would be. Payments are taken at the end of each period and the rate is held flat.',
  ],
  eq: 'FV = PMT · ((1+r)ⁿ − (1+g)ⁿ) / (r − g)',
  inputs: [
    { key: 'PMT', label: 'Payment per period', hint: 'e.g. 5000' },
    { key: 'rate', label: 'Return rate per period', unit: '%', hint: 'e.g. 6' },
    { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 20' },
    { key: 'growth', label: 'Payment growth per period', unit: '%', hint: 'blank = level payments',
      optional: true, advanced: true },
  ],
  output: { label: 'Future value', unit: '' },
  compute: v => annuityFV(v.PMT, v.rate / 100, v.growth / 100, v.n),
  format: money,
  extras: (v, out) => {
    const g = v.growth / 100, n = Math.max(0, Math.round(v.n));
    const paidIn = annuityPaidIn(v.PMT, g, n);
    const rows = [
      { label: 'Total paid in', value: money(paidIn) },
      { label: 'Growth earned', value: money(out - paidIn) },
    ];
    if (paidIn <= 0) return rows;
    rows.push({ label: 'Every 1 paid in becomes', detail: true,
                value: (out / paidIn).toFixed(2) });
    /* The first payment compounds for the whole term, so it is worth a
       multiple of the last one — the point the chart's curve is making. */
    if (n > 1) {
      rows.push({ label: 'The first payment alone grows to', detail: true,
                  value: money(v.PMT * Math.pow(1 + v.rate / 100, n - 1)) });
    }
    if (g !== 0 && n > 0) {
      rows.push({ label: 'Payments run from first to last', wide: true, detail: true,
                  value: `${money(v.PMT)} up to ${money(v.PMT * Math.pow(1 + g, n - 1))}` });
    }
    return rows;
  },

  /* Kept out of the main form: level payments are the case nearly everyone
     wants, and a growth rate sitting beside the payment field would suggest
     it needs filling in. */
  advanced: {
    summary: 'What if the payments grow?',
    intro: 'Left blank, every payment is the same size. Give it a growth rate and each one steps up from the last, as a contribution tied to a salary would. Both plans go on the chart so you can see the gap open.',
    note: (v, out) => {
      if (!v.growth) return '';
      const n = Math.max(0, Math.round(v.n));
      const level = annuityFV(v.PMT, v.rate / 100, 0, n);
      if (n < 1 || !isFinite(level)) return '';
      const last = v.PMT * Math.pow(1 + v.growth / 100, n - 1);
      return `Growing ${v.growth}% a period takes the last payment to ${money(last)} `
        + `and the total to ${money(out)}. Level payments would have reached `
        + `${money(level)}, so growth is worth ${money(Math.abs(out - level))} `
        + `${out >= level ? 'more' : 'less'}.`;
    },
  },
  defaults: { PMT: 5000, rate: 6, n: 20 },
  sliders: [
    { key: 'rate', span: 5, floor: 0, step: 0.1 },
    { key: 'n', span: 15, floor: 1, step: 1 },
  ],
  series: v => {
    const r = v.rate / 100, g = v.growth / 100;
    const n = Math.max(1, Math.round(v.n)), N = Math.min(n, 60);
    const curve = fn => {
      const out = [];
      for (let i = 0; i <= N; i++) { const j = Math.round(i / N * n); out.push({ x: j, y: fn(j) }); }
      return out;
    };
    /* Solid is the level plan, dotted the growing one, in matching colours:
       blue for what it is worth, green for what was handed over. Growth adds
       its two lines beside the originals rather than replacing them, so the
       gap each one opens is there to be read off. */
    const lines = [];
    if (g !== 0) {
      lines.push({ points: curve(j => annuityFV(v.PMT, r, g, j)),
                   label: 'Value (with payment growth)', dash: true });
    }
    lines.push({ points: curve(j => annuityPaidIn(v.PMT, 0, j)), label: 'Paid in', cls: 'green' });
    if (g !== 0) {
      lines.push({ points: curve(j => annuityPaidIn(v.PMT, g, j)),
                   label: 'Paid in (with payment growth)', cls: 'green', dash: true });
    }
    return {
      title: 'What it adds up to, and how much of that you paid in',
      xLabel: 'Periods',
      points: curve(j => annuityFV(v.PMT, r, 0, j)),
      label: 'Value',
      extra: lines,
      yTickFmt: kmoney,
    };
  },
});
