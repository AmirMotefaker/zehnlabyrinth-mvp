import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const htmlPath = 'phaser/index.html'
const cssPath = 'phaser/src/world-class.css'
const html = fs.readFileSync(htmlPath, 'utf8')
let css = fs.readFileSync(cssPath, 'utf8')

const marker = '<main class="world-shell">'
if (!html.includes(marker)) throw new Error('world-shell marker not found')
if (html.includes('id="journeyHome"')) throw new Error('Issue #108 shell already applied')

const home = `<section id="journeyHome" class="journey-home" aria-label="NEYRO journey">
  <div class="journey-orbit" aria-hidden="true"></div>
  <div class="journey-hero">
    <div class="journey-logo">NEYRO</div>
    <div class="journey-tagline">هزارتوی ذهن · Mind Labyrinth</div>
    <h1>شبکه را بیدار کن.</h1>
    <p>کاشی‌ها را بچرخان، پالس را هدایت کن و جهان‌های NEYRO را یکی‌یکی روشن کن.</p>
    <div class="journey-actions">
      <button id="journeyContinue" class="journey-primary" type="button">ادامه مسیر</button>
      <button id="journeyNew" type="button">شروع سفر جدید</button>
    </div>
    <div class="journey-meta"><span>۲۲۵٬۰۰۰ مرحله</span><span>۵۰ فصل</span><span>فارسی · English</span></div>
  </div>
</section>

<div id="journeyTutorial" class="journey-tutorial" hidden>
  <div class="journey-tutorial-card">
    <span class="journey-step">01 / 03</span>
    <strong>مسیر نور را بساز</strong>
    <p>از ◆ آغاز کن. هر کاشی را بچرخان تا اتصال نور به ★ برسد.</p>
    <button id="journeyTutorialNext" class="journey-primary" type="button">فهمیدم، شروع کنیم</button>
  </div>
</div>

`
fs.writeFileSync(htmlPath, html.replace(marker, home + marker))

css += `
/* Issue #108 — first-session commercial journey */
.journey-home{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 38%,rgba(28,224,207,.16),transparent 32%),linear-gradient(145deg,#050b14,#081522 55%,#061019);color:#f4fbff;padding:24px;text-align:center}.journey-home[hidden]{display:none}.journey-orbit{position:absolute;width:min(70vw,760px);aspect-ratio:1;border:1px solid rgba(78,231,218,.18);border-radius:50%;box-shadow:0 0 120px rgba(37,217,205,.08),inset 0 0 90px rgba(37,217,205,.05)}.journey-orbit:before,.journey-orbit:after{content:"";position:absolute;inset:14%;border:1px solid rgba(111,133,255,.14);border-radius:50%;transform:rotate(45deg)}.journey-orbit:after{inset:29%;border-color:rgba(55,232,198,.22);transform:rotate(-25deg)}.journey-hero{position:relative;z-index:1;width:min(680px,100%)}.journey-logo{font:800 clamp(46px,8vw,86px)/.9 system-ui;letter-spacing:.16em;margin-inline-start:.16em}.journey-tagline{margin-top:14px;opacity:.7;letter-spacing:.04em}.journey-hero h1{font-size:clamp(28px,4vw,48px);margin:46px 0 12px}.journey-hero p{max-width:560px;margin:0 auto;color:#b9c9d5;line-height:1.9;font-size:16px}.journey-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:34px}.journey-actions button,.journey-tutorial-card button{min-height:52px;border-radius:16px;border:1px solid rgba(150,190,205,.2);padding:0 26px;background:rgba(255,255,255,.06);color:inherit;font-weight:800;cursor:pointer}.journey-actions .journey-primary,.journey-primary{background:linear-gradient(135deg,#24d9c8,#41aee8);color:#031116;border:0;box-shadow:0 12px 42px rgba(36,217,200,.22)}.journey-meta{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin-top:34px;color:#7893a5;font-size:13px}.journey-tutorial{position:fixed;inset:0;z-index:10001;display:grid;place-items:center;background:rgba(2,8,14,.76);backdrop-filter:blur(14px);padding:20px}.journey-tutorial[hidden]{display:none}.journey-tutorial-card{width:min(440px,100%);border:1px solid rgba(67,224,208,.24);border-radius:28px;padding:34px;background:#091521;color:#edfaff;box-shadow:0 30px 100px rgba(0,0,0,.45);text-align:center}.journey-step{display:inline-block;color:#3bdccc;font-weight:900;letter-spacing:.12em;margin-bottom:18px}.journey-tutorial-card strong{display:block;font-size:25px}.journey-tutorial-card p{color:#a9bdca;line-height:1.9;margin:14px 0 26px}@media(max-width:640px){.journey-meta{gap:12px}.journey-hero h1{margin-top:34px}.journey-actions{display:grid}.journey-actions button{width:min(330px,86vw)}}
`
fs.writeFileSync(cssPath, css)

const bootPath = 'phaser/src/journey-ui.ts'
fs.writeFileSync(bootPath, `const home = document.querySelector<HTMLElement>('#journeyHome')\nconst tutorial = document.querySelector<HTMLElement>('#journeyTutorial')\nconst continueButton = document.querySelector<HTMLButtonElement>('#journeyContinue')\nconst newButton = document.querySelector<HTMLButtonElement>('#journeyNew')\nconst tutorialNext = document.querySelector<HTMLButtonElement>('#journeyTutorialNext')\n\nconst hasJourney = localStorage.getItem('neyro.journeyStarted') === '1'\nif (continueButton) continueButton.textContent = hasJourney ? 'ادامه مسیر' : 'شروع بازی'\n\ncontinueButton?.addEventListener('click', () => {\n  if (hasJourney || localStorage.getItem('neyro.tutorialComplete') === '1') { home?.setAttribute('hidden', '') }\n  else { home?.setAttribute('hidden', ''); tutorial?.removeAttribute('hidden') }\n})\nnewButton?.addEventListener('click', () => { home?.setAttribute('hidden', ''); tutorial?.removeAttribute('hidden') })\ntutorialNext?.addEventListener('click', () => { localStorage.setItem('neyro.journeyStarted','1'); tutorial?.setAttribute('hidden','') })\n`)

let patched = fs.readFileSync(htmlPath, 'utf8')
patched = patched.replace('<script type="module" src="/src/ui-preferences.ts"></script>', '<script type="module" src="/src/journey-ui.ts"></script>\n    <script type="module" src="/src/ui-preferences.ts"></script>')
fs.writeFileSync(htmlPath, patched)

console.log('\n=== ISSUE #108 — FIRST SESSION LOOP SLICE 1 ===')
console.log('main / production untouched')
console.log('\n=== PATCHED ===')
execFileSync('git', ['status','--short'], {stdio:'inherit'})
console.log('\nRun CI/build, inspect preview, then commit only after validation.')
