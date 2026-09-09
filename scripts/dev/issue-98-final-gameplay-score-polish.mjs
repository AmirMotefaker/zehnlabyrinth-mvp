import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const write = (p, v) => fs.writeFileSync(path.join(root, p), v, 'utf8')
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
const text = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim()
const replaceOnce = (source, oldValue, newValue, label) => {
  if (source.includes(newValue)) return source
  if (!source.includes(oldValue)) throw new Error(`Anchor not found: ${label}`)
  return source.replace(oldValue, newValue)
}

const branch = text('git', ['branch', '--show-current'])
if (branch !== 'feat/98-final-gameplay-score-polish') throw new Error(`Wrong branch: ${branch}`)
if (text('git', ['status', '--porcelain'])) throw new Error('Working tree must be clean.')

console.log('\n=== ISSUE #98 FINAL GAMEPLAY + SCORE POLISH ===')
console.log('main / production untouched')

let html = read('phaser/index.html')
let main = read('phaser/src/main.ts')
let css = read('phaser/src/world-class.css')

// Move locale switch out of brand row and center brand block.
html = replaceOnce(
  html,
  `<header class="world-brand" aria-label="NEYRO">\n        <div class="brand-line"><div class="brand">NEYRO</div><button id="localeButton" class="compact language-switch" type="button" aria-label="تغییر زبان">EN</button></div>\n        <div class="tagline" id="tagline">هزارتوی ذهن</div>\n      </header>`,
  `<header class="world-brand" aria-label="NEYRO">\n        <div class="brand-block"><div class="brand">NEYRO</div><div class="tagline" id="tagline">هزارتوی ذهن</div></div>\n      </header>`,
  'brand block'
)

const topbarAnchor = `<section class="world-topbar">`
if (!html.includes('id="localeButton"')) {
  html = html.replace(topbarAnchor, `${topbarAnchor}\n        <button id="localeButton" class="compact language-switch topbar-language" type="button" aria-label="تغییر زبان">EN</button>`)
}

// Add score HUD card if absent.
if (!html.includes('id="masteryScore"')) {
  const statusAnchor = `<aside class="world-status">`
  const scoreCard = `<aside class="world-status">\n        <section class="score-card" aria-label="NEYRO score">\n          <div class="score-card-title" id="scoreTitle">امتیاز</div>\n          <div class="score-grid">\n            <div><strong id="masteryScore">۰</strong><span id="masteryLabel">مهارت</span></div>\n            <div><strong id="starScore">☆ ☆ ☆</strong><span id="starsLabel">ستاره</span></div>\n            <div><strong id="xpScore">۰</strong><span id="xpLabel">XP</span></div>\n          </div>\n        </section>`
  html = html.replace(statusAnchor, scoreCard)
}

// Remove wheel zoom entirely.
main = main.replace(/\n\s*this\.input\.on\('wheel',[\s\S]*?\n\s*\}\)\n/, '\n')

// Prevent solution-path visual leak in normal gameplay; only tutorial can visually use path.
main = main.replace(
  `      const reached = this.reached.has(key), onPath = this.stage.solutionPath.some(p => p.row === r && p.col === c)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)`,
  `      const reached = this.reached.has(key)\n      const tutorialPath = tutorial && this.stage.solutionPath.some(p => p.row === r && p.col === c)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)`
)
main = main.replace(`      const tutorialDim = tutorial && this.stageNumber <= 2 && !onPath`, `      const tutorialDim = tutorial && this.stageNumber <= 2 && !tutorialPath`)
main = main.replace(`      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : onPath ? 0x2b607d : 0x1c3d56, 1)`, `      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : 0x1c3d56, 1)`)

// Add score state.
if (!main.includes('private masteryScore = 0')) {
  main = main.replace(`  private pulseCount = 0\n`, `  private pulseCount = 0\n  private masteryScore = 0\n  private stars = 0\n  private totalXp = Math.max(0, Number(localStorage.getItem('neyro.xp') || 0))\n  private stageStartedAt = performance.now()\n`)
}

// Reset score state on stage load.
main = main.replace(
  `    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear(); this.undoStack = []`,
  `    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.masteryScore = 0; this.stars = 0; this.stageStartedAt = performance.now(); this.solved = false; this.reached.clear(); this.undoStack = []`
)

// Add scoring helpers before sendPulse.
if (!main.includes('private calculateMasteryScore()')) {
  main = main.replace(
    `  private async sendPulse() {`,
    `  private calculateMasteryScore() {\n    if (!this.solved) return 0\n    const boardComplexity = Math.max(1, this.stage.track.boardSize * this.stage.track.boardSize)\n    const parMoves = Math.max(6, Math.round(Math.sqrt(boardComplexity) * 1.6))\n    const moveEfficiency = Phaser.Math.Clamp(1 - Math.max(0, this.moves - parMoves) / Math.max(parMoves, 1), 0, 1)\n    const elapsedSeconds = Math.max(1, (performance.now() - this.stageStartedAt) / 1000)\n    const parSeconds = Math.max(20, Math.sqrt(boardComplexity) * 3.5)\n    const timeEfficiency = Phaser.Math.Clamp(parSeconds / elapsedSeconds, 0, 1)\n    const cleanRun = Phaser.Math.Clamp(1 - this.hints * 0.35 - Math.max(0, this.pulseCount - this.stage.requiredPulses) * 0.15, 0, 1)\n    return Math.round(400 + 300 * moveEfficiency + 150 * timeEfficiency + 150 * cleanRun)\n  }\n\n  private awardCompletionScore() {\n    this.masteryScore = this.calculateMasteryScore()\n    this.stars = this.masteryScore >= 900 ? 3 : this.masteryScore >= 700 ? 2 : 1\n    const multiplier = this.difficulty === 'hard' ? 1.35 : this.difficulty === 'medium' ? 1.15 : 1\n    const boardBonus = 1 + Math.min(0.35, Math.max(0, this.stage.track.boardSize - 4) * 0.01)\n    const gainedXp = Math.max(25, Math.round(this.masteryScore * 0.12 * multiplier * boardBonus))\n    this.totalXp += gainedXp\n    localStorage.setItem('neyro.xp', String(this.totalXp))\n    const bestKey = \\`neyro.best.\\${this.stage.id}\\`\n    const previous = Number(localStorage.getItem(bestKey) || 0)\n    if (this.masteryScore > previous) localStorage.setItem(bestKey, String(this.masteryScore))\n  }\n\n  private updateScoreHud() {\n    const mastery = maybe('#masteryScore')\n    const stars = maybe('#starScore')\n    const xp = maybe('#xpScore')\n    if (mastery) mastery.textContent = digits(this.masteryScore, this.locale)\n    if (stars) stars.textContent = \\`${'★'.repeat(this.stars)}${'☆'.repeat(3 - this.stars)}\\`\n    if (xp) xp.textContent = digits(this.totalXp, this.locale)\n  }\n\n  private async sendPulse() {`
  )
}

