const q=(s)=>document.querySelector(s);
const fa=(v)=>String(v).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const ageLabels=['۵ تا ۸ سال','۹ تا ۱۷ سال','۱۸ سال به بالا'];
const ageSelect=q('#ageSelect');
const diffSelect=q('#difficultySelect');
const chapterSelect=q('#chapterSelect');
const stageInput=q('#stageInput');
const goStage=q('#goStage');
const control=q('.control-panel');

if(control) control.hidden=true;

const nav=document.createElement('section');
nav.className='player-nav';
nav.innerHTML=`<div class="player-nav-main"><button id="homeBtn" class="nav-icon" aria-label="صفحه اصلی">⌂</button><div><span class="eyebrow">NEYRO</span><strong>هزارتوی ذهن</strong></div></div><div class="player-nav-actions"><button id="chaptersBtn" class="nav-button">فصل‌ها</button><button id="pauseBtn" class="nav-button">مکث</button></div>`;
q('#app')?.prepend(nav);

const panel=document.createElement('section');
panel.className='chapter-panel';
panel.hidden=true;
panel.innerHTML=`<div class="panel-head"><div><span class="eyebrow">مسیر پیشرفت</span><h2>فصل‌ها</h2></div><button id="closeChapters" class="nav-icon" aria-label="بستن">×</button></div><div id="chapterGrid" class="chapter-grid"></div>`;
q('#app')?.prepend(panel);

const grid=q('#chapterGrid');
if(grid&&chapterSelect){
  [...chapterSelect.options].forEach((o,i)=>{
    const b=document.createElement('button');
    b.className='chapter-card';
    b.innerHTML=`<span class="chapter-number">${fa(i+1)}</span><span><strong>فصل ${fa(i+1)}</strong><small>${o.textContent.split('—')[1]?.trim()||''}</small></span><span class="chapter-arrow">←</span>`;
    b.onclick=()=>{chapterSelect.value=String(i);chapterSelect.dispatchEvent(new Event('change'));panel.hidden=true;window.scrollTo({top:0,behavior:'smooth'});};
    grid.append(b);
  });
}

const home=document.createElement('section');
home.className='home-panel';
home.hidden=true;
home.innerHTML=`<div class="home-card"><span class="eyebrow">شبکه نور آماده است</span><h2>ادامه بده</h2><p id="homeSummary">مرحله بعدی تو آماده است.</p><div class="home-actions"><button id="continueBtn" class="primary">ادامه بازی</button><button id="homeChapters" class="secondary">انتخاب فصل</button></div></div>`;
q('#app')?.prepend(home);

function openHome(){panel.hidden=true;home.hidden=false;const saved=JSON.parse(localStorage.getItem('neyro:last')||'null');const s=saved?.stage||1;q('#homeSummary').textContent=`مرحله ${fa(s)} از مسیر فعلی آماده است.`;}
function closeHome(){home.hidden=true;}
q('#homeBtn')?.addEventListener('click',openHome);
q('#continueBtn')?.addEventListener('click',closeHome);
q('#homeChapters')?.addEventListener('click',()=>{home.hidden=true;panel.hidden=false;});
q('#chaptersBtn')?.addEventListener('click',()=>{home.hidden=true;panel.hidden=!panel.hidden;});
q('#closeChapters')?.addEventListener('click',()=>panel.hidden=true);

let paused=false;
const pauseOverlay=document.createElement('div');
pauseOverlay.className='pause-overlay';
pauseOverlay.hidden=true;
pauseOverlay.innerHTML='<div class="pause-card"><span class="eyebrow">بازی متوقف است</span><h2>مکث</h2><p>وقتی آماده بودی، ادامه بده.</p><button id="resumeBtn" class="primary">ادامه بازی</button></div>';
document.body.append(pauseOverlay);
function togglePause(){paused=!paused;pauseOverlay.hidden=!paused;q('#pauseBtn').textContent=paused?'ادامه':'مکث';document.body.classList.toggle('game-paused',paused);}
q('#pauseBtn')?.addEventListener('click',togglePause);
q('#resumeBtn')?.addEventListener('click',togglePause);

// First-session age selection is player-facing; the developer controls remain hidden.
if(!localStorage.getItem('neyro:age-selected')){
  const ageModal=document.createElement('div');ageModal.className='modal age-modal';
  ageModal.innerHTML=`<div class="modal-card age-card"><span class="eyebrow">شروع سفر</span><h2>رده سنی را انتخاب کن</h2><p>با انتخاب رده سنی، اندازه و پیچیدگی مسیرها برایت تنظیم می‌شود.</p><div class="age-grid">${ageLabels.map((x,i)=>`<button class="age-choice" data-age="${i}"><strong>${x}</strong><small>${['شروع ساده و دیداری','چالش متعادل و سریع','حل مسئله عمیق‌تر'][i]}</small></button>`).join('')}</div></div>`;
  document.body.append(ageModal);
  ageModal.querySelectorAll('.age-choice').forEach(b=>b.onclick=()=>{ageSelect.value=b.dataset.age;ageSelect.dispatchEvent(new Event('change'));localStorage.setItem('neyro:age-selected','1');ageModal.remove();});
}

// Keyboard navigation: escape closes player panels; enter activates focused controls naturally.
document.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;home.hidden=true;if(paused)togglePause();}});
