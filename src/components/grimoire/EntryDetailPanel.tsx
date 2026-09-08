/* MOVED — Combat Open Book slice 1.
 *
 * The panel itself now lives at `components/canon/EntryDetailPanel.tsx`, because
 * as of this slice the Combat tab renders it too and a component two tabs share
 * cannot live inside one of them. Nothing about the component changed: it was
 * already `{ detail, rulings? }` and nothing else, with no state, no effects and
 * no character, which is exactly why the move was one line rather than a port.
 *
 * This re-export stays for one slice so the move and the rewiring are separate
 * diffs — `CatalogueRow.tsx` and `EntryDetailPanel.test.tsx` still import from
 * here, and slice 8 repoints them and deletes this file.
 *
 * THE TEST IS REPOINTED, NEVER DELETED. `EntryDetailPanel.test.tsx` is the pin
 * that proves the Grimoire did not move a pixel while the Combat page grew the
 * same card. Deleting it to make a refactor green is the one thing this plan
 * will not do. */

export { EntryDetailPanel } from '../canon/EntryDetailPanel'
export type { EntryDetailPanelProps } from '../canon/EntryDetailPanel'
