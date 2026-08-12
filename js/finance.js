/* Finance formulas. `money`, `num`, `kmoney` come from engine.js. */

/* Walks a loan month by month at monthly rate r, paying M each month.
   opts.extraPerMonth  adds to every payment
   opts.lumpAmount     a single extra payment, made in opts.lumpMonth
   Returns a row per month (running balance, principal paid, interest paid) plus
   the totals, or null if a payment would never cover the interest owed. */
function loanSchedule(P, r, M, opts) {
  opts = opts || {};
  const perMonth = opts.extraPerMonth || 0;
  const lump = opts.lumpAmount || 0;
  const lumpMonth = opts.lumpMonth || 0;
  const maxMonths = opts.maxMonths || 1200;

  const rows = [{ month: 0, balance: P, principalPaid: 0, interestPaid: 0 }];
  let balance = P, paidPrincipal = 0, paidInterest = 0, month = 0;
  while (balance > 0.005 && month < maxMonths) {
    month++;
    const owed = balance * r;
    const payment = M + perMonth + (lump > 0 && month === lumpMonth ? lump : 0);
    let toPrincipal = payment - owed;
    if (toPrincipal <= 0) return null;
    if (toPrincipal > balance) toPrincipal = balance;
    balance -= toPrincipal;
    paidPrincipal += toPrincipal;
    paidInterest += owed;
    rows.push({ month, balance, principalPaid: paidPrincipal, interestPaid: paidInterest });
  }
  return { rows, months: month, interest: paidInterest };
}

/* What is actually borrowed, once the downpayment is taken off the total. */
function loanPrincipal(v) {
  const pct = Math.min(100, Math.max(0, v.downPct || 0));
  return Math.max(0, (v.total || 0) * (1 - pct / 100));
}

/* Thins a schedule down to at most 60 plotted points. */
function schedulePoints(rows, key) {
  const last = rows.length - 1;
  if (last < 1) return [];
  const steps = Math.min(last, 60), out = [];
  for (let i = 0; i <= steps; i++) {
    const row = rows[Math.round(i / steps * last)];
    out.push({ x: row.month / 12, y: row[key] });
  }
  return out;
}

/* Blank or zero means "halfway through the term", the documented default. */
function extraPaymentMonth(v) {
  const year = v.extraAt > 0 ? v.extraAt : v.years / 2;
  return Math.max(1, Math.round(year * 12));
}

