// THE MOMENT — three treatments, shot over the real app.  Slice 7, step 6.
//
// Marcus's rule for front-end work is "do not one shot": build several, look at
// them side by side, keep the best of each. This script is how that happens
// without building three React screens and throwing two away.
//
// Every shot below is the REAL turn screen, running the REAL build, composing
// the REAL Nix fixture, in the genuine off-turn state that Slice 7's engine now
// produces — reactions promoted to the shortlist, every action greyed with "It
// is not your turn", the reaction pip the only one lit. The three variants are
// CSS-and-a-little-DOM layered on top of that. So the differences you see are
// the design decision and nothing else, and the CSS that wins is CSS that has
// already been proved to fit the real markup.
//
// WHY THESE THREE. From reference/01-inspiration-catalogue.md and the Slice 7
// research pass: BG3's reaction prompts, Solasta's named-trigger window, MTG
// Arena's priority stops, XCOM Overwatch, Hearthstone Discover, iOS CallKit.
// Ten patterns came out of it; three directions compose them differently.
//
//   A. THE DIMMING       takeover.  Discover Three + Two-Door Exit + Rare Alert.
//   B. THE TURNING PAGE  transform in place.  Auto-Pass Silence + Named Trigger.
//   C. THE ARMED RAIL    a persistent edge.  Pre-Armed Policy + Held Breath.
//
// REFUSED IN ALL THREE, and the refusal is the design: no countdown numerals,
// no auto-dismiss that resolves against the player, no "you missed it!" loss
// framing, no streaks or accuracy scores, no red-alert palette, no flashing, no
// sound (this is a shared table), no two-handed interaction, no escalating nag.
//
//   npx vite build && npx vite preview --port 4173
//   node docs/plans/codex-v1/reference/shoot-moment.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync } from 'node:fs';
import { loadNix } from './nix-seed.mjs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const NIX = await loadNix();
const ID = NIX.id;
const TURN = 'http://localhost:4173/the-codex/?d=1';
const OUT = 'docs/plans/codex-v1/_shots-moment';
mkdirSync(OUT, { recursive: true });

const PHONE = { name: 'phone', width: 390, height: 844 };
const IPAD = { name: 'ipad', width: 1366, height: 1024 };

/** The off-turn combat state, written exactly as the app persists it. */
const OFF_TURN = {
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 1, max: 3 } },
  concentrating: null,
  yourTurn: false,
};
const ON_TURN = { ...OFF_TURN, yourTurn: true };

// ---------------------------------------------------------------------------
// The three treatments.  Each is { css, dom } run inside the page.
// ---------------------------------------------------------------------------

/* Shared vocabulary. Nothing here invents a colour: every value is a token from
   src/design/tokens.css, because a moment that does not look like the rest of
   the app is a moment that looks like a bug. */
const TOKENS = `
  .m-trigger { font-family: var(--d-font-display); font-size: 20px; line-height: 1.15;
               color: var(--d-cream); letter-spacing: .01em; }
  .m-sub     { font-family: var(--d-font-body); font-size: 13px; color: var(--d-dim); }
  .m-hold    { font-family: var(--d-font-body); font-size: 15px; color: var(--d-cream); }
`;

