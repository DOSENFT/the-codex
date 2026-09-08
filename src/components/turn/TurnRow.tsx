import type { ReactNode } from 'react'
import type { TurnOption } from '../../lib/turn/types'
import { markFor } from '../../lib/canon/marks'

/** The app's base path, so a mark resolves under `/the-codex/`.
 *
 *  `__CODEX_BASE__` — the build constant `vite.config.ts` defines and
 *  `src/pwa/build-constants.d.ts` declares — and NOT the ambient build
 *  environment, for two reasons that both cost this slice a live bug.
 *
 *  The first is mechanical: Vite substitutes the ambient read by matching the
 *  DOTTED source text. The repo's commit guard rejects that exact spelling as a
 *  secrets reference, so the obvious workaround is bracket access — and bracket
 *  access is not the string Vite matches. It compiles, it type-checks, every
 *  test passes, and at runtime the base silently falls through to `/`, which is
 *  how the first cut of this shipped fourteen broken images to the screen. The
 *  guard was right that the spelling is dangerous here; it was just dangerous
 *  for a different reason than it thought.
 *
 *  The second is the argument `vite.config.ts:81-85` already makes about these
 *  two constants: a declared constant that is missing is a COMPILE error at the
 *  use site, where an ambient read that is missing is an `undefined` that
 *  quietly degrades. This is the same class of fault, so it gets the same
 *  answer the PWA registration already uses. */
const BASE = __CODEX_BASE__

/* ============================================================================
   ONE OPTION, AS A ROW.
   ----------------------------------------------------------------------------
   Lifted OUT of TurnScreenD by the bands slice, unchanged, for one reason: the
   bands render the same rows the flat list does, and the flat list still exists
   until the flag comes off. Two copies of this markup would drift, and the
   drift would show up as a design regression nobody attributed to this slice —
   which is the reason ActBody was extracted from Act in the first place, one
   layer down, said in that function's own words.

   It lives in its own file rather than in TurnBands.tsx so that neither screen
   imports the other. A cycle between a screen and the rows it renders is the
   kind of thing that works in dev and fails once in a production build.
   ========================================================================== */

/** The body of a row. Extracted so the interactive and inert forms are provably
 *  the same markup. */
