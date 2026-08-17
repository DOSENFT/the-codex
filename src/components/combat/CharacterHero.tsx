import { motion } from 'motion/react'
import type { Character } from '../../lib/character'
import { revealUp, scaleReveal } from '../../lib/motion-utils'

interface CharacterHeroProps {
  character: Character
}

/**
 * The Illuminated Folio — character frontispiece.
 * Portrait centered with two-ring frame + atmospheric glow,
 * character name rendered as gold-gradient headline,
 * level/race/class subline, and optional subclass badge.
 *
 * v3 choreography: portrait scales in, name slides up,
 * subline fades in with staggered delay.
 */
export function CharacterHero({ character }: CharacterHeroProps) {
  const initials = character.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex flex-col items-center text-center pb-2">

      {/* ── Portrait Frame — atmospheric glow + scale entrance ── */}
      <motion.div
        className="portrait-frame mb-3"
        initial={scaleReveal.initial}
        animate={scaleReveal.animate}
        transition={scaleReveal.transition}
      >
        <div className="portrait-frame-glow" />
        <div className="portrait-frame-ring" />
        <div className="portrait-frame-inner">
          <span className="font-display text-2xl font-bold text-gold/60 select-none tracking-wider">
            {initials}
          </span>
        </div>
        <div className="portrait-level-badge">
          {character.level}
        </div>
      </motion.div>

      {/* ── Character Name — gold gradient headline, reveal-up ── */}
      <motion.h2
        className="text-[28px] font-bold gold-gradient-text tracking-[0.06em] uppercase leading-tight"
        initial={revealUp.initial}
        animate={revealUp.animate}
        transition={revealUp.transition}
      >
        {character.name}
      </motion.h2>

      {/* ── Subline — Level · Race · Class — delayed fade-in ── */}
      <motion.p
        className="mt-1 font-body text-xs text-ink-secondary tracking-[0.04em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, delay: 0.1 }}
      >
        Level {character.level}
        <Dot />
        {character.race}
        <Dot />
        {character.class}
      </motion.p>

      {/* ── Subclass Badge ── */}
      {character.subclass && (
        <div className="subclass-badge mt-2">
          <span className="text-gold-dim/70 text-xs select-none" aria-hidden>&#9670;</span>
          <span>{character.subclass}</span>
        </div>
      )}
    </div>
  )
}

function Dot() {
  return <span className="mx-1.5 text-ink-muted/50 select-none">&middot;</span>
}