registerFormulas([
  {
    id: 'loan-payment',
    topic: 'finance',
    name: 'Loan Payment Calculator',
    desc: 'Monthly payment for a fixed-rate loan or mortgage',
    keywords: 'mortgage loan emi installment repayment amortization home car borrow monthly payment principal debt',
    eq: 'M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)',
    inputs: [
      { key: 'total', label: 'Total money required', unit: '$', hint: 'e.g. 375000' },
      { key: 'downPct', label: 'Downpayment', unit: '%', hint: 'e.g. 20' },
      { key: 'annualRate', label: 'Annual interest rate', unit: '%', hint: 'e.g. 6.5' },
      { key: 'years', label: 'Loan term', unit: 'years', hint: 'e.g. 30' },
      { key: 'extra', label: 'One extra payment', unit: '$', hint: 'optional', optional: true },
      { key: 'extraAt', label: 'Extra payment at year', unit: 'years', hint: 'blank = halfway', optional: true },
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
        { label: 'Interest per $1 borrowed', value: '$' + (interest / P).toFixed(2) },
        { label: 'Cash out of pocket', value: money(down + paid) },
        { label: 'First payment goes to', wide: true, value: `${money(firstInterest)} interest, ${money(M - firstInterest)} principal` },
      );
      const asIs = loanSchedule(P, r, M, { maxMonths: n });
      const faster = loanSchedule(P, r, M, { extraPerMonth: M / 12, maxMonths: n + 12 });
      /* Skipped at 0% interest, where paying early saves time but no money. */
      if (asIs && faster && faster.months < asIs.months && asIs.interest - faster.interest > 0.5) {
        const yearsSaved = ((asIs.months - faster.months) / 12).toFixed(1);
        rows.push({
          label: 'Paying one extra payment a year',
          wide: true,
          value: `clears it ${yearsSaved} years sooner and saves ${money(asIs.interest - faster.interest)}`,
        });
      }

      /* The one-off extra payment, reported only once an amount is entered. */
      if (v.extra > 0 && asIs) {
        const at = extraPaymentMonth(v);
        const withLump = loanSchedule(P, r, M, { lumpAmount: v.extra, lumpMonth: at, maxMonths: n });
        /* Nothing to report if the payment lands after the loan is already
           finished, or if a 0% loan makes it save nothing. */
        if (withLump && asIs.interest - withLump.interest > 0.5) {
          rows.push({
            label: `One extra ${money(v.extra)} paid at year ${(at / 12).toFixed(1)}`,
            wide: true,
            value: `clears the loan in ${(withLump.months / 12).toFixed(1)} years, not ${(asIs.months / 12).toFixed(1)}`,
          });
          rows.push({
            label: 'Interest after that extra payment',
            wide: true,
            value: `${money(withLump.interest)}, a saving of ${money(asIs.interest - withLump.interest)}`,
          });
        }
      }
      return rows;
    },
    defaults: { total: 375000, downPct: 20, annualRate: 6.5, years: 30, extra: 0, extraAt: 15 },
    sliders: [
      { key: 'downPct', span: 100, floor: 0, ceil: 100, step: 1 },
      { key: 'annualRate', span: 5, floor: 0, step: 0.1 },
      { key: 'years', span: 15, floor: 1, step: 1 },
    ],
    series: v => {
      const r = (v.annualRate / 100) / 12, n = Math.max(1, Math.round(v.years * 12));
      const at = extraPaymentMonth(v);
      const P = loanPrincipal(v);
      const M = P * (r === 0 ? 1 / n : (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
      /* Plot the schedule the visitor actually asked about: with the extra
         payment folded in when they entered one, so its effect is visible. */
      const plan = loanSchedule(P, r, M, {
        lumpAmount: v.extra > 0 ? v.extra : 0, lumpMonth: at, maxMonths: n,
      });
      if (!plan) return { points: [] };
      return {
        title: v.extra > 0
          ? `Your loan with one extra ${money(v.extra)} at year ${(at / 12).toFixed(1)}`
          : 'What you still owe, what you have paid off, and what it cost',
        xLabel: 'Years',
        points: schedulePoints(plan.rows, 'balance'),
        label: 'Balance left',
        extra: [
          { points: schedulePoints(plan.rows, 'principalPaid'), label: 'Principal paid', cls: 'green' },
          { points: schedulePoints(plan.rows, 'interestPaid'), label: 'Interest paid', cls: 'red' },
        ],
        yTickFmt: kmoney,
      };
    },
  },
  {
    id: 'growing-annuity',
    topic: 'finance',
    name: 'Growing Annuity (Future Net Income)',
    desc: 'Recurring income growing at a constant rate, valued at a future point',
    keywords: 'growing annuity future net income stream growth rate recurring dividend pension retirement graduated',
    eq: 'FV = PMT · ((1+r)ⁿ − (1+g)ⁿ) / (r − g)',
    inputs: [
      { key: 'PMT', label: 'First payment / income', unit: '$', hint: 'e.g. 1000' },
      { key: 'rate', label: 'Return (discount) rate per period', unit: '%', hint: 'e.g. 6' },
      { key: 'growth', label: 'Income growth rate per period', unit: '%', hint: 'e.g. 3' },
      { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 20' },
    ],
    output: { label: 'Future value of income stream', unit: '' },
    compute: v => {
      const r = v.rate / 100, g = v.growth / 100, n = v.n;
      if (Math.abs(r - g) < 1e-9) return v.PMT * n * Math.pow(1 + r, n - 1);
      return v.PMT * (Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g);
    },
    format: money,
    defaults: { PMT: 1000, rate: 6, growth: 3, n: 20 },
    sliders: [
      { key: 'rate', span: 5, floor: 0, step: 0.1 },
      { key: 'growth', span: 5, floor: 0, step: 0.1 },
    ],
    series: v => {
      const r = v.rate / 100, g = v.growth / 100, n = Math.max(1, Math.round(v.n)), N = Math.min(n, 60), points = [];
      for (let i = 0; i <= N; i++) {
        const j = Math.round(i / N * n);
        const val = Math.abs(r - g) < 1e-9 ? v.PMT * j * Math.pow(1 + r, Math.max(0, j - 1))
          : v.PMT * (Math.pow(1 + r, j) - Math.pow(1 + g, j)) / (r - g);
        points.push({ x: j, y: val });
      }
      return { title: 'Accumulated value over time', xLabel: 'Periods', points, yTickFmt: kmoney };
    },
  },
  {
    id: 'compound-interest',
    topic: 'finance',
    name: 'Compound Interest (Future Value)',
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
  },
  {
    id: 'present-value',
    topic: 'finance',
    name: 'Present Value',
    desc: "Today's worth of a future amount",
    keywords: 'present value discount pv discounting time value of money today worth npv',
    eq: 'PV = FV / (1 + r)ⁿ',
    inputs: [
      { key: 'FV', label: 'Future amount', unit: '$', hint: 'e.g. 20000' },
      { key: 'rate', label: 'Discount rate per period', unit: '%', hint: 'e.g. 7' },
      { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 10' },
    ],
    output: { label: 'Present value', unit: '' },
    compute: v => v.FV / Math.pow(1 + v.rate / 100, v.n),
    format: money,
  },
  {
    id: 'fv-annuity',
    topic: 'finance',
    name: 'Future Value of an Annuity',
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
  },
  {
    id: 'roi',
    topic: 'finance',
    name: 'Return on Investment (ROI)',
    desc: 'Total percentage return, including income received',
    keywords: 'roi return on investment profit gain loss percentage yield performance dividends interest income rent total return',
    eq: 'ROI = (Final value − Cost + Income) / Cost × 100',
    inputs: [
      { key: 'cost', label: 'Initial cost / amount invested', unit: '$', hint: 'e.g. 10000' },
      { key: 'finalValue', label: 'Final / sale value', unit: '$', hint: 'e.g. 12000' },
      { key: 'income', label: 'Income received (interest, dividends, etc.)', unit: '$', hint: 'leave blank if none', optional: true },
    ],
    output: { label: 'Return on investment', unit: '%' },
    compute: v => (v.finalValue - v.cost + v.income) / v.cost * 100,
    format: num,
  },
]);
