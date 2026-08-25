/* The deployed CSS is 9134 bytes SMALLER than the CSS I built locally at the
   same commit. Tailwind 4 generates utilities from the files it can see, and
   my working tree holds untracked probe scripts full of selector strings that
   CI never checks out. So the local build is a superset — which is the safe
   direction only if nothing the APP uses is missing from the deploy. Check it,
   don't assume it. */
import fs from 'node:fs';
import cp from 'node:child_process';

const BS = String.fromCharCode(92);
const rules = s => new Set((s.match(/[.:#[][^{}]{0,300}\{[^{}]*\}/g) || []).map(r => r.trim()));

const local = fs.readFileSync('dist/assets/index-VZxwKkqe.css', 'utf8').replace(/\r/g, '');
const live = Buffer.from(await (await fetch(
  'https://dosenft.github.io/the-codex/assets/index-B6_zp8uA.css', { cache: 'no-store' })).arrayBuffer()).toString('utf8');

const rLive = rules(live), rLocal = rules(local);
const onlyLive = [...rLive].filter(r => !rLocal.has(r));
const onlyLocal = [...rLocal].filter(r => !rLive.has(r) && r.startsWith('.'));

/* Tailwind escapes the colon in a variant class: `md:flex` is written
   `.md\:flex`. Splitting on `:` AFTER unescaping therefore turns every variant
   rule into the bare word `md`, `dark` or `group-hover` — which then "matches"
   src and reads as a missing class the app uses. It is an artifact of the
   extractor, not a finding. Split on the UNESCAPED colon only (that one is a
   real pseudo-class), then unescape. */
const nameOf = r => r.slice(1, r.indexOf('{'))
  .split(/(?<!\\):/)[0]
  .split(/[\s,>]/)[0]
  .split(BS).join('');
const names = [...new Set(onlyLocal.map(nameOf))].filter(Boolean);

const files = cp.execSync('git ls-files src index.html', { encoding: 'utf8' }).trim().split(/\r?\n/);
const hay = files.map(f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
/* A substring match is not evidence: `md`, `dark`, `ease-in` and `group-hover`
   occur inside ordinary words and inside longer class names. Require the class
   to appear as a WHOLE TOKEN, the way it would sit in a className string —
   bounded by quote, backtick, brace or whitespace. Variants like `md:` and
   `dark:` are prefixes, so allow a trailing colon for those. */
const tok = n => {
  const esc = n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp('(^|[\\s"\'`{(])' + esc + '(:|[\\s"\'`})]|$)');
};
const used = names.filter(n => tok(n).test(hay));

console.log(`\n  rule blocks   local ${rLocal.size}   live ${rLive.size}`);
console.log(`  in LIVE but not local: ${onlyLive.length}` +
  (onlyLive.length ? ` — ${onlyLive.map(r => r.slice(0, 40)).join(' | ')}` : ''));
console.log(`  classes in local but ABSENT from the deployed CSS: ${names.length}`);
console.log('   ' + names.join(' '));
console.log(`\n  of those, appearing anywhere in COMMITTED src/ + index.html: \x1b[1m${used.length}\x1b[0m`);
console.log(used.length
  ? `  \x1b[31m-> ${used.join('  ')}\x1b[0m — the deploy is missing CSS the app uses`
  : '  \x1b[32m-> none. Every absent class comes from files that are not part of the app.\x1b[0m');
console.log('');
process.exit(used.length ? 1 : 0);
