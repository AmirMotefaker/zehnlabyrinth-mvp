const home = document.querySelector<HTMLElement>('#journeyHome')
const tutorial = document.querySelector<HTMLElement>('#journeyTutorial')
const continueButton = document.querySelector<HTMLButtonElement>('#journeyContinue')
const newButton = document.querySelector<HTMLButtonElement>('#journeyNew')
const tutorialNext = document.querySelector<HTMLButtonElement>('#journeyTutorialNext')
const worldMapOverlay = document.querySelector<HTMLElement>('#worldMapOverlay')
const resultOverlay = document.querySelector<HTMLElement>('#resultOverlay')
const worldMapGrid = document.querySelector<HTMLElement>('#worldMapGrid')
const worldMapButton = document.querySelector<HTMLButtonElement>('#worldMapButton')
const worldMapClose = document.querySelector<HTMLButtonElement>('#worldMapClose')
const resultNext = document.querySelector<HTMLButtonElement>('#resultNext')
const resultWorlds = document.querySelector<HTMLButtonElement>('#resultWorlds')
const faDigits = '۰۱۲۳۴۵۶۷۸۹'

type Locale = 'fa' | 'en'
const currentLocale = (): Locale => (localStorage.getItem('neyro.locale') || 'fa') as Locale
const localizedNumber = (value: number) => currentLocale() === 'fa'
  ? String(value).replace(/\d/g, d => faDigits[Number(d)])
  : String(value)

const tutorialSteps = {
  fa: [
    {
      step: '۰۱ / ۰۳',
      title: 'مسیر نور را بساز',
      copy: 'از ◆ آغاز کن. هر کاشی را بچرخان تا اتصال نور به ★ برسد.',
      next: 'بعدی'
    },
    {
      step: '۰۲ / ۰۳',
      title: 'کاشی‌ها را بچرخان',
      copy: 'در دسکتاپ کلیک چپ و راست جهت چرخش را عوض می‌کند. در موبایل با لمس کاشی آن را بچرخان.',
      next: 'بعدی'
    },
    {
      step: '۰۳ / ۰۳',
      title: 'پالس را بفرست',
      copy: 'وقتی مسیر آماده شد «ارسال پالس» را بزن. اگر گیر کردی، راهنما یک حرکت درست را با هزینه امتیاز نشان می‌دهد.',
      next: 'بریم به نقشه جهان‌ها'
    }
  ],
  en: [
    {
      step: '01 / 03',
      title: 'Build the light path',
      copy: 'Start at ◆. Rotate the tiles until the light connection reaches ★.',
      next: 'Next'
    },
    {
      step: '02 / 03',
      title: 'Rotate the tiles',
      copy: 'On desktop, left and right click rotate in opposite directions. On mobile, tap a tile to rotate it.',
      next: 'Next'
    },
    {
      step: '03 / 03',
      title: 'Send the pulse',
      copy: 'When the route is ready, press Send pulse. If you get stuck, Hint reveals one correct move with a score cost.',
      next: 'Open world map'
    }
  ]
} as const

let tutorialIndex = 0

