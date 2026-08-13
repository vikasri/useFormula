/* loan-payment. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
  id: 'loan-payment',
  slug: 'loan',
  topic: 'finance',
  name: 'Loan Payment Calculator',
  short: 'Loan Calculator',
  desc: 'Monthly payment for a fixed-rate loan or mortgage',
  keywords: 'mortgage loan emi installment repayment amortization home car borrow monthly payment principal debt',
  eq: 'M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)',
  inputs: [
    { key: 'total', label: 'Total money required', unit: '$', hint: 'e.g. 375000' },
    { key: 'downPct', label: 'Downpayment', unit: '%', hint: 'e.g. 20' },
    { key: 'annualRate', label: 'Annual interest rate', unit: '%', hint: 'e.g. 6.5' },
    { key: 'years', label: 'Loan term', unit: 'years', hint: 'e.g. 30' },
    { key: 'extra', label: 'Extra payment', unit: '$', hint: 'e.g. 10000', optional: true, advanced: true },
    { key: 'extraAt', label: 'Paid at year', unit: 'years', hint: 'blank = halfway', optional: true, advanced: true },
  ],
  output: { label: 'Monthly payment', unit: '' },
  compute: v => {
    const P = loanPrincipal(v);
    const r = (v.annualRate / 100) / 12;
    const n = v.years * 12;
    if (P <= 0) return 0;
    if (r === 0) return P / n;
    return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  },
  format: money,
  extras: (v, M) => {
    const r = (v.annualRate / 100) / 12;
    const n = Math.round(v.years * 12);
    const P = loanPrincipal(v);
    const asIs = loanSchedule(P, r, M, { maxMonths: n });
    const down = v.total - P;
    const paid = M * n;
    const interest = paid - P;
    const firstInterest = P * r;
    /* Paired two per row, so short values sit side by side and only the
       sentence-length ones take a full row. */
    const rows = [
      { label: `Downpayment (${+(v.downPct || 0).toFixed(2)}%)`, value: money(down) },
      { label: 'Amount borrowed', value: money(P) },
    ];
    if (P <= 0) return rows;
    rows.push(
      { label: 'Total interest', value: money(interest) },
      { label: `Total paid over ${v.years} year${v.years === 1 ? '' : 's'}`, value: money(paid) },
      { label: 'Interest per $1 borrowed', detail: true, value: '$' + (interest / P).toFixed(2) },
      { label: 'Cash out of pocket', detail: true, value: money(down + paid) },
    );

    /* Early payments are mostly interest, so the halfway point in the debt
       arrives well past the halfway point in time. */
    const half = asIs && asIs.rows.find(row => row.balance <= P / 2);
    if (half && half.month > 0) {
      rows.push({
        label: 'Half of the principal amount of the loan paid off in',
        detail: true, wide: true,
        value: `${(half.month / 12).toFixed(1)} years`,
      });
    }

    rows.push(
      { label: 'First payment goes to', wide: true, detail: true, value: `${money(firstInterest)} interest, ${money(M - firstInterest)} principal` },
    );
    const faster = loanSchedule(P, r, M, { extraPerMonth: M / 12, maxMonths: n + 12 });
    /* Skipped at 0% interest, where paying early saves time but no money. */
    if (asIs && faster && faster.months < asIs.months && asIs.interest - faster.interest > 0.5) {
      const yearsSaved = ((asIs.months - faster.months) / 12).toFixed(1);
      rows.push({
        label: 'Paying one extra payment a year',
        wide: true, detail: true,
        value: `clears it ${yearsSaved} years sooner and saves ${money(asIs.interest - faster.interest)}`,
      });
    }

    return rows;
  },

  /* Kept out of the main form: a one-off extra payment leaves the monthly
     payment untouched, so showing it beside the fields that set the payment
     would only mislead. */
  advanced: {
    summary: 'What if you paid extra?',
    intro: 'A one-off extra payment does not change your monthly payment. It shortens the loan and cuts the total interest. Enter an amount to see by how much, and watch the curves below.',
    note: (v, M) => {
      if (!(v.extra > 0)) return '';
      const P = loanPrincipal(v);
      const r = (v.annualRate / 100) / 12;
      const n = Math.round(v.years * 12);
      const at = extraPaymentMonth(v);
      const asIs = loanSchedule(P, r, M, { maxMonths: n });
      const withLump = loanSchedule(P, r, M, { lumpAmount: v.extra, lumpMonth: at, maxMonths: n });
      /* Nothing to say if the payment lands after the loan is already
         finished, or if a 0% loan makes it save nothing. */
      if (!asIs || !withLump || asIs.interest - withLump.interest <= 0.5) return '';
      return `Paying ${money(v.extra)} at year ${(at / 12).toFixed(1)} clears the loan in `
        + `${(withLump.months / 12).toFixed(1)} years instead of ${(asIs.months / 12).toFixed(1)}, `
        + `and saves ${money(asIs.interest - withLump.interest)} in interest.`;
    },
  },
  defaults: { total: 375000, downPct: 20, annualRate: 6.5, years: 30 },
  sliders: [
    { key: 'downPct', span: 100, floor: 0, ceil: 100, step: 1 },
    { key: 'annualRate', span: 5, floor: 0, step: 0.1 },
    { key: 'years', span: 15, floor: 1, step: 1 },
  ],
  series: v => {
    const r = (v.annualRate / 100) / 12, n = Math.max(1, Math.round(v.years * 12));
    const P = loanPrincipal(v);
    const M = P * (r === 0 ? 1 / n : (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const base = loanSchedule(P, r, M, { maxMonths: n });
    if (!base) return { points: [] };

    const lines = [
      { points: schedulePoints(base.rows, 'principalPaid'), label: 'Principal paid', cls: 'green' },
      { points: schedulePoints(base.rows, 'interestPaid'), label: 'Interest paid', cls: 'red' },
    ];

    /* An extra payment adds dotted lines beside the originals rather than
       replacing them, so the two schedules can be compared directly. */
    let withLump = null;
    if (v.extra > 0) {
      const at = extraPaymentMonth(v);
      withLump = loanSchedule(P, r, M, { lumpAmount: v.extra, lumpMonth: at, maxMonths: n });
      if (withLump) {
        lines.push({ points: schedulePoints(withLump.rows, 'balance'), label: 'Balance with extra', dash: true });
        lines.push({ points: schedulePoints(withLump.rows, 'principalPaid'), label: 'Principal with extra', cls: 'green', dash: true });
      }
    }

    return {
      title: withLump
        ? 'Your loan, plain lines as scheduled and dotted with the extra payment'
        : 'What you still owe, what you have paid off, and what it cost',
      xLabel: 'Years',
      points: schedulePoints(base.rows, 'balance'),
      label: 'Balance left',
      extra: lines,
      yTickFmt: kmoney,
    };
  },
});
