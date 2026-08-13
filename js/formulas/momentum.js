/* momentum. `num` comes from engine.js. */
registerFormula({
  id: 'momentum',
  topic: 'mechanics',
  name: 'Momentum',
  desc: 'Quantity of motion',
  keywords: 'momentum motion impulse mass velocity collision p=mv',
  eq: 'p = m · v',
  inputs: [
    { key: 'm', label: 'Mass', unit: 'kg', hint: 'e.g. 1200' },
    { key: 'vel', label: 'Velocity', unit: 'm/s', hint: 'e.g. 25' },
  ],
  output: { label: 'Momentum', unit: 'kg·m/s' },
  compute: v => v.m * v.vel,
  format: num,
});
