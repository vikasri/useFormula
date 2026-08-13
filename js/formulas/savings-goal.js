/* savings-goal. `money`, `num`, `kmoney` come from engine.js; periodsToGoal and
   balanceAfter from js/shared/finance.js.

   The one calculator here that runs backwards: every other finance formula is
   given a term and returns an amount, this is given the amount and returns the
   term. Paying in regularly sits in the main form rather than behind a panel:
   for a goal it is the question, not a variation on it. Someone saving towards
   a figure is nearly always adding to it, and hiding that field would hide the
   thing that decides whether the goal arrives at all. */
registerFormula({
  id: 'savings-goal',
  slug: 'goal',
  topic: 'finance',
  name: 'Savings Goal Calculator',
  short: 'Savings Goal',
  desc: 'How long until your savings reach a target',
  keywords: 'savings goal target how long time to reach years to save deposit house down payment emergency fund retirement million back calculate solve for time when will i have',
  title: 'Savings Goal Calculator: How Long Until You Reach a Target',
  blurb: 'Say what you have, what you pay in each year and the return you expect — this gives the years to reach your target, and how much of that is growth.',
  about: [
    'Every other calculator here is given a length of time and asked for an amount. This one runs the other way: give it the figure you are aiming at and it returns the years, solved outright rather than searched for.',
    'What you pay in each year is usually the difference between a goal that arrives and one that does not. Set it to 0 to see how long the sum takes on its own — Additional Information gives that figure either way.',
    'The answer keeps its fraction rather than rounding up, so 23.3 means the target is passed part way through the twenty-fourth year. It assumes the rate holds throughout, that payments arrive at each year end, and that nothing is withdrawn. Tax, fees and inflation are not modelled.',
  ],
  eq: 't = ln( (A + PMT/r) / (P + PMT/r) ) / ln(1 + r)',
  inputs: [
    { key: 'now', label: 'What you have now', unit: '$', hint: 'e.g. 10000' },
    { key: 'goal', label: 'What you are aiming for', unit: '$', hint: 'e.g. 200000' },
    { key: 'rate', label: 'Annual return rate', unit: '%', hint: 'e.g. 5' },
    { key: 'pmt', label: 'Paid in each year', unit: '$', hint: '0 if nothing is added' },
  ],
  output: { label: 'Time to Reach Goal', unit: 'years' },
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
    /* Half the wait is a fair sense of progress only when nothing compounds;
       with growth the balance is behind halfway at the halfway mark. */
    const midway = balanceAfter(v.now, v.pmt || 0, r, n / 2);
    rows.push({ label: 'Halfway through, you have', detail: true, value: money(midway) });
    /* What the payments are buying, in time. Held here rather than in a panel
       so it is answered whether or not the reader thought to ask. */
    if (v.pmt > 0) {
      const alone = periodsToGoal(v.now, 0, r, v.goal);
      rows.push({ label: 'Paying in nothing, the same sum would take', wide: true, detail: true,
                  value: alone === null ? 'longer than any term — it never gets there'
                    : `${alone.toFixed(1)} years, ${(alone - n).toFixed(1)} more` });
    }
    return rows;
  },

  defaults: { now: 10000, goal: 200000, rate: 5, pmt: 4000 },
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
    return {
      title: 'The balance climbing to meet the target',
      xLabel: 'Years',
      points: curve(p => balanceAfter(v.now, v.pmt || 0, r, p)),
      label: 'Balance',
      extra: lines,
      yTickFmt: kmoney,
    };
  },
});
