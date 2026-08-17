// 汐见 · 国王游戏 v0.1.0
const GAME_ID = 'kings_game';
const hostWin = (() => { try { return window.parent && window.parent.document ? window.parent : window; } catch (_) { return window; } })();
const games = hostWin.ShiomiGames || window.ShiomiGames;
if (!games) throw new Error('ShiomiGames 未初始化。');

const COMMANDS = {
  normal: [
    '{a}号和{b}号交换座位。',
    '{a}号给{b}号倒一杯饮料。',
    '{a}号说出第一次见到{b}号时的印象。',
    '{a}号和{b}号互相问一个只能回答“是”或“否”的问题。',
    '{a}号替{b}号选下一轮要喝的饮料。',
  ],
  funny: [
    '{a}号模仿{b}号说一句话。',
    '{a}号和{b}号同时指向在场最可能迟到的人。',
    '{a}号用三个词形容{b}号，不能停顿超过五秒。',
    '{a}号和{b}号猜拳，输的人做一个夸张的敬酒动作。',
    '{a}号替{b}号起一个只在今晚使用的绰号。',
  ],
  drink: [
    '{a}号和{b}号碰杯，各喝一口。',
    '{a}号替{b}号选择一杯无酒精或含酒精饮品。',
    '{a}号和{b}号各说一个喝酒时最讨厌遇到的情况。',
    '{a}号决定{b}号下一轮是否可以跳过饮酒命令。',
    '{a}号和{b}号共同选一个人替他们说一句祝酒词。',
  ],
  close: [
    '{a}号和{b}号对视十秒。',
    '{a}号坐到{b}号旁边直到下一轮结束。',
    '{a}号说出{b}号身上最显眼的一个特点。',
    '{a}号和{b}号各说一件对方可能不知道的小事。',
    '{a}号替{b}号整理一件不涉及隐私的随身物品。',
  ],
};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sample(arr){return arr[Math.floor(Math.random()*arr.length)];}
function applyTemplate(t,a,b){return t.replace('{a}',a).replace('{b}',b);}

