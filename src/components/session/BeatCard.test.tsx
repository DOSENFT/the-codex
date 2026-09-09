import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BeatCard } from './BeatCard'
import type { Beat } from '../../lib/rp/beat'

/* ============================================================================
   WHAT A CARD TEST CAN AND CANNOT DO IN THIS REPO.

   There is no jsdom here and no testing-library. That rules out clicking,
   measuring, and anything that only appears after an update. It does NOT rule
   out the assertion that actually matters for this component, which is about
   what is PRESENT in the markup:

     - every band he was promised is drawn, for every beat, always
     - the "from the bank" notice appears when and only when it is true
     - there is no error text on the screen under any input

   That last one is the feature. The raw Gemini 503 blob in Marcus's screenshot
   reached the table through a component that owned both the request and an
   `{error && …}`. This component owns neither, and the test below is what stops
   someone adding one back on a Tuesday.
   ========================================================================== */

const BANDS = ['Use it when', 'The move', 'What it’s for', 'If they bite', 'If it lands flat']

const LIVE: Beat = {
  id: 'b1',
  intent: 'pull-in',
  aim: 'Sarah',
  aimNote: 'first session',
  useWhen: 'When the circle has gone quiet and nobody has claimed the silence.',
  moves: [
    { kind: 'do', text: 'Push a stick into the fire so the sparks go up.' },
    { kind: 'say', text: 'You left in a hurry. What did you not have time to take?' },
  ],
  goal: 'Give them a question they cannot answer wrong.',
  followUp: 'Repeat one detail of whatever they say and ask who gave it to them.',
  directions: [
    { label: 'Warmer', text: 'Answer it yourself first so they see the shape of it.' },
    { label: '', text: 'The object was stolen and they have not said so.' },
  ],
  out: 'Answer your own question, make it small, and pass the fire to the next person.',
  source: 'live',
}

const BANKED: Beat = { ...LIVE, id: 'b2', source: 'bank' }

const noop = () => {}
const render = (beat: Beat) =>
  renderToStaticMarkup(<BeatCard beat={beat} onAnother={noop} onUsed={noop} />)

describe('BeatCard draws the whole beat, not the part that arrived', () => {
  it('renders every band heading', () => {
    /* The bands ARE the answer to "it literally is just one or two lines". A
       card that silently drops `useWhen` because the model omitted it is the old
       one-liner wearing a new shape. `normaliseBeat` guarantees the content;
       this guarantees the headings. */
    const html = render(LIVE)
    for (const band of BANDS) expect(html, `${band} is missing`).toContain(band)
  })

  it('renders the directions band when there are directions', () => {
    expect(render(LIVE)).toContain('Where it can go')
  })

  it('omits the directions band rather than drawing an empty heading', () => {
    // A heading with nothing under it reads as a bug in the app.
    const html = render({ ...LIVE, directions: [] })
    expect(html).not.toContain('Where it can go')
    expect(html).toContain('Use it when')   // the rest is untouched
  })

  it('prints the text of every move, with its kind', () => {
    const html = render(LIVE)
    expect(html).toContain('Push a stick into the fire')
    expect(html).toContain('What did you not have time to take?')
    expect(html).toContain('>Do</span>')   // the kind chip, not just the sentence
    expect(html).toContain('>Say</span>')
  })

  it('names who the beat is aimed at, and flags a first-timer', () => {
    const html = render(LIVE)
    expect(html).toContain('Sarah')
    expect(html).toContain('first session')
  })

  it('drops the aim chip when there is no note rather than drawing an empty pill', () => {
    expect(render({ ...LIVE, aimNote: null })).not.toContain('first session')
  })

  it('shows an unlabelled direction without inventing a dash', () => {
    const html = render(LIVE)
    expect(html).toContain('The object was stolen')
    expect(html).not.toContain(' — </span>The object was stolen')
  })
})

describe('the bank notice is a fact, and it is never an error', () => {
  it('appears on a banked beat', () => {
    const html = render(BANKED)
    expect(html).toContain('Written offline')
    expect(html).toContain('from the bank')
  })

  it('does not appear on a live beat', () => {
    const html = render(LIVE)
    expect(html).not.toContain('Written offline')
    expect(html).toContain('live')
  })

  it('never uses failure language, on either source', () => {
    /* He is mid-scene with people looking at him. "Error", "failed" and
       "unavailable" all mean the same thing at a table — stop and deal with the
       app — and none of them are true: he has a complete beat on the screen. */
    const forbidden = /\b(error|failed|failure|unavailable|try again later|something went wrong)\b/i
    for (const beat of [LIVE, BANKED]) {
      expect(render(beat), `${beat.source} card`).not.toMatch(forbidden)
    }
  })

  it('has no red anywhere — the colour that stops a scene', () => {
    for (const beat of [LIVE, BANKED]) {
      expect(render(beat)).not.toContain('text-red-')
    }
  })
})

describe('the card survives a beat that arrived thin', () => {
  it('renders with a single move and no directions', () => {
    // `normaliseBeat` can return this. It must not produce a broken card.
    const thin: Beat = {
      ...LIVE,
      moves: [{ kind: 'ask', text: 'What did you carry out with you?' }],
      directions: [],
    }
    const html = render(thin)
    expect(html).toContain('What did you carry out with you?')
    for (const band of BANDS) expect(html).toContain(band)
  })

  it('still draws both buttons so he is never stuck on one card', () => {
    const html = render(LIVE)
    expect(html).toContain('I played it')
    expect(html).toContain('Another')
  })
})
