/* ohms-law. `num` comes from engine.js. */
registerFormula({
  id: 'ohms-law',
  slug: 'ohms',
  topic: 'mechanics',
  name: "Ohm's Law Calculator",
  short: "Ohm's Law",
  desc: 'Voltage from current and resistance',
  keywords: 'ohms law ohm voltage current resistance volts amps amperes ohms V=IR circuit electrical resistor drop',
  title: "Ohm's Law Calculator: Voltage, Current and Resistance",
  blurb: 'Voltage from a current and a resistance, with the power the resistor turns into heat alongside it.',
  about: [
    'Push a current through a resistance and a voltage appears across it, in proportion to both. Double the current or double the resistance and the voltage doubles. That proportionality is the law, and it is why a resistor of a known value can be used to read a current by measuring the voltage across it.',
    'The units have to match the numbers. Amps with ohms give volts; milliamps with ohms give millivolts, and kilohms with milliamps give volts again. Most of the wrong answers here come from mixing those rather than from the arithmetic — 20 mA through 470 Ω is 9.4 V, not 9,400.',
    'It holds for an ohmic conductor at a steady temperature, which covers ordinary resistors and wire well and semiconductors, lamps and motors badly: a filament lamp draws far less current when cold than its hot resistance suggests. For alternating current, resistance alone is not the whole story either, since capacitance and inductance add reactance the same equation does not carry.',
  ],
  eq: 'V = I · R',
  inputs: [
    { key: 'I', label: 'Current', unit: 'A', hint: 'e.g. 0.02 for 20 mA' },
    { key: 'R', label: 'Resistance', unit: 'Ω', hint: 'e.g. 470' },
  ],
  output: { label: 'Voltage', unit: 'V' },
  compute: v => v.I * v.R,
  format: num,
  defaults: { I: 0.02, R: 470 },
  extras: (v, V) => {
    const P = V * v.I;
    const rows = [{ label: 'Power turned into heat', value: num(P) + ' W' }];
    if (!(P > 0)) return rows;
    rows.push({ label: 'Energy in an hour', value: num(P) + ' Wh' });
    /* Resistors are sold by the wattage they can shed, so the nearest common
       rating above the figure above is the one this circuit needs. */
    const ratings = [0.125, 0.25, 0.5, 1, 2, 5, 10, 25, 50];
    const fits = ratings.find(w => w >= P * 2);
    rows.push({ label: 'Smallest common resistor rating with 2× headroom',
                wide: true, detail: true,
                value: fits ? fits + ' W' : 'above 50 W — needs a wirewound or a heatsink' });
    return rows;
  },
});
