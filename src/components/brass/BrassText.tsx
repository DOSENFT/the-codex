import { cn } from '../../lib/cn'
import './brass-text.css'

type BrassTextProps = {
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div'
  weight?: 'display' | 'body' | 'mono'
  size?: 'footnote' | 'caption' | 'body' | 'section' | 'chapter' | 'display' | 'hero'
  tone?: 'brass' | 'ivory' | 'muted' | 'arcane'
  children: React.ReactNode
  className?: string
}

const WEIGHT_CLASS: Record<NonNullable<BrassTextProps['weight']>, string> = {
  display: 'font-[family-name:var(--font-display)]',
  body: 'font-[family-name:var(--font-body)]',
  mono: 'font-[family-name:var(--font-mono)] tabular-nums',
}

const SIZE_CLASS: Record<NonNullable<BrassTextProps['size']>, string> = {
  footnote: 'text-[11px] leading-[1.45]',
  caption: 'text-[13px] leading-[1.45]',
  body: 'text-[15px] leading-[1.55]',
  section: 'text-[20px] leading-[1.35]',
  chapter: 'text-[clamp(36px,6vw,48px)] leading-[1.10]',
  display: 'text-[clamp(36px,8vw,56px)] leading-[1.0]',
  hero: 'text-[clamp(56px,12vw,96px)] leading-none',
}

const WEIGHT_VALUE: Record<NonNullable<BrassTextProps['weight']>, Record<NonNullable<BrassTextProps['size']>, number>> = {
  display: { footnote: 500, caption: 500, body: 500, section: 600, chapter: 600, display: 700, hero: 700 },
  body: { footnote: 400, caption: 400, body: 400, section: 500, chapter: 500, display: 600, hero: 600 },
  mono: { footnote: 400, caption: 500, body: 500, section: 500, chapter: 700, display: 700, hero: 700 },
}

export function BrassText({
  as: Tag = 'span',
  weight = 'display',
  size = 'body',
  tone = 'brass',
  children,
  className,
}: BrassTextProps) {
  const fontWeight = WEIGHT_VALUE[weight][size]
  const isLargeDisplay = size === 'chapter' || size === 'display' || size === 'hero'

  return (
    <Tag
      className={cn(
        WEIGHT_CLASS[weight],
        SIZE_CLASS[size],
        `brass-text-${tone}`,
        className,
      )}
      style={{
        fontWeight,
        fontFeatureSettings: '"lnum" 1',
        fontOpticalSizing: 'auto',
        letterSpacing: isLargeDisplay ? '-0.02em' : undefined,
      }}
    >
      {children}
    </Tag>
  )
}
