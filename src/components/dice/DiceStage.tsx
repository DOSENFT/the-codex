import { Component, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * DiceStage — a small GPU stage where dice exist as physical objects.
 * The tumble is theater; the roll math stays in lib/dice (crypto RNG).
 * Lazy-loaded so three.js never touches the main bundle.
 */

interface DiceStageProps {
  dieType: number
  /** How many dice to show (capped at 4 for composition) */
  count: number
  /** Increments per roll — retriggers the tumble */
  rollId: number
  isRolling: boolean
  /** Rendered if WebGL is unavailable */
  fallback?: ReactNode
}

/* ─── Geometry ─── */

/** d10/d100 — a true pentagonal trapezohedron (two poles, ten kite faces) */
function trapezohedronGeometry(): THREE.BufferGeometry {
  const R = 0.78
  const H = 0.16
  const C = 1.05
  const top = new THREE.Vector3(0, C, 0)
  const bottom = new THREE.Vector3(0, -C, 0)
  const upper: THREE.Vector3[] = []
  const lower: THREE.Vector3[] = []
  for (let k = 0; k < 5; k++) {
    const au = (k * 2 * Math.PI) / 5
    const al = au + Math.PI / 5
    upper.push(new THREE.Vector3(R * Math.cos(au), H, R * Math.sin(au)))
    lower.push(new THREE.Vector3(R * Math.cos(al), -H, R * Math.sin(al)))
  }
  const tris: THREE.Vector3[][] = []
  for (let k = 0; k < 5; k++) {
    const u0 = upper[k]
    const u1 = upper[(k + 1) % 5]
    const l0 = lower[k]
    const l1 = lower[(k + 1) % 5]
    // upper kite: top, u0, l0, u1
    tris.push([top, u0, l0], [top, l0, u1])
    // lower kite: bottom, l0, u1, l1
    tris.push([bottom, l0, l1], [l0, u1, l1])
  }
  const positions: number[] = []
  for (const tri of tris) {
    // Enforce outward winding so flat-shaded normals all face out
    const [a, b, c] = tri
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a))
    const centroid = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3)
    const ordered = normal.dot(centroid) < 0 ? [a, c, b] : [a, b, c]
    for (const v of ordered) positions.push(v.x, v.y, v.z)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

function dieGeometry(dieType: number): THREE.BufferGeometry {
  switch (dieType) {
    case 4: return new THREE.TetrahedronGeometry(1.05)
    case 6: return new THREE.BoxGeometry(1.3, 1.3, 1.3)
    case 8: return new THREE.OctahedronGeometry(1)
    case 10:
    case 100: return trapezohedronGeometry()
    case 12: return new THREE.DodecahedronGeometry(0.95)
    default: return new THREE.IcosahedronGeometry(1)
  }
}

/** Die tint follows the app's die-type palette */
function dieColor(dieType: number): string {
  switch (dieType) {
    case 20: return '#d4a74a'
    case 12: return '#8b5cf6'
    case 10: return '#e8924a'
    case 8: return '#39d98a'
    case 6: return '#e8dcc3'
    case 4: return '#e06666'
    case 100: return '#8b5cf6'
    default: return '#c5a55a'
  }
}

/* ─── The die ─── */

const TUMBLE_SECONDS = 1.1

function Die({ dieType, index, count, rollId, isRolling }: {
  dieType: number
  index: number
  count: number
  rollId: number
  isRolling: boolean
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const spin = useRef({ id: -1, start: 0, active: false, w: new THREE.Vector3() })
  const geometry = useMemo(() => dieGeometry(dieType), [dieType])
  const color = useMemo(() => dieColor(dieType), [dieType])
  const x = count === 1 ? 0 : (index - (count - 1) / 2) * 1.75

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const s = spin.current

    if (s.id !== rollId) {
      s.id = rollId
      if (isRolling) {
        s.active = true
        s.start = state.clock.elapsedTime
        s.w.set(
          (6 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1),
          6 + Math.random() * 7,
          (4 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1),
        )
        // small per-die desync so a handful of dice don't move in lockstep
        s.start -= index * 0.06
      } else {
        s.active = false
      }
    }

    const t = state.clock.elapsedTime - s.start
    if (s.active && t < TUMBLE_SECONDS) {
      const decay = Math.exp(-2.4 * t)
      m.rotation.x += s.w.x * decay * dt
      m.rotation.y += s.w.y * decay * dt
      m.rotation.z += s.w.z * decay * dt
      // one hop off the felt, dying out
      m.position.y = Math.max(0, Math.sin(Math.min(t * 6.5, Math.PI))) * 0.4 * Math.exp(-1.9 * t)
    } else {
      m.position.y += (0 - m.position.y) * Math.min(1, dt * 8)
      // at rest the die still lives — a slow presentational turn
      m.rotation.y += dt * 0.22
    }
  })

  return (
    <mesh ref={mesh} geometry={geometry} position={[x, 0, 0]}>
      <meshStandardMaterial
        color={color}
        metalness={0.55}
        roughness={0.32}
        flatShading
      />
    </mesh>
  )
}

/* ─── Stage ─── */

function Stage({ dieType, count, rollId, isRolling }: Omit<DiceStageProps, 'fallback'>) {
  const n = Math.max(1, Math.min(count, 4))
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.9, 4.6], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={2.1} color="#fff2dc" />
      <pointLight position={[-3, 2, -2]} intensity={14} color="#c5a55a" />
      {Array.from({ length: n }, (_, i) => (
        <Die key={i} dieType={dieType} index={i} count={n} rollId={rollId} isRolling={isRolling} />
      ))}
    </Canvas>
  )
}

/* ─── WebGL safety net ─── */

class StageBoundary extends Component<{ fallback?: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}

export default function DiceStage({ fallback, ...props }: DiceStageProps) {
  return (
    <StageBoundary fallback={fallback}>
      <div className="h-32 w-full" aria-hidden>
        <Stage {...props} />
      </div>
    </StageBoundary>
  )
}
