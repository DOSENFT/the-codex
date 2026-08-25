/* ============================================================================
   The Table Covenant — written once, edited whenever, read at a glance
   ----------------------------------------------------------------------------
   Lines never happen. Veils happen off-screen and play moves on. The editor
   holds both in one list because at a real table they are one conversation,
   and a boundary often moves from one column to the other — so changing which
   it is has to be a single press, not a delete-and-retype.

   Written in the v0.9 card language (GlassCard/OrnateHeader) rather than D's,
   because it lives inside Settings and a lone D-language card in a v0.9 sheet
   reads as a rendering bug. Slice 13 converts the surface; this comes with it.

   Two things are deliberately absent:
   · No AI anywhere near this. Not a suggestion, not a "common lines" list, not
     a summariser. Marcus's words go in and come out unchanged, and nothing on
     this card ever leaves the device.
   · No sharing, no export. The covenant is not in the character export either
     — safety notes are not campaign data and must not travel in a file that
     gets handed around.
   ========================================================================== */
import { useState, useCallback } from 'react'
import { Plus, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react'
import {
  loadCovenant,
  saveCovenant,
  addEntry,
  updateEntry,
  removeEntry,
  isBlank,
  type Boundary,
  type Covenant,
} from '../../lib/covenant'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { OrnateHeader } from '../ui/OrnateHeader'
import { Input } from '../ui/Input'

const KIND_LABEL: Record<Boundary, string> = {
  line: 'Line — never happens',
  veil: 'Veil — happens off-screen',
}

export function TableCovenant() {
  const [covenant, setCovenant] = useState<Covenant>(loadCovenant)
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<Boundary>('line')
  const [failure, setFailure] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  /* Every mutation goes through here, so there is exactly one place where a
     failed write is handled — and it is handled by NOT moving the UI on. If the
     device refused to store the line, the list must not show it as stored. */
  const commit = useCallback((next: Covenant) => {
    const result = saveCovenant(next)
    if (!result.ok) {
      setFailure(result.reason)
      return false
    }
    setCovenant(result.saved)
    setFailure(null)
    setSavedAt(result.saved.updatedAt)
    return true
  }, [])

  const handleAdd = useCallback(() => {
    const next = addEntry(covenant, draftKind, draft)
    if (next === covenant) return // blank — nothing to add
    if (commit(next)) setDraft('')
  }, [covenant, draft, draftKind, commit])

  return (
    <GlassCard>
      <OrnateHeader className="mb-2">The Table Covenant</OrnateHeader>
      <p className="text-forge-2 text-sm mb-5">
        Agreed once, changed any time. The <span className="text-forge-0">Veil</span> button in the
        corner of every screen works whether or not anything is written here.
      </p>

      {failure && (
        <div className="flex items-start gap-2 mb-4 text-red-300 text-sm" role="alert">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>This device would not save that: {failure}. Nothing was changed.</span>
        </div>
      )}

      {/* ---- the agreement ---- */}
      {isBlank(covenant) ? (
        <p className="text-forge-2 text-sm mb-5">Nothing written down yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-5 list-none p-0">
          {covenant.entries.map(entry => (
            <li key={entry.id} className="flex items-center gap-2">
              {/* One press moves a boundary between the columns, because at a
                  table they move — and re-typing a line to reclassify it is a
                  chance to lose it. */}
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 w-28 justify-center"
                aria-label={`${entry.text}: ${KIND_LABEL[entry.kind]}. Change.`}
                onClick={() =>
                  commit(updateEntry(covenant, entry.id, { kind: entry.kind === 'line' ? 'veil' : 'line' }))
                }
              >
                {entry.kind === 'line' ? 'Line' : 'Veil'}
              </Button>
              <span className="flex-1 text-forge-1 text-sm break-words">{entry.text}</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                aria-label={`Remove ${entry.text}`}
                onClick={() => commit(removeEntry(covenant, entry.id))}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* ---- add one ---- */}
      <div className="flex flex-col gap-2 mb-4">
        {/* One column on the phone, two from `sm` up.
            These two were a single `flex` row. Their labels are the whole
            point — «Line — never happens» and «Veil — happens off-screen» say
            what the choice means, and are not abbreviated to fit — so the row
            wanted 382px of button inside a 326px column and `flex` does not
            wrap. _g5-trapped-overlay.mjs measured the consequence on all seven
            screens:

              XX "Veil — happens off-screen"  196x48
                 best case: x 214..410 of 390

            Twenty pixels of the veil button were off the right edge of the
            device, permanently, in the one panel in this app where a
            mis-tap costs someone at the table something real. The same species
            as the A-23 header overflow, in the safety card.

            Stacking is the fix rather than shortening the labels because the
            labels are the safety copy, and because a full-width target is the
            better one anyway at arm's length: each is now 326px wide instead
            of 178 and 196, and neither can be clipped at any width. */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['line', 'veil'] as Boundary[]).map(kind => (
            <Button
              key={kind}
              variant={draftKind === kind ? 'primary' : 'secondary'}
              size="sm"
              className="justify-center"
              aria-pressed={draftKind === kind}
              onClick={() => setDraftKind(kind)}
            >
              {KIND_LABEL[kind]}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder="Harm to children"
            aria-label="A new line or veil"
            className="flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={!draft.trim()}
            aria-label="Add to the covenant"
            className="shrink-0"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* ---- anything that is neither ---- */}
      <label className="block text-forge-2 text-xs uppercase tracking-wider mb-2" htmlFor="covenant-note">
        Anything else the table should know
      </label>
      <textarea
        id="covenant-note"
        value={covenant.note}
        onChange={e => setCovenant({ ...covenant, note: e.target.value })}
        onBlur={() => commit(covenant)}
        rows={3}
        placeholder="Check in with me before anything involving my character's family."
        className="w-full rounded-lg bg-void-1/60 border border-white/[0.08] p-3 text-sm text-forge-1 placeholder:text-forge-3"
      />

      {savedAt && (
        <p className="flex items-center gap-2 text-forge-2 text-xs mt-3">
          <ShieldCheck size={14} aria-hidden="true" />
          Saved on this device only. Never exported, never sent anywhere, never shown to the advisor.
        </p>
      )}
    </GlassCard>
  )
}
