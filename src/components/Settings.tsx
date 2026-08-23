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
import { loadAIConfig, saveAIConfig, fetchOllamaModels, getDefaultOllamaUrl, GEMINI_MODELS, type AIProvider } from '../lib/ai'
import { useAI } from '../hooks/useAI'
import { shortRest, longRest, generateId, type Character, type RosterEntry, computePaladinResources } from '../lib/character'
import { parseCharacterFile, formatList } from '../lib/import-character'
import { ASTERA_PERSONA } from '../lib/dnd-data'
import { Button } from './ui/Button'
import { GlassCard } from './ui/GlassCard'
import { ParchmentCard } from './ui/ParchmentCard'
import { OrnateHeader } from './ui/OrnateHeader'
import { Input } from './ui/Input'
import { CampaignEditor } from './CampaignEditor'
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Settings({ character, onCharacterUpdate, onResetCharacter, roster, onSwitchCharacter, onCreateNew }: SettingsProps) {
  /* ------ AI config state ------ */
  const [provider, setProvider] = useState<AIProvider>('ollama')
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash')
  const [ollamaUrl, setOllamaUrl] = useState(getDefaultOllamaUrl())
  const [ollamaModel, setOllamaModel] = useState('gemma3-27b-abliterated:latest')
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
    // Always save BOTH provider configs so fallback works
    saveAIConfig({
      provider,
      geminiApiKey: geminiKey || undefined,
      geminiModel: geminiModel,
      ollamaUrl: ollamaUrl || undefined,
      ollamaModel: ollamaModel || undefined,
      fallbackEnabled,
    })
    setConfigSaved(true)
    setTestSuccess(false)
    setTimeout(() => setConfigSaved(false), 2500)
  }, [provider, geminiKey, geminiModel, ollamaUrl, ollamaModel, fallbackEnabled])

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

  const handleExport = useCallback(() => {
    const data = JSON.stringify(character, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = character.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    a.href = url
    a.download = `codex-${safeName}-lvl${character.level}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [character])

  const handleImport = useCallback(() => {
    setImportError(null)
    setImportSuccess(false)
    setImportWarnings([])
    setImportRepairs([])
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
        onCharacterUpdate(result.character)
        /* A thin old export is still a real import, so it succeeds — but the
           green tick alone would let it pass as complete when it isn't. The
           amber notice stays put instead of self-dismissing: what it says is
           still true in five minutes. */
        if (result.repairs.length > 0) setImportRepairs(result.repairs)
        if (result.warnings.length > 0) {
          setImportWarnings(result.warnings)
          return
        }
        if (result.repairs.length > 0) return
        setImportSuccess(true)
        setTimeout(() => setImportSuccess(false), 3000)
      }
      reader.onerror = () => setImportError('That file could not be read off the device.')
      reader.readAsText(file)
    }
    input.click()
  }, [onCharacterUpdate])

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
    const updated = {
      ...character,
      level: character.level + 1,
      proficiencyBonus: Math.ceil((character.level + 1) / 4) + 1,
    }
    onCharacterUpdate(updated)
    setRestFeedback(`Leveled up to ${updated.level}! Update your spells and features as needed.`)
    setTimeout(() => setRestFeedback(null), 4000)
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
  const renderAIConfig = () => (
    <GlassCard className="ornate-border">
      <OrnateHeader className="mb-5">AI Configuration</OrnateHeader>

      {/* Provider toggle */}
      <div className="flex flex-col gap-1.5 mb-5">
        <span className="text-sm font-medium text-forge-1">Provider</span>
        <div className="flex rounded-xl overflow-hidden border border-bronze/25">
          {(['gemini', 'ollama'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={cn(
                'flex-1 min-h-[44px] text-sm font-medium',
                'transition-all duration-200 ease-forge',
                'active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                provider === p
                  ? 'bg-arcane/15 text-arcane'
                  : 'bg-gold/[0.04] text-forge-2 hover:bg-gold/[0.08] hover:text-forge-1',
              )}
            >
              {p === 'gemini' ? 'Gemini' : 'Ollama'}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini config */}
      {provider === 'gemini' && (
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gemini-key" className="text-sm font-medium text-forge-1">
              API Key
            </label>
            <div className="relative">
              <input
                id="gemini-key"
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
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
                onClick={() => setShowKey(!showKey)}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  'w-9 h-9 flex items-center justify-center rounded-lg',
                  'text-forge-2 hover:text-forge-1',
                  'transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                )}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>
          </div>

          {/* Model selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-forge-1">Model</span>
            <div className="flex flex-col gap-1.5">
              {GEMINI_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGeminiModel(m.id)}
                  className={cn(
                    'flex items-center justify-between min-h-[44px] px-3.5 rounded-xl text-left',
                    'transition-all duration-200 ease-forge active:scale-[0.98]',
                    'border',
                    geminiModel === m.id
                      ? 'bg-arcane/10 border-arcane/30 text-forge-0 ornate-border'
                      : 'bg-gold/[0.03] border-bronze/20 text-forge-2 hover:bg-gold/[0.06] hover:text-forge-1',
                  )}
                >
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-xs opacity-60">{m.description}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-forge-2">
              Each model has its own free quota. Switch if one is rate-limited.
            </p>
          </div>
        </div>
      )}

      {/* Ollama config */}
      {provider === 'ollama' && (
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col gap-1.5">
            <Input
              icon={Server}
              label="Ollama URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder={getDefaultOllamaUrl()}
            />
            {typeof window !== 'undefined' && !window.location.hostname.startsWith('192.168.') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !ollamaUrl.includes(window.location.origin) && (
              <button
                type="button"
                onClick={() => setOllamaUrl(`${window.location.origin}/ollama`)}
                className={cn(
                  'flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-left text-sm',
                  'bg-verdant/10 border border-verdant/25 text-verdant',
                  'transition-all duration-200 active:scale-[0.98]',
                )}
              >
                <Wifi size={14} aria-hidden />
                Use built-in proxy (recommended for remote access)
              </button>
            )}
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
            {provider === 'ollama'
              ? 'Use Gemini automatically when Ollama is unreachable (away from home WiFi)'
              : 'Use Ollama automatically when Gemini is unavailable'}
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

      {fallbackEnabled && provider === 'ollama' && !geminiKey && (
        <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-ember/10 border border-ember/25">
          <AlertTriangle size={16} className="text-ember shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-ember">
            Add a Gemini API key below for fallback to work away from home.
            Get one free at{' '}
            <span className="underline">aistudio.google.com/apikey</span>
          </p>
        </div>
      )}

      {/* Show secondary provider config when fallback is on */}
      {fallbackEnabled && provider === 'ollama' && (
        <div className="mb-5 p-3 rounded-xl bg-gold/[0.02] border border-bronze/20">
          <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-2">
            Fallback: Gemini
          </span>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Gemini API key"
                className={cn(
                  'min-h-[44px] w-full rounded-xl',
                  'bg-void-2/60 text-forge-0 placeholder:text-forge-2',
                  'border border-bronze/25 font-mono text-sm',
                  'pl-4 pr-12',
                  'transition-all duration-200 ease-forge',
                  'focus:border-arcane/60 focus:bg-void-2/80',
                  'focus:shadow-[0_0_0_3px_rgba(197,165,90,0.12)]',
                  'focus:outline-none',
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-forge-2 hover:text-forge-1 transition-colors duration-200"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-forge-2">Model</span>
              <div className="flex gap-1.5 flex-wrap">
                {GEMINI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGeminiModel(m.id)}
                    className={cn(
                      'min-h-[44px] px-3 rounded-lg text-xs font-medium transition-all duration-200 active:scale-[0.97] border',
                      geminiModel === m.id
                        ? 'bg-arcane/10 border-arcane/30 text-arcane ornate-border'
                        : 'bg-gold/[0.03] border-bronze/20 text-forge-2 hover:text-forge-1',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {fallbackEnabled && provider === 'gemini' && (
        <div className="mb-5 p-3 rounded-xl bg-gold/[0.02] border border-bronze/20">
          <span className="text-xs font-semibold text-forge-2 uppercase tracking-wider block mb-2">
            Fallback: Ollama
          </span>
          <Input
            icon={Server}
            label="Ollama URL"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>
      )}

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

      {importSuccess && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-verdant/10 border border-verdant/25 animate-fade-in">
          <CheckCircle2 size={16} className="text-verdant shrink-0" aria-hidden />
          <span className="text-sm text-verdant">Character imported successfully</span>
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
      {/* Campaign & World */}
      <CampaignEditor character={character} onCharacterUpdate={onCharacterUpdate} />
      {renderRestManagement()}
      {renderAbout()}
    </div>
  )
}
