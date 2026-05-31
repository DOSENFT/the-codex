export function Block1Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Ornamental frame — empty portrait */}
      <div className="w-[140px] h-[170px] rounded-xl border border-dashed border-[oklch(0.32_0.05_65_/_0.4)] flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10 text-[oklch(0.32_0.05_65)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-[0.04em] text-[oklch(0.50_0.015_60)]">
          No Adventurer Loaded
        </p>
        <p className="font-[family-name:var(--font-body)] text-[13px] text-[oklch(0.35_0.01_60)] mt-1">
          Select a character from your roster to begin
        </p>
      </div>
    </div>
  )
}
