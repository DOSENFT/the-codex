import { useEffect, type RefObject } from 'react'

/**
 * Take a closed overlay out of the tab order and the accessibility tree.
 *
 * Three drawers in this app — the dice roller, the mechanics reference and the
 * combat action menu — are mounted all the time and slid off the bottom of the
 * viewport when closed, so that opening them is a spring rather than a mount.
 * That is a good trade for how they feel and a bad one for everything else:
 *
 *   - their controls stay in the tab order. Closed, they held 22, 35 and 11
 *     focusable elements respectively — 68 stops between the last real control
 *     on the page and the end of the document.
 *   - each declares `role="dialog" aria-modal="true"`, so a screen reader is
 *     told there are three open modals on a screen showing none.
 *
 * `pointer-events: none` — which all three already set — fixes the mouse and
 * nothing else. `inert` is the single attribute that covers both, and it is
 * applied imperatively here because `motion`'s prop types predate React 19's
 * support for it, and a cast at three call sites is worse than a hook.
 *
 * Not needed by anything built on `ui/Sheet`: those unmount when closed.
 */
export function useInertWhenClosed(ref: RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    ref.current?.toggleAttribute('inert', !isOpen)
  }, [ref, isOpen])
}
