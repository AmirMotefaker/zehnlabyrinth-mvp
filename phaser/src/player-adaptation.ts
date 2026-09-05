type AgeBand = '5-8' | '9-17' | '18+'
type Difficulty = 'easy' | 'medium' | 'hard'

const FA = '۰۱۲۳۴۵۶۷۸۹'
const ageSelect = document.querySelector<HTMLSelectElement>('#ageSelect')
const difficultySelect = document.querySelector<HTMLSelectElement>('#difficultySelect')
const stageLabel = document.querySelector<HTMLElement>('#stageLabel')
const statusLabel = document.querySelector<HTMLElement>('#statusLabel')
const timerLabel = document.querySelector<HTMLElement>('#timerLabel')
const bestTimeLabel = document.querySelector<HTMLElement>('#bestTimeLabel')
const boardSizeLabel = document.querySelector<HTMLElement>('#boardSizeLabel')
const ageBadge = document.querySelector<HTMLElement>('#ageBadge')
const difficultyBadge = document.querySelector<HTMLElement>('#difficultyBadge')
const nextButton = document.querySelector<HTMLButtonElement>('#nextButton')

let startedAt = performance.now()
let pausedAt: number | null = null
let pausedTotal = 0
let completed = false
let lastStageIdentity = ''

function locale() { return document.documentElement.lang === 'en' ? 'en' : 'fa' }
function digits(value: string) { return locale() === 'fa' ? value.replace(/\d/g, d => FA[Number(d)]) : value }
function age(): AgeBand { return (ageSelect?.value as AgeBand) || '5-8' }
function difficulty(): Difficulty { return (difficultySelect?.value as Difficulty) || 'easy' }
function boardSize() { return difficulty() === 'easy' ? 5 : difficulty() === 'medium' ? 6 : 7 }
function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return digits(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
}
function stageIdentity() {
  return `${age()}|${difficulty()}|${stageLabel?.textContent?.trim() || 'stage'}`
}
function bestKey() { return `neyro.bestTime.${stageIdentity()}` }
function elapsed() {
  const now = pausedAt ?? performance.now()
  return Math.max(0, now - startedAt - pausedTotal)
}
function resetTimer() {
  startedAt = performance.now()
  pausedAt = null
  pausedTotal = 0
  completed = false
  lastStageIdentity = stageIdentity()
  render()
}
function persistBest() {
  if (completed) return
  completed = true
  const value = Math.round(elapsed())
  const previous = Number(localStorage.getItem(bestKey()) || 0)
  if (!previous || value < previous) localStorage.setItem(bestKey(), String(value))
  render()
}
function theme() {
  document.body.dataset.age = age()
  document.body.dataset.difficulty = difficulty()
  if (ageBadge) ageBadge.textContent = locale() === 'fa' ? `سن ${digits(age())}` : `Age ${age()}`
  if (difficultyBadge) {
    const labels = locale() === 'fa' ? { easy: 'ساده', medium: 'متوسط', hard: 'سخت' } : { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
    difficultyBadge.textContent = labels[difficulty()]
  }
  if (boardSizeLabel) boardSizeLabel.textContent = locale() === 'fa' ? `شبکه ${digits(`${boardSize()}×${boardSize()}`)}` : `${boardSize()}×${boardSize()} grid`
}
function render() {
  theme()
  if (timerLabel) timerLabel.textContent = locale() === 'fa' ? `زمان: ${formatTime(elapsed())}` : `Time: ${formatTime(elapsed())}`
  const best = Number(localStorage.getItem(bestKey()) || 0)
  if (bestTimeLabel) bestTimeLabel.textContent = locale() === 'fa' ? `بهترین: ${best ? formatTime(best) : '—'}` : `Best: ${best ? formatTime(best) : '—'}`
}

ageSelect?.addEventListener('change', () => { theme(); resetTimer() })
difficultySelect?.addEventListener('change', () => { theme(); resetTimer() })

document.addEventListener('visibilitychange', () => {
  if (document.hidden && pausedAt === null) pausedAt = performance.now()
  else if (!document.hidden && pausedAt !== null) { pausedTotal += performance.now() - pausedAt; pausedAt = null }
})

const observer = new MutationObserver(() => {
  const identity = stageIdentity()
  if (identity !== lastStageIdentity) resetTimer()
  if (nextButton && !nextButton.disabled && !completed) persistBest()
  theme()
})
if (stageLabel) observer.observe(stageLabel, { childList: true, subtree: true, characterData: true })
if (statusLabel) observer.observe(statusLabel, { childList: true, subtree: true, characterData: true })
if (nextButton) observer.observe(nextButton, { attributes: true, attributeFilter: ['disabled'] })

window.setInterval(render, 250)
lastStageIdentity = stageIdentity()
render()
