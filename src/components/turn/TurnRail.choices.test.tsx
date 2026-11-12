// The Channel Divinity quick list (Marcus, 2026-11-12). Markup only — this repo
// has no jsdom; the tap → list → Use → count path is proven in a real browser.
// Every marker is an accessible name or visible text, never a class name.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseCharacterFile } from '../../lib/import-character'
import type { Character } from '../../lib/character'
import { composeTurn } from '../../lib/turn/compose'
import { CHANNEL_DIVINITY_POOL, channelDivinityOptions } from '../../lib/rules-2024/channel-divinity'
import { PoolChoicePanel, TurnRail } from './TurnRail'

function load(): Character {
  const path = fileURLToPath(new URL('../../../public/codex-nix-lvl8.json', import.meta.url))
  const result = parseCharacterFile(readFileSync(path, 'utf8'))
  if (!result.ok) throw new Error(result.error)
  return result.character
}

const NIX8 = load()
const CHOICES = channelDivinityOptions(NIX8)
const count = (html: string, needle: string) => html.split(needle).length - 1

function rail(c: Character, withChoices: boolean) {
  const turn = composeTurn({ character: c, combat: null })
  return renderToStaticMarkup(
    <TurnRail
      spellSlots={turn.spellSlots}
      resources={turn.resources}
      onExpendSlot={() => {}}
      onRestoreSlot={() => {}}
      onSpendResource={() => {}}
      poolChoices={withChoices ? { [CHANNEL_DIVINITY_POOL]: CHOICES } : undefined}
    />,
  )
}

describe('TurnRail with Channel Divinity choices', () => {
  it('the fixture really has three options to offer', () => {
    expect(CHOICES.map(c => c.name.split(' — ')[0])).toEqual(['Divine Sense', 'Hearthfire Manifest', 'Turn Undead'])
  })

  it('a full Channel Divinity pip says it opens a choice, and does not claim to spend', () => {
    const html = rail(NIX8, true)
    expect(count(html, 'Use Channel Divinity: choose what to spend it on')).toBe(3)
    expect(html).not.toContain('Expend Channel Divinity use')
    expect(count(html, 'aria-expanded="false"')).toBeGreaterThanOrEqual(3)
  })

  it('a spent pip still restores in one tap', () => {
    const spent: Character = {
      ...NIX8,
      paladinResources: { ...NIX8.paladinResources!, channelDivinity: { max: 3, current: 1 } },
    }
    const html = rail(spent, true)
    expect(count(html, 'Use Channel Divinity: choose what to spend it on')).toBe(1)
    expect(count(html, 'Restore Channel Divinity use')).toBe(2)
  })

  it('without choices the pip spends directly, exactly as before', () => {
    const html = rail(NIX8, false)
    expect(count(html, 'Expend Channel Divinity use')).toBe(3)
    expect(html).not.toContain('choose what to spend it on')
  })

  it('Lay on Hands is untouched by the choice list', () => {
    const html = rail(NIX8, true)
    expect(html).toContain('Spend 5 Lay on Hands')
  })

  it('the list is closed until a pip is tapped', () => {
    expect(rail(NIX8, true)).not.toContain('Channel Divinity options')
  })
})

describe('PoolChoicePanel', () => {
  const pool = { id: CHANNEL_DIVINITY_POOL, name: 'Channel Divinity', current: 3, max: 3, unit: 'uses' as const, recharge: 'shortRest' as const }
  const noop = () => {}
  const panel = (over: Partial<Parameters<typeof PoolChoicePanel>[0]> = {}) =>
    renderToStaticMarkup(
      <PoolChoicePanel pool={pool} choices={CHOICES} used={null} onUse={noop} onSpendPlain={noop} onUndo={noop} onClose={noop} {...over} />,
    )

  it('lists every option with its action, a line on what it does, and a Use button', () => {
    const html = panel()
    expect(html).toContain('Channel Divinity options')
    expect(html).toContain('Use Divine Sense — spends 1 Channel Divinity')
    expect(html).toContain('Use Turn Undead — spends 1 Channel Divinity')
    expect(html).toContain('Bonus Action')
    expect(html).toContain('Reaction')
    expect(html).toContain('Magic action')
    expect(html).toContain('11 temporary HP')
    expect(html).toContain('WIS save DC 14')
    expect(html).toContain('Just spend one')
    expect(html).toContain('>Close<')
  })

  it('after a spend it says what was paid for and what is left, with Undo', () => {
    const html = panel({ used: 'Turn Undead', pool: { ...pool, current: 2 } })
    expect(html).toContain('Turn Undead</b> — 2 of 3 left')
    expect(html).toContain('role="status"')
    expect(html).toContain('Undo — give the Channel Divinity use back')
    expect(html).not.toContain('Just spend one')
  })

  it('"just one" reads as a plain spend', () => {
    expect(panel({ used: '', pool: { ...pool, current: 2 } })).toContain('1 Channel Divinity</b> — 2 of 3 left')
  })

  it('with no charges left nothing in the list can be spent', () => {
    const html = panel({ pool: { ...pool, current: 0 } })
    expect(count(html, 'disabled=""')).toBe(CHOICES.length + 1)
  })
})
