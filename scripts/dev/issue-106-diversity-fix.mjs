import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const expectedBranch = 'feat/106-route-v2-progression'
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

console.log('\n=== ISSUE #106 — CANONICAL DIVERSITY FIX ===')
console.log('main / production untouched')

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (branch !== expectedBranch) throw new Error(`Wrong branch: ${branch}`)
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Working tree must be clean.')

let engine = read(enginePath)

const anchor = `function encodePoint(point: Point, size: number, symmetry: number): string {`
const helper = `function applyDiversitySignature(
  grid: StageTile[][],
  pathKeys: Set<string>,
  track: TrackDefinition,
  chapter: number,
  stageNumber: number
) {
  if (stageNumber <= 3) return

  const size = track.boardSize
  const diff = DIFFICULTIES.indexOf(track.difficulty)
  const age = AGE_BANDS.indexOf(track.ageBand)
  const signatureRandom = mulberry32(hashString(\`neyro-v4-signature|\${track.id}|\${chapter}|\${stageNumber}|\${size}\`))
  const candidates: Point[] = []

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!pathKeys.has(\`\${row}:\${col}\`)) candidates.push({ row, col })
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(signatureRandom() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  const sizeBoost = Math.floor(Math.max(0, size - 4) / 10)
  const signatureCells = Math.min(candidates.length, Math.max(3, Math.min(9, 3 + diff + Math.floor(age / 2) + sizeBoost)))

  for (let i = 0; i < signatureCells; i += 1) {
    const point = candidates[i]
    const kind = signatureRandom() < 0.46 ? 'straight' : 'elbow'
    const targetRotation = Math.floor(signatureRandom() * 4) as 0 | 1 | 2 | 3
    grid[point.row][point.col] = { kind, targetRotation, mechanic: 'decoy' }
  }
}

${anchor}`

if (!engine.includes('function applyDiversitySignature(')) {
  engine = replaceOnce(engine, anchor, helper, 'diversity signature helper')
}

const clutterAnchor = `  const mechanics = stageNumber <= 3 ? ['rail', 'elbow'] : mechanicsFor(track, chapter)`
const clutterReplacement = `  applyDiversitySignature(grid, pathKeys, stageTrack, chapter, stageNumber)\n\n${clutterAnchor}`

if (!engine.includes('applyDiversitySignature(grid, pathKeys, stageTrack, chapter, stageNumber)')) {
  engine = replaceOnce(engine, clutterAnchor, clutterReplacement, 'diversity signature call')
}

write(enginePath, engine)

console.log('\n=== PATCHED FILE ===')
run('git', ['diff', '--', 'phaser/src/core/stage-engine.ts'])

console.log('\n=== COMMIT + PUSH ===')
run('git', ['add', 'phaser/src/core/stage-engine.ts'])
run('git', ['commit', '-m', 'fix(gameplay): increase canonical stage diversity'])
run('git', ['push', 'origin', expectedBranch])

console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
