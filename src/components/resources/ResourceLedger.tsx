// The resource ledger — Marcus authors his own countable things
//
// This is the surface Slice 6b exists for. Before it, a homebrew resource had
// to be smuggled in as "a feature with uses", which is why Nix's sheet reads
// "40 uses" for what is plainly 40 points, and a homebrew condition was a
// label the app displayed and then ignored.
//
// DESIGN
// Ported from docs/plans/codex-v1/mockups/6b-resources/merged.html — the
// locked spec, arrived at by building three labelled variants, shooting them,
// judging them against the D tokens and the 48px floor, merging, and then
// iterating once on a real observed fault. Every class name here has a
// counterpart in resources-d.css, whose header carries the aesthetic and the
// three load-bearing rules.
//
// SHAPE
// One controlled component over `character` + `onChange`. It holds no copy of
// the sheet — only which card is open and what is being typed into it. That
// matters more than it sounds: the turn screen and this screen can be mounted
// at the same time, and a component that cached the character would show
// Marcus a pool he already spent.
//
// It writes ONLY through rules-2024/resources.ts. Not one line here knows
// where a pool physically lives, which is the whole point of the slice.
import { useCallback, useMemo, useState } from 'react'
import type { Character } from '../../lib/character'
import type { CustomCondition } from '../../lib/rules-2024/conditions'
import {
  freePoolId,
  poolsOf,
  RECHARGES,
  RECHARGE_LABEL,
  removePool,
  setPoolCurrent,
  UNITS,
  upsertPool,
  type ResolvedPool,
  type ResourceRecharge,
  type ResourceUnit,
} from '../../lib/rules-2024/resources'
import '../../design/tokens.css'
import './resources-d.css'

/** Above this, a row of pips stops being countable and becomes a texture.
 *  Eight is the largest number a person reads at a glance without counting —
 *  and it is also where a 48px pip row stops fitting a 390px phone. */
const PIP_LIMIT = 8

/** A pool at a fifth or less is a warning, and the bar earns its ember. */
const LOW = 0.2

interface Props {
  character: Character
  onChange: (next: Character) => void
  /** Rendered in the header. Omitted inside the turn screen, where the
   *  surrounding frame already says where you are. */
  heading?: string
}

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

