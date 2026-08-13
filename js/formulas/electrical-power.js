/* electrical-power. `num` comes from engine.js. */
registerFormula({
  id: 'electrical-power',
  slug: 'power',
  topic: 'mechanics',
  name: 'Electrical Power Calculator',
  short: 'Electrical Power',
  desc: 'Power drawn from voltage and current',
  keywords: 'electrical power watts voltage current amps P=VI kilowatt kwh consumption load appliance supply draw energy',
  title: 'Electrical Power Calculator: Watts from Volts and Amps',
  blurb: 'Watts from a voltage and a current, with what that comes to in a day and the resistance the load is behaving as.',
  about: [
    'Power is how fast energy is being used, and for a direct-current load it is simply the voltage across it times the current through it. A 240 V supply drawing 5 A is 1,200 W, which is 1.2 kW, which over an hour is 1.2 kWh — the unit an electricity bill is written in.',
    'The same power can be drawn at any voltage, and the current is what changes. That is the argument for high-voltage transmission: carrying 1,200 W at 240 V needs 5 A, but at 24 V it needs 50 A, and the heat lost in the cable goes with the square of the current, so the low-voltage version wastes a hundred times as much in the wire.',
    'This is the direct-current case, and it holds for alternating current only where the load is purely resistive — a heater or a filament lamp. Motors, transformers and anything with a switched-mode supply draw current out of step with the voltage, and their real power is V · I · cos φ, below what this gives. It also takes the current as steady, so a motor’s starting surge is not in it.',
  ],
  eq: 'P = V · I',
  inputs: [
    { key: 'V', label: 'Voltage', unit: 'V', hint: 'e.g. 240' },
    { key: 'I', label: 'Current', unit: 'A', hint: 'e.g. 5' },
  ],
  output: { label: 'Power', unit: 'W' },
  compute: v => v.V * v.I,
  format: num,
  defaults: { V: 240, I: 5 },
  extras: (v, P) => {
    const rows = [{ label: 'In kilowatts', value: num(P / 1000) + ' kW' }];
    if (!(P > 0)) return rows;
    rows.push({ label: 'Left on for a day', value: num(P * 24 / 1000) + ' kWh' });
    if (v.I > 0) {
      rows.push({ label: 'The load is behaving as a resistance of', detail: true,
                  value: num(v.V / v.I) + ' Ω' });
    }
    /* Same power at a lower voltage means proportionally more current, and
       cable loss follows the square of it - the case for high-voltage supply. */
    if (v.V > 0) {
      rows.push({ label: 'At a tenth of the voltage the same power would draw',
                  wide: true, detail: true,
                  value: num(v.I * 10) + ' A, wasting 100× as much heat in the cable' });
    }
    return rows;
  },
});
