import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const file = p => path.join(root, p)
const read = p => fs.readFileSync(file(p), 'utf8')
const write = (p, v) => fs.writeFileSync(file(p), v, 'utf8')
const replaceOnce = (text, oldValue, newValue, label) => {
  if (text.includes(newValue)) return text
  if (!text.includes(oldValue)) throw new Error(`Anchor not found: ${label}`)
  return text.replace(oldValue, newValue)
}
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })

if (run('git', ['branch', '--show-current']).toString) {}
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (branch !== 'feat/94-world-viewport-polish') throw new Error(`Wrong branch: ${branch}`)
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Working tree must be clean.')

console.log('\n=== ISSUE #94 — WORLD VIEWPORT POLISH ===')
console.log('Main/Production untouched.')

// index.html
let html = read('phaser/index.html')
html = replaceOnce(
  html,
  `<header class="world-brand" aria-label="NEYRO">\n        <div class="brand">NEYRO</div>\n        <div class="tagline" id="tagline">هزارتوی ذهن · شبکهٔ نور</div>\n      </header>`,
  `<header class="world-brand" aria-label="NEYRO">\n        <div class="brand-line"><div class="brand">NEYRO</div><button id="localeButton" class="compact language-switch" type="button" aria-label="تغییر زبان">EN</button></div>\n        <div class="tagline" id="tagline">هزارتوی ذهن</div>\n      </header>`,
  'brand row + locale button'
)
html = html.replace(`\n        <button id="localeButton" class="compact language-switch" type="button" aria-label="تغییر زبان">EN</button>`, '')
html = replaceOnce(
  html,
  `      </aside>\n    </main>`,
  `      </aside>\n\n      <footer class="world-footer">ساخته شده با ❤️ برای گیمرهای حرفه ای توسط <a href="https://amirmotefaker.ir/" target="_blank" rel="noopener noreferrer">امیر متفکر</a></footer>\n    </main>`,
  'footer'
)
write('phaser/index.html', html)

// main.ts
let main = read('phaser/src/main.ts')
main = main.replace(`tagline: 'هزارتوی ذهن · شبکهٔ نور'`, `tagline: 'هزارتوی ذهن'`)
main = main.replace(`tagline: 'Mind Labyrinth · Living Light Network'`, `tagline: 'Mind Labyrinth'`)
main = main.replace(`tutorial2: 'آموزش ۲ از ۳: ↻ یعنی کاشی قابل چرخش است. مسیر روشن را از آغاز تا ستاره کامل کن.'`, `tutorial2: 'آموزش ۲ از ۳: کاشی‌های مسیر قابل چرخش هستند. مسیر روشن را از آغاز تا ستاره کامل کن.'`)
main = main.replace(`tutorial2: 'Tutorial 2 of 3: ↻ marks a rotatable tile. Complete the lit route from start to star.'`, `tutorial2: 'Tutorial 2 of 3: route tiles can be rotated. Complete the lit route from start to star.'`)

const oldCreate = `    this.bindControls()\n    this.scale.on('resize', () => this.drawBoard())\n    this.loadStage(this.stageNumber)`
const newCreate = `    this.bindControls()\n    this.bindLargeBoardNavigation()\n    this.scale.on('resize', () => this.drawBoard())\n    this.loadStage(this.stageNumber)`
main = replaceOnce(main, oldCreate, newCreate, 'large-board navigation binding')

const insertBeforeBind = `  private bindControls() {`
const navMethod = `  private bindLargeBoardNavigation() {\n    const camera = this.cameras.main\n    let dragging = false\n    let lastX = 0\n    let lastY = 0\n\n    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {\n      if ((this.stage?.track.boardSize ?? 0) < 12) return\n      camera.setZoom(Phaser.Math.Clamp(camera.zoom - dy * 0.0012, 0.55, 2.4))\n    })\n\n    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {\n      if ((this.stage?.track.boardSize ?? 0) < 12) return\n      if (pointer.middleButtonDown() || pointer.event.shiftKey) { dragging = true; lastX = pointer.x; lastY = pointer.y }\n    })\n    this.input.on('pointerup', () => { dragging = false })\n    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {\n      if (!dragging) return\n      const dx = (pointer.x - lastX) / camera.zoom\n      const dy = (pointer.y - lastY) / camera.zoom\n      camera.scrollX -= dx\n      camera.scrollY -= dy\n      lastX = pointer.x; lastY = pointer.y\n    })\n  }\n\n  private bindControls() {`
main = replaceOnce(main, insertBeforeBind, navMethod, 'navigation method')

