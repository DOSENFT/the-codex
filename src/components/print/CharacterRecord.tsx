import {
  abilityModifier,
  skillBonus,
  savingThrowBonus,
  passivePerception,
  attackBonus,
  computeSpellSaveDC,
  computeSpellAttackBonus,
  type Character,
} from '../../lib/character'
import { poolsOf, RECHARGE_LABEL } from '../../lib/rules-2024/resources'
import { ALL_SKILLS, ALL_ABILITIES, ABILITY_NAMES, SKILL_ABILITIES } from '../../lib/dnd-rules'

/* ============================================================================
   CharacterRecord — the paper fallback (Slice 14)
   ----------------------------------------------------------------------------
   WHY THIS IS A SEPARATE DOCUMENT AND NOT `@media print` ON THE SHEET.

   `CharacterSheet.tsx` is a bottom Sheet with four tabs — saves, skills,
   weapons, gear — and the inactive tabs are not hidden, they are *not
   rendered*. Ctrl+P on it produces one clipped tab inside a 92dvh scroll
   container: the parts of the sheet you most need on paper are the parts the
   printer cannot see, because they do not exist in the DOM at the moment you
   press print. No amount of print CSS can reveal a component React never
   mounted.

   So the record is its own document. It renders the whole character at once,
   ink-light, once per app, mounted as a sibling of the app shell so Ctrl+P
   works from combat, the grimoire, the turn screen — anywhere. On screen it is
   `display: none`; only the print stylesheet ever shows it.

   THE PRIME LAW APPLIES HERE TOO. This adds a surface; it removes nothing.
   The interactive sheet is untouched and is still the thing Marcus taps.

   WHAT GOES ON IT: everything you would have to reach for the iPad to answer.
   Not the persona, not the backstory, not the campaign — a record you can play
   a combat from when the battery is dead.
   ========================================================================== */

interface CharacterRecordProps {
  character: Character
}

function mod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

/** Proficiency marker. Two pips is expertise — the same convention the app uses. */
function pip(proficient: boolean, expert: boolean): string {
  if (expert) return '◉'   // ◉ expertise
  if (proficient) return '●' // ● proficient
  return '○'                 // ○ neither
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pr-section">
      <h2 className="pr-h2">{title}</h2>
      {children}
    </section>
  )
}