const journeyCopy = {
  fa: {
    continueJourney: 'ادامه مسیر', startGame: 'شروع بازی', newJourney: 'شروع سفر جدید',
    heroTitle: 'شبکه را بیدار کن.',
    heroCopy: 'کاشی‌ها را بچرخان، پالس را هدایت کن و جهان‌های NEYRO را یکی‌یکی روشن کن.',
    stages: '۲۲۵٬۰۰۰ مرحله', chapters: '۵۰ فصل', languages: 'فارسی · English',
    tutorialStep: '۰۱ / ۰۳', tutorialTitle: 'مسیر نور را بساز',
    tutorialCopy: 'از ◆ آغاز کن. هر کاشی را بچرخان تا اتصال نور به ★ برسد.',
    tutorialNext: 'فهمیدم، شروع کنیم', worlds: 'نقشه جهان‌ها',
    worldsCopy: 'فصل بعدی را انتخاب کن. فصل‌های آینده با پیشرفت تو باز می‌شوند.',
    world: 'فصل', stageComplete: 'مرحله کامل شد', restored: 'شبکه روشن شد',
    moves: 'حرکت', time: 'زمان', hints: 'راهنما', nextStage: 'مرحله بعد'
  },
  en: {
    continueJourney: 'Continue journey', startGame: 'Start game', newJourney: 'New journey',
    heroTitle: 'Wake the network.',
    heroCopy: 'Rotate the tiles, guide the pulse, and restore the worlds of NEYRO one by one.',
    stages: '225,000 stages', chapters: '50 worlds', languages: 'English · فارسی',
    tutorialStep: '01 / 03', tutorialTitle: 'Build the light path',
    tutorialCopy: 'Start at ◆. Rotate each tile until the light connection reaches ★.',
    tutorialNext: 'Got it — start', worlds: 'World map',
    worldsCopy: 'Choose your next world. Future worlds unlock as you progress.',
    world: 'World', stageComplete: 'Stage complete', restored: 'Network restored',
    moves: 'Moves', time: 'Time', hints: 'Hints', nextStage: 'Next stage'
  }
} as const

function applyJourneyLocale() {
  const locale = currentLocale()
  const c = journeyCopy[locale]
  const hasJourney = localStorage.getItem('neyro.journeyStarted') === '1'
  if (continueButton) continueButton.textContent = hasJourney ? c.continueJourney : c.startGame
  if (newButton) newButton.textContent = c.newJourney
  const heroTitle = home?.querySelector('h1')
  const heroCopy = home?.querySelector('p')
  const meta = home?.querySelectorAll<HTMLElement>('.journey-meta span')
  if (heroTitle) heroTitle.textContent = c.heroTitle
  if (heroCopy) heroCopy.textContent = c.heroCopy
  if (meta?.[0]) meta[0].textContent = c.stages
  if (meta?.[1]) meta[1].textContent = c.chapters
  if (meta?.[2]) meta[2].textContent = c.languages
  const tutorialStep = tutorial?.querySelector<HTMLElement>('.journey-step')
  const tutorialTitle = tutorial?.querySelector<HTMLElement>('strong')
  const tutorialCopy = tutorial?.querySelector<HTMLElement>('p')
  const activeTutorial = tutorialSteps[locale][tutorialIndex]
  if (tutorialStep) tutorialStep.textContent = activeTutorial.step
  if (tutorialTitle) tutorialTitle.textContent = activeTutorial.title
  if (tutorialCopy) tutorialCopy.textContent = activeTutorial.copy
  if (tutorialNext) tutorialNext.textContent = activeTutorial.next
  if (worldMapButton) worldMapButton.textContent = c.worlds
  if (worldMapClose) worldMapClose.setAttribute('aria-label', locale === 'fa' ? 'بستن نقشه جهان‌ها' : 'Close world map')
}

function openWorldMap() {
  const locale = currentLocale()
  const c = journeyCopy[locale]
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
    button.innerHTML = '<b>' + localizedNumber(chapter) + '</b><small>' + c.world + '</small>' + (chapter > unlockedChapter ? '<i>🔒</i>' : '')
    button.addEventListener('click', () => {
      const chapterSelect = document.querySelector<HTMLSelectElement>('#chapterSelect')
      const stageSelect = document.querySelector<HTMLSelectElement>('#stageSelect')
      const loadButton = document.querySelector<HTMLButtonElement>('#loadButton')
      if (!chapterSelect || !stageSelect || !loadButton) return
      chapterSelect.value = String(chapter)
      chapterSelect.dispatchEvent(new Event('change', { bubbles: true }))
      window.setTimeout(() => {
        stageSelect.value = String((chapter - 1) * 500 + 1)
        loadButton.click()
        worldMapOverlay?.setAttribute('hidden', '')
      }, 0)
    })
    worldMapGrid?.append(button)
  }

  const title = document.querySelector<HTMLElement>('#worldMapTitle')
  const copy = document.querySelector<HTMLElement>('#worldMapCopy')
  if (title) title.textContent = c.worlds
  if (copy) copy.textContent = c.worldsCopy
  worldMapOverlay?.removeAttribute('hidden')
}

