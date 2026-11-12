/* Magic items that DO something — 2026-11-12.

   Marcus: "when I try to input that amulet or that pendant into my items, it
   doesn't do any changes or effects." The Equipment list is names only and
   nothing reads it. This list is the one combat reads: each item carries the
   immunities and resistances it grants, and `defensesOf` turns the WORN ones
   into what the damage pad and the conditions grid obey.

   One writer: every change goes through `normalizeMagicItems`, the same
   cleaner the import door uses, so the editor cannot save a shape a file
   could not. */
import { useCallback, useId, useState } from 'react'
import { Check, Gem, Pencil, Plus, Shield, Trash2, X } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character } from '../lib/character'
import {
  CONDITION_NAMES,
  DAMAGE_TYPES,
  MAGIC_ITEM_PRESETS,
  MAX_ITEM_NAME,
  MAX_ITEM_NOTE,
  newMagicItemId,
  normalizeMagicItems,
  type DamageType,
  type MagicItem,
} from '../lib/rules-2024/defenses'

interface MagicItemsProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
}

type DamageLevel = 'none' | 'resist' | 'immune'

interface Draft {
  id: string | null
  name: string
  equipped: boolean
  damage: Partial<Record<DamageType, DamageLevel>>
  conditions: string[]
  note: string
}

const EMPTY_DRAFT: Draft = { id: null, name: '', equipped: true, damage: {}, conditions: [], note: '' }

function draftOf(item: Omit<MagicItem, 'id'> & { id?: string }): Draft {
  const damage: Draft['damage'] = {}
  for (const t of item.resistances) damage[t] = 'resist'
  for (const t of item.immunities) damage[t] = 'immune'
  return {
    id: item.id ?? null,
    name: item.name,
    equipped: item.equipped,
    damage,
    conditions: [...item.conditionImmunities],
    note: item.note ?? '',
  }
}

/** The words a player reads for one item's protections. */
export function protectionsOf(item: MagicItem): string[] {
  const out: string[] = []
  if (item.immunities.length) out.push(`Immune: ${item.immunities.join(', ')}`)
  if (item.resistances.length) out.push(`Half damage: ${item.resistances.join(', ')}`)
  if (item.conditionImmunities.length) out.push(`Can't be ${item.conditionImmunities.join(', ')}`)
  return out
}

const NEXT_LEVEL: Record<DamageLevel, DamageLevel> = { none: 'resist', resist: 'immune', immune: 'none' }

const chipBase = cn(
  'min-h-[44px] px-3 rounded-xl border text-xs font-semibold',
  'inline-flex items-center gap-1.5',
  'transition-all duration-200 ease-forge active:scale-[0.96]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
)

