import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const indexPath = 'phaser/index.html'
const mainPath = 'phaser/src/main.ts'
const cssPath = 'phaser/src/world-class.css'
const profilePath = 'phaser/src/profile-ui.ts'

let html = fs.readFileSync(indexPath, 'utf8')
let main = fs.readFileSync(mainPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

if (!html.includes('id="profileButton"')) {
  html = html.replace(
    '<button id="worldMapButton" class="compact" type="button" aria-label="نقشه جهان‌ها">◈</button>',
    '<button id="worldMapButton" class="compact" type="button" aria-label="نقشه جهان‌ها">◈</button>\n        <button id="profileButton" class="compact profile-open" type="button" aria-label="پروفایل بازیکن">◎</button>'
  )
}

if (!html.includes('id="profileOverlay"')) {
  const marker = '<section id="resultOverlay" class="journey-overlay" hidden aria-label="Stage result">'
  const overlay = `<section id="profileOverlay" class="journey-overlay" hidden aria-label="Player profile">
        <div class="journey-panel profile-panel">
          <div class="journey-panel-head"><div><small>NEYRO ID</small><h2 id="profileTitle">پروفایل بازیکن</h2></div><button id="profileClose" type="button" aria-label="بستن">×</button></div>
          <section class="profile-hero-card">
            <div class="profile-avatar">N</div>
            <div><small id="profileLevelLabel">سطح</small><strong id="profileLevel">۱</strong><span id="profileXp">۰ XP</span></div>
          </section>
          <div class="profile-stat-grid">
            <span><strong id="profileStages">۰</strong><small id="profileStagesLabel">مراحل کامل</small></span>
            <span><strong id="profileStars">۰</strong><small id="profileStarsLabel">ستاره‌ها</small></span>
            <span><strong id="profileBest">۰</strong><small id="profileBestLabel">بهترین مهارت</small></span>
            <span><strong id="profileAchievementsCount">۰/۶</strong><small id="profileAchievementsLabel">دستاوردها</small></span>
          </div>
          <div class="profile-section-head"><h3 id="achievementsTitle">دستاوردها</h3><small id="achievementsCopy">پیشرفت واقعی تو در NEYRO</small></div>
          <div id="achievementGrid" class="achievement-grid"></div>
        </div>
      </section>\n\n      `
  if (!html.includes(marker)) throw new Error('result overlay marker not found')
  html = html.replace(marker, overlay + marker)
}

if (!html.includes('/src/profile-ui.ts')) {
  html = html.replace('<script type="module" src="/src/journey-ui.ts"></script>', '<script type="module" src="/src/journey-ui.ts"></script>\n    <script type="module" src="/src/profile-ui.ts"></script>')
}

if (!main.includes('stageId: this.stage.id')) {
  const from = 'stageNumber: this.stageNumber, chapter: this.stage.chapter, mastery: this.masteryScore, stars: this.stars,'
  const to = 'stageId: this.stage.id, stageNumber: this.stageNumber, chapter: this.stage.chapter, mastery: this.masteryScore, stars: this.stars,'
  if (!main.includes(from)) throw new Error('stage complete detail marker not found')
  main = main.replace(from, to)
}

fs.writeFileSync(indexPath, html)
fs.writeFileSync(mainPath, main)

fs.writeFileSync(profilePath, `type Locale = 'fa' | 'en'\n\ntype StageCompleteDetail = {\n  stageId: string\n  stageNumber: number\n  chapter: number\n  mastery: number\n  stars: number\n  moves: number\n  hints: number\n  elapsedSeconds: number\n  xpGain: number\n  totalXp: number\n}\n\nconst profileOverlay = document.querySelector<HTMLElement>('#profileOverlay')\nconst profileButton = document.querySelector<HTMLButtonElement>('#profileButton')\nconst profileClose = document.querySelector<HTMLButtonElement>('#profileClose')\nconst faDigits = '۰۱۲۳۴۵۶۷۸۹'\nconst locale = (): Locale => (localStorage.getItem('neyro.locale') || 'fa') as Locale\nconst digits = (value: number | string) => locale() === 'fa' ? String(value).replace(/\\d/g, d => faDigits[Number(d)]) : String(value)\n\nconst achievements = [\n  { id: 'first-light', fa: 'اولین نور', en: 'First Light', faCopy: 'اولین مرحله را کامل کن.', enCopy: 'Complete your first stage.' },\n  { id: 'perfect-circuit', fa: 'مدار بی‌نقص', en: 'Perfect Circuit', faCopy: 'در یک مرحله ۳ ستاره بگیر.', enCopy: 'Earn 3 stars on a stage.' },\n  { id: 'clean-run', fa: 'حل پاک', en: 'Clean Run', faCopy: 'یک مرحله را بدون راهنما حل کن.', enCopy: 'Solve a stage without hints.' },\n  { id: 'pathfinder', fa: 'مسیرشناس', en: 'Pathfinder', faCopy: '۱۰ مرحله را کامل کن.', enCopy: 'Complete 10 stages.' },\n  { id: 'mastery-900', fa: 'استاد ۹۰۰', en: 'Mastery 900', faCopy: 'به امتیاز مهارت ۹۰۰ برس.', enCopy: 'Reach 900 mastery.' },\n  { id: 'explorer', fa: 'کاوشگر', en: 'Explorer', faCopy: 'در بیش از یک فصل پیشرفت کن.', enCopy: 'Progress across multiple chapters.' }\n] as const\n\nfunction completedStageIds() {\n  return Object.keys(localStorage).filter(key => key.startsWith('neyro.complete.') && localStorage.getItem(key) === '1').map(key => key.slice('neyro.complete.'.length))\n}\nfunction bestMastery() {\n  let best = 0\n  for (let i = 0; i < localStorage.length; i += 1) {\n    const key = localStorage.key(i)\n    if (key?.startsWith('neyro.best.')) best = Math.max(best, Number(localStorage.getItem(key) || 0))\n  }\n  return best\n}\nfunction totalStars() {\n  let total = 0\n  for (let i = 0; i < localStorage.length; i += 1) {\n    const key = localStorage.key(i)\n    if (key?.startsWith('neyro.stars.')) total += Number(localStorage.getItem(key) || 0)\n  }\n  return total\n}\nfunction unlockedSet() {\n  return new Set((localStorage.getItem('neyro.achievements') || '').split(',').filter(Boolean))\n}\nfunction saveUnlocked(set: Set<string>) { localStorage.setItem('neyro.achievements', Array.from(set).join(',')) }\nfunction levelFromXp(xp: number) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1) }\n\nfunction evaluateAchievements(detail?: StageCompleteDetail) {\n  const set = unlockedSet()\n  const before = new Set(set)\n  const completed = completedStageIds().length\n  const chapters = new Set(completedStageIds().map(id => id.match(/-(\\d+)-/)?.[1]).filter(Boolean)).size\n  if (completed >= 1) set.add('first-light')\n  if (detail?.stars === 3 || totalStars() >= 3) set.add('perfect-circuit')\n  if (detail && detail.hints === 0) set.add('clean-run')\n  if (completed >= 10) set.add('pathfinder')\n  if ((detail?.mastery || 0) >= 900 || bestMastery() >= 900) set.add('mastery-900')\n  if (chapters >= 2 || Number(localStorage.getItem('neyro.stage') || 1) > 500) set.add('explorer')\n  saveUnlocked(set)\n  return Array.from(set).filter(id => !before.has(id))\n}\n\nfunction applyProfileLocale() {\n  const fa = locale() === 'fa'\n  const text: Record<string, string> = {\n    profileTitle: fa ? 'پروفایل بازیکن' : 'Player profile',\n    profileLevelLabel: fa ? 'سطح' : 'Level',\n    profileStagesLabel: fa ? 'مراحل کامل' : 'Stages cleared',\n    profileStarsLabel: fa ? 'ستاره‌ها' : 'Stars',\n    profileBestLabel: fa ? 'بهترین مهارت' : 'Best mastery',\n    profileAchievementsLabel: fa ? 'دستاوردها' : 'Achievements',\n    achievementsTitle: fa ? 'دستاوردها' : 'Achievements',\n    achievementsCopy: fa ? 'پیشرفت واقعی تو در NEYRO' : 'Your real progress in NEYRO'\n  }\n  Object.entries(text).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value })\n  if (profileButton) { profileButton.textContent = fa ? 'پروفایل' : 'Profile'; profileButton.setAttribute('aria-label', fa ? 'پروفایل بازیکن' : 'Player profile') }\n}\n\nfunction renderProfile() {\n  applyProfileLocale()\n  const xp = Math.max(0, Number(localStorage.getItem('neyro.xp') || 0))\n  const completed = completedStageIds().length\n  const unlocked = unlockedSet()\n  const level = levelFromXp(xp)\n  const set = (id: string, value: string) => { const node = document.getElementById(id); if (node) node.textContent = value }\n  set('profileLevel', digits(level))\n  set('profileXp', digits(xp) + ' XP')\n  set('profileStages', digits(completed))\n  set('profileStars', digits(totalStars()))\n  set('profileBest', digits(bestMastery()))\n  set('profileAchievementsCount', digits(unlocked.size) + '/' + digits(achievements.length))\n  const grid = document.querySelector<HTMLElement>('#achievementGrid')\n  grid?.replaceChildren()\n  achievements.forEach(item => {\n    const unlockedNow = unlocked.has(item.id)\n    const card = document.createElement('article')\n    card.className = 'achievement-card ' + (unlockedNow ? 'unlocked' : 'locked')\n    const fa = locale() === 'fa'\n    card.innerHTML = '<span class="achievement-icon">' + (unlockedNow ? '✦' : '◇') + '</span><div><strong>' + (fa ? item.fa : item.en) + '</strong><small>' + (fa ? item.faCopy : item.enCopy) + '</small></div>'\n    grid?.append(card)\n  })\n}\n\nprofileButton?.addEventListener('click', () => { renderProfile(); profileOverlay?.removeAttribute('hidden') })\nprofileClose?.addEventListener('click', () => profileOverlay?.setAttribute('hidden', ''))\n\nwindow.addEventListener('neyro:stage-complete', event => {\n  const detail = (event as CustomEvent<StageCompleteDetail>).detail\n  const previousStars = Number(localStorage.getItem('neyro.stars.' + detail.stageId) || 0)\n  if (detail.stars > previousStars) localStorage.setItem('neyro.stars.' + detail.stageId, String(detail.stars))\n  localStorage.setItem('neyro.mastery.' + detail.stageId, String(Math.max(detail.mastery, Number(localStorage.getItem('neyro.mastery.' + detail.stageId) || 0))))\n  const fresh = evaluateAchievements(detail)\n  if (fresh.length) {\n    const toast = document.createElement('div')\n    toast.className = 'achievement-toast'\n    toast.textContent = (locale() === 'fa' ? 'دستاورد جدید: ' : 'Achievement unlocked: ') + fresh.map(id => { const item = achievements.find(a => a.id === id)!; return locale() === 'fa' ? item.fa : item.en }).join(' · ')\n    document.body.append(toast)\n    window.setTimeout(() => toast.remove(), 3400)\n  }\n  renderProfile()\n})\n\ndocument.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click', () => window.setTimeout(renderProfile, 0))\nevaluateAchievements()\nrenderProfile()\n`)

if (!css.includes('Issue #114 — player profile')) {
  css += `\n/* Issue #114 — player profile + achievements */\n.profile-panel{width:min(760px,94vw)}.profile-hero-card{display:flex;align-items:center;gap:18px;padding:20px;border-radius:22px;background:linear-gradient(135deg,rgba(47,222,205,.14),rgba(92,113,255,.12));border:1px solid rgba(85,225,210,.18);margin:18px 0}.profile-avatar{width:74px;height:74px;border-radius:24px;display:grid;place-items:center;font-size:34px;font-weight:900;background:#0d2432;border:1px solid rgba(87,238,218,.35);color:#62edd8}.profile-hero-card div:last-child{display:grid;gap:2px}.profile-hero-card strong{font-size:34px;line-height:1}.profile-hero-card span{opacity:.72}.profile-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.profile-stat-grid>span{padding:16px;border-radius:18px;background:rgba(255,255,255,.045);border:1px solid rgba(140,180,195,.13);display:grid;gap:4px;text-align:center}.profile-stat-grid strong{font-size:24px}.profile-stat-grid small{opacity:.68}.profile-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:24px 0 12px}.profile-section-head h3{margin:0}.profile-section-head small{opacity:.58}.achievement-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.achievement-card{display:flex;gap:12px;align-items:center;padding:15px;border-radius:18px;border:1px solid rgba(150,190,205,.13);background:rgba(255,255,255,.035)}.achievement-card.locked{opacity:.46;filter:saturate(.45)}.achievement-card.unlocked{border-color:rgba(88,237,209,.35);background:rgba(45,221,198,.08)}.achievement-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:rgba(255,255,255,.06);font-size:21px}.achievement-card div{display:grid;gap:3px}.achievement-card small{opacity:.64;line-height:1.5}.achievement-toast{position:fixed;z-index:12000;left:50%;top:24px;transform:translateX(-50%);max-width:min(560px,90vw);padding:13px 18px;border-radius:16px;background:#102b30;color:#ecfffb;border:1px solid rgba(81,237,211,.4);box-shadow:0 18px 55px rgba(0,0,0,.35);font-weight:800;text-align:center}.profile-open{min-width:84px}@media(max-width:720px){.profile-stat-grid{grid-template-columns:repeat(2,1fr)}.achievement-grid{grid-template-columns:1fr}.profile-panel{max-height:86vh;overflow:auto}.profile-section-head{align-items:start;flex-direction:column}}\n`
  fs.writeFileSync(cssPath, css)
}

console.log('\n=== ISSUE #114 — PROFILE + ACHIEVEMENTS ===')
console.log('main / production untouched')
execFileSync('git', ['status','--short'], {stdio:'inherit'})
console.log('\nPatch ready. Run diff check, then commit/push only after validation.')
