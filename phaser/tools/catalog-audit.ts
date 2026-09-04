import { generateCatalogue, TOTAL_STAGES, validateStage } from '../src/core/stage-engine'

const catalogue = generateCatalogue()
const fingerprints = new Set<string>()
const invalid: string[] = []
let unsolved = 0
let minSolution = Number.POSITIVE_INFINITY
let maxSolution = 0
const byTrack: Record<string, number> = {}
const byChapter: Record<string, number> = {}
const pulses: Record<string, number> = {}

for (const stage of catalogue) {
  const validation = validateStage(stage)
  if (!validation.valid) invalid.push(`${stage.id}:${validation.errors.join(',')}`)
  if (!validation.solvable) unsolved += 1
  fingerprints.add(stage.fingerprint)
  minSolution = Math.min(minSolution, validation.solutionLength)
  maxSolution = Math.max(maxSolution, validation.solutionLength)
  byTrack[stage.track.id] = (byTrack[stage.track.id] ?? 0) + 1
  byChapter[`${stage.track.id}:c${stage.chapter}`] = (byChapter[`${stage.track.id}:c${stage.chapter}`] ?? 0) + 1
  pulses[String(stage.requiredPulses)] = (pulses[String(stage.requiredPulses)] ?? 0) + 1
}

const summary = {
  total: catalogue.length,
  unique: fingerprints.size,
  unsolved,
  invalid: invalid.length,
  solutionLength: { min: minSolution, max: maxSolution },
  pulses,
  tracks: byTrack,
  chapterBuckets: Object.keys(byChapter).length
}

console.log(JSON.stringify(summary, null, 2))

if (catalogue.length !== TOTAL_STAGES) throw new Error(`Expected ${TOTAL_STAGES} stages, got ${catalogue.length}`)
if (fingerprints.size !== TOTAL_STAGES) throw new Error(`Duplicate fingerprints detected: ${TOTAL_STAGES - fingerprints.size}`)
if (unsolved !== 0) throw new Error(`Unsolved stages: ${unsolved}`)
if (invalid.length !== 0) {
  console.error(invalid.slice(0, 20).join('\n'))
  throw new Error(`Invalid stages: ${invalid.length}`)
}
if (Object.keys(byTrack).length !== 9 || Object.values(byTrack).some(count => count !== 1000)) throw new Error('Track distribution contract failed')
if (Object.keys(byChapter).length !== 72 || Object.values(byChapter).some(count => count !== 125)) throw new Error('Chapter distribution contract failed')

console.log('CATALOGUE_GATE=PASS 9000 total / 9000 unique / 0 unsolved / 0 invalid')
