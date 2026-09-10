import { useState, useCallback, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Moon,
  Sunrise,
  Server,
  Sparkles,
  Users,
  Download,
  Upload,
  TrendingUp,
  ArrowLeftRight,
  Plus,
  ClipboardCopy,
  ClipboardPaste,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { loadAIConfig, updateAIConfig, fetchOllamaModels, getDefaultOllamaUrl, getDefaultProvider, ollamaBlockedReason, type AIProvider } from '../lib/ai'
import { GeminiModelPicker } from './GeminiModelPicker'
import { OpenRouterModelPicker } from './OpenRouterModelPicker'
import { useAI } from '../hooks/useAI'
import { shortRest, longRest, generateId, type Character, type CampaignData, type RosterEntry, computePaladinResources } from '../lib/character'
import { resolveCharacter, storableOf, changedNumbers } from '../lib/rules-2024/derive'
import { parseCharacterFile, formatList } from '../lib/import-character'
import { downloadCharacterFile } from '../lib/export-character'
import { saveCampaign } from '../lib/campaign'
import { findSessionRollback, describeRollback, type RollbackEntry } from '../lib/session-rollback'
import { ASTERA_PERSONA } from '../lib/dnd-data'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Input } from './ui/Input'
import { TableCovenant } from './safety/TableCovenant'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsProps {
  character: Character
  onCharacterUpdate: (character: Character) => void
  onResetCharacter: () => void
  roster: RosterEntry[]
  onSwitchCharacter: (id: string) => void
  onCreateNew: () => void
}

/* ------------------------------------------------------------------ */
/*  Provider vocabulary                                                */
/* ------------------------------------------------------------------ */

/* One place that knows what a provider is CALLED, keyed by the union so
   adding a fourth provider to `AIProvider` is a type error here rather than a
   toggle strip that silently renders one fewer button. The names are the
   vendors' own — nothing invented, because the thing Marcus has to match is
   the label on the page where he gets the key. */
const PROVIDER_LABEL: Record<AIProvider, string> = {
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
}

/** Where a key comes from, for the "add one for fallback" prompts. */
const PROVIDER_KEY_HOME: Record<AIProvider, string> = {
  gemini: 'aistudio.google.com/apikey',
  openrouter: 'openrouter.ai/keys',
  ollama: '',
}

/* ------------------------------------------------------------------ */
/*  SecretInput                                                        */
/* ------------------------------------------------------------------ */

/* The password field with the eye on the end of it, which existed three times
   in this file with three slightly diverging copies of the same class list
   before OpenRouter would have made it four. Extracted rather than pasted:
   the reveal toggle is the control that decides whether a key ends up on
   screen in a room with other people in it, and three near-copies of that is
   three places for it to quietly stop working.

   It renders exactly the markup the Gemini field already rendered. This is a
   de-duplication, not a redesign. */
