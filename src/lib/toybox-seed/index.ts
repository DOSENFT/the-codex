/* The whole of this folder's public surface.
 *
 *  The packs are deliberately NOT exported. Nothing outside `toybox-seed` may
 *  hold a raw template — from slice 2 those carry unresolved `{{tokens}}`, and
 *  a caller that reached past `seedToybox` to read one would put braces on the
 *  screen. One door in, and it is the one that resolves. */
export { seedToybox, findPacks, packPresent, type SeedResult } from './seed'
export type {
  SeedPack, SeedCombo, SeedTactic, SeedPersonaPlay, SeedGate, SeedNeeds,
} from './types'
