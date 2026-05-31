import { useState, useCallback, useRef } from 'react'
import { MessageSquare, Zap, BookOpen, Copy, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import { ACCENT_GUIDES } from '../../lib/accent-data'
import { setActiveIdentity } from '../../lib/identity'

import { ActionCard } from './ActionCard'
import { PersonaStrip } from './PersonaStrip'
import { SceneContextFilter, type SceneContext } from './SceneContextFilter'
import { IdentitySwitcher } from './IdentitySwitcher'
import { AIAssistPanel } from './AIAssistPanel'
import { EngageCard } from './EngageCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionCockpitProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

// ---------------------------------------------------------------------------
// Context filter maps
// ---------------------------------------------------------------------------

/** Maps scene context to dialogue bank context strings */
const DIALOGUE_CONTEXT_MAP: Record<Exclude<SceneContext, 'all'>, string[]> = {
  combat: ['combat'],
  social: ['social'],
  discovery: ['discovery'],
  emotional: ['emotional'],
}

/** Maps scene context to sceneResponses situation labels */
const SCENE_RESPONSE_MAP: Record<Exclude<SceneContext, 'all'>, string[]> = {
  combat: ['Confrontation', 'Victory', 'Fear'],
  social: ['Betrayal', 'Mercy', 'Joy'],
  discovery: ['Discovery'],
  emotional: ['Loss', 'Fear', 'Joy'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find matching accent profile by checking voiceNotes or active identity accent */
function findAccentProfile(char: Character) {
  const activeIdentity = char.activeIdentityId && char.identities
    ? char.identities.find(i => i.id === char.activeIdentityId)
    : null

  const accentHint = activeIdentity?.accent ?? char.persona?.voiceNotes ?? ''
  if (!accentHint) return null

  const lower = accentHint.toLowerCase()
  return ACCENT_GUIDES.find(
    a => lower.includes(a.id.toLowerCase()) || lower.includes(a.name.toLowerCase()),
  ) ?? null
}

/** Deduplicate string arrays by lowercased value */
function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of arr) {
    const key = item.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionCockpit({ character, onCharacterUpdate }: SessionCockpitProps) {
  const [expandedCard, setExpandedCard] = useState<'speak' | 'react' | 'recall' | 'engage' | null>('speak')
  const [sceneContext, setSceneContext] = useState<SceneContext>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Copy handler ─────────────────────────────────────────────────────
  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // Clipboard not available
    }
  }, [])

  // ── Toggle handler ───────────────────────────────────────────────────
  const toggleCard = useCallback((card: 'speak' | 'react' | 'recall' | 'engage') => {
    setExpandedCard(prev => (prev === card ? null : card))
  }, [])

  // ── Identity switch handler ──────────────────────────────────────────
  const handleIdentitySwitch = useCallback((identityId: string | undefined) => {
    onCharacterUpdate(setActiveIdentity(character, identityId))
  }, [character, onCharacterUpdate])

  // ====================================================================
  // SPEAK DATA
  // ====================================================================
  const catchphrases = character.persona?.catchphrases ?? []

  const allDialogueLines = character.persona?.dialogueBank ?? []
  const filteredDialogueLines = sceneContext === 'all'
    ? allDialogueLines.filter(d => d.favorite)
    : allDialogueLines.filter(d => {
        const contextMatch = DIALOGUE_CONTEXT_MAP[sceneContext].includes(d.context)
        return contextMatch || d.favorite
      })

  const accentProfile = findAccentProfile(character)
  const accentRules = accentProfile ? accentProfile.rules.slice(0, 3) : []

  const speakCount = catchphrases.length + filteredDialogueLines.length

  // ====================================================================
  // REACT DATA
  // ====================================================================
  const allSceneResponses = character.persona?.sceneResponses ?? []
  const filteredSceneResponses = sceneContext === 'all'
    ? allSceneResponses
    : allSceneResponses.filter(sr =>
        SCENE_RESPONSE_MAP[sceneContext].some(
          situation => sr.situation.toLowerCase().includes(situation.toLowerCase()),
        ),
      )

  const pressureResponse = character.persona?.pressureResponse
  const wants = character.persona?.wants ?? []
  const fears = character.persona?.fears ?? []

  const reactCount = filteredSceneResponses.length + wants.length + fears.length

  // ====================================================================
  // RECALL DATA
  // ====================================================================
  const personaRelationships = character.persona?.relationships ?? []
  const backstoryRelationships = character.backstory?.relationships?.map(
    r => `${r.name} (${r.relation})`,
  ) ?? []
  const allRelationships = dedupeStrings([...personaRelationships, ...backstoryRelationships])

  const threads = character.backstory?.unresolvedThreads ?? []
  const memories = character.backstory?.keyMemories?.map(m => m.title) ?? []
  const decisionTree = character.persona?.decisionTree

  const recallCount = allRelationships.length + threads.length + memories.length

  // ====================================================================
  // Reusable copy button
  // ====================================================================
  function CopyButton({ text, id }: { text: string; id: string }) {
    const isCopied = copiedId === id
    return (
      <button
        type="button"
        onClick={() => handleCopy(text, id)}
        className={cn(
          'w-full flex items-center gap-3',
          'min-h-[48px] px-3 py-2',
          'glass-card rounded-xl',
          'text-left text-sm text-forge-0',
          'transition-all duration-200 ease-forge',
          'active:scale-[0.97]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
          'hover:bg-white/[0.06]',
        )}
      >
        <span className="flex-1 min-w-0 break-words">{text}</span>
        {isCopied ? (
          <Check size={16} className="shrink-0 text-verdant" aria-hidden />
        ) : (
          <Copy size={16} className="shrink-0 text-forge-2" aria-hidden />
        )}
      </button>
    )
  }

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Persona strip ── */}
      <PersonaStrip character={character} />

      {/* ── Scene context filter ── */}
      <SceneContextFilter value={sceneContext} onChange={setSceneContext} />

      {/* ══════════════════════════════════════════════════════════════════
          SPEAK CARD
      ══════════════════════════════════════════════════════════════════ */}
      <ActionCard
        title="Speak"
        icon={MessageSquare}
        color="arcane"
        count={speakCount}
        expanded={expandedCard === 'speak'}
        onToggle={() => toggleCard('speak')}
        emptyMessage="Add catchphrases and dialogue lines in Prep mode to see them here"
      >
        <div className="space-y-4">
          {/* Catchphrases */}
          {catchphrases.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Catchphrases
              </p>
              <div className="space-y-1.5">
                {catchphrases.map((phrase, i) => (
                  <CopyButton key={`catch-${i}`} text={phrase} id={`catch-${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Dialogue lines */}
          {filteredDialogueLines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Dialogue Lines
              </p>
              <div className="space-y-1.5">
                {filteredDialogueLines.map((d, i) => (
                  <CopyButton
                    key={`dialogue-${i}`}
                    text={d.text}
                    id={`dialogue-${i}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accent quick rules */}
          {accentRules.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Accent Quick Rules ({accentProfile?.name})
              </p>
              <div className="space-y-1.5">
                {accentRules.map((r, i) => (
                  <div
                    key={`accent-${i}`}
                    className={cn(
                      'glass-card rounded-xl px-3 py-2',
                      'text-sm',
                    )}
                  >
                    <p className="text-forge-0 font-medium">{r.rule}</p>
                    <p className="text-forge-2 text-xs mt-0.5">{r.example}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ActionCard>

      {/* ══════════════════════════════════════════════════════════════════
          REACT CARD
      ══════════════════════════════════════════════════════════════════ */}
      <ActionCard
        title="React"
        icon={Zap}
        color="ember"
        count={reactCount}
        expanded={expandedCard === 'react'}
        onToggle={() => toggleCard('react')}
        emptyMessage="Add scene responses, wants, and fears in Prep mode to see them here"
      >
        <div className="space-y-4">
          {/* Scene responses */}
          {filteredSceneResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Scene Responses
              </p>
              <div className="space-y-2">
                {filteredSceneResponses.map((sr, i) => (
                  <div key={`sr-${i}`} className="space-y-1">
                    <p className="text-xs font-medium text-ember px-1">
                      {sr.situation}
                    </p>
                    {sr.responses.map((resp, j) => (
                      <CopyButton
                        key={`sr-${i}-r-${j}`}
                        text={resp}
                        id={`sr-${i}-r-${j}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pressure response */}
          {pressureResponse && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Under Pressure
              </p>
              <CopyButton text={pressureResponse} id="pressure" />
            </div>
          )}

          {/* Wants */}
          {wants.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Wants
              </p>
              <div className="space-y-1.5">
                {wants.map((w, i) => (
                  <CopyButton key={`want-${i}`} text={w} id={`want-${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Fears */}
          {fears.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Fears
              </p>
              <div className="space-y-1.5">
                {fears.map((f, i) => (
                  <CopyButton key={`fear-${i}`} text={f} id={`fear-${i}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ActionCard>

      {/* ══════════════════════════════════════════════════════════════════
          RECALL CARD
      ══════════════════════════════════════════════════════════════════ */}
      <ActionCard
        title="Recall"
        icon={BookOpen}
        color="eldritch"
        count={recallCount}
        expanded={expandedCard === 'recall'}
        onToggle={() => toggleCard('recall')}
        emptyMessage="Add relationships, threads, and backstory in Prep mode to see them here"
      >
        <div className="space-y-4">
          {/* Relationships */}
          {allRelationships.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Relationships
              </p>
              <div className="space-y-1.5">
                {allRelationships.map((rel, i) => (
                  <CopyButton key={`rel-${i}`} text={rel} id={`rel-${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Unresolved threads */}
          {threads.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Unresolved Threads
              </p>
              <div className="space-y-1.5">
                {threads.map((t, i) => (
                  <CopyButton key={`thread-${i}`} text={t} id={`thread-${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Key memories */}
          {memories.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Key Memories
              </p>
              <div className="space-y-1.5">
                {memories.map((m, i) => (
                  <CopyButton key={`mem-${i}`} text={m} id={`mem-${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Decision tree */}
          {decisionTree && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
                Decision Tree
              </p>
              <CopyButton text={decisionTree} id="decision-tree" />
            </div>
          )}
        </div>
      </ActionCard>

      {/* ══════════════════════════════════════════════════════════════════
          ENGAGE CARD
      ══════════════════════════════════════════════════════════════════ */}
      <EngageCard
        character={character}
        sceneContext={sceneContext === 'all' ? undefined : sceneContext}
        expanded={expandedCard === 'engage'}
        onToggle={() => toggleCard('engage')}
        onCharacterUpdate={onCharacterUpdate}
      />

      {/* ── AI Assist Panel ── */}
      <AIAssistPanel
        character={character}
        sceneContext={sceneContext === 'all' ? undefined : sceneContext}
      />

      {/* ── Identity Switcher ── */}
      <IdentitySwitcher
        character={character}
        onSwitch={handleIdentitySwitch}
      />
    </div>
  )
}
