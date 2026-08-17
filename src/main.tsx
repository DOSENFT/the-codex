import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
// FIRST, and above index.css on purpose. Slice 10 moved the three typefaces off
// the Google Fonts API and into the bundle; this import is now the ONLY thing
// that puts them on the page, so deleting it is a silent fallback to Georgia
// and system-ui rather than an error anybody would notice.
import './fonts/fonts.css'
import './index.css'
// AFTER index.css, because it is the last word on paper: its `@media print`
// block has to beat any screen rule Tailwind emitted above it. Slice 14.
import './design/print.css'
import App from './App'
import { Veil } from './components/safety/Veil'
import { registerServiceWorker } from './pwa/register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The JS half of the motion budget (Slice 14). The blanket media query in
        index.css cannot reach Motion, because a CSS media query does not apply
        to the Web Animations API — a `motion.div` animating opacity keeps
        animating no matter what the stylesheet says.

        17 files import `motion`; only 6 of them consulted `useReducedMotion`,
        so 11 animated regardless of the setting. `reducedMotion="user"` makes
        every motion component in the tree honour the OS preference, which is
        the same argument as the blanket CSS rule: a central switch cannot fall
        out of date, and a per-component convention already had.

        It stays here rather than inside App for the same reason the Veil does
        — App returns early three times, and a config mounted inside it would
        be absent on exactly the screens nobody remembers to check. */}
    <MotionConfig reducedMotion="user">
      <App />
      {/* Outside App on purpose, and this is the whole of Slice 12's promise.
          App returns early three times — loading, no character yet, and the ?d=1
          turn view — so a veil mounted inside it is missing on three screens.
          Here it is on every screen there is, including the ones that are not
          the app proper. Moving this line inside App or Layout breaks the one
          thing this control exists to guarantee. */}
      <Veil />
    </MotionConfig>
  </StrictMode>,
)

// AFTER the render call, never before it. Registration is not on the critical
// path of getting a character sheet on screen, and a worker that fails to
// register must cost nothing worse than being online next time.
registerServiceWorker()
