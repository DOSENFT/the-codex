import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  SlidersHorizontal,
  Sparkles,
  Save,
  Trash2,
  BookOpen,
  Upload,
  X,
  Compass,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Character } from '../../lib/character'
import {
  type VoiceParams,
  type VoiceProfile,
  type VoicePreset,
  VOICE_SLIDERS,
  VOICE_PRESETS,
  DEFAULT_PARAMS,
  describeVoice,
  findSuggestedAccent,
  loadVoiceProfiles,
  saveVoiceProfile,
  deleteVoiceProfile,
  generateProfileId,
} from '../../lib/voice-forge'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

/* ------------------------------------------------------------------ */
/*  Slider Track CSS                                                   */
/* ------------------------------------------------------------------ */

/**
 * Custom range slider styles injected once. Uses appearance-none with
 * webkit/moz pseudo-elements for a dark-fantasy themed slider.
 */
const SLIDER_STYLES = `
  .voice-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    background: var(--color-void-2);
    outline: none;
    cursor: pointer;
  }

  .voice-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-arcane);
    border: 2px solid rgba(61, 210, 255, 0.5);
    box-shadow: 0 0 10px 2px rgba(61, 210, 255, 0.3);
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.15s ease;
  }

  .voice-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 0 16px 4px rgba(61, 210, 255, 0.45);
    transform: scale(1.1);
  }

  .voice-slider::-webkit-slider-thumb:active {
    box-shadow: 0 0 20px 6px rgba(61, 210, 255, 0.5);
    transform: scale(1.15);
  }

  .voice-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-arcane);
    border: 2px solid rgba(61, 210, 255, 0.5);
    box-shadow: 0 0 10px 2px rgba(61, 210, 255, 0.3);
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.15s ease;
  }

  .voice-slider::-moz-range-thumb:hover {
    box-shadow: 0 0 16px 4px rgba(61, 210, 255, 0.45);
    transform: scale(1.1);
  }

  .voice-slider::-moz-range-track {
    height: 8px;
    border-radius: 9999px;
    background: var(--color-void-2);
  }

  .voice-slider:focus-visible {
    outline: 2px solid var(--color-arcane);
    outline-offset: 4px;
    border-radius: 9999px;
  }
`

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceForgeProps {
  character: Character
  onGenerate?: (params: VoiceParams, description: string) => void
  onSelectAccent?: (accentId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VoiceForge({ character, onGenerate, onSelectAccent }: VoiceForgeProps) {
  /* ── State ── */
  const [params, setParams] = useState<VoiceParams>({ ...DEFAULT_PARAMS })
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [savedProfiles, setSavedProfiles] = useState<VoiceProfile[]>(() => loadVoiceProfiles())
  const [generating, setGenerating] = useState(false)
  const [showSaveSection, setShowSaveSection] = useState(false)

  const presetsRowRef = useRef<HTMLDivElement>(null)
  const stylesInjectedRef = useRef(false)

  /* ── Inject custom slider CSS once ── */
  useEffect(() => {
    if (stylesInjectedRef.current) return
    stylesInjectedRef.current = true
    const style = document.createElement('style')
    style.textContent = SLIDER_STYLES
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
      stylesInjectedRef.current = false
    }
  }, [])

  /* ── Derived ── */
  const suggestedAccent = useMemo(() => findSuggestedAccent(params), [params])
  const voiceDescription = useMemo(() => describeVoice(params), [params])

  /* ── Handlers ── */
  const handleSliderChange = useCallback((key: keyof VoiceParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
    setActivePreset(null)
  }, [])

  const handlePresetClick = useCallback((preset: VoicePreset) => {
    setParams({ ...preset.params })
    setActivePreset(preset.id)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!onGenerate) return
    setGenerating(true)
    try {
      const description = describeVoice(params)
      await onGenerate(params, description)
    } finally {
      setGenerating(false)
    }
  }, [params, onGenerate])

  const handleSaveProfile = useCallback(() => {
    const trimmed = profileName.trim()
    if (!trimmed) return

    const now = new Date().toISOString()
    const profile: VoiceProfile = {
      id: generateProfileId(),
      name: trimmed,
      params: { ...params },
      linkedCharacterId: character.id,
      suggestedAccentId: suggestedAccent?.id,
      createdAt: now,
      updatedAt: now,
    }

    saveVoiceProfile(profile)
    setSavedProfiles(loadVoiceProfiles())
    setProfileName('')
    setShowSaveSection(false)
  }, [profileName, params, character.id, suggestedAccent])

  const handleLoadProfile = useCallback((profile: VoiceProfile) => {
    setParams({ ...profile.params })
    setActivePreset(null)
  }, [])

  const handleDeleteProfile = useCallback((id: string) => {
    deleteVoiceProfile(id)
    setSavedProfiles(loadVoiceProfiles())
  }, [])

  const handleAccentClick = useCallback(() => {
    if (suggestedAccent && onSelectAccent) {
      onSelectAccent(suggestedAccent.id)
    }
  }, [suggestedAccent, onSelectAccent])

  /* ── Render ── */
  return (
    <section
      className="flex flex-col gap-5 animate-fade-in"
      aria-label="Voice Forge"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <SlidersHorizontal size={20} className="text-arcane shrink-0" aria-hidden />
        <h2 className="font-display text-lg font-semibold text-forge-0">
          Voice Forge
        </h2>
        {activePreset && (
          <Badge variant="arcane" className="ml-auto">
            {VOICE_PRESETS.find(p => p.id === activePreset)?.name ?? 'Preset'}
          </Badge>
        )}
        {!activePreset && (
          <Badge variant="neutral" className="ml-auto">Custom</Badge>
        )}
      </div>

      {/* ─── Preset Chips ─── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-forge-2 uppercase tracking-wider">
          Presets
        </p>
        <div
          ref={presetsRowRef}
          className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1"
          role="listbox"
          aria-label="Voice presets"
        >
          {VOICE_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={isActive}
                title={preset.description}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5',
                  'min-h-[44px] px-4 rounded-xl border text-sm font-medium',
                  'transition-all duration-200 ease-forge select-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                  'active:scale-[0.97]',
                  isActive && [
                    'bg-arcane/15 border-arcane/30 text-arcane',
                    'shadow-[0_0_12px_-4px_rgba(61,210,255,0.2)]',
                  ],
                  !isActive && [
                    'bg-white/[0.03] border-white/8 text-forge-2',
                    'hover:bg-white/[0.06] hover:text-forge-1 hover:border-white/12',
                  ],
                )}
              >
                {preset.name}
              </button>
            )
          })}
        </div>
        {/* Active preset description */}
        {activePreset && (
          <p className="text-xs text-forge-2 italic animate-fade-in">
            {VOICE_PRESETS.find(p => p.id === activePreset)?.description}
          </p>
        )}
      </div>

      {/* ─── Sliders ─── */}
      <GlassCard className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={16} className="text-forge-2" aria-hidden />
          <h3 className="font-display text-sm font-semibold text-forge-0">
            Voice Parameters
          </h3>
        </div>

        <div className="flex flex-col gap-5">
          {VOICE_SLIDERS.map((slider) => {
            const value = params[slider.key]
            return (
              <div
                key={slider.key}
                className="flex flex-col gap-1.5"
              >
                {/* Label row */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`voice-slider-${slider.key}`}
                    className="text-sm font-medium text-forge-0"
                  >
                    {slider.label}
                  </label>
                  <span
                    className={cn(
                      'text-xs font-mono tabular-nums',
                      'min-w-[2.5rem] text-right',
                      value <= 25 && 'text-forge-2',
                      value > 25 && value <= 75 && 'text-forge-1',
                      value > 75 && 'text-arcane',
                    )}
                  >
                    {value}
                  </span>
                </div>

                {/* Slider track */}
                <div className="min-h-[44px] flex items-center">
                  <input
                    id={`voice-slider-${slider.key}`}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(e) => handleSliderChange(slider.key, Number(e.target.value))}
                    className="voice-slider"
                    style={{
                      background: `linear-gradient(to right, var(--color-arcane) 0%, var(--color-eldritch) ${value}%, var(--color-void-2) ${value}%)`,
                    }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={value}
                    aria-label={`${slider.label}: ${value}`}
                  />
                </div>

                {/* Low / High labels */}
                <div className="flex justify-between">
                  <span className="text-xs text-forge-2">{slider.lowLabel}</span>
                  <span className="text-xs text-forge-2">{slider.highLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* ─── Suggested Accent ─── */}
      {suggestedAccent && (
        <div className="animate-fade-in">
          <button
            type="button"
            onClick={handleAccentClick}
            disabled={!onSelectAccent}
            className={cn(
              'w-full flex items-center gap-3 min-h-[44px]',
              'px-4 py-2.5 rounded-xl',
              'bg-eldritch/8 border border-eldritch/20',
              'transition-all duration-200 ease-forge',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
              onSelectAccent && [
                'cursor-pointer',
                'hover:bg-eldritch/12 hover:border-eldritch/30',
                'active:scale-[0.99]',
              ],
              !onSelectAccent && 'cursor-default',
            )}
          >
            <Compass size={16} className="text-eldritch shrink-0" aria-hidden />
            <span className="text-sm text-forge-1">
              Suggested:{' '}
              <span className="font-semibold text-eldritch">
                {suggestedAccent.name}
              </span>
            </span>
            {onSelectAccent && (
              <span className="ml-auto text-xs text-forge-2">View</span>
            )}
          </button>
        </div>
      )}

      {/* ─── Voice Description Preview ─── */}
      <GlassCard className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-forge-2 shrink-0" aria-hidden />
          <h3 className="font-display text-sm font-semibold text-forge-0">
            Voice Description
          </h3>
        </div>
        <p className="text-sm text-forge-1 leading-relaxed">
          {voiceDescription}
        </p>
      </GlassCard>

      {/* ─── Generate Button ─── */}
      <Button
        variant="primary"
        size="lg"
        loading={generating}
        onClick={handleGenerate}
        disabled={!onGenerate}
        className="w-full"
      >
        <Sparkles size={18} aria-hidden />
        Generate Voice Profile
      </Button>

      {/* ─── Save Section ─── */}
      <GlassCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save size={16} className="text-forge-2 shrink-0" aria-hidden />
            <h3 className="font-display text-sm font-semibold text-forge-0">
              Saved Profiles
            </h3>
            <Badge variant="neutral">{savedProfiles.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveSection(!showSaveSection)}
            className="text-xs"
          >
            {showSaveSection ? (
              <>
                <X size={14} aria-hidden />
                Cancel
              </>
            ) : (
              <>
                <Save size={14} aria-hidden />
                Save Current
              </>
            )}
          </Button>
        </div>

        {/* Save form */}
        {showSaveSection && (
          <div className="flex gap-2 animate-fade-in">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProfile()
              }}
              placeholder="Profile name..."
              maxLength={40}
              className={cn(
                'flex-1 min-h-[44px] px-3.5 rounded-xl',
                'bg-void-2 border border-white/10',
                'text-sm text-forge-0 placeholder:text-forge-2',
                'transition-all duration-200 ease-forge',
                'focus:border-arcane/40 focus:outline-none',
                'focus:shadow-[0_0_12px_-4px_rgba(61,210,255,0.2)]',
              )}
              aria-label="Profile name"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveProfile}
              disabled={!profileName.trim()}
            >
              Save
            </Button>
          </div>
        )}

        {/* Profile list */}
        {savedProfiles.length === 0 && !showSaveSection && (
          <p className="text-sm text-forge-2 text-center py-3">
            No saved profiles yet. Adjust sliders and save your first voice.
          </p>
        )}

        {savedProfiles.length > 0 && (
          <ul className="flex flex-col gap-2" role="list" aria-label="Saved voice profiles">
            {savedProfiles.map((profile) => (
              <li
                key={profile.id}
                className={cn(
                  'flex items-center gap-3 min-h-[44px]',
                  'px-3.5 py-2 rounded-xl',
                  'bg-white/[0.02] border border-white/6',
                  'transition-all duration-200 ease-forge',
                  'hover:bg-white/[0.04] hover:border-white/10',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-forge-0 truncate">
                    {profile.name}
                  </p>
                  <p className="text-xs text-forge-2 truncate">
                    {new Date(profile.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadProfile(profile)}
                  title="Load this profile"
                  className={cn(
                    'inline-flex items-center justify-center',
                    'min-h-[44px] min-w-[44px] rounded-lg',
                    'text-forge-2 hover:text-arcane hover:bg-arcane/10',
                    'transition-all duration-200 ease-forge',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    'active:scale-[0.95]',
                  )}
                  aria-label={`Load profile ${profile.name}`}
                >
                  <Upload size={16} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteProfile(profile.id)}
                  title="Delete this profile"
                  className={cn(
                    'inline-flex items-center justify-center',
                    'min-h-[44px] min-w-[44px] rounded-lg',
                    'text-forge-2 hover:text-ember hover:bg-ember/10',
                    'transition-all duration-200 ease-forge',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane',
                    'active:scale-[0.95]',
                  )}
                  aria-label={`Delete profile ${profile.name}`}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </section>
  )
}