const definition = {
  id: GAME_ID,
  label: '国王游戏',
  description: '多人抽号、国王命令与轮次记录。',
  mount(container, api) {
    const state={participants:['玩家','参加者A','参加者B','参加者C'],categories:new Set(['normal','funny','drink','close']),history:[],round:null};
    container.innerHTML=`<div class="kg"><style>
      .kg{min-height:100%;background:radial-gradient(circle at 25% 10%,#64352f 0,#2e2324 34%,#151a1a 75%);color:#f6eee1;padding:22px 18px 36px;font-family:"Noto Sans CJK SC","Microsoft YaHei",sans-serif}.kg-wrap{width:min(900px,100%);margin:0 auto}.kg-head{padding:18px 56px 18px 4px}.kg-head h1{margin:0;font:700 30px/1.15 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.12em}.kg-head p{margin:7px 0 0;color:#cdbfb3}.kg-panel{border:1px solid rgba(255,235,213,.14);border-radius:16px;background:rgba(26,23,23,.75);box-shadow:0 12px 34px rgba(0,0,0,.2);padding:16px;margin:12px 0}.kg-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.kg-title strong{font-size:15px}.kg-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.kg input{width:100%;height:40px;border:1px solid #6f5a54;border-radius:9px;background:#1e1d1d;color:#f6eee1;padding:0 10px;font:inherit}.kg button{border:1px solid #76584c;border-radius:10px;background:#6d3f35;color:#fff5e7;padding:10px 13px;font:650 13px/1.2 inherit;cursor:pointer}.kg button.secondary{background:#282627;border-color:#5f5550}.kg button.ghost{background:transparent}.kg button:disabled{opacity:.42;cursor:default}.kg-actions{display:flex;gap:8px;flex-wrap:wrap}.kg-cats{display:flex;gap:7px;flex-wrap:wrap}.kg-cat{padding:8px 11px!important;background:#292525!important;color:#cdbfb4!important}.kg-cat.on{background:#72483d!important;color:#fff6e9!important;border-color:#9b6b5a!important}.kg-stage{text-align:center;padding:24px 14px}.kg-crown{font-size:56px;line-height:1}.kg-king{margin-top:8px;font:700 22px/1.3 "Noto Serif CJK SC","Songti SC",serif}.kg-command{margin:18px auto 0;max-width:650px;padding:16px;border:1px solid #7f6257;border-radius:13px;background:#2a2221;font-size:17px}.kg-numbers{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0}.kg-num{min-width:110px;padding:10px;border-radius:10px;background:#211f1f;border:1px solid #5d514c}.kg-num b{display:block;color:#d7a986;font-size:18px}.kg-history{display:grid;gap:7px}.kg-hrow{padding:10px 11px;border-radius:9px;background:#211f1f;color:#d6cbc1;font-size:12px}.kg-note{color:#ac9f95;font-size:12px}.kg-custom{display:flex;gap:8px;margin-top:10px}.kg-custom input{flex:1}@media(max-width:650px){.kg{padding:14px 10px 30px}.kg-grid{grid-template-columns:1fr}.kg-head h1{font-size:24px}.kg-panel{padding:13px}.kg-stage{padding:16px 4px}.kg-command{font-size:15px}.kg-custom{display:grid}}
    </style><div class="kg-wrap"><header class="kg-head"><h1>国王游戏</h1><p>${esc(api.place?.name || '宵待町酒吧')} · 游戏结果只在你确认后写入输入框</p></header><section class="kg-panel"><div class="kg-title"><strong>参加者</strong><button class="secondary" data-act="add">＋ 添加</button></div><div class="kg-grid" data-list></div></section><section class="kg-panel"><div class="kg-title"><strong>命令类型</strong><span class="kg-note">至少保留一种</span></div><div class="kg-cats"><button class="kg-cat on" data-cat="normal">普通</button><button class="kg-cat on" data-cat="funny">搞笑</button><button class="kg-cat on" data-cat="drink">饮酒</button><button class="kg-cat on" data-cat="close">暧昧</button></div></section><section class="kg-panel kg-stage" data-stage></section><section class="kg-panel"><div class="kg-title"><strong>最近轮次</strong><button class="ghost" data-act="clear-history">清空</button></div><div class="kg-history" data-history></div></section></div></div>`;
    const q=s=>container.querySelector(s), list=q('[data-list]'), stage=q('[data-stage]'), history=q('[data-history]');
    function syncParticipants(){list.replaceChildren();state.participants.forEach((p,i)=>{const row=document.createElement('div');row.style.display='flex';row.style.gap='6px';const input=document.createElement('input');input.value=p;input.maxLength=24;input.placeholder=`参加者${i+1}`;input.addEventListener('input',()=>state.participants[i]=input.value.trim()||`参加者${i+1}`);const del=document.createElement('button');del.className='secondary';del.textContent='删除';del.disabled=state.participants.length<=3;del.addEventListener('click',()=>{if(state.participants.length>3){state.participants.splice(i,1);syncParticipants();renderStage();}});row.append(input,del);list.append(row);});}
    function renderHistory(){history.innerHTML=state.history.length?state.history.slice(0,10).map(x=>`<div class="kg-hrow">${esc(x)}</div>`).join(''):'<div class="kg-note">还没有进行过轮次。</div>';}
    function drawRound(custom=''){
      const names=state.participants.map((x,i)=>x.trim()||`参加者${i+1}`);if(names.length<3)return;
      const order=shuffle(names);const king=order[0];const numbered=order.slice(1).map((name,i)=>({num:i+1,name}));
      let a=1,b=Math.min(2,numbered.length);if(numbered.length>2){[a,b]=shuffle(numbered.map(x=>x.num)).slice(0,2);}
      const cats=[...state.categories];const cat=cats.length?sample(cats):'normal';const command=custom.trim()||applyTemplate(sample(COMMANDS[cat]),a,b);
      state.round={king,numbered,command,revealed:false};renderStage();
    }
    function resultText(){const r=state.round;if(!r)return'';return `[国王游戏] 本轮国王：${r.king}；${r.numbered.map(x=>`${x.num}号：${x.name}`).join('；')}；命令：${r.command}`;}
    function renderStage(){
      const r=state.round;if(!r){stage.innerHTML=`<div class="kg-crown">♛</div><div class="kg-king">准备抽签</div><p class="kg-note">每轮重新抽取国王与编号。前端不会自动把命令当成已经发生的剧情事实。</p><div class="kg-actions" style="justify-content:center"><button data-act="draw">开始一轮</button></div><div class="kg-custom"><input data-custom placeholder="也可以先写一条自定义命令，例如：1号和2号交换座位"><button class="secondary" data-act="custom">使用自定义命令抽签</button></div>`;return;}
      stage.innerHTML=`<div class="kg-crown">♛</div><div class="kg-king">国王：${esc(r.king)}</div><div class="kg-command">${esc(r.command)}</div><div class="kg-numbers">${r.revealed?r.numbered.map(x=>`<div class="kg-num"><b>${x.num}号</b>${esc(x.name)}</div>`).join(''):'<div class="kg-note">编号尚未揭晓</div>'}</div><div class="kg-actions" style="justify-content:center">${r.revealed?'<button data-act="send">写入剧情输入框</button><button class="secondary" data-act="next">下一轮</button>':'<button data-act="reveal">揭晓编号</button><button class="secondary" data-act="redraw">重新抽签</button>'}</div>`;
    }
    syncParticipants();renderStage();renderHistory();
    container.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;const cat=btn.dataset.cat;if(cat){if(state.categories.has(cat)&&state.categories.size>1){state.categories.delete(cat);btn.classList.remove('on');}else if(!state.categories.has(cat)){state.categories.add(cat);btn.classList.add('on');}return;}const act=btn.dataset.act;if(act==='add'&&state.participants.length<10){state.participants.push(`参加者${state.participants.length+1}`);syncParticipants();}else if(act==='draw'||act==='redraw')drawRound();else if(act==='custom'){const value=q('[data-custom]')?.value||'';if(value.trim())drawRound(value);}else if(act==='reveal'&&state.round){state.round.revealed=true;renderStage();}else if(act==='send'&&state.round){const t=resultText();if(api.writeToComposer(t)){state.history.unshift(t);renderHistory();}}else if(act==='next'){if(state.round){state.history.unshift(resultText());renderHistory();}state.round=null;renderStage();}else if(act==='clear-history'){state.history=[];renderHistory();}});
    return ()=>{};
  }
};

games.register(definition);
export default definition;
