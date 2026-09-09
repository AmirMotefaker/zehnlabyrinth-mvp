import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const file = p => path.join(root, p)
const read = p => fs.readFileSync(file(p), 'utf8')
const write = (p, v) => fs.writeFileSync(file(p), v, 'utf8')
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const output = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim()
const replaceOnce = (source, oldValue, newValue, label) => {
  if (source.includes(newValue)) return source
  if (!source.includes(oldValue)) throw new Error(`Anchor not found: ${label}`)
  return source.replace(oldValue, newValue)
}

const branch = output('git', ['branch', '--show-current'])
if (branch !== 'fix/100-final-controls-qa') throw new Error(`Wrong branch: ${branch}`)
if (output('git', ['status', '--porcelain'])) throw new Error('Working tree must be clean before Issue #100 patch.')

console.log('\n=== ISSUE #100 FINAL CONTROLS QA ===')
console.log('main / production untouched')

let html = read('phaser/index.html')
let main = read('phaser/src/main.ts')
let css = read('phaser/src/world-class.css')

// 1) Restore language switch in topbar, not in brand.
if (!html.includes('id="localeButton"')) {
  html = replaceOnce(
    html,
    '        <label class="control-card theme-control"><span id="themeText">حالت نمایش</span><select id="themeSelect" aria-label="حالت نمایش"><option value="dark">تیره</option><option value="light">روشن</option><option value="system">سیستم</option></select></label>',
    '        <label class="control-card theme-control"><span id="themeText">حالت نمایش</span><select id="themeSelect" aria-label="حالت نمایش"><option value="dark">تیره</option><option value="light">روشن</option><option value="system">سیستم</option></select></label>\n        <button id="localeButton" class="compact language-switch topbar-language" type="button" aria-label="تغییر زبان">EN</button>',
    'language switch'
  )
}

// 2) Stage input -> select.
html = replaceOnce(
  html,
  '<label class="control-card stage-jump"><span id="stageText">مرحله</span><input id="stageInput" type="text" value="۱" inputmode="numeric" pattern="[0-9۰-۹٠-٩]*" autocomplete="off" aria-label="شماره مرحله" /></label>',
  '<label class="control-card stage-jump"><span id="stageText">مرحله</span><select id="stageSelect" aria-label="مرحله"></select></label>',
  'stage select html'
)

// 3) Main runtime: populate visible chapter/board labels immediately and use stage select.
main = replaceOnce(
  main,
  `      option.value = String(chapter)\n      chapterSelect.append(option)`,
  `      option.value = String(chapter)\n      option.textContent = \`${'${copy[this.locale].chapter}'} ${'${digits(chapter, this.locale)}'}\`\n      chapterSelect.append(option)`,
  'chapter option labels'
)

main = replaceOnce(
  main,
  `    const stageInput = el<HTMLInputElement>('#stageInput')\n    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')`,
  `    const stageSelect = el<HTMLSelectElement>('#stageSelect')\n    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')`,
  'stage select binding'
)

main = replaceOnce(
  main,
  `      option.value = String(size)\n      boardSizeSelect.append(option)\n    }\n    stageInput.max = String(STAGES_PER_TRACK)`,
  `      option.value = String(size)\n      option.textContent = \`${'${digits(size, this.locale)}'}×${'${digits(size, this.locale)}'}\`\n      boardSizeSelect.append(option)\n    }\n    this.refreshStageSelect()`,
  'board labels and stage refresh'
)

main = replaceOnce(
  main,
  `      const requested = Math.min(STAGES_PER_TRACK, Math.max(1, Number(stageInput.value) || 1))\n      this.loadStage(Math.min(requested, this.highestUnlocked()))`,
  `      const requested = Math.min(STAGES_PER_TRACK, Math.max(1, Number(stageSelect.value) || 1))\n      this.loadStage(Math.min(requested, this.highestUnlocked()))`,
  'load selected stage'
)

main = replaceOnce(
  main,
  `      const firstStage = (chapter - 1) * STAGES_PER_CHAPTER + 1\n      this.loadStage(Math.min(firstStage, this.highestUnlocked()))`,
  `      const firstStage = (chapter - 1) * STAGES_PER_CHAPTER + 1\n      this.refreshStageSelect(chapter)\n      this.loadStage(Math.min(firstStage, this.highestUnlocked()))`,
  'chapter stage refresh'
)

if (!main.includes('private refreshStageSelect(')) {
  main = replaceOnce(
    main,
    `  private currentTrack() { return getTracks().find(track => track.ageBand === this.ageBand && track.difficulty === this.difficulty) ?? getTracks()[0] }`,
    `  private refreshStageSelect(chapterOverride?: number) {\n    const chapterSelect = el<HTMLSelectElement>('#chapterSelect')\n    const stageSelect = el<HTMLSelectElement>('#stageSelect')\n    const chapter = chapterOverride ?? Number(chapterSelect.value || 1)\n    const first = (chapter - 1) * STAGES_PER_CHAPTER + 1\n    const last = Math.min(first + STAGES_PER_CHAPTER - 1, this.highestUnlocked())\n    const current = this.stageNumber\n    stageSelect.replaceChildren()\n    for (let globalStage = first; globalStage <= last; globalStage += 1) {\n      const option = document.createElement('option')\n      option.value = String(globalStage)\n      const localStage = globalStage - first + 1\n      option.textContent = digits(localStage, this.locale)\n      stageSelect.append(option)\n    }\n    if (!stageSelect.options.length) {\n      const option = document.createElement('option')\n      option.value = String(Math.min(first, this.highestUnlocked()))\n      option.textContent = digits(1, this.locale)\n      stageSelect.append(option)\n    }\n    const desired = Array.from(stageSelect.options).some(option => Number(option.value) === current) ? current : Number(stageSelect.options[0].value)\n    stageSelect.value = String(desired)\n  }\n\n  private currentTrack() { return getTracks().find(track => track.ageBand === this.ageBand && track.difficulty === this.difficulty) ?? getTracks()[0] }`,
    'refresh stage method'
  )
}

