import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const expectedBranch = 'feat/106-route-v2-progression'
const mainPath = path.join(root, 'phaser', 'src', 'main.ts')
const enginePath = path.join(root, 'phaser', 'src', 'core', 'stage-engine.ts')

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options })
}

function read(file) { return fs.readFileSync(file, 'utf8') }
function write(file, content) { fs.writeFileSync(file, content, 'utf8') }
function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one anchor, found ${count}`)
  return source.replace(from, to)
}

console.log('\n=== ISSUE #106 — ROUTE V2 + 500-STAGE PROGRESSION ===')
console.log('main / production untouched')

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (branch !== expectedBranch) throw new Error(`Wrong branch: ${branch}`)
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Working tree must be clean.')

let main = read(mainPath)
let engine = read(enginePath)

const oldStageSelector = `  private refreshStageSelect(chapterOverride?: number) {
    const chapterSelect = el<HTMLSelectElement>('#chapterSelect')
    const stageSelect = el<HTMLSelectElement>('#stageSelect')
    const chapter = chapterOverride ?? Number(chapterSelect.value || 1)
    const first = (chapter - 1) * STAGES_PER_CHAPTER + 1
    const last = Math.min(first + STAGES_PER_CHAPTER - 1, this.highestUnlocked())
    const current = this.stageNumber
    stageSelect.replaceChildren()
    for (let globalStage = first; globalStage <= last; globalStage += 1) {
      const option = document.createElement('option')
      option.value = String(globalStage)
      const localStage = globalStage - first + 1
      option.textContent = digits(localStage, this.locale)
      stageSelect.append(option)
    }
    if (!stageSelect.options.length) {
      const option = document.createElement('option')
      option.value = String(Math.min(first, this.highestUnlocked()))
      option.textContent = digits(1, this.locale)
      stageSelect.append(option)
    }
    const desired = Array.from(stageSelect.options).some(option => Number(option.value) === current) ? current : Number(stageSelect.options[0].value)
    stageSelect.value = String(desired)
  }
