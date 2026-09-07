import './premium.css'
import './board-polish.css'
import './world-class.css'

export {}

const body = document.body
const statusLabel = document.querySelector<HTMLElement>('#statusLabel')
const nextButton = document.querySelector<HTMLButtonElement>('#nextButton')
const pulseButton = document.querySelector<HTMLButtonElement>('#pulseButton')
const stageInput = document.querySelector<HTMLInputElement>('#stageInput')
const stageLabel = document.querySelector<HTMLElement>('#stageLabel')
const progressFill = document.querySelector<HTMLElement>('#progressFill')

function syncPremiumState() {
  const solved = Boolean(nextButton && !nextButton.disabled)
  body.classList.toggle('is-solved', solved)

  const status = statusLabel?.textContent || ''
  const pulseReady = /ارسال پالس|Send pulse/i.test(status) && !solved && !pulseButton?.disabled
  body.classList.toggle('is-pulse-ready', pulseReady)

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
