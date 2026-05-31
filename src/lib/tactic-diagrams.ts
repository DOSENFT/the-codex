// === TACTIC DIAGRAMS — Simplified Battlefield Visuals ===
// Pure data: types, presets, and factory for ToyboxTactic.diagram field

// ─── Core Types ───

export interface DiagramNode {
  id: string
  x: number          // 0-100 grid
  y: number          // 0-100 grid
  role: 'player' | 'ally' | 'enemy' | 'objective'
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export interface DiagramArrow {
  from: string       // node id
  to: string         // node id
  style: 'move' | 'attack' | 'spell' | 'aoe'
  label?: string
}

export interface DiagramLabel {
  x: number
  y: number
  text: string
  color?: string
}

export interface TacticDiagramData {
  nodes: DiagramNode[]
  arrows: DiagramArrow[]
  labels?: DiagramLabel[]
}

// ─── Preset Templates ───

export const DIAGRAM_PRESETS: Record<string, TacticDiagramData> = {
  flank: {
    nodes: [
      { id: 'p', x: 30, y: 50, role: 'player', label: 'You' },
      { id: 'a1', x: 70, y: 30, role: 'ally', label: 'Ally' },
      { id: 'e1', x: 50, y: 50, role: 'enemy', label: 'E1' },
    ],
    arrows: [
      { from: 'p', to: 'e1', style: 'attack', label: 'Melee' },
      { from: 'a1', to: 'e1', style: 'attack', label: 'Flank' },
    ],
    labels: [{ x: 50, y: 85, text: 'Advantage from flanking', color: 'gold' }],
  },
  retreat: {
    nodes: [
      { id: 'p', x: 40, y: 50, role: 'player', label: 'You' },
      { id: 'safe', x: 80, y: 50, role: 'objective', label: 'Cover' },
      { id: 'e1', x: 20, y: 40, role: 'enemy', label: 'E1' },
      { id: 'e2', x: 20, y: 60, role: 'enemy', label: 'E2' },
    ],
    arrows: [
      { from: 'p', to: 'safe', style: 'move', label: 'Disengage' },
    ],
    labels: [{ x: 50, y: 85, text: 'Disengage + full movement', color: 'heal' }],
  },
  aoe_setup: {
    nodes: [
      { id: 'p', x: 20, y: 50, role: 'player', label: 'You' },
      { id: 'e1', x: 65, y: 35, role: 'enemy', label: 'E1' },
      { id: 'e2', x: 70, y: 55, role: 'enemy', label: 'E2' },
      { id: 'e3', x: 60, y: 60, role: 'enemy', label: 'E3' },
    ],
    arrows: [
      { from: 'p', to: 'e2', style: 'spell', label: 'AoE Center' },
    ],
    labels: [{ x: 50, y: 85, text: 'Max targets in AoE radius', color: 'arcane' }],
  },
  chokepoint: {
    nodes: [
      { id: 'p', x: 50, y: 70, role: 'player', label: 'You' },
      { id: 'a1', x: 40, y: 50, role: 'ally', label: 'Tank' },
      { id: 'a2', x: 60, y: 50, role: 'ally', label: 'Tank' },
      { id: 'e1', x: 40, y: 30, role: 'enemy', label: 'E1' },
      { id: 'e2', x: 50, y: 20, role: 'enemy', label: 'E2' },
      { id: 'e3', x: 60, y: 30, role: 'enemy', label: 'E3' },
    ],
    arrows: [
      { from: 'p', to: 'e2', style: 'spell', label: 'Ranged' },
    ],
    labels: [{ x: 50, y: 85, text: 'Allies hold the line', color: 'info' }],
  },
  protect_caster: {
    nodes: [
      { id: 'p', x: 50, y: 75, role: 'player', label: 'Caster' },
      { id: 'a1', x: 35, y: 50, role: 'ally', label: 'Guard' },
      { id: 'a2', x: 65, y: 50, role: 'ally', label: 'Guard' },
      { id: 'e1', x: 30, y: 25, role: 'enemy', label: 'E1' },
      { id: 'e2', x: 70, y: 25, role: 'enemy', label: 'E2' },
    ],
    arrows: [
      { from: 'a1', to: 'e1', style: 'attack' },
      { from: 'a2', to: 'e2', style: 'attack' },
      { from: 'p', to: 'e1', style: 'spell', label: 'Spell' },
    ],
    labels: [{ x: 50, y: 92, text: 'Maintain concentration safely', color: 'arcane' }],
  },
}

// ─── Factory ───

export function createDiagramFromPreset(
  presetId: string,
  customizations?: Partial<TacticDiagramData>,
): TacticDiagramData {
  const base = DIAGRAM_PRESETS[presetId]
  if (!base) {
    return {
      nodes: customizations?.nodes ?? [],
      arrows: customizations?.arrows ?? [],
      labels: customizations?.labels,
    }
  }
  return {
    nodes: customizations?.nodes ?? base.nodes,
    arrows: customizations?.arrows ?? base.arrows,
    labels: customizations?.labels ?? base.labels,
  }
}
