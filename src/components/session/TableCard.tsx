/* The table — the roster, who has been quiet, and one button per person.
 *
 * ── WHY THIS COMPONENT IS THE ANSWER TO "NOT 100% USEFUL" ──────────────────
 * Marcus, asked who the roleplay tab is for: *"Explicitly the table — I'm the
 * social engine."* Everything in `components/session/` before this file is about
 * Nix: what Nix would say, how Nix reacts, what Nix remembers. None of it knows
 * anybody else is in the room.
 *
 * A social engine's actual job is noticing that the person on his left has not
 * spoken in twenty minutes and handing them something they cannot answer wrong.
 * That is what this card is: a roster with a clock on it, and an "Aim a beat"
 * button that turns the noticing into a move.
 *
 * The ranking lives in `lib/rp/table.ts` and is tested there. This file draws it. */

import { useState } from 'react'
import { Users, Plus, X, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import { nextToAim, quietLabel } from '../../lib/rp/table'
import type { TableMember, TableState } from '../../lib/rp/types'

interface TableCardProps {
  table: TableState
  onChange: (next: TableState) => void
  onAim: (member: TableMember) => void
  /** Injected so the component is a pure function of its props in a test. */
  now?: number
}

let seq = 0
const newId = () => `tm-${Date.now().toString(36)}-${++seq}`

export function TableCard({ table, onChange, onAim, now = Date.now() }: TableCardProps) {
  const [draft, setDraft] = useState('')
  const [draftIsNew, setDraftIsNew] = useState(false)

  const suggested = nextToAim(table, now)

  const add = () => {
    const name = draft.trim()
    if (!name) return
    onChange({
      ...table,
      members: [...table.members, {
        id: newId(), name, isNew: draftIsNew, lastSpotlightAt: null, beatsAimed: 0,
      }],
    })
    setDraft('')
    setDraftIsNew(false)
  }

  const remove = (id: string) =>
    onChange({ ...table, members: table.members.filter(m => m.id !== id) })

  const toggleNew = (id: string) =>
    onChange({
      ...table,
      members: table.members.map(m => (m.id === id ? { ...m, isNew: !m.isNew } : m)),
    })

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <Users size={16} className="text-verdant" aria-hidden />
        <h3 className="flex-1 text-sm font-semibold text-forge-0">The table</h3>
        <span className="text-[11px] tabular-nums text-forge-2">{table.members.length}</span>
      </div>

      {/* ── The nudge. One sentence, and it is the whole point of the card. ── */}
      {suggested && (
        <div className="px-4 py-2.5 bg-verdant/[0.06] border-b border-white/[0.06]">
          <p className="text-[12px] leading-relaxed text-verdant">
            <span className="font-semibold">{suggested.name}</span>
            {suggested.isNew ? ' has never played before' : ''}
            {suggested.isNew && suggested.lastSpotlightAt === null ? ' and ' : ' — '}
            {quietLabel(suggested, now)}.
          </p>
        </div>
      )}

      <div className="divide-y divide-white/[0.05]">
        {table.members.map(m => (
          <div key={m.id} className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => toggleNew(m.id)}
              aria-label={m.isNew ? `${m.name} is a first-timer` : `Mark ${m.name} as new`}
              className={cn(
                'shrink-0 min-h-[44px] px-2 rounded-lg text-left',
                'transition-all duration-200 ease-forge active:scale-[0.96]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
              )}
            >
              <span className="block text-sm text-forge-0">{m.name}</span>
              <span className={cn(
                'block text-[10px] uppercase tracking-[0.1em]',
                m.isNew ? 'text-verdant' : 'text-forge-2/70',
              )}>
                {m.isNew ? 'first session' : quietLabel(m, now)}
              </span>
            </button>

            <span className="flex-1" />

            <button
              type="button"
              onClick={() => onAim(m)}
              className={cn(
                'inline-flex items-center gap-1.5 shrink-0',
                'min-h-[44px] px-3 rounded-xl',
                'bg-arcane/12 border border-arcane/25',
                'text-[12px] font-semibold text-arcane-lit',
                'transition-all duration-200 ease-forge active:scale-[0.96]',
                'hover:bg-arcane/20',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              <Sparkles size={13} aria-hidden />
              Aim a beat
            </button>

            <button
              type="button"
              onClick={() => remove(m.id)}
              aria-label={`Remove ${m.name}`}
              className={cn(
                'shrink-0 inline-flex items-center justify-center',
                'w-11 h-11 rounded-xl text-forge-2',
                'transition-all duration-200 ease-forge active:scale-[0.92]',
                'hover:bg-white/[0.06] hover:text-forge-1',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              )}
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        ))}
      </div>

      {/* ── Add a person. Two taps, because he is doing this while people are
             sitting down and taking their coats off. ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/[0.06] bg-black/20">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add a player"
          className={cn(
            'flex-1 min-w-0 min-h-[44px] px-3 rounded-xl',
            'bg-black/30 border border-white/10',
            'text-sm text-forge-0 placeholder:text-forge-2/70',
            'focus:outline-none focus:border-verdant/50 focus:ring-1 focus:ring-verdant/30',
          )}
        />
        <button
          type="button"
          onClick={() => setDraftIsNew(v => !v)}
          aria-pressed={draftIsNew}
          className={cn(
            'shrink-0 min-h-[44px] px-2.5 rounded-xl border',
            'text-[10px] font-semibold uppercase tracking-[0.1em]',
            'transition-all duration-200 ease-forge active:scale-[0.96]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
            draftIsNew
              ? 'bg-verdant/15 border-verdant/35 text-verdant'
              : 'bg-white/[0.04] border-white/10 text-forge-2',
          )}
        >
          New
        </button>
        <button
          type="button"
          onClick={add}
          aria-label="Add player"
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'w-11 h-11 rounded-xl',
            'bg-verdant/15 border border-verdant/30 text-verdant',
            'transition-all duration-200 ease-forge active:scale-[0.92]',
            'hover:bg-verdant/20',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verdant',
          )}
        >
          <Plus size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
