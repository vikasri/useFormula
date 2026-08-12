# useFormula

A single-page formula calculator site. Browse formulas by topic (Finance, Mechanics)
or search by name/keyword, enter your known values, and get the answer.

- **Live site:** https://useFormula.com
- **Tech:** plain HTML/CSS/JS, no build step, no dependencies.
- **Hosting:** GitHub Pages with a custom domain (see `CNAME`).

## Project structure

```
index.html      – page shell; loads the CSS and the scripts (in order)
styles.css      – all styling
js/engine.js    – rendering, routing, calculation, sliders, charts (no data)
js/topics.js    – the broad topics (Finance, Mechanics, …)
js/finance.js   – Finance formulas
js/mechanics.js – Mechanics formulas
js/boot.js      – starts the app after all topics have registered
```

The topic files use plain `<script>` tags (not ES modules) so the site also works
when `index.html` is opened directly from disk (double-click), not just over http.

## Editing

- **Add a topic** → add an entry to `js/topics.js`, create `js/<topic>.js` with its
  formulas, and add a `<script src="js/<topic>.js">` line to `index.html`.
- **Add a formula** → add an object to the relevant `js/<topic>.js` via
  `registerFormulas([...])` (id, topic, name, desc, keywords, eq, inputs, output,
  compute; optional format, defaults, sliders, series).
- **Change the "Most used" shortcuts** → edit the `FEATURED` list in `js/engine.js`.
- **Search keywords** live on each formula's `keywords` field, inside its topic file.

## Local preview

Open `index.html` in any browser (double-click). No server required.
