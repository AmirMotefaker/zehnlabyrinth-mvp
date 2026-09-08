import './premium.css'
import './board-polish.css'
import './world-class.css'
import './select-theme.css'
import './game-feel.css'

export {}

const body = document.body
const statusLabel = document.querySelector<HTMLElement>('#statusLabel')
const nextButton = document.querySelector<HTMLButtonElement>('#nextButton')
const pulseButton = document.querySelector<HTMLButtonElement>('#pulseButton')
const stageInput = document.querySelector<HTMLInputElement>('#stageInput')
const stageLabel = document.querySelector<HTMLElement>('#stageLabel')
const progressFill = document.querySelector<HTMLElement>('#progressFill')
const gameCard = document.querySelector<HTMLElement>('.game-card')
let wasSolved = false
let motionTimer = 0

function pulseClass(name: string, ms = 220) {
  window.clearTimeout(motionTimer)
  body.classList.remove('rotate-left', 'rotate-right', 'is-pulse-failed')
  body.classList.add(name)
  motionTimer = window.setTimeout(() => body.classList.remove(name), ms)
}

function celebrate() {
  if (!gameCard || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gameCard.querySelector('.neyro-celebration')?.remove()
  const layer = document.createElement('div')
  layer.className = 'neyro-celebration'
  const vectors = [
    [-180,-120],[-120,-190],[-40,-210],[50,-205],[130,-165],[190,-90],
    [205,10],[170,105],[95,175],[0,210],[-95,180],[-175,110],[-210,10]
  ]
  for (const [dx,dy] of vectors) {
    const spark = document.createElement('i')
    spark.className = 'neyro-spark'
    spark.style.setProperty('--dx', `${dx}px`)
    spark.style.setProperty('--dy', `${dy}px`)
    layer.append(spark)
  }
  gameCard.append(layer)
  window.setTimeout(() => layer.remove(), 1300)
}

function syncPremiumState() {
  const solved = Boolean(nextButton && !nextButton.disabled)
  body.classList.toggle('is-solved', solved)

  const status = statusLabel?.textContent || ''
  const pulseReady = /ارسال پالس|Send pulse/i.test(status) && !solved && !pulseButton?.disabled
  const pulsing = /پالس در شبکه حرکت می‌کند|Pulse travelling/i.test(status)
  const failed = /پالس متوقف شد|Pulse stopped/i.test(status)
  const rotatedLeft = /به چپ چرخید|rotated 90° left/i.test(status)
  const rotatedRight = /به راست چرخید|rotated 90° right/i.test(status)

  body.classList.toggle('is-pulse-ready', pulseReady)
  body.classList.toggle('is-pulsing', pulsing)
  if (failed) pulseClass('is-pulse-failed', 520)
  else if (rotatedLeft) pulseClass('rotate-left')
  else if (rotatedRight) pulseClass('rotate-right')

  if (solved && !wasSolved) celebrate()
  wasSolved = solved

  if (progressFill) {
    const raw = stageInput?.value || stageLabel?.textContent?.match(/\d+/)?.[0] || '1'
    const stage = Math.min(10000, Math.max(1, Number(raw) || 1))
    progressFill.style.width = `${Math.max(1, (stage / 10000) * 100)}%`
  }
}

const observer = new MutationObserver(syncPremiumState)
if (statusLabel) observer.observe(statusLabel, { childList:true, subtree:true, characterData:true })
if (nextButton) observer.observe(nextButton, { attributes:true, attributeFilter:['disabled'] })
if (pulseButton) observer.observe(pulseButton, { attributes:true, attributeFilter:['disabled'] })
if (stageLabel) observer.observe(stageLabel, { childList:true, subtree:true, characterData:true })
stageInput?.addEventListener('input', syncPremiumState)

document.addEventListener('visibilitychange', syncPremiumState)
window.addEventListener('neyro:themechange', syncPremiumState)

syncPremiumState()