continueButton?.addEventListener('click', () => {
  const hasJourney = localStorage.getItem('neyro.journeyStarted') === '1'
  if (hasJourney || localStorage.getItem('neyro.tutorialComplete') === '1') {
    home?.setAttribute('hidden', '')
    openWorldMap()
  } else {
    tutorialIndex = 0
    home?.setAttribute('hidden', '')
    tutorial?.removeAttribute('hidden')
    applyJourneyLocale()
  }
})

newButton?.addEventListener('click', () => {
  tutorialIndex = 0
  home?.setAttribute('hidden', '')
  tutorial?.removeAttribute('hidden')
  applyJourneyLocale()
})

tutorialNext?.addEventListener('click', () => {
  if (tutorialIndex < tutorialSteps[currentLocale()].length - 1) {
    tutorialIndex += 1
    applyJourneyLocale()
    return
  }

  localStorage.setItem('neyro.journeyStarted', '1')
  tutorial?.setAttribute('hidden', '')
  tutorialIndex = 0
  applyJourneyLocale()
  openWorldMap()
})
worldMapButton?.addEventListener('click', openWorldMap)
worldMapClose?.addEventListener('click', () => worldMapOverlay?.setAttribute('hidden', ''))
resultWorlds?.addEventListener('click', () => {
  resultOverlay?.setAttribute('hidden', '')
  openWorldMap()
})
resultNext?.addEventListener('click', () => {
  resultOverlay?.setAttribute('hidden', '')
  document.querySelector<HTMLButtonElement>('#nextButton')?.click()
})

window.addEventListener('neyro:stage-complete', event => {
  const detail = (event as CustomEvent).detail as { mastery:number; stars:number; moves:number; hints:number; elapsedSeconds:number; xpGain:number }
  const locale = currentLocale()
  const c = journeyCopy[locale]
  const stars = document.querySelector<HTMLElement>('#resultStars')
  const mastery = document.querySelector<HTMLElement>('#resultMastery')
  const moves = document.querySelector<HTMLElement>('#resultMoves')
  const time = document.querySelector<HTMLElement>('#resultTime')
  const hints = document.querySelector<HTMLElement>('#resultHints')
  const xp = document.querySelector<HTMLElement>('#resultXp')
  if (stars) stars.textContent = '★'.repeat(detail.stars) + '☆'.repeat(3 - detail.stars)
  if (mastery) mastery.textContent = localizedNumber(detail.mastery)
  if (moves) moves.textContent = localizedNumber(detail.moves)
  if (time) time.textContent = localizedNumber(detail.elapsedSeconds) + (locale === 'fa' ? ' ث' : 's')
  if (hints) hints.textContent = localizedNumber(detail.hints)
  if (xp) xp.textContent = '+' + localizedNumber(detail.xpGain) + ' XP'
  const kicker = document.querySelector<HTMLElement>('#resultKicker')
  const title = document.querySelector<HTMLElement>('#resultTitle')
  if (kicker) kicker.textContent = c.stageComplete
  if (title) title.textContent = c.restored
  document.querySelector<HTMLElement>('#resultMovesLabel')!.textContent = c.moves
  document.querySelector<HTMLElement>('#resultTimeLabel')!.textContent = c.time
  document.querySelector<HTMLElement>('#resultHintsLabel')!.textContent = c.hints
  if (resultWorlds) resultWorlds.textContent = c.worlds
  if (resultNext) resultNext.textContent = c.nextStage
  window.setTimeout(() => resultOverlay?.removeAttribute('hidden'), 180)
})

window.addEventListener('storage', event => {
  if (event.key === 'neyro.locale') applyJourneyLocale()
})
document.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click', () => window.setTimeout(applyJourneyLocale, 0))
applyJourneyLocale()
