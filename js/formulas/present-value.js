/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* present-value. `money` comes from engine.js. Compound interest run
   backwards: what a future amount is worth if you had it today. */
registerFormula({
  id: 'present-value',
  topic: 'finance',
  name: 'Present Value Calculator',
  short: 'Present Value',
  desc: "Today's worth of a future amount",
  keywords: 'present value pv discount rate discounting time value of money today worth future amount lump sum npv discounted cash flow settlement payout inheritance',
  title: 'Present Value Calculator: What Future Money Is Worth Today',
  blurb: 'What money arriving later is worth today, once you discount out the return it could have been earning in the meantime.',
  about: [
    'A dollar next year is worth less than a dollar today, because today’s dollar can be earning in the meantime. This works out what you would need to hold now to end up with the amount you have been promised.',
    'The discount rate is your call rather than a lookup. It stands for the return you could get on the money instead. Raise it and waiting costs more; stretch the wait and it costs more again. At 7%, twenty thousand dollars ten years out is worth a shade over half that today.',
    'Rate and periods have to match, annual with years or monthly with months. The figure also assumes the money certainly turns up. If there is any doubt it does, it is worth less than this.',
  ],
  eq: 'PV = FV / (1 + r)ⁿ',
  inputs: [
    { key: 'FV', label: 'Future amount', hint: 'e.g. 20000' },
    { key: 'rate', label: 'Discount rate per period', unit: '%', hint: 'e.g. 7' },
    { key: 'n', label: 'Number of periods', unit: '', hint: 'e.g. 10' },
  ],
  output: { label: 'Present value', unit: '' },
  compute: v => v.FV / Math.pow(1 + v.rate / 100, v.n),
  format: money,
  defaults: { FV: 20000, rate: 7, n: 10 },
  sliders: [
    { key: 'rate', span: 5, floor: 0, step: 0.1 },
    { key: 'n', span: 15, floor: 1, step: 1 },
  ],
  extras: (v, pv) => {
    const rows = [{ label: 'Given up by waiting', value: money(v.FV - pv) }];
    if (!(v.FV > 0) || !(pv > 0)) return rows;
    rows.push({ label: 'Each future 1 is worth', value: (pv / v.FV).toFixed(2) });
    rows.push({ label: 'Waiting one more period would make it', detail: true,
                value: money(pv / (1 + v.rate / 100)) });
    return rows;
  },
  series: v => {
    if (!(v.FV > 0)) return { points: [] };
    const n = Math.max(1, v.n), N = Math.min(Math.max(4, Math.round(n * 4)), 60), points = [];
    for (let i = 0; i <= N; i++) {
      const p = i / N * n;
      points.push({ x: p, y: v.FV / Math.pow(1 + v.rate / 100, p) });
    }
    /* Falls away fastest at the start: the first years of waiting cost the most. */
    return {
      title: 'What the amount is worth today, the longer the wait',
      xLabel: 'Periods until it arrives',
      points, label: 'Worth today',
      yTickFmt: kmoney,
    };
  },
});
