import type { Direction, Point, StageDefinition, StageTile } from './stage-engine'

export type Rotation = 0 | 1 | 2 | 3
export type RotationMap = Record<string, Rotation>

export interface RuntimeState {
  rotations: RotationMap
  pulseIndex: number
  chargedRelays: string[]
  relayOrder: string[]
  chargedMirrors: string[]
  reached: string[]
  failedAt?: string
  complete: boolean
}

export interface PulseResult {
  state: RuntimeState
  reached: string[]
  goalReached: boolean
  complete: boolean
  failure?: 'disconnected' | 'phase-closed' | 'relay-order' | 'relay-missing'
}

const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }
const DELTA: Record<Direction, Point> = {
  N: { row: -1, col: 0 }, E: { row: 0, col: 1 }, S: { row: 1, col: 0 }, W: { row: 0, col: -1 }
}

export const runtimeKey = (row: number, col: number) => `${row}:${col}`

function pathIndex(stage: StageDefinition, key: string) {
  return stage.solutionPath.findIndex(p => runtimeKey(p.row, p.col) === key)
}

function orderedRelayKeys(stage: StageDefinition) {
  if (!stage.mechanics.includes('ordered-relay')) return []
  return stage.solutionPath
    .map(p => runtimeKey(p.row, p.col))
    .filter(key => {
      const [r, c] = key.split(':').map(Number)
      return stage.grid[r][c].kind === 'relay'
    })
}

function requiredRelayKeys(stage: StageDefinition) {
  return stage.solutionPath
    .map(p => runtimeKey(p.row, p.col))
    .filter(key => {
      const [r, c] = key.split(':').map(Number)
      return stage.grid[r][c].kind === 'relay'
    })
}

function isChargedMirror(tile: StageTile) {
  return tile.kind === 'elbow' && tile.mechanic === 'charged-mirror'
}

export function createRuntimeState(stage: StageDefinition, rotations: RotationMap = {}): RuntimeState {
  return { rotations: { ...rotations }, pulseIndex: 0, chargedRelays: [], relayOrder: [], chargedMirrors: [], reached: [], complete: false }
}

function rotationAt(state: RuntimeState, row: number, col: number, tile: StageTile): Rotation {
  return state.rotations[runtimeKey(row, col)] ?? tile.targetRotation
}

function ports(stage: StageDefinition, state: RuntimeState, row: number, col: number): Direction[] {
  const tile = stage.grid[row][col]
  if (tile.kind === 'empty' || tile.kind === 'blocker') return []
  if (tile.kind === 'start') return [stage.startDirection]
  if (tile.kind === 'goal') return [stage.goalDirection]
  if (tile.kind === 'phase') {
    const opensOn = Math.max(2, stage.requiredPulses)
    return state.pulseIndex + 1 >= opensOn ? ['N', 'E', 'S', 'W'] : []
  }
  if (tile.kind === 'relay') return ['N', 'E', 'S', 'W']
  const rotation = rotationAt(state, row, col, tile)
  if (tile.kind === 'straight') return rotation % 2 === 0 ? ['E', 'W'] : ['N', 'S']
  if (tile.kind === 'elbow') return ([['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']][rotation] ?? []) as Direction[]
  return []
}

function chargedMirrorRotation(state: RuntimeState, row: number, col: number, tile: StageTile): Rotation {
  const key = runtimeKey(row, col)
  const base = rotationAt(state, row, col, tile)
  if (!isChargedMirror(tile)) return base
  return state.chargedMirrors.includes(key) ? ((base + 1) % 4) as Rotation : base
}

function effectivePorts(stage: StageDefinition, state: RuntimeState, row: number, col: number): Direction[] {
  const tile = stage.grid[row][col]
  if (isChargedMirror(tile)) {
    const rotation = chargedMirrorRotation(state, row, col, tile)
    return ([['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']][rotation] ?? []) as Direction[]
  }
  return ports(stage, state, row, col)
}

export function applyPulse(stage: StageDefinition, previous: RuntimeState): PulseResult {
  const state: RuntimeState = {
    ...previous,
    pulseIndex: previous.pulseIndex + 1,
    chargedRelays: [...previous.chargedRelays],
    relayOrder: [...previous.relayOrder],
    chargedMirrors: [...previous.chargedMirrors],
    reached: [],
    failedAt: undefined,
    complete: false
  }
  const size = stage.track.boardSize
  const start = { row: 0, col: 0 }
  const goalKey = runtimeKey(size - 1, size - 1)
  const queue: Point[] = [start]
  const seen = new Set<string>([runtimeKey(0, 0)])
  let phaseBlocked = false

  while (queue.length) {
    const current = queue.shift()!
    const currentKey = runtimeKey(current.row, current.col)
    const tile = stage.grid[current.row][current.col]
    if (tile.kind === 'relay' && !state.chargedRelays.includes(currentKey)) {
      state.chargedRelays.push(currentKey)
      state.relayOrder.push(currentKey)
    }
    if (isChargedMirror(tile) && !state.chargedMirrors.includes(currentKey)) {
      state.chargedMirrors.push(currentKey)
    }
    for (const direction of effectivePorts(stage, previous, current.row, current.col)) {
      const d = DELTA[direction]
      const next = { row: current.row + d.row, col: current.col + d.col }
      if (next.row < 0 || next.col < 0 || next.row >= size || next.col >= size) continue
      const nextTile = stage.grid[next.row][next.col]
      if (nextTile.kind === 'phase' && ports(stage, previous, next.row, next.col).length === 0) { phaseBlocked = true; continue }
      if (!effectivePorts(stage, previous, next.row, next.col).includes(OPPOSITE[direction])) continue
      const key = runtimeKey(next.row, next.col)
      if (!seen.has(key)) { seen.add(key); queue.push(next) }
    }
  }

  state.reached = [...seen].sort((a, b) => pathIndex(stage, a) - pathIndex(stage, b))
  const goalReached = seen.has(goalKey)
  const ordered = orderedRelayKeys(stage)
  const orderOk = ordered.length === 0 || ordered.every((key, index) => state.relayOrder[index] === key)
  const relays = requiredRelayKeys(stage)
  const relaysOk = relays.every(key => state.chargedRelays.includes(key))
  const pulseRequirement = state.pulseIndex >= stage.requiredPulses
  state.complete = goalReached && orderOk && relaysOk && pulseRequirement

  let failure: PulseResult['failure']
  if (!goalReached) failure = phaseBlocked ? 'phase-closed' : 'disconnected'
  else if (!orderOk) failure = 'relay-order'
  else if (!relaysOk) failure = 'relay-missing'

  return { state, reached: state.reached, goalReached, complete: state.complete, failure }
}

export function runtimeSolvedByCanonicalPath(stage: StageDefinition): boolean {
  const rotations: RotationMap = {}
  stage.solutionPath.forEach(point => {
    const tile = stage.grid[point.row][point.col]
    if (tile.kind === 'straight' || tile.kind === 'elbow') rotations[runtimeKey(point.row, point.col)] = tile.targetRotation
  })
  let state = createRuntimeState(stage, rotations)
  for (let pulse = 0; pulse < stage.requiredPulses; pulse += 1) state = applyPulse(stage, state).state
  return state.complete
}
