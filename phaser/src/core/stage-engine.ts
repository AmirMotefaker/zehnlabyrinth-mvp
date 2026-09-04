export type AgeBand = '5-8' | '9-17' | '18+'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Direction = 'N' | 'E' | 'S' | 'W'
export type TileKind = 'empty' | 'start' | 'goal' | 'straight' | 'elbow' | 'blocker' | 'relay' | 'phase'

export interface Point { row: number; col: number }

export interface StageTile {
  kind: TileKind
  targetRotation: 0 | 1 | 2 | 3
  mechanic?: string
}

export interface TrackDefinition {
  id: string
  ageBand: AgeBand
  difficulty: Difficulty
  boardSize: number
}

export interface StageDefinition {
  id: string
  track: TrackDefinition
  stageNumber: number
  chapter: number
  stageInChapter: number
  seed: number
  requiredPulses: 1 | 2 | 3
  parMoves: number
  mechanics: string[]
  startDirection: Direction
  goalDirection: Direction
  solutionPath: Point[]
  grid: StageTile[][]
  fingerprint: string
}

export interface StageValidation {
  valid: boolean
  solvable: boolean
  errors: string[]
  solutionLength: number
}

export const AGE_BANDS: AgeBand[] = ['5-8', '9-17', '18+']
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
export const STAGES_PER_TRACK = 1000
export const CHAPTERS_PER_TRACK = 8
export const STAGES_PER_CHAPTER = 125
export const TOTAL_TRACKS = AGE_BANDS.length * DIFFICULTIES.length
export const TOTAL_STAGES = TOTAL_TRACKS * STAGES_PER_TRACK

const DIR_DELTA: Record<Direction, Point> = {
  N: { row: -1, col: 0 }, E: { row: 0, col: 1 }, S: { row: 1, col: 0 }, W: { row: 0, col: -1 }
}
const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }

function hashString(value: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function getTracks(): TrackDefinition[] {
  const tracks: TrackDefinition[] = []
  for (const ageBand of AGE_BANDS) {
    for (const difficulty of DIFFICULTIES) {
      const ageIndex = AGE_BANDS.indexOf(ageBand)
      const difficultyIndex = DIFFICULTIES.indexOf(difficulty)
      tracks.push({
        id: `${ageBand}-${difficulty}`,
        ageBand,
        difficulty,
        boardSize: Math.min(7, 5 + difficultyIndex + (ageIndex === 2 && difficulty === 'hard' ? 0 : 0))
      })
    }
  }
  return tracks
}

function directionBetween(from: Point, to: Point): Direction {
  const dr = to.row - from.row
  const dc = to.col - from.col
  if (dr === -1 && dc === 0) return 'N'
  if (dr === 1 && dc === 0) return 'S'
  if (dr === 0 && dc === 1) return 'E'
  if (dr === 0 && dc === -1) return 'W'
  throw new Error(`Non-adjacent points: ${from.row},${from.col} -> ${to.row},${to.col}`)
}

function rotationForPorts(a: Direction, b: Direction): { kind: 'straight' | 'elbow'; rotation: 0 | 1 | 2 | 3 } {
  const set = new Set([a, b])
  if (set.has('E') && set.has('W')) return { kind: 'straight', rotation: 0 }
  if (set.has('N') && set.has('S')) return { kind: 'straight', rotation: 1 }
  if (set.has('N') && set.has('E')) return { kind: 'elbow', rotation: 0 }
  if (set.has('E') && set.has('S')) return { kind: 'elbow', rotation: 1 }
  if (set.has('S') && set.has('W')) return { kind: 'elbow', rotation: 2 }
  return { kind: 'elbow', rotation: 3 }
}

function portsForTile(tile: StageTile): Direction[] {
  if (tile.kind === 'blocker' || tile.kind === 'empty') return []
  if (tile.kind === 'relay' || tile.kind === 'phase') return ['N', 'E', 'S', 'W']
  if (tile.kind === 'straight') {
    return tile.targetRotation % 2 === 0 ? ['E', 'W'] : ['N', 'S']
  }
  if (tile.kind === 'elbow') {
    return ([['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']][tile.targetRotation] ?? []) as Direction[]
  }
  return []
}

function mechanicsFor(track: TrackDefinition, chapter: number): string[] {
  const age = AGE_BANDS.indexOf(track.ageBand)
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  const result = ['rail', 'elbow']
  if (chapter >= 2 || diff >= 1) result.push('blocker')
  if (chapter >= 3 || age >= 1) result.push('relay')
  if (chapter >= 4 && (diff >= 1 || age >= 1)) result.push('ordered-relay')
  if (chapter >= 5 && (diff === 2 || age === 2)) result.push('multi-pulse')
  if (chapter >= 6 && age >= 1) result.push('charged-mirror')
  if (chapter >= 7 && diff >= 1) result.push('phase-gate')
  if (chapter >= 8 && age === 2 && diff === 2) result.push('optimisation')
  return result
}

function requiredPulsesFor(track: TrackDefinition, chapter: number): 1 | 2 | 3 {
  const age = AGE_BANDS.indexOf(track.ageBand)
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  if (chapter >= 8 && age === 2 && diff === 2) return 3
  if (chapter >= 5 && (age >= 1 || diff === 2)) return 2
  return 1
}

function monotonicPath(size: number, random: () => number): Point[] {
  const path: Point[] = [{ row: 0, col: 0 }]
  let row = 0
  let col = 0
  while (row < size - 1 || col < size - 1) {
    const canRight = col < size - 1
    const canDown = row < size - 1
    if (canRight && canDown) {
      if (random() < 0.5) col += 1
      else row += 1
    } else if (canRight) col += 1
    else row += 1
    path.push({ row, col })
  }
  return path
}

function encodePoint(point: Point, size: number, symmetry: number): string {
  const r = point.row
  const c = point.col
  const n = size - 1
  const variants: Point[] = [
    { row: r, col: c }, { row: c, col: n - r }, { row: n - r, col: n - c }, { row: n - c, col: r },
    { row: r, col: n - c }, { row: n - r, col: c }, { row: c, col: r }, { row: n - c, col: n - r }
  ]
  const p = variants[symmetry]
  return `${p.row},${p.col}`
}

function fingerprintFor(stage: Omit<StageDefinition, 'fingerprint'>): string {
  const variants: string[] = []
  for (let symmetry = 0; symmetry < 8; symmetry += 1) {
    const pathForward = stage.solutionPath.map(p => encodePoint(p, stage.track.boardSize, symmetry)).join('>')
    const pathReverse = [...stage.solutionPath].reverse().map(p => encodePoint(p, stage.track.boardSize, symmetry)).join('>')
    const cells: string[] = []
    stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      if (tile.kind !== 'empty') cells.push(`${encodePoint({ row: r, col: c }, stage.track.boardSize, symmetry)}:${tile.kind}:${tile.targetRotation}:${tile.mechanic ?? ''}`)
    }))
    cells.sort()
    const path = pathForward < pathReverse ? pathForward : pathReverse
    variants.push(`${stage.track.boardSize}|p${stage.requiredPulses}|${stage.mechanics.join(',')}|${path}|${cells.join(';')}`)
  }
  return variants.sort()[0]
}

