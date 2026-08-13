/* savings-goal. `money`, `num`, `kmoney` come from engine.js; periodsToGoal and
   balanceAfter from js/shared/finance.js.

   The one calculator here that runs backwards: every other finance formula is
   given a term and returns an amount, this is given the amount and returns the
   term. The main form is a sum left to grow on its own; paying in regularly is
   the panel, because it is the second question, not the first. */
registerFormula({
  id: 'savings-goal',
  slug: 'goal',
  topic: 'finance',
  name: 'Savings Goal Calculator',
  short: 'Savings Goal',
  desc: 'How long until your savings reach a target',
  keywords: 'savings goal target how long time to reach years to save deposit house down payment emergency fund retirement million back calculate solve for time when will i have',
  title: 'Savings Goal Calculator: How Long Until You Reach a Target',
  blurb: 'Say what you have, what you want, and the return you expect — this gives the years it takes. Add a regular payment to see how much sooner it arrives.',
  about: [
    'Every other calculator here is handed a length of time and asked for an amount. This one runs the other way: give it the amount you are aiming at and it returns the time. Enter what you have now, the return you expect each period, and the figure you want to reach.',
    'It is the compound interest equation rearranged. Where that one asks what P grows to in t years, this asks what t makes P reach A, so the years come out of a logarithm rather than a power: t = ln(A/P) / ln(1+r). With a regular payment in the mix the same rearrangement gives t = ln((A + PMT/r) / (P + PMT/r)) / ln(1+r). Both are solved outright, not searched for, so the answer is exact.',
    'Open "What if you also pay in regularly?" to add a fixed amount each period. This is usually the difference between a goal that arrives and one that does not: a sum left alone doubles on a schedule the rate sets and nothing you do changes it, while a payment every period shortens the wait immediately and keeps shortening it.',
    'The period is whatever you say it is — enter a monthly rate and a monthly payment and the answer comes back in months. Fractions of a period are left in rather than rounded up, so 7.4 means the goal is passed part way through the eighth. It assumes the rate holds for the whole stretch and nothing is withdrawn, and takes no account of tax, fees or inflation: a target set in today’s money will buy less by the time you reach it.',
  ],
  eq: 't = ln( (A + PMT/r) / (P + PMT/r) ) / ln(1 + r)',
  inputs: [
    { key: 'now', label: 'What you have now', unit: '$', hint: 'e.g. 20000' },
    { key: 'goal', label: 'What you are aiming for', unit: '$', hint: 'e.g. 100000' },
    { key: 'rate', label: 'Return rate per period', unit: '%', hint: 'e.g. 6' },
    { key: 'pmt', label: 'Paid in each period', unit: '$', hint: 'blank = nothing added',
      optional: true, advanced: true },
  ],
  output: { label: 'Periods to reach it', unit: '' },
  compute: v => {
    const n = periodsToGoal(v.now, v.pmt, v.rate / 100, v.goal);
    if (n === null) throw new Error('At this rate, with nothing paid in, that goal is never reached.');
    return n;
  },
  format: n => (n === 0 ? 'Already there' : n.toFixed(1)),
  extras: (v, n) => {
    const r = v.rate / 100;
    const rows = [];
    if (!(n > 0)) return rows;
    const paidIn = (v.pmt || 0) * n;
    rows.push({ label: 'Of the target, from growth', value: money(v.goal - v.now - paidIn) },
              { label: 'Of the target, paid in', value: money(v.now + paidIn) });
    rows.push({ label: 'Reached part way through period', detail: true,
                value: Math.ceil(n) + '' });
    /* Half the wait is a fair sense of progress only when nothing compounds;
       with growth the balance is behind halfway at the halfway mark. */
    const midway = balanceAfter(v.now, v.pmt || 0, r, n / 2);
    rows.push({ label: 'Halfway through the time, you have', detail: true, value: money(midway) });
    if (r > 0) {
      rows.push({ label: 'Waiting one more period would leave you with', wide: true, detail: true,
                  value: money(balanceAfter(v.now, v.pmt || 0, r, n + 1)) });
    }
    return rows;
  },

  /* Kept out of the main form: the question arrives as "how long will what I
     have take", and the answer to that is worth seeing before the field that
     changes it. */
  advanced: {
    summary: 'What if you also pay in regularly?',
    intro: 'Left blank, the sum grows on its own and nothing is added. Enter an amount to pay in at the end of every period and the goal arrives sooner — the dotted line on the chart is the balance without it, for comparison.',
    note: (v, n) => {
      if (!(v.pmt > 0) || !(n > 0)) return '';
      const alone = periodsToGoal(v.now, 0, v.rate / 100, v.goal);
      if (alone === null) {
        return `Paying in ${money(v.pmt)} a period reaches it in ${n.toFixed(1)}. `
          + `Left alone, at this rate it never gets there at all.`;
      }
      return `Paying in ${money(v.pmt)} a period reaches it in ${n.toFixed(1)} periods `
        + `instead of ${alone.toFixed(1)} — ${(alone - n).toFixed(1)} sooner, `
        + `for ${money(v.pmt * n)} paid in along the way.`;
    },
  },
  defaults: { now: 20000, goal: 100000, rate: 6 },
  sliders: [
    { key: 'rate', span: 5, floor: 0.1, step: 0.1 },
    { key: 'goal', span: 80000, floor: 1000, step: 1000 },
  ],
  series: v => {
    const r = v.rate / 100;
    const n = periodsToGoal(v.now, v.pmt, r, v.goal);
    if (n === null || !(n > 0)) return { points: [] };
    const span = n * 1.15, N = Math.min(Math.max(8, Math.round(span)), 60);
    const curve = fn => {
      const out = [];
      for (let i = 0; i <= N; i++) { const p = i / N * span; out.push({ x: p, y: fn(p) }); }
      return out;
    };
    /* The goal drawn flat across is what the balance is climbing to meet; where
       they cross is the answer, which is the whole point of the picture. */
    const lines = [{ points: curve(() => v.goal), label: 'The target', cls: 'green' }];
    if (v.pmt > 0) {
      lines.push({ points: curve(p => balanceAfter(v.now, 0, r, p)),
                   label: 'Balance without paying in', dash: true });
    }
    return {
      title: 'The balance climbing to meet the target',
      xLabel: 'Periods',
      points: curve(p => balanceAfter(v.now, v.pmt || 0, r, p)),
      label: 'Balance',
      extra: lines,
      yTickFmt: kmoney,
    };
  },
});