const VARIANTS = {
  /* ── A. THE DIMMING ──────────────────────────────────────────────────────
     The table falls quiet. Everything you cannot do recedes to a whisper and
     one slab rises carrying the trigger and your answers. Hearthstone's
     Discover, at 48px minimum, with iOS CallKit's two equally-weighted doors:
     "Let it pass" is exactly as big and as reachable as "Strike".

     RISK, named so it can be judged: a takeover pulls the WHOLE TABLE's eyes
     to Marcus's iPad, and it hides the initiative order behind itself. */
  a: {
    label: 'A · The Dimming',
    css: `
      .dturn { position: relative; }
      .dturn .body > .colA, .dturn .body > .colC, .dturn .chrome, .dturn .edge {
        opacity: .28; filter: saturate(.6); transition: opacity 220ms ease; }
      .dturn .body > .colB { opacity: .18; }
      .m-scrim { position: fixed; inset: 0; z-index: 40; pointer-events: none;
        background: radial-gradient(120% 70% at 50% 42%,
          rgba(197,165,90,.10) 0%, rgba(10,10,8,.72) 46%, rgba(10,10,8,.93) 100%); }
      .m-slab { position: fixed; z-index: 41; left: 50%; transform: translateX(-50%);
        bottom: 24px; width: min(720px, calc(100vw - 32px));
        background: var(--d-e1); border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius-lg); padding: 18px 16px 16px;
        box-shadow: 0 0 0 1px rgba(197,165,90,.14), 0 24px 60px rgba(0,0,0,.6); }
      /* Fading Presence: urgency is light receding, never a number counting
         down. Nothing here resolves on its own — the window closes when Marcus
         closes it, which is the only honest clock at a real table. */
      .m-glow { position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
        background: linear-gradient(180deg, rgba(197,165,90,.16), transparent 38%); }
      .m-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
      .m-head .m-sub { margin-left: auto; }
      .m-opts { display: grid; gap: 8px; }
      .m-opt { display: flex; align-items: center; gap: 12px; min-height: 56px;
        padding: 10px 14px; text-align: left; width: 100%;
        background: var(--d-e2); border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius); color: var(--d-cream);
        font-family: var(--d-font-body); font-size: 15px; }
      .m-opt .n { flex: 1; }
      .m-opt .d { font-family: var(--d-font-mono); font-size: 13px; color: var(--d-gold); }
      .m-pass { min-height: 56px; margin-top: 8px; width: 100%;
        background: transparent; border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius); color: var(--d-cream);
        font-family: var(--d-font-body); font-size: 15px; }
    `,
    dom: (opts, trigger) => `
      <div class="m-scrim"></div>
      <div class="m-slab"><div class="m-glow"></div>
        <div class="m-head">
          <span class="m-trigger">${trigger}</span>
          <span class="m-sub">Your reaction</span>
        </div>
        <div class="m-opts">
          ${opts.map(o => `<button class="m-opt"><span class="n">${o.name}</span><span class="d">${o.dice || ''}</span></button>`).join('')}
        </div>
        <button class="m-pass">Let it pass — keep your reaction</button>
      </div>`,
  },

  /* ── B. THE TURNING PAGE ─────────────────────────────────────────────────
     No overlay at all. The screen you are already looking at turns over: the
     caption changes word, the reaction rows widen and take a lit edge, and
     everything else settles back without moving. MTG Arena's principle — most
     moments should produce almost no UI — applied to a screen that is already
     the right screen.

     RISK: it is far less unmissable. Across a lamplit table, with dice in hand,
     a caption changing from "Your turn" to "The moment" can be missed entirely.
     This one wants a haptic to carry it, and a haptic is not a screenshot. */
  b: {
    label: 'B · The Turning Page',
    css: `
      .dturn { background: var(--d-bg); }
      .dturn .body > .colA, .dturn .body > .colC { opacity: .55; }
      .dturn .colB .list .cap .lbl { color: var(--d-amber); }
      /* The lit edge is the whole signal, and it is on the ROWS, where the
         thumb already is — not at the top of the screen where the eye is not. */
      .dturn .colB .act:not(:disabled) {
        border-left: 3px solid var(--d-amber);
        background: linear-gradient(90deg, rgba(212,167,74,.10), transparent 60%);
        min-height: 60px; }
      .dturn .colB .act:disabled { opacity: .42; }
      .m-band { margin: 0 0 8px; padding: 11px 12px; border-radius: var(--d-radius);
        background: linear-gradient(90deg, rgba(212,167,74,.14), rgba(28,26,21,0) 70%);
        border: 1px solid var(--d-rule-lit); border-left: 3px solid var(--d-amber);
        display: flex; align-items: baseline; gap: 10px; }
      .m-band .m-sub { margin-left: auto; }
      .m-pass { min-height: 56px; width: 100%; margin-top: 10px;
        background: transparent; border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius); color: var(--d-cream);
        font-family: var(--d-font-body); font-size: 15px; }
    `,
    dom: (_opts, trigger) => `
      <div class="m-band">
        <span class="m-trigger">${trigger}</span>
        <span class="m-sub">Your reaction</span>
      </div>`,
    /** B injects into the list, not over the page. */
    mount: '.colB .list',
    tail: `<button class="m-pass">Let it pass — keep your reaction</button>`,
  },

  /* ── C. THE ARMED RAIL ───────────────────────────────────────────────────
     The rail is there the whole time, on every turn, holding what you have
     armed — XCOM's Overwatch, decided in calm time and then simply true. When
     the trigger fires the sigil ignites IN PLACE and the rail widens to name
     it. Nothing else on the screen moves, so nothing else is lost.

     Anchored to the BOTTOM edge, not the side: an iPad lying flat on a table
     has no thumb arc, and the bottom edge is the one edge both hands reach.

     RISK: easiest of the three to miss under one lamp, and it cannot hold four
     options — beyond two it has to promote itself to A or B. */
  c: {
    label: 'C · The Armed Rail',
    css: `
      .dturn { padding-bottom: 128px; }
      .dturn .edge { margin-bottom: 108px; }
      .m-rail { position: fixed; left: 0; right: 0; bottom: 0; z-index: 41;
        background: linear-gradient(180deg, var(--d-e1), var(--d-bg));
        border-top: 1px solid var(--d-rule-lit);
        box-shadow: 0 -1px 0 rgba(197,165,90,.18), 0 -18px 40px rgba(0,0,0,.5);
        padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px)); }
      .m-rail .m-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
      .m-rail .m-head .m-sub { margin-left: auto; }
      .m-sigils { display: flex; gap: 8px; align-items: stretch; }
      .m-sig { flex: 1; min-height: 56px; display: flex; flex-direction: column;
        justify-content: center; gap: 2px; padding: 8px 12px; text-align: left;
        background: var(--d-e2); border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius); color: var(--d-cream);
        font-family: var(--d-font-body); font-size: 15px; }
      /* Ignited: the one armed thing whose trigger has actually fired. Tone and
         a lit edge, never a flash — this is a table, and a flashing tablet is
         a thing everyone else at it has to look away from. */
      .m-sig.lit { background: linear-gradient(180deg, rgba(212,167,74,.16), var(--d-e2));
        border-color: var(--d-amber); box-shadow: inset 0 0 0 1px rgba(212,167,74,.35); }
      .m-sig .d { font-family: var(--d-font-mono); font-size: 13px; color: var(--d-gold); }
      .m-pass { min-width: 128px; min-height: 56px; padding: 0 14px;
        background: transparent; border: 1px solid var(--d-rule-lit);
        border-radius: var(--d-radius); color: var(--d-cream);
        font-family: var(--d-font-body); font-size: 15px; }
    `,
    dom: (opts, trigger) => `
      <div class="m-rail">
        <div class="m-head">
          <span class="m-trigger">${trigger}</span>
          <span class="m-sub">Armed · your reaction</span>
        </div>
        <div class="m-sigils">
          ${opts.map((o, i) => `<button class="m-sig${i === 0 ? ' lit' : ''}"><span>${o.name}</span><span class="d">${o.dice || ''}</span></button>`).join('')}
          <button class="m-pass">Let it pass</button>
        </div>
      </div>`,
  },
};

