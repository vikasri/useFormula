# useFormula

A single-page formula calculator site. Browse formulas by topic (Finance, Mechanics)
or search by name/keyword, enter your known values, and get the answer.

- **Live site:** https://useFormula.com
- **Tech:** plain HTML/CSS/JS, no dependencies. One build step: `tools/build-pages.py`.
- **Hosting:** GitHub Pages with a custom domain (see `CNAME`).

## Project structure

```
tools/shell.html – the page shell every page is built from (hand-edited)
index.html      – generated home page, do not edit
styles.css      – all styling
favicon.svg     – tab icon
googlec1002dac1a6bd1f0.html – Google Search Console verification. Hand-placed,
                  must stay at the root and keep its exact contents, or the
                  property is unverified and the sitemap stops being read.
js/settings.js  – on/off switches for site features
js/engine.js    – rendering, routing, calculation, sliders, charts (no data)
js/topics.js    – the broad topics (Finance, Mechanics, …)
js/formulas/<id>.js – one formula each: inputs, compute, chart, everything
js/shared/<topic>.js – helpers several formulas in a topic share (optional)
js/index.js     – generated; every formula's name/desc/keywords, nothing more
js/boot.js      – starts the app
tools/build-pages.py – writes a real page per formula (see Addresses below)

index.html, loan/, roi/, … – generated, do not edit
topics/…        – generated, do not edit
about/, 404.html, sitemap.xml, robots.txt – generated, do not edit
```

Generated files carry a marker comment on line 1. The script only ever rewrites or
deletes files carrying that marker, so a hand-written file cannot be clobbered. Two
runs in a row produce byte-identical output, so a rebuild never shows up as a diff
unless something really changed.

## What a page loads

A calculator's page loads the engine, `js/index.js`, its topic's shared helpers if
that file exists, and **its own definition only** — never any other formula's:

```
/js/settings.js  /js/engine.js  /js/topics.js  /js/index.js
/js/shared/finance.js          ← only if js/shared/<topic>.js exists
/js/formulas/loan-payment.js   ← only this one
/js/boot.js
```

`js/index.js` is generated and holds just the descriptive fields (id, slug, topic,
name, short, desc, keywords) for every formula — enough for the cards, the search box
and the related links. The definitions stay in `js/formulas/<id>.js` and are only ever
fetched by that formula's own page. The build script writes the `<script>` tags per
page, so this stays true without anyone having to remember it.

That keeps a page the same weight at 100 formulas as at 10: `/loan/` is ~61 KB
uncompressed, ~19 KB over the wire. The only part that grows is `js/index.js`
(~2.8 KB today, ~25 KB at 100 formulas, ~9 KB gzipped). If that ever gets heavy, the
`keywords` field is the bulk of it and could move to a file the search box loads on
demand — not worth doing before it matters.

## Addresses

Each formula and topic has a page of its own at the root: `/loan/`, `/compound/`,
`/finance/`. Topics and formulas share that space, so the build refuses a formula
slug that matches a topic id, and either that matches a file already at the root.
GitHub Pages has no rewrites, so each of those is a real `index.html` on disk, written
by the build script from the formula definitions in `js/`.

**After adding, renaming or removing a formula or topic, run:**

```
python3 tools/build-pages.py
```

Skipping it leaves the new formula reachable in the app but with no page of its own,
and missing from `sitemap.xml` and the home page. The script fails loudly rather than writing a half-built
site: an unknown topic, a duplicate id or two formulas wanting the same address all stop it.

A formula sits at its `id` unless it sets `slug`. Addresses are **one word wherever the
word is free** — `/loan/`, `/annuity/`, `/compound/`, `/force/`, `/kinetic/`, `/work/` —
and only take a hyphen when one word will not do the job — `/present-value/`, because no
single word says it.
Keep to that when adding formulas; the build refuses two formulas wanting the same
address, or a slug that would shadow a file at the site root.

Changing a slug is free today because nothing is indexed yet. Once Google has a page,
changing its address loses whatever standing it had — GitHub Pages cannot issue a
redirect, so the old URL would just 404. Pick the address when you add the formula.

The older `#formula/<id>` addresses still resolve, so links shared before this change
keep working.

Each generated page carries its own `<title>`, meta description, canonical URL, Open
Graph tags and a `BreadcrumbList` in JSON-LD, plus the heading, equation and input
names as real text — so a crawler sees the calculator without running any JavaScript.
`sitemap.xml` takes each page's `lastmod` from the source file it was built from, not
from the day the build ran, so rebuilding does not claim unchanged pages are new.

Every calculator also lists the others in its topic at the foot of the page. That is
the main thing keeping new formulas reachable as the site grows: the home page only
has room for a handful.

## Simple first, complications next

A calculator opens on the plain case, with only the fields that case needs. Anything
that generalises it goes in the `advanced` panel, blank or zero by default, so the page
answers the common question immediately and the fuller one on request.

That is why there is one annuity and not two: the ordinary annuity is the growing
annuity with growth 0, so `/annuity/` opens level and the panel turns on growth. The
same shape as `/loan/`, where the payment is the answer and the extra payment is the
panel. Prefer generalising an existing formula this way over adding a near-duplicate —
one page collects the search traffic for both, and there is only one piece of maths to
keep right.

Give the panel an `intro` saying what it is for and a `note(v, answer)` reporting what
it did, and have `series` add a dashed line for the base case so the difference is
visible rather than asserted.

## Being found

Titles, meta descriptions and the words on the page are what a search engine has to
work with, so three optional fields on a formula exist for it:

- `title` — the `<title>`, when the formula's name is not what someone would type
  into a search box. Used verbatim; keep it under ~60 characters or Google clips it.
- `blurb` — the meta description. Does not affect ranking, decides whether the result
  gets clicked. ~155 characters.
- `about` — an array of paragraphs shown under the calculator. This is the one that
  matters. A page with nothing but a form on it gives a search engine no reason to
  rank it above the hundred other loan calculators; a page that explains what the
  inputs mean and what the answer leaves out does.

`keywords` feeds the site's own search box, not Google — `<meta name="keywords">` has
been ignored since 2009 and is not used here. Put the words people would search for
into the title, the heading and the `about` text instead, where they count.

`/loan/` is the worked example of all three. The rest have none yet.

## Editing

- **Add a topic** → add an entry to `js/topics.js`, create `js/<topic>.js` with its
  formulas under `js/formulas/`, then run `python3 tools/build-pages.py`. No script
  tags to add by hand.
- **Add a formula** → create `js/formulas/<id>.js` with a single `registerFormula({...})`
  (id, topic, name, desc, keywords, eq, inputs, output, compute; optional format,
  defaults, sliders, series, slug), then run `python3 tools/build-pages.py`. The file
  must be named after the id and hold exactly one formula — the build fails otherwise.
  Nothing else needs editing: the index, the page, the sitemap and the script tags are
  all written for you.
- **Share a helper between formulas in a topic** → put it in `js/shared/<topic>.js`.
  It is loaded on that topic's formula pages, ahead of the formula itself.
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
