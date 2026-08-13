/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* Helpers shared by Engineering Mechanics formulas. Loaded only on a mechanics
   formula page, ahead of the formula itself. `num` comes from engine.js. */

/* Unit systems for the pressure-vessel calculators.

   The Lamé equations are homogeneous: stress comes out in whatever unit the
   pressure went in, and the radii appear only as ratios, so the length unit
   cancels. The choice therefore relabels the page and converts nothing — which
   is why switching it leaves every number where it was and still gives a
   correct answer, as long as your own figures are all in the one system. */
const VESSEL_UNITS = [
  { value: 0, label: 'SI (MPa, mm)', pressure: 'MPa', length: 'mm' },
  { value: 1, label: 'English (psi, inches)', pressure: 'psi', length: 'in' },
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

/* A disk of uniform thickness spinning about its centre, plane stress. `scale`
   carries the unit system: see DISK_UNITS below. ω is in rad/s either way.

     σr(r) = k(a² + b² − a²b²/r² − r²)
     σθ(r) = k(a² + b² + a²b²/r² − r²(1+3ν)/(3+ν))     k = (3+ν)ρω²/8

   Nothing presses on either face, so σr is zero at both and peaks in between,
   at r = √(ab). σθ is largest at the bore. */
function diskStresses(rho, omega, nu, a, b, r, scale) {
  const k = (3 + nu) * rho * omega * omega / 8 * (scale === undefined ? 1 / 1e12 : scale);
  const aa = a * a, bb = b * b, rr = r * r;
  return {
    radial: k * (aa + bb - aa * bb / rr - rr),
    hoop: k * (aa + bb + aa * bb / rr - rr * (1 + 3 * nu) / (3 + nu)),
  };
}

/* Poisson's ratio, 0.3 unless the panel says otherwise. Blank arrives as 0. */
function diskPoisson(v) { return v.nu > 0 ? v.nu : 0.3; }

/* rev/min to rad/s. */
function rpmToRad(rpm) { return rpm * 2 * Math.PI / 60; }

/* Unit systems for the spinning disk.

   Unlike the vessels, this one converts for real: ρω²r² carries dimensions, so
   the numbers have to change when the system does. Speed is left out of it,
   rev/min meaning the same thing either way.

   SI  ρ kg/m³, radii mm, answer MPa      scale 1/1e12
   Eng ρ lb/in³, radii in, answer psi     scale 1/g, g = 386.0886 in/s², since
                                          lb/in³ is a weight density */
const DISK_UNITS = [
  { value: 0, label: 'SI (MPa, mm, kg/m³)', stress: 'MPa', length: 'mm',
    density: 'kg/m³', speed: 'm/s', perSpeed: 1000, scale: 1 / 1e12 },
  { value: 1, label: 'English (psi, in, lb/in³)', stress: 'psi', length: 'in',
    density: 'lb/in³', speed: 'ft/s', perSpeed: 12, scale: 1 / 386.0886 },
];
function diskUnits(v) { return DISK_UNITS[+v.sys === 1 ? 1 : 0]; }
function diskUnitsFor(v) {
  const u = diskUnits(v);
  return { do: u.length, di: u.length, rho: u.density };
}

/* 1 in = 25.4 mm exactly; 1 lb/in³ = 27679.905 kg/m³; 1 MPa = 145.0377 psi;
   1 lbf = 4.4482216 N. */
const MM_PER_IN = 25.4, KGM3_PER_LBIN3 = 27679.905, PSI_PER_MPA = 145.0377377,
      N_PER_LBF = 4.4482216152605;

/* Rewrite one field when the unit system changes.

   Converting the rounded figure on screen loses a little each way: 500 mm
   becomes 19.685 in, and back again 499.999. So when a field still holds
   exactly what the last switch wrote, put back the number it came from. */
function convertField(key, factor) {
  const el = document.getElementById('in_' + key);
  const n = el ? parseFloat(el.value) : NaN;
  if (!isFinite(n)) return;
  const was = el.value;
  el.value = (el.dataset.wrote === was && el.dataset.from !== undefined)
    ? el.dataset.from
    : +(n * factor).toPrecision(6);
  el.dataset.from = was;
  el.dataset.wrote = el.value;
}
