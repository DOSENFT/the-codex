import {
  Trophy,
  Flame,
  Star,
  AlertTriangle,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { type TrainingProfile, xpForLevel, getDueFlashcards } from '../lib/training'
import { GlassCard } from './ui/GlassCard'
import { Badge } from './ui/Badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrainingProgressProps {
  profile: TrainingProfile
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<string, string> = {
  spells: 'Spells',
  combat: 'Combat',
  rules: 'Rules',
  tactics: 'Tactics',
  class_features: 'Class Features',
}

const CATEGORY_COLORS: Record<string, string> = {
  spells: 'bg-eldritch',
  combat: 'bg-ember',
  rules: 'bg-arcane',
  tactics: 'bg-verdant',
  class_features: 'bg-purple-400',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TrainingProgress({ profile }: TrainingProgressProps) {
  const currentLevelXP = xpForLevel(profile.level)
  const nextLevelXP = xpForLevel(profile.level + 1)
  const xpIntoLevel = profile.totalXP - currentLevelXP
  const xpNeeded = nextLevelXP - currentLevelXP
  const progressPct = xpNeeded > 0 ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 100

  const dueCards = getDueFlashcards(profile.flashcardProgress)

  // Compute per-category accuracy
  const categoryStats = computeCategoryStats(profile)

  return (
    <GlassCard className="p-4">
      <div className="flex flex-col gap-4">
        {/* Top row: Level + XP bar + Streak */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Level badge */}
          <div
            className={cn(
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-arcane/15 border border-arcane/30',
            )}
          >
            <span className="text-arcane font-display font-bold text-sm">
              L{profile.level}
            </span>
          </div>

          {/* XP progress */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-forge-2 font-medium">
                {profile.totalXP} XP
              </span>
              <span className="text-xs text-forge-2">
                {nextLevelXP} XP
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-arcane/80 to-arcane transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Streak */}
          <div className="shrink-0 flex items-center gap-1.5">
            <Flame size={16} className="text-ember" aria-hidden />
            <span className="font-mono text-sm text-forge-0">
              {profile.quizStreaks.current}
            </span>
          </div>
        </div>

        {/* Stats row: Best streak, sessions, due cards */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-forge-2">
            <Trophy size={13} className="text-ember" aria-hidden />
            <span>Best: {profile.quizStreaks.best}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-forge-2">
            <Calendar size={13} className="text-arcane" aria-hidden />
            <span>{profile.totalSessions} sessions</span>
          </div>

          {dueCards.length > 0 && (
            <Badge variant="eldritch" className="text-xs">
              <BookOpen size={11} className="mr-1" aria-hidden />
              {dueCards.length} card{dueCards.length !== 1 ? 's' : ''} due
            </Badge>
          )}
        </div>

        {/* Category accuracy bars */}
        {categoryStats.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-forge-2 uppercase tracking-wider">
              Accuracy by Category
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryStats.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="text-xs text-forge-1 w-20 truncate">
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        cat.accuracy >= 0.6
                          ? (CATEGORY_COLORS[cat.category] ?? 'bg-arcane')
                          : 'bg-red-400',
                      )}
                      style={{ width: `${Math.round(cat.accuracy * 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-mono w-9 text-right',
                      cat.accuracy >= 0.6 ? 'text-forge-1' : 'text-red-400',
                    )}
                  >
                    {Math.round(cat.accuracy * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weakness callouts */}
        {profile.weakCategories.length > 0 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-red-400 font-medium">Needs work:</span>
              {profile.weakCategories.map((cat) => (
                <Badge key={cat} variant="ember" className="text-[10px] px-2 py-0">
                  {CATEGORY_LABELS[cat] ?? cat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty state: no history yet */}
        {profile.quizHistory.length === 0 && profile.drillHistory.length === 0 && (
          <div className="flex items-center gap-2 py-1">
            <Star size={14} className="text-forge-2" aria-hidden />
            <span className="text-xs text-forge-2">
              Complete quizzes and drills to earn XP and track progress
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface CategoryStat {
  category: string
  accuracy: number
  total: number
}

function computeCategoryStats(profile: TrainingProfile): CategoryStat[] {
  const catMap = new Map<string, { correct: number; total: number }>()

  for (const record of profile.quizHistory) {
    const entry = catMap.get(record.category) ?? { correct: 0, total: 0 }
    entry.total += 1
    if (record.correct) entry.correct += 1
    catMap.set(record.category, entry)
  }

  const stats: CategoryStat[] = []
  for (const [category, data] of catMap.entries()) {
    if (data.total >= 1) {
      stats.push({
        category,
        accuracy: data.correct / data.total,
        total: data.total,
      })
    }
  }

  // Sort by total questions desc
  stats.sort((a, b) => b.total - a.total)
  return stats
}
