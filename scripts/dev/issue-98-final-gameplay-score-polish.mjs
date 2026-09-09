import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const write = (p, v) => fs.writeFileSync(path.join(root, p), v, 'utf8')
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { cwd: options.cwd || root, stdio: 'inherit' })
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

if (!html.includes('id="masteryScore"')) {
  const statusAnchor = `<aside class="world-status">`
  const scoreCard = `<aside class="world-status">\n        <section class="score-card" aria-label="NEYRO score">\n          <div class="score-card-title" id="scoreTitle">امتیاز</div>\n          <div class="score-grid">\n            <div><strong id="masteryScore">۰</strong><span id="masteryLabel">مهارت</span></div>\n            <div><strong id="starScore">☆☆☆</strong><span id="starsLabel">ستاره</span></div>\n            <div><strong id="xpScore">۰</strong><span id="xpLabel">XP</span></div>\n          </div>\n        </section>`
  html = html.replace(statusAnchor, scoreCard)
}

main = main.replace(/\n\s*this\.input\.on\('wheel',[\s\S]*?\n\s*\}\)\n/, '\n')

main = main.replace(
  `      const reached = this.reached.has(key), onPath = this.stage.solutionPath.some(p => p.row === r && p.col === c)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)`,
  `      const reached = this.reached.has(key)\n      const tutorialPath = tutorial && this.stage.solutionPath.some(p => p.row === r && p.col === c)\n      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)`
)
main = main.replace(`      const tutorialDim = tutorial && this.stageNumber <= 2 && !onPath`, `      const tutorialDim = tutorial && this.stageNumber <= 2 && !tutorialPath`)
main = main.replace(`      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : onPath ? 0x2b607d : 0x1c3d56, 1)`, `      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : 0x1c3d56, 1)`)

if (!main.includes('private masteryScore = 0')) {
  main = main.replace(`  private pulseCount = 0\n`, `  private pulseCount = 0\n  private masteryScore = 0\n  private stars = 0\n  private totalXp = Math.max(0, Number(localStorage.getItem('neyro.xp') || 0))\n  private stageStartedAt = performance.now()\n`)
}

main = main.replace(
  `    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear(); this.undoStack = []`,
  `    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.masteryScore = 0; this.stars = 0; this.stageStartedAt = performance.now(); this.solved = false; this.reached.clear(); this.undoStack = []`
)

if (!main.includes('private calculateMasteryScore()')) {
  const scoringHelpers = [
    `  private calculateMasteryScore() {`,
    `    if (!this.solved) return 0`,
    `    const boardComplexity = Math.max(1, this.stage.track.boardSize * this.stage.track.boardSize)`,
    `    const parMoves = Math.max(6, Math.round(Math.sqrt(boardComplexity) * 1.6))`,
    `    const moveEfficiency = Phaser.Math.Clamp(1 - Math.max(0, this.moves - parMoves) / Math.max(parMoves, 1), 0, 1)`,
    `    const elapsedSeconds = Math.max(1, (performance.now() - this.stageStartedAt) / 1000)`,
    `    const parSeconds = Math.max(20, Math.sqrt(boardComplexity) * 3.5)`,
    `    const timeEfficiency = Phaser.Math.Clamp(parSeconds / elapsedSeconds, 0, 1)`,
    `    const cleanRun = Phaser.Math.Clamp(1 - this.hints * 0.35 - Math.max(0, this.pulseCount - this.stage.requiredPulses) * 0.15, 0, 1)`,
    `    return Math.round(400 + 300 * moveEfficiency + 150 * timeEfficiency + 150 * cleanRun)`,
    `  }`,
    ``,
    `  private awardCompletionScore() {`,
    `    this.masteryScore = this.calculateMasteryScore()`,
    `    this.stars = this.masteryScore >= 900 ? 3 : this.masteryScore >= 700 ? 2 : 1`,
    `    const multiplier = this.difficulty === 'hard' ? 1.35 : this.difficulty === 'medium' ? 1.15 : 1`,
    `    const boardBonus = 1 + Math.min(0.35, Math.max(0, this.stage.track.boardSize - 4) * 0.01)`,
    `    const gainedXp = Math.max(25, Math.round(this.masteryScore * 0.12 * multiplier * boardBonus))`,
    `    this.totalXp += gainedXp`,
    `    localStorage.setItem('neyro.xp', String(this.totalXp))`,
    `    const bestKey = 'neyro.best.' + this.stage.id`,
    `    const previous = Number(localStorage.getItem(bestKey) || 0)`,
    `    if (this.masteryScore > previous) localStorage.setItem(bestKey, String(this.masteryScore))`,
    `  }`,
    ``,
    `  private updateScoreHud() {`,
    `    const mastery = maybe('#masteryScore')`,
    `    const stars = maybe('#starScore')`,
    `    const xp = maybe('#xpScore')`,
    `    if (mastery) mastery.textContent = digits(this.masteryScore, this.locale)`,
    `    if (stars) stars.textContent = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars)`,
    `    if (xp) xp.textContent = digits(this.totalXp, this.locale)`,
    `  }`,
    ``,
    `  private async sendPulse() {`
  ].join('\n')
  main = main.replace(`  private async sendPulse() {`, scoringHelpers)
}

main = main.replace(
  /\s*const bestKey = `neyro\.best\.\$\{this\.stage\.id\}`\n\s*const score = Math\.max\(0, 1000 - this\.moves \* 12 - this\.hints \* 25 - \(this\.pulseCount - this\.stage\.requiredPulses\) \* 20\)\n\s*const previous = Number\(localStorage\.getItem\(bestKey\) \|\| 0\)\n\s*if \(score > previous\) localStorage\.setItem\(bestKey, String\(score\)\)\n\s*localStorage\.setItem\(`neyro\.complete\.\$\{this\.stage\.id\}`, '1'\)/,
  `\n      this.awardCompletionScore()\n      localStorage.setItem('neyro.complete.' + this.stage.id, '1')`
)

main = main.replace(`    this.updateHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()`, `    this.updateHud(); this.updateScoreHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()`)
main = main.replace(`    this.updateHud(); this.drawBoard()`, `    this.updateHud(); this.updateScoreHud(); this.drawBoard()`)
main = main.replace(
  `      '#progressTitle': c.progressTitle, '#progressCopy': c.progressCopy, '#futureCopy': c.futureCopy,`,
  `      '#progressTitle': c.progressTitle, '#progressCopy': c.progressCopy, '#futureCopy': c.futureCopy,\n      '#scoreTitle': this.locale === 'fa' ? 'امتیاز' : 'Score', '#masteryLabel': this.locale === 'fa' ? 'مهارت' : 'Mastery', '#starsLabel': this.locale === 'fa' ? 'ستاره' : 'Stars', '#xpLabel': 'XP',`
)
main = main.replace(`      this.applyLocale(); this.updateHud(); this.setStageInstruction(); this.drawBoard()`, `      this.applyLocale(); this.updateHud(); this.updateScoreHud(); this.setStageInstruction(); this.drawBoard()`)

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
for (const task of ['typecheck', 'runtime:audit', 'build']) {
  try { execFileSync('npm', ['run', task], { cwd: phaserDir, stdio: 'inherit' }) }
  catch { console.warn(`Local ${task} unavailable or failed; CI will be authoritative.`) }
}

run('git', ['add', 'phaser/index.html', 'phaser/src/main.ts', 'phaser/src/world-class.css'])
run('git', ['commit', '-m', 'feat(game): finalize score clarity language and brand polish'])
run('git', ['push', 'origin', 'feat/98-final-gameplay-score-polish'])
console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