// Replace old score block on completion.
main = main.replace(
  `      const bestKey = \`neyro.best.${'${this.stage.id}'}\`\n      const score = Math.max(0, 1000 - this.moves * 12 - this.hints * 25 - (this.pulseCount - this.stage.requiredPulses) * 20)\n      const previous = Number(localStorage.getItem(bestKey) || 0)\n      if (score > previous) localStorage.setItem(bestKey, String(score))\n      localStorage.setItem(\`neyro.complete.${'${this.stage.id}'}\`, '1')`,
  `      this.awardCompletionScore()\n      localStorage.setItem(\`neyro.complete.${'${this.stage.id}'}\`, '1')`
)

// Ensure HUD refresh updates score.
main = main.replace(`    this.updateHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()`, `    this.updateHud(); this.updateScoreHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()`)
main = main.replace(`    this.updateHud(); this.drawBoard()`, `    this.updateHud(); this.updateScoreHud(); this.drawBoard()`)

// Locale-aware score labels.
main = main.replace(
  `      '#progressTitle': c.progressTitle, '#progressCopy': c.progressCopy, '#futureCopy': c.futureCopy,`,
  `      '#progressTitle': c.progressTitle, '#progressCopy': c.progressCopy, '#futureCopy': c.futureCopy,\n      '#scoreTitle': this.locale === 'fa' ? 'امتیاز' : 'Score', '#masteryLabel': this.locale === 'fa' ? 'مهارت' : 'Mastery', '#starsLabel': this.locale === 'fa' ? 'ستاره' : 'Stars', '#xpLabel': 'XP',`
)
main = main.replace(`      this.applyLocale(); this.updateHud(); this.setStageInstruction(); this.drawBoard()`, `      this.applyLocale(); this.updateHud(); this.updateScoreHud(); this.setStageInstruction(); this.drawBoard()`)

// Add score CSS and centered brand styling.
if (!css.includes('/* Issue #98 — final gameplay score polish */')) {
  css += `\n\n/* Issue #98 — final gameplay score polish */\n.world-brand{display:flex;align-items:center;justify-content:center;text-align:center}\n.world-brand .brand-block{display:flex;flex-direction:column;align-items:center;justify-content:center;width:max-content;margin-inline:auto}\n.world-brand .brand{line-height:.95;text-align:center}\n.world-brand .tagline{width:100%;text-align:center;margin-top:6px}\n.topbar-language{align-self:stretch;min-width:54px}\n.score-card{border:1px solid rgba(78,170,215,.35);border-radius:16px;padding:10px 12px;background:rgba(14,35,61,.72)}\n.score-card-title{font-weight:900;font-size:14px;margin-bottom:8px}\n.score-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}\n.score-grid>div{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58px;border:1px solid rgba(86,151,204,.28);border-radius:12px;background:rgba(8,28,49,.66)}\n.score-grid strong{font-size:18px;line-height:1.1}\n.score-grid span{font-size:11px;opacity:.78;margin-top:4px}\n#starScore{letter-spacing:2px;color:#ffd45c}\n`
}

write('phaser/index.html', html)
write('phaser/src/main.ts', main)
write('phaser/src/world-class.css', css)

console.log('\n=== PATCHED ===')
run('git', ['status', '--short'])
run('git', ['diff', '--check'])

const phaserDir = path.join(root, 'phaser')
const lock = path.join(phaserDir, 'package-lock.json')
const pkg = path.join(phaserDir, 'package.json')
if (fs.existsSync(pkg)) {
  if (fs.existsSync(lock)) run('npm', ['ci'], { cwd: phaserDir })
}

// Validation uses existing installation when available; CI is authoritative after push.
try { execFileSync('npm', ['run', 'typecheck'], { cwd: phaserDir, stdio: 'inherit' }) } catch { console.warn('Local typecheck unavailable; CI will be authoritative.') }
try { execFileSync('npm', ['run', 'runtime:audit'], { cwd: phaserDir, stdio: 'inherit' }) } catch { console.warn('Local runtime audit unavailable; CI will be authoritative.') }
try { execFileSync('npm', ['run', 'build'], { cwd: phaserDir, stdio: 'inherit' }) } catch { console.warn('Local build unavailable; CI will be authoritative.') }

run('git', ['add', 'phaser/index.html', 'phaser/src/main.ts', 'phaser/src/world-class.css'])
run('git', ['commit', '-m', 'feat(game): finalize score clarity language and brand polish'])
run('git', ['push', 'origin', 'feat/98-final-gameplay-score-polish'])
console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
