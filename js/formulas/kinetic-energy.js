/* kinetic-energy. `num` comes from engine.js. */
registerFormula({
  id: 'kinetic-energy',
  slug: 'kinetic',
  topic: 'mechanics',
  name: 'Kinetic Energy',
  desc: 'Energy of a moving object',
  keywords: 'kinetic energy motion moving joules velocity speed mass ke',
  eq: 'KE = ½ · m · v²',
  inputs: [
    { key: 'm', label: 'Mass', unit: 'kg', hint: 'e.g. 1200' },
    { key: 'vel', label: 'Velocity', unit: 'm/s', hint: 'e.g. 25' },
  ],
  output: { label: 'Kinetic energy', unit: 'J' },
  compute: v => 0.5 * v.m * v.vel * v.vel,
  format: num,
});
