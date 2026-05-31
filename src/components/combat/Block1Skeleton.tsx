export function Block1Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-label="Loading character data">
      {/* Portrait + Name */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-[140px] h-[170px] rounded-xl bg-[oklch(0.14_0.010_60)]" />
        <div className="w-48 h-8 rounded bg-[oklch(0.14_0.010_60)]" />
        <div className="w-32 h-4 rounded bg-[oklch(0.11_0.008_60)]" />
      </div>
      {/* Vitals grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-[oklch(0.11_0.008_60)]" />
        ))}
      </div>
      {/* Action row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 rounded-lg bg-[oklch(0.11_0.008_60)]" />
        ))}
      </div>
      {/* Status row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-20 rounded-lg bg-[oklch(0.11_0.008_60)]" />
        ))}
      </div>
    </div>
  )
}
