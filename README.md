# useFormula

A single-page formula calculator site. Browse formulas by topic (Finance, Mechanics,
Geometry, Electrical) or search by name/keyword, enter your known values, and get the answer.

- **Live site:** https://useFormula.com
- **Tech:** one self-contained `index.html` — plain HTML/CSS/JS, no build step, no dependencies.
- **Hosting:** GitHub Pages with a custom domain (see `CNAME`).

## Editing formulas

Everything is data-driven inside `index.html`:

- **Add a topic** → add an entry to the `TOPICS` array.
- **Add a formula** → add an object to the `FORMULAS` array (id, topic, name, desc, eq,
  inputs, output, compute, format).
- **Add search keywords** → add a line to the `KEYWORDS` map, keyed by the formula's `id`.

## Local preview

Just open `index.html` in any browser (double-click). No server required.
