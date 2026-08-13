/* Broad topics shown on the home page.
   To add a topic: add an entry here, then create js/<topic>.js with its
   formulas and include it in index.html. */
/* The id is the address — /topics/mechanics/ — and is left alone when a name
   changes, so a renamed topic does not throw away the page it already had. */
registerTopics([
  { id: 'finance',     icon: '💰', name: 'Finance',              desc: 'Loans, annuities, growing income' },
  { id: 'mechanics',   icon: '⚙️', name: 'Engineering Mechanics', desc: 'Work done by a force' },
]);
