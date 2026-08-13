/* Helpers shared by Engineering Mechanics formulas. Loaded only on a mechanics
   formula page, ahead of the formula itself. `num` comes from engine.js. */

/* Unit systems for the pressure-vessel calculators.

   The Lamé equations are homogeneous: stress comes out in whatever unit the
   pressure went in, and the radii appear only as ratios, so the length unit
   cancels. The choice therefore relabels the page and converts nothing — which
   is why switching it leaves every number where it was and still gives a
   correct answer, as long as your own figures are all in the one system. */
const VESSEL_UNITS = [
  { value: 0, label: 'SI — MPa and mm', pressure: 'MPa', length: 'mm' },
  { value: 1, label: 'English — psi and inches', pressure: 'psi', length: 'in' },
];
function vesselUnits(v) { return VESSEL_UNITS[+v.sys === 1 ? 1 : 0]; }

/* The units to write against each field, given the system picked. */
function vesselUnitsFor(v) {
  const u = vesselUnits(v);
  return { p: u.pressure, po: u.pressure, di: u.length, t: u.length };
}

/* Lamé for a thick wall sphere: inner radius a, outer b, internal pressure p,
   external po, evaluated at radius r. Hoop is equal in every direction around
   the surface, hence the single value, and carries half the pressure term that
   a cylinder does. */
function sphereStresses(p, po, a, b, r) {
  const d = b * b * b - a * a * a;
  const common = (p * a * a * a - po * b * b * b) / d;
  const term = (p - po) * a * a * a * b * b * b / (d * r * r * r);
  return { hoop: common + term / 2, radial: common - term };
}

/* Lamé for a thick wall cylinder. `axial` is the closed-end case, uniform
   across the wall; an open-ended cylinder carries none. */
function cylinderStresses(p, po, a, b, r) {
  const d = b * b - a * a;
  const common = (p * a * a - po * b * b) / d;
  const term = (p - po) * a * a * b * b / (d * r * r);
  return { hoop: common + term, radial: common - term, axial: common };
}

/* Von Mises from three principal stresses. */
function vonMises(s1, s2, s3) {
  return Math.sqrt(0.5 * ((s1 - s2) ** 2 + (s2 - s3) ** 2 + (s3 - s1) ** 2));
}