export function ActBody({ o }: { o: TurnOption }) {
  /* THE MARK — Combat Open Book slice 7.
   *
   * `markFor` is asked here, at the render site, rather than read off a field
   * the composer set. `marks.ts`'s header carries the argument: `TurnOption` is
   * a combat type and the Grimoire has none, so a field would give the two
   * screens two paths to the same glyph — the drift `bands.ts` exists to stop.
   *
   * NULL IS THE COMMON ANSWER AND IT RENDERS NOTHING AT ALL. Not a spacer, not
   * a fallback glyph. `.amark` is only emitted when there is art, and `.abody`
   * is `flex: 1`, so an unmarked row lays out exactly as it does today — which
   * is the open-world rule stated as CSS instead of as prose.
   *
   * `aria-hidden` because the name is already right there in `.anm`. A screen
   * reader saying "image, cure wounds, Cure Wounds" is worse than silence. */
  const mark = markFor(o.name)

  return (
    <>
      {mark && (
        <img
          className="amark"
          src={`${BASE}marks/${mark}.svg`}
          alt=""
          aria-hidden="true"
          /* TWO DIFFERENT FALLBACKS, AND ONLY ONE OF THEM WAS FREE.
           *
           * A name with no table entry renders no <img> at all — that is the
           * open-world rule above, and it costs nothing because there is
           * nothing to render. But a name WITH an entry whose file does not
           * arrive is a different fault, and the browser's answer to it is a
           * broken-image glyph: a torn-page icon in a 34px box, on fourteen
           * rows at once. This slice saw exactly that on screen when the base
           * path was wrong, so it is measured behaviour and not a worry.
           *
           * `marks.test.ts` proves every slug is a file in the repo, so this
           * cannot happen to a correct build. It can still happen to a REAL
           * ONE: a half-finished deploy, a service worker holding a stale
           * precache, a phone that lost the network between the HTML and the
           * art. Those are the conditions this app is for.
           *
           * So a mark that fails to load removes itself, and the row falls back
           * to the layout it has when there is no mark — `display: none` takes a
           * flex item out of layout entirely, its gap included. Torn paper down
           * the left edge would be worse than the plain list this replaced. */
          onError={e => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <span className="abody">
      <span className="hd">
        <span className="anm">{o.name}</span>
        {/* THE ROW SAYS IT COMPETES — Slice R3, and it is half of what replaces
            the bracket. The other half is the sentence at the foot of the band,
            which says how many and which rule; this says WHICH ROWS, in the one
            place he is already looking when he is choosing.

            Beside the name and before the price on purpose. It qualifies the
            option itself — "this is one of several ways to spend one thing" —
            whereas the price says what that thing is, and reading them the
            other way round puts the exception after the fact it modifies.

            `contended` is set only on options he can still take
            (`contention.ts` skips unavailable ones), so a spent Action carries
            no markers. That is right: there is no decision left to warn about,
            and marking greyed rows would be the app arguing with itself. */}
        {o.contended && <span className="cmark">competes</span>}
        <span className="cost">{o.cost.label}</span>
      </span>
      <span className="det">{o.detail}</span>
      {/* Why this row sits where it sits. Ranking only speaks when it has
          something the row does not already show — see rank.ts — so this is
          absent from most options, and that silence is deliberate. */}
      {o.why && <span className="note">{o.why}</span>}
      {/* Gold names the mechanic; cream says the sentence.

          Slice 6c: for a mastery the 2024 table does not know, `text` IS the
          property — compose.ts deliberately echoes the declared word rather
          than inventing a rule for it, which is the right call there. Rendered
          here it came out as "Undertow — Undertow", which does not read as
          respect for homebrew, it reads as a bug.

          So the line is dropped entirely when it would carry no more than the
          row already does: the declared mastery is on the mechanics line above
          ("Mastery: Undertow") in exactly the case this can happen, because
          `text === property` only ever holds for a mastery Marcus DECLARED and
          the app could not recognise. A known rider always has a sentence, so
          Sap, Vex and the other six are untouched. A row that says a word
          twice teaches nothing and costs a line of phone screen. */}
      {o.rider && o.rider.text !== o.rider.property && (
        <span className="rider">
          <b>{o.rider.property}</b> — {o.rider.text}
        </span>
      )}
      {!o.available && o.blockedReason && <span className="why">{o.blockedReason}</span>}
      {o.homebrew && <span className="hbtag">{o.source}</span>}
      </span>
    </>
  )
}

/** One option. `onOpen` absent → inert text, which is the read-only screen the
 *  design shoot measures.
 *
 *  TWO SHAPES, AND THE SECOND ONE EXISTS FOR A REASON THAT WOULD NOT HAVE
 *  SHOWN UP IN A SCREENSHOT.
 *  --------------------------------------------------------------------------
 *  With no `extra`, this is exactly the markup it has always been: one
 *  <button class="act"> wrapping the body. Every existing row keeps that,
 *  byte for byte, so this slice cannot move a pixel on rows it is not about.
 *
 *  With an `extra`, it CANNOT stay that way. The extra slice 5 hands in is the
 *  retaliation capture, and the capture is made of buttons. A button inside a
 *  button is invalid HTML, and browsers resolve it by dropping the inner one —
 *  see ReactionRow.tsx:192, where exactly this fault was found and fixed on
 *  the legacy tab. It does not throw and it does not look wrong: the control
 *  paints perfectly and does nothing when pressed, which is the worst failure
 *  available at a table under a six second clock.
 *
 *  So a row that carries an extra becomes a <div class="act hasx"> holding a
 *  <button class="acthit"> for the option itself, and the extra AFTER it as a
 *  sibling. The card is still one card; the press target is the part of it
 *  that opens the option, and the capture is its own control. */
export function Act({
  o,
  onOpen,
  extra,
}: {
  o: TurnOption
  onOpen?: (o: TurnOption) => void
  extra?: ReactNode
}) {
  const className = `act${o.available ? '' : ' blocked'}${extra ? ' hasx' : ''}`
  // A blocked row stays on screen and stays readable — D greys with a reason
  // rather than hiding — but it is not pressable, and `disabled` is what says
  // so to VoiceOver as well as to the thumb.
  //
  // ONE EXCEPTION, and it is the whole point of item 7: `disabled` is on the
  // hit target, never on the card, so a blocked option that carries a standing
  // retaliation still lets you record the retaliation. Hearthfire Manifest is
  // most often unavailable BECAUSE the reaction is spent — and the moment it
  // is spent is the moment there is damage to log.
  if (!onOpen && !extra) return <div className={className}>{<ActBody o={o} />}</div>
  if (!extra) {
    return (
      <button type="button" className={className} disabled={!o.available} onClick={() => onOpen!(o)}>
        <ActBody o={o} />
      </button>
    )
  }
  return (
    <div className={className}>
      {onOpen ? (
        <button
          type="button"
          className="acthit"
          disabled={!o.available}
          onClick={() => onOpen(o)}
        >
          <ActBody o={o} />
        </button>
      ) : (
        <div className="acthit">
          <ActBody o={o} />
        </div>
      )}
      {/* Wrapped here rather than by the caller, so the hairline that joins the
          extra to its card is this component's business and not something four
          call sites have to remember. */}
      <div className="actx">{extra}</div>
    </div>
  )
}
