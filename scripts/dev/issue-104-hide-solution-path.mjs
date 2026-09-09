import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const branch = 'fix/104-hide-solution-path'
const mainPath = path.join(root, 'phaser', 'src', 'main.ts')

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...options })
}

function read(cmd, args) {
  return execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim()
}

console.log('\n=== ISSUE #104 — HIDE SOLUTION PATH ===')
console.log('Main / production untouched.\n')

if (read('git', ['branch', '--show-current']) !== branch) throw new Error(`Wrong branch. Expected ${branch}`)
if (read('git', ['status', '--porcelain'])) throw new Error('Working tree must be clean before patching.')
if (!fs.existsSync(mainPath)) throw new Error('phaser/src/main.ts not found.')

let src = fs.readFileSync(mainPath, 'utf8')

const oldSetup = `    const tutorial = !this.tutorialComplete && this.stageNumber <= 3\n    const target = this.tutorialTarget(); const targetKey = target ? keyOf(target.row, target.col) : undefined\n\n`
if (!src.includes(oldSetup)) throw new Error('Tutorial render setup anchor not found.')
src = src.replace(oldSetup, '')

const oldTileState = `      const reached = this.reached.has(key)\n      const tutorialPath = tutorial && this.stage.solutionPath.some(p => p.row === r && p.col === c)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)\n      const chargedMirror = tile.mechanic === 'charged-mirror' && this.runtime?.chargedMirrors.includes(key)\n      const tutorialDim = tutorial && this.stageNumber <= 2 && !tutorialPath\n      const fill = tile.kind === 'blocker' ? 0x171e2d : tile.kind === 'empty' ? 0x071421 : reached ? 0x0b4a42 : chargedRelay || chargedMirror ? 0x243553 : 0x102943\n      const g = this.add.graphics().setAlpha(tutorialDim ? .18 : 1); g.fillStyle(fill, 1)\n      const isTarget = targetKey === key\n      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : 0x1c3d56, 1)\n`
const newTileState = `      const reached = this.reached.has(key)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)\n      const chargedMirror = tile.mechanic === 'charged-mirror' && this.runtime?.chargedMirrors.includes(key)\n      const fill = tile.kind === 'blocker' ? 0x171e2d : tile.kind === 'empty' ? 0x071421 : reached ? 0x0b4a42 : chargedRelay || chargedMirror ? 0x243553 : 0x102943\n      const g = this.add.graphics(); g.fillStyle(fill, 1)\n      g.lineStyle(reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : 0x1c3d56, 1)\n`
if (!src.includes(oldTileState)) throw new Error('Tile-state render anchor not found.')
src = src.replace(oldTileState, newTileState)

const oldBlocker = `        const xg = this.add.graphics().setAlpha(tutorialDim ? .18 : 1); xg.lineStyle(5, 0x77849a, 1);`
const newBlocker = `        const xg = this.add.graphics(); xg.lineStyle(5, 0x77849a, 1);`
if (!src.includes(oldBlocker)) throw new Error('Blocker alpha anchor not found.')
src = src.replace(oldBlocker, newBlocker)

const oldPipe = `      const rotation = this.rotationAt(r, c, tile), pipe = this.add.graphics().setAlpha(tutorialDim ? .18 : 1)\n      pipe.lineStyle(Math.max(5, cell * .1), reached ? 0xffd45c : tile.mechanic === 'decoy' ? 0x527d9a : 0x9bd5ff, 1)\n`
const newPipe = `      const rotation = this.rotationAt(r, c, tile), pipe = this.add.graphics()\n      pipe.lineStyle(Math.max(5, cell * .1), reached ? 0xffd45c : 0x9bd5ff, 1)\n`
if (!src.includes(oldPipe)) throw new Error('Pipe render anchor not found.')
src = src.replace(oldPipe, newPipe)

const oldHit = `      if (this.isRotatable(tile) && !this.pulsing && !tutorialDim) {`
const newHit = `      if (this.isRotatable(tile) && !this.pulsing) {`
if (!src.includes(oldHit)) throw new Error('Hit-zone anchor not found.')
src = src.replace(oldHit, newHit)

if (src.includes('tutorialPath')) throw new Error('tutorialPath leak still present after patch.')
if (src.includes('tile.mechanic === \'decoy\' ? 0x527d9a')) throw new Error('Decoy color leak still present after patch.')

fs.writeFileSync(mainPath, src, 'utf8')

console.log('=== PATCHED ===')
run('git', ['diff', '--', 'phaser/src/main.ts'])

for (const [label, args] of [
  ['typecheck', ['run', 'typecheck']],
  ['runtime:audit', ['run', 'runtime:audit']],
  ['build', ['run', 'build']],
]) {
  try {
    execFileSync('npm', args, { cwd: path.join(root, 'phaser'), stdio: 'inherit' })
  } catch {
    console.log(`Local ${label} unavailable/failed; GitHub CI will be authoritative.`)
  }
}

run('git', ['add', 'phaser/src/main.ts'])
run('git', ['commit', '-m', 'fix(gameplay): stop revealing solution path'])
run('git', ['push', 'origin', branch])

console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
