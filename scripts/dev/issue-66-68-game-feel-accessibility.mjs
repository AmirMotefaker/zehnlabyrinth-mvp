import fs from 'node:fs'

const htmlPath='phaser/index.html'
const mainPath='phaser/src/main.ts'
const cssPath='phaser/src/world-class.css'
let html=fs.readFileSync(htmlPath,'utf8')
let main=fs.readFileSync(mainPath,'utf8')
let css=fs.readFileSync(cssPath,'utf8')

if(!html.includes('id="sensoryButton"')){
  html=html.replace('<button id="profileButton"', '<button id="sensoryButton" class="compact" type="button" aria-label="تنظیمات دسترسی">◐</button>\n        <button id="profileButton"')
}
if(!html.includes('id="sensoryOverlay"')){
  html=html.replace('<section id="profileOverlay"', `<section id="sensoryOverlay" class="journey-overlay" hidden aria-label="Accessibility and sensory settings">
  <div class="journey-panel sensory-panel">
    <div class="journey-panel-head"><div><small>NEYRO COMFORT</small><h2 id="sensoryTitle">تنظیمات تجربه</h2></div><button id="sensoryClose" type="button">×</button></div>
    <div class="sensory-grid">
      <label><span id="soundLabel">صدا</span><input id="soundToggle" type="checkbox" checked></label>
      <label><span id="hapticsLabel">لرزش</span><input id="hapticsToggle" type="checkbox" checked></label>
      <label><span id="motionLabel">حرکت کمتر</span><input id="motionToggle" type="checkbox"></label>
      <label><span id="contrastLabel">کنتراست بالا</span><input id="contrastToggle" type="checkbox"></label>
    </div>
  </div>
</section>

<section id="profileOverlay"`)
}
if(!html.includes('/src/sensory-ui.ts')) html=html.replace('<script type="module" src="/src/profile-ui.ts"></script>', '<script type="module" src="/src/profile-ui.ts"></script>\n    <script type="module" src="/src/sensory-ui.ts"></script>')
fs.writeFileSync(htmlPath,html)

if(!main.includes("neyro:tile-rotated")) main=main.replace('this.updateHud(); this.updateScoreHud(); this.drawBoard()\n  }\n\n  private hint()', "this.updateHud(); this.updateScoreHud(); this.drawBoard()\n    window.dispatchEvent(new CustomEvent('neyro:tile-rotated'))\n  }\n\n  private hint()")
if(!main.includes("neyro:pulse-fired")) main=main.replace('this.setInteractionLocked(true); this.syncRuntimeRotations(); this.setStatus(copy[this.locale].sending)', "this.setInteractionLocked(true); this.syncRuntimeRotations(); this.setStatus(copy[this.locale].sending)\n    window.dispatchEvent(new CustomEvent('neyro:pulse-fired'))")
fs.writeFileSync(mainPath,main)

if(!css.includes('/* Issue #66/#68 */')) css += `
/* Issue #66/#68 */
.sensory-panel{width:min(560px,92vw)}.sensory-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.sensory-grid label{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border:1px solid rgba(125,180,200,.18);border-radius:16px;background:rgba(255,255,255,.04)}.sensory-grid input{width:20px;height:20px}.achievement-toast,.sensory-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:12000;padding:12px 18px;border-radius:14px;background:#0b1a26;color:#effcff;border:1px solid rgba(67,224,208,.32);box-shadow:0 18px 60px rgba(0,0,0,.35)}body.neyro-high-contrast{--neyro-contrast:1}body.neyro-high-contrast .panel,body.neyro-high-contrast .control-card,body.neyro-high-contrast .game-card{outline:2px solid currentColor}body.neyro-reduced-motion *,body.neyro-reduced-motion *::before,body.neyro-reduced-motion *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}:focus-visible{outline:3px solid #34e2d3!important;outline-offset:3px}@media(max-width:640px){.sensory-grid{grid-template-columns:1fr}}
`
fs.writeFileSync(cssPath,css)

const sensory=`export {}\n\ntype Locale='fa'|'en'\nconst overlay=document.querySelector<HTMLElement>('#sensoryOverlay')\nconst button=document.querySelector<HTMLButtonElement>('#sensoryButton')\nconst close=document.querySelector<HTMLButtonElement>('#sensoryClose')\nconst sound=document.querySelector<HTMLInputElement>('#soundToggle')\nconst haptics=document.querySelector<HTMLInputElement>('#hapticsToggle')\nconst motion=document.querySelector<HTMLInputElement>('#motionToggle')\nconst contrast=document.querySelector<HTMLInputElement>('#contrastToggle')\nconst locale=():Locale=>(localStorage.getItem('neyro.locale')||'fa') as Locale\nconst bool=(k:string,d=true)=>(localStorage.getItem(k)??String(d))==='true'\nconst save=(k:string,v:boolean)=>localStorage.setItem(k,String(v))\nfunction apply(){\n  document.body.classList.toggle('neyro-reduced-motion',!!motion?.checked)\n  document.body.classList.toggle('neyro-high-contrast',!!contrast?.checked)\n}\nfunction labels(){const fa=locale()==='fa'; const map:any={sensoryTitle:fa?'تنظیمات تجربه':'Experience settings',soundLabel:fa?'صدا':'Sound',hapticsLabel:fa?'لرزش':'Haptics',motionLabel:fa?'حرکت کمتر':'Reduced motion',contrastLabel:fa?'کنتراست بالا':'High contrast'};Object.entries(map).forEach(([id,v])=>{const n=document.getElementById(id);if(n)n.textContent=String(v)}); if(button)button.setAttribute('aria-label',fa?'تنظیمات دسترسی':'Accessibility settings')}\nif(sound)sound.checked=bool('neyro.sound',true);if(haptics)haptics.checked=bool('neyro.haptics',true);if(motion)motion.checked=bool('neyro.reducedMotion',false)||matchMedia('(prefers-reduced-motion: reduce)').matches;if(contrast)contrast.checked=bool('neyro.highContrast',false);apply();labels()\nbutton?.addEventListener('click',()=>overlay?.removeAttribute('hidden'));close?.addEventListener('click',()=>overlay?.setAttribute('hidden',''))\nfor(const [el,key] of [[sound,'neyro.sound'],[haptics,'neyro.haptics'],[motion,'neyro.reducedMotion'],[contrast,'neyro.highContrast']] as const){el?.addEventListener('change',()=>{save(key,el.checked);apply()})}\nfunction vibrate(pattern:number|number[]){if(haptics?.checked&&'vibrate'in navigator)navigator.vibrate(pattern)}\nfunction tone(freq:number,duration=.045){if(!sound?.checked)return;try{const C=(window.AudioContext||(window as any).webkitAudioContext);const c=new C();const o=c.createOscillator();const g=c.createGain();o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.stop(c.currentTime+duration)}catch{}}\nwindow.addEventListener('neyro:tile-rotated',()=>{tone(520,.035);vibrate(10)})\nwindow.addEventListener('neyro:pulse-fired',()=>{tone(330,.055);vibrate(14)})\nwindow.addEventListener('neyro:stage-complete',()=>{tone(740,.12);setTimeout(()=>tone(980,.16),90);vibrate([20,35,35])})\ndocument.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click',()=>setTimeout(labels,0))\n`
fs.writeFileSync('phaser/src/sensory-ui.ts',sensory)

console.log('=== ISSUE #66/#68 GAME FEEL + ACCESSIBILITY ===')
console.log('main / production untouched')
console.log('Patch ready; run diff check and CI before merge.')
