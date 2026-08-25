/* G-5 — does the CORRECTED compositor still catch a real contrast failure?
   -----------------------------------------------------------------------------
   A correction that clears three reds has to answer one question before it is
   allowed to stand: can the thing it corrected still fail? A compositor that
   returned "plenty of contrast" for every input would also have cleared those
   three, and would also have printed a clean V-2 — and would be worthless.

   So this injects nodes whose answer is known in advance, THROUGH THE PATH THAT
   WAS CHANGED: every case below stacks a translucent layer behind another
   translucent layer, because with an opaque ground the old and new formulas are
   identical and the test would prove nothing about the edit.

   Two of the four must come out RED and two must come out GREEN. A run in which
   all four agree with the floor is a failed self-test, not a pass.           */
import { chromium, serveDist, DIST, PHONE, importFile, audit } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';

/* ink / mid layer / outer layer, all over the app's own opaque void-0 body.
   `expect` is derived by hand from premultiplied source-over, not from a run. */
const CASES = [
  { id: 'A', ink: '#3a3730', mid: 'rgba(28,26,21,0.6)',   out: 'rgba(255,255,255,0.04)', expect: 'RED',
    why: 'near-black ink on the exact stack the Persona badges use — must fail' },
  { id: 'B', ink: '#bfb5a0', mid: 'rgba(28,26,21,0.6)',   out: 'rgba(255,255,255,0.04)', expect: 'GREEN',
    why: 'the real Persona badge: forge-1 on void-2/60 in a white/4% button' },
  { id: 'C', ink: '#4a4a48', mid: 'rgba(255,255,255,0.10)', out: 'rgba(255,255,255,0.06)', expect: 'RED',
    why: 'grey ink on two stacked white washes — the old formula would call this ground near-white' },
  { id: 'D', ink: '#f0e6d3', mid: 'rgba(255,255,255,0.10)', out: 'rgba(255,255,255,0.06)', expect: 'GREEN',
    why: 'forge-0 on the same two washes' },
];

const srv = await serveDist(DIST, 5936);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(800);

await page.evaluate(cases => {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:8px;top:120px;z-index:2147483647;background:#0a0a08';
  for (const c of cases) {
    const outer = document.createElement('div');
    outer.style.cssText = `background:${c.out};padding:2px`;
    const mid = document.createElement('div');
    mid.style.cssText = `background:${c.mid};padding:2px`;
    const span = document.createElement('span');
    span.style.cssText = `color:${c.ink};font-size:14px;display:inline-block`;
    span.textContent = `SELFTEST-${c.id}`;
    mid.appendChild(span); outer.appendChild(mid); host.appendChild(outer);
  }
  document.body.appendChild(host);
}, CASES);
await page.waitForTimeout(200);

const { text } = await audit(page);
let bad = 0;
console.log('\n\x1b[1m── corrected bgOf, four known answers ──\x1b[0m');
for (const c of CASES) {
  const n = text.find(t => t.t === `SELFTEST-${c.id}`);
  if (!n) { console.log(`  ${c.id}  \x1b[31mNOT FOUND in the walk\x1b[0m — the self-test itself is broken`); bad++; continue; }
  const got = n.contrast === null ? 'UNMEASURED' : n.contrast < 4.5 ? 'RED' : 'GREEN';
  const ok = got === c.expect;
  if (!ok) bad++;
  console.log(`  ${c.id}  ${String(n.contrast).padStart(6)}:1  expected ${c.expect.padEnd(5)} got ${got.padEnd(10)} ` +
    `${ok ? '\x1b[32mok\x1b[0m' : '\x1b[31mWRONG\x1b[0m'}   ${c.why}`);
}
console.log(bad
  ? `\n  \x1b[31m${bad} case(s) wrong — the corrected compositor does NOT stand\x1b[0m`
  : `\n  \x1b[32mall four as predicted — the grader still fails what should fail, on the changed path\x1b[0m`);
await browser.close(); srv.close();
process.exit(bad ? 1 : 0);
