const home = document.querySelector<HTMLElement>('#journeyHome')
const tutorial = document.querySelector<HTMLElement>('#journeyTutorial')
const continueButton = document.querySelector<HTMLButtonElement>('#journeyContinue')
const newButton = document.querySelector<HTMLButtonElement>('#journeyNew')
const tutorialNext = document.querySelector<HTMLButtonElement>('#journeyTutorialNext')

const hasJourney = localStorage.getItem('neyro.journeyStarted') === '1'
if (continueButton) continueButton.textContent = hasJourney ? 'ادامه مسیر' : 'شروع بازی'

continueButton?.addEventListener('click', () => {
  if (hasJourney || localStorage.getItem('neyro.tutorialComplete') === '1') { home?.setAttribute('hidden', '') }
  else { home?.setAttribute('hidden', ''); tutorial?.removeAttribute('hidden') }
})
newButton?.addEventListener('click', () => { home?.setAttribute('hidden', ''); tutorial?.removeAttribute('hidden') })
tutorialNext?.addEventListener('click', () => { localStorage.setItem('neyro.journeyStarted','1'); tutorial?.setAttribute('hidden','') })
