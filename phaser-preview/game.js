const $ = (q) => document.querySelector(q);
const faDigits = (v) => String(v).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const faNum = (v) => faDigits(Number(v).toLocaleString('en-US'));
const ageNames = ['۵ تا ۸ سال','۹ تا ۱۷ سال','۱۸ سال به بالا'];
const diffNames = ['ساده','متوسط','سخت'];
const mechanicNames = ['مسیر و چرخش','گوشه‌ها و انحراف','مسیرهای فریبنده','رله‌های شماره‌دار','حافظه چندپالسی','آینه شارژشونده','دروازه فاز','شبکه ترکیبی'];

const boardEl = $('#board');
const movesEl = $('#moves');
const scoreEl = $('#score');
const timeEl = $('#time');
const stageStatEl = $('#stageStat');
const statusEl = $('#status');
const ageSelect = $('#ageSelect');
const difficultySelect = $('#difficultySelect');
const chapterSelect = $('#chapterSelect');
const stageInput = $('#stageInput');
const trackTitle = $('#trackTitle');
const chapterTitle = $('#chapterTitle');
const progressText = $('#progressText');
const progressBar = $('#progressBar');
const mechanicEl = $('#mechanic');
const parEl = $('#par');
const result = $('#result');
const resultSummary = $('#resultSummary');
const starsEl = $('#stars');

for (let i=1;i<=8;i++) chapterSelect.add(new Option(`فصل ${faDigits(i)} — ${mechanicNames[i-1]}`, String(i-1)));

let state = {age:0,diff:0,stage:1,chapter:0,moves:0,hints:0,pulses:0,seconds:0,score:1000,solved:false,history:[],level:null,timer:null};

function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function stageSeed(age,diff,stage){return ((age+1)*1000003+(diff+1)*10007+stage*97)>>>0}
function key(r,c){return `${r}-${c}`}

function findPath(seed,n,minLen){
  for(let attempt=0;attempt<40;attempt++){
    const rng=mulberry32(seed+attempt*7919), start=[0,n-1], goal=[n-1,0], seen=new Set([key(...start)]), path=[start];
    function dfs(r,c){
      if(r===goal[0]&&c===goal[1]) return path.length>=minLen;
      let dirs=shuffle([[-1,0],[0,1],[1,0],[0,-1]],rng);
      dirs.sort((a,b)=>{
        const ar=r+a[0],ac=c+a[1],br=r+b[0],bc=c+b[1];
        const da=Math.abs(goal[0]-ar)+Math.abs(goal[1]-ac),db=Math.abs(goal[0]-br)+Math.abs(goal[1]-bc);
        return rng()>.62 ? da-db : db-da;
      });
      for(const [dr,dc] of dirs){
        const nr=r+dr,nc=c+dc,k=key(nr,nc);
        if(nr<0||nc<0||nr>=n||nc>=n||seen.has(k)) continue;
        if(nr===goal[0]&&nc===goal[1]&&path.length+1<minLen) continue;
        seen.add(k);path.push([nr,nc]);
        if(dfs(nr,nc)) return true;
        path.pop();seen.delete(k);
      }
      return false;
    }
    if(dfs(...start)) return path.slice();
  }
  const fallback=[];for(let c=n-1;c>=0;c--) fallback.push([0,c]);for(let r=1;r<n;r++) fallback.push([r,0]);return fallback;
}

function dir(a,b){const dr=b[0]-a[0],dc=b[1]-a[1];if(dr===-1)return 0;if(dc===1)return 1;if(dr===1)return 2;return 3}
function pieceFor(prev,cur,next){
  const d1=dir(cur,prev),d2=dir(cur,next);
  if(Math.abs(d1-d2)===2) return {type:'straight',target:(d1===0||d1===2)?1:0};
  const pair=[d1,d2].sort((a,b)=>a-b).join(',');
  const map={'0,1':0,'1,2':1,'2,3':2,'0,3':3};
  return {type:'elbow',target:map[pair]??0};
}

