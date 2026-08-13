# useFormula

A single-page formula calculator site. Browse formulas by topic (Finance, Mechanics)
or search by name/keyword, enter your known values, and get the answer.

- **Live site:** https://useFormula.com
- **Tech:** plain HTML/CSS/JS, no dependencies. One build step: `tools/build-pages.py`.
- **Hosting:** GitHub Pages with a custom domain (see `CNAME`).

## Project structure

```
index.html      – home page, and the shell every other page is built from
styles.css      – all styling
js/settings.js  – on/off switches for site features
js/engine.js    – rendering, routing, calculation, sliders, charts (no data)
js/topics.js    – the broad topics (Finance, Mechanics, …)
js/finance.js   – Finance formulas
js/mechanics.js – Mechanics formulas
js/boot.js      – starts the app after all topics have registered
tools/build-pages.py – writes a real page per formula (see Addresses below)

loan/, roi/, …  – generated, do not edit
topics/…        – generated, do not edit
about/, 404.html, sitemap.xml, robots.txt – generated, do not edit
```

Generated files carry a marker comment on line 1. The script only ever rewrites or
deletes files carrying that marker, so a hand-written file cannot be clobbered.

## Addresses

Each formula has a page of its own: `/loan/`, `/compound-interest/`, `/topics/finance/`.
GitHub Pages has no rewrites, so each of those is a real `index.html` on disk, written
by the build script from the formula definitions in `js/`.

**After adding, renaming or removing a formula or topic, run:**

```
python3 tools/build-pages.py
```

Skipping it leaves the new formula reachable in the app but with no page of its own,
and missing from `sitemap.xml`. The script fails loudly rather than writing a half-built
site: an unknown topic, a duplicate id or two formulas wanting the same address all stop it.

A formula sits at its `id` unless it sets `slug`, which puts a much-used calculator on a
shorter address — `loan-payment` has `slug: 'loan'` and answers at `/loan/`.

The older `#formula/<id>` addresses still resolve, so links shared before this change
keep working.

## Editing

- **Add a topic** → add an entry to `js/topics.js`, create `js/<topic>.js` with its
  formulas, and add a `<script src="js/<topic>.js">` line to `index.html`.
- **Add a formula** → add an object to the relevant `js/<topic>.js` via
  `registerFormulas([...])` (id, topic, name, desc, keywords, eq, inputs, output,
  compute; optional format, defaults, sliders, series).
- **Hide a what-if input from the main form** → mark it `advanced: true` and give the
  formula an `advanced: { summary, intro, note }`. It renders in a collapsed panel above
  the chart, so the basic path stays short.
- **Change the About page or the disclaimer** → `renderAbout()` in `js/engine.js`, reached
  at `/about/`. The version in the page footer lives in `index.html`; re-run the build
  script afterwards so every generated page picks up the new footer.
- **Turn a feature on or off** → edit `js/settings.js`. `showEquation: false` hides the
  equation line on every formula page; inputs, the answer, sliders and charts are unaffected.
  Add a new switch by putting it in `SETTINGS` and reading it with `setting('name', default)`.
- **Change the "Most used" shortcuts** → edit the `FEATURED` list in `js/engine.js`.
- **Search keywords** live on each formula's `keywords` field, inside its topic file.

## Local preview

Assets are linked absolutely (`/styles.css`, `/js/engine.js`) so a page in a subdirectory
can find them, which means the site now needs a server — opening `index.html` from disk
no longer works. From the project root:

```
python3 -m http.server 8000
```

then visit http://localhost:8000/. Hard-reload (Cmd+Shift+R) after editing CSS or JS;
browsers hold on to both.
