/* Copyright (c) 2026 useFormula. All rights reserved.
   Not open source. Published to be read, not reused: see LICENSE and
   https://useformula.com/terms/ */
/* Runs last, after every topic file has registered its formulas.
   Starts the hash router and renders the current page. */
window.addEventListener('hashchange', route);
route();
