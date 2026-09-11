export {}

type FeelLocale = 'fa' | 'en'
type FeelPrefs = { sound: boolean; haptics: boolean; reducedMotion: boolean; highContrast: boolean }

const key = 'neyro.feel.v1'
const button = document.querySelector<HTMLButtonElement>('#gameFeelButton')
const overlay = document.querySelector<HTMLElement>('#gameFeelOverlay')
const closeButton = document.querySelector<HTMLButtonElement>('#gameFeelClose')
const soundToggle = document.querySelector<HTMLInputElement>('#soundToggle')
const hapticToggle = document.querySelector<HTMLInputElement>('#hapticToggle')
const motionToggle = document.querySelector<HTMLInputElement>('#reducedMotionToggle')
const contrastToggle = document.querySelector<HTMLInputElement>('#highContrastToggle')

const locale = (): FeelLocale => (localStorage.getItem('neyro.locale') || 'fa') as FeelLocale
const defaults: FeelPrefs = { sound: true, haptics: true, reducedMotion: false, highContrast: false }
function loadPrefs(): FeelPrefs {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return { ...defaults } }
}
let prefs = loadPrefs()

function savePrefs() { localStorage.setItem(key, JSON.stringify(prefs)); applyPrefs() }
function applyPrefs() {
  document.documentElement.toggleAttribute('data-reduced-motion', prefs.reducedMotion)
  document.documentElement.toggleAttribute('data-high-contrast', prefs.highContrast)
  if (soundToggle) soundToggle.checked = prefs.sound
  if (hapticToggle) hapticToggle.checked = prefs.haptics
  if (motionToggle) motionToggle.checked = prefs.reducedMotion
  if (contrastToggle) contrastToggle.checked = prefs.highContrast
}

function applyLocale() {
  const fa = locale() === 'fa'
  const text: Record<string, string> = {
    gameFeelTitle: fa ? 'بازخورد و دسترسی' : 'Feedback & accessibility',
    gameFeelCopy: fa ? 'صدا، لرزش و حرکت را مطابق ترجیح خودت تنظیم کن.' : 'Tune sound, haptics and motion to your preference.',
    soundSettingLabel: fa ? 'صدا' : 'Sound',
    hapticSettingLabel: fa ? 'لرزش' : 'Haptics',
    motionSettingLabel: fa ? 'کاهش حرکت' : 'Reduce motion',
    contrastSettingLabel: fa ? 'کنتراست بالا' : 'High contrast'
  }
  Object.entries(text).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value })
  button?.setAttribute('aria-label', fa ? 'تنظیمات بازخورد و دسترسی' : 'Feedback and accessibility settings')
  closeButton?.setAttribute('aria-label', fa ? 'بستن' : 'Close')
}

let audioContext: AudioContext | null = null
let lastToneAt = 0
function ctx() {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}
function tone(frequency: number, duration = .07, volume = .035, type: OscillatorType = 'sine', delay = 0) {
  if (!prefs.sound) return
  const nowMs = performance.now()
  if (nowMs - lastToneAt < 22 && delay === 0) return
  lastToneAt = nowMs
  const ac = ctx()
  const start = ac.currentTime + delay
  const osc = ac.createOscillator(); const gain = ac.createGain()
  osc.type = type; osc.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .008); gain.gain.exponentialRampToValueAtTime(.0001, start + duration)
  osc.connect(gain); gain.connect(ac.destination); osc.start(start); osc.stop(start + duration + .02)
}
function haptic(pattern: number | number[]) {
  if (!prefs.haptics || !('vibrate' in navigator)) return
  navigator.vibrate(pattern)
}

button?.addEventListener('click', () => { applyLocale(); applyPrefs(); overlay?.removeAttribute('hidden') })
closeButton?.addEventListener('click', () => overlay?.setAttribute('hidden', ''))
soundToggle?.addEventListener('change', () => { prefs.sound = !!soundToggle.checked; savePrefs(); if (prefs.sound) tone(520, .06) })
hapticToggle?.addEventListener('change', () => { prefs.haptics = !!hapticToggle.checked; savePrefs(); haptic(18) })
motionToggle?.addEventListener('change', () => { prefs.reducedMotion = !!motionToggle.checked; savePrefs() })
contrastToggle?.addEventListener('change', () => { prefs.highContrast = !!contrastToggle.checked; savePrefs() })

window.addEventListener('neyro:tile-rotate', () => { tone(260, .045, .025, 'triangle'); haptic(8) })
window.addEventListener('neyro:pulse-start', () => { tone(330, .06, .028, 'sine'); haptic(10) })
window.addEventListener('neyro:pulse-result', event => {
  const detail = (event as CustomEvent<{ complete?: boolean; failure?: string; goalReached?: boolean }>).detail
  if (detail?.complete) { tone(523, .1, .04, 'sine'); tone(659, .12, .04, 'sine', .09); tone(784, .16, .045, 'sine', .18); haptic([18, 35, 28]) }
  else if (detail?.failure) { tone(180, .12, .03, 'sawtooth'); haptic([22, 35, 12]) }
  else if (detail?.goalReached) { tone(440, .08, .025); haptic(12) }
  else { tone(210, .07, .02, 'triangle'); haptic(10) }
})
window.addEventListener('neyro:stage-complete', () => { if (!prefs.reducedMotion) document.body.classList.add('neyro-celebrate'); window.setTimeout(() => document.body.classList.remove('neyro-celebrate'), 650) })
document.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click', () => window.setTimeout(applyLocale, 0))

applyLocale(); applyPrefs()
