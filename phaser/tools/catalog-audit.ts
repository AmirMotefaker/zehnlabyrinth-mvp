import { CHAPTERS_PER_TRACK, generateCatalogue, STAGES_PER_CHAPTER, STAGES_PER_TRACK, TOTAL_STAGES, validateStage } from '../src/core/stage-engine'

const catalogue = generateCatalogue()
const ids = new Set<string>()
const fingerprints = new Set<string>()
const invalid: string[] = []
let unsolved = 0
let minSolution = Number.POSITIVE_INFINITY
let maxSolution = 0
const byTrack: Record<string, number> = {}
const byChapter: Record<string, number> = {}
const pulses: Record<string, number> = {}
const boardSizes: Record<string, Set<number>> = {}

for (const stage of catalogue) {
  const validation = validateStage(stage)
  if (!validation.valid) invalid.push(`${stage.id}:${validation.errors.join(',')}`)
  if (!validation.solvable) unsolved += 1
  ids.add(stage.id)
  fingerprints.add(stage.fingerprint)
  minSolution = Math.min(minSolution, validation.solutionLength)
  maxSolution = Math.max(maxSolution, validation.solutionLength)
  byTrack[stage.track.id] = (byTrack[stage.track.id] ?? 0) + 1
  byChapter[`${stage.track.id}:c${stage.chapter}`] = (byChapter[`${stage.track.id}:c${stage.chapter}`] ?? 0) + 1
  pulses[String(stage.requiredPulses)] = (pulses[String(stage.requiredPulses)] ?? 0) + 1
  boardSizes[stage.track.id] ??= new Set<number>()
  boardSizes[stage.track.id].add(stage.track.boardSize)
}

const boardSizeSummary = Object.fromEntries(Object.entries(boardSizes).map(([track, sizes]) => [track, [...sizes].sort((a, b) => a - b)]))
const duplicateFingerprints = TOTAL_STAGES - fingerprints.size
const fingerprintDiversity = fingerprints.size / TOTAL_STAGES
const summary = {
  total: catalogue.length,
  uniqueIds: ids.size,
  uniqueCanonicalLayouts: fingerprints.size,
  duplicateCanonicalLayouts: duplicateFingerprints,
  canonicalLayoutDiversity: Number((fingerprintDiversity * 100).toFixed(4)),
  unsolved,
  invalid: invalid.length,
  solutionLength: { min: minSolution, max: maxSolution },
  pulses,
  tracks: byTrack,
  chapterBuckets: Object.keys(byChapter).length,
  boardSizes: boardSizeSummary
}

console.log(JSON.stringify(summary, null, 2))

if (catalogue.length !== TOTAL_STAGES) throw new Error(`Expected ${TOTAL_STAGES} stages, got ${catalogue.length}`)
if (ids.size !== TOTAL_STAGES) throw new Error(`Duplicate stage IDs detected: ${TOTAL_STAGES - ids.size}`)
if (unsolved !== 0) throw new Error(`Unsolved stages: ${unsolved}`)
if (invalid.length !== 0) {
  console.error(invalid.slice(0, 20).join('\n'))
  throw new Error(`Invalid stages: ${invalid.length}`)
}
if (Object.keys(byTrack).length !== 9 || Object.values(byTrack).some(count => count !== STAGES_PER_TRACK)) throw new Error('Track distribution contract failed')
if (Object.keys(byChapter).length !== 9 * CHAPTERS_PER_TRACK || Object.values(byChapter).some(count => count !== STAGES_PER_CHAPTER)) throw new Error('Chapter distribution contract failed')

const expectedBoardSizes: Record<string, number[]> = {
  '5-8-easy': [4, 5],
  '5-8-medium': [5, 6],
  '5-8-hard': [6, 7],
  '9-17-easy': [5, 6],
  '9-17-medium': [6, 7],
  '9-17-hard': [7, 8],
  '18+-easy': [6, 7],
  '18+-medium': [7, 8],
  '18+-hard': [8]
}
for (const [track, expected] of Object.entries(expectedBoardSizes)) {
  const actual = boardSizeSummary[track] ?? []
  if (actual.join(',') !== expected.join(',')) throw new Error(`Board-size progression failed for ${track}: expected ${expected.join('/')}, got ${actual.join('/')}`)
}
if (Object.values(boardSizeSummary).flat().some(size => size > 8)) throw new Error('Mobile-safe 8x8 board ceiling violated')

// Stage identity must be strictly unique. Canonical geometric fingerprints are symmetry-normalized,
// so a tiny collision rate is tracked as a quality signal instead of being confused with duplicate IDs.
// Keep diversity >= 99.8%; any regression beyond this fails CI and requires generator tuning.
if (fingerprintDiversity < 0.998) throw new Error(`Canonical layout diversity too low: ${(fingerprintDiversity * 100).toFixed(4)}%`)

console.log('CATALOGUE_GATE=PASS 90000 total / 90000 unique IDs / 0 unsolved / 0 invalid')
console.log(`CANONICAL_LAYOUT_DIVERSITY_GATE=PASS ${(fingerprintDiversity * 100).toFixed(4)}% unique symmetry-normalized layouts`)
console.log('PROGRESSIVE_DIFFICULTY_GATE=PASS age+difficulty-aware board sizes / mobile ceiling 8x8')