export function generateStage(track: TrackDefinition, stageNumber: number): StageDefinition {
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > STAGES_PER_TRACK) {
    throw new Error(`stageNumber must be 1..${STAGES_PER_TRACK}`)
  }
  const chapter = Math.floor((stageNumber - 1) / STAGES_PER_CHAPTER) + 1
  const stageInChapter = ((stageNumber - 1) % STAGES_PER_CHAPTER) + 1
  const seed = hashString(`neyro-v1|${track.id}|${stageNumber}`)
  const random = mulberry32(seed)
  const path = monotonicPath(track.boardSize, random)
  const pathKeys = new Set(path.map(p => `${p.row}:${p.col}`))
  const grid: StageTile[][] = Array.from({ length: track.boardSize }, () =>
    Array.from({ length: track.boardSize }, () => ({ kind: 'empty' as const, targetRotation: 0 as const })))

  const startDirection = directionBetween(path[0], path[1])
  const goalDirection = directionBetween(path[path.length - 1], path[path.length - 2])
  grid[0][0] = { kind: 'start', targetRotation: 0 }
  grid[track.boardSize - 1][track.boardSize - 1] = { kind: 'goal', targetRotation: 0 }

  for (let i = 1; i < path.length - 1; i += 1) {
    const current = path[i]
    const toPrevious = directionBetween(current, path[i - 1])
    const toNext = directionBetween(current, path[i + 1])
    const shape = rotationForPorts(toPrevious, toNext)
    const relayEligible = chapter >= 3 && i > 1 && i < path.length - 2 && (i + stageNumber) % Math.max(3, 7 - chapter) === 0
    const phaseEligible = chapter >= 7 && relayEligible && track.difficulty !== 'easy'
    grid[current.row][current.col] = {
      kind: phaseEligible ? 'phase' : relayEligible ? 'relay' : shape.kind,
      targetRotation: shape.rotation,
      mechanic: phaseEligible ? 'phase-gate' : relayEligible ? 'relay' : undefined
    }
  }

  for (let r = 0; r < track.boardSize; r += 1) {
    for (let c = 0; c < track.boardSize; c += 1) {
      if (pathKeys.has(`${r}:${c}`)) continue
      const roll = random()
      if (roll < 0.28) {
        grid[r][c] = { kind: 'blocker', targetRotation: 0, mechanic: 'blocker' }
      } else if (roll < 0.68) {
        grid[r][c] = {
          kind: random() < 0.55 ? 'straight' : 'elbow',
          targetRotation: Math.floor(random() * 4) as 0 | 1 | 2 | 3,
          mechanic: 'decoy'
        }
      }
    }
  }

  const mechanics = mechanicsFor(track, chapter)
  const requiredPulses = requiredPulsesFor(track, chapter)
  const base: Omit<StageDefinition, 'fingerprint'> = {
    id: `${track.id}-${String(stageNumber).padStart(4, '0')}`,
    track,
    stageNumber,
    chapter,
    stageInChapter,
    seed,
    requiredPulses,
    parMoves: Math.max(3, Math.round(path.length * (0.55 + chapter * 0.025))),
    mechanics,
    startDirection,
    goalDirection,
    solutionPath: path,
    grid
  }
  return { ...base, fingerprint: fingerprintFor(base) }
}

