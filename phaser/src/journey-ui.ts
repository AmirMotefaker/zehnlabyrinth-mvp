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

const worldMapOverlay = document.querySelector<HTMLElement>('#worldMapOverlay')
const resultOverlay = document.querySelector<HTMLElement>('#resultOverlay')
const worldMapGrid = document.querySelector<HTMLElement>('#worldMapGrid')
const worldMapButton = document.querySelector<HTMLButtonElement>('#worldMapButton')
const worldMapClose = document.querySelector<HTMLButtonElement>('#worldMapClose')
const resultNext = document.querySelector<HTMLButtonElement>('#resultNext')
const resultWorlds = document.querySelector<HTMLButtonElement>('#resultWorlds')
const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const localizedNumber = (value: number) => (localStorage.getItem('neyro.locale') || 'fa') === 'fa' ? String(value).replace(/\d/g, d => faDigits[Number(d)]) : String(value)
const currentLocale = () => (localStorage.getItem('neyro.locale') || 'fa') as 'fa' | 'en'

function openWorldMap() {
  const locale = currentLocale()
  const age = localStorage.getItem('neyro.age') || '5-8'
  const difficulty = localStorage.getItem('neyro.difficulty') || 'easy'
  const key = 'neyro.unlocked.' + age + '-' + difficulty
  const unlocked = Math.max(1, Number(localStorage.getItem(key) || localStorage.getItem('neyro.stage') || 1))
  const unlockedChapter = Math.max(1, Math.ceil(unlocked / 500))
  worldMapGrid?.replaceChildren()
  for (let chapter = 1; chapter <= 50; chapter += 1) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'world-node' + (chapter <= unlockedChapter ? ' unlocked' : ' locked')
    button.disabled = chapter > unlockedChapter
    button.innerHTML = '<b>' + localizedNumber(chapter) + '</b><small>' + (locale === 'fa' ? 'فصل' : 'World') + '</small>' + (chapter > unlockedChapter ? '<i>🔒</i>' : '')
    button.addEventListener('click', () => {
      const chapterSelect = document.querySelector<HTMLSelectElement>('#chapterSelect')
      const stageSelect = document.querySelector<HTMLSelectElement>('#stageSelect')
      const loadButton = document.querySelector<HTMLButtonElement>('#loadButton')
      if (!chapterSelect || !stageSelect || !loadButton) return
      chapterSelect.value = String(chapter)
      chapterSelect.dispatchEvent(new Event('change', { bubbles: true }))
      window.setTimeout(() => { stageSelect.value = String((chapter - 1) * 500 + 1); loadButton.click(); worldMapOverlay?.setAttribute('hidden', '') }, 0)
    })
    worldMapGrid?.append(button)
  }
  const title = document.querySelector<HTMLElement>('#worldMapTitle')
  const copy = document.querySelector<HTMLElement>('#worldMapCopy')
  if (title) title.textContent = locale === 'fa' ? 'نقشه جهان‌ها' : 'World Map'
  if (copy) copy.textContent = locale === 'fa' ? 'فصل بعدی را انتخاب کن. فصل‌های آینده با پیشرفت تو باز می‌شوند.' : 'Choose your next world. Future worlds unlock as you progress.'
  worldMapOverlay?.removeAttribute('hidden')
}

worldMapButton?.addEventListener('click', openWorldMap)
worldMapClose?.addEventListener('click', () => worldMapOverlay?.setAttribute('hidden',''))
resultWorlds?.addEventListener('click', () => { resultOverlay?.setAttribute('hidden',''); openWorldMap() })
resultNext?.addEventListener('click', () => { resultOverlay?.setAttribute('hidden',''); document.querySelector<HTMLButtonElement>('#nextButton')?.click() })

window.addEventListener('neyro:stage-complete', event => {
  const detail = (event as CustomEvent).detail as { mastery:number; stars:number; moves:number; hints:number; elapsedSeconds:number; xpGain:number }
  const locale = currentLocale()
  const stars = document.querySelector<HTMLElement>('#resultStars')
  const mastery = document.querySelector<HTMLElement>('#resultMastery')
  const moves = document.querySelector<HTMLElement>('#resultMoves')
  const time = document.querySelector<HTMLElement>('#resultTime')
  const hints = document.querySelector<HTMLElement>('#resultHints')
  const xp = document.querySelector<HTMLElement>('#resultXp')
  if (stars) stars.textContent = '★'.repeat(detail.stars) + '☆'.repeat(3-detail.stars)
  if (mastery) mastery.textContent = localizedNumber(detail.mastery)
  if (moves) moves.textContent = localizedNumber(detail.moves)
  if (time) time.textContent = localizedNumber(detail.elapsedSeconds) + 's'
  if (hints) hints.textContent = localizedNumber(detail.hints)
  if (xp) xp.textContent = '+' + localizedNumber(detail.xpGain) + ' XP'
  const kicker = document.querySelector<HTMLElement>('#resultKicker')
  const title = document.querySelector<HTMLElement>('#resultTitle')
  if (kicker) kicker.textContent = locale === 'fa' ? 'مرحله کامل شد' : 'Stage complete'
  if (title) title.textContent = locale === 'fa' ? 'شبکه روشن شد' : 'Network restored'
  document.querySelector<HTMLElement>('#resultMovesLabel')!.textContent = locale === 'fa' ? 'حرکت' : 'Moves'
  document.querySelector<HTMLElement>('#resultTimeLabel')!.textContent = locale === 'fa' ? 'زمان' : 'Time'
  document.querySelector<HTMLElement>('#resultHintsLabel')!.textContent = locale === 'fa' ? 'راهنما' : 'Hints'
  if (resultWorlds) resultWorlds.textContent = locale === 'fa' ? 'نقشه جهان‌ها' : 'World map'
  if (resultNext) resultNext.textContent = locale === 'fa' ? 'مرحله بعد' : 'Next stage'
  window.setTimeout(() => resultOverlay?.removeAttribute('hidden'), 180)
})