// Refresh stage selector after unlock progression changes and every stage load.
main = replaceOnce(
  main,
  `    localStorage.setItem('neyro.stage', String(this.stageNumber))`,
  `    localStorage.setItem('neyro.stage', String(this.stageNumber))\n    this.refreshStageSelect(Math.floor((this.stageNumber - 1) / STAGES_PER_CHAPTER) + 1)`,
  'stage selector sync on load'
)

// Make locale switch update selector text and visible button label.
const localeAnchor = `      localStorage.setItem('neyro.locale', this.locale)\n      this.applyLocale(); this.updateHud(); this.updateScoreHud(); this.setStageInstruction(); this.drawBoard()`
const localeReplacement = `      localStorage.setItem('neyro.locale', this.locale)\n      this.applyLocale(); this.refreshStageSelect(); this.updateHud(); this.updateScoreHud(); this.setStageInstruction(); this.drawBoard()`
main = replaceOnce(main, localeAnchor, localeReplacement, 'locale refresh stage selector')

// Ensure native chapter and board option labels are refreshed by applyLocale if existing loop is present.
main = main.replace(
  /for \(let i = 0; i < CHAPTERS_PER_TRACK; i \+= 1\) el<HTMLSelectElement>\('#chapterSelect'\)\.options\[i\]\.text = `\$\{c\.chapter\} \$\{digits\(i \+ 1, this\.locale\)\}`/,
  `for (let i = 0; i < CHAPTERS_PER_TRACK; i += 1) el<HTMLSelectElement>('#chapterSelect').options[i].text = \`${'${c.chapter}'} ${'${digits(i + 1, this.locale)}'}\``
)

// 4) Strong, neutral premium light-mode presentation and native select dropdown contrast.
if (!css.includes('/* Issue #100 — final controls QA */')) {
  css += `\n\n/* Issue #100 — final controls QA */\n.control-card select,.stage-jump select{appearance:auto;color:var(--text);background:transparent;cursor:pointer}\n.control-card select option,.stage-jump select option{color:var(--text);background:var(--surface);font-weight:750}\n.topbar-language{display:flex;align-items:center;justify-content:center;min-width:58px;min-height:50px;font-weight:950;letter-spacing:.04em}\n.stage-jump select{font-variant-numeric:tabular-nums}\n\nbody[data-theme='light']{\n  --bg:#edf3f8;--bg-deep:#dfe8f0;--surface:#ffffff;--surface-2:#f2f6fa;--surface-3:#dce7f0;--border:#9eb5c8;--text:#14263a;--muted:#536b80;--muted-2:#70869a;--game:#07101c;--shadow:rgba(36,55,74,.16);\n  background:radial-gradient(circle at 50% -10%,#ffffff 0,#edf3f8 42%,#dfe8f0 100%);\n}\nbody[data-theme='light'] .world-topbar,body[data-theme='light'] .panel{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(242,246,250,.96));border-color:#9eb5c8;box-shadow:0 16px 46px rgba(36,55,74,.13),inset 0 1px 0 #fff}\nbody[data-theme='light'] .control-card,body[data-theme='light'] .mouse-row,body[data-theme='light'] .touch-help,body[data-theme='light'] .progress-card,body[data-theme='light'] .track-card,body[data-theme='light'] .score-card{background:#f6f9fc;border-color:#abc0d1}\nbody[data-theme='light'] .control-card:focus-within{background:#fff;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}\nbody[data-theme='light'] .control-card select option,body[data-theme='light'] .stage-jump select option{background:#fff;color:#14263a}\nbody[data-theme='light'] .game-card{background:#07101c;border-color:color-mix(in srgb,var(--accent) 45%,#52718c);box-shadow:0 18px 52px rgba(20,38,58,.22)}\nbody[data-theme='light'] #game canvas{filter:none}\nbody[data-theme='light'] .world-footer{color:#24384d}\nbody[data-theme='light'] .world-footer a{color:#dc2626}\n\n@media (min-width:1251px){.world-topbar{grid-template-columns:repeat(5,minmax(105px,1fr)) auto minmax(120px,.8fr) auto}}\n@media (max-width:820px){.topbar-language{display:flex}.world-topbar{grid-template-columns:repeat(2,1fr) auto}.world-topbar .stage-jump{display:flex}}\n`
}

write('phaser/index.html', html)
write('phaser/src/main.ts', main)
write('phaser/src/world-class.css', css)

console.log('\n=== PATCHED FILES ===')
run('git', ['status', '--short'])
run('git', ['diff', '--check'])

const phaserDir = path.join(root, 'phaser')
for (const script of ['typecheck', 'catalog:audit', 'runtime:audit', 'build']) {
  try { run('npm', ['run', script], phaserDir) }
  catch { console.warn(`Local ${script} unavailable/failed; GitHub CI will be authoritative.`) }
}

run('git', ['add', 'phaser/index.html', 'phaser/src/main.ts', 'phaser/src/world-class.css'])
run('git', ['commit', '-m', 'fix(ui): restore bilingual controls and selector clarity'])
run('git', ['push', 'origin', 'fix/100-final-controls-qa'])
console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