function buildLevel(){
  const {age,diff,stage}=state;
  const chapter=Math.floor((stage-1)/125);
  const n=Math.min(7,5+diff+(age===2&&diff>0?1:0));
  const seed=stageSeed(age,diff,stage), rng=mulberry32(seed);
  const minLen=Math.min(n*n-2, 8+diff*3+age*2+chapter);
  const path=findPath(seed,n,minLen), pathSet=new Set(path.map(([r,c])=>key(r,c)));
  const grid=Array.from({length:n},()=>Array.from({length:n},()=>({type:'empty',r:0,target:0,onPath:false,badge:''})));
  grid[path[0][0]][path[0][1]]={type:'start',r:0,target:0,onPath:true,badge:''};
  grid[path.at(-1)[0]][path.at(-1)[1]]={type:'goal',r:0,target:0,onPath:true,badge:''};
  for(let i=1;i<path.length-1;i++){
    const [r,c]=path[i], p=pieceFor(path[i-1],path[i],path[i+1]);
    let rot=Math.floor(rng()*4); if(rot===p.target&&rng()>.25) rot=(rot+1+Math.floor(rng()*3))%4;
    grid[r][c]={...p,r:rot,onPath:true,badge:''};
  }
  const decoyRate=.10+diff*.08+chapter*.018;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(pathSet.has(key(r,c))||rng()>decoyRate) continue;
    grid[r][c]={type:rng()>.5?'straight':'elbow',r:Math.floor(rng()*4),target:0,onPath:false,badge:''};
  }
  const interior=path.slice(2,-2);
  if(chapter>=3){for(let i=0;i<Math.min(2+diff,interior.length);i++){const [r,c]=interior[Math.floor((i+1)*interior.length/(Math.min(2+diff,interior.length)+1))];grid[r][c].badge=faDigits(i+1)}}
  let charged=null;
  if(chapter>=5&&interior.length){charged=interior[Math.floor(interior.length*.56)];grid[charged[0]][charged[1]].badge='⚡'}
  const requiredPulses=chapter>=4?Math.min(3,2+(chapter>=7?1:0)):1;
  return {n,grid,path,pathSet,seed,chapter,requiredPulses,charged,par:Math.max(4,Math.floor(path.length*.72))};
}

function currentScore(){return Math.max(0,1000-state.moves*12-state.hints*75-state.seconds*2-(state.pulses)*20)}
function updateHud(){
  state.score=currentScore();
  movesEl.textContent=faDigits(state.moves);scoreEl.textContent=faNum(state.score);timeEl.textContent=`${faDigits(String(Math.floor(state.seconds/60)).padStart(2,'0'))}:${faDigits(String(state.seconds%60).padStart(2,'0'))}`;
  stageStatEl.textContent=faDigits(state.stage);stageInput.value=state.stage;
  const ch=state.level.chapter; state.chapter=ch;chapterSelect.value=String(ch);
  trackTitle.textContent=`${diffNames[state.diff]} — ${ageNames[state.age]}`;
  chapterTitle.textContent=`فصل ${faDigits(ch+1)} از ۸ • ${mechanicNames[ch]}`;
  progressText.textContent=`${faNum(state.stage)} / ${faNum(1000)}`;progressBar.style.width=`${state.stage/10}%`;
  mechanicEl.textContent=`مکانیک: ${mechanicNames[ch]}`;parEl.textContent=`حرکت معیار: ${faDigits(state.level.par)}`;
}

function render(){
  const {n,grid}=state.level;boardEl.style.setProperty('--n',n);boardEl.innerHTML='';
  grid.forEach((row,r)=>row.forEach((tile,c)=>{
    const el=document.createElement('button');el.className=`tile ${tile.type} ${tile.onPath?'path':'decoy'} ${state.solved&&tile.onPath?'active':''}`;
    el.setAttribute('aria-label',tile.type==='start'?'آغاز':tile.type==='goal'?'ستاره':tile.type==='empty'?'خانه خالی':'قطعه مسیر');
    if(tile.type==='start'||tile.type==='goal'){
      const node=document.createElement('span');node.className='node';node.textContent=tile.type==='start'?'●':'★';el.append(node);
      const mark=document.createElement('span');mark.className='mark';mark.textContent=tile.type==='start'?'آغاز':'ستاره';el.append(mark);el.disabled=true;
    } else if(tile.type==='empty'){el.disabled=true}
    else {
      const p=document.createElement('span');p.className=`pipe ${tile.type}`;p.style.transform=`rotate(${tile.r*90}deg)`;el.append(p);
      if(tile.badge){const b=document.createElement('span');b.className='badge';b.textContent=tile.badge;el.append(b)}
      el.onclick=()=>rotateTile(r,c);
    }
    boardEl.append(el);
  }));
  updateHud();
}

