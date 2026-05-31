import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import type { TacticDiagramData, DiagramNode, DiagramArrow, DiagramLabel } from '../../lib/tactic-diagrams'

/* ==========================================================================
   TACTIC DIAGRAM — Simplified SVG Battlefield Visualization
   Pure render: nodes, arrows, labels on a dark grid.
   Adapted for The Codex main-app design tokens.
   ========================================================================== */

// ─── Constants ───

const SVG_W = 320
const SVG_H = 180

/** Map 0-100 grid coords to SVG coords with padding */
const PAD_X = 16
const PAD_Y = 12
const DRAW_W = SVG_W - PAD_X * 2 // 288
const DRAW_H = SVG_H - PAD_Y * 2 // 156

function toSvgX(x: number) { return PAD_X + (x / 100) * DRAW_W }
function toSvgY(y: number) { return PAD_Y + (y / 100) * DRAW_H }

const NODE_RADIUS: Record<NonNullable<DiagramNode['size']>, number> = {
  sm: 10,
  md: 14,
  lg: 18,
}

/** CSS custom property references mapped to main-app tokens */
const ROLE_COLORS: Record<DiagramNode['role'], string> = {
  player: 'var(--color-verdant)',
  ally: 'var(--color-arcane)',
  enemy: '#f87171',
  objective: 'var(--color-ember)',
}

/** Arrow styling per style type — main-app color tokens */
const ARROW_STYLES: Record<DiagramArrow['style'], {
  color: string
  dasharray: string
}> = {
  move:   { color: 'var(--color-verdant)',  dasharray: '6 4' },
  attack: { color: '#f87171',               dasharray: '' },
  spell:  { color: 'var(--color-eldritch)', dasharray: '6 4' },
  aoe:    { color: 'var(--color-ember)',     dasharray: '2 4' },
}

/** Map label color tokens to CSS custom properties */
const LABEL_COLOR_MAP: Record<string, string> = {
  gold: 'var(--color-ember)',
  heal: 'var(--color-verdant)',
  damage: '#f87171',
  arcane: 'var(--color-arcane)',
  danger: '#f87171',
  info: 'var(--color-arcane)',
  ember: 'var(--color-ember)',
  verdant: 'var(--color-verdant)',
  eldritch: 'var(--color-eldritch)',
}

function resolveLabelColor(color?: string): string {
  if (!color) return 'var(--color-forge-2)'
  return LABEL_COLOR_MAP[color] ?? color
}

// ─── Props ───

interface TacticDiagramProps {
  diagram: TacticDiagramData
  className?: string
}

// ─── Sub-components ───

function GridDots() {
  const dots: { cx: number; cy: number }[] = []
  for (let gx = 0; gx <= 100; gx += 20) {
    for (let gy = 0; gy <= 100; gy += 20) {
      dots.push({ cx: toSvgX(gx), cy: toSvgY(gy) })
    }
  }
  return (
    <g aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={1.2} fill="white" opacity={0.06} />
      ))}
    </g>
  )
}

function ArrowDefs() {
  return (
    <defs>
      {(Object.entries(ARROW_STYLES) as [DiagramArrow['style'], typeof ARROW_STYLES[DiagramArrow['style']]][]).map(
        ([style, config]) => (
          <marker
            key={style}
            id={`arrow-${style}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 Z" fill={config.color} />
          </marker>
        ),
      )}
    </defs>
  )
}

function DiagramArrowLine({
  arrow,
  nodeMap,
}: {
  arrow: DiagramArrow
  nodeMap: Map<string, { sx: number; sy: number; r: number }>
}) {
  const from = nodeMap.get(arrow.from)
  const to = nodeMap.get(arrow.to)
  if (!from || !to) return null

  const dx = to.sx - from.sx
  const dy = to.sy - from.sy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return null

  const ux = dx / dist
  const uy = dy / dist

  // Offset line endpoints so they start/end at circle edge
  const x1 = from.sx + ux * (from.r + 2)
  const y1 = from.sy + uy * (from.r + 2)
  const x2 = to.sx - ux * (to.r + 4)
  const y2 = to.sy - uy * (to.r + 4)

  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  const config = ARROW_STYLES[arrow.style]

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={config.color}
        strokeWidth={1.5}
        strokeDasharray={config.dasharray || undefined}
        markerEnd={`url(#arrow-${arrow.style})`}
        opacity={0.7}
      />
      {arrow.label && (
        <text
          x={midX}
          y={midY - 5}
          textAnchor="middle"
          fill={config.color}
          fontSize={8}
          fontFamily="var(--font-body)"
          fontWeight={500}
          opacity={0.85}
        >
          {arrow.label}
        </text>
      )}
    </g>
  )
}

function DiagramNodeCircle({ node }: { node: DiagramNode }) {
  const cx = toSvgX(node.x)
  const cy = toSvgY(node.y)
  const r = NODE_RADIUS[node.size ?? 'md']
  const color = ROLE_COLORS[node.role]

  return (
    <g>
      {/* Outer stroke ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 1.5}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.4}
      />
      {/* Filled circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        opacity={0.3}
      />
      {/* Inner bright dot */}
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.45}
        fill={color}
        opacity={0.9}
      />
      {/* Label below */}
      {node.label && (
        <text
          x={cx}
          y={cy + r + 11}
          textAnchor="middle"
          fill="white"
          fontSize={8}
          fontFamily="var(--font-body)"
          fontWeight={500}
          opacity={0.8}
        >
          {node.label}
        </text>
      )}
    </g>
  )
}

function DiagramLabelText({ label }: { label: DiagramLabel }) {
  return (
    <text
      x={toSvgX(label.x)}
      y={toSvgY(label.y)}
      textAnchor="middle"
      fill={resolveLabelColor(label.color)}
      fontSize={9}
      fontFamily="var(--font-display)"
      fontStyle="italic"
      fontWeight={500}
      opacity={0.9}
    >
      {label.text}
    </text>
  )
}

// ─── Main Component ───

export function TacticDiagram({ diagram, className }: TacticDiagramProps) {
  /** Pre-compute node positions for arrow endpoint calculations */
  const nodeMap = useMemo(() => {
    const map = new Map<string, { sx: number; sy: number; r: number }>()
    for (const node of diagram.nodes) {
      map.set(node.id, {
        sx: toSvgX(node.x),
        sy: toSvgY(node.y),
        r: NODE_RADIUS[node.size ?? 'md'],
      })
    }
    return map
  }, [diagram.nodes])

  return (
    <div
      className={cn(
        'rounded-xl bg-void-2/80 border border-white/[0.08] overflow-hidden',
        className,
      )}
      role="img"
      aria-label="Tactical diagram showing battlefield positions and movement"
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="transparent" />

        {/* Grid dots */}
        <GridDots />

        {/* Arrow marker definitions */}
        <ArrowDefs />

        {/* Arrows (render behind nodes) */}
        {diagram.arrows.map((arrow, i) => (
          <DiagramArrowLine key={`a-${i}`} arrow={arrow} nodeMap={nodeMap} />
        ))}

        {/* Nodes */}
        {diagram.nodes.map((node) => (
          <DiagramNodeCircle key={node.id} node={node} />
        ))}

        {/* Text labels */}
        {diagram.labels?.map((label, i) => (
          <DiagramLabelText key={`l-${i}`} label={label} />
        ))}
      </svg>
    </div>
  )
}
