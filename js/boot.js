/* Runs last, after every topic file has registered its formulas.
   Starts the hash router and renders the current page. */
window.addEventListener('hashchange', route);
route();
