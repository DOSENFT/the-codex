import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { loadNix } from '../codex-v1/reference/nix-seed.mjs';
const req = createRequire(import.meta.url);
const npxRoot = 'C:/Users/marcu/AppData/Local/npm-cache/_npx';
const paths = [process.cwd(), 'C:/Users/marcu/AppData/Roaming/npm/node_modules',
  ...(() => { try { return readdirSync(npxRoot).map(d => `${npxRoot}/${d}/node_modules`); } catch { return []; } })()];
const pw = await import(pathToFileURL(req.resolve('playwright', { paths })).href);
const chromium = pw.chromium ?? pw.default?.chromium;
const NIX = await loadNix();
const STALE = { ...NIX, level: 7, armorClass: 18, hitPoints:{max:67,current:67}, tempHP:0, tempHPSource:null,
  proficiencyBonus:3, spellSaveDC:15, spellAttackBonus:7, maxPreparedSpells:5,
  abilityScores:{STR:18,DEX:12,CON:14,INT:9,WIS:13,CHA:16}, skillProficiencies:['Athletics','Persuasion'],
  paladinResources:{layOnHands:{max:35,current:35},channelDivinity:{max:2,current:2},auraRange:10} };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844} });
await ctx.addInitScript(s => { localStorage.setItem('codex-character', s); }, JSON.stringify(STALE));
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
await page.goto('http://localhost:4220/the-codex/', { waitUntil:'networkidle' });
await page.waitForTimeout(1200);
await page.locator("button[aria-label=\"Switch to prep mode\"]").first().click(); await page.waitForTimeout(500); await page.locator("button[aria-label=\"Grimoire\"]").first().click(); await page.waitForTimeout(900);
console.log('ARIA LABELS:', await page.evaluate(() => [...document.querySelectorAll('button[aria-label]')].map(x=>x.getAttribute('aria-label')).filter(l=>l.length<16).slice(0,25)));
console.log('BODY HEAD:', (await page.evaluate(() => document.body.innerText)).slice(0,700).replace(/\n+/g,' | '));
console.log('ERRORS:', errs.slice(0,5));
await b.close();
