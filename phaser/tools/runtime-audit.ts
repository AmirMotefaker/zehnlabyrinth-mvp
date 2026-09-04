import { generateStage, getTracks } from '../src/core/stage-engine'
import { runtimeSolvedByCanonicalPath } from '../src/core/runtime-engine'

let checked = 0
let failed = 0
const failures: string[] = []

for (const track of getTracks()) {
  for (const stageNumber of [1, 126, 251, 376, 501, 626, 751, 876, 1000]) {
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
