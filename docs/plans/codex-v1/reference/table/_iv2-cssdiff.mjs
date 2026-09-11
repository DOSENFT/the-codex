/* IV2 probe — is the graded dist/ the same CSS as a build of the committed tree? */
import { readFileSync } from 'node:fs';
const A = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex/dist/assets/index-L5FCBNSa.css';
const B = 'C:/Users/marcu/AppData/Local/Temp/iv2-tree-cd937f5/dist/assets/index-BmdvTWL5.css';
const classes = p => {
  const s = readFileSync(p, 'utf8');
  const out = new Set();
  const re = /\.((?:\\.|[A-Za-z0-9_-])+)(?=[\s,:{[.>~+])/g;
  let m; while ((m = re.exec(s))) out.add(m[1].replace(/\\/g, ''));
  return out;
};
const a = classes(A), b = classes(B);
const only = (x, y) => [...x].filter(v => !y.has(v)).sort();
console.log('repo-dist classes:', a.size, ' HEAD-build classes:', b.size);
const ra = only(a, b), rb = only(b, a);
console.log(`\nIn the GRADED dist/ but NOT in a build of HEAD  (${ra.length}):`);
console.log(ra.slice(0, 120).map(s => '  + ' + s).join('\n'));
console.log(`\nIn a build of HEAD but NOT in the GRADED dist/  (${rb.length}):`);
console.log(rb.slice(0, 120).map(s => '  - ' + s).join('\n'));
