const level = [
  [
    {type:'start', r:0, target:0}, {type:'straight', r:1, target:0}, {type:'elbow', r:2, target:1}, {type:'empty', r:0, target:0}, {type:'empty', r:0, target:0}
  ],
  [
    {type:'empty', r:0, target:0}, {type:'empty', r:0, target:0}, {type:'straight', r:0, target:1}, {type:'elbow', r:3, target:2}, {type:'empty', r:0, target:0}
  ],
  [
    {type:'empty', r:0, target:0}, {type:'elbow', r:0, target:1}, {type:'elbow', r:1, target:2}, {type:'straight', r:1, target:1}, {type:'empty', r:0, target:0}
  ],
  [
    {type:'empty', r:0, target:0}, {type:'straight', r:1, target:1}, {type:'empty', r:0, target:0}, {type:'elbow', r:2, target:3}, {type:'straight', r:0, target:0}
  ],
  [
    {type:'empty', r:0, target:0}, {type:'elbow', r:2, target:3}, {type:'straight', r:1, target:0}, {type:'straight', r:1, target:0}, {type:'goal', r:0, target:0}
  ]
];

const path = [[0,0],[0,1],[0,2],[1,2],[1,3],[2,3],[2,2],[2,1],[3,1],[4,1],[4,2],[4,3],[4,4]];
const board = document.querySelector('#board');
const movesEl = document.querySelector('#moves');
const scoreEl = document.querySelector('#score');
const statusEl = document.querySelector('#status');
let moves = 0;
let score = 100;
let solved = false;

function fa(n){return String(n).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])}
function key(r,c){return `${r}-${c}`}
const pathSet = new Set(path.map(([r,c])=>key(r,c)));

function render(){
  board.innerHTML='';
  movesEl.textContent=fa(moves);
  scoreEl.textContent=fa(score);
  level.forEach((row,r)=>row.forEach((tile,c)=>{
    const el=document.createElement('button');
    el.className=`tile ${tile.type} ${solved && pathSet.has(key(r,c)) ? 'active' : ''}`;
    el.dataset.row=r; el.dataset.col=c;
    el.setAttribute('aria-label',tile.type==='start'?'آغاز':tile.type==='goal'?'ستاره':tile.type==='empty'?'خانه خالی':'قطعه مسیر');

    if(tile.type==='start' || tile.type==='goal'){
      const node=document.createElement('span');
      node.className='node';
      node.textContent=tile.type==='start'?'●':'★';
      el.append(node);
      const mark=document.createElement('span');
      mark.className='mark';
      mark.textContent=tile.type==='start'?'آغاز':'ستاره';
      el.append(mark);
    } else if(tile.type!=='empty') {
      const p=document.createElement('span');
      p.className=`pipe ${tile.type}`;
      p.style.transform=`rotate(${tile.r*90}deg)`;
      el.append(p);
      el.onclick=()=>{
        if(solved) return;
        tile.r=(tile.r+1)%4;
        moves++;
        score=Math.max(0,100-moves*3);
        statusEl.textContent='قطعه چرخید؛ مسیر نور را کامل کن';
        check();
        render();
      };
    } else {
      el.disabled=true;
    }
    board.append(el);
  }));
}

function check(){
  solved = path.every(([r,c])=>{
    const t=level[r][c];
    return t.type==='start' || t.type==='goal' || t.r===t.target;
  });
  if(solved){
    statusEl.textContent='مسیر کامل شد؛ ستاره روشن شد ✨';
    score=Math.max(score,40);
  }
}

function reset(){
  const initial=[[0,1,2,0,0],[0,0,0,3,0],[0,0,1,1,0],[0,1,0,2,0],[0,2,1,1,0]];
  level.forEach((row,r)=>row.forEach((t,c)=>t.r=initial[r][c]));
  moves=0; score=100; solved=false;
  statusEl.textContent='مسیر نور را از آغاز به ستاره وصل کن';
  render();
}

document.querySelector('#reset').onclick=reset;
document.querySelector('#hint').onclick=()=>{
  const wrong=[];
  path.forEach(([r,c])=>{const t=level[r][c]; if(t.type!=='start'&&t.type!=='goal'&&t.r!==t.target) wrong.push(t)});
  if(!wrong.length){statusEl.textContent='همه قطعه‌ها درست‌اند؛ مسیر کامل است';return;}
  wrong[0].r=wrong[0].target;
  score=Math.max(0,score-10);
  statusEl.textContent='یک قطعه در جهت درست قرار گرفت';
  check(); render();
};
document.querySelector('#next').onclick=()=>{statusEl.textContent='مرحله بعد در نسخه کامل باز می‌شود';};

render();
