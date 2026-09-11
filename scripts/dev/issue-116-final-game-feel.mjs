import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const htmlPath = 'phaser/index.html'
const mainPath = 'phaser/src/main.ts'
const cssPath = 'phaser/src/world-class.css'
const feelPath = 'phaser/src/game-feel.ts'

let html = fs.readFileSync(htmlPath, 'utf8')
let main = fs.readFileSync(mainPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (!html.includes('id="gameFeelButton"')) {
  const anchor = '<button id="profileButton" class="compact" type="button" aria-label="پروفایل بازیکن">پروفایل</button>'
  if (!html.includes(anchor)) throw new Error('profile button anchor not found')
  html = html.replace(anchor, anchor + '\n        <button id="gameFeelButton" class="compact" type="button" aria-label="تنظیمات دسترسی و بازخورد">⚙</button>')

  const overlayAnchor = '<section id="profileOverlay"'
  const pos = html.indexOf(overlayAnchor)
  if (pos < 0) throw new Error('profile overlay anchor not found')
  const feelOverlay = `<section id="gameFeelOverlay" class="journey-overlay" hidden aria-label="Game feel settings">
        <div class="journey-panel feel-panel">
          <div class="journey-panel-head"><div><small>NEYRO ACCESS</small><h2 id="gameFeelTitle">بازخورد و دسترسی</h2></div><button id="gameFeelClose" type="button" aria-label="بستن">×</button></div>
          <p id="gameFeelCopy">صدا، لرزش و حرکت را مطابق ترجیح خودت تنظیم کن.</p>
          <div class="feel-settings">
            <label><span id="soundSettingLabel">صدا</span><input id="soundToggle" type="checkbox" checked></label>
            <label><span id="hapticSettingLabel">لرزش</span><input id="hapticToggle" type="checkbox" checked></label>
            <label><span id="motionSettingLabel">کاهش حرکت</span><input id="reducedMotionToggle" type="checkbox"></label>
            <label><span id="contrastSettingLabel">کنتراست بالا</span><input id="highContrastToggle" type="checkbox"></label>
          </div>
        </div>
      </section>

      `
  html = html.slice(0, pos) + feelOverlay + html.slice(pos)

  html = html.replace('<script type="module" src="/src/profile-ui.ts"></script>', '<script type="module" src="/src/profile-ui.ts"></script>\n    <script type="module" src="/src/game-feel.ts"></script>')
}

if (!main.includes("neyro:tile-rotate")) {
  main = main.replace(
    '    this.updateHud(); this.updateScoreHud(); this.drawBoard()\n  }\n\n  private hint()',
    "    this.updateHud(); this.updateScoreHud(); this.drawBoard()\n    window.dispatchEvent(new CustomEvent('neyro:tile-rotate', { detail: { delta, row, col } }))\n  }\n\n  private hint()"
  )
}

if (!main.includes("neyro:pulse-start")) {
  main = main.replace(
    '    this.setInteractionLocked(true); this.syncRuntimeRotations(); this.setStatus(copy[this.locale].sending)',
    "    this.setInteractionLocked(true); this.syncRuntimeRotations(); this.setStatus(copy[this.locale].sending)\n    window.dispatchEvent(new CustomEvent('neyro:pulse-start'))"
  )
}

if (!main.includes("neyro:pulse-result")) {
  main = main.replace(
    '    this.updateHud(); this.updateScoreHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()\n  }\n\n  private rotate',
    "    window.dispatchEvent(new CustomEvent('neyro:pulse-result', { detail: { complete: result.complete, failure: result.failure, goalReached: result.goalReached } }))\n    this.updateHud(); this.updateScoreHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()\n  }\n\n  private rotate"
  )
}

fs.writeFileSync(feelPath, `export {}\n\ntype FeelLocale = 'fa' | 'en'\ntype FeelPrefs = { sound: boolean; haptics: boolean; reducedMotion: boolean; highContrast: boolean }\n\nconst key = 'neyro.feel.v1'\nconst button = document.querySelector<HTMLButtonElement>('#gameFeelButton')\nconst overlay = document.querySelector<HTMLElement>('#gameFeelOverlay')\nconst closeButton = document.querySelector<HTMLButtonElement>('#gameFeelClose')\nconst soundToggle = document.querySelector<HTMLInputElement>('#soundToggle')\nconst hapticToggle = document.querySelector<HTMLInputElement>('#hapticToggle')\nconst motionToggle = document.querySelector<HTMLInputElement>('#reducedMotionToggle')\nconst contrastToggle = document.querySelector<HTMLInputElement>('#highContrastToggle')\n\nconst locale = (): FeelLocale => (localStorage.getItem('neyro.locale') || 'fa') as FeelLocale\nconst defaults: FeelPrefs = { sound: true, haptics: true, reducedMotion: false, highContrast: false }\nfunction loadPrefs(): FeelPrefs {\n  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return { ...defaults } }\n}\nlet prefs = loadPrefs()\n\nfunction savePrefs() { localStorage.setItem(key, JSON.stringify(prefs)); applyPrefs() }\nfunction applyPrefs() {\n  document.documentElement.toggleAttribute('data-reduced-motion', prefs.reducedMotion)\n  document.documentElement.toggleAttribute('data-high-contrast', prefs.highContrast)\n  if (soundToggle) soundToggle.checked = prefs.sound\n  if (hapticToggle) hapticToggle.checked = prefs.haptics\n  if (motionToggle) motionToggle.checked = prefs.reducedMotion\n  if (contrastToggle) contrastToggle.checked = prefs.highContrast\n}\n\nfunction applyLocale() {\n  const fa = locale() === 'fa'\n  const text: Record<string, string> = {\n    gameFeelTitle: fa ? 'بازخورد و دسترسی' : 'Feedback & accessibility',\n    gameFeelCopy: fa ? 'صدا، لرزش و حرکت را مطابق ترجیح خودت تنظیم کن.' : 'Tune sound, haptics and motion to your preference.',\n    soundSettingLabel: fa ? 'صدا' : 'Sound',\n    hapticSettingLabel: fa ? 'لرزش' : 'Haptics',\n    motionSettingLabel: fa ? 'کاهش حرکت' : 'Reduce motion',\n    contrastSettingLabel: fa ? 'کنتراست بالا' : 'High contrast'\n  }\n  Object.entries(text).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value })\n  button?.setAttribute('aria-label', fa ? 'تنظیمات بازخورد و دسترسی' : 'Feedback and accessibility settings')\n  closeButton?.setAttribute('aria-label', fa ? 'بستن' : 'Close')\n}\n\nlet audioContext: AudioContext | null = null\nlet lastToneAt = 0\nfunction ctx() {\n  if (!audioContext) audioContext = new AudioContext()\n  return audioContext\n}\nfunction tone(frequency: number, duration = .07, volume = .035, type: OscillatorType = 'sine', delay = 0) {\n  if (!prefs.sound) return\n  const nowMs = performance.now()\n  if (nowMs - lastToneAt < 22 && delay === 0) return\n  lastToneAt = nowMs\n  const ac = ctx()\n  const start = ac.currentTime + delay\n  const osc = ac.createOscillator(); const gain = ac.createGain()\n  osc.type = type; osc.frequency.setValueAtTime(frequency, start)\n  gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .008); gain.gain.exponentialRampToValueAtTime(.0001, start + duration)\n  osc.connect(gain); gain.connect(ac.destination); osc.start(start); osc.stop(start + duration + .02)\n}\nfunction haptic(pattern: number | number[]) {\n  if (!prefs.haptics || !('vibrate' in navigator)) return\n  navigator.vibrate(pattern)\n}\n\nbutton?.addEventListener('click', () => { applyLocale(); applyPrefs(); overlay?.removeAttribute('hidden') })\ncloseButton?.addEventListener('click', () => overlay?.setAttribute('hidden', ''))\nsoundToggle?.addEventListener('change', () => { prefs.sound = !!soundToggle.checked; savePrefs(); if (prefs.sound) tone(520, .06) })\nhapticToggle?.addEventListener('change', () => { prefs.haptics = !!hapticToggle.checked; savePrefs(); haptic(18) })\nmotionToggle?.addEventListener('change', () => { prefs.reducedMotion = !!motionToggle.checked; savePrefs() })\ncontrastToggle?.addEventListener('change', () => { prefs.highContrast = !!contrastToggle.checked; savePrefs() })\n\nwindow.addEventListener('neyro:tile-rotate', () => { tone(260, .045, .025, 'triangle'); haptic(8) })\nwindow.addEventListener('neyro:pulse-start', () => { tone(330, .06, .028, 'sine'); haptic(10) })\nwindow.addEventListener('neyro:pulse-result', event => {\n  const detail = (event as CustomEvent<{ complete?: boolean; failure?: string; goalReached?: boolean }>).detail\n  if (detail?.complete) { tone(523, .1, .04, 'sine'); tone(659, .12, .04, 'sine', .09); tone(784, .16, .045, 'sine', .18); haptic([18, 35, 28]) }\n  else if (detail?.failure) { tone(180, .12, .03, 'sawtooth'); haptic([22, 35, 12]) }\n  else if (detail?.goalReached) { tone(440, .08, .025); haptic(12) }\n  else { tone(210, .07, .02, 'triangle'); haptic(10) }\n})\nwindow.addEventListener('neyro:stage-complete', () => { if (!prefs.reducedMotion) document.body.classList.add('neyro-celebrate'); window.setTimeout(() => document.body.classList.remove('neyro-celebrate'), 650) })\ndocument.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click', () => window.setTimeout(applyLocale, 0))\n\napplyLocale(); applyPrefs()\n`)

if (!css.includes('/* Issue #116 — final game feel */')) {
  css += `\n/* Issue #116 — final game feel */\n.feel-panel{width:min(560px,92vw)}.feel-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}.feel-settings label{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:56px;padding:12px 16px;border:1px solid rgba(105,190,205,.2);border-radius:16px;background:rgba(255,255,255,.045)}.feel-settings input{width:22px;height:22px;accent-color:#24d9c8}.world-shell button:focus-visible,.world-shell select:focus-visible,.world-shell input:focus-visible,.journey-overlay button:focus-visible{outline:3px solid #65f4e5;outline-offset:3px}.world-shell button,.world-shell select,.journey-overlay button{min-height:44px}html[data-reduced-motion] *,html[data-reduced-motion] *::before,html[data-reduced-motion] *::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}html[data-high-contrast] body{--hc-border:#f7ffff;--hc-text:#fff}html[data-high-contrast] .panel,html[data-high-contrast] .control-card,html[data-high-contrast] .journey-panel,html[data-high-contrast] .game-card{border-color:rgba(247,255,255,.72)!important;box-shadow:0 0 0 1px rgba(247,255,255,.22)!important}html[data-high-contrast] button,html[data-high-contrast] select{border-color:rgba(247,255,255,.68)!important}html[data-high-contrast] .guide-copy,html[data-high-contrast] small,html[data-high-contrast] .future-copy{color:#edfaff!important}.neyro-celebrate .game-card{animation:neyroCompletePulse .62s ease-out}@keyframes neyroCompletePulse{0%{transform:scale(1)}45%{transform:scale(1.012);filter:brightness(1.14)}100%{transform:scale(1)}}@media(max-width:640px){.feel-settings{grid-template-columns:1fr}}\n`
}

fs.writeFileSync(htmlPath, html)
fs.writeFileSync(mainPath, main)
fs.writeFileSync(cssPath, css)

console.log('\n=== ISSUE #116 — FINAL GAME FEEL ===')
console.log('main / production untouched')
console.log('\n=== PATCHED ===')
execFileSync('git', ['status','--short'], {stdio:'inherit'})
console.log('\nRun git diff --check, then commit/push only after validation.')
