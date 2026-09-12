/* ============================================================================
   THE FLOW CHECKS — the things that work today, written down so they cannot
   stop working quietly.

   Each entry below is one thing a person actually does at the table. `protects`
   says, in a sentence, what breaks in real life if that check goes red. The
   checks drive the real app in a real browser: no mocks, no shortcuts into
   internal functions, nothing but clicking what a player would click and then
   reading what is on screen.

   Two rules this file keeps to:

     Assert values, not shapes.  "67" and "AC 18" and "0 of 2 used", not
     "an element exists". A check that only asserts something rendered will
     stay green while the numbers on it go wrong.

     Nothing broken is pinned.  Making a character from scratch, Switch
     Character, Level Up's hit points and the persona screens are all recorded
     in KNOWN-BROKEN.md instead. Pinning a bug turns it into a requirement.

   Selectors prefer the accessible name — `getByRole('button', { name })` —
   because 39 controls in this app carry an `aria-label` that differs from the
   words printed on them, and the accessible name is the one assistive tech and
   these checks both read. Where a control has no usable name, the check falls
   back to the deliberate `data-` hooks the app already ships.
   ========================================================================== */

import { fileURLToPath } from 'node:url'
import {
  screenText,
  hitPoints,
  bands,
  readiness,
  row,
  useOption,
  confirmSpend,
  applyNumber,
  storage,
  savedCharacter,
  combatRecord,
  seedWith,
} from './browser.mjs'

/** The frozen copy of a real save. Never the original in `public/`. */
export const FIXTURE = fileURLToPath(new URL('./fixtures/nix-lvl7.json', import.meta.url))

/* -- small shared steps ---------------------------------------------------- */

const startCombat = async page => {
  await page.getByRole('button', { name: 'Start Combat', exact: true }).click()
  await page.waitForTimeout(800)
}

const undoButton = page => page.locator('button').filter({ hasText: /^Undo / }).first()

/* -- the checks ------------------------------------------------------------ */

