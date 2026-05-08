import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Send,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAI } from '../hooks/useAI'
import { SYSTEM_PROMPTS } from '../lib/prompts'
import type { Character } from '../lib/character'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { HexFrame } from './ui/HexFrame'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConversationDrillProps {
  character: Character
  onComplete: (score: number) => void
  onBack: () => void
}

interface ConversationCoaching {
  voiceConsistency: number  // 1-5
  vocabularyMatch: number   // 1-5
  emotionalRegister: number // 1-5
  note: string
}

interface ConversationExchange {
  npcMessage: string
  userResponse: string
  coaching: ConversationCoaching
}

interface ConversationState {
  npcName: string
  npcType: string
  npcPersonality: string
  exchanges: ConversationExchange[]
  phase: 'setup' | 'active' | 'summary'
  overallScore: number
}

interface InitialResponse {
  npcName: string
  npcPersonality: string
  npcReply: string
  coaching: null
}

interface TurnResponse {
  npcReply: string
  coaching: ConversationCoaching
}

interface SummaryResponse {
  overallScore: number
  bestMoment: string
  improvementTip: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NPC_TYPES = [
  'Tavern Keeper',
  'Noble',
  'Rival Adventurer',
  'Deity',
  'Scared Child',
  'Merchant',
  'Villain',
] as const

const MAX_EXCHANGES = 10
const MIN_EXCHANGES_TO_END = 6

/** Map NPC type to an avatar background color class */
const NPC_AVATAR_COLORS: Record<string, string> = {
  'Tavern Keeper': 'bg-ember/25 text-ember',
  'Noble': 'bg-arcane/25 text-arcane',
  'Rival Adventurer': 'bg-red-500/25 text-red-400',
  'Deity': 'bg-eldritch/25 text-eldritch',
  'Scared Child': 'bg-verdant/25 text-verdant',
  'Merchant': 'bg-amber-500/25 text-amber-400',
  'Villain': 'bg-purple-500/25 text-purple-400',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-verdant'
  if (score >= 5) return 'text-ember'
  return 'text-red-400'
}

function renderDots(count: number, max: number = 5): JSX.Element {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            i < count ? 'bg-arcane' : 'bg-void-2/60',
          )}
        />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ConversationDrill({ character, onComplete, onBack }: ConversationDrillProps) {
  /* ------ AI hooks ------ */
  const conversationAI = useAI()
  const summaryAI = useAI()

  /* ------ State ------ */
  const [selectedNpcType, setSelectedNpcType] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationState>({
    npcName: '',
    npcType: '',
    npcPersonality: '',
    exchanges: [],
    phase: 'setup',
    overallScore: 0,
  })
  const [userInput, setUserInput] = useState('')
  const [currentNpcMessage, setCurrentNpcMessage] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null)

  /* ------ Refs ------ */
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ------ Derived ------ */
  const exchangeCount = conversation.exchanges.length
  const canEndConversation = exchangeCount >= MIN_EXCHANGES_TO_END
  const isAtMax = exchangeCount >= MAX_EXCHANGES

  /** Compute averages for summary */
  const averages = useMemo(() => {
    const exs = conversation.exchanges
    if (exs.length === 0) return { voice: 0, vocab: 0, emotion: 0 }
    const sum = exs.reduce(
      (acc, ex) => ({
        voice: acc.voice + ex.coaching.voiceConsistency,
        vocab: acc.vocab + ex.coaching.vocabularyMatch,
        emotion: acc.emotion + ex.coaching.emotionalRegister,
      }),
      { voice: 0, vocab: 0, emotion: 0 },
    )
    return {
      voice: Math.round((sum.voice / exs.length) * 10) / 10,
      vocab: Math.round((sum.vocab / exs.length) * 10) / 10,
      emotion: Math.round((sum.emotion / exs.length) * 10) / 10,
    }
  }, [conversation.exchanges])

  /* ------ Auto-scroll ------ */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.exchanges, currentNpcMessage, conversationAI.loading])

  /* ------ Handlers ------ */

  /** Start the conversation: select NPC type and get initial AI response */
  const startConversation = useCallback(async () => {
    if (!selectedNpcType) return

    try {
      const result = await conversationAI.queryStructured<InitialResponse>(
        SYSTEM_PROMPTS.conversationDrill(character, selectedNpcType, []),
        `Start the conversation. You are a ${selectedNpcType} meeting ${character.name} for the first time.`,
      )

      setCurrentNpcMessage(result.npcReply)
      setConversation({
        npcName: result.npcName,
        npcType: selectedNpcType,
        npcPersonality: result.npcPersonality,
        exchanges: [],
        phase: 'active',
        overallScore: 0,
      })
    } catch {
      // error handled by useAI hook
    }
  }, [selectedNpcType, character, conversationAI])

  /** Send the user's dialogue and get NPC response + coaching */
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || conversationAI.loading) return

    const trimmedInput = userInput.trim()
    setUserInput('')

    // Build exchange history for the AI
    const previousExchanges = [
      ...conversation.exchanges.map(ex => ({
        npc: ex.npcMessage,
        user: ex.userResponse,
      })),
      { npc: currentNpcMessage ?? '', user: trimmedInput },
    ]

    try {
      const result = await conversationAI.queryStructured<TurnResponse>(
        SYSTEM_PROMPTS.conversationDrill(character, conversation.npcType, previousExchanges),
        `The player (as ${character.name}) responds: "${trimmedInput}"`,
      )

      const newExchange: ConversationExchange = {
        npcMessage: currentNpcMessage ?? '',
        userResponse: trimmedInput,
        coaching: result.coaching,
      }

      setConversation(prev => ({
        ...prev,
        exchanges: [...prev.exchanges, newExchange],
      }))

      // Check if we hit max exchanges
      if (conversation.exchanges.length + 1 >= MAX_EXCHANGES) {
        // Auto-end at max
        setCurrentNpcMessage(result.npcReply)
        // Trigger summary after state updates
        setTimeout(() => endConversation(result.npcReply, [...conversation.exchanges, newExchange]), 0)
      } else {
        setCurrentNpcMessage(result.npcReply)
      }
    } catch {
      // error handled by useAI hook
      // Re-populate the input so user doesn't lose their message
      setUserInput(trimmedInput)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, conversationAI, character, conversation, currentNpcMessage])

  /** End the conversation and generate summary */
  const endConversation = useCallback(async (
    finalNpcMsg?: string,
    finalExchanges?: ConversationExchange[],
  ) => {
    const exchanges = finalExchanges ?? conversation.exchanges

    // Build conversation history for summary
    const historyBlock = exchanges.map((ex, i) =>
      `Exchange ${i + 1}:\n  NPC: "${ex.npcMessage}"\n  Player: "${ex.userResponse}"\n  Coaching: Voice=${ex.coaching.voiceConsistency}, Vocab=${ex.coaching.vocabularyMatch}, Register=${ex.coaching.emotionalRegister} — "${ex.coaching.note}"`
    ).join('\n\n')

    try {
      const result = await summaryAI.queryStructured<SummaryResponse>(
        SYSTEM_PROMPTS.conversationSummary(character),
        `Evaluate this ${exchanges.length}-exchange conversation between ${character.name} and a ${conversation.npcType} named ${conversation.npcName}:\n\n${historyBlock}`,
      )

      setSummaryData(result)
      setConversation(prev => ({
        ...prev,
        phase: 'summary',
        overallScore: result.overallScore,
      }))
      onComplete(result.overallScore)
    } catch {
      // If summary fails, use average scores as fallback
      const avgScore = Math.round(
        ((averages.voice + averages.vocab + averages.emotion) / 3) * 2,
      )
      setSummaryData({
        overallScore: avgScore,
        bestMoment: 'Summary generation failed — scores calculated from exchange averages.',
        improvementTip: 'Try again for detailed coaching feedback.',
      })
      setConversation(prev => ({
        ...prev,
        phase: 'summary',
        overallScore: avgScore,
      }))
      onComplete(avgScore)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, character, summaryAI, onComplete, averages])

  /** Handle Enter key to send */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  /* ================================================================ */
  /*  RENDER: Setup Phase                                              */
  /* ================================================================ */
  if (conversation.phase === 'setup') {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-lg',
            'text-sm text-forge-2 hover:text-forge-1',
            'transition-colors duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Roleplay Coach
        </button>

        <GlassCard className="border-arcane/15 ornate-border">
          <div className="flex items-center gap-2.5 mb-4">
            <MessageCircle size={18} className="text-arcane" aria-hidden />
            <OrnateHeader className="flex-1">Conversation Practice</OrnateHeader>
          </div>

          <p className="text-sm text-forge-2 mb-4 leading-relaxed">
            Practice speaking in-character with an NPC. Choose who you want to talk to,
            and the AI will play their role while coaching your dialogue.
          </p>

          {/* NPC Type Selection */}
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider">
              Choose an NPC to speak with
            </p>
            <div className="flex flex-wrap gap-2">
              {NPC_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedNpcType(type)}
                  className={cn(
                    'min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium',
                    'transition-all duration-200 ease-forge',
                    'active:scale-[0.97]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                    selectedNpcType === type
                      ? 'bg-arcane/15 border border-arcane/40 text-arcane'
                      : 'combat-card text-forge-2 hover:text-forge-1 hover:border-gold/40',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={startConversation}
            loading={conversationAI.loading}
            disabled={!selectedNpcType}
            className="w-full"
          >
            <Sparkles size={16} aria-hidden />
            Start Conversation
          </Button>

          {/* Error */}
          {conversationAI.error && (
            <div className="mt-3 rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm text-red-400 font-semibold">Failed to start conversation</p>
                <p className="text-xs text-forge-2 mt-0.5">{conversationAI.error}</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    )
  }

  /* ================================================================ */
  /*  RENDER: Summary Phase                                            */
  /* ================================================================ */
  if (conversation.phase === 'summary') {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-lg',
            'text-sm text-forge-2 hover:text-forge-1',
            'transition-colors duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Roleplay Coach
        </button>

        <GlassCard className="border-arcane/15">
          <div className="flex items-center gap-2.5 mb-5">
            <Trophy size={18} className="text-arcane" aria-hidden />
            <OrnateHeader className="flex-1">Conversation Complete</OrnateHeader>
          </div>

          {/* Score */}
          <div className="flex items-center gap-4 mb-5">
            <HexFrame
              variant={
                (summaryData?.overallScore ?? 0) >= 8
                  ? 'verdant'
                  : (summaryData?.overallScore ?? 0) >= 5
                    ? 'ember'
                    : 'arcane'
              }
            >
              <span className={cn(
                'font-display text-2xl font-bold',
                getScoreColor(summaryData?.overallScore ?? 0),
              )}>
                {summaryData?.overallScore ?? 0}
              </span>
            </HexFrame>
            <div>
              <p className="text-sm text-forge-2">/10 Overall Score</p>
              <p className="text-xs text-forge-2 mt-0.5">
                {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''} with {conversation.npcName}
              </p>
            </div>
          </div>

          {/* Metric Averages */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="stat-frame">
              <p className="text-xs text-forge-2 font-medium">Voice</p>
              <p className={cn('text-lg font-display font-bold', getScoreColor(averages.voice * 2))}>
                {averages.voice}
              </p>
              <p className="text-[10px] text-forge-2">/5</p>
            </div>
            <div className="stat-frame">
              <p className="text-xs text-forge-2 font-medium">Vocab</p>
              <p className={cn('text-lg font-display font-bold', getScoreColor(averages.vocab * 2))}>
                {averages.vocab}
              </p>
              <p className="text-[10px] text-forge-2">/5</p>
            </div>
            <div className="stat-frame">
              <p className="text-xs text-forge-2 font-medium">Register</p>
              <p className={cn('text-lg font-display font-bold', getScoreColor(averages.emotion * 2))}>
                {averages.emotion}
              </p>
              <p className="text-[10px] text-forge-2">/5</p>
            </div>
          </div>

          {/* Best Moment */}
          {summaryData?.bestMoment && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-verdant uppercase tracking-wider mb-2">Best Moment</p>
              <ParchmentCard>
                <p className="text-sm text-forge-1 leading-relaxed italic">
                  {summaryData.bestMoment}
                </p>
              </ParchmentCard>
            </div>
          )}

          {/* Improvement Tip */}
          {summaryData?.improvementTip && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-2">Suggestion</p>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-ember/[0.04] border border-ember/15">
                <ArrowRight size={14} className="text-ember shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-forge-1 leading-relaxed">
                  {summaryData.improvementTip}
                </p>
              </div>
            </div>
          )}

          {/* XP Award */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-arcane/[0.06] border border-arcane/20 mb-4">
            <CheckCircle2 size={16} className="text-arcane" aria-hidden />
            <p className="text-sm text-arcane font-medium">
              +{Math.round((summaryData?.overallScore ?? 0) * 5)} XP earned
            </p>
          </div>

          {/* Actions */}
          <Button variant="secondary" size="md" onClick={onBack} className="w-full">
            <ArrowLeft size={16} aria-hidden />
            Back to Roleplay Coach
          </Button>
        </GlassCard>
      </div>
    )
  }

  /* ================================================================ */
  /*  RENDER: Active Phase (Chat UI)                                   */
  /* ================================================================ */
  return (
    <div className="flex flex-col gap-0 animate-fade-in" style={{ minHeight: '60vh' }}>
      {/* Header Bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center justify-center w-11 h-11 rounded-lg',
            'text-forge-2 hover:text-forge-1',
            'bg-gold/[0.04] border border-bronze/25 hover:border-gold/30',
            'transition-all duration-200',
            'active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
          aria-label="Back to roleplay coach"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-forge-0 truncate">
            {conversation.npcName}
          </p>
          <p className="text-xs text-forge-2 truncate">
            {conversation.npcType} — {conversation.npcPersonality}
          </p>
        </div>
        <Badge variant="arcane">
          Exchange {exchangeCount + (currentNpcMessage && !isAtMax ? 1 : 0)} of {MAX_EXCHANGES}
        </Badge>
      </div>

      {/* Chat Messages */}
      <div className="flex flex-col gap-3 flex-1 mb-4 overflow-y-auto max-h-[50vh] px-1 -mx-1">
        {/* Render completed exchanges */}
        {conversation.exchanges.map((exchange, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {/* NPC Message */}
            <div className="flex items-start gap-2.5 max-w-[85%]">
              <div className={cn(
                'w-8 h-8 rounded-full shrink-0 flex items-center justify-center',
                'text-xs font-bold uppercase',
                NPC_AVATAR_COLORS[conversation.npcType] ?? 'bg-arcane/25 text-arcane',
              )}>
                {conversation.npcName.charAt(0)}
              </div>
              <div className={cn(
                'rounded-2xl rounded-tl-sm px-4 py-3',
                'bg-gold/[0.06] border border-gold/15',
              )}>
                <p className="text-sm text-forge-0 leading-relaxed">
                  {exchange.npcMessage}
                </p>
              </div>
            </div>

            {/* User Message */}
            <div className="flex flex-col items-end gap-1.5">
              <div className={cn(
                'max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3',
                'bg-arcane/10 border border-arcane/20',
              )}>
                <p className="text-sm text-forge-0 leading-relaxed">
                  {exchange.userResponse}
                </p>
              </div>

              {/* Coaching Badge */}
              <div className="flex items-center gap-3 mr-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-forge-2">Voice</span>
                  {renderDots(exchange.coaching.voiceConsistency)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-forge-2">Vocab</span>
                  {renderDots(exchange.coaching.vocabularyMatch)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-forge-2">Register</span>
                  {renderDots(exchange.coaching.emotionalRegister)}
                </div>
              </div>

              {/* Coaching Note */}
              {exchange.coaching.note && (
                <p className="text-[11px] text-forge-2 italic mr-1 max-w-[85%] text-right">
                  {exchange.coaching.note}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Current NPC message (not yet responded to) */}
        {currentNpcMessage && !isAtMax && (
          <div className="flex items-start gap-2.5 max-w-[85%] animate-fade-in">
            <div className={cn(
              'w-8 h-8 rounded-full shrink-0 flex items-center justify-center',
              'text-xs font-bold uppercase',
              NPC_AVATAR_COLORS[conversation.npcType] ?? 'bg-arcane/25 text-arcane',
            )}>
              {conversation.npcName.charAt(0)}
            </div>
            <div className={cn(
              'rounded-2xl rounded-tl-sm px-4 py-3',
              'bg-gold/[0.06] border border-gold/15',
            )}>
              <p className="text-sm text-forge-0 leading-relaxed">
                {currentNpcMessage}
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {conversationAI.loading && (
          <div className="flex items-start gap-2.5 max-w-[85%] animate-fade-in">
            <div className={cn(
              'w-8 h-8 rounded-full shrink-0 flex items-center justify-center',
              'text-xs font-bold uppercase',
              NPC_AVATAR_COLORS[conversation.npcType] ?? 'bg-arcane/25 text-arcane',
            )}>
              {conversation.npcName.charAt(0)}
            </div>
            <div className={cn(
              'rounded-2xl rounded-tl-sm px-4 py-3',
              'bg-gold/[0.06] border border-gold/15',
            )}>
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-arcane" aria-hidden />
                <p className="text-sm text-forge-2 italic">
                  {conversation.npcName} is speaking...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary loading */}
        {summaryAI.loading && (
          <div className="flex flex-col items-center py-6 gap-3 animate-fade-in">
            <Loader2 size={24} className="animate-spin text-arcane" aria-hidden />
            <p className="text-sm text-forge-2">Generating conversation summary...</p>
          </div>
        )}

        {/* Error */}
        {conversationAI.error && !conversationAI.loading && (
          <div className="rounded-xl border border-red-500/30 p-3 flex items-start gap-3 animate-fade-in">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm text-red-400 font-semibold">Failed to get NPC response</p>
              <p className="text-xs text-forge-2 mt-0.5">{conversationAI.error}</p>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area (fixed at bottom of component) */}
      {!isAtMax && !summaryAI.loading && (
        <div className="flex flex-col gap-2 pt-3 border-t border-gold/15">
          {/* End conversation button (available after MIN_EXCHANGES_TO_END) */}
          {canEndConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => endConversation()}
              disabled={conversationAI.loading || summaryAI.loading}
              className="self-center"
            >
              <Trophy size={14} aria-hidden />
              End Conversation
            </Button>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Speak as ${character.name}...`}
              disabled={conversationAI.loading || summaryAI.loading}
              rows={2}
              className={cn(
                'flex-1 min-h-[52px] max-h-[120px] w-full rounded-xl resize-y',
                'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                'border border-bronze/25',
                'font-body text-sm px-4 py-3',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/60 focus:bg-void-2/80',
                'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                'focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
            <Button
              variant="primary"
              size="md"
              onClick={sendMessage}
              loading={conversationAI.loading}
              disabled={!userInput.trim()}
              className="shrink-0 h-[52px]"
            >
              <Send size={16} aria-hidden />
            </Button>
          </div>

          <p className="text-[10px] text-forge-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Auto-end message when at max */}
      {isAtMax && !summaryAI.loading && conversation.phase === 'active' && (
        <div className="flex flex-col items-center gap-3 pt-3 border-t border-gold/15">
          <p className="text-sm text-forge-2 text-center">
            Maximum exchanges reached.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => endConversation()}
            loading={summaryAI.loading}
            className="w-full"
          >
            <Trophy size={16} aria-hidden />
            View Summary
          </Button>
        </div>
      )}
    </div>
  )
}