function SecretInput({
  id, label, value, onChange, placeholder, show, onToggleShow,
}: {
  id?: string
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  show: boolean
  onToggleShow: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-forge-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'min-h-[44px] w-full rounded-xl',
            'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
            'border border-bronze/25',
            'font-mono text-sm',
            'pl-4 pr-12',
            'transition-all duration-200 ease-forge',
            'focus:border-arcane/60 focus:bg-void-2/80',
            'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
            'focus:outline-none',
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'w-9 h-9 flex items-center justify-center rounded-lg',
            'text-forge-2 hover:text-forge-1',
            'transition-colors duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          )}
          aria-label={show ? 'Hide API key' : 'Show API key'}
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Settings({ character, onCharacterUpdate, onResetCharacter, roster, onSwitchCharacter, onCreateNew }: SettingsProps) {
  /* ------ AI config state ------ */
  /* Both of these are seeded from the ORIGIN, not from a constant. The old
     `useState<AIProvider>('ollama')` meant that for the first frame — before
     the mount effect below had read the saved config — a device that has never
     been able to reach Ollama was nonetheless in the Ollama state, with a
     fabricated URL, and the probe effect fired against it. Seeding it right is
     what makes "no request" true from the first render rather than eventually. */
  const [provider, setProvider] = useState<AIProvider>(getDefaultProvider)
  const [geminiKey, setGeminiKey] = useState('')
  // '' is Automatic — resolve the newest the key can reach, every request.
  const [geminiModel, setGeminiModel] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState(getDefaultOllamaUrl)
  const [ollamaModel, setOllamaModel] = useState('gemma3-27b-abliterated:latest')
  const [openrouterKey, setOpenrouterKey] = useState('')
  // '' is Automatic — resolve the roomiest FREE model, every request.
  const [openrouterModel, setOpenrouterModel] = useState('')
  const [fallbackEnabled, setFallbackEnabled] = useState(true)

  /* ------ Ollama model discovery ------ */
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; size: string; family: string }>>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  /* ------ connection test state ------ */
  const { loading: testLoading, error: testError, query: testQuery } = useAI()
  const [testSuccess, setTestSuccess] = useState(false)

  /* ------ confirmation modals ------ */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLongRestConfirm, setShowLongRestConfirm] = useState(false)

  /* ------ rest feedback ------ */
  const [restFeedback, setRestFeedback] = useState<string | null>(null)

  /* ------ character switcher ------ */
  const [showSwitcher, setShowSwitcher] = useState(false)

  /* ------ load persisted config on mount ------ */
  useEffect(() => {
    const config = loadAIConfig()
    setProvider(config.provider)
    if (config.geminiApiKey) setGeminiKey(config.geminiApiKey)
    if (config.geminiModel) setGeminiModel(config.geminiModel)
    if (config.ollamaUrl) setOllamaUrl(config.ollamaUrl)
    if (config.ollamaModel) setOllamaModel(config.ollamaModel)
    if (config.openrouterApiKey) setOpenrouterKey(config.openrouterApiKey)
    if (config.openrouterModel) setOpenrouterModel(config.openrouterModel)
    setFallbackEnabled(config.fallbackEnabled !== false)
  }, [])

  /* ------ auto-fetch Ollama models when provider is ollama ------ */
  const refreshOllamaModels = useCallback(async (url: string, signal?: AbortSignal) => {
    setModelsLoading(true)
    try {
      const models = await fetchOllamaModels(url, signal)
      if (!signal?.aborted) setOllamaModels(models)
    } catch {
      if (!signal?.aborted) setOllamaModels([])
    } finally {
      if (!signal?.aborted) setModelsLoading(false)
    }
  }, [])

  // Typing a URL is not thirty requests. This effect keys on `ollamaUrl`, so
  // before the bound existed every keystroke opened a probe that could hang
  // until the OS gave up, and whichever one happened to answer last won the
  // model list — including one for a half-typed host. Now: settle for 400ms,
  // and abandon the previous probe the moment a newer character arrives.
  useEffect(() => {
    // Leaving Ollama abandons any probe, and the spinner goes with it — an
    // aborted request deliberately writes no state, so it cannot clear this.
    if (provider !== 'ollama' || !ollamaUrl) { setModelsLoading(false); return }
    const controller = new AbortController()
    const timer = setTimeout(() => { void refreshOllamaModels(ollamaUrl, controller.signal) }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [provider, ollamaUrl, refreshOllamaModels])

  /* ------ handlers ------ */
  const handleSaveConfig = useCallback(() => {
    // Always save ALL THREE provider configs so the fallback chain works. It is
    // a chain now, not a pair — a key typed on the OpenRouter tab has to still
    // be there when Gemini is the one that 429s.
    //
    // A MERGE, NOT A WHOLE-CONFIG WRITE. This form holds all three providers,
    // so it was not losing keys the way first-run setup was — but it does not
    // hold `connectTimeoutMs`/`idleTimeoutMs`, and `saveAIConfig` writes the
    // ENTIRE config, so anything this screen has no input for was being deleted
    // every time Save was pressed. `updateAIConfig` writes only what is named.
    //
    // The raw state strings go through, not `x || undefined`: '' now MEANS
    // "he cleared this box, remove it" and is the only way to delete a key he
    // pasted by mistake. `updateAIConfig` deletes the field rather than storing
    // '', so absent stays the single spelling of "not set" — which is what
    // `resolveGeminiModel` reads as "ask Google".
    updateAIConfig({
      provider,
      geminiApiKey: geminiKey,
      geminiModel,
      ollamaUrl,
      ollamaModel,
      openrouterApiKey: openrouterKey,
      openrouterModel,
      fallbackEnabled,
    })
    setConfigSaved(true)
    setTestSuccess(false)
    setTimeout(() => setConfigSaved(false), 2500)
  }, [provider, geminiKey, geminiModel, ollamaUrl, ollamaModel, openrouterKey, openrouterModel, fallbackEnabled])

  const handleTestConnection = useCallback(async () => {
    setTestSuccess(false)
    // Save first so the query uses the current config
    handleSaveConfig()
    try {
      await testQuery(
        'You are a helpful assistant. Respond with exactly: CONNECTION_OK',
        'Test connection. Respond with exactly: CONNECTION_OK',
      )
      setTestSuccess(true)
    } catch {
      // error is handled by useAI hook
    }
  }, [handleSaveConfig, testQuery])

  const handleShortRest = useCallback(() => {
    const updated = shortRest(character)
    onCharacterUpdate(updated)
    setRestFeedback('Short rest complete. Short-rest features restored.')
    setTimeout(() => setRestFeedback(null), 3000)
  }, [character, onCharacterUpdate])

  const handleLongRest = useCallback(() => {
    const updated = longRest(character)
    onCharacterUpdate(updated)
    setShowLongRestConfirm(false)
    setRestFeedback('Long rest complete. HP, spell slots, and all features restored.')
    setTimeout(() => setRestFeedback(null), 3000)
  }, [character, onCharacterUpdate])

  const handleDeleteCharacter = useCallback(() => {
    setShowDeleteConfirm(false)
    onResetCharacter()
  }, [onResetCharacter])

  /* ------ export / import ------ */
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  /* Separate from `importWarnings` on purpose — "your file is old" and "your
     file was damaged and I altered it" are different sentences, and Marcus
     should not have to work out which one he got. */
  const [importRepairs, setImportRepairs] = useState<string[]>([])
  /* R-10. An import that would hand back a spent resource is HELD here instead
     of written, until he has seen what it would take back and said yes. Holding
     the whole parse result, not just the character, because the "that was an
     older export" notice still has to fire after he confirms — the two facts
     are independent and he is entitled to both. */
  const [pendingImport, setPendingImport] = useState<
    {
      character: Character
      warnings: string[]
      repairs: string[]
      rollback: RollbackEntry[]
      campaign: CampaignData | null
    } | null
  >(null)
  /* And if he goes ahead anyway, he is told a SECOND time, in the past tense,
     by a notice that does not self-dismiss. Not belt-and-braces: the warning
     above disappears the instant he taps through it, and five minutes later
     the only question he can still answer is "what did that do?" — which is
     precisely the question the silent version left him unable to answer. */
  const [importRolledBack, setImportRolledBack] = useState<RollbackEntry[]>([])

  // One implementation, shared with CharacterPage. See lib/export-character.
  const handleExport = useCallback(() => downloadCharacterFile(character), [character])

  /* The write, and everything he is told about it. Split out of handleImport so
     that the R-10 confirm can reach the exact same path — a second, parallel
     "apply" written for the confirm button is how the confirm branch quietly
     stops matching the plain branch. */
  const applyImport = useCallback(
    (next: {
      character: Character
      warnings: string[]
      repairs: string[]
      rollback?: RollbackEntry[]
      campaign?: CampaignData | null
    }) => {
      /* The campaign lands FIRST. `character.campaignId` already points at it
         by the time the parse returns, so writing the character before the
         campaign leaves a window — however short — in which the app holds a
         character whose campaign key does not exist yet. Every screen that
         reads the party does so through `loadCampaign(character.campaignId)`,
         and a re-render inside that window renders the empty state.

         Only when the file actually carried one. A null here means an older
         export that has nothing to say about the campaign, and the campaign
         already on this device is none of its business — see ImportResult. */
      if (next.campaign) saveCampaign(next.campaign)
      onCharacterUpdate(next.character)
      const rolled = next.rollback ?? []
      setImportRolledBack(rolled)
      /* A thin old export is still a real import, so it succeeds — but the
         green tick alone would let it pass as complete when it isn't. The
         amber notice stays put instead of self-dismissing: what it says is
         still true in five minutes. */
      if (next.repairs.length > 0) setImportRepairs(next.repairs)
      if (next.warnings.length > 0) setImportWarnings(next.warnings)
      /* The green tick is for the case where there is genuinely nothing to say.
         § 9.13's sharpest line is that "everything came across" printed at the
         moment something was lost reads as an assurance that nothing was — so
         any amber notice, including the new rollback one, takes the tick's
         place rather than sitting beside it. */
      if (rolled.length > 0 || next.warnings.length > 0 || next.repairs.length > 0) return
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 3000)
    },
    [onCharacterUpdate],
  )

  const handleImport = useCallback(() => {
    setImportError(null)
    setImportSuccess(false)
    setImportWarnings([])
    setImportRepairs([])
    setImportRolledBack([])
    setPendingImport(null)
    const input = document.createElement('input')
    input.type = 'file'
    // See CharacterSetup for why this is not a bare `.json` — iOS greys the file
    // out in the picker, which reads as the app refusing it.
    input.accept = '.json,.txt,application/json,text/json,text/plain'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = parseCharacterFile(String(ev.target?.result ?? ''))
        if (!result.ok) {
          setImportError(result.error)
          return
        }
        /* R-10 — the reason this is not just `onCharacterUpdate(...)`.
           Re-importing your own save is a REASSURANCE gesture: you do it when
           the phone slept, or you want to be sure the session took. Until this
           check existed it did the opposite — it silently restored every pool
           to whatever the file said, so a heal-for-5 followed by a re-import
           handed Lay on Hands back to 35/35 with nothing on screen about it.
           Damage you cannot see, because a resource you have already spent is
           a resource you have already stopped watching. */
        const rollback = findSessionRollback(character, result.character)
        if (rollback.length > 0) {
          setPendingImport({
            character: result.character,
            warnings: result.warnings,
            repairs: result.repairs,
            rollback,
            campaign: result.campaign,
          })
          return
        }
        applyImport(result)
      }
      reader.onerror = () => setImportError('That file could not be read off the device.')
      reader.readAsText(file)
    }
    input.click()
  }, [character, applyImport])

  /* ------ backstory transfer ------ */
  const [backstoryPasteOpen, setBackstoryPasteOpen] = useState(false)
  const [backstoryCopyOpen, setBackstoryCopyOpen] = useState(false)
  const [backstoryPasteText, setBackstoryPasteText] = useState('')
  const [backstoryCopied, setBackstoryCopied] = useState(false)
  const [backstoryMerged, setBackstoryMerged] = useState(false)
  const [backstoryError, setBackstoryError] = useState<string | null>(null)

  const handleCopyBackstory = useCallback(async () => {
    if (!character.backstory) {
      setBackstoryError('No backstory data to copy.')
      setTimeout(() => setBackstoryError(null), 3000)
      return
    }
    const json = JSON.stringify(character.backstory, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setBackstoryCopied(true)
      setTimeout(() => setBackstoryCopied(false), 3000)
    } catch {
      // Clipboard failed — show the data in a selectable textarea instead
      setBackstoryCopyOpen(true)
    }
  }, [character.backstory])

  const handlePasteBackstory = useCallback(() => {
    setBackstoryError(null)
    setBackstoryMerged(false)
    try {
      const parsed = JSON.parse(backstoryPasteText.trim())
      // Validate it looks like a Backstory object
      if (!parsed.origin && !parsed.keyMemories && !parsed.relationships && !parsed.unresolvedThreads) {
        setBackstoryError('Invalid backstory data — missing origin, keyMemories, relationships, or unresolvedThreads.')
        return
      }
      const updated: Character = {
        ...character,
        backstory: parsed,
        updatedAt: new Date().toISOString(),
      }
      onCharacterUpdate(updated)
      setBackstoryMerged(true)
      setBackstoryPasteOpen(false)
      setBackstoryPasteText('')
      setTimeout(() => setBackstoryMerged(false), 4000)
    } catch {
      setBackstoryError('Could not parse — make sure you pasted valid JSON.')
    }
  }, [backstoryPasteText, character, onCharacterUpdate])

  /* ------ level up ------ */
  const handleLevelUp = useCallback(() => {
    if (character.level >= 20) return
    /* SHEET TRUTH slice 3. `proficiencyBonus: Math.ceil((level + 1) / 4) + 1` was
       here, and it was one of five copies of that formula in four spellings. It is
       gone rather than corrected: the level goes up, and `resolveCharacter` works
       out the bonus from it on the way to disk. Nothing here needs to know the rule.

       SLICE 4 adds no rule here either — it only RESOLVES before handing the sheet
       on, so that the toast can report what moved instead of guessing. Every pool
       maximum and every derived number is worked out by the same call the save path
       would have made a moment later; this just makes it early enough to read.
       Raising the level is still the whole of the level-up. */
    const updated = resolveCharacter({ ...storableOf(character), level: character.level + 1 })
    const moved = changedNumbers(character, updated)
    onCharacterUpdate(updated)
    /* Naming the numbers, because the old sentence — "Update your spells and
       features as needed" — asked Marcus to redo by hand the work the app had just
       finished, and named none of it. Spell slots are still his: `resolveCharacter`
       refuses to touch them (his sheet carries slots his level does not grant), so
       they are the one thing the toast still hands back. */
    setRestFeedback(
      moved.length === 0
        ? `Leveled up to ${updated.level}. No derived numbers changed — check your spell slots.`
        : `Leveled up to ${updated.level}. ${moved
            .map(change => `${change.label} ${change.from} → ${change.to}`)
            .join(', ')}. Spell slots are still yours to set.`,
    )
    setTimeout(() => setRestFeedback(null), 8000)
  }, [character, onCharacterUpdate])

  /* ------ upgrade character (add paladin resources + persona) ------ */
  const handleUpgradeCharacter = useCallback(() => {
    const paladinResources = computePaladinResources(character.level)
    const persona = ASTERA_PERSONA as import('../lib/character').CharacterPersona
    const updated: Character = {
      ...character,
      paladinResources,
      persona,
      updatedAt: new Date().toISOString(),
    }
    onCharacterUpdate(updated)
    setRestFeedback('Character upgraded! Paladin resources and persona added.')
    setTimeout(() => setRestFeedback(null), 4000)
  }, [character, onCharacterUpdate])

  /* ------ sections ------ */
  /* `null` on the desktop that runs the model, and now also null on the
     deployed site once he has put an https tunnel address in — which is the
     one case the old protocol-only version got wrong, and got wrong at the
     worst moment, since reaching it meant he had already stood the tunnel up.

     Still computed per render rather than stored, and now that is doing more
     work than it was: `ollamaUrl` is the live input value, so the warning
     clears as he finishes typing `https://` rather than on save. */
  const ollamaBlocked = ollamaBlockedReason(ollamaUrl)

  /* ------ the fallback chain, as the screen has to describe it ------ */
  /* Fallback used to be a pair, so the UI could say "the other one" and be
     right. With three providers it has to say WHICH, IN WHAT ORDER, because
     the order is now a fact he can be surprised by at a table. This mirrors
     `FALLBACK_ORDER` in ai.ts deliberately — if those two ever disagree, the
     screen is lying about what the app will do, which is worse than the screen
     saying nothing. Ollama is dropped from the list wherever the browser
     cannot open it, for the same reason its address box is: a fallback that
     the browser will refuse is not a fallback, it is a delay. */
  const CHAIN_ORDER: readonly AIProvider[] = ['gemini', 'openrouter', 'ollama']
  const isConfigured = (p: AIProvider) =>
    p === 'gemini' ? !!geminiKey.trim()
      : p === 'openrouter' ? !!openrouterKey.trim()
        : !!ollamaUrl.trim() && !!ollamaModel.trim()
  const backups = CHAIN_ORDER.filter(p => p !== provider && !(p === 'ollama' && ollamaBlocked))
  const readyBackups = backups.filter(isConfigured)

  const renderAIConfig = () => (
    <GlassCard className="ornate-border">
      <OrnateHeader className="mb-5">AI Configuration</OrnateHeader>

      {/* Provider toggle.
          Three now, not two — OpenRouter was added 2026-09-09 because a single
          free tier that fails three different ways in one week is a single
          point of failure, and Ollama cannot be the answer on the phone he
          actually plays on. The label is the shortest true one; `text-xs` on
          the row because three names in a phone-width strip is exactly where
          `text-sm` starts wrapping "OpenRouter" mid-word. */}
      <div className="flex flex-col gap-1.5 mb-5">
        <span className="text-sm font-medium text-forge-1">Provider</span>
        <div className="flex rounded-xl overflow-hidden border border-bronze/25">
          {(['gemini', 'openrouter', 'ollama'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={cn(
                'flex-1 min-h-[44px] text-xs sm:text-sm font-medium px-1',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                provider === p
                  ? 'bg-arcane/15 text-arcane'
                  : 'bg-gold/[0.04] text-forge-2 hover:bg-gold/[0.08] hover:text-forge-1',
              )}
            >
              {p === 'ollama' && ollamaBlocked ? 'Ollama (not here)' : PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini config */}
      {provider === 'gemini' && (
        <div className="flex flex-col gap-4 mb-5">
          <SecretInput
            id="gemini-key"
            label="API Key"
            value={geminiKey}
            onChange={setGeminiKey}
            placeholder="Enter your Gemini API key"
            show={showKey}
            onToggleShow={() => setShowKey(!showKey)}
          />

          <GeminiModelPicker apiKey={geminiKey} value={geminiModel} onChange={setGeminiModel} />
        </div>
      )}

      {/* OpenRouter config */}
      {provider === 'openrouter' && (
        <div className="flex flex-col gap-4 mb-5">
          <SecretInput
            id="openrouter-key"
            label="API Key"
            value={openrouterKey}
            onChange={setOpenrouterKey}
            placeholder="Enter your OpenRouter API key"
            show={showKey}
            onToggleShow={() => setShowKey(!showKey)}
          />
          <p className="text-xs text-forge-2">
            Free at <span className="underline">openrouter.ai/keys</span>. It reaches a
            different set of free models from Google's, on a separate daily allowance — which
            is the entire point of having it: two free tiers do not run out at the same moment.
          </p>
          <OpenRouterModelPicker apiKey={openrouterKey} value={openrouterModel} onChange={setOpenrouterModel} />
        </div>
      )}

      {/* Ollama config */}
      {provider === 'ollama' && (
        <div className="flex flex-col gap-4 mb-5">
          {/* Say it before he types anything, not after a request fails.
              What stood here was a button reading "Use built-in proxy
              (recommended for remote access)" which set the URL to
              `${origin}/ollama` — the address that 404s on GitHub Pages. It
              recommended the defect. There is no proxy; it is gone. */}
          {ollamaBlocked && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-ember/10 border border-ember/25">
              <AlertTriangle size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-ember">{ollamaBlocked}</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Input
              icon={Server}
              label="Ollama URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder={getDefaultOllamaUrl() || 'No address — nothing will be contacted'}
            />
          </div>

          {/* Model picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1">Model</span>
            {modelsLoading ? (
              <div className="flex items-center gap-2 min-h-[44px] px-3 text-forge-2 text-sm">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Detecting models...
              </div>
            ) : ollamaModels.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {ollamaModels.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setOllamaModel(m.name)}
                    className={cn(
                      'flex items-center justify-between min-h-[44px] px-3.5 rounded-xl text-left',
                      'transition-all duration-200 ease-forge active:scale-[0.98]',
                      'border',
                      ollamaModel === m.name
                        ? 'bg-arcane/10 border-arcane/30 text-forge-0 ornate-border'
                        : 'bg-gold/[0.03] border-bronze/20 text-forge-2 hover:bg-gold/[0.06] hover:text-forge-1',
                    )}
                  >
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs opacity-60">{m.size}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Input
                label=""
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="gemma3-27b-abliterated:latest"
              />
            )}
          </div>
        </div>
      )}

      {/* Fallback toggle */}
      <div className="combat-card flex items-center justify-between min-h-[44px] mb-5 p-3 rounded-xl">
        <div className="flex-1">
          <span className="text-sm font-medium text-forge-1">Auto-Fallback</span>
          <p className="text-xs text-forge-2 mt-0.5">
            {backups.length === 0
              ? 'There is no second provider to fall back to on this device — Ollama cannot be reached from here.'
              : readyBackups.length === 0
                ? `When ${PROVIDER_LABEL[provider]} fails, try the others — but none of them are set up yet. Add one below.`
                : `When ${PROVIDER_LABEL[provider]} fails, try ${readyBackups.map(p => PROVIDER_LABEL[p]).join(', then ')}${readyBackups.length > 1 ? ' — in that order' : ''}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFallbackEnabled(!fallbackEnabled)}
          className={cn(
            'relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ml-3',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
            fallbackEnabled ? 'bg-arcane/40' : 'bg-void-2/60',
          )}
          role="switch"
          aria-checked={fallbackEnabled}
          aria-label="Toggle auto-fallback"
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200',
              fallbackEnabled && 'translate-x-5',
            )}
          />
        </button>
      </div>

      {/* Nothing to fall back TO. Said once, about the whole chain, rather
          than once per provider — he does not need three boxes telling him
          three separate halves of "you have set up one provider". */}
      {fallbackEnabled && backups.length > 0 && readyBackups.length === 0 && (
        <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-ember/10 border border-ember/25">
          <AlertTriangle size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-ember">
            Fallback is on but nothing is behind it. Fill in one of the boxes below —
            both keys are free, and having two of them is the point: two free tiers do not
            run out at the same moment.
          </p>
        </div>
      )}

      {/* Show every OTHER provider's config when fallback is on, in the order
          the chain will actually try them. This was two hardcoded boxes for
          the gemini/ollama pair; a third provider made "the other one" stop
          being a thing that exists.

          Ollama is absent from `backups` wherever the browser would refuse to
          open it. On the deployed site the old box invited Marcus to type an
          address the browser cannot reach — a control presented as though it
          might work, over a thing that cannot. */}
      {fallbackEnabled && backups.map((p, i) => (
        <div key={p} className="mb-5 p-3 rounded-xl bg-gold/[0.02] border border-bronze/20">
          <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-2">
            {backups.length > 1 ? `Fallback ${i + 1}: ${PROVIDER_LABEL[p]}` : `Fallback: ${PROVIDER_LABEL[p]}`}
          </span>

          {p === 'gemini' && (
            <div className="flex flex-col gap-3">
              <SecretInput
                value={geminiKey}
                onChange={setGeminiKey}
                placeholder={`Gemini API key — free at ${PROVIDER_KEY_HOME.gemini}`}
                show={showKey}
                onToggleShow={() => setShowKey(!showKey)}
              />
              <GeminiModelPicker
                apiKey={geminiKey}
                value={geminiModel}
                onChange={setGeminiModel}
                variant="chips"
              />
            </div>
          )}

          {p === 'openrouter' && (
            <div className="flex flex-col gap-3">
              <SecretInput
                value={openrouterKey}
                onChange={setOpenrouterKey}
                placeholder={`OpenRouter API key — free at ${PROVIDER_KEY_HOME.openrouter}`}
                show={showKey}
                onToggleShow={() => setShowKey(!showKey)}
              />
              <OpenRouterModelPicker
                apiKey={openrouterKey}
                value={openrouterModel}
                onChange={setOpenrouterModel}
                variant="chips"
              />
            </div>
          )}

          {p === 'ollama' && (
            <Input
              icon={Server}
              label="Ollama URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          )}
        </div>
      ))}

      {/* Test + Save buttons */}
      <div className="flex gap-2.5">
        <Button
          variant="secondary"
          size="md"
          loading={testLoading}
          onClick={handleTestConnection}
          className="flex-1"
        >
          {testLoading ? (
            'Testing...'
          ) : (
            <>
              <Wifi size={16} aria-hidden />
              Test Connection
            </>
          )}
        </Button>
        <Button variant="primary" size="md" onClick={handleSaveConfig} className="flex-1">
          Save
        </Button>
      </div>

      {/* Test result feedback */}
      {testSuccess && (
        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
          <span className="text-sm text-verdant">Connection successful</span>
        </div>
      )}

      {testError && (
        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/25 animate-fade-in">
          <WifiOff size={16} className="text-red-400 shrink-0" aria-hidden />
          <span className="text-sm text-red-400">Connection failed: {testError}</span>
        </div>
      )}

      {configSaved && !testLoading && (
        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-arcane/10 border border-arcane/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-arcane shrink-0" aria-hidden />
          <span className="text-sm text-arcane">Configuration saved</span>
        </div>
      )}
    </GlassCard>
  )

  const renderCharacterInfo = () => (
    <ParchmentCard>
      <OrnateHeader className="mb-5">Character Info</OrnateHeader>

      <div className="space-y-3 mb-5">
        {[
          { label: 'Name', value: character.name },
          { label: 'Class', value: character.subclass ? `${character.class} (${character.subclass})` : character.class },
          { label: 'Race', value: character.race },
          { label: 'Level', value: String(character.level) },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-forge-2">{label}</span>
            <span className="text-sm font-medium text-forge-0">{value}</span>
          </div>
        ))}
      </div>

      {/* Level up */}
      {character.level < 20 && (
        <div className="mb-4">
          <Button variant="primary" size="md" onClick={handleLevelUp} className="w-full">
            <TrendingUp size={16} aria-hidden />
            Level Up to {character.level + 1}
          </Button>
        </div>
      )}

      {/* Upgrade Character (Paladin without resources) */}
      {character.class === 'Paladin' && !character.paladinResources && (
        <div className="mb-4">
          <Button variant="primary" size="md" onClick={handleUpgradeCharacter} className="w-full">
            <Sparkles size={16} aria-hidden />
            Upgrade to Combat-Ready
          </Button>
          <p className="text-xs text-forge-2 pl-1 mt-2">
            Adds Paladin resource tracking (Lay on Hands, Channel Divinity) and character persona for roleplay.
          </p>
        </div>
      )}

      {/* Export / Import */}
      <div className="flex gap-2.5 mb-4">
        <Button variant="secondary" size="md" onClick={handleExport} className="flex-1">
          <Download size={16} aria-hidden />
          Export
        </Button>
        <Button variant="secondary" size="md" onClick={handleImport} className="flex-1">
          <Upload size={16} aria-hidden />
          Import
        </Button>
      </div>

      {/* R-10 — held, not written. See handleImport for why this is not a
          toast after the fact: by the time a toast is up, the spend is gone.
          Amber and not red on purpose — nothing has been destroyed yet, and
          red in this file already means "delete", which this is not. */}
      {pendingImport && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-xl border border-amber-500/35 bg-amber-500/10 animate-fade-in"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-100">
                That file would give back what you've already spent.
              </p>
              {pendingImport.rollback.length === 1 ? (
                <p className="mt-1.5 text-sm text-amber-200 tabular-nums">
                  {describeRollback(pendingImport.rollback)}
                </p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {pendingImport.rollback.map((e) => (
                    <li
                      key={e.label}
                      className="flex items-baseline justify-between gap-3 text-sm text-amber-200"
                    >
                      <span className="truncate">{e.label}</span>
                      <span className="shrink-0 tabular-nums font-medium">
                        {e.from} → {e.to}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-amber-200/70">
                Import it if that file is the newer one. Otherwise keep playing — nothing has
                changed yet.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 mt-4">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setPendingImport(null)}
              className="flex-1"
            >
              Keep Session
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                const next = pendingImport
                setPendingImport(null)
                applyImport(next)
              }}
              className="flex-1 text-amber-200 hover:bg-amber-500/15 border border-amber-500/35"
            >
              {/* Lower-case "anyway" deliberately, to match CharacterSetup's
                  existing thin-export gate. Two gates in one app that mean the
                  same thing should read the same, and the harness reaches both
                  through one helper — a second spelling here would have made
                  this gate invisible to the check that exists to grade it. */}
              Import anyway
            </Button>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
          <span className="text-sm text-verdant">Character imported successfully</span>
        </div>
      )}

      {/* After the fact, and it stays. "Replaced" is the accurate verb: the
          file did not merge with the session, it stood in for it. */}
      {importRolledBack.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 animate-fade-in"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-amber-200">
            <p>
              Imported — that file replaced your session, and put back what you had already spent.
            </p>
            <p className="mt-1.5 tabular-nums font-medium text-amber-100">
              {describeRollback(importRolledBack)}
            </p>
            <p className="mt-1.5 text-amber-200/70">
              Spend those down again to where you were, or import the newer file if you have one.
            </p>
          </div>
        </div>
      )}

      {importWarnings.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 animate-fade-in"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <span className="text-sm text-amber-200">
            Imported — but that was an older export, with no {formatList(importWarnings)}. Everything
            else came across; you'll need to add those back.
          </span>
        </div>
      )}

      {importRepairs.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 animate-fade-in"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-amber-200">
            <p>Imported — but parts of that file were damaged and were changed to open it:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {importRepairs.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-amber-200/70">
              Everything else came across intact. Export again from the device with the good copy if
              you'd rather not lose those.
            </p>
          </div>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 animate-fade-in">
          <AlertTriangle size={16} className="text-red-400 shrink-0" aria-hidden />
          <span className="text-sm text-red-400">{importError}</span>
        </div>
      )}

      {/* Backstory Transfer */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-forge-2 uppercase tracking-wider mb-2">
          Backstory Transfer
        </p>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="md" onClick={handleCopyBackstory} className="flex-1">
            <ClipboardCopy size={16} aria-hidden />
            {backstoryCopied ? 'Copied!' : 'Copy Backstory'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => { setBackstoryPasteOpen(!backstoryPasteOpen); setBackstoryError(null) }}
            className="flex-1"
          >
            <ClipboardPaste size={16} aria-hidden />
            Paste Backstory
          </Button>
        </div>
        <p className="text-xs text-forge-2 pl-1 mt-2">
          Copy backstory on one device, text it to yourself, paste on the other. Only backstory is affected — nothing else changes.
        </p>
      </div>

      {backstoryCopyOpen && character.backstory && (
        <div className="mb-4 animate-fade-in">
          <p className="text-xs text-forge-2 mb-2">Select all and copy this text:</p>
          <textarea
            readOnly
            value={JSON.stringify(character.backstory, null, 2)}
            rows={6}
            onFocus={(e) => e.target.select()}
            className={cn(
              'w-full min-h-[120px] px-3 py-2.5 mb-2',
              'bg-white/[0.04] border border-white/10 rounded-xl',
              'text-sm text-forge-0 font-mono',
              'resize-y select-all',
              'focus:outline-none focus:border-arcane/50 focus:ring-1 focus:ring-arcane/25',
            )}
          />
          <Button
            variant="secondary"
            size="md"
            onClick={() => setBackstoryCopyOpen(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}

      {backstoryPasteOpen && (
        <div className="mb-4 animate-fade-in">
          <textarea
            value={backstoryPasteText}
            onChange={(e) => setBackstoryPasteText(e.target.value)}
            placeholder='Paste backstory JSON here...'
            rows={5}
            className={cn(
              'w-full min-h-[120px] px-3 py-2.5 mb-2',
              'bg-white/[0.04] border border-white/10 rounded-xl',
              'text-sm text-forge-0 placeholder:text-forge-2 font-mono',
              'resize-y',
              'transition-all duration-200 ease-forge',
              'focus:outline-none focus:border-arcane/50 focus:ring-1 focus:ring-arcane/25',
            )}
          />
          <Button
            variant="primary"
            size="md"
            onClick={handlePasteBackstory}
            disabled={!backstoryPasteText.trim()}
            className="w-full"
          >
            Apply Backstory
          </Button>
        </div>
      )}

      {backstoryMerged && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
          <span className="text-sm text-verdant">Backstory merged — everything else untouched</span>
        </div>
      )}

      {backstoryError && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 animate-fade-in">
          <AlertTriangle size={16} className="text-red-400 shrink-0" aria-hidden />
          <span className="text-sm text-red-400">{backstoryError}</span>
        </div>
      )}

      {/* Switch / New Character */}
      <div className="flex gap-2.5 mb-4">
        <Button variant="secondary" size="md" onClick={() => setShowSwitcher(!showSwitcher)} className="flex-1">
          <ArrowLeftRight size={16} aria-hidden />
          Switch Character
        </Button>
        <Button variant="secondary" size="md" onClick={onCreateNew} className="flex-1">
          <Plus size={16} aria-hidden />
          New Character
        </Button>
      </div>

      {showSwitcher && roster.length > 1 && (
        <div className="mb-4 flex flex-col gap-2 animate-fade-in">
          {roster.filter(e => e.id !== character.id).map((entry) => (
            <button
              key={entry.id}
              onClick={() => { onSwitchCharacter(entry.id); setShowSwitcher(false) }}
              className="flex items-center justify-between w-full min-h-[52px] px-4 py-3 rounded-xl text-left bg-gold/[0.03] border border-bronze/20 transition-all duration-200 ease-forge hover:bg-gold/[0.06] hover:border-gold/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-forge-0">{entry.name}</span>
                <span className="text-xs text-forge-2">
                  {entry.class}{entry.subclass ? ` (${entry.subclass})` : ''} · Lvl {entry.level}
                </span>
              </div>
              <Users size={16} className="text-forge-2 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {/* Delete character */}
      {!showDeleteConfirm ? (
        <Button
          variant="ghost"
          size="md"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={16} aria-hidden />
          Delete Character
        </Button>
      ) : (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/8 animate-fade-in">
          <p className="text-sm text-forge-0 font-medium mb-1">Delete this character?</p>
          <p className="text-xs text-forge-2 mb-4">
            This will remove {character.name} from your roster. This cannot be undone.
          </p>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteCharacter}
              className="flex-1 text-red-400 hover:bg-red-500/15 border border-red-500/30"
            >
              <Trash2 size={14} aria-hidden />
              Confirm Delete
            </Button>
          </div>
        </div>
      )}
    </ParchmentCard>
  )

  const renderRestManagement = () => (
    <GlassCard>
      <OrnateHeader className="mb-5">Rest Management</OrnateHeader>

      {/* Rest feedback */}
      {restFeedback && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
          <span className="text-sm text-verdant">{restFeedback}</span>
        </div>
      )}

      {/* Short Rest */}
      <div className="mb-4">
        <Button variant="secondary" size="md" onClick={handleShortRest} className="w-full mb-2 border-gold/30 hover:border-gold/50 hover:bg-gold/[0.06]">
          <Sunrise size={16} aria-hidden />
          Short Rest
        </Button>
        <p className="text-xs text-forge-2 pl-1">
          Restores class features that recharge on a short rest (e.g., Channel Divinity, Second Wind).
          Does not restore spell slots or HP.
        </p>
      </div>

      {/* Long Rest */}
      {!showLongRestConfirm ? (
        <div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowLongRestConfirm(true)}
            className="w-full mb-2 border-gold/30 hover:border-gold/50 hover:bg-gold/[0.06]"
          >
            <Moon size={16} aria-hidden />
            Long Rest
          </Button>
          <p className="text-xs text-forge-2 pl-1">
            Restores HP to maximum, all spell slots, and all class features (both short and long rest).
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-ember/30 bg-ember/8 animate-fade-in">
          <p className="text-sm text-forge-0 font-medium mb-1">Take a long rest?</p>
          <p className="text-xs text-forge-2 mb-4">
            This will restore all HP, spell slots, and class feature uses to their maximum values.
          </p>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLongRestConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleLongRest} className="flex-1">
              <Moon size={14} aria-hidden />
              Confirm Long Rest
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )

  const renderAbout = () => (
    <GlassCard>
      <OrnateHeader className="mb-5">About</OrnateHeader>

      <div className="space-y-2 text-sm">
        <p className="text-forge-0 font-display font-semibold text-lg">The Codex V1.0</p>
        <p className="text-forge-1">D&amp;D 2024 Combat Companion</p>
        <p className="text-forge-2">Part of Ash &amp; Archive</p>
      </div>

      {/* Slice 15 — the whole of the SRD licensing obligation.
          The SRD 5.2.1 is published under CC BY 4.0, which asks for exactly one
          thing: credit, stated where a reader can find it. This is that credit,
          and it is the reason no further licensing decision is outstanding.

          Nix and the Oath of the Hearth are deliberately NOT covered by it —
          they are Marcus's own homebrew, which is why the second line exists.
          Deleting this block does not break a build; it breaks the licence. */}
      <div className="mt-5 pt-4 border-t border-forge-3/30 space-y-2 text-xs text-forge-2">
        <p>
          This work includes material from the System Reference Document 5.2.1
          (&ldquo;SRD 5.2.1&rdquo;) by Wizards of the Coast LLC, available at{' '}
          <a
            href="https://www.dndbeyond.com/srd"
            target="_blank"
            rel="noreferrer noopener"
            className="text-gold underline underline-offset-2"
          >
            dndbeyond.com/srd
          </a>
          . The SRD 5.2.1 is licensed under the{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/legalcode"
            target="_blank"
            rel="noreferrer noopener"
            className="text-gold underline underline-offset-2"
          >
            Creative Commons Attribution 4.0 International License
          </a>
          .
        </p>
        <p>
          Homebrew content — including Nix and the Oath of the Hearth — is the
          original work of its author and is not covered by that licence.
        </p>
      </div>
    </GlassCard>
  )

  /* ------ main render ------ */
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <OrnateHeader className="mb-1">Settings</OrnateHeader>

      {/* Above the AI card and the character card on purpose. What the table
          agreed to outranks which model answers questions. */}
      <TableCovenant />
      {renderAIConfig()}
      {renderCharacterInfo()}
      {/* Campaign & World moved out of here on 2026-09-10 and onto the
          Character tab. Marcus: "there's no one good solid page for any of the
          character, party, world, campaign details, it's spread out in
          different locations. Campaign and world is in the settings. Weird."
          He is right, and it was never a decision — the editor was written
          during a Settings slice and stayed where it was born. His party,
          his world, his quest and sixteen sessions of notes were filed beside
          the theme toggle and the API key. See CharacterPage. */}
      {renderRestManagement()}
      {renderAbout()}
    </div>
  )
}