const oldSizing = `    const w = this.scale.width, h = this.scale.height, n = this.stage.track.boardSize\n    const cap = w >= 1100 ? 820 : 720\n    const size = Math.min(w * .94, h * .92, cap), step = size / n, left = (w - size) / 2, top = (h - size) / 2`
const newSizing = `    const w = this.scale.width, h = this.scale.height, n = this.stage.track.boardSize\n    const cap = w >= 1100 ? 820 : 720\n    const viewportSize = Math.min(w * .94, h * .92, cap)\n    const minimumStep = n >= 30 ? 28 : n >= 20 ? 31 : n >= 12 ? 35 : 0\n    const step = Math.max(viewportSize / n, minimumStep)\n    const size = step * n\n    const left = size <= w ? (w - size) / 2 : 28\n    const top = size <= h ? (h - size) / 2 : 28\n    const camera = this.cameras.main\n    const largeBoard = size > w || size > h\n    camera.setBounds(0, 0, Math.max(w, size + 56), Math.max(h, size + 56))\n    if (!largeBoard) {\n      camera.setZoom(1)\n      camera.centerOn(w / 2, h / 2)\n    } else {\n      const fitZoom = Phaser.Math.Clamp(Math.min(w / (size + 56), h / (size + 56)) * 1.18, .55, 1)\n      if (camera.zoom === 1) camera.setZoom(fitZoom)\n      camera.centerOn(left + size / 2, top + size / 2)\n    }`
main = replaceOnce(main, oldSizing, newSizing, 'large-board sizing')

main = main.replace(/\n\s*if \(this\.isRotatable\(tile\)\) this\.board!\.add\(this\.add\.text\(x \+ cell \* \.27, y - cell \* \.27, '↻',[^\n]*\)\)/, '')
write('phaser/src/main.ts', main)

// world-class.css
let css = read('phaser/src/world-class.css')
css += `\n\n/* Issue #94 — viewport density, one-screen desktop and brand/footer polish */\n.world-brand .brand-line{display:flex;align-items:center;justify-content:space-between;gap:10px}\n.world-brand .language-switch{min-width:52px;min-height:40px;padding:6px 12px}\n.world-footer{grid-area:footer;text-align:center;font-size:13px;font-weight:800;line-height:1.2;padding:2px 8px 4px;white-space:nowrap}\n.world-footer a{color:#ef4444;text-decoration:none;font-weight:950}\n.world-footer a:hover{text-decoration:underline}\n\n@media (min-width:1251px) and (min-height:700px){\n  html,body{height:100%;overflow:hidden}\n  .world-shell{height:100svh;min-height:0;padding:8px 12px;gap:9px;grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:'brand topbar status' 'guide center status' 'footer footer footer'}\n  .world-brand{padding:4px 6px 0}\n  .world-brand .brand{font-size:clamp(38px,3.3vw,58px)}\n  .world-brand .tagline{margin-top:4px;font-size:13px}\n  .world-topbar{padding:7px;gap:6px;border-radius:16px}\n  .control-card{min-height:50px;padding:5px 8px}\n  .load-stage{min-height:50px}\n  .world-guide,.world-status{height:100%;min-height:0;padding:12px;gap:9px;overflow:hidden}\n  .world-guide .guide-copy{line-height:1.5}\n  .mouse-row,.touch-help{padding:9px}\n  .legend-grid{gap:4px}\n  .legend-grid>span{min-height:31px}\n  .world-center{height:100%;min-height:0;gap:7px}\n  .world-center .game-card{height:auto;min-height:0;flex:1;border-radius:18px}\n  .world-center .player-actions{gap:6px}\n  .world-center .player-actions button{min-height:44px}\n  .world-status .hero-stats span{min-height:52px}\n  .world-status .mission{min-height:78px}\n  .progress-card,.track-card{padding:10px}\n  .future-copy{padding:10px;font-size:17px}\n}\n\n@media(max-width:1250px){\n  .world-footer{width:100%;white-space:normal;padding:10px}\n}\n`
write('phaser/src/world-class.css', css)

console.log('\n=== PATCHED FILES ===')
run('git', ['status', '--short'])
run('git', ['add', 'phaser/index.html', 'phaser/src/main.ts', 'phaser/src/world-class.css'])
run('git', ['commit', '-m', 'feat(ui): polish viewport branding and large-grid navigation'])
run('git', ['push', 'origin', 'feat/94-world-viewport-polish'])
console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
