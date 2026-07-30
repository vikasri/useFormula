/* Finance formulas. `money`, `num`, `kmoney` come from engine.js. */
registerFormulas([
  {
    id: 'loan-payment',
    topic: 'finance',
    name: 'Loan Payment Calculator',
    desc: 'Monthly payment for a fixed-rate loan or mortgage',
    keywords: 'mortgage loan emi installment repayment amortization home car borrow monthly payment principal debt',
    eq: 'M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1)',
    inputs: [
      { key: 'P', label: 'Loan amount (principal)', unit: '$', hint: 'e.g. 300000' },
      { key: 'annualRate', label: 'Annual interest rate', unit: '%', hint: 'e.g. 6.5' },
      { key: 'years', label: 'Loan term', unit: 'years', hint: 'e.g. 30' },
    ],
    output: { label: 'Monthly payment', unit: '' },
    compute: v => {
      const r = (v.annualRate / 100) / 12;
      const n = v.years * 12;
      if (r === 0) return v.P / n;
      return v.P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    },
    format: money,
    defaults: { P: 300000, annualRate: 6.5, years: 30 },
    sliders: [
      { key: 'annualRate', span: 5, floor: 0, step: 0.1 },
      { key: 'years', span: 15, floor: 1, step: 1 },
    ],
    series: v => {
      const r = (v.annualRate / 100) / 12, n = Math.max(1, Math.round(v.years * 12)), N = Math.min(n, 60), points = [];
      for (let i = 0; i <= N; i++) {
        const k = Math.round(i / N * n);
        const bal = r === 0 ? v.P * (1 - k / n)
          : v.P * (Math.pow(1 + r, n) - Math.pow(1 + r, k)) / (Math.pow(1 + r, n) - 1);
        points.push({ x: k / 12, y: Math.max(0, bal) });
      }
      return { title: 'Loan balance over time', xLabel: 'Years', points, yTickFmt: kmoney };
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