// ---------------------------------------------------------------------------

const b = await chromium.launch();
const errors = [];

async function shoot(variantKey, device, combat, file) {
  const ctx = await b.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(([id, seed, cs]) => {
    localStorage.setItem('codex-character-' + id, seed);
    localStorage.setItem('codex-active-id', id);
    localStorage.setItem('codex-combat-' + id, cs);
    localStorage.setItem('codex-roster', JSON.stringify([{
      id, name: 'Nix', class: 'Paladin', subclass: 'Oath of the Hearth',
      level: 8, updatedAt: '2026-08-16T00:00:00.000Z',
    }]));
  }, [ID, JSON.stringify(NIX), JSON.stringify(combat)]);

  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(`${file}: ${e}`));
  p.on('console', m => { if (m.type() === 'error') errors.push(`${file}: ${m.text()}`); });
  await p.goto(TURN, { waitUntil: 'networkidle' });
  await p.waitForSelector('.act', { timeout: 15000 });

  if (variantKey) {
    const v = VARIANTS[variantKey];
    const applied = await p.evaluate(([css, mount, hasTail]) => {
      // Read the ACTUAL offered reactions off the ACTUAL screen. Nothing here
      // invents an option: if the engine did not promote it, it is not drawn.
      const opts = [...document.querySelectorAll('.colB .list .act')]
        .filter(e => !e.disabled)
        .map(e => ({
          name: e.querySelector('.anm')?.textContent ?? '',
          dice: e.querySelector('.dice')?.textContent
            ?? (e.querySelector('.det')?.textContent ?? '').match(/1d\d+[+-]?\d*/)?.[0] ?? '',
        }));
      if (opts.length === 0) return { ok: false, why: 'no reaction rows on screen' };

      // The Named Trigger, six words. It is hard-coded here ONLY because no
      // board exists yet to say which creature moved — Slice 9 owns that, and
      // the shape of the sentence is what is being judged today.
      const trigger = 'The goblin leaves your reach';
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      return { ok: true, opts, trigger, mount, hasTail };
    }, [TOKENS + v.css, v.mount ?? null, Boolean(v.tail)]);

    if (!applied.ok) throw new Error(`${file}: ${applied.why}`);
    const html = v.dom(applied.opts, applied.trigger);
    await p.evaluate(([html, mount, tail]) => {
      const host = mount ? document.querySelector(mount) : document.body;
      if (!host) throw new Error('mount point missing: ' + mount);
      if (mount) {
        // B renders INSIDE the list, above the first row — the point of B is
        // that the moment happens where the options already are.
        host.insertAdjacentHTML('afterbegin', html);
        if (tail) host.insertAdjacentHTML('beforeend', tail);
      } else {
        host.insertAdjacentHTML('beforeend', html);
      }
    }, [html, applied.mount, v.tail ?? null]);
    await p.waitForTimeout(120);
  }

  await p.screenshot({ path: `${OUT}/${file}.png`, fullPage: false });
  console.log(`  shot ${file}.png`);
  await ctx.close();
}

console.log('\n-- reference: the screen as it is on YOUR turn --');
await shoot(null, PHONE, ON_TURN, '00-reference-your-turn-phone');
await shoot(null, IPAD, ON_TURN, '00-reference-your-turn-ipad');

console.log('\n-- the engine alone: off-turn, no treatment yet --');
await shoot(null, PHONE, OFF_TURN, '01-engine-off-turn-phone');
await shoot(null, IPAD, OFF_TURN, '01-engine-off-turn-ipad');

for (const key of ['a', 'b', 'c']) {
  console.log(`\n-- ${VARIANTS[key].label} --`);
  await shoot(key, PHONE, OFF_TURN, `moment-${key}-phone`);
  await shoot(key, IPAD, OFF_TURN, `moment-${key}-ipad`);
}

await b.close();

if (errors.length) {
  console.log('\nCONSOLE / PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
console.log(`\nclean. ${OUT}/`);