function rotateTile(r,c){if(state.solved)return;const t=state.level.grid[r][c];state.history.push({r,c,old:t.r});t.r=(t.r+1)%4;state.moves++;statusEl.textContent='قطعه چرخید؛ وقتی مسیر آماده شد پالس را بفرست.';render()}
function pathAligned(){return state.level.path.slice(1,-1).every(([r,c])=>{const t=state.level.grid[r][c];return t.r===t.target})}
function sendPulse(){
  if(state.solved)return;
  state.pulses++;
  if(!pathAligned()){statusEl.textContent='پالس قطع شد؛ هنوز یک یا چند اتصال در مسیر درست نیست.';updateHud();return}
  if(state.pulses<state.level.requiredPulses){
    statusEl.textContent=`پالس ${faDigits(state.pulses)} ثبت شد؛ حافظه شبکه تغییر کرد. مسیر را برای پالس بعدی آماده کن.`;
    if(state.level.charged){const [r,c]=state.level.charged;state.level.grid[r][c].r=(state.level.grid[r][c].r+1)%4}
    render();return;
  }
  completeStage();
}
function completeStage(){
  state.solved=true;clearInterval(state.timer);render();
  const ratio=state.moves/Math.max(1,state.level.par);const stars=ratio<=1.15&&state.hints===0?3:ratio<=1.7?2:1;
  starsEl.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  resultSummary.textContent=`مرحله ${faDigits(state.stage)} با ${faDigits(state.moves)} حرکت، ${faDigits(state.hints)} راهنما و امتیاز ${faNum(state.score)} تمام شد.`;
  const k=`neyro:${state.age}:${state.diff}:max`;const old=Number(localStorage.getItem(k)||1);localStorage.setItem(k,String(Math.max(old,state.stage+1)));result.hidden=false;
}
function hint(){if(state.solved)return;const wrong=state.level.path.slice(1,-1).map(([r,c])=>({r,c,t:state.level.grid[r][c]})).find(x=>x.t.r!==x.t.target);if(!wrong){statusEl.textContent='مسیر آماده است؛ پالس را بفرست.';return}state.history.push({r:wrong.r,c:wrong.c,old:wrong.t.r});wrong.t.r=wrong.t.target;state.hints++;statusEl.textContent='یک اتصال درست شد؛ ۲۵ امتیاز هزینه راهنما ثبت شد.';render()}
function undo(){const x=state.history.pop();if(!x||state.solved)return;state.level.grid[x.r][x.c].r=x.old;state.moves=Math.max(0,state.moves-1);statusEl.textContent='آخرین چرخش برگردانده شد.';render()}
function restart(){loadStage(state.stage,false)}
function nextStage(){result.hidden=true;loadStage(state.stage>=1000?1:state.stage+1,true)}

function loadStage(stage,persist=true){
  clearInterval(state.timer);state.stage=Math.min(1000,Math.max(1,Number(stage)||1));state.moves=0;state.hints=0;state.pulses=0;state.seconds=0;state.solved=false;state.history=[];state.level=buildLevel();
  statusEl.textContent=state.level.requiredPulses>1?`این مرحله به ${faDigits(state.level.requiredPulses)} پالس نیاز دارد؛ شبکه حالت خود را به خاطر می‌سپارد.`:'قطعه‌ها را بچرخان و پالس نور را از «آغاز» به «ستاره» برسان.';
  result.hidden=true;render();state.timer=setInterval(()=>{if(!state.solved){state.seconds++;updateHud()}},1000);
  if(persist)localStorage.setItem('neyro:last',JSON.stringify({age:state.age,diff:state.diff,stage:state.stage}));
}

ageSelect.onchange=()=>{state.age=Number(ageSelect.value);loadStage(1)};
difficultySelect.onchange=()=>{state.diff=Number(difficultySelect.value);loadStage(1)};
chapterSelect.onchange=()=>loadStage(Number(chapterSelect.value)*125+1);
$('#goStage').onclick=()=>loadStage(stageInput.value);
$('#pulse').onclick=sendPulse;$('#hint').onclick=hint;$('#undo').onclick=undo;$('#reset').onclick=restart;$('#next').onclick=nextStage;$('#resultNext').onclick=nextStage;$('#resultReplay').onclick=()=>{result.hidden=true;restart()};

try{const saved=JSON.parse(localStorage.getItem('neyro:last')||'null');if(saved){state.age=Math.min(2,Math.max(0,saved.age||0));state.diff=Math.min(2,Math.max(0,saved.diff||0));state.stage=Math.min(1000,Math.max(1,saved.stage||1));}}catch{}
ageSelect.value=String(state.age);difficultySelect.value=String(state.diff);loadStage(state.stage,false);
