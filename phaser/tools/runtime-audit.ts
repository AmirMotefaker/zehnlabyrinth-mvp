import { generateStage, getTracks, STAGES_PER_TRACK } from '../src/core/stage-engine'
import { runtimeSolvedByCanonicalPath } from '../src/core/runtime-engine'

let checked = 0
let failed = 0
const failures: string[] = []
const checkpoints = [1, 2, 3, 500, 1000, 2500, 5000, 7500, 9000, STAGES_PER_TRACK]

for (const track of getTracks()) {
  for (const stageNumber of checkpoints) {
    const stage = generateStage(track, stageNumber)
    checked += 1
    if (!runtimeSolvedByCanonicalPath(stage)) {
      failed += 1
      failures.push(stage.id)
    }
  }
}

console.log(`NEYRO stateful runtime audit: ${checked} representative stages / ${failed} failed`)
if (failures.length) console.error(failures.join('\n'))
if (failed) process.exit(1)
