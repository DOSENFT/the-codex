/* G-5 — are the three reported regressions actually absent from the shipped CSS?
   _g5-css-used.mjs matches a dropped BARE class against class-attribute tokens
   with a variant-tolerant rule (`scale-105` matches `hover:scale-105`). That
   tolerance is right for finding candidates and wrong for concluding, because
   the deploy only needs SOME rule that styles the token the app writes. So the
   token as authored is looked for literally in the built stylesheet here, with
   Tailwind's escaping applied, and that reading is the one that decides. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/marcu/Documents/Powerhouse/projects/the-codex';
const dir = join(ROOT, 'dist/assets');
const css = readFileSync(join(dir, readdirSync(dir).find(f => /\.css$/.test(f))), 'utf8');

/* How Tailwind writes a candidate as a selector: every char outside
   [A-Za-z0-9_-] is backslash-escaped. */
const asSelector = t => '.' + [...t].map(c => /[A-Za-z0-9_-]/.test(c) ? c : '\\' + c).join('');

const TOKENS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['hover:border-gold/50', 'hover:scale-105', 'active:scale-[0.98]',
     'scale-105', 'scale-[0.98]', 'border-gold/50',
     'flex', 'hover:bg-white/5'];   /* the last two are controls: they must be found */

let bad = 0;
for (const t of TOKENS) {
  const sel = asSelector(t);
  const at = css.indexOf(sel);
  /* Guard against a prefix match: `.scale-105` must not be satisfied by
     `.scale-1050`. The next char has to end the identifier. */
  const ok = at >= 0 && !/[A-Za-z0-9_-]/.test(css[at + sel.length] || '');
  if (!ok) bad++;
  console.log(`${ok ? '\x1b[32mPRESENT\x1b[0m' : '\x1b[31mABSENT \x1b[0m'}  ${t.padEnd(22)} ${ok ? css.slice(at, css.indexOf('{', at)).trim().slice(0, 70) : sel}`);
}
console.log(`\n${bad} of ${TOKENS.length} absent.`);
