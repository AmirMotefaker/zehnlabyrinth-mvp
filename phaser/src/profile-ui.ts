export {}

type Locale = 'fa' | 'en'

type StageCompleteDetail = {
  stageId: string
  stageNumber: number
  chapter: number
  mastery: number
  stars: number
  moves: number
  hints: number
  elapsedSeconds: number
  xpGain: number
  totalXp: number
}

const profileOverlay = document.querySelector<HTMLElement>('#profileOverlay')
const profileButton = document.querySelector<HTMLButtonElement>('#profileButton')
const profileClose = document.querySelector<HTMLButtonElement>('#profileClose')
const faDigits = '۰۱۲۳۴۵۶۷۸۹'
const locale = (): Locale => (localStorage.getItem('neyro.locale') || 'fa') as Locale
const digits = (value: number | string) => locale() === 'fa' ? String(value).replace(/\d/g, d => faDigits[Number(d)]) : String(value)

const achievements = [
  { id: 'first-light', fa: 'اولین نور', en: 'First Light', faCopy: 'اولین مرحله را کامل کن.', enCopy: 'Complete your first stage.' },
  { id: 'perfect-circuit', fa: 'مدار بی‌نقص', en: 'Perfect Circuit', faCopy: 'در یک مرحله ۳ ستاره بگیر.', enCopy: 'Earn 3 stars on a stage.' },
  { id: 'clean-run', fa: 'حل پاک', en: 'Clean Run', faCopy: 'یک مرحله را بدون راهنما حل کن.', enCopy: 'Solve a stage without hints.' },
  { id: 'pathfinder', fa: 'مسیرشناس', en: 'Pathfinder', faCopy: '۱۰ مرحله را کامل کن.', enCopy: 'Complete 10 stages.' },
  { id: 'mastery-900', fa: 'استاد ۹۰۰', en: 'Mastery 900', faCopy: 'به امتیاز مهارت ۹۰۰ برس.', enCopy: 'Reach 900 mastery.' },
  { id: 'explorer', fa: 'کاوشگر', en: 'Explorer', faCopy: 'در بیش از یک فصل پیشرفت کن.', enCopy: 'Progress across multiple chapters.' }
] as const

function completedStageIds() {
  return Object.keys(localStorage).filter(key => key.startsWith('neyro.complete.') && localStorage.getItem(key) === '1').map(key => key.slice('neyro.complete.'.length))
}
function bestMastery() {
  let best = 0
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('neyro.best.')) best = Math.max(best, Number(localStorage.getItem(key) || 0))
  }
  return best
}
function totalStars() {
  let total = 0
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('neyro.stars.')) total += Number(localStorage.getItem(key) || 0)
  }
  return total
}
function unlockedSet() {
  return new Set((localStorage.getItem('neyro.achievements') || '').split(',').filter(Boolean))
}
function saveUnlocked(set: Set<string>) { localStorage.setItem('neyro.achievements', Array.from(set).join(',')) }
function levelFromXp(xp: number) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1) }

function evaluateAchievements(detail?: StageCompleteDetail) {
  const set = unlockedSet()
  const before = new Set(set)
  const completed = completedStageIds().length
  const chapters = new Set(completedStageIds().map(id => id.match(/-(\d+)-/)?.[1]).filter(Boolean)).size
  if (completed >= 1) set.add('first-light')
  if (detail?.stars === 3 || totalStars() >= 3) set.add('perfect-circuit')
  if (detail && detail.hints === 0) set.add('clean-run')
  if (completed >= 10) set.add('pathfinder')
  if ((detail?.mastery || 0) >= 900 || bestMastery() >= 900) set.add('mastery-900')
  if (chapters >= 2 || Number(localStorage.getItem('neyro.stage') || 1) > 500) set.add('explorer')
  saveUnlocked(set)
  return Array.from(set).filter(id => !before.has(id))
}

function applyProfileLocale() {
  const fa = locale() === 'fa'
  const text: Record<string, string> = {
    profileTitle: fa ? 'پروفایل بازیکن' : 'Player profile',
    profileLevelLabel: fa ? 'سطح' : 'Level',
    profileStagesLabel: fa ? 'مراحل کامل' : 'Stages cleared',
    profileStarsLabel: fa ? 'ستاره‌ها' : 'Stars',
    profileBestLabel: fa ? 'بهترین مهارت' : 'Best mastery',
    profileAchievementsLabel: fa ? 'دستاوردها' : 'Achievements',
    achievementsTitle: fa ? 'دستاوردها' : 'Achievements',
    achievementsCopy: fa ? 'پیشرفت واقعی تو در NEYRO' : 'Your real progress in NEYRO'
  }
  Object.entries(text).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value })
  if (profileButton) { profileButton.textContent = fa ? 'پروفایل' : 'Profile'; profileButton.setAttribute('aria-label', fa ? 'پروفایل بازیکن' : 'Player profile') }
}

function renderProfile() {
  applyProfileLocale()
  const xp = Math.max(0, Number(localStorage.getItem('neyro.xp') || 0))
  const completed = completedStageIds().length
  const unlocked = unlockedSet()
  const level = levelFromXp(xp)
  const set = (id: string, value: string) => { const node = document.getElementById(id); if (node) node.textContent = value }
  set('profileLevel', digits(level))
  set('profileXp', digits(xp) + ' XP')
  set('profileStages', digits(completed))
  set('profileStars', digits(totalStars()))
  set('profileBest', digits(bestMastery()))
  set('profileAchievementsCount', digits(unlocked.size) + '/' + digits(achievements.length))
  const grid = document.querySelector<HTMLElement>('#achievementGrid')
  grid?.replaceChildren()
  achievements.forEach(item => {
    const unlockedNow = unlocked.has(item.id)
    const card = document.createElement('article')
    card.className = 'achievement-card ' + (unlockedNow ? 'unlocked' : 'locked')
    const fa = locale() === 'fa'
    card.innerHTML = '<span class="achievement-icon">' + (unlockedNow ? '✦' : '◇') + '</span><div><strong>' + (fa ? item.fa : item.en) + '</strong><small>' + (fa ? item.faCopy : item.enCopy) + '</small></div>'
    grid?.append(card)
  })
}

profileButton?.addEventListener('click', () => { renderProfile(); profileOverlay?.removeAttribute('hidden') })
profileClose?.addEventListener('click', () => profileOverlay?.setAttribute('hidden', ''))

window.addEventListener('neyro:stage-complete', event => {
  const detail = (event as CustomEvent<StageCompleteDetail>).detail
  const previousStars = Number(localStorage.getItem('neyro.stars.' + detail.stageId) || 0)
  if (detail.stars > previousStars) localStorage.setItem('neyro.stars.' + detail.stageId, String(detail.stars))
  localStorage.setItem('neyro.mastery.' + detail.stageId, String(Math.max(detail.mastery, Number(localStorage.getItem('neyro.mastery.' + detail.stageId) || 0))))
  const fresh = evaluateAchievements(detail)
  if (fresh.length) {
    const toast = document.createElement('div')
    toast.className = 'achievement-toast'
    toast.textContent = (locale() === 'fa' ? 'دستاورد جدید: ' : 'Achievement unlocked: ') + fresh.map(id => { const item = achievements.find(a => a.id === id)!; return locale() === 'fa' ? item.fa : item.en }).join(' · ')
    document.body.append(toast)
    window.setTimeout(() => toast.remove(), 3400)
  }
  renderProfile()
})

document.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click', () => window.setTimeout(renderProfile, 0))
evaluateAchievements()
renderProfile()