export function CharacterRecord({ character: c }: CharacterRecordProps) {
  const pools = poolsOf(c)
  const castsSpells = c.spells.length > 0 || Object.keys(c.spellSlots ?? {}).length > 0

  // Cantrips are always available; levelled spells only count when prepared —
  // and a class that cannot prepare (`canPrepareSpells === false`) knows all of
  // its list, so filtering by `prepared` there would print an empty grimoire.
  const printedSpells = c.spells.filter(
    (s) => s.level === 0 || !c.canPrepareSpells || s.prepared,
  )
  const spellLevels = [...new Set(printedSpells.map((s) => s.level))].sort((a, b) => a - b)

  const slotLevels = Object.keys(c.spellSlots ?? {})
    .map(Number)
    .filter((l) => (c.spellSlots[l]?.max ?? 0) > 0)
    .sort((a, b) => a - b)

  const initiative = abilityModifier(c.abilityScores.DEX)

  // Nix is level 8 and his feature list runs to level 20, because the sheet is
  // also a plan. Paper is not a plan — a record you play from must not offer a
  // feature you cannot use. Same gate `poolsOf()` applies to counters, applied
  // here to the features themselves so the two halves of the page agree.
  const availableFeatures = c.features.filter((f) => f.level <= c.level)

  return (
    <div className="print-record" data-testid="print-record">
      {/* ─── Identity ─────────────────────────────────────────────────────── */}
      <header className="pr-head">
        <div>
          <h1 className="pr-name">{c.name}</h1>
          <p className="pr-sub">
            Level {c.level} {c.race} {c.class}
            {c.subclass ? ` — ${c.subclass}` : ''}
            {c.pronouns ? ` · ${c.pronouns}` : ''}
          </p>
        </div>
        <div className="pr-hp">
          <span className="pr-hp-label">Hit Points</span>
          <span className="pr-hp-value">
            <span className="pr-write" /> / {c.hitPoints.max}
          </span>
          <span className="pr-hp-note">
            currently {c.hitPoints.current}
            {c.tempHP > 0 ? ` (+${c.tempHP} temp)` : ''}
          </span>
        </div>
      </header>

      {/* ─── The eight numbers you are asked for most ─────────────────────── */}
      <div className="pr-vitals">
        <div className="pr-vital"><span>AC</span><strong>{c.armorClass}</strong></div>
        <div className="pr-vital"><span>Prof</span><strong>{mod(c.proficiencyBonus)}</strong></div>
        <div className="pr-vital"><span>Init</span><strong>{mod(initiative)}</strong></div>
        <div className="pr-vital"><span>Passive Perc</span><strong>{passivePerception(c)}</strong></div>
        {castsSpells && (
          <>
            <div className="pr-vital"><span>Spell DC</span><strong>{computeSpellSaveDC(c)}</strong></div>
            <div className="pr-vital"><span>Spell Atk</span><strong>{mod(computeSpellAttackBonus(c))}</strong></div>
          </>
        )}
        <div className="pr-vital"><span>Death Saves</span><strong className="pr-boxes">{'□□□ / □□□'}</strong></div>
      </div>

      {c.conditions.length > 0 && (
        <p className="pr-conditions"><strong>Conditions:</strong> {c.conditions.join(', ')}</p>
      )}

      {/* ─── Abilities and saves, one table ───────────────────────────────── */}
      <Section title="Abilities & Saving Throws">
        {/* Laid out across rather than down. Six rows of four columns leaves
            40% of the page empty beside it; six columns of four rows fills the
            width and costs three fewer lines — which on a two-page record is
            the difference between a section breaking and not. */}
        <table className="pr-table pr-abilities">
          <thead>
            <tr>
              <th />
              {ALL_ABILITIES.map((a) => <th key={a}>{ABILITY_NAMES[a]}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Score</th>
              {ALL_ABILITIES.map((a) => <td key={a} className="pr-num">{c.abilityScores[a]}</td>)}
            </tr>
            <tr>
              <th scope="row">Mod</th>
              {ALL_ABILITIES.map((a) => (
                <td key={a} className="pr-num">{mod(abilityModifier(c.abilityScores[a]))}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Save</th>
              {ALL_ABILITIES.map((a) => (
                <td key={a} className="pr-num">
                  {pip(c.savingThrowProficiencies.includes(a), false)} {mod(savingThrowBonus(c, a))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ─── Every skill, because the one you need is always the missing one ─ */}
      <Section title="Skills">
        <ul className="pr-skills">
          {ALL_SKILLS.map((s) => (
            <li key={s}>
              <span className="pr-pip">
                {pip(c.skillProficiencies.includes(s), c.skillExpertise.includes(s))}
              </span>
              <span className="pr-skill-name">{s}</span>
              <span className="pr-skill-abil">{SKILL_ABILITIES[s]}</span>
              <span className="pr-num">{mod(skillBonus(c, s))}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ─── Weapons ──────────────────────────────────────────────────────── */}
      {c.weapons.length > 0 && (
        <Section title="Attacks">
          <table className="pr-table pr-weapons">
            <thead>
              <tr><th>Weapon</th><th>Atk</th><th>Damage</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {c.weapons.map((w, i) => {
                const notes = [
                  w.range,
                  w.masteryProperty ? `Mastery: ${w.masteryProperty}` : null,
                  ...w.properties,
                  ...(w.specialAbilities ?? []).map((sa) => `${sa.name} (${sa.trigger}): ${sa.effect}`),
                ].filter(Boolean)
                return (
                  <tr key={`${w.name}-${i}`}>
                    <td>{w.name}{w.magical ? ' ✦' : ''}</td>
                    <td className="pr-num">{mod(attackBonus(c, w))}</td>
                    <td className="pr-num">
                      {w.damageDice}
                      {w.bonusDamage ? `${w.bonusDamage >= 0 ? '+' : ''}${w.bonusDamage}` : ''} {w.damageType}
                    </td>
                    <td className="pr-notes">{notes.join(' · ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* ─── Resources: the pools, whichever of the three places they live ─── */}
      {pools.length > 0 && (
        <Section title="Resources">
          <ul className="pr-pools">
            {pools.map((p) => (
              <li key={p.id}>
                <span className="pr-pool-name">{p.name}</span>
                <span className="pr-pool-track">
                  <span className="pr-write pr-write--sm" /> / {p.max} {p.unit}
                </span>
                <span className="pr-dim">{RECHARGE_LABEL[p.recharge]}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ─── Spell slots + the spells actually available today ────────────── */}
      {slotLevels.length > 0 && (
        <Section title="Spell Slots">
          <ul className="pr-slots">
            {slotLevels.map((l) => (
              <li key={l}>
                <span className="pr-slot-level">{l === 1 ? '1st' : l === 2 ? '2nd' : l === 3 ? '3rd' : `${l}th`}</span>
                <span className="pr-slot-pips">
                  {Array.from({ length: c.spellSlots[l].max }, (_, i) => (
                    <span key={i} className="pr-box">{'□'}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {printedSpells.length > 0 && (
        <Section title={c.canPrepareSpells ? 'Prepared Spells & Cantrips' : 'Spells'}>
          {spellLevels.map((lvl) => (
            <div key={lvl} className="pr-spell-group">
              <h3 className="pr-h3">{lvl === 0 ? 'Cantrips' : `Level ${lvl}`}</h3>
              <table className="pr-table pr-spells">
                <tbody>
                  {printedSpells
                    .filter((s) => s.level === lvl)
                    .map((s) => (
                      <tr key={s.name}>
                        <td className="pr-spell-name">
                          {s.name}
                          {s.concentration ? ' (C)' : ''}
                          {s.ritual ? ' (R)' : ''}
                        </td>
                        <td className="pr-dim">{s.castingTime}</td>
                        <td className="pr-dim">{s.range}</td>
                        <td className="pr-num">
                          {s.damageDice ? `${s.damageDice} ${s.damageType ?? ''}`.trim() : ''}
                          {s.saveType ? ` ${s.saveType} save` : ''}
                        </td>
                        <td className="pr-notes">{s.description}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="pr-key">(C) concentration · (R) ritual</p>
        </Section>
      )}

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      {availableFeatures.length > 0 && (
        <Section title="Features">
          <ul className="pr-features">
            {availableFeatures.map((f, i) => {
              const meta = [
                f.actionType && f.actionType !== 'none' ? f.actionType : null,
                f.range,
                f.damageDice ? `${f.damageDice} ${f.damageType ?? ''}`.trim() : null,
                f.saveType ? `${f.saveType} save` : null,
                f.duration,
                f.usesMax ? `${f.usesMax} uses / ${f.usesPerRest ?? 'long'} rest` : null,
              ].filter(Boolean)
              return (
                <li key={`${f.name}-${i}`}>
                  <span className="pr-feature-name">{f.name}</span>
                  {meta.length > 0 && <span className="pr-dim"> — {meta.join(' · ')}</span>}
                  {f.description && <div className="pr-notes">{f.description}</div>}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* ─── Feats ────────────────────────────────────────────────────────── */}
      {c.feats.length > 0 && (
        <Section title="Feats">
          <ul className="pr-features">
            {c.feats.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <span className="pr-feature-name">{f.name}</span>
                {f.effects.length > 0 && <div className="pr-notes">{f.effects.join(' · ')}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ─── Gear ─────────────────────────────────────────────────────────── */}
      {(c.equipment.length > 0 || c.supplies.length > 0) && (
        <Section title="Gear">
          {c.equipment.length > 0 && (
            <p className="pr-list"><strong>Equipment:</strong> {c.equipment.join(', ')}</p>
          )}
          {c.supplies.length > 0 && (
            <p className="pr-list"><strong>Supplies:</strong> {c.supplies.join(', ')}</p>
          )}
        </Section>
      )}

      <footer className="pr-foot">
        The Codex — {c.name}. Boxes and rules are for pencil; everything printed is
        the state at the moment this page was made.
      </footer>
    </div>
  )
}
