import { useState, useEffect, useRef, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Globe,
  Scroll,
  Users,
  UserCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { Character, CampaignData, PartyMember, CampaignNPC, SessionNote } from '../lib/character'
import { generateId, saveCharacter } from '../lib/character'
import { createDefaultCampaign, saveCampaign, loadCampaign } from '../lib/campaign'
import { GlassCard } from './ui/GlassCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CampaignEditorProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

/* ------------------------------------------------------------------ */
/*  Accordion Section                                                  */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: LucideIcon
  count?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2.5 w-full min-h-[44px] px-4 py-3 text-left',
          'transition-all duration-200 ease-forge active:scale-[0.98]',
          'hover:bg-white/[0.04]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          open && 'bg-white/[0.02]',
        )}
      >
        <Icon size={16} className="text-arcane shrink-0" />
        <span className="font-display text-sm font-semibold text-forge-0 flex-1">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant="arcane">{count}</Badge>
        )}
        {open ? (
          <ChevronDown size={16} className="text-forge-2 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-forge-2 shrink-0" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline text input                                                  */
/* ------------------------------------------------------------------ */

const inputClasses = cn(
  'min-h-[44px] w-full rounded-xl',
  'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
  'border border-white/10',
  'px-4 py-3 text-sm font-body',
  'transition-all duration-200 ease-forge',
  'focus:border-arcane/60 focus:bg-void-2/80',
  'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
  'focus:outline-none',
)

const textareaClasses = cn(
  'w-full rounded-xl resize-none',
  'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
  'border border-white/10',
  'px-4 py-3 text-sm font-body',
  'transition-all duration-200 ease-forge',
  'focus:border-arcane/60 focus:bg-void-2/80',
  'focus:shadow-[0_0_0_3px_rgba(61,210,255,0.12)]',
  'focus:outline-none',
)

/* ------------------------------------------------------------------ */
/*  CampaignEditor Component                                           */
/* ------------------------------------------------------------------ */

export function CampaignEditor({ character, onCharacterUpdate }: CampaignEditorProps) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true,
    world: false,
    quest: false,
    party: false,
    npcs: false,
    sessions: false,
  })

  // Party member add form
  const [newPartyMember, setNewPartyMember] = useState<PartyMember>({
    name: '', class: '', race: '', personality: '', relationshipToPC: '',
  })
  const [showPartyForm, setShowPartyForm] = useState(false)
  const [editingPartyIdx, setEditingPartyIdx] = useState<number | null>(null)

  // NPC add form
  const [newNPC, setNewNPC] = useState<CampaignNPC>({ name: '', role: '', notes: '' })
  const [showNPCForm, setShowNPCForm] = useState(false)
  const [editingNPCIdx, setEditingNPCIdx] = useState<number | null>(null)

  // Session note add form
  const [newSession, setNewSession] = useState<SessionNote>({ id: '', date: '', summary: '' })
  const [showSessionForm, setShowSessionForm] = useState(false)

  // Delete confirmations
  const [deletePartyIdx, setDeletePartyIdx] = useState<number | null>(null)
  const [deleteNPCIdx, setDeleteNPCIdx] = useState<number | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  // Debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ------ Load campaign on mount / when character changes ------ */
  useEffect(() => {
    if (character.campaignId) {
      const loaded = loadCampaign(character.campaignId)
      if (loaded) {
        setCampaign(loaded)
        return
      }
    }
    // Auto-create a new campaign for this character
    const newCampaign = createDefaultCampaign()
    saveCampaign(newCampaign)
    const updated = { ...character, campaignId: newCampaign.id }
    onCharacterUpdate(updated)
    saveCharacter(updated)
    setCampaign(newCampaign)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  /* ------ Debounced auto-save ------ */
  const debouncedSave = useCallback((updated: CampaignData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveCampaign(updated)
    }, 600)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  /* ------ Update helper ------ */
  const updateCampaign = useCallback((updates: Partial<CampaignData>) => {
    setCampaign(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      debouncedSave(updated)
      return updated
    })
  }, [debouncedSave])

  /* ------ Toggle section ------ */
  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (!campaign) return null

  /* ------ Party Member CRUD ------ */
  const handleAddPartyMember = () => {
    if (!newPartyMember.name.trim()) return
    const members = [...campaign.partyMembers, newPartyMember]
    updateCampaign({ partyMembers: members })
    setNewPartyMember({ name: '', class: '', race: '', personality: '', relationshipToPC: '' })
    setShowPartyForm(false)
  }

  const handleUpdatePartyMember = (idx: number, member: PartyMember) => {
    const members = [...campaign.partyMembers]
    members[idx] = member
    updateCampaign({ partyMembers: members })
    setEditingPartyIdx(null)
  }

  const handleDeletePartyMember = (idx: number) => {
    const members = campaign.partyMembers.filter((_, i) => i !== idx)
    updateCampaign({ partyMembers: members })
    setDeletePartyIdx(null)
  }

  /* ------ NPC CRUD ------ */
  const handleAddNPC = () => {
    if (!newNPC.name.trim()) return
    const npcs = [...campaign.notableNPCs, newNPC]
    updateCampaign({ notableNPCs: npcs })
    setNewNPC({ name: '', role: '', notes: '' })
    setShowNPCForm(false)
  }

  const handleUpdateNPC = (idx: number, npc: CampaignNPC) => {
    const npcs = [...campaign.notableNPCs]
    npcs[idx] = npc
    updateCampaign({ notableNPCs: npcs })
    setEditingNPCIdx(null)
  }

  const handleDeleteNPC = (idx: number) => {
    const npcs = campaign.notableNPCs.filter((_, i) => i !== idx)
    updateCampaign({ notableNPCs: npcs })
    setDeleteNPCIdx(null)
  }

  /* ------ Session Note CRUD ------ */
  const handleAddSession = () => {
    if (!newSession.summary.trim()) return
    const note: SessionNote = {
      id: generateId(),
      date: newSession.date || new Date().toISOString().split('T')[0],
      summary: newSession.summary,
    }
    // Prepend newest first, cap at 20
    const notes = [note, ...campaign.sessionNotes].slice(0, 20)
    updateCampaign({ sessionNotes: notes })
    setNewSession({ id: '', date: '', summary: '' })
    setShowSessionForm(false)
  }

  const handleDeleteSession = (id: string) => {
    const notes = campaign.sessionNotes.filter(s => s.id !== id)
    updateCampaign({ sessionNotes: notes })
    setDeleteSessionId(null)
  }

  /* ------ Render ------ */
  return (
    <GlassCard>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-lg bg-arcane/10 flex items-center justify-center shrink-0">
          <Globe size={18} className="text-arcane" aria-hidden />
        </div>
        <h3 className="font-display text-base font-semibold text-forge-0">Campaign & World</h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Basics Section */}
        <Section
          title="Campaign Basics"
          icon={Globe}
          open={openSections.basics}
          onToggle={() => toggleSection('basics')}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-forge-1">Campaign Name</label>
              <input
                type="text"
                value={campaign.name}
                onChange={e => updateCampaign({ name: e.target.value })}
                placeholder="e.g., Curse of Strahd"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-forge-1">Setting</label>
              <input
                type="text"
                value={campaign.setting}
                onChange={e => updateCampaign({ setting: e.target.value })}
                placeholder="e.g., Forgotten Realms, Eberron, Homebrew"
                className={inputClasses}
              />
            </div>
          </div>
        </Section>

        {/* World Details Section */}
        <Section
          title="World Details"
          icon={Scroll}
          open={openSections.world}
          onToggle={() => toggleSection('world')}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-forge-1">World Lore & Context</label>
            <textarea
              value={campaign.worldDetails}
              onChange={e => updateCampaign({ worldDetails: e.target.value })}
              placeholder="Key world details the AI should know about (nations, factions, magic systems, key history...)"
              rows={4}
              className={textareaClasses}
            />
          </div>
        </Section>

        {/* Current Quest Section */}
        <Section
          title="Current Quest"
          icon={BookOpen}
          open={openSections.quest}
          onToggle={() => toggleSection('quest')}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-forge-1">Active Quest / Objective</label>
            <textarea
              value={campaign.currentQuest}
              onChange={e => updateCampaign({ currentQuest: e.target.value })}
              placeholder="What is the party currently doing? What's the objective?"
              rows={3}
              className={textareaClasses}
            />
          </div>
        </Section>

        {/* Party Members Section */}
        <Section
          title="Party Members"
          icon={Users}
          count={campaign.partyMembers.length}
          open={openSections.party}
          onToggle={() => toggleSection('party')}
        >
          <div className="flex flex-col gap-3">
            {campaign.partyMembers.map((member, idx) => (
              <div
                key={`party-${idx}`}
                className="p-3 rounded-lg bg-white/[0.02] border border-white/8"
              >
                {editingPartyIdx === idx ? (
                  <PartyMemberForm
                    member={member}
                    onSave={(m) => handleUpdatePartyMember(idx, m)}
                    onCancel={() => setEditingPartyIdx(null)}
                  />
                ) : deletePartyIdx === idx ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-forge-0">Remove <span className="font-semibold">{member.name}</span>?</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDeletePartyIdx(null)} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePartyMember(idx)}
                        className="flex-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                      >
                        <Trash2 size={14} aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-forge-0">{member.name}</span>
                        <Badge variant="neutral">{member.race} {member.class}</Badge>
                      </div>
                      {member.personality && (
                        <p className="text-xs text-forge-2 mb-0.5">{member.personality}</p>
                      )}
                      {member.relationshipToPC && (
                        <p className="text-xs text-forge-2 italic">Relationship: {member.relationshipToPC}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingPartyIdx(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06] transition-colors duration-200"
                        aria-label={`Edit ${member.name}`}
                      >
                        <Scroll size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletePartyIdx(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                        aria-label={`Delete ${member.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {showPartyForm ? (
              <div className="p-3 rounded-lg bg-arcane/5 border border-arcane/20">
                <PartyMemberForm
                  member={newPartyMember}
                  onSave={(m) => { setNewPartyMember(m); handleAddPartyMember() }}
                  onCancel={() => setShowPartyForm(false)}
                  onChange={setNewPartyMember}
                  isNew
                />
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPartyForm(true)}
                className="w-full"
              >
                <Plus size={14} aria-hidden />
                Add Party Member
              </Button>
            )}
          </div>
        </Section>

        {/* Notable NPCs Section */}
        <Section
          title="Notable NPCs"
          icon={UserCircle}
          count={campaign.notableNPCs.length}
          open={openSections.npcs}
          onToggle={() => toggleSection('npcs')}
        >
          <div className="flex flex-col gap-3">
            {campaign.notableNPCs.map((npc, idx) => (
              <div
                key={`npc-${idx}`}
                className="p-3 rounded-lg bg-white/[0.02] border border-white/8"
              >
                {editingNPCIdx === idx ? (
                  <NPCForm
                    npc={npc}
                    onSave={(n) => handleUpdateNPC(idx, n)}
                    onCancel={() => setEditingNPCIdx(null)}
                  />
                ) : deleteNPCIdx === idx ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-forge-0">Remove <span className="font-semibold">{npc.name}</span>?</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDeleteNPCIdx(null)} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNPC(idx)}
                        className="flex-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                      >
                        <Trash2 size={14} aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-forge-0">{npc.name}</span>
                        {npc.role && <Badge variant="eldritch">{npc.role}</Badge>}
                      </div>
                      {npc.notes && <p className="text-xs text-forge-2">{npc.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingNPCIdx(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-forge-2 hover:text-forge-0 hover:bg-white/[0.06] transition-colors duration-200"
                        aria-label={`Edit ${npc.name}`}
                      >
                        <Scroll size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteNPCIdx(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                        aria-label={`Delete ${npc.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {showNPCForm ? (
              <div className="p-3 rounded-lg bg-eldritch/5 border border-eldritch/20">
                <NPCForm
                  npc={newNPC}
                  onSave={(n) => { setNewNPC(n); handleAddNPC() }}
                  onCancel={() => setShowNPCForm(false)}
                  onChange={setNewNPC}
                  isNew
                />
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNPCForm(true)}
                className="w-full"
              >
                <Plus size={14} aria-hidden />
                Add NPC
              </Button>
            )}
          </div>
        </Section>

        {/* Session Notes Section */}
        <Section
          title="Session Notes"
          icon={BookOpen}
          count={campaign.sessionNotes.length}
          open={openSections.sessions}
          onToggle={() => toggleSection('sessions')}
        >
          <div className="flex flex-col gap-3">
            {showSessionForm ? (
              <div className="p-3 rounded-lg bg-verdant/5 border border-verdant/20">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-forge-1">Date</label>
                    <input
                      type="date"
                      value={newSession.date}
                      onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                      className={inputClasses}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-forge-1">Summary</label>
                    <textarea
                      value={newSession.summary}
                      onChange={e => setNewSession({ ...newSession, summary: e.target.value })}
                      placeholder="What happened this session?"
                      rows={3}
                      className={textareaClasses}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowSessionForm(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddSession}
                      disabled={!newSession.summary.trim()}
                      className="flex-1"
                    >
                      <Check size={14} aria-hidden />
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewSession({ id: '', date: new Date().toISOString().split('T')[0], summary: '' })
                  setShowSessionForm(true)
                }}
                className="w-full"
              >
                <Plus size={14} aria-hidden />
                Add Session Note
              </Button>
            )}

            {campaign.sessionNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-white/[0.02] border border-white/8"
              >
                {deleteSessionId === note.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-forge-0">Delete this session note?</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDeleteSessionId(null)} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(note.id)}
                        className="flex-1 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                      >
                        <Trash2 size={14} aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-forge-2 block mb-1">{note.date}</span>
                      <p className="text-sm text-forge-0">{note.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteSessionId(note.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-forge-2 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 shrink-0"
                      aria-label="Delete session note"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {campaign.sessionNotes.length === 0 && !showSessionForm && (
              <p className="text-xs text-forge-2 text-center py-2">No session notes yet.</p>
            )}
          </div>
        </Section>
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Party Member Form (used for both add and edit)                      */
/* ------------------------------------------------------------------ */

function PartyMemberForm({
  member,
  onSave,
  onCancel,
  onChange,
  isNew = false,
}: {
  member: PartyMember
  onSave: (m: PartyMember) => void
  onCancel: () => void
  onChange?: (m: PartyMember) => void
  isNew?: boolean
}) {
  const [local, setLocal] = useState<PartyMember>(member)

  const update = (field: keyof PartyMember, value: string) => {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    if (onChange) onChange(updated)
  }

  const handleSubmit = () => {
    if (!local.name.trim()) return
    onSave(local)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Name</label>
          <input
            type="text"
            value={local.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Thorn"
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Class</label>
          <input
            type="text"
            value={local.class}
            onChange={e => update('class', e.target.value)}
            placeholder="Rogue"
            className={inputClasses}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Race</label>
          <input
            type="text"
            value={local.race}
            onChange={e => update('race', e.target.value)}
            placeholder="Half-Elf"
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Relationship</label>
          <input
            type="text"
            value={local.relationshipToPC}
            onChange={e => update('relationshipToPC', e.target.value)}
            placeholder="Childhood friend"
            className={inputClasses}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-forge-1">Personality</label>
        <input
          type="text"
          value={local.personality}
          onChange={e => update('personality', e.target.value)}
          placeholder="Sarcastic but loyal"
          className={inputClasses}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!local.name.trim()}
          className="flex-1"
        >
          <Check size={14} aria-hidden />
          {isNew ? 'Add' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  NPC Form (used for both add and edit)                               */
/* ------------------------------------------------------------------ */

function NPCForm({
  npc,
  onSave,
  onCancel,
  onChange,
  isNew = false,
}: {
  npc: CampaignNPC
  onSave: (n: CampaignNPC) => void
  onCancel: () => void
  onChange?: (n: CampaignNPC) => void
  isNew?: boolean
}) {
  const [local, setLocal] = useState<CampaignNPC>(npc)

  const update = (field: keyof CampaignNPC, value: string) => {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    if (onChange) onChange(updated)
  }

  const handleSubmit = () => {
    if (!local.name.trim()) return
    onSave(local)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Name</label>
          <input
            type="text"
            value={local.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Vex'ahlia"
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-forge-1">Role</label>
          <input
            type="text"
            value={local.role}
            onChange={e => update('role', e.target.value)}
            placeholder="Ally, Villain, Merchant..."
            className={inputClasses}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-forge-1">Notes</label>
        <textarea
          value={local.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="What does the AI need to know about this NPC?"
          rows={2}
          className={textareaClasses}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!local.name.trim()}
          className="flex-1"
        >
          <Check size={14} aria-hidden />
          {isNew ? 'Add' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
