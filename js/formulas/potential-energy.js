/* potential-energy. `num` comes from engine.js. */
registerFormula({
  id: 'potential-energy',
  topic: 'mechanics',
  name: 'Gravitational Potential Energy',
  short: 'Potential Energy',
  desc: 'Energy stored due to height',
  keywords: 'gravitational potential energy height gravity stored mgh pe',
  eq: 'PE = m · g · h',
  inputs: [
    { key: 'm', label: 'Mass', unit: 'kg', hint: 'e.g. 5' },
    { key: 'g', label: 'Gravity', unit: 'm/s²', hint: '9.81 on Earth' },
    { key: 'h', label: 'Height', unit: 'm', hint: 'e.g. 10' },
  ],
  output: { label: 'Potential energy', unit: 'J' },
  compute: v => v.m * v.g * v.h,
  format: num,
});