export const flows = [
  {
    name: 'import a character file',
    protects:
      'Opening the app for the first time and loading the character file you were given. If this breaks, a new phone or a cleared browser means no character at all.',
    seeded: false,
    async run(t) {
      const { page } = t

      const welcome = await screenText(page)
      t.has('the welcome screen offers an import', welcome, 'Import')

      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: /import/i }).first().click(),
      ])
      await chooser.setFiles(FIXTURE)
      await page.waitForTimeout(1500)

      /* The app tells you what it did not take on trust. That sentence is the
         only account a player ever gets of a change to their sheet. */
      t.has(
        'the import explains the numbers it recalculated',
        await screenText(page),
        'spell save DC (14 on the file)',
      )

      await page.getByRole('button', { name: /Use This Character|Import anyway/i }).first().click()
      await page.waitForTimeout(1800)

      const seen = await screenText(page)
      t.has('his name is on screen', seen, 'Nix')
      t.has('his subclass is on screen', seen, 'Oath of the Hearth')
      t.has('his armour class is on screen', seen, 'AC 18')
      t.is('his hit points are on the bar', await hitPoints(page), '3 of 67, bloodied')

      const saved = await savedCharacter(page)
      t.is('he was written to storage', saved !== null, true)
      t.is('name, as stored', saved.name, 'Nix')
      t.is('level, as stored', saved.level, 7)
      t.is('class, as stored', saved.class, 'Paladin')
      t.is('armour class, as stored', saved.armorClass, 18)
      t.is('hit points, as stored', saved.hitPoints, { max: 67, current: 3 })
      t.is('id, as stored', saved.id, 'b4816f64-24a7-4df2-bc9f-9078e07af95d')

      const keys = Object.keys(await storage(page))
      t.is('he is in the roster', keys.includes('codex-roster'), true)
      t.is('he is the active character', keys.includes('codex-active-id'), true)

      /* Every later check starts from exactly this — a character imported by
         hand through the real screen, not a hand-written blob. */
      t.setSeed(await storage(page))
    },
  },

  {
    name: 'the same character after closing and reopening the app',
    protects:
      'Your character surviving a reload, a phone restart, or coming back the next evening. If this breaks, work done in one session is lost by the next.',
    async run(t) {
      const { page } = t

      const first = await screenText(page)
      t.has('he is there on opening', first, 'Nix')
      t.is('with the hit points he had', await hitPoints(page), '3 of 67, bloodied')

      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(900)

      const again = await screenText(page)
      t.has('he is still there after a reload', again, 'Nix')
      t.has('still the same subclass', again, 'Oath of the Hearth')
      t.has('still the same armour class', again, 'AC 18')
      t.is('still the same hit points', await hitPoints(page), '3 of 67, bloodied')

      const saved = await savedCharacter(page)
      t.is('still the same character, not a copy', saved.id, 'b4816f64-24a7-4df2-bc9f-9078e07af95d')
      t.is('still level 7', saved.level, 7)
      t.is('first-level slots untouched by the reload', saved.spellSlots[1], { max: 4, current: 4 })
      t.is('second-level slots untouched by the reload', saved.spellSlots[2], { max: 3, current: 2 })
    },
  },

  {
    name: 'starting combat',
    protects:
      'The moment the DM says roll initiative. If this breaks, there is no round counter and no turn economy — the app is a read-only sheet.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      const seen = await screenText(page)
      t.has('the round counter starts at one', seen, 'Round 1')
      t.has('it says whose turn it is', seen, 'YOUR TURN')

      t.is('a full turn is available', await readiness(page), {
        ACTION: 7,
        BONUS: 3,
        REACTION: 4,
        MOVEMENT: 0,
      })

      const b = await bands(page)
      t.is('the action is open', b.ACTION.open, true)
      t.has('and no attacks used yet', b.ACTION.text, '0 of 2 used')

      const id = await page.evaluate(() => localStorage.getItem('codex-active-id'))
      const keys = Object.keys(await storage(page))
      t.is('the encounter is saved, not held in memory', keys.includes(`codex-combat-${id}`), true)
      t.is('and so is its log', keys.includes(`codex-combat-log-${id}`), true)
    },
  },

  {
    name: 'casting a spell spends the slot',
    protects:
      'Casting Bless and having the app take the action and the first-level slot. If this breaks you cast spells you do not have, which is the one thing a sheet exists to prevent.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      await row(page, 'Bless').click()
      await page.waitForTimeout(500)
      const offer = await page.locator('button').filter({ hasText: /^Spend/ }).first().innerText()
      t.has('it says what casting will cost', offer.replace(/\s+/g, ' '), 'ACTION')
      t.has('including which slot', offer.replace(/\s+/g, ' '), '1ST-LEVEL SLOT')

      await confirmSpend(page)

      const b = await bands(page)
      t.is('the action is gone', b.ACTION.ready, 0)
      t.is('and marked spent', b.ACTION.spent, true)
      t.is('the bonus action shrinks to what is still legal', b.BONUS.ready, 2)

      const saved = await savedCharacter(page)
      t.is('one first-level slot is gone', saved.spellSlots[1], { max: 4, current: 3 })
      t.is('and the other levels are untouched', saved.spellSlots[2], { max: 3, current: 2 })
    },
  },

  {
    name: 'undoing the last thing you did',
    protects:
      'The one-step undo. If this breaks, a mis-tap costs a spell slot with no way back short of editing the sheet.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      t.is(
        'undo names what it will undo',
        (await undoButton(page).innerText()).replace(/\s+/g, ' ').trim(),
        'Undo Start of combat',
      )

      await useOption(page, 'Bless')
      t.is(
        'after casting, it names the cast',
        (await undoButton(page).innerText()).replace(/\s+/g, ' ').trim(),
        'Undo Bless',
      )

      await undoButton(page).click()
      await page.waitForTimeout(900)

      t.is('the whole turn comes back', await readiness(page), {
        ACTION: 7,
        BONUS: 3,
        REACTION: 4,
        MOVEMENT: 0,
      })
      t.is('and so does the slot', (await savedCharacter(page)).spellSlots[1], { max: 4, current: 4 })
      t.is(
        'and undo points one step further back',
        (await undoButton(page).innerText()).replace(/\s+/g, ' ').trim(),
        'Undo Start of combat',
      )
    },
  },

  {
    name: 'attacking twice with Extra Attack',
    protects:
      'A level-7 Paladin getting both swings out of one action. If this breaks you lose half your damage every round and never notice.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      await useOption(page, 'The Dawn Guardian')
      const afterOne = await bands(page)
      t.has('one swing is counted', afterOne.ACTION.text, '1 of 2 used')
      t.is('but the action is still live', afterOne.ACTION.ready, 1)
      t.is('and the screen offers the second swing', /SWING AGAIN|attack left/i.test(await screenText(page)), true)

      await useOption(page, 'The Dawn Guardian')
      const afterTwo = await bands(page)
      t.has('both swings are counted', afterTwo.ACTION.text, '2 of 2 used')
      t.is('and now the action is done', afterTwo.ACTION.ready, 0)
      t.is('and marked spent', afterTwo.ACTION.spent, true)
    },
  },

  {
    name: 'options you cannot afford are blocked and say why',
    protects:
      'The app refusing an illegal move instead of letting it through. If this breaks, the turn economy stops meaning anything.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await useOption(page, 'The Dawn Guardian')
      await useOption(page, 'The Dawn Guardian')

      const bless = row(page, 'Bless')
      t.is('Bless can no longer be tapped', await bless.isDisabled(), true)
      t.has('it is marked blocked', await bless.getAttribute('class'), 'blocked')
      t.has(
        'and it says why in plain words',
        (await bless.innerText()).replace(/\s+/g, ' '),
        'Your action is spent',
      )
    },
  },

  {
    name: 'ending your turn',
    protects:
      'Handing the turn over and getting your reaction back while everyone else acts. If this breaks, rounds never advance and reactions are never available when they matter.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await useOption(page, 'The Dawn Guardian')
      await useOption(page, 'The Dawn Guardian')

      await page.getByRole('button', { name: 'End turn', exact: true }).click()
      await page.waitForTimeout(1200)

      const seen = await screenText(page)
      t.has('the round advances', seen, 'Round 2')
      t.has('and it says it is not your turn', seen, 'Someone else is acting')

      const b = await bands(page)
      t.is('your reaction is the one thing still live', b.REACTION.ready, 4)
      t.is('and it is open', b.REACTION.open, true)
      t.is('your action is not', b.ACTION.ready, 0)
      t.is('and is marked spent', b.ACTION.spent, true)

      t.has('and the rows say so', seen, 'It is not your turn')
    },
  },

  {
    name: 'taking damage',
    protects:
      'Logging a hit. If this breaks, the number you are playing off is wrong from the first round of the night.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await applyNumber(page, 'Apply damage', 1)

      t.is('one damage comes off', await hitPoints(page), '2 of 67, bloodied')
      t.is('and is written down', (await savedCharacter(page)).hitPoints, { max: 67, current: 2 })
    },
  },

  {
    name: 'dropping to zero brings up death saves',
    protects:
      'Going down. If this breaks, the app either takes you to negative hit points or offers no way to track the three-and-three that decides whether you live.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await applyNumber(page, 'Apply damage', 10)

      /* Zero, not minus seven — and still flagged bloodied, which is right:
         being down is not the moment to stop warning you. */
      t.is('hit points stop at zero, not below', await hitPoints(page), '0 of 67, bloodied')
      t.is('and are stored as zero', (await savedCharacter(page)).hitPoints, { max: 67, current: 0 })

      t.has('the death save tracker appears', await screenText(page), 'DEATH SAVES')
      t.is(
        'with three successes to fill',
        await page.getByRole('button', { name: 'Add death save success' }).count(),
        3,
      )
      t.is(
        'and three failures',
        await page.getByRole('button', { name: 'Add death save failure' }).count(),
        3,
      )
      t.is(
        'and a way to clear them',
        await page.getByRole('button', { name: 'Reset Death Saves', exact: true }).count(),
        1,
      )
    },
  },

  {
    name: 'healing',
    protects:
      'Lay on Hands, a potion, a cleric. If this breaks, healing at the table is not reflected on the sheet.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await applyNumber(page, 'Apply damage', 10)
      t.is('down first', await hitPoints(page), '0 of 67, bloodied')

      await applyNumber(page, 'Apply healing', 10)
      t.is('ten healing goes back on', await hitPoints(page), '10 of 67, bloodied')
      t.is('and is written down', (await savedCharacter(page)).hitPoints, { max: 67, current: 10 })
    },
  },

  {
    name: 'temporary hit points',
    protects:
      'Temp HP being held separately from real hit points. If this breaks, temp HP either heals you or vanishes, and both change how long you survive.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      await page.getByRole('button', { name: 'Set temporary hit points' }).click()
      await page.waitForTimeout(600)
      t.has('it asks where the temp HP came from', await screenText(page), 'GRANTED BY')
      t.is(
        'with an honest default',
        await page.getByRole('button', { name: "DON'T KNOW" }).first().getAttribute('aria-pressed'),
        'true',
      )
      t.is(
        'and his own feature offered but not assumed',
        await page
          .getByRole('button', { name: 'HEARTHFIRE MANIFEST' })
          .first()
          .getAttribute('aria-pressed'),
        'false',
      )

      await page.getByRole('button', { name: 'Set value to 10', exact: true }).click()
      await page.waitForTimeout(250)
      await page.getByRole('button', { name: 'Apply', exact: true }).click()
      await page.waitForTimeout(900)

      t.has('temp HP shows alongside real hit points', await screenText(page), '+10')
      const saved = await savedCharacter(page)
      t.is('temp HP is stored on its own', saved.tempHP, 10)
      t.is('and real hit points are untouched', saved.hitPoints, { max: 67, current: 3 })
    },
  },

  {
    name: 'the bloodied warning',
    protects:
      'The at-a-glance "you are in trouble" marker at half hit points. If this breaks you find out you are bloodied by dying.',
    async run(t) {
      const { page } = t

      t.is('at 3 of 67 the bar says bloodied', await hitPoints(page), '3 of 67, bloodied')
      t.is(
        'and so does the label',
        (await page.locator('.blabel').first().innerText()).trim(),
        'Bloodied',
      )

      /* And at full health it does not cry wolf — it tells you the number to
         watch for instead. */
      const healthy = await t.open(
        seedWith(t.seed, c => {
          c.hitPoints = { max: 67, current: 67 }
        }),
      )
      t.is('at full health it does not', await hitPoints(healthy), '67 of 67')
      t.is(
        'it says where the line is',
        (await healthy.locator('.blabel').first().innerText()).trim(),
        'Bloodied at 33',
      )
    },
  },

  {
    name: 'picking a reaction you were missing',
    protects:
      'The app spotting a choice you never made — a level-2 Fighting Style — and the reaction it unlocks. If this breaks you play the whole campaign without a feature you already own.',
    async run(t) {
      const { page } = t
      await startCombat(page)

      t.is('it flags the gap', await page.locator('[data-fighting-style-gap]').count(), 1)
      t.is('reactions before choosing', (await bands(page)).REACTION.ready, 4)

      await page.locator('[data-fighting-style-gap]').first().click()
      await page.waitForTimeout(900)
      t.is('the picker opens', await page.locator('[data-fighting-style-picker]').count(), 1)
      t.is('with every style to choose from', await page.locator('[data-style-option]').count(), 11)

      await page.locator('[data-style-option="Interception"]').first().click()
      await page.waitForTimeout(1000)

      t.is('Interception adds a reaction', (await bands(page)).REACTION.ready, 5)
      t.is('and the gap is closed', await page.locator('[data-fighting-style-gap]').count(), 0)
      t.is(
        'and the choice is kept',
        (await savedCharacter(page)).feats.map(f => f.name ?? f),
        ['Sentinel', 'Lucky', 'Interception'],
      )
    },
  },

  {
    name: 'ending combat, with a chance to change your mind',
    protects:
      'Getting out of an encounter on purpose rather than by accident. If the confirmation breaks, one stray tap wipes the round counter, concentration and the spent economy mid-fight.',
    async run(t) {
      const { page } = t
      await startCombat(page)
      await useOption(page, 'Bless')
      t.is('mid-fight, the action is spent', (await combatRecord(page)).turnActions.action, true)

      await page.getByRole('button', { name: 'End combat', exact: true }).click()
      await page.waitForTimeout(900)

      const asked = await screenText(page)
      t.has('it asks first', asked, 'End the encounter?')
      t.has('and says what will be lost', asked, 'round counter, concentration and spent economy clear')
      t.is(
        'with a way out',
        await page.getByRole('button', { name: 'Keep fighting' }).count(),
        1,
      )

      await page.getByRole('button', { name: 'End combat — confirm' }).click()
      await page.waitForTimeout(1100)

      t.is(
        'and combat is over',
        await page.getByRole('button', { name: 'Start Combat', exact: true }).count(),
        1,
      )
      const after = await combatRecord(page)
      t.is('the encounter is recorded as finished', after.inCombat, false)
      t.is('and the spent economy is handed back', after.turnActions, {
        action: false,
        bonusAction: false,
        reaction: false,
        movement: false,
      })
      t.is('nothing is left concentrating', after.concentrating, null)
      t.is(
        'and he still has his hit points',
        (await savedCharacter(page)).hitPoints,
        { max: 67, current: 3 },
      )
    },
  },
]
