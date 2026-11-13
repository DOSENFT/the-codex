// The Channel Divinity list's "Use" on the flaming cloak must find the turn
// engine's own cloak option, the one that GRANTS the temp HP, by shape (same
// pool, same number), never by name. Verifier finding, 2026-11-12: Use spent the
// charge and left temp HP at 0.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseCharacterFile } from '../import-character'
import { composeTurn } from './compose'
import { allOptions } from './reactions'
import { CHANNEL_DIVINITY_POOL, channelDivinityOptions } from '../rules-2024/channel-divinity'

const bytes = readFileSync(fileURLToPath(new URL('../../../public/codex-nix-lvl8.json', import.meta.url)), 'utf8')
const parsed = parseCharacterFile(bytes)
if (!parsed.ok) throw new Error(parsed.error)
const nix = parsed.character

describe('cloak choice → engine option', () => {
  it('the list says 11 temp HP at level 8 (8 + CHA 3)', () => {
    const cloak = channelDivinityOptions(nix).find(o => o.grantsTempHP)
    expect(cloak?.grantsTempHP).toBe(11)
  })

  it('exactly one engine option spends Channel Divinity and grants that same 11', () => {
    const turn = composeTurn({ character: nix, combat: null })
    const matches = allOptions(turn).filter(
      o => o.cost.resourcePoolId === CHANNEL_DIVINITY_POOL && o.grantsTempHP === 11,
    )
    expect(matches).toHaveLength(1)
  })

  it('the cloak row charges Channel Divinity, and the summon row stays free', () => {
    const turn = composeTurn({ character: nix, combat: null })
    const hearth = allOptions(turn).filter(o => o.name === 'Hearthfire Manifest')
    const cloak = hearth.find(o => o.cost.slot === 'reaction')
    const summon = hearth.find(o => o.cost.slot === 'bonusAction')
    expect(cloak?.cost.resourcePoolId).toBe(CHANNEL_DIVINITY_POOL)
    expect(cloak?.cost.label).toContain('3/3')
    expect(summon?.cost.resourcePoolId).toBeUndefined()
  })

  it('with no Channel Divinity left, the cloak row is blocked and says why', () => {
    const empty = {
      ...nix,
      paladinResources: { ...nix.paladinResources!, channelDivinity: { max: 3, current: 0 } },
    }
    const turn = composeTurn({ character: empty, combat: null })
    const cloak = allOptions(turn).find(o => o.name === 'Hearthfire Manifest' && o.cost.slot === 'reaction')
    expect(cloak?.available).toBe(false)
    expect(cloak?.blockedReason).toMatch(/Channel Divinity/)
  })

  it('choices that grant nothing carry no temp HP, so they stay plain spends', () => {
    const plain = channelDivinityOptions(nix).filter(o => !o.grantsTempHP).map(o => o.name)
    expect(plain).toEqual(expect.arrayContaining(['Divine Sense', 'Turn Undead']))
  })
})