export function MagicItems({ character, onCharacterUpdate }: MagicItemsProps) {
  const items = normalizeMagicItems(character.magicItems)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [armedRemove, setArmedRemove] = useState<string | null>(null)
  const nameId = useId()
  const noteId = useId()

  const write = useCallback(
    (next: MagicItem[]) => onCharacterUpdate({ ...character, magicItems: normalizeMagicItems(next) }),
    [character, onCharacterUpdate],
  )

  const startAdd = () => {
    setDraft({ ...EMPTY_DRAFT, damage: {}, conditions: [] })
    setError(null)
    setArmedRemove(null)
  }

  const startEdit = (item: MagicItem) => {
    setDraft(draftOf(item))
    setError(null)
    setArmedRemove(null)
  }

  const cancel = () => {
    setDraft(null)
    setError(null)
  }

  const save = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      setError('Give the item a name first.')
      return
    }
    const item: MagicItem = {
      id: draft.id ?? newMagicItemId(),
      name: name.slice(0, MAX_ITEM_NAME),
      equipped: draft.equipped,
      immunities: DAMAGE_TYPES.filter(t => draft.damage[t] === 'immune'),
      resistances: DAMAGE_TYPES.filter(t => draft.damage[t] === 'resist'),
      conditionImmunities: CONDITION_NAMES.filter(c => draft.conditions.includes(c)),
      ...(draft.note.trim() ? { note: draft.note.trim().slice(0, MAX_ITEM_NOTE) } : {}),
    }
    const exists = draft.id !== null && items.some(i => i.id === draft.id)
    write(exists ? items.map(i => (i.id === draft.id ? item : i)) : [...items, item])
    setDraft(null)
    setError(null)
  }

  const toggleWorn = (item: MagicItem) => write(items.map(i => (i.id === item.id ? { ...i, equipped: !i.equipped } : i)))

  const remove = (item: MagicItem) => {
    write(items.filter(i => i.id !== item.id))
    setArmedRemove(null)
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">Magic items</h4>

      {items.length === 0 && !draft && (
        <p className="text-xs text-forge-1 leading-relaxed mb-2">
          Wearing something magical? Add it here and pick what it protects you from. Combat will then use
          it. Items in Equipment below are just a list.
        </p>
      )}

      <ul className="space-y-2 mb-2">
        {items.map(item => {
          const protections = protectionsOf(item)
          return (
            <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Gem size={15} className="mt-0.5 shrink-0 text-arcane" aria-hidden />
                <span className="flex-1 min-w-0 text-sm font-semibold text-forge-0 break-words">{item.name}</span>
                <button
                  type="button"
                  onClick={() => toggleWorn(item)}
                  aria-pressed={item.equipped}
                  aria-label={`${item.name}: ${item.equipped ? 'worn, protecting you' : 'in your pack, not protecting you'}. Tap to change.`}
                  className={cn(
                    chipBase,
                    'shrink-0',
                    item.equipped
                      ? 'bg-verdant/15 border-verdant/50 text-verdant'
                      : 'bg-white/[0.03] border-white/10 text-forge-1',
                  )}
                >
                  {item.equipped ? <Check size={13} aria-hidden /> : null}
                  {item.equipped ? 'Worn' : 'In pack'}
                </button>
              </div>

              {protections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {protections.map(p => (
                    <span
                      key={p}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                        item.equipped ? 'border-verdant/30 bg-verdant/10 text-forge-0' : 'border-white/10 text-forge-1',
                      )}
                    >
                      <Shield size={11} aria-hidden className={item.equipped ? 'text-verdant' : ''} />
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-forge-1">No protections set, so it doesn't change combat.</p>
              )}

              {item.note && <p className="text-xs text-forge-1 leading-relaxed">{item.note}</p>}

              {armedRemove === item.id ? (
                <div className="flex items-center gap-2" role="group" aria-label={`Remove ${item.name}?`}>
                  <span className="text-xs text-forge-0 flex-1">Remove {item.name}?</span>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className={cn(chipBase, 'bg-red-500/15 border-red-500/40 text-red-300')}
                  >
                    <Trash2 size={13} aria-hidden /> Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmedRemove(null)}
                    className={cn(chipBase, 'bg-white/[0.03] border-white/10 text-forge-1')}
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    className={cn(chipBase, 'bg-arcane/10 border-arcane/25 text-arcane hover:bg-arcane/20')}
                  >
                    <Pencil size={13} aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmedRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className={cn(chipBase, 'bg-white/[0.03] border-white/10 text-forge-1 hover:text-red-300 hover:border-red-500/30')}
                  >
                    <Trash2 size={13} aria-hidden /> Remove
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {draft ? (
        <div className="rounded-xl border border-arcane/30 bg-arcane/[0.05] p-3 space-y-3">
          {draft.id === null && (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-forge-1">Quick fill</span>
              <div className="flex flex-wrap gap-1.5">
                {MAGIC_ITEM_PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setDraft({ ...draftOf({ ...p, equipped: true }), id: null })}
                    className={cn(chipBase, 'bg-white/[0.03] border-white/10 text-forge-0 hover:border-arcane/40')}
                  >
                    <Gem size={13} className="text-arcane" aria-hidden />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor={nameId} className="block text-xs font-semibold text-forge-1">Name</label>
            <input
              id={nameId}
              type="text"
              value={draft.name}
              maxLength={MAX_ITEM_NAME}
              onChange={e => { setDraft({ ...draft, name: e.target.value }); setError(null) }}
              onKeyDown={e => { if (e.key === 'Escape') cancel() }}
              placeholder="e.g. Periapt of Proof against Poison"
              aria-invalid={!!error}
              className={cn(
                'w-full min-h-[44px] px-3 py-2 rounded-xl text-sm',
                'bg-white/[0.04] border text-forge-0 placeholder:text-forge-2 outline-none',
                'transition-colors duration-200',
                error ? 'border-red-400/60' : 'border-white/10 focus:border-arcane/50',
              )}
            />
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-forge-1 mb-1.5">
              Damage it protects from <span className="font-normal">(tap: half, again: immune, again: off)</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(t => {
                const level = draft.damage[t] ?? 'none'
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft({ ...draft, damage: { ...draft.damage, [t]: NEXT_LEVEL[level] } })}
                    aria-label={`${t}: ${level === 'none' ? 'no protection' : level === 'resist' ? 'half damage' : 'immune'}. Tap to change.`}
                    className={cn(
                      chipBase,
                      level === 'immune' && 'bg-verdant/20 border-verdant/60 text-verdant',
                      level === 'resist' && 'bg-arcane/15 border-arcane/50 text-arcane',
                      level === 'none' && 'bg-white/[0.03] border-white/10 text-forge-1',
                    )}
                  >
                    {t}
                    {level !== 'none' && (
                      <span className="font-normal">{level === 'immune' ? 'immune' : 'half'}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-forge-1 mb-1.5">Conditions it stops</legend>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_NAMES.map(c => {
                const on = draft.conditions.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft({ ...draft, conditions: on ? draft.conditions.filter(x => x !== c) : [...draft.conditions, c] })
                    }
                    className={cn(
                      chipBase,
                      on ? 'bg-verdant/20 border-verdant/60 text-verdant' : 'bg-white/[0.03] border-white/10 text-forge-1',
                    )}
                  >
                    {on && <Shield size={12} aria-hidden />}
                    {c}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-1">
            <label htmlFor={noteId} className="block text-xs font-semibold text-forge-1">Note (optional)</label>
            <textarea
              id={noteId}
              value={draft.note}
              maxLength={MAX_ITEM_NOTE}
              rows={2}
              onChange={e => setDraft({ ...draft, note: e.target.value })}
              className={cn(
                'w-full px-3 py-2 rounded-xl text-sm',
                'bg-white/[0.04] border border-white/10 text-forge-0 placeholder:text-forge-2',
                'focus:border-arcane/50 outline-none transition-colors duration-200',
              )}
            />
          </div>

          <button
            type="button"
            onClick={() => setDraft({ ...draft, equipped: !draft.equipped })}
            aria-pressed={draft.equipped}
            className={cn(
              chipBase,
              draft.equipped ? 'bg-verdant/15 border-verdant/50 text-verdant' : 'bg-white/[0.03] border-white/10 text-forge-1',
            )}
          >
            {draft.equipped && <Check size={13} aria-hidden />}
            {draft.equipped ? 'Worn: protecting me' : 'In my pack: not protecting me'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className={cn(chipBase, 'flex-1 justify-center bg-arcane/20 border-arcane/50 text-arcane hover:bg-arcane/30')}
            >
              <Check size={14} aria-hidden /> Save item
            </button>
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel"
              className={cn(chipBase, 'bg-white/[0.03] border-white/10 text-forge-1')}
            >
              <X size={14} aria-hidden /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className={cn(
            chipBase,
            'w-full justify-center border-dashed bg-transparent border-arcane/30 text-arcane hover:bg-arcane/10',
          )}
        >
          <Plus size={14} aria-hidden /> Add magic item
        </button>
      )}
    </div>
  )
}