function PoolValue({
  pool,
  onSet,
}: {
  pool: ResolvedPool
  onSet: (value: number) => void
}) {
  // Two honest forms, and which one you get is decided by the number, not by
  // where the pool is stored. Lay on Hands at 40 points is a gauge whether it
  // came from paladinResources or from a feature counter.
  if (pool.max > 0 && pool.max <= PIP_LIMIT) {
    return (
      <div className="dres-pips">
        {Array.from({ length: pool.max }, (_, i) => {
          const filled = i < pool.current
          // Tapping pip i sets the pool to i+1, EXCEPT when it is already
          // exactly there — then it sets i, so the last filled pip is a
          // toggle. Without that you can fill from a row of pips but never
          // empty the last one.
          const target = pool.current === i + 1 ? i : i + 1
          return (
            <button
              key={i}
              type="button"
              className="dres-pipbtn"
              onClick={() => onSet(target)}
              aria-label={`Set ${pool.name} to ${target} of ${pool.max}`}
            >
              <span className={filled ? 'dres-pip' : 'dres-pip dres-out'} />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="dres-gauge">
      <span className="dres-v">{pool.current}</span>
      <span className="dres-of">/ {pool.max}</span>
      <span className="dres-sp">
        <button
          type="button"
          onClick={() => onSet(pool.current - 1)}
          disabled={pool.current <= 0}
          aria-label={`Spend one ${pool.name}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onSet(pool.current + 1)}
          disabled={pool.current >= pool.max}
          aria-label={`Restore one ${pool.name}`}
        >
          +
        </button>
      </span>
    </div>
  )
}

/** The label line. States the number even when pips already show it — a
 *  resource IS its number, and eight dots is not a reading. */
function poolSub(pool: ResolvedPool): { count: string; rest: string } {
  const recharge =
    pool.recharge === 'manual' || pool.recharge === 'never'
      ? RECHARGE_LABEL[pool.recharge]
      : `recharges on a ${RECHARGE_LABEL[pool.recharge]}`.replace('on a dawn', 'at dawn')
  return { count: `${pool.current}/${pool.max}`, rest: `${pool.unit} · ${recharge}` }
}

interface Draft {
  name: string
  current: string
  max: string
  unit: ResourceUnit
  recharge: ResourceRecharge
  note: string
}

function draftOf(pool: ResolvedPool): Draft {
  return {
    name: pool.name,
    current: String(pool.current),
    max: String(pool.max),
    unit: pool.unit,
    recharge: pool.recharge === 'manual' ? 'never' : pool.recharge,
    note: pool.note ?? '',
  }
}

const BLANK: Draft = {
  name: '',
  current: '0',
  max: '1',
  unit: 'points',
  recharge: 'longRest',
  note: '',
}

/** The form. Segmented controls rather than dropdowns, because a `<select>` on
 *  iPad opens a wheel that covers the sheet you are editing. */
function PoolForm({
  draft,
  set,
  pool,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  /** Absent when this is a brand-new pool. */
  pool?: ResolvedPool
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [arming, setArming] = useState(false)
  // Only an authored pool may have its shape changed here. A feature's counter
  // is edited on the feature and the paladin pair is derived from level; the
  // form SAYS so rather than accepting typing it will silently discard.
  const locked = pool !== undefined && !pool.editable
  const named = draft.name.trim().length > 0

  return (
    <div className="dres-form">
      {locked ? (
        <p className="dres-hint">
          {pool!.origin.kind === 'paladin'
            ? 'This pool is derived from your level. Its size is set by the class table — only the current value is yours to change here.'
            : 'This pool belongs to a feature. Rename it, or change its size, in the feature editor — only the current value is yours to change here.'}
        </p>
      ) : (
        <>
          <div className="dres-fr">
            <label htmlFor="dres-name">Name</label>
            <input
              id="dres-name"
              value={draft.name}
              onChange={e => set({ name: e.target.value })}
              placeholder="Hearthfire"
            />
          </div>
          <div className="dres-two">
            <div className="dres-fr">
              <label htmlFor="dres-cur">Current</label>
              <input
                id="dres-cur"
                inputMode="numeric"
                value={draft.current}
                onChange={e => set({ current: e.target.value })}
              />
            </div>
            <div className="dres-fr">
              <label htmlFor="dres-max">Max</label>
              <input
                id="dres-max"
                inputMode="numeric"
                value={draft.max}
                onChange={e => set({ max: e.target.value })}
              />
            </div>
          </div>
          <div className="dres-fr">
            <label>Unit</label>
            <div className="dres-segs">
              {UNITS.map(u => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={draft.unit === u}
                  onClick={() => set({ unit: u })}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="dres-fr">
            <label>Recharges on</label>
            <div className="dres-segs">
              {RECHARGES.map(r => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={draft.recharge === r}
                  onClick={() => set({ recharge: r })}
                >
                  {RECHARGE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="dres-fr">
            <label htmlFor="dres-note">Note</label>
            <textarea
              id="dres-note"
              rows={2}
              value={draft.note}
              onChange={e => set({ note: e.target.value })}
            />
            <p className="dres-hint">Shown wherever this pool is, including at the table.</p>
          </div>
          {!named && <p className="dres-warn">A pool needs a name before it can be saved.</p>}
        </>
      )}

      {locked && (
        <div className="dres-fr">
          <label htmlFor="dres-cur-locked">Current</label>
          <input
            id="dres-cur-locked"
            inputMode="numeric"
            value={draft.current}
            onChange={e => set({ current: e.target.value })}
          />
        </div>
      )}

      <div className="dres-foot">
        {onDelete && (
          <button
            type="button"
            className={arming ? 'dres-del dres-arm' : 'dres-del'}
            onClick={() => (arming ? onDelete() : setArming(true))}
          >
            {arming ? 'Sure?' : 'Delete'}
          </button>
        )}
        <button type="button" className="dres-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="dres-save" onClick={onSave} disabled={!locked && !named}>
          Save
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** The economy slots a homebrew condition may close. Deliberately the four the
 *  turn screen actually has rows for — offering a fifth would be offering a
 *  promise the engine cannot keep. */
const BLOCKABLE = [
  { key: 'action', label: 'action' },
  { key: 'bonusAction', label: 'bonus' },
  { key: 'reaction', label: 'reaction' },
  { key: 'movement', label: 'move' },
] as const

interface CondDraft {
  name: string
  note: string
  blocks: string[]
  disadv: boolean
  advAgainst: boolean
}

function condDraftOf(c: CustomCondition): CondDraft {
  return {
    name: c.name,
    note: c.note ?? '',
    blocks: [...(c.blocks ?? [])],
    disadv: c.yourAttacksHaveDisadvantage === true,
    advAgainst: c.attacksAgainstYouHaveAdvantage === true,
  }
}

const BLANK_COND: CondDraft = { name: '', note: '', blocks: [], disadv: false, advAgainst: false }

function ConditionForm({
  draft,
  set,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: CondDraft
  set: (patch: Partial<CondDraft>) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [arming, setArming] = useState(false)
  const named = draft.name.trim().length > 0
  const toggle = (key: string) =>
    set({
      blocks: draft.blocks.includes(key)
        ? draft.blocks.filter(b => b !== key)
        : [...draft.blocks, key],
    })

  return (
    <div className="dres-form">
      <div className="dres-fr">
        <label htmlFor="dres-cname">Name</label>
        <input
          id="dres-cname"
          value={draft.name}
          onChange={e => set({ name: e.target.value })}
          placeholder="Hearthbound"
        />
      </div>
      <div className="dres-fr">
        <label htmlFor="dres-ctext">What it does</label>
        <textarea
          id="dres-ctext"
          rows={3}
          value={draft.note}
          onChange={e => set({ note: e.target.value })}
        />
        <p className="dres-hint">Shown verbatim at the table, whether or not the app can enforce it.</p>
      </div>
      <div className="dres-fr">
        <label>It stops you taking</label>
        <div className="dres-segs">
          {BLOCKABLE.map(b => (
            <button
              key={b.key}
              type="button"
              aria-pressed={draft.blocks.includes(b.key)}
              onClick={() => toggle(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        {/* The difference between a note and a rule. Anything ticked here
            actually closes that row on the turn screen. */}
        <p className="dres-hint">Anything chosen here really is refused while the condition is on you.</p>
      </div>
      <div className="dres-fr">
        <label>And it also</label>
        <div className="dres-segs">
          <button
            type="button"
            aria-pressed={draft.disadv}
            onClick={() => set({ disadv: !draft.disadv })}
          >
            disadvantage on your attacks
          </button>
          <button
            type="button"
            aria-pressed={draft.advAgainst}
            onClick={() => set({ advAgainst: !draft.advAgainst })}
          >
            advantage against you
          </button>
        </div>
      </div>
      {!named && <p className="dres-warn">A condition needs a name before it can be saved.</p>}
      <div className="dres-foot">
        {onDelete && (
          <button
            type="button"
            className={arming ? 'dres-del dres-arm' : 'dres-del'}
            onClick={() => (arming ? onDelete() : setArming(true))}
          >
            {arming ? 'Sure?' : 'Delete'}
          </button>
        )}
        <button type="button" className="dres-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="dres-save" onClick={onSave} disabled={!named}>
          Save
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

/** `new` is a real editing target, not a null. Modelling "creating" as
 *  `editing === null && creating === true` gives four states for two facts and
 *  is how a form ends up open twice. */
type Open = { kind: 'pool'; id: string } | { kind: 'cond'; name: string } | { kind: 'new-pool' } | { kind: 'new-cond' } | null

export function ResourceLedger({ character, onChange, heading = 'Resources' }: Props) {
  const [open, setOpen] = useState<Open>(null)
  const [draft, setDraft] = useState<Draft>(BLANK)
  const [cond, setCond] = useState<CondDraft>(BLANK_COND)

  const pools = useMemo(() => poolsOf(character), [character])
  const conditions = useMemo(() => character.customConditions ?? [], [character.customConditions])
  const active = useMemo(
    () => new Set((character.conditions ?? []).map(c => c.trim().toLowerCase())),
    [character.conditions],
  )

  const set = useCallback((patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch })), [])
  const setC = useCallback((patch: Partial<CondDraft>) => setCond(d => ({ ...d, ...patch })), [])
  const close = useCallback(() => setOpen(null), [])

  /** Empty and nonsense both become 0 rather than NaN. A field mid-typing is
   *  not an error state; blanking "Current" to retype it must not blank the
   *  pool. */
  const num = (raw: string) => {
    const n = Math.round(Number(raw))
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }

  const savePool = useCallback(
    (pool?: ResolvedPool) => {
      const current = num(draft.current)
      if (pool && !pool.editable) {
        // Only `current` is Marcus's for a derived pool, and setPoolCurrent
        // clamps it to the pool's real max wherever that pool lives.
        onChange(setPoolCurrent(character, pool.id, current))
        close()
        return
      }
      const name = draft.name.trim()
      if (!name) return
      const max = Math.max(0, num(draft.max))
      onChange(
        upsertPool(character, {
          // An existing pool KEEPS its id through a rename. The id is what a
          // feature binding and a pending Undo both point at; minting a new
          // one on every rename would quietly orphan both.
          id: pool ? pool.id : freePoolId(character, name),
          name,
          current: Math.min(current, max),
          max,
          unit: draft.unit,
          recharge: draft.recharge,
          ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        }),
      )
      close()
    },
    [character, draft, onChange, close],
  )

  const saveCond = useCallback(
    (existing?: CustomCondition) => {
      const name = cond.name.trim()
      if (!name) return
      const next: CustomCondition = {
        name,
        ...(cond.note.trim() ? { note: cond.note.trim() } : {}),
        ...(cond.blocks.length ? { blocks: cond.blocks as CustomCondition['blocks'] } : {}),
        ...(cond.disadv ? { yourAttacksHaveDisadvantage: true } : {}),
        ...(cond.advAgainst ? { attacksAgainstYouHaveAdvantage: true } : {}),
      }
      const list = [...conditions]
      const at = existing ? list.findIndex(c => c.name === existing.name) : -1
      if (at >= 0) list[at] = next
      else list.push(next)
      onChange({ ...character, customConditions: list })
      close()
    },
    [character, cond, conditions, onChange, close],
  )

  const removeCond = useCallback(
    (name: string) => {
      onChange({
        ...character,
        customConditions: conditions.filter(c => c.name !== name),
        // The name also comes off the active list, or Marcus is left with a
        // condition on him that nothing in the app can describe or remove.
        conditions: (character.conditions ?? []).filter(
          c => c.trim().toLowerCase() !== name.trim().toLowerCase(),
        ),
      })
      close()
    },
    [character, conditions, onChange, close],
  )

  return (
    <div className="dres">
      {/* Suppressed with `heading=""` when the frame around us already names
          this surface — inside the character sheet's own collapsible section,
          or inside the turn screen. Two headings stacked is not emphasis. */}
      {heading !== '' && (
        <div className="dres-hd">
          <h2>{heading}</h2>
          <span className="dres-n">
            {pools.length} {pools.length === 1 ? 'pool' : 'pools'}
            {conditions.length > 0 &&
              ` · ${conditions.length} ${conditions.length === 1 ? 'condition' : 'conditions'}`}
          </span>
        </div>
      )}

      <div className="dres-sect">Pools</div>
      <div className="dres-stack">
        {pools.length === 0 && open?.kind !== 'new-pool' && (
          <p className="dres-empty">
            Nothing countable yet. A pool is anything you spend — points, uses or dice.
          </p>
        )}

        {pools.map(pool => {
          const editing = open?.kind === 'pool' && open.id === pool.id
          const sub = poolSub(pool)
          const pct = pool.max > 0 ? Math.min(1, pool.current / pool.max) : 0
          return (
            <div key={pool.id} className={editing ? 'dres-pool dres-editing' : 'dres-pool'}>
              <div className="dres-top">
                <div className="dres-idc">
                  <span className="dres-nm">{pool.name}</span>
                  <span className="dres-sub">
                    <b>{sub.count}</b> {sub.rest}
                    {pool.homebrew && <> · <span className="dres-hb">homebrew</span></>}
                  </span>
                  {pool.note && <span className="dres-note">{pool.note}</span>}
                </div>
                {!editing && (
                  <div className="dres-val">
                    <PoolValue
                      pool={pool}
                      onSet={v => onChange(setPoolCurrent(character, pool.id, v))}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="dres-ed"
                  aria-expanded={editing}
                  onClick={() => {
                    if (editing) return close()
                    setDraft(draftOf(pool))
                    setOpen({ kind: 'pool', id: pool.id })
                  }}
                >
                  {editing ? 'Editing' : 'Edit'}
                </button>
              </div>

              {/* The bar belongs to the gauge form only — under a row of pips
                  it would be the same reading twice. */}
              {!editing && pool.max > PIP_LIMIT && (
                <div className="dres-track">
                  <i
                    className={pct <= LOW ? 'dres-low' : undefined}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              )}

              {editing && (
                <PoolForm
                  draft={draft}
                  set={set}
                  pool={pool}
                  onSave={() => savePool(pool)}
                  onCancel={close}
                  {...(pool.editable
                    ? {
                        onDelete: () => {
                          onChange(removePool(character, pool.id))
                          close()
                        },
                      }
                    : {})}
                />
              )}
            </div>
          )
        })}

        {open?.kind === 'new-pool' ? (
          <div className="dres-pool dres-editing">
            <div className="dres-top">
              <div className="dres-idc">
                <span className="dres-nm">{draft.name.trim() || 'New pool'}</span>
                <span className="dres-sub">
                  {draft.unit} · {RECHARGE_LABEL[draft.recharge]}
                </span>
              </div>
            </div>
            <PoolForm draft={draft} set={set} onSave={() => savePool()} onCancel={close} />
          </div>
        ) : (
          <button
            type="button"
            className="dres-new"
            onClick={() => {
              setDraft(BLANK)
              setOpen({ kind: 'new-pool' })
            }}
          >
            + New pool
          </button>
        )}
      </div>

      <div className="dres-sect">Conditions</div>
      <div className="dres-stack">
        {conditions.length === 0 && open?.kind !== 'new-cond' && (
          <p className="dres-empty">
            The fifteen conditions of the 2024 rules are already known. This is for the ones your
            table invented.
          </p>
        )}

        {conditions.map(c => {
          const editing = open?.kind === 'cond' && open.name === c.name
          return (
            <div key={c.name} className={editing ? 'dres-cond dres-editing' : 'dres-cond'}>
              <div>
                <span className="dres-nm">{c.name}</span>
                {c.note && <span className="dres-tx">{c.note}</span>}
                {active.has(c.name.trim().toLowerCase()) && (
                  <span className="dres-active">● active</span>
                )}
              </div>
              <button
                type="button"
                className="dres-ed"
                aria-expanded={editing}
                onClick={() => {
                  if (editing) return close()
                  setCond(condDraftOf(c))
                  setOpen({ kind: 'cond', name: c.name })
                }}
              >
                {editing ? 'Editing' : 'Edit'}
              </button>
              {editing && (
                <ConditionForm
                  draft={cond}
                  set={setC}
                  onSave={() => saveCond(c)}
                  onCancel={close}
                  onDelete={() => removeCond(c.name)}
                />
              )}
            </div>
          )
        })}

        {open?.kind === 'new-cond' ? (
          <div className="dres-cond dres-editing">
            <div>
              <span className="dres-nm">{cond.name.trim() || 'New condition'}</span>
            </div>
            <ConditionForm draft={cond} set={setC} onSave={() => saveCond()} onCancel={close} />
          </div>
        ) : (
          <button
            type="button"
            className="dres-new"
            onClick={() => {
              setCond(BLANK_COND)
              setOpen({ kind: 'new-cond' })
            }}
          >
            + New condition
          </button>
        )}
      </div>
    </div>
  )
}
