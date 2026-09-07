import './premium.css'
import './board-polish.css'

export {}

const body = document.body
const statusLabel = document.querySelector<HTMLElement>('#statusLabel')
const nextButton = document.querySelector<HTMLButtonElement>('#nextButton')
const pulseButton = document.querySelector<HTMLButtonElement>('#pulseButton')

function syncPremiumState() {
  const solved = Boolean(nextButton && !nextButton.disabled)
  body.classList.toggle('is-solved', solved)

  const status = statusLabel?.textContent || ''
  const pulseReady = /ارسال پالس|Send pulse/i.test(status) && !solved && !pulseButton?.disabled
  body.classList.toggle('is-pulse-ready', pulseReady)
}

const observer = new MutationObserver(syncPremiumState)
if (statusLabel) observer.observe(statusLabel, { childList:true, subtree:true, characterData:true })
if (nextButton) observer.observe(nextButton, { attributes:true, attributeFilter:['disabled'] })
if (pulseButton) observer.observe(pulseButton, { attributes:true, attributeFilter:['disabled'] })

document.addEventListener('visibilitychange', syncPremiumState)
window.addEventListener('neyro:themechange', syncPremiumState)

syncPremiumState()
