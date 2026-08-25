/* G-4 sheet — the 517 decomposed cleanly and only one third of it is a hole:

     206  display:none @ div.print-record      the print stylesheet's copy of the
                                               sheet. Never on a screen in any
                                               state. V-2 is about a dim room at
                                               arm's length; this is paper.
     120  inert / aria-hidden @ div.fixed.inset-x-0.bottom-0.z-50
                                               a CLOSED bottom sheet. This text
                                               is on his phone the moment he
                                               opens it, and it is ungraded.
     rest the scroll sweep already reaches at some other stop.

   This probe answers the only open question: what is that sheet, and can the
   harness open it without touching the app? Print the container, its children,
   and every control on the screen whose aria-controls / aria-expanded points
   at it — so the opener is found from the DOM's own wiring rather than by
   guessing at a label. */
import { chromium, serveDist, DIST, PHONE, SCREENS, goScreen, settle, importFile } from './rig.mjs';

const FULL = 'C:/Users/marcu/Downloads/codex-nix-lvl7 (1).json';
const srv = await serveDist(DIST, 5928);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => localStorage.setItem('codex-sw-off', '1'));
const page = await ctx.newPage();
await page.goto(srv.url, { waitUntil: 'networkidle' });
await importFile(page, FULL);
await page.waitForTimeout(1000);
await goScreen(page, SCREENS.find(s => s.id === 'play/Combat')); await settle(page);

const info = await page.evaluate(() => {
  const desc = e => e.tagName.toLowerCase()
    + (e.id ? '#' + e.id : '')
    + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).filter(Boolean).slice(0, 6).join('.') : '');
  const sheets = [...document.querySelectorAll('div.fixed.inset-x-0.bottom-0')];
  const out = sheets.map(s => {
    const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
    return {
      self: desc(s),
      rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      inert: s.hasAttribute('inert'), ariaHidden: s.getAttribute('aria-hidden'),
      transform: cs.transform, opacity: cs.opacity, visibility: cs.visibility,
      id: s.id || '(none)',
      kids: [...s.children].map(desc).slice(0, 6),
      firstText: (s.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
    };
  });
  const openers = [...document.querySelectorAll('[aria-controls],[aria-expanded],[aria-haspopup]')].map(e => ({
    self: desc(e),
    label: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    controls: e.getAttribute('aria-controls'), expanded: e.getAttribute('aria-expanded'),
    haspopup: e.getAttribute('aria-haspopup'),
  }));
  return { sheets: out, openers };
});
for (const s of info.sheets) {
  console.log(`\nSHEET ${s.self}\n  id=${s.id}  rect=${s.rect}  inert=${s.inert} aria-hidden=${s.ariaHidden}`);
  console.log(`  transform=${s.transform}  opacity=${s.opacity}  visibility=${s.visibility}`);
  console.log(`  kids: ${s.kids.join(' | ')}`);
  console.log(`  text: ${s.firstText}`);
}
console.log(`\nCONTROLS declaring a popup / expansion (${info.openers.length}):`);
for (const o of info.openers) console.log(`  "${o.label}"  controls=${o.controls} expanded=${o.expanded} haspopup=${o.haspopup}\n      ${o.self}`);
await ctx.close(); await browser.close(); await srv.close();
