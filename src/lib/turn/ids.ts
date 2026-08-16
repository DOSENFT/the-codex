// Pool identity — the one place a name becomes an id
//
// Two modules now have to agree on what a resource pool is CALLED: compose.ts
// prices an option ("this costs one Channel Divinity") and reduce.ts pays for
// it ("so decrement Channel Divinity"). If those two ever disagree about how a
// feature name turns into an id, the app charges Marcus for something and
// deducts nothing — the worst possible failure, because the screen still looks
// right. So the rule lives here, once, and both import it.
//
// Extracted verbatim from compose.ts in Slice 6. No behaviour change.

/** A stable, url-safe key from a human-written name.  Homebrew safe: it never
 *  consults a list of known content, it just normalises. */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The two pools that predate the generic model and live in their own bespoke
 *  field on Character (`paladinResources`).  A feature named "Lay on Hands"
 *  must point at THAT pool rather than minting a second id for the same
 *  points, which is why this mapping is by name and is deliberately loose
 *  (`includes`) — Marcus's sheet says "Lay on Hands (Hearth)".
 *
 *  Slice 6b replaces both with generic ResourcePools and this function becomes
 *  a migration detail. Until then it is load-bearing. */
export function poolIdFor(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower.includes('lay on hands')) return 'lay-on-hands'
  if (lower.includes('channel divinity')) return 'channel-divinity'
  return undefined
}

/** The id `compose.ts` will price a feature-backed option with, or undefined
 *  when the feature declares no pool at all.
 *
 *  MUST stay in lockstep with `costOf()`; the reducer resolves payment through
 *  exactly this function so that "priced" and "paid" cannot drift. */
export function featurePoolId(name: string, usesMax: number | undefined): string | undefined {
  return poolIdFor(name) ?? (usesMax !== undefined ? slug(name) : undefined)
}
