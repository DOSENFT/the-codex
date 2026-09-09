/* The scene, in one line, at the top of the page.
 *
 * ── WHY THIS IS THE FIRST THING ─────────────────────────────────────────────
 * Marcus: *"tonight's session is going to be a huge role play session because we
 * have a campfire, we have 2 new players"*. Until this bar existed, the app had
 * no way to be told either of those facts — every prompt it sent described Nix
 * and nothing else, which is most of why the answers felt generic.
 *
 * Two fields, both optional, both free text. Not a dropdown of scene types: the
 * useful sentence tonight is "campfire, first night for two of them, everyone is
 * still being polite", and no dropdown has that in it. */

import { useState } from 'react'
import { MapPin, Check, Pencil } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SceneBarProps {
  scene: string
  mood: string
  onChange: (next: { scene: string; mood: string }) => void
}

const FIELD =
  'w-full min-h-[44px] px-3 py-2 rounded-xl bg-black/30 border border-white/10 ' +
  'text-sm text-forge-0 placeholder:text-forge-2/70 ' +
  'focus:outline-none focus:border-arcane/50 focus:ring-1 focus:ring-arcane/30'

export function SceneBar({ scene, mood, onChange }: SceneBarProps) {
  // Open by default when empty: an empty scene bar that looks like a finished
  // header is a field he never discovers, and it is the field that does the most.
  const [editing, setEditing] = useState(!scene)
  const [draftScene, setDraftScene] = useState(scene)
  const [draftMood, setDraftMood] = useState(mood)

  const commit = () => {
    onChange({ scene: draftScene.trim(), mood: draftMood.trim() })
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraftScene(scene); setDraftMood(mood); setEditing(true) }}
        className={cn(
          'w-full flex items-center gap-2.5 text-left',
          'min-h-[48px] px-3.5 py-2.5 rounded-xl',
          'glass-card border border-white/10',
          'transition-all duration-200 ease-forge active:scale-[0.98]',
          'hover:bg-white/[0.05]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        <MapPin size={15} className="shrink-0 text-arcane" aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-forge-0 truncate">
            {scene || 'Set the scene'}
          </span>
          {mood && (
            <span className="block text-[11.5px] text-forge-2 truncate">{mood}</span>
          )}
        </span>
        <Pencil size={14} className="shrink-0 text-forge-2" aria-hidden />
      </button>
    )
  }

  return (
    <div className="glass-card rounded-xl border border-white/10 p-3 space-y-2.5 animate-fade-in">
      <label className="block">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-forge-2 mb-1.5">
          Where are you
        </span>
        <input
          className={FIELD}
          value={draftScene}
          onChange={e => setDraftScene(e.target.value)}
          placeholder="Around the campfire, first night out"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-forge-2 mb-1.5">
          What the room feels like
        </span>
        <input
          className={FIELD}
          value={draftMood}
          onChange={e => setDraftMood(e.target.value)}
          placeholder="Everyone is still being polite. Nobody has said the real thing."
        />
      </label>

      <button
        type="button"
        onClick={commit}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2',
          'min-h-[44px] rounded-xl',
          'bg-arcane/15 border border-arcane/30',
          'text-sm font-semibold text-arcane-lit',
          'transition-all duration-200 ease-forge active:scale-[0.97]',
          'hover:bg-arcane/20',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
        )}
      >
        <Check size={15} aria-hidden />
        That&rsquo;s the scene
      </button>
    </div>
  )
}
