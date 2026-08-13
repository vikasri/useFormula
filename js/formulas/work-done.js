/* work-done. `num` comes from engine.js. */
registerFormula({
  id: 'work-done',
  slug: 'work',
  topic: 'mechanics',
  name: 'Work Done',
  desc: 'Work from a force acting over a distance',
  keywords: 'work done force distance joules energy displacement',
  eq: 'W = F · d · cos(θ)',
  inputs: [
    { key: 'F', label: 'Force', unit: 'N', hint: 'e.g. 50' },
    { key: 'd', label: 'Distance', unit: 'm', hint: 'e.g. 8' },
    { key: 'theta', label: 'Angle to direction of motion', unit: '°', hint: '0 if same direction' },
  ],
  output: { label: 'Work', unit: 'J' },
  compute: v => v.F * v.d * Math.cos(v.theta * Math.PI / 180),
  format: num,
});
