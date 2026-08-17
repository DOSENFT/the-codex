// The home-screen mark — Slice 10
//
// Generated, not drawn by hand and not bought from an image model. Three
// reasons, in order of how much they mattered:
//
//   1. It has to be RIGHT, and "right" here means direction D's own language,
//      not something adjacent to it. The mark is `--d-bg` ground, a `--d-gold`
//      double rule, and a Cinzel initial — the same three moves the turn screen
//      makes. Every colour below is read out of `src/design/tokens.css` at run
//      time rather than typed in, so the icon cannot drift away from the app
//      the day a token changes.
//   2. Generating it costs nothing and asking a model for it costs credits,
//      which is an ASK-FIRST line in CLAUDE.md, for an asset that is a letter
//      in a box.
//   3. It is reproducible. `node make-icons.mjs` is the whole provenance.
//
// Cinzel is loaded from `node_modules/@fontsource/cinzel` over `file://` — the
// SAME woff2 the app now ships, so the initial on the home screen is set in the
// face the app opens in. Slice 10 is the slice that stopped trusting a font to
// arrive from the network; it would be a poor joke to draw its icon in one.
//
//   node docs/plans/codex-v1/reference/make-icons.mjs
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';

const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), ...readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`)];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const ROOT = new URL('../../../../', import.meta.url);
const OUT = new URL('public/icons/', ROOT);
mkdirSync(OUT, { recursive: true });

// Read the ink out of the token file so the mark and the app cannot disagree.
const tokens = readFileSync(new URL('src/design/tokens.css', ROOT), 'utf8');
const token = name => {
  const m = tokens.match(new RegExp(`--d-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`tokens.css no longer defines --d-${name}`);
  return m[1].trim();
};
const BG = token('bg'), GOLD = token('gold'), E1 = token('e1'), RULE = token('rule-lit');

const CINZEL = pathToFileURL(
  new URL('node_modules/@fontsource/cinzel/files/cinzel-latin-700-normal.woff2', ROOT).pathname.slice(1),
).href;

/* FULL BLEED, ALWAYS. The first version drew a rounded gold frame at the edge
   of the square and it was wrong on the device it was for: iOS masks every home
   screen icon to its own squircle and Android to whatever the launcher likes, so
   a rule that hugs the edge gets a bite taken out of each corner — which does
   not read as a border, it reads as a broken image. So the ground fills the
   square to the pixel, the OS rounds it, and the rule is INSET far enough that
   no mask can reach it.

   @param framed  false for the maskable variant: Android's safe zone is the
   inner 80% circle, which cuts inside even an inset frame. The maskable mark is
   the initial alone, at 52%, which clears every mask shape there is. */
const html = (px, framed) => `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: Cinzel; src: url('${CINZEL}') format('woff2'); font-weight: 700; }
  html,body { margin:0; padding:0; background:${BG}; }
  .mark {
    width:${px}px; height:${px}px; box-sizing:border-box; position:relative;
    display:flex; align-items:center; justify-content:center;
    /* Elevation is TONE, not shadow — the same rule the app is built on. The
       plate is one step up from the ground, and that is the whole depth cue. */
    background: radial-gradient(circle at 50% 42%, ${E1} 0%, ${BG} 74%);
  }
  /* The double rule of an illuminated page: one gold line, one dark line just
     inside it. Inset 11%, which survives both the iOS squircle and a circular
     Android mask on the "any" icon. */
  .frame {
    position:absolute; inset:${Math.round(px * 0.11)}px;
    border:${Math.round(px * 0.018)}px solid ${GOLD};
    outline:${Math.max(1, Math.round(px * 0.006))}px solid ${RULE};
    outline-offset:-${Math.round(px * 0.032)}px;
    border-radius:${Math.round(px * 0.045)}px;
  }
  .c {
    font-family: Cinzel, Georgia, serif; font-weight:700;
    font-size:${Math.round(px * (framed ? 0.5 : 0.52))}px;
    line-height:1; color:${GOLD}; position:relative;
    /* Cinzel's cap-height sits high in the em box, so the letter is nudged to
       be optically centred rather than metrically centred. */
    transform: translateY(${Math.round(px * 0.022)}px);
  }
</style>
<div class="mark">${framed ? '<div class="frame"></div>' : ''}<span class="c">C</span></div>`;

const b = await chromium.launch();
const shoot = async (name, px, framed) => {
  const page = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  await page.setContent(html(px, framed));
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.mark').screenshot({ path: new URL(name, OUT).pathname.slice(1) });
  await page.close();
  console.log(`  ${name}  ${px}×${px}`);
};

await shoot('icon-512.png', 512, true);
await shoot('icon-192.png', 192, true);
// iOS ignores the manifest for the home screen and reads `apple-touch-icon`,
// at 180. It also does NOT round-trip transparency, so this one is opaque like
// the others rather than relying on a mask that will not come.
await shoot('apple-touch-icon.png', 180, true);
await shoot('icon-maskable-512.png', 512, false);

await b.close();
console.log('\nicons written to public/icons/');
