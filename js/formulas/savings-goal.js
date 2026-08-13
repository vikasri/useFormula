/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
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
  blurb: 'How many years until your savings hit a target. Give it what you have, what you add each year and the return you expect.',
  about: [
    'Most calculators here take a term and give you an amount. This one goes the other way. You give it the figure you want and it returns the years, worked out directly rather than by trial.',
    'What you put in each year usually decides whether the target is reachable at all. Set it to zero to see how long the starting sum needs on its own, which is normally a very long time.',
    'The answer is not rounded up: 23.4 years means you cross the line partway through the twenty-fourth, on growth alone. Payments land at each year end and are counted whole — a target reached before the next one is due is reached by the balance growing, not by part of a payment arriving early. The rate is held flat, nothing comes out along the way, and there is no tax, no fees and no inflation.',
  ],
  eq: 'A = P(1 + r)ᵗ + PMT · ((1 + r)ᵗ − 1) / r,  solved for t',
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
    /* Whole payments only. The fraction of a period at the end is growth
       after the last one, not part of another. */
    const paidIn = (v.pmt || 0) * Math.floor(n);
    /* Split what is actually in the account, not the target. A payment that
       takes the balance past the goal overshoots it, and charging that
       overshoot against growth would make growth come out negative. */
    const final = balanceAfter(v.now, v.pmt || 0, r, n);
    rows.push({ label: 'What growth added', value: money(final - v.now - paidIn) },
              { label: 'What you put in', value: money(v.now + paidIn) });
    if (final > v.goal * 1.005) {
      rows.push({ label: 'Balance when you get there', detail: true, value: money(final) });
    }
    /* Half the wait is a fair sense of progress only when nothing compounds;
       with growth the balance is behind halfway at the halfway mark. */
    const midway = balanceAfter(v.now, v.pmt || 0, r, n / 2);
    rows.push({ label: 'Halfway through, you have', detail: true, value: money(midway) });
    /* What the payments are buying, in time. Held here rather than in a panel
       so it is answered whether or not the reader thought to ask. */
    if (v.pmt > 0) {
      const alone = periodsToGoal(v.now, 0, r, v.goal);
      rows.push({ label: 'Paying in nothing, the same sum would take', wide: true, detail: true,
                  value: alone === null ? 'longer than any term; it never gets there'
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
    /* Sampled at year ends, where the balance is actually defined, plus the
       answer itself so the crossing lands where it is claimed to. */
    const span = Math.ceil(n * 1.15), step = Math.max(1, Math.ceil(span / 60));
    const at = [];
    for (let y = 0; y <= span; y += step) at.push(y);
    at.push(n);
    at.sort((i, j) => i - j);
    const curve = fn => at.map(p => ({ x: p, y: fn(p) }));
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
