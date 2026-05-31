import { useState, useCallback, useRef, useEffect } from 'react'
import { BookOpen, Copy, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import { setActiveIdentity } from '../../lib/identity'
import type { RPMoment, SessionRPLog } from '../../lib/session-log'
import {
  createSession,
  addMoment,
  endSession,
  loadSessionLogs,
  saveSessionLogs,
} from '../../lib/session-log'

import { ActionCard } from './ActionCard'
import { PersonaStrip } from './PersonaStrip'
import { SceneContextFilter, type SceneContext } from './SceneContextFilter'
import { IdentitySwitcher } from './IdentitySwitcher'
import { AIAssistPanel } from './AIAssistPanel'
import { EngageCard } from './EngageCard'
import { PerformPanel } from './PerformPanel'
import { ImpulseEngine } from './ImpulseEngine'
import { SessionTimeline } from './SessionTimeline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionCockpitProps {
  character: Character
  onCharacterUpdate: (char: Character) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const [expandedCard, setExpandedCard] = useState<'perform' | 'impulse' | 'recall' | 'engage' | null>('perform')
  const [sceneContext, setSceneContext] = useState<SceneContext>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Session log state ──────────────────────────────────────────────────
  const [currentSession, setCurrentSession] = useState<SessionRPLog | null>(null)

  // Auto-create session on mount if none exists
  useEffect(() => {
    setCurrentSession(createSession(character.id))
  }, [character.id])

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
  const toggleCard = useCallback((card: 'perform' | 'impulse' | 'recall' | 'engage') => {
    setExpandedCard(prev => (prev === card ? null : card))
  }, [])

  // ── Identity switch handler ──────────────────────────────────────────
  const handleIdentitySwitch = useCallback((identityId: string | undefined) => {
    onCharacterUpdate(setActiveIdentity(character, identityId))
  }, [character, onCharacterUpdate])

  // ── Moment logging ────────────────────────────────────────────────────
  const handleMomentLogged = useCallback((moment: Omit<RPMoment, 'id' | 'timestamp'>) => {
    setCurrentSession(prev => {
      if (!prev) return prev
      return addMoment(prev, moment)
    })
  }, [])

  // ── End session ───────────────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    if (!currentSession) return

    // End the current session and compute patterns
    const ended = endSession(currentSession)

    // Save to logs
    const existingLogs = loadSessionLogs(character.id)
    saveSessionLogs(character.id, [...existingLogs, ended])

    // Start a fresh session
    setCurrentSession(createSession(character.id))
  }, [currentSession, character.id])

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
          PERFORM CARD (replaces Speak)
      ══════════════════════════════════════════════════════════════════ */}
      <PerformPanel
        character={character}
        sceneContext={sceneContext}
        expanded={expandedCard === 'perform'}
        onToggle={() => toggleCard('perform')}
        onMomentLogged={handleMomentLogged}
      />

      {/* ══════════════════════════════════════════════════════════════════
          IMPULSE CARD (replaces React)
      ══════════════════════════════════════════════════════════════════ */}
      <ImpulseEngine
        character={character}
        sceneContext={sceneContext === 'all' ? undefined : sceneContext}
        expanded={expandedCard === 'impulse'}
        onToggle={() => toggleCard('impulse')}
        onMomentLogged={handleMomentLogged}
      />

      {/* ══════════════════════════════════════════════════════════════════
          RECALL CARD (unchanged)
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
        onMomentLogged={handleMomentLogged}
      />

      {/* ── AI Assist Panel ── */}
      <AIAssistPanel
        character={character}
        sceneContext={sceneContext === 'all' ? undefined : sceneContext}
      />

      {/* ── Session Timeline ── */}
      <SessionTimeline
        moments={currentSession?.moments ?? []}
        onEndSession={handleEndSession}
      />

      {/* ── Identity Switcher ── */}
      <IdentitySwitcher
        character={character}
        onSwitch={handleIdentitySwitch}
      />
    </div>
  )
}
