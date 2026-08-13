/* present-value. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
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
});
