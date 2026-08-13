/* roi. `money`, `num`, `kmoney` come from engine.js; loan helpers from js/shared/finance.js. */
registerFormula({
  id: 'roi',
  topic: 'finance',
  name: 'Return on Investment (ROI)',
  short: 'ROI',
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
});
