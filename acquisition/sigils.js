/* ────────────────────────────────────────────────────────────────────────────
   SPELL SLOT SIGILS — generator
   Implements THE_ONE_WEIRD_THING.md against the real interface shipped in
   src/components/turn/TurnRail.tsx:196-233.

   Every stroke is drawn from primitives with a *seeded* quill jitter, so each
   sigil is stable across reloads but never vector-perfect. The spec forbids
   symmetry and forbids Elder Futhark; the structure carries the level instead
   of a numeral (1 = one mark, 9 = mandala), and each level ≥2 gets one
   deliberate off-axis flourish so no shape closes cleanly.

   Output is inline SVG using currentColor, exactly as specified, so the ink /
   ghost state change is a CSS colour transition and nothing else.
   ──────────────────────────────────────────────────────────────────────────── */

;(function (root) {
const TAU = Math.PI * 2
const C = 24 // centre of the 48×48 viewBox

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSigil(level) {
  const rand = mulberry32((level * 2654435761) % 2147483647)
  const paths = []
  const dots = []

  const j = a => (rand() - 0.5) * a
  const f = p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const P = (rad, ang, jr = 0.7) => [
    C + Math.cos(ang) * (rad + j(jr)),
    C + Math.sin(ang) * (rad + j(jr)),
  ]
  const UP = -Math.PI / 2

  /* a hand-drawn circle: cubic segments with the radius nudged at every anchor,
     so the line closes a little imperfectly — the way an inked ring does */
  function ring(rad, segs = 6, jr = 0.8) {
    const pts = []
    const angs = []
    for (let i = 0; i <= segs; i++) {
      const a = UP + (TAU * i) / segs
      angs.push(a)
      pts.push(P(rad, a, jr))
    }
    let d = `M ${f(pts[0])}`
    for (let i = 1; i <= segs; i++) {
      const a0 = angs[i - 1]
      const a1 = angs[i]
      const k = (4 / 3) * Math.tan((a1 - a0) / 4) * rad
      const c1 = [pts[i - 1][0] - Math.sin(a0) * k, pts[i - 1][1] + Math.cos(a0) * k]
      const c2 = [pts[i][0] + Math.sin(a1) * k, pts[i][1] - Math.cos(a1) * k]
      d += ` C ${f(c1)}, ${f(c2)}, ${f(pts[i])}`
    }
    return d
  }

  /* an arc that deliberately does not close — the asymmetric flourish */
  function arc(rad, from, to, jr = 0.7) {
    const segs = Math.max(2, Math.round((Math.abs(to - from) / TAU) * 8))
    const pts = []
    const angs = []
    for (let i = 0; i <= segs; i++) {
      const a = from + ((to - from) * i) / segs
      angs.push(a)
      pts.push(P(rad, a, jr))
    }
    let d = `M ${f(pts[0])}`
    for (let i = 1; i <= segs; i++) {
      const a0 = angs[i - 1]
      const a1 = angs[i]
      const k = (4 / 3) * Math.tan((a1 - a0) / 4) * rad
      const c1 = [pts[i - 1][0] - Math.sin(a0) * k, pts[i - 1][1] + Math.cos(a0) * k]
      const c2 = [pts[i][0] + Math.sin(a1) * k, pts[i][1] - Math.cos(a1) * k]
      d += ` C ${f(c1)}, ${f(c2)}, ${f(pts[i])}`
    }
    return d
  }

  /* a teardrop lobe growing out of the centre — the base unit of every
     multi-element sigil, so 3rd, 5th and 6th level read as the same hand */
  function lobe(ang, len, wid) {
    const tip = P(len, ang, 0.9)
    const base = [C + j(1.0), C + j(1.0)]
    const perp = ang + Math.PI / 2
    const px = Math.cos(perp)
    const py = Math.sin(perp)
    const ax = Math.cos(ang)
    const ay = Math.sin(ang)
    const c1 = [C + px * wid + ax * len * 0.34, C + py * wid + ay * len * 0.34]
    const c2 = [tip[0] + px * wid * 0.42, tip[1] + py * wid * 0.42]
    const c3 = [tip[0] - px * wid * 0.42, tip[1] - py * wid * 0.42]
    const c4 = [C - px * wid + ax * len * 0.34, C - py * wid + ay * len * 0.34]
    return `M ${f(base)} C ${f(c1)}, ${f(c2)}, ${f(tip)} C ${f(c3)}, ${f(c4)}, ${f(base)}`
  }

  function spoke(r1, r2, ang) {
    return `M ${f(P(r1, ang, 0.4))} L ${f(P(r2, ang, 0.5))}`
  }

  /* a straight-sided figure — the angular counterweight to the rings, so the
     8th does not read as another spoked wheel next to the 7th */
  function poly(rad, n, rot = 0) {
    let d = ''
    for (let i = 0; i < n; i++) {
      const p = P(rad, UP + rot + (TAU * i) / n, 0.6)
      d += (i === 0 ? 'M ' : ' L ') + f(p)
    }
    return d + ' Z'
  }

  function dot(rad, ang, r = 1.1) {
    const p = P(rad, ang, 0.5)
    dots.push([p[0], p[1], r])
  }

  switch (level) {
    /* 1st — ONE mark. A bowed stroke with a terminal hook and a single point of
       ink above it. Nothing else. The whole level is "one". */
    case 1: {
      paths.push(
        `M ${f(P(15, UP, 0.4))} C ${f([21.4 + j(0.7), 16 + j(0.7)])}, ${f([26.4 + j(0.7), 29 + j(0.7)])}, ${f(P(15, -UP, 0.4))}`
      )
      paths.push(
        `M ${f(P(15, -UP, 0.4))} c ${f([-2.6, -1.1])}, ${f([-4.3, -3.0])}, ${f([-4.1, -5.6])}`
      )
      dot(19.5, UP, 1.25)
      break
    }

    /* 2nd — a bilateral pair that meets at the foot, with the crossbar set
       slightly off true so the mirror never quite lands */
    case 2: {
      paths.push(lobe(UP - 0.52, 16, 3.4))
      paths.push(lobe(UP + 0.52, 16, 3.4))
      paths.push(`M ${f([14.8 + j(0.6), 26.4 + j(0.5)])} L ${f([32.6 + j(0.6), 25.2 + j(0.5)])}`)
      paths.push(arc(7.5, 0.5, 2.3))
      break
    }

    /* 3rd — trefoil. Three converging. */
    case 3: {
      for (let i = 0; i < 3; i++) paths.push(lobe(UP + (TAU * i) / 3, 15.5, 4.6))
      paths.push(arc(9.5, UP + 0.35, UP + 2.1))
      dot(0, 0, 1.3)
      break
    }

    /* 4th — quartered. A ring with a four-fold cross, one arm overrun. */
    case 4: {
      paths.push(ring(13.5, 6, 0.9))
      for (let i = 0; i < 4; i++) {
        const a = UP + (TAU * i) / 4
        paths.push(spoke(3.5, i === 1 ? 18.5 : 13.5, a))
      }
      paths.push(arc(17.2, UP + 2.5, UP + 3.5))
      dot(0, 0, 1.15)
      break
    }

    /* 5th — five-lobed. A flower, not a pentagram. */
    case 5: {
      for (let i = 0; i < 5; i++) paths.push(lobe(UP + (TAU * i) / 5, 16, 4.0))
      paths.push(ring(5.6, 5, 0.5))
      paths.push(arc(19.4, UP + 1.1, UP + 2.4))
      break
    }

    /* 6th — hex rosette. Six short lobes inside a containing ring. */
    case 6: {
      paths.push(ring(17.5, 6, 0.9))
      for (let i = 0; i < 6; i++) paths.push(lobe(UP + (TAU * i) / 6, 12.5, 3.4))
      for (let i = 0; i < 6; i++) dot(17.5, UP + (TAU * i) / 6 + TAU / 12, 0.85)
      dot(0, 0, 1.2)
      break
    }

    /* 7th — seven radials round a containing ring, with an eye at the centre.
       The first prime that will not divide the page. */
    case 7: {
      paths.push(ring(18, 7, 0.9))
      for (let i = 0; i < 7; i++) paths.push(spoke(7.5, 18, UP + (TAU * i) / 7))
      paths.push(lobe(UP, 6.5, 3.6))
      paths.push(lobe(-UP, 6.5, 3.6))
      paths.push(arc(21, UP + 3.0, UP + 4.4))
      dot(0, 0, 1.0)
      break
    }

    /* 8th — the octagram. Two squares struck across each other inside a ring:
       eight points, but a straight-sided silhouette, so it does not read as
       another spoked wheel beside the 7th. */
    case 8: {
      paths.push(ring(19.5, 8, 0.9))
      paths.push(poly(15, 4, 0))
      paths.push(poly(15, 4, TAU / 8))
      paths.push(ring(5.8, 5, 0.5))
      for (let i = 0; i < 4; i++) paths.push(spoke(19.5, 22, UP + (TAU * i) / 4 + TAU / 16))
      paths.push(arc(22.6, UP + 1.5, UP + 2.6, 0.5))
      break
    }

    /* 9th — the mandala. Everything the hand knows, once. */
    case 9:
    default: {
      paths.push(ring(21, 9, 1.0))
      paths.push(ring(14.5, 7, 0.8))
      for (let i = 0; i < 9; i++) paths.push(spoke(14.5, 21, UP + (TAU * i) / 9))
      for (let i = 0; i < 3; i++) paths.push(lobe(UP + (TAU * i) / 3 + 0.28, 11, 3.6))
      for (let i = 0; i < 9; i++) dot(21, UP + (TAU * i) / 9 + TAU / 18, 0.8)
      paths.push(arc(23.2, UP + 1.4, UP + 2.9, 0.5))
      dot(0, 0, 1.35)
      break
    }
  }

  return { paths, dots }
}

const LEVEL_LABELS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

function sigilSVG(level) {
  const { paths, dots } = buildSigil(level)
  const p = paths.map(d => `<path d="${d}"/>`).join('')
  const c = dots
    .map(([x, y, r]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="currentColor" stroke="none"/>`)
    .join('')
  return (
    `<svg class="sigil-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${p}</g>${c}` +
    `</svg>`
  )
}

root.Sigils = { buildSigil, sigilSVG, LEVEL_LABELS }
})(typeof globalThis !== 'undefined' ? globalThis : window)
