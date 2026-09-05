type AgeBand = '5-8' | '9-17' | '18+'
type Difficulty = 'easy' | 'medium' | 'hard'

const FA = '۰۱۲۳۴۵۶۷۸۹'
const ageSelect = document.querySelector<HTMLSelectElement>('#ageSelect')
const difficultySelect = document.querySelector<HTMLSelectElement>('#difficultySelect')
const chapterSelect = document.querySelector<HTMLSelectElement>('#chapterSelect')
const stageLabel = document.querySelector<HTMLElement>('#stageLabel')
const movesLabel = document.querySelector<HTMLElement>('#movesLabel')
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
let completedElapsed: number | null = null
let lastStageIdentity = ''

function locale() { return document.documentElement.lang === 'en' ? 'en' : 'fa' }
function digits(value: string) { return locale() === 'fa' ? value.replace(/\d/g, d => FA[Number(d)]) : value }
function age(): AgeBand { return (ageSelect?.value as AgeBand) || '5-8' }
function difficulty(): Difficulty { return (difficultySelect?.value as Difficulty) || 'easy' }
function chapter() { return Math.min(8, Math.max(1, Number(chapterSelect?.value || 1))) }
function boardSize() {
  const c = chapter()
  if (age() === '5-8') {
    if (difficulty() === 'easy') return 5
    if (difficulty() === 'medium') return 6
    return c >= 5 ? 7 : 6
  }
  if (age() === '9-17') {
    if (difficulty() === 'easy') return 5
    if (difficulty() === 'medium') return c >= 7 ? 7 : 6
    return c >= 7 ? 8 : 7
  }
  if (difficulty() === 'easy') return c >= 7 ? 6 : 5
  if (difficulty() === 'medium') return c >= 5 ? 7 : 6
  return c >= 5 ? 8 : 7
}
function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return digits(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
}
function stageIdentity() { return `${age()}|${difficulty()}|${stageLabel?.textContent?.trim() || 'stage'}` }
function bestKey() { return `neyro.bestTime.${stageIdentity()}` }
function elapsed() {
  if (completedElapsed !== null) return completedElapsed
  const now = pausedAt ?? performance.now()
  return Math.max(0, now - startedAt - pausedTotal)
}
function removeResult() { document.querySelector('#completionResult')?.remove() }
function resetTimer() {
  startedAt = performance.now(); pausedAt = null; pausedTotal = 0; completed = false; completedElapsed = null
  lastStageIdentity = stageIdentity(); removeResult(); render()
}
function showResult(value: number, isBest: boolean) {
  removeResult()
  const card = document.createElement('section')
  card.id = 'completionResult'
  card.setAttribute('role', 'status')
  card.setAttribute('aria-live', 'polite')
  card.style.cssText = 'margin-top:12px;padding:14px 16px;border:1px solid #5ee0c1;border-radius:14px;background:rgba(20,80,70,.28);text-align:center;font-weight:700;line-height:1.9'
  const moves = movesLabel?.textContent?.replace(/^.*?:\s*/, '') || '0'
  const title = locale() === 'fa' ? '✓ مرحله با موفقیت تمام شد' : '✓ Stage complete'
  const detail = locale() === 'fa'
    ? `زمان: ${formatTime(value)} · حرکت: ${moves}${isBest ? ' · رکورد جدید!' : ''}`
    : `Time: ${formatTime(value)} · Moves: ${moves}${isBest ? ' · New best!' : ''}`
  card.innerHTML = `<div style="font-size:1.08rem">${title}</div><div>${detail}</div>`
  document.querySelector('.mission')?.insertAdjacentElement('afterend', card)
}
function persistBest() {
  if (completed) return
  const value = Math.round(elapsed())
  completedElapsed = value
  completed = true
  const previous = Number(localStorage.getItem(bestKey()) || 0)
  const isBest = !previous || value < previous
  if (isBest) localStorage.setItem(bestKey(), String(value))
  showResult(value, isBest)
  render()
}
function theme() {
  document.body.dataset.age = age(); document.body.dataset.difficulty = difficulty()
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
chapterSelect?.addEventListener('change', theme)

document.addEventListener('visibilitychange', () => {
  if (completed) return
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
