/* newtons-second-law. `num` comes from engine.js. */
registerFormula({
  id: 'newtons-second-law',
  slug: 'force',
  topic: 'mechanics',
  name: "Newton's Second Law (Force)",
  short: 'Force (F = ma)',
  desc: 'Force from mass and acceleration',
  keywords: 'newton second law force mass acceleration f=ma dynamics push',
  eq: 'F = m · a',
  inputs: [
    { key: 'm', label: 'Mass', unit: 'kg', hint: 'e.g. 10' },
    { key: 'a', label: 'Acceleration', unit: 'm/s²', hint: 'e.g. 9.8' },
  ],
  output: { label: 'Force', unit: 'N' },
  compute: v => v.m * v.a,
  format: num,
});
