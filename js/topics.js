/* Broad topics shown on the home page.
   To add a topic: add an entry here, then create js/<topic>.js with its
   formulas and include it in index.html. */
/* The id is the address: /mechanics/. It is left alone when a name changes,
   so a renamed topic keeps the page it already had. Topics and formulas share
   the root, and tools/build-pages.py refuses an id that clashes with a slug. */
registerTopics([
  { id: 'finance',     icon: '💰', name: 'Finance',              desc: 'Loans, annuities, growing income' },
  { id: 'mechanics',   icon: '⚙️', name: 'Engineering Mechanics', desc: 'Stress in pressure vessels, rotating disks and columns' },
]);
