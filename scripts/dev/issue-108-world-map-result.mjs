import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const htmlPath = 'phaser/index.html'
const mainPath = 'phaser/src/main.ts'
const journeyPath = 'phaser/src/journey-ui.ts'
const cssPath = 'phaser/src/world-class.css'

let html = fs.readFileSync(htmlPath, 'utf8')
let main = fs.readFileSync(mainPath, 'utf8')
let journey = fs.readFileSync(journeyPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (html.includes('id="worldMapOverlay"')) throw new Error('Issue #108 slice 2 already applied')

const shellMarker = '<main class="world-shell">'
if (!html.includes(shellMarker)) throw new Error('world-shell marker missing')

const overlays = [
'      <section id="worldMapOverlay" class="journey-overlay" hidden aria-label="World map">',
'        <div class="journey-panel world-map-panel">',
'          <div class="journey-panel-head"><div><small>NEYRO JOURNEY</small><h2 id="worldMapTitle">نقشه جهان‌ها</h2></div><button id="worldMapClose" type="button">×</button></div>',
'          <p id="worldMapCopy">فصل بعدی را انتخاب کن. فصل‌های آینده با پیشرفت تو باز می‌شوند.</p>',
'          <div id="worldMapGrid" class="world-map-grid"></div>',
'        </div>',
'      </section>',
'',
'      <section id="resultOverlay" class="journey-overlay" hidden aria-label="Stage result">',
'        <div class="journey-panel result-panel">',
'          <div class="result-kicker" id="resultKicker">مرحله کامل شد</div>',
'          <div id="resultStars" class="result-stars">★★★</div>',
'          <h2 id="resultTitle">شبکه روشن شد</h2>',
'          <div class="result-score"><span id="resultMastery">۰</span><small>Mastery</small></div>',
'          <div class="result-grid">',
'            <span><strong id="resultMoves">۰</strong><small id="resultMovesLabel">حرکت</small></span>',
'            <span><strong id="resultTime">۰s</strong><small id="resultTimeLabel">زمان</small></span>',
'            <span><strong id="resultHints">۰</strong><small id="resultHintsLabel">راهنما</small></span>',
'            <span><strong id="resultXp">+۰ XP</strong><small>XP</small></span>',
'          </div>',
'          <div class="result-actions"><button id="resultWorlds" type="button">نقشه جهان‌ها</button><button id="resultNext" class="journey-primary" type="button">مرحله بعد</button></div>',
'        </div>',
'      </section>',
''
].join('\n')
html = html.replace(shellMarker, shellMarker + '\n' + overlays)

const topbarMarker = '<button id="localeButton" class="compact language-switch topbar-language" type="button" aria-label="تغییر زبان">EN</button>'
if (!html.includes(topbarMarker)) throw new Error('locale button marker missing')
html = html.replace(topbarMarker, topbarMarker + '\n        <button id="worldMapButton" class="compact" type="button" aria-label="نقشه جهان‌ها">◈</button>')
fs.writeFileSync(htmlPath, html)

const scoreAnchor = '      this.awardCompletionScore()\n      localStorage.setItem(\'neyro.complete.\' + this.stage.id, \'1\')'
if (!main.includes(scoreAnchor)) throw new Error('completion anchor missing')
const scoreReplacement = [
'      const xpBefore = this.totalXp',
'      this.awardCompletionScore()',
'      const elapsedSeconds = Math.max(1, Math.round((performance.now() - this.stageStartedAt) / 1000))',
'      window.dispatchEvent(new CustomEvent(\'neyro:stage-complete\', { detail: {',
'        stageNumber: this.stageNumber, chapter: this.stage.chapter, mastery: this.masteryScore, stars: this.stars,',
'        moves: this.moves, hints: this.hints, elapsedSeconds, xpGain: this.totalXp - xpBefore, totalXp: this.totalXp',
'      } }))',
'      localStorage.setItem(\'neyro.complete.\' + this.stage.id, \'1\')'
].join('\n')
main = main.replace(scoreAnchor, scoreReplacement)

const loadAnchor = '    this.applyLocale(); this.setStageInstruction(); this.updateHud(); this.drawBoard(); this.updateNextState()'
if (!main.includes(loadAnchor)) throw new Error('loadStage tail anchor missing')
main = main.replace(loadAnchor, loadAnchor + "\n    window.dispatchEvent(new CustomEvent('neyro:stage-loaded', { detail: { stageNumber: this.stageNumber, chapter: this.stage.chapter, highestUnlocked: this.highestUnlocked() } }))")
fs.writeFileSync(mainPath, main)

journey += [
'',
"const worldMapOverlay = document.querySelector<HTMLElement>('#worldMapOverlay')",
"const resultOverlay = document.querySelector<HTMLElement>('#resultOverlay')",
"const worldMapGrid = document.querySelector<HTMLElement>('#worldMapGrid')",
"const worldMapButton = document.querySelector<HTMLButtonElement>('#worldMapButton')",
"const worldMapClose = document.querySelector<HTMLButtonElement>('#worldMapClose')",
"const resultNext = document.querySelector<HTMLButtonElement>('#resultNext')",
"const resultWorlds = document.querySelector<HTMLButtonElement>('#resultWorlds')",
"const faDigits = '۰۱۲۳۴۵۶۷۸۹'",
"const localizedNumber = (value: number) => (localStorage.getItem('neyro.locale') || 'fa') === 'fa' ? String(value).replace(/\\d/g, d => faDigits[Number(d)]) : String(value)",
"const currentLocale = () => (localStorage.getItem('neyro.locale') || 'fa') as 'fa' | 'en'",
'',
'function openWorldMap() {',
"  const locale = currentLocale()",
"  const age = localStorage.getItem('neyro.age') || '5-8'",
"  const difficulty = localStorage.getItem('neyro.difficulty') || 'easy'",
"  const key = 'neyro.unlocked.' + age + '-' + difficulty",
"  const unlocked = Math.max(1, Number(localStorage.getItem(key) || localStorage.getItem('neyro.stage') || 1))",
'  const unlockedChapter = Math.max(1, Math.ceil(unlocked / 500))',
'  worldMapGrid?.replaceChildren()',
'  for (let chapter = 1; chapter <= 50; chapter += 1) {',
"    const button = document.createElement('button')",
"    button.type = 'button'",
"    button.className = 'world-node' + (chapter <= unlockedChapter ? ' unlocked' : ' locked')",
'    button.disabled = chapter > unlockedChapter',
"    button.innerHTML = '<b>' + localizedNumber(chapter) + '</b><small>' + (locale === 'fa' ? 'فصل' : 'World') + '</small>' + (chapter > unlockedChapter ? '<i>🔒</i>' : '')",
'    button.addEventListener(\'click\', () => {',
"      const chapterSelect = document.querySelector<HTMLSelectElement>('#chapterSelect')",
"      const stageSelect = document.querySelector<HTMLSelectElement>('#stageSelect')",
"      const loadButton = document.querySelector<HTMLButtonElement>('#loadButton')",
"      if (!chapterSelect || !stageSelect || !loadButton) return",
'      chapterSelect.value = String(chapter)',
"      chapterSelect.dispatchEvent(new Event('change', { bubbles: true }))",
'      window.setTimeout(() => { stageSelect.value = String((chapter - 1) * 500 + 1); loadButton.click(); worldMapOverlay?.setAttribute(\'hidden\', \'\') }, 0)',
'    })',
'    worldMapGrid?.append(button)',
'  }',
"  const title = document.querySelector<HTMLElement>('#worldMapTitle')",
"  const copy = document.querySelector<HTMLElement>('#worldMapCopy')",
"  if (title) title.textContent = locale === 'fa' ? 'نقشه جهان‌ها' : 'World Map'",
"  if (copy) copy.textContent = locale === 'fa' ? 'فصل بعدی را انتخاب کن. فصل‌های آینده با پیشرفت تو باز می‌شوند.' : 'Choose your next world. Future worlds unlock as you progress.'",
"  worldMapOverlay?.removeAttribute('hidden')",
'}',
'',
"worldMapButton?.addEventListener('click', openWorldMap)",
"worldMapClose?.addEventListener('click', () => worldMapOverlay?.setAttribute('hidden',''))",
"resultWorlds?.addEventListener('click', () => { resultOverlay?.setAttribute('hidden',''); openWorldMap() })",
"resultNext?.addEventListener('click', () => { resultOverlay?.setAttribute('hidden',''); document.querySelector<HTMLButtonElement>('#nextButton')?.click() })",
'',
"window.addEventListener('neyro:stage-complete', event => {",
"  const detail = (event as CustomEvent).detail as { mastery:number; stars:number; moves:number; hints:number; elapsedSeconds:number; xpGain:number }",
"  const locale = currentLocale()",
"  const stars = document.querySelector<HTMLElement>('#resultStars')",
"  const mastery = document.querySelector<HTMLElement>('#resultMastery')",
"  const moves = document.querySelector<HTMLElement>('#resultMoves')",
"  const time = document.querySelector<HTMLElement>('#resultTime')",
"  const hints = document.querySelector<HTMLElement>('#resultHints')",
"  const xp = document.querySelector<HTMLElement>('#resultXp')",
"  if (stars) stars.textContent = '★'.repeat(detail.stars) + '☆'.repeat(3-detail.stars)",
"  if (mastery) mastery.textContent = localizedNumber(detail.mastery)",
"  if (moves) moves.textContent = localizedNumber(detail.moves)",
"  if (time) time.textContent = localizedNumber(detail.elapsedSeconds) + 's'",
"  if (hints) hints.textContent = localizedNumber(detail.hints)",
"  if (xp) xp.textContent = '+' + localizedNumber(detail.xpGain) + ' XP'",
"  const kicker = document.querySelector<HTMLElement>('#resultKicker')",
"  const title = document.querySelector<HTMLElement>('#resultTitle')",
"  if (kicker) kicker.textContent = locale === 'fa' ? 'مرحله کامل شد' : 'Stage complete'",
"  if (title) title.textContent = locale === 'fa' ? 'شبکه روشن شد' : 'Network restored'",
"  document.querySelector<HTMLElement>('#resultMovesLabel')!.textContent = locale === 'fa' ? 'حرکت' : 'Moves'",
"  document.querySelector<HTMLElement>('#resultTimeLabel')!.textContent = locale === 'fa' ? 'زمان' : 'Time'",
"  document.querySelector<HTMLElement>('#resultHintsLabel')!.textContent = locale === 'fa' ? 'راهنما' : 'Hints'",
"  if (resultWorlds) resultWorlds.textContent = locale === 'fa' ? 'نقشه جهان‌ها' : 'World map'",
"  if (resultNext) resultNext.textContent = locale === 'fa' ? 'مرحله بعد' : 'Next stage'",
"  window.setTimeout(() => resultOverlay?.removeAttribute('hidden'), 180)",
'})',
].join('\n') + '\n'
fs.writeFileSync(journeyPath, journey)

css += [
'',
'/* Issue #108 — world map + result flow */',
'.journey-overlay{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:22px;background:rgba(2,8,14,.78);backdrop-filter:blur(16px)}',
'.journey-overlay[hidden]{display:none}.journey-panel{width:min(980px,96vw);max-height:88vh;overflow:auto;border:1px solid rgba(81,224,210,.2);border-radius:28px;background:linear-gradient(145deg,#091725,#07111c);color:#effcff;box-shadow:0 34px 110px rgba(0,0,0,.5);padding:28px}',
'.journey-panel-head{display:flex;justify-content:space-between;align-items:center;gap:18px}.journey-panel-head small,.result-kicker{color:#3de0cf;font-weight:900;letter-spacing:.12em}.journey-panel-head h2{margin:5px 0 0;font-size:30px}.journey-panel-head button{border:0;background:rgba(255,255,255,.07);color:#fff;border-radius:12px;width:40px;height:40px;font-size:24px}.journey-panel>p{color:#93aabc}',
'.world-map-grid{display:grid;grid-template-columns:repeat(10,minmax(58px,1fr));gap:10px;margin-top:24px}.world-node{position:relative;min-height:72px;border-radius:16px;border:1px solid rgba(126,166,184,.16);background:#0d2132;color:#85a0b2;display:grid;place-items:center;align-content:center;cursor:pointer}.world-node b{font-size:20px}.world-node small{font-size:10px;opacity:.72}.world-node.unlocked{color:#eaffff;border-color:rgba(55,223,204,.32);background:linear-gradient(145deg,#103147,#0c2634)}.world-node.unlocked:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(25,219,198,.12)}.world-node.locked{opacity:.45;cursor:not-allowed}.world-node i{position:absolute;top:6px;right:7px;font-style:normal;font-size:10px}',
'.result-panel{width:min(560px,94vw);text-align:center;overflow:visible}.result-stars{font-size:42px;letter-spacing:.14em;color:#ffd65a;margin:16px 0 6px}.result-panel h2{font-size:32px;margin:0 0 20px}.result-score{display:grid;place-items:center;margin:10px auto 24px;width:140px;height:140px;border-radius:50%;border:1px solid rgba(55,225,205,.35);box-shadow:inset 0 0 45px rgba(55,225,205,.08),0 0 38px rgba(55,225,205,.08)}.result-score span{font-size:38px;font-weight:900}.result-score small{margin-top:-28px;color:#6edfd2}.result-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.result-grid span{padding:14px 8px;border-radius:16px;background:rgba(255,255,255,.045);display:grid;gap:4px}.result-grid strong{font-size:19px}.result-grid small{color:#8099aa}.result-actions{display:flex;gap:10px;justify-content:center;margin-top:24px}.result-actions button{min-height:48px;border-radius:14px;padding:0 22px;border:1px solid rgba(130,175,190,.2);background:rgba(255,255,255,.05);color:#eefcff;font-weight:800}.result-actions .journey-primary{border:0;color:#031116}',
'@media(max-width:760px){.world-map-grid{grid-template-columns:repeat(5,minmax(52px,1fr))}.journey-panel{padding:20px}.result-grid{grid-template-columns:repeat(2,1fr)}}',
'body[data-theme="light"] .journey-panel{background:linear-gradient(145deg,#ffffff,#eef8fb);color:#102635;border-color:rgba(17,132,150,.22)}body[data-theme="light"] .journey-panel>p,body[data-theme="light"] .result-grid small{color:#526c79}body[data-theme="light"] .world-node{background:#e7f2f6;color:#4b6977}body[data-theme="light"] .world-node.unlocked{background:linear-gradient(145deg,#e4fbf7,#dff2f7);color:#123640;border-color:rgba(16,153,151,.3)}body[data-theme="light"] .result-actions button{color:#153440;background:#edf6f8}',
].join('\n') + '\n'
fs.writeFileSync(cssPath, css)

console.log('\n=== ISSUE #108 — WORLD MAP + RESULT FLOW ===')
console.log('main / production untouched')
execFileSync('git', ['diff','--check'], {stdio:'inherit'})
execFileSync('git', ['status','--short'], {stdio:'inherit'})
console.log('\nPatch ready for validation/commit.')