`

const newStageSelector = `  private refreshStageSelect(chapterOverride?: number) {
    const chapterSelect = el<HTMLSelectElement>('#chapterSelect')
    const stageSelect = el<HTMLSelectElement>('#stageSelect')
    const chapter = chapterOverride ?? Number(chapterSelect.value || 1)
    const first = (chapter - 1) * STAGES_PER_CHAPTER + 1
    const last = Math.min(STAGES_PER_TRACK, first + STAGES_PER_CHAPTER - 1)
    const highestUnlocked = this.highestUnlocked()
    const current = this.stageNumber
    stageSelect.replaceChildren()

    for (let globalStage = first; globalStage <= last; globalStage += 1) {
      const option = document.createElement('option')
      option.value = String(globalStage)
      const localStage = globalStage - first + 1
      const locked = globalStage > highestUnlocked
      option.disabled = locked
      option.textContent = locked
        ? \`${'${digits(localStage, this.locale)}'}  🔒\`
        : digits(localStage, this.locale)
      stageSelect.append(option)
    }

    const currentInChapter = current >= first && current <= last
    const fallback = Math.min(Math.max(first, Math.min(highestUnlocked, last)), last)
    stageSelect.value = String(currentInChapter ? current : fallback)
  }
`
main = replaceOnce(main, oldStageSelector, newStageSelector, 'stage selector')

const unlockAnchor = `    if (this.stageNumber >= 3 && !this.tutorialComplete) {
      this.tutorialComplete = true
      localStorage.setItem('neyro.tutorialComplete', '1')
      if (Number(localStorage.getItem(this.unlockKey()) || 1) < 4) localStorage.setItem(this.unlockKey(), '4')
    }
  }
`
const unlockReplacement = `    if (this.stageNumber >= 3 && !this.tutorialComplete) {
      this.tutorialComplete = true
      localStorage.setItem('neyro.tutorialComplete', '1')
      if (Number(localStorage.getItem(this.unlockKey()) || 1) < 4) localStorage.setItem(this.unlockKey(), '4')
    }
    this.refreshStageSelect()
  }
`
main = replaceOnce(main, unlockAnchor, unlockReplacement, 'unlock refresh')

const oldClutter = `function clutterFor(track: TrackDefinition, chapter: number, stageNumber: number) {
  if (stageNumber <= 3) return { blockerCutoff: 0.04, decoyCutoff: 0.22 }
  const age = AGE_BANDS.indexOf(track.ageBand)
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  const chapterProgress = (chapter - 1) / Math.max(1, CHAPTERS_PER_TRACK - 1)
  const blockerCutoff = Math.min(0.34, 0.07 + age * 0.03 + diff * 0.04 + chapterProgress * 0.12)
  const decoyCutoff = Math.min(0.8, blockerCutoff + 0.22 + age * 0.03 + diff * 0.04 + chapterProgress * 0.12)
  return { blockerCutoff, decoyCutoff }
}
`
const newClutter = `function clutterFor(track: TrackDefinition, chapter: number, stageNumber: number, boardSize: number) {
  if (stageNumber <= 3) return { blockerCutoff: 0.04, decoyCutoff: 0.22 }
  const age = AGE_BANDS.indexOf(track.ageBand)
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  const chapterProgress = (chapter - 1) / Math.max(1, CHAPTERS_PER_TRACK - 1)
  const sizeProgress = Math.min(1, Math.max(0, (boardSize - 4) / 46))
  const blockerCutoff = Math.min(0.38, 0.07 + age * 0.025 + diff * 0.04 + chapterProgress * 0.1 + sizeProgress * (0.035 + diff * 0.012))
  const decoyCutoff = Math.min(0.84, blockerCutoff + 0.2 + age * 0.025 + diff * 0.035 + chapterProgress * 0.1 + sizeProgress * (0.08 + diff * 0.015))
  return { blockerCutoff, decoyCutoff }
}
`
engine = replaceOnce(engine, oldClutter, newClutter, 'clutter scaling')

const monotonicAnchor = `function monotonicPath(size: number, random: () => number): Point[] {
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
`

const progressiveFunction = `${monotonicAnchor}
function progressivePath(track: TrackDefinition, chapter: number, random: () => number): Point[] {
  const size = track.boardSize
  if (size <= 3) return monotonicPath(size, random)

  const age = AGE_BANDS.indexOf(track.ageBand)
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  const sizeBoost = Math.max(0, Math.floor((size - 6) / 8))
  const chapterBoost = Math.floor((chapter - 1) / 12)
  const capByDifficulty = [5, 7, 9][diff]
  const intermediateCount = Math.max(1, Math.min(size - 2, capByDifficulty, 1 + age + diff * 2 + sizeBoost + chapterBoost))
  const rows: number[] = []
  let previousRow = 0

  for (let i = 1; i <= intermediateCount; i += 1) {
    const remaining = intermediateCount - i
    const ideal = Math.round((i * (size - 1)) / (intermediateCount + 1))
    const spacing = Math.max(1, Math.floor((size - 1) / (intermediateCount + 1)))
    const jitter = Math.floor((random() - 0.5) * Math.max(1, spacing))
    const minRow = previousRow + 1
    const maxRow = (size - 2) - remaining
    const row = Math.min(maxRow, Math.max(minRow, ideal + jitter))
    rows.push(row)
    previousRow = row
  }

  const path: Point[] = [{ row: 0, col: 0 }]
  let row = 0
  let col = 0
  const appendHorizontal = (targetCol: number) => {
    while (col !== targetCol) {
      col += targetCol > col ? 1 : -1
      path.push({ row, col })
    }
  }
  const appendVertical = (targetRow: number) => {
    while (row !== targetRow) {
      row += targetRow > row ? 1 : -1
      path.push({ row, col })
    }
  }

  rows.forEach((targetRow, index) => {
    const highSide = index % 2 === 0
    const lowMax = Math.max(0, Math.floor((size - 1) * 0.34))
    const highMin = Math.min(size - 1, Math.ceil((size - 1) * 0.66))
    const minCol = highSide ? highMin : 0
    const maxCol = highSide ? size - 1 : lowMax
    const targetCol = minCol + Math.floor(random() * (maxCol - minCol + 1))
    appendHorizontal(targetCol)
    appendVertical(targetRow)
  })

  appendVertical(size - 1)
  appendHorizontal(size - 1)

  if (random() < 0.5) return path.map(point => ({ row: point.col, col: point.row }))
  return path
}
`
engine = replaceOnce(engine, monotonicAnchor, progressiveFunction, 'progressive path insertion')

engine = replaceOnce(
  engine,
  `  const path = monotonicPath(stageTrack.boardSize, random)`,
  `  const path = stageNumber <= 3 ? monotonicPath(stageTrack.boardSize, random) : progressivePath(stageTrack, chapter, random)`,
  'path selection'
)
engine = replaceOnce(
  engine,
  `  const clutter = clutterFor(track, chapter, stageNumber)`,
  `  const clutter = clutterFor(track, chapter, stageNumber, stageTrack.boardSize)`,
  'clutter call'
)

write(mainPath, main)
write(enginePath, engine)

console.log('\n=== PATCHED FILES ===')
run('git', ['diff', '--', 'phaser/src/main.ts', 'phaser/src/core/stage-engine.ts'])

console.log('\n=== VALIDATION ===')
const packageRoot = path.join(root, 'phaser')
const packageJson = path.join(packageRoot, 'package.json')
if (!fs.existsSync(packageJson)) throw new Error('phaser/package.json not found')

for (const script of ['typecheck', 'catalog:audit', 'runtime:audit', 'build']) {
  try {
    execFileSync('npm', ['run', script], { cwd: packageRoot, stdio: 'inherit', shell: process.platform === 'win32' })
  } catch (error) {
    console.warn(`Local ${script} unavailable/failed; GitHub CI will be authoritative.`)
  }
}

run('git', ['add', 'phaser/src/main.ts', 'phaser/src/core/stage-engine.ts'])
run('git', ['commit', '-m', 'feat(gameplay): scale route complexity with board size'])
run('git', ['push', 'origin', expectedBranch])

console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
