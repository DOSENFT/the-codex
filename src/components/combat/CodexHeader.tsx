import { cn } from '../../lib/cn'

interface CodexHeaderProps {
  onMenuClick: () => void
  onBookClick: () => void
  onNotificationsClick: () => void
  hasUnread?: boolean
}

const ASSET_BASE = '/the-codex/asset-inbox/top-icons'

export function CodexHeader({
  onMenuClick,
  onBookClick,
  onNotificationsClick,
  hasUnread = false,
}: CodexHeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-40',
        'bg-[oklch(0.08_0.005_60)]',
        'border-b border-[oklch(0.32_0.05_65_/_0.3)]',
      )}
    >
      <div className="flex items-center justify-between px-4 h-[72px]">
        {/* Left: Menu button — 48px touch target */}
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'transition-all duration-[120ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
            'hover:bg-[oklch(0.14_0.010_60)]',
            'active:scale-[0.93]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.85_0.10_80)]',
          )}
          aria-label="Open menu"
        >
          <div
            className="w-7 h-7 mix-blend-screen"
            style={{
              backgroundImage: `url('${ASSET_BASE}/menu.png')`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
            aria-hidden
          />
        </button>

        {/* Center: THE CODEX wordmark */}
        <div className="flex flex-col items-center select-none">
          {/* Star ornament — CSS diamond, no Unicode */}
          <span
            className="block w-2 h-2 rotate-45 bg-gradient-to-br from-[oklch(0.92_0.08_82)] to-[oklch(0.52_0.08_70)]"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            aria-hidden
          />
          {/* Wordmark — clamp() for responsive scaling */}
          <span
            className="font-[family-name:var(--font-display)] text-[clamp(22px,3.5vw,28px)] tracking-[0.24em] uppercase leading-none mt-0.5"
            style={{
              fontWeight: 500,
              background: 'linear-gradient(180deg, oklch(0.92 0.08 82) 0%, oklch(0.82 0.10 80) 30%, oklch(0.72 0.10 75) 55%, oklch(0.52 0.08 70) 80%, oklch(0.78 0.10 78) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 1px 0 rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5)) drop-shadow(0 1px 0 rgba(0,0,0,0.3))',
              fontOpticalSizing: 'auto',
            }}
          >
            THE CODEX
          </span>
          {/* Hairline under wordmark */}
          <div
            className="mt-2 h-px w-16 bg-gradient-to-r from-transparent via-[oklch(0.55_0.08_70_/_0.6)] to-transparent"
            aria-hidden
          />
        </div>

        {/* Right: Book + Notifications — 48px touch targets */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBookClick}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              'transition-all duration-[120ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
              'hover:bg-[oklch(0.14_0.010_60)]',
              'active:scale-[0.93]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.85_0.10_80)]',
            )}
            aria-label="Open mechanics reference"
          >
            <div
              className="w-7 h-7 mix-blend-screen"
              style={{
                backgroundImage: `url('${ASSET_BASE}/book.png')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={onNotificationsClick}
            className={cn(
              'relative w-12 h-12 rounded-full flex items-center justify-center',
              'transition-all duration-[120ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
              'hover:bg-[oklch(0.14_0.010_60)]',
              'active:scale-[0.93]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.85_0.10_80)]',
            )}
            aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
          >
            <div
              className="w-7 h-7 mix-blend-screen"
              style={{
                backgroundImage: `url('${ASSET_BASE}/notifications.png')`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
              aria-hidden
            />
            {hasUnread && (
              <span
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[oklch(0.50_0.20_25)] shadow-[0_0_6px_oklch(0.50_0.20_25_/_0.5)]"
                aria-hidden
              />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
