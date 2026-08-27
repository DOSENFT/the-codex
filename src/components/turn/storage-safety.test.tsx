/* ============================================================================
   STORAGE SAFETY — Table Truth slice 5, Gate 3 tests 25 and 26.
   ----------------------------------------------------------------------------
   Slice 5 mounts the rules engine on the Play tab beside a screen that already
   writes to `codex-combat-${id}`. Two writers to one key is the bug class this
   whole phase exists to retire, and the claim that makes mounting it safe is
   narrow and checkable: THE NEW SURFACE READS AND DOES NOT WRITE.

   HOW THIS RENDERS WITHOUT A DOM. The repo has no jsdom and no testing-library,
   and adding both mid-slice to run one assertion would be a bigger change than
   the slice. `renderToStaticMarkup` runs the real component tree in node: the
   provider's `useState` initialiser runs, `composeTurn` runs, every row renders,
   and the markup that comes out is the markup a browser would paint. What it
   does NOT run is effects — and that matters not at all here, because
   `CombatProvider` has no effects. Its only write is inside `commit`, reachable
   only from `dispatch` and `undoLast`, and nothing in this tree dispatches.

   The effect path is not left unproven; it is proven where it actually exists,
   in a real browser, by `docs/plans/table-truth/prove-slice5.mjs`, which loads
   the whole Play tab in Chrome and compares the bytes across a full render.

   BYTES, AND ALSO INTENT. Comparing the value before and after would pass if
   something wrote back an identical string — which is luck, not safety, because
   the next schema change turns that luck into data loss. So `setItem` is
   recorded as well: the test asserts both that the bytes did not move and that
   nothing reached for the pen.
   ========================================================================== */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NIX } from '../../lib/turn/fixtures/nix'
import { CombatProvider, useCombat } from './CombatProvider'
import { TurnOptionRow } from '../combat/TurnOptionRow'
import type { Character } from '../../lib/character'

/** The bytes as they would sit in Marcus's browser: written by `saveCombatState`,
 *  which is `JSON.stringify(state)` and nothing else. */
const COMBAT_BYTES = JSON.stringify({
  inCombat: true,
  round: 3,
  turnActions: { action: false, bonusAction: false, reaction: false, movement: false },
  spellSlots: { 1: { used: 1, max: 4 }, 2: { used: 0, max: 3 } },
  concentrating: 'Shield of Faith',
  conditions: [],
})

const COMBAT_KEY = `codex-combat-${NIX.id}`
const CHARACTER_KEY = `codex-character-${NIX.id}`
const CHARACTER_BYTES = JSON.stringify(NIX)

const writes: Array<{ key: string; value: string }> = []
const removals: string[] = []

class MemoryStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    writes.push({ key: k, value: v })
    this.map.set(k, v)
  }
  removeItem(k: string) {
    removals.push(k)
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
  /** Seeding, without going through the recorded write path. */
  seed(k: string, v: string) {
    this.map.set(k, v)
  }
}

let store: MemoryStorage

beforeEach(() => {
  store = new MemoryStorage()
  store.seed(COMBAT_KEY, COMBAT_BYTES)
  store.seed(CHARACTER_KEY, CHARACTER_BYTES)
  writes.length = 0
  removals.length = 0
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = store
})

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage
})

/** The new surface, and only the new surface: the provider, and rows drawn from
 *  `turn.ranked`. This is what `YourTurnList` in CombatHelper.tsx renders; it is
 *  restated here rather than exported, because exporting a component so a test
 *  can reach it changes the shape of the thing under test. */
function Surface() {
  const { turn } = useCombat()
  return (
    <div>
      {turn.ranked.map(option => (
        <TurnOptionRow key={option.id} option={option} />
      ))}
    </div>
  )
}

function renderSurface(character: Character = NIX): string {
  return renderToStaticMarkup(
    <CombatProvider character={character} onCharacterUpdate={() => {}}>
      <Surface />
    </CombatProvider>,
  )
}

describe('storage safety — the read-only mount', () => {
  it('25. leaves codex-combat-${id} byte-identical across a full render', () => {
    const before = store.getItem(COMBAT_KEY)
    const html = renderSurface()

    // The render must actually have happened, or this test proves nothing about
    // a screen — an empty string would pass every byte comparison below.
    expect(html).toContain('Sacred Flame')

    expect(store.getItem(COMBAT_KEY)).toBe(before)
    expect(store.getItem(COMBAT_KEY)).toBe(COMBAT_BYTES)
    expect(writes.filter(w => w.key === COMBAT_KEY)).toEqual([])
  })

  it('26. leaves codex-character-${id} byte-identical — canon never writes back', () => {
    renderSurface()
    expect(store.getItem(CHARACTER_KEY)).toBe(CHARACTER_BYTES)
    expect(writes.filter(w => w.key === CHARACTER_KEY)).toEqual([])
  })

  it('writes nothing at all, and deletes nothing at all', () => {
    renderSurface()
    expect(writes).toEqual([])
    expect(removals).toEqual([])
  })

  it('reads the persisted encounter rather than inventing one', () => {
    // With the seeded state, the Action is open and Sacred Flame is offered.
    expect(renderSurface()).toContain('Sacred Flame')

    // Spend the Action in the bytes on disk and re-render. Nothing else
    // changes. If the provider were composing from a freshly created state
    // instead of the persisted one, this row would be unmoved — so its absence
    // is the proof that the file was read, and read correctly.
    const spent = JSON.stringify({
      ...JSON.parse(COMBAT_BYTES),
      turnActions: { action: true, bonusAction: false, reaction: false, movement: false },
    })
    store.clear()
    store.seed(COMBAT_KEY, spent)
    store.seed(CHARACTER_KEY, CHARACTER_BYTES)
    writes.length = 0

    const html = renderSurface()
    expect(html).not.toContain('Sacred Flame')
    // Still nothing written, and the bytes are the bytes that were seeded.
    expect(store.getItem(COMBAT_KEY)).toBe(spent)
    expect(writes).toEqual([])
  })

  it('survives a character with no persisted encounter at all', () => {
    store.clear()
    store.seed(CHARACTER_KEY, CHARACTER_BYTES)
    writes.length = 0
    const html = renderSurface()
    expect(html).toContain('Sacred Flame')
    // A null combat state is a legal state, and reading it must not create one.
    expect(writes).toEqual([])
  })
})

describe('the row itself', () => {
  it('never paints an ellipsis — the thing this phase exists to kill', () => {
    const html = renderSurface()
    expect(html).not.toContain('…')
    expect(html).not.toContain('...')
    // …including the HTML entity, which is how a &hellip; would survive an
    // assertion that only looked for the character.
    expect(html).not.toContain('&hellip;')
  })

  it('paints canon numbers, not the sheet summary', () => {
    const html = renderSurface()
    // Sacred Flame scaled to Nix's level 8, and the save DC off his own sheet.
    expect(html).toContain('2d8 Radiant')
    expect(html).toContain('DC 16 DEX')
  })

  it('paints a cost on every row', () => {
    const html = renderSurface()
    // Each row's cost label is the only mono span in it; every row must have
    // one, because a row that does not say what it costs is not an option.
    const rows = html.split('rounded-lg border border-bronze').length - 1
    const costs = html.split('font-mono').length - 1
    expect(rows).toBeGreaterThan(0)
    expect(costs).toBe(rows)
  })
})
