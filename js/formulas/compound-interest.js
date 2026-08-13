/* compound-interest. `money`, `num`, `kmoney` come from engine.js; compounding
   helpers from js/shared/finance.js.

   The main form is the plain case — a sum left to grow, interest added once a
   year. How often it is added lives in the panel, because the answer barely
   moves for it and the question people arrive with does not mention it. */
registerFormula({
  id: 'compound-interest',
  slug: 'compound',
  topic: 'finance',
  name: 'Compound Interest',
  desc: 'What a lump sum grows to when the interest earns interest',
  keywords: 'compound interest future value savings investment growth apy annual percentage yield deposit accumulate lump sum principal doubling rule of 72 monthly daily quarterly compounding',
  title: 'Compound Interest Calculator: What a Lump Sum Grows To',
  blurb: 'See what a sum grows to when its interest earns interest too. Yearly by default, or set how often it compounds and watch the effective rate move.',
  about: [
    'Leave a sum alone at a fixed rate and each year it earns interest on the interest already added, not just on what you started with. That is the whole of it, and it is why the line on the chart bends upward instead of running straight: the amount earning is bigger every year.',
    'The equation above is the general one. Leave the panel alone and m is 1 — interest added once a year — and it reduces to A = P · (1 + r)ᵗ. The rate is the annual one however often it compounds, so 5% compounded monthly means twelve additions of about 0.4167% rather than twelve of 5%.',
    'Adding it more often earns a little more, because each addition starts earning immediately, but the gain is smaller than people expect and it has a ceiling: compounding continuously rather than daily is worth almost nothing. The effective annual rate under Additional Information is what the quoted rate actually comes to once the frequency is taken into account, and it is the number to compare two accounts on.',
    'This is a lump sum left to itself. It assumes the rate never changes and that nothing is paid in or taken out along the way — for regular deposits, the Annuity Value calculator is the one you want. Tax, fees and inflation are not modelled, so the answer is in the money of the final year rather than in what that money will buy.',
  ],
  eq: 'A = P · (1 + r/m)^(m·t)',
  inputs: [
    { key: 'P', label: 'Principal', unit: '$', hint: 'e.g. 10000' },
    { key: 'annualRate', label: 'Annual interest rate', unit: '%', hint: 'e.g. 5' },
    { key: 't', label: 'Time', unit: 'years', hint: 'e.g. 10' },
    { key: 'm', label: 'Compounds per year', unit: '', hint: 'blank = once a year',
      optional: true, advanced: true },
  ],
  output: { label: 'Future value', unit: '' },
  compute: v => v.P * Math.pow(1 + (v.annualRate / 100) / compoundsPerYear(v),
                               compoundsPerYear(v) * v.t),
  format: money,
  extras: (v, out) => {
    const m = compoundsPerYear(v), r = v.annualRate / 100;
    const rows = [
      { label: 'Interest earned', value: money(out - v.P) },
      { label: 'Every $1 becomes', value: '$' + (v.P > 0 ? (out / v.P).toFixed(2) : '0.00') },
    ];
    if (!(v.P > 0)) return rows;
    /* What the quoted rate is really worth once the frequency is counted in.
       The number to compare two accounts on, and the reason it is here. */
    rows.push({ label: 'Effective annual rate', detail: true,
                value: ((Math.pow(1 + r / m, m) - 1) * 100).toFixed(3) + '%' });
    if (r > 0) {
      rows.push({ label: 'Doubles in', detail: true,
                  value: (Math.log(2) / (m * Math.log(1 + r / m))).toFixed(1) + ' years' });
    }
    rows.push({ label: 'Simple interest, with nothing compounding, would give',
                wide: true, detail: true, value: money(v.P * (1 + r * v.t)) });
    return rows;
  },

  /* Kept out of the main form: the question is almost always "what does this
     grow to", and a frequency field beside the rate invites a reader to think
     the rate needs dividing by hand. */
  advanced: {
    summary: 'What if it compounds more often?',
    intro: 'Left blank, the interest is added once a year. Say how many times a year it is added instead — 12 for monthly, 365 for daily — and each addition starts earning straight away. The chart then draws that as a dotted line beside the yearly one.',
    note: (v, out) => {
      const m = compoundsPerYear(v);
      if (m === 1 || !(v.P > 0)) return '';
      const r = v.annualRate / 100;
      const yearly = v.P * Math.pow(1 + r, v.t);
      const apy = (Math.pow(1 + r / m, m) - 1) * 100;
      return `Compounded ${compoundingName(m)} rather than yearly, ${money(v.P)} reaches `
        + `${money(out)} instead of ${money(yearly)} — ${money(out - yearly)} more over `
        + `${+v.t} year${v.t === 1 ? '' : 's'}, an effective ${apy.toFixed(3)}% a year `
        + `against the ${+v.annualRate}% quoted.`;
    },
  },
  defaults: { P: 10000, annualRate: 5, t: 10 },
  sliders: [
    { key: 'annualRate', span: 5, floor: 0, step: 0.1 },
    { key: 't', span: 15, floor: 1, step: 1 },
  ],
  series: v => {
    const m = compoundsPerYear(v), r = v.annualRate / 100;
    const t = Math.max(1, v.t), N = Math.min(Math.max(4, Math.round(t * 4)), 60);
    const curve = fn => {
      const out = [];
      for (let i = 0; i <= N; i++) { const yr = i / N * t; out.push({ x: yr, y: fn(yr) }); }
      return out;
    };
    /* Solid is the yearly case, dotted whatever the panel asked for, with the
       principal flat underneath so the gap above it is the interest. */
    const lines = [];
    if (m !== 1) {
      lines.push({ points: curve(yr => v.P * Math.pow(1 + r / m, m * yr)),
                   label: 'Value (compounded ' + compoundingName(m) + ')', dash: true });
    }
    lines.push({ points: curve(() => v.P), label: 'Principal', cls: 'green' });
    return {
      title: 'What it grows to, and how much of that you put in',
      xLabel: 'Years',
      points: curve(yr => v.P * Math.pow(1 + r, yr)),
      label: m === 1 ? 'Value' : 'Value (compounded yearly)',
      extra: lines,
      yTickFmt: kmoney,
    };
  },
});
