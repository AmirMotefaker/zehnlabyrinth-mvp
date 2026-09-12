export {}

type Locale='fa'|'en'
const overlay=document.querySelector<HTMLElement>('#sensoryOverlay')
const button=document.querySelector<HTMLButtonElement>('#sensoryButton')
const close=document.querySelector<HTMLButtonElement>('#sensoryClose')
const sound=document.querySelector<HTMLInputElement>('#soundToggle')
const haptics=document.querySelector<HTMLInputElement>('#hapticsToggle')
const motion=document.querySelector<HTMLInputElement>('#motionToggle')
const contrast=document.querySelector<HTMLInputElement>('#contrastToggle')
const locale=():Locale=>(localStorage.getItem('neyro.locale')||'fa') as Locale
const bool=(k:string,d=true)=>(localStorage.getItem(k)??String(d))==='true'
const save=(k:string,v:boolean)=>localStorage.setItem(k,String(v))
function apply(){
  document.body.classList.toggle('neyro-reduced-motion',!!motion?.checked)
  document.body.classList.toggle('neyro-high-contrast',!!contrast?.checked)
}
function labels(){const fa=locale()==='fa'; const map:any={sensoryTitle:fa?'تنظیمات تجربه':'Experience settings',soundLabel:fa?'صدا':'Sound',hapticsLabel:fa?'لرزش':'Haptics',motionLabel:fa?'حرکت کمتر':'Reduced motion',contrastLabel:fa?'کنتراست بالا':'High contrast'};Object.entries(map).forEach(([id,v])=>{const n=document.getElementById(id);if(n)n.textContent=String(v)}); if(button)button.setAttribute('aria-label',fa?'تنظیمات دسترسی':'Accessibility settings')}
if(sound)sound.checked=bool('neyro.sound',true);if(haptics)haptics.checked=bool('neyro.haptics',true);if(motion)motion.checked=bool('neyro.reducedMotion',false)||matchMedia('(prefers-reduced-motion: reduce)').matches;if(contrast)contrast.checked=bool('neyro.highContrast',false);apply();labels()
button?.addEventListener('click',()=>overlay?.removeAttribute('hidden'));close?.addEventListener('click',()=>overlay?.setAttribute('hidden',''))
for(const [el,key] of [[sound,'neyro.sound'],[haptics,'neyro.haptics'],[motion,'neyro.reducedMotion'],[contrast,'neyro.highContrast']] as const){el?.addEventListener('change',()=>{save(key,el.checked);apply()})}
function vibrate(pattern:number|number[]){if(haptics?.checked&&'vibrate'in navigator)navigator.vibrate(pattern)}
function tone(freq:number,duration=.045){if(!sound?.checked)return;try{const C=(window.AudioContext||(window as any).webkitAudioContext);const c=new C();const o=c.createOscillator();const g=c.createGain();o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.stop(c.currentTime+duration)}catch{}}
window.addEventListener('neyro:tile-rotated',()=>{tone(520,.035);vibrate(10)})
window.addEventListener('neyro:pulse-fired',()=>{tone(330,.055);vibrate(14)})
window.addEventListener('neyro:stage-complete',()=>{tone(740,.12);setTimeout(()=>tone(980,.16),90);vibrate([20,35,35])})
document.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click',()=>setTimeout(labels,0))