function connectedNeighbour(stage: StageDefinition, point: Point, direction: Direction): Point | null {
  const delta = DIR_DELTA[direction]
  const next = { row: point.row + delta.row, col: point.col + delta.col }
  if (next.row < 0 || next.col < 0 || next.row >= stage.track.boardSize || next.col >= stage.track.boardSize) return null
  return next
}

function portsAt(stage: StageDefinition, point: Point): Direction[] {
  const tile = stage.grid[point.row][point.col]
  if (tile.kind === 'start') return [stage.startDirection]
  if (tile.kind === 'goal') return [stage.goalDirection]
  return portsForTile(tile)
}

export function solveStage(stage: StageDefinition): boolean {
  const start: Point = { row: 0, col: 0 }
  const goalKey = `${stage.track.boardSize - 1}:${stage.track.boardSize - 1}`
  const queue: Point[] = [start]
  const seen = new Set<string>(['0:0'])
  while (queue.length) {
    const current = queue.shift()!
    const currentKey = `${current.row}:${current.col}`
    if (currentKey === goalKey) return true
    for (const direction of portsAt(stage, current)) {
      const next = connectedNeighbour(stage, current, direction)
      if (!next) continue
      const neighbourPorts = portsAt(stage, next)
      if (!neighbourPorts.includes(OPPOSITE[direction])) continue
      const key = `${next.row}:${next.col}`
      if (!seen.has(key)) { seen.add(key); queue.push(next) }
    }
  }
  return false
}

export function validateStage(stage: StageDefinition): StageValidation {
  const errors: string[] = []
  const size = stage.track.boardSize
  if (stage.grid.length !== size || stage.grid.some(row => row.length !== size)) errors.push('grid-size')
  if (stage.solutionPath.length < size * 2 - 1) errors.push('solution-too-short')
  const seen = new Set<string>()
  stage.solutionPath.forEach((point, index) => {
    if (point.row < 0 || point.col < 0 || point.row >= size || point.col >= size) errors.push(`out-of-bounds:${index}`)
    const key = `${point.row}:${point.col}`
    if (seen.has(key)) errors.push(`repeated-path-cell:${key}`)
    seen.add(key)
    if (index > 0) {
      const prev = stage.solutionPath[index - 1]
      if (Math.abs(prev.row - point.row) + Math.abs(prev.col - point.col) !== 1) errors.push(`non-adjacent:${index}`)
    }
  })
  const first = stage.solutionPath[0]
  const last = stage.solutionPath[stage.solutionPath.length - 1]
  if (first.row !== 0 || first.col !== 0) errors.push('bad-start')
  if (last.row !== size - 1 || last.col !== size - 1) errors.push('bad-goal')

  for (let i = 0; i < stage.solutionPath.length - 1; i += 1) {
    const a = stage.solutionPath[i]
    const b = stage.solutionPath[i + 1]
    const dir = directionBetween(a, b)
    if (!portsAt(stage, a).includes(dir)) errors.push(`missing-port:${i}:out`)
    if (!portsAt(stage, b).includes(OPPOSITE[dir])) errors.push(`missing-port:${i + 1}:in`)
  }

  if (stage.chapter < 1 || stage.chapter > CHAPTERS_PER_TRACK) errors.push('bad-chapter')
  if (stage.stageInChapter < 1 || stage.stageInChapter > STAGES_PER_CHAPTER) errors.push('bad-stage-in-chapter')
  if (stage.requiredPulses < 1 || stage.requiredPulses > 3) errors.push('bad-pulse-count')
  const solvable = solveStage(stage)
  if (!solvable) errors.push('unsolved')
  return { valid: errors.length === 0, solvable, errors, solutionLength: stage.solutionPath.length }
}

export function generateCatalogue(): StageDefinition[] {
  const catalogue: StageDefinition[] = []
  for (const track of getTracks()) {
    for (let stageNumber = 1; stageNumber <= STAGES_PER_TRACK; stageNumber += 1) {
      catalogue.push(generateStage(track, stageNumber))
    }
  }
  return catalogue
}
