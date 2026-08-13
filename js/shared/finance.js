/* Helpers shared by Finance formulas. Loaded only on a Finance formula page,
   ahead of the formula itself. `money`, `num`, `kmoney` come from engine.js. */

/* Walks a loan month by month at monthly rate r, paying M each month.
   opts.extraPerMonth  adds to every payment
   opts.lumpAmount     a single extra payment, made in opts.lumpMonth
   Returns a row per month (running balance, principal paid, interest paid) plus
   the totals, or null if a payment would never cover the interest owed. */
function loanSchedule(P, r, M, opts) {
  opts = opts || {};
  const perMonth = opts.extraPerMonth || 0;
  const lump = opts.lumpAmount || 0;
  const lumpMonth = opts.lumpMonth || 0;
  const maxMonths = opts.maxMonths || 1200;

  const rows = [{ month: 0, balance: P, principalPaid: 0, interestPaid: 0 }];
  let balance = P, paidPrincipal = 0, paidInterest = 0, month = 0;
  while (balance > 0.005 && month < maxMonths) {
    month++;
    const owed = balance * r;
    const payment = M + perMonth + (lump > 0 && month === lumpMonth ? lump : 0);
    let toPrincipal = payment - owed;
    if (toPrincipal <= 0) return null;
    if (toPrincipal > balance) toPrincipal = balance;
    balance -= toPrincipal;
    paidPrincipal += toPrincipal;
    paidInterest += owed;
    rows.push({ month, balance, principalPaid: paidPrincipal, interestPaid: paidInterest });
  }
  return { rows, months: month, interest: paidInterest };
}

/* What is actually borrowed, once the downpayment is taken off the total. */
function loanPrincipal(v) {
  const pct = Math.min(100, Math.max(0, v.downPct || 0));
  return Math.max(0, (v.total || 0) * (1 - pct / 100));
}

/* Thins a schedule down to at most 60 plotted points. */
function schedulePoints(rows, key) {
  const last = rows.length - 1;
  if (last < 1) return [];
  const steps = Math.min(last, 60), out = [];
  for (let i = 0; i <= steps; i++) {
    const row = rows[Math.round(i / steps * last)];
    out.push({ x: row.month / 12, y: row[key] });
  }
  return out;
}

/* Blank or zero means "halfway through the term", the documented default. */
function extraPaymentMonth(v) {
  const year = v.extraAt > 0 ? v.extraAt : v.years / 2;
  return Math.max(1, Math.round(year * 12));
}

/* Future value of n payments of PMT, earning r per period, each payment g
   larger than the one before. g = 0 is the ordinary annuity. Equal rates
   would divide by zero in the general form, so that case uses the limit it
   approaches, PMT · n · (1+r)ⁿ⁻¹, which also covers r = g = 0. */
function annuityFV(PMT, r, g, n) {
  if (!(n > 0)) return 0;
  if (Math.abs(r - g) < 1e-9) return PMT * n * Math.pow(1 + r, n - 1);
  return PMT * (Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g);
}

/* What was handed over, before any return on it: n payments starting at PMT
   and growing g each period. */
function annuityPaidIn(PMT, g, n) {
  if (!(n > 0)) return 0;
  return g === 0 ? PMT * n : PMT * (Math.pow(1 + g, n) - 1) / g;
}

/* Compounds per year. Blank in the panel means the plain yearly case, and the
   engine hands a blank optional input over as 0 — which would divide by zero
   in r/m — so anything not positive is read as once a year. */
function compoundsPerYear(v) { return v.m > 0 ? v.m : 1; }

/* Says the frequency the way a person would, for chart legends and notes. */
function compoundingName(m) {
  const named = { 1: 'yearly', 2: 'twice a year', 4: 'quarterly', 12: 'monthly',
                  26: 'fortnightly', 52: 'weekly', 365: 'daily' };
  return named[m] || (+m.toFixed(2)) + ' times a year';
}

/* Periods needed to get from `now` to `goal`, earning r per period and paying
   in PMT at the end of each one. Rearranged from the balance after n periods,

     A = P(1+r)ⁿ + PMT · ((1+r)ⁿ − 1) / r
       = (1+r)ⁿ · (P + PMT/r) − PMT/r

   which solves exactly, no searching:

     n = ln( (A + PMT/r) / (P + PMT/r) ) / ln(1+r)

   Returns null when the goal is out of reach — no growth and nothing paid in,
   or a balance the payments can never lift because they only replace what the
   negative rate takes. */
function periodsToGoal(now, pmt, r, goal) {
  if (goal <= now) return 0;
  if (r === 0) return pmt > 0 ? (goal - now) / pmt : null;
  const base = pmt / r;
  if (now + base <= 0 || goal + base <= 0) return null;
  const n = Math.log((goal + base) / (now + base)) / Math.log(1 + r);
  return isFinite(n) && n > 0 ? n : null;
}

/* Balance after n periods, same convention: payment at the end of each. */
function balanceAfter(now, pmt, r, n) {
  if (n <= 0) return now;
  if (r === 0) return now + pmt * n;
  return now * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r;
}
