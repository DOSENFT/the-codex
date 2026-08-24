/* CONTROL for A-20 — the save alarm must not sit on top of the controls.
   ---------------------------------------------------------------------------
   Independent verification measured `SaveAlarm` at 31% of a 390×844 screen,
   anchored to the BOTTOM — which in this app is where every fixed control
   lives: the tab bar, the dice roller, and the Veil. F-5 says the Veil may
   never be missing. A banner that says "keep playing" while covering the
   button you press when you need out is the opposite of what it claims.

   This raises the alarm for real — by making localStorage refuse `codex-*`
   writes and then spending — and then measures, geometrically, every fixed
   control the alarm's rectangle overlaps. It does not ask whether the alarm
   looks fine. It asks which controls you can no longer touch.

     want    0 fixed controls overlapped, on all seven screens
     before  the tab bar, the Veil and the dice roller, on all seven

   `--prev` runs it against the pre-A-20 worktree. A fix that cannot be
   watched failing here is not proven. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, goScreen, SCREENS, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

const PREV = 'C:/Users/marcu/AppData/Local/Temp/codex-a20/dist';
const prev = process.argv.includes('--prev');
const dir = prev ? PREV : DIST;
const label = prev ? 'PREV (alarm anchored bottom)' : 'HEAD (alarm anchored under the header)';
const port = prev ? 4292 : 4293;

/** Break storage the way D-5 does, so the alarm is raised by the app itself. */
const breakStorage = page => page.evaluate(() => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = proto.setItem;
  window.__realSet = real;
  proto.setItem = function (k, v) {
    if (String(k).startsWith('codex-')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    return real.call(this, k, v);
  };
});
const healStorage = page => page.evaluate(() => {
  if (window.__realSet) Object.getPrototypeOf(localStorage).setItem = window.__realSet;
});

/* Every control that is `position: fixed` — the ones a player cannot scroll
   out from under, which is what makes covering them different in kind from
   covering the page. */
const OVERLAP = () => {
  const alarm = document.querySelector('[role="alert"]');
  if (!alarm) return { raised: false };
  const a = alarm.getBoundingClientRect();
  const vh = innerHeight, vw = innerWidth;
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea';
  const hit = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (alarm.contains(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue;
    let fixed = false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') { fixed = true; break; }
    }
    if (!fixed) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const iw = Math.min(r.right, a.right) - Math.max(r.left, a.left);
    const ih = Math.min(r.bottom, a.bottom) - Math.max(r.top, a.top);
    if (iw > 0 && ih > 0) {
      const frac = (iw * ih) / (r.width * r.height);
      hit.push({
        name: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 26),
        pct: Math.round(frac * 100),
      });
    }
  }
  return {
    raised: true,
    share: Math.round((a.height / vh) * 100),
    box: `${Math.round(a.width)}x${Math.round(a.height)} at y=${Math.round(a.top)} of ${vh}`,
    vw, hit,
  };
};

const srv = await serveDist(dir, port);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

console.log(`\n\x1b[1mA-20 does the save alarm cover a fixed control — ${label}\x1b[0m  ${dir}\n`);

/* Raise it ONCE, on the one screen that reliably has a spend control, and then
   walk the tabs WITHOUT dismissing it. `saveError` lives at the App level, so
   the alarm survives navigation — which is also the real situation: a failed
   write on Combat and then you go looking through the Grimoire. Driving a
   separate write on each screen was the first version of this, and it silently
   scored five of the seven "NOT TESTED" because prep screens have no Heal
   button. A control that quietly measures two sevenths of what it claims is
   the exact failure this document exists to stop. */
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await settle(page);
await breakStorage(page);
let drove = false;
for (const rx of [/^Heal 5$/i, /Heal 5/i, /Expend/i, /Short Rest/i, /Long Rest/i]) {
  const btn = page.getByRole('button', { name: rx }).first();
  if (await btn.count()) { await btn.click({ timeout: 2000 }).catch(() => {}); drove = true; break; }
}
await page.waitForTimeout(900);
await healStorage(page);
const raised = await page.evaluate(() => !!document.querySelector('[role="alert"]'));
if (!raised) {
  console.log(`  \x1b[31mthe alarm never raised${drove ? ' despite a driven write' : ' — no writing control found'}; nothing was measured\x1b[0m\n`);
  await ctx.close(); await b.close(); await srv.close();
  process.exit(1);
}

let worst = 0, tested = 0;
for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const o = await page.evaluate(OVERLAP);
  if (!o.raised) {
    console.log(`  ${s.id.padEnd(16)} \x1b[33mthe alarm did not survive to this screen\x1b[0m — NOT TESTED`);
    continue;
  }
  tested++;
  worst = Math.max(worst, o.hit.length);
  const verdict = o.hit.length ? `\x1b[31m${o.hit.length} covered\x1b[0m` : '\x1b[32mclear\x1b[0m';
  console.log(`  ${s.id.padEnd(16)} ${verdict}  ${o.box}, ${o.share}% of screen`);
  for (const h of o.hit) console.log(`        «${h.name}» ${h.pct}% under the alarm`);
}

const ok = tested === SCREENS.length && worst === 0;
console.log(`\n  ${ok ? '\x1b[32mA-20 PASSES\x1b[0m' : '\x1b[31mA-20 FAILS\x1b[0m'} — ${tested} of ${SCREENS.length} screens measured, worst covered ${worst} fixed control(s)\n`);

await ctx.close(); await b.close(); await srv.close();
