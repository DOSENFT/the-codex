import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// FIRST, and above index.css on purpose. Slice 10 moved the three typefaces off
// the Google Fonts API and into the bundle; this import is now the ONLY thing
// that puts them on the page, so deleting it is a silent fallback to Georgia
// and system-ui rather than an error anybody would notice.
import './fonts/fonts.css'
import './index.css'
import App from './App'
import { Veil } from './components/safety/Veil'
import { registerServiceWorker } from './pwa/register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Outside App on purpose, and this is the whole of Slice 12's promise.
        App returns early three times — loading, no character yet, and the ?d=1
        turn view — so a veil mounted inside it is missing on three screens.
        Here it is on every screen there is, including the ones that are not
        the app proper. Moving this line inside App or Layout breaks the one
        thing this control exists to guarantee. */}
    <Veil />
  </StrictMode>,
)

// AFTER the render call, never before it. Registration is not on the critical
// path of getting a character sheet on screen, and a worker that fails to
// register must cost nothing worse than being online next time.
registerServiceWorker()
