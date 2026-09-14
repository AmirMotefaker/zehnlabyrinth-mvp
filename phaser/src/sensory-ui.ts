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
function openSensory(){
  overlay?.removeAttribute('hidden')
  close?.focus()
}
function closeSensory(){
  if(!overlay||overlay.hasAttribute('hidden'))return
  overlay.setAttribute('hidden','')
  button?.focus()
}
button?.addEventListener('click',openSensory)
close?.addEventListener('click',closeSensory)
overlay?.addEventListener('click',event=>{if(event.target===overlay)closeSensory()})
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&overlay&&!overlay.hasAttribute('hidden')){
    event.preventDefault()
    closeSensory()
  }
})
for(const [el,key] of [[sound,'neyro.sound'],[haptics,'neyro.haptics'],[motion,'neyro.reducedMotion'],[contrast,'neyro.highContrast']] as const){el?.addEventListener('change',()=>{save(key,el.checked);apply()})}
function vibrate(pattern:number|number[]){if(haptics?.checked&&'vibrate'in navigator)navigator.vibrate(pattern)}
type NeyroAudioContext = AudioContext

let audioContext:NeyroAudioContext|null=null
let masterGain:GainNode|null=null
let audioUnlocked=false

function createAudioGraph():NeyroAudioContext|null{
  try{
    const C=window.AudioContext||(window as any).webkitAudioContext
    if(!C)return null

    if(!audioContext||audioContext.state==='closed'){
      audioContext=new C()
      masterGain=audioContext.createGain()
      masterGain.gain.value=.42
      masterGain.connect(audioContext.destination)
      audioUnlocked=false
    }

    return audioContext
  }catch{
    return null
  }
}

async function unlockAudio(){
  if(!sound?.checked)return false

  const c=createAudioGraph()
  if(!c)return false

  try{
    if(c.state==='suspended'){
      await c.resume()
    }

    audioUnlocked=c.state==='running'

    if(audioUnlocked){
      document.body.dataset.audioState='running'
    }else{
      document.body.dataset.audioState=c.state
    }

    return audioUnlocked
  }catch{
    document.body.dataset.audioState='error'
    return false
  }
}

function playTone(
  frequency:number,
  duration=.07,
  type:OscillatorType='triangle'
){
  if(!sound?.checked)return

  const c=createAudioGraph()
  if(!c||!masterGain)return

  const emit=()=>{
    if(c.state!=='running'||!masterGain)return

    try{
      const oscillator=c.createOscillator()
      const envelope=c.createGain()

      const now=c.currentTime
      const attack=.006
      const end=now+duration

      oscillator.type=type
      oscillator.frequency.setValueAtTime(frequency,now)

      envelope.gain.cancelScheduledValues(now)
      envelope.gain.setValueAtTime(.0001,now)
      envelope.gain.exponentialRampToValueAtTime(.22,now+attack)
      envelope.gain.exponentialRampToValueAtTime(.0001,end)

      oscillator.connect(envelope)
      envelope.connect(masterGain)

      oscillator.start(now)
      oscillator.stop(end+.01)

      oscillator.addEventListener('ended',()=>{
        try{oscillator.disconnect()}catch{}
        try{envelope.disconnect()}catch{}
      },{once:true})
    }catch{
      document.body.dataset.audioState='play-error'
    }
  }

  if(c.state==='running'){
    emit()
    return
  }

  void unlockAudio().then(ok=>{
    if(ok)emit()
  })
}

/*
 * Audio must be unlocked directly from a trusted user gesture.
 * Do not await anything before resume().
 */
function gestureUnlock(){
  if(!sound?.checked)return

  const c=createAudioGraph()
  if(!c)return

  try{
    if(c.state==='suspended'){
      void c.resume().then(()=>{
        audioUnlocked=c.state==='running'
        document.body.dataset.audioState=c.state
      }).catch(()=>{
        document.body.dataset.audioState='error'
      })
    }else{
      audioUnlocked=c.state==='running'
      document.body.dataset.audioState=c.state
    }
  }catch{
    document.body.dataset.audioState='error'
  }
}

window.addEventListener('pointerdown',gestureUnlock,{capture:true,passive:true})
window.addEventListener('touchstart',gestureUnlock,{capture:true,passive:true})
window.addEventListener('keydown',gestureUnlock,{capture:true})

sound?.addEventListener('change',()=>{
  if(sound.checked){
    gestureUnlock()
  }else{
    document.body.dataset.audioState='disabled'
  }
})
window.addEventListener('neyro:tile-rotated',()=>{playTone(620,.065,'triangle');vibrate(10)})
window.addEventListener('neyro:pulse-fired',()=>{playTone(360,.09,'sine');vibrate(14)})
window.addEventListener('neyro:stage-complete',()=>{playTone(740,.14,'triangle');setTimeout(()=>playTone(980,.18,'triangle'),100);vibrate([20,35,35])})
document.querySelector<HTMLButtonElement>('#localeButton')?.addEventListener('click',()=>setTimeout(labels,0))
