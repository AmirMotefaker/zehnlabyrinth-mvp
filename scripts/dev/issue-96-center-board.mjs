import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const mainPath = path.join(root, 'phaser/src/main.ts')
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...options })

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (branch !== 'fix/96-center-all-board-sizes') throw new Error(`Wrong branch: ${branch}`)
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Working tree must be clean before Issue #96 patch.')

let source = fs.readFileSync(mainPath, 'utf8')

const oldWheel = "camera.setZoom(Phaser.Math.Clamp(camera.zoom - dy * 0.0012, 0.55, 2.4))"
const newWheel = "camera.setZoom(Phaser.Math.Clamp(camera.zoom - dy * 0.0012, 0.35, 2.4))"
if (source.includes(oldWheel)) source = source.replace(oldWheel, newWheel)

const oldBlock = `    const w = this.scale.width, h = this.scale.height, n = this.stage.track.boardSize
    const cap = w >= 1100 ? 820 : 720
    const viewportSize = Math.min(w * .94, h * .92, cap)
    const minimumStep = n >= 30 ? 28 : n >= 20 ? 31 : n >= 12 ? 35 : 0
    const step = Math.max(viewportSize / n, minimumStep)
    const size = step * n
    const left = size <= w ? (w - size) / 2 : 28
    const top = size <= h ? (h - size) / 2 : 28
    const camera = this.cameras.main
    const largeBoard = size > w || size > h
    camera.setBounds(0, 0, Math.max(w, size + 56), Math.max(h, size + 56))
    if (!largeBoard) {
      camera.setZoom(1)
      camera.centerOn(w / 2, h / 2)
    } else {
      const fitZoom = Phaser.Math.Clamp(Math.min(w / (size + 56), h / (size + 56)) * 1.18, .55, 1)
      if (camera.zoom === 1) camera.setZoom(fitZoom)
      camera.centerOn(left + size / 2, top + size / 2)
    }`

const newBlock = `    const w = this.scale.width, h = this.scale.height, n = this.stage.track.boardSize
    const cap = w >= 1100 ? 820 : 720
    const viewportSize = Math.min(w * .94, h * .92, cap)
    const minimumStep = n >= 30 ? 28 : n >= 20 ? 31 : n >= 12 ? 35 : 0
    const step = Math.max(viewportSize / n, minimumStep)
    const size = step * n
    const camera = this.cameras.main
    const padding = 28
    const largeBoard = size > w || size > h
    const fitZoom = largeBoard
      ? Phaser.Math.Clamp(Math.min(w / (size + padding * 2), h / (size + padding * 2)), .35, 1)
      : 1
    const visibleWorldWidth = w / fitZoom
    const visibleWorldHeight = h / fitZoom
    const worldWidth = Math.max(size + padding * 2, visibleWorldWidth)
    const worldHeight = Math.max(size + padding * 2, visibleWorldHeight)
    const left = (worldWidth - size) / 2
    const top = (worldHeight - size) / 2
    camera.setBounds(0, 0, worldWidth, worldHeight)
    camera.setZoom(fitZoom)
    camera.centerOn(worldWidth / 2, worldHeight / 2)`

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) throw new Error('Issue #96 sizing anchor not found.')
  source = source.replace(oldBlock, newBlock)
}

fs.writeFileSync(mainPath, source, 'utf8')

console.log('\n=== ISSUE #96 CENTERING PATCH ===')
run('git', ['diff', '--', 'phaser/src/main.ts'])
run('git', ['add', 'phaser/src/main.ts'])
run('git', ['commit', '-m', 'fix(ui): center every board size in game viewport'])
run('git', ['push', 'origin', 'fix/96-center-all-board-sizes'])
console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
