/* What, exactly, is A-20 now calling a "fixed control"?
   ---------------------------------------------------------------------------
   `control-a20.mjs` decides "is this chrome?" by walking ancestors for
   `position: fixed`. That was a faithful proxy on 2026-08-23, when the only
   fixed things in this app were the header, the tab bar, the Veil and the dice
   roller. It stopped being one when § 9.1b bounded the scroll region: `<main>`
   is now `fixed left-0 right-0 top-14 bottom-[…]` with `overflow-y-auto`, so
   EVERY control on the page has a fixed ancestor and the walk matches all of
   them.

   This probe does not change the control and does not change the verdict. It
   reproduces the control's own measurement exactly — same storage break, same
   OVERLAP geometry — and then, for each finding, answers the one question the
   control no longer asks:

     is this element inside <main> (it scrolls; the alarm was always allowed to
     cover it) or is it true chrome (it does not scroll; covering it is the
     defect V-9 was written to catch)?

   It also reports, for each finding, whether scrolling frees it — the same
   `room-that-frees-it` number `_v6-where.mjs` used, because "you can scroll it
   out from under" is the whole difference between the two cases. */
import { chromium, serveDist, DIST, PHONE, watch, importFile, goScreen, SCREENS, settle } from './rig.mjs';
import { realCopy } from './families.mjs';

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

const CLASSIFY = () => {
  const alarm = document.querySelector('[role="alert"]');
  if (!alarm) return { raised: false };
  const a = alarm.getBoundingClientRect();
  const main = document.querySelector('main');
  const SEL = 'button,a[href],[role="button"],[role="tab"],input,select,textarea';
  const hit = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (alarm.contains(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue;
    let fixed = false, fixedAt = null;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') { fixed = true; fixedAt = n; break; }
    }
    if (!fixed) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const iw = Math.min(r.right, a.right) - Math.max(r.left, a.left);
    const ih = Math.min(r.bottom, a.bottom) - Math.max(r.top, a.top);
    if (iw <= 0 || ih <= 0) continue;

    /* Inside the bounded scroll region, or true chrome? And if it is inside,
       does it actually move when you scroll — a `sticky` header inside a
       scroller does not, and that would be a real finding. */
    const inMain = !!(main && main.contains(el));
    let sticky = false;
    for (let n = el; n && n !== main && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === 'sticky') { sticky = true; break; }
    }
    const roomBelow = main ? Math.max(0, main.scrollHeight - main.clientHeight - main.scrollTop) : 0;
    const needed = Math.max(0, a.bottom - r.top);   // scroll this far and it clears the alarm

    hit.push({
      name: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 26),
      pct: Math.round(((iw * ih) / (r.width * r.height)) * 100),
      y: Math.round(r.top),
      inMain, sticky,
      fixedAncestor: fixedAt ? fixedAt.tagName.toLowerCase() + '.' + String(fixedAt.className).split(/\s+/).slice(0, 2).join('.') : '—',
      needed: Math.round(needed),
      roomBelow: Math.round(roomBelow),
      freed: roomBelow >= needed,
    });
  }
  return { raised: true, box: `${Math.round(a.width)}x${Math.round(a.height)} at y=${Math.round(a.top)}`, hit };
};

const srv = await serveDist(DIST, 4311);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage(); watch(page);
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, realCopy('full'));

await goScreen(page, SCREENS.find(s => s.id === 'play/Combat'));
await settle(page);
await breakStorage(page);
for (const rx of [/^Heal 5$/i, /Heal 5/i, /Expend/i, /Short Rest/i, /Long Rest/i]) {
  const btn = page.getByRole('button', { name: rx }).first();
  if (await btn.count()) { await btn.click({ timeout: 2000 }).catch(() => {}); break; }
}
await page.waitForTimeout(900);
await healStorage(page);

console.log('\nA-20 findings, classified — is it chrome, or is it the page?\n');
let chrome = 0, scrolls = 0, stuck = 0;
for (const s of SCREENS) {
  await goScreen(page, s);
  await settle(page);
  const o = await page.evaluate(CLASSIFY);
  if (!o.raised) { console.log(`  ${s.id.padEnd(16)} alarm gone — NOT TESTED`); continue; }
  console.log(`  ${s.id.padEnd(16)} ${o.hit.length} finding(s)   alarm ${o.box}`);
  for (const h of o.hit) {
    const kind = !h.inMain ? '\x1b[31mCHROME\x1b[0m' : h.sticky ? '\x1b[33mSTICKY-IN-MAIN\x1b[0m' : '\x1b[32mpage content\x1b[0m';
    if (!h.inMain) chrome++; else if (h.sticky) stuck++; else scrolls++;
    console.log(`      «${h.name}» ${h.pct}% y=${h.y}  ${kind}`);
    console.log(`          fixed ancestor: ${h.fixedAncestor}`);
    console.log(`          scroll needed ${h.needed}px, room below ${h.roomBelow}px → ${h.freed ? 'FREED by scrolling' : 'NOT freed'}`);
  }
}
console.log(`\n  true chrome covered: ${chrome}   sticky-inside-main: ${stuck}   ordinary page content: ${scrolls}\n`);

await ctx.close(); await b.close(); await srv.close();
