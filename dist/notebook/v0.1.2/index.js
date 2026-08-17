(() => {
  'use strict';

  const VERSION = '0.1.2';
  const ROOT_ID = 'shiomi-investigation-notebook-root';
  const STORE_KEY = 'shiomi_investigation_notebook_v1';
  const FALLBACK_PREFIX = 'shiomi:notebook:';
  const MAX_QUOTE = 1800;
  const TABS = ['clues','people','timeline','theories'];
  const TAB_LABEL = { clues:'线索', people:'人物', timeline:'时间线', theories:'推测' };
  const TYPE_LABEL = { clues:'线索', people:'人物笔记', timeline:'时间节点', theories:'推测' };
  const STATUS_LABEL = {
    unconfirmed:'未确认', confirmed:'已确认', doubtful:'存疑', contradiction:'矛盾', important:'重要', excluded:'排除',
    keep:'保留', supported:'得到支持', rejected:'已否定'
  };
  const CERTAINTY_LABEL = { exact:'确定时间', approximate:'约略时间', unknown:'顺序未定' };

  const localWin = window;
  const hostWin = (() => { try { return window.parent && window.parent.document ? window.parent : window; } catch (_) { return window; } })();
  const hostDoc = hostWin.document || document;

  const NS = '__SHIOMI_INVESTIGATION_NOTEBOOK_ACTIVE__';
  const hostFrame = (() => { try { return localWin !== hostWin ? localWin.frameElement : null; } catch (_) { return null; } })();
  let activeUI = null;
  let destroyed = false;
  let lifecycleTimer = 0;
  const lifecycleUnsubscribers = [];

  function cleanupNotebookRoot() {
    try { hostDoc.getElementById(ROOT_ID)?.remove(); } catch (_) {}
  }
  function hostFrameDetached() {
    try {
      if (localWin === hostWin || !hostFrame) return false;
      const root = hostDoc.documentElement || hostDoc.body;
      return !!(root && !root.contains(hostFrame));
    } catch (_) { return false; }
  }
  function currentCharacterKey() {
    const c = ctx() || {};
    return text(c.characterId ?? c.character_id ?? c.this_chid ?? c.character?.avatar ?? c.name1 ?? '').trim();
  }
  function destroyNotebook() {
    if (destroyed) return;
    destroyed = true;
    try { if (lifecycleTimer) { (hostWin.clearInterval || clearInterval)(lifecycleTimer); lifecycleTimer = 0; } } catch (_) {}
    while (lifecycleUnsubscribers.length) { try { lifecycleUnsubscribers.pop()(); } catch (_) {} }
    try { activeUI?.destroy?.(); } catch (_) {}
    activeUI = null;
    cleanupNotebookRoot();
    try { if (hostWin[NS]?.destroy === destroyNotebook) hostWin[NS] = null; } catch (_) {}
  }
  function bindNotebookLifecycle(initialCharacterKey) {
    try {
      for (const name of ['pagehide','beforeunload','unload']) {
        localWin.addEventListener?.(name, destroyNotebook, { once:true });
      }
    } catch (_) {}
    try {
      if (localWin !== hostWin && hostFrame && !lifecycleTimer) {
        lifecycleTimer = (hostWin.setInterval || setInterval)(() => {
          try { if (hostFrameDetached()) destroyNotebook(); } catch (_) {}
        }, 700);
      }
    } catch (_) {}
    try {
      const events = localWin.tavern_events || hostWin.tavern_events || {};
      if (events.CHAT_CHANGED && typeof eventOn === 'function') {
        const handler = () => {
          (hostWin.setTimeout || setTimeout)(() => {
            if (destroyed) return;
            if (hostFrameDetached()) { destroyNotebook(); return; }
            const nextCharacterKey = currentCharacterKey();
            if (initialCharacterKey && nextCharacterKey && nextCharacterKey !== initialCharacterKey) {
              destroyNotebook();
              return;
            }
            // 同一角色切换聊天时保留前端实例，但重新读取当前聊天自己的手册数据。
            try {
              if (activeUI) {
                activeUI.close();
                activeUI.store = loadStore();
                activeUI.refreshPolice();
                activeUI.ensureActiveCase();
                activeUI.selected.clear();
                activeUI.render();
              }
            } catch (_) {}
          }, 160);
        };
        const ret = eventOn(events.CHAT_CHANGED, handler);
        if (typeof ret === 'function') lifecycleUnsubscribers.push(ret);
        else if (typeof eventOff === 'function') lifecycleUnsubscribers.push(() => { try { eventOff(events.CHAT_CHANGED, handler); } catch (_) {} });
      }
    } catch (_) {}
  }

  // 如果旧版手册曾把节点留在父页面，加载新版时先主动回收。
  try { hostWin[NS]?.destroy?.(); } catch (_) {}
  cleanupNotebookRoot();

  const text = value => value == null ? '' : String(value);
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  const clone = value => { try { return structuredClone(value); } catch (_) { return JSON.parse(JSON.stringify(value)); } };
  const now = () => Date.now();
  const id = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const esc = value => text(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const nl = value => esc(value).replace(/\n/g,'<br>');
  const truncate = (value, n=120) => { const s=text(value).trim(); return s.length>n ? `${s.slice(0,n-1)}…` : s; };
  const splitTags = value => [...new Set(text(value).split(/[，,、\n]/).map(v=>v.trim()).filter(Boolean))].slice(0,16);
  const cssEscape = value => { const s=text(value); try { return hostWin.CSS?.escape ? hostWin.CSS.escape(s) : s.replace(/[\"']/g,'\\$&'); } catch (_) { return s.replace(/[\"']/g,'\\$&'); } };

  function windows() {
    const rows=[];
    for (const w of [window, (()=>{try{return window.parent}catch(_){return null}})(), (()=>{try{return window.top}catch(_){return null}})()]) {
      if (w && !rows.includes(w)) rows.push(w);
    }
    return rows;
  }
  function ctx() {
    for (const w of windows()) {
      try {
        const c = w.SillyTavern?.getContext?.();
        if (c) return c;
      } catch (_) {}
    }
    try { return SillyTavern?.getContext?.() || null; } catch (_) { return null; }
  }
  function scopeKey() {
    const c=ctx()||{};
    const char=text(c.characterId ?? c.character_id ?? c.this_chid ?? 'character');
    const chat=text(c.chatId ?? c.chat_id ?? c.file_name ?? c.chat_file ?? c.name2 ?? 'chat');
    return `${char}:${chat}`;
  }
  function storage() {
    for (const w of windows().slice().reverse()) { try { if (w.localStorage) return w.localStorage; } catch (_) {} }
    try { return localStorage; } catch (_) { return null; }
  }
  function chatVariables() {
    try { if (typeof getVariables === 'function') return object(getVariables({type:'chat'})); } catch (_) {}
    for (const w of windows()) {
      try { if (typeof w.getVariables === 'function') return object(w.getVariables({type:'chat'})); } catch (_) {}
    }
    return {};
  }
  async function updateChatVariables(mutator) {
    const fn = typeof updateVariablesWith === 'function' ? updateVariablesWith : windows().map(w=>w.updateVariablesWith).find(v=>typeof v==='function');
    if (fn) {
      return await fn(vars => mutator(object(vars)), {type:'chat'});
    }
    const st=storage();
    if (!st) throw new Error('当前环境没有可用的聊天变量或本地存储。');
    const key=FALLBACK_PREFIX+scopeKey();
    let vars={};
    try { vars=object(JSON.parse(st.getItem(key)||'{}')); } catch (_) {}
    vars=mutator(vars);
    st.setItem(key,JSON.stringify(vars));
    return vars;
  }

  function normalizeCase(src) {
    src=object(src);
    const out={
      id:text(src.id)||id('case'), title:text(src.title)||'未命名调查页', source:src.source==='police'?'police':'manual',
      linkedMatter:text(src.linkedMatter), createdAt:Number(src.createdAt)||now(), updatedAt:Number(src.updatedAt)||now(),
      clues:array(src.clues).map(normalizeClue), people:array(src.people).map(normalizePerson),
      timeline:array(src.timeline).map(normalizeTimeline), theories:array(src.theories).map(normalizeTheory)
    };
    return out;
  }
  function quoteNorm(q) {
    q=object(q); if(!text(q.excerpt).trim()) return null;
    return { messageId:q.messageId ?? '', swipeId:q.swipeId ?? 0, role:text(q.role)||'assistant', excerpt:text(q.excerpt).slice(0,MAX_QUOTE) };
  }
  function normalizeClue(src) {
    src=object(src); return { id:text(src.id)||id('clue'), title:text(src.title), body:text(src.body), source:text(src.source), time:text(src.time), place:text(src.place), tags:array(src.tags).map(text).filter(Boolean).slice(0,16), status:STATUS_LABEL[src.status]?src.status:'unconfirmed', quote:quoteNorm(src.quote), createdAt:Number(src.createdAt)||now(), updatedAt:Number(src.updatedAt)||now() };
  }
  function normalizePerson(src) {
    src=object(src); return { id:text(src.id)||id('person'), name:text(src.name), relation:text(src.relation), notes:text(src.notes), focus:text(src.focus), quote:quoteNorm(src.quote), createdAt:Number(src.createdAt)||now(), updatedAt:Number(src.updatedAt)||now() };
  }
  function normalizeTimeline(src) {
    src=object(src); return { id:text(src.id)||id('time'), time:text(src.time), certainty:CERTAINTY_LABEL[src.certainty]?src.certainty:'approximate', title:text(src.title), body:text(src.body), place:text(src.place), source:text(src.source), quote:quoteNorm(src.quote), createdAt:Number(src.createdAt)||now(), updatedAt:Number(src.updatedAt)||now() };
  }
  function normalizeTheory(src) {
    src=object(src); return { id:text(src.id)||id('theory'), title:text(src.title), body:text(src.body), evidence:text(src.evidence), against:text(src.against), status:['keep','supported','rejected'].includes(src.status)?src.status:'keep', quote:quoteNorm(src.quote), createdAt:Number(src.createdAt)||now(), updatedAt:Number(src.updatedAt)||now() };
  }
  function normalizeStore(src) {
    src=object(src); const cases={};
    for (const [key,val] of Object.entries(object(src.cases))) { const c=normalizeCase(val); c.id=key||c.id; cases[c.id]=c; }
    let active=text(src.activeCaseId); if(active && !cases[active]) active='';
    return { version:1, activeCaseId:active, cases, meta:{...object(src.meta), updatedAt:Number(src?.meta?.updatedAt)||0} };
  }
  function loadStore() {
    const vars=chatVariables();
    if (vars[STORE_KEY]) return normalizeStore(vars[STORE_KEY]);
    const st=storage();
    if(st){ try { return normalizeStore(object(JSON.parse(st.getItem(FALLBACK_PREFIX+scopeKey())||'{}'))[STORE_KEY]); } catch(_){} }
    return normalizeStore({});
  }
  async function saveStore(store) {
    const next=normalizeStore(store); next.meta.updatedAt=now();
    await updateChatVariables(vars=>{ vars[STORE_KEY]=next; return vars; });
    return next;
  }

  function findLatestState() {
    const readers=[
      () => typeof getVariables==='function' ? getVariables({type:'message',message_id:'latest'}) : null,
      () => typeof getVariables==='function' ? getVariables({type:'chat'}) : null
    ];
    for(const read of readers){
      try { const v=read(); if(v && typeof v==='object') return v; } catch(_){}
    }
    return {};
  }
  function policeMatterNames() {
    const roots=[]; const raw=findLatestState();
    roots.push(raw,raw?.stat_data,raw?.stat,raw?.variables);
    for(const root of roots){
      const matters=object(root)?.警务事项;
      if(matters && typeof matters==='object' && !Array.isArray(matters)) return Object.keys(matters).filter(Boolean);
    }
    return [];
  }
  function policeMatterCaseId(name) { return `police:${text(name).trim()}`; }

  function cleanMessageBody(value) {
    return text(value)
      .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi,'')
      .replace(/<police_request>[\s\S]*?<\/police_request>/gi,'')
      .replace(/<XUEYUE>[\s\S]*?<\/XUEYUE>/gi,'')
      .trim();
  }
  function latestAssistantQuote() {
    const c=ctx()||{}; const chat=array(c.chat);
    for(let i=chat.length-1;i>=0;i--){
      const row=object(chat[i]); if(row.is_user===true || row.role==='user') continue;
      const body=cleanMessageBody(row.mes ?? row.message ?? row.content ?? row.text);
      if(!body) continue;
      return { messageId:row.mesid ?? row.message_id ?? row.id ?? i, swipeId:row.swipe_id ?? row.swipeId ?? 0, role:'assistant', excerpt:body.slice(0,MAX_QUOTE) };
    }
    return null;
  }
  function scrollToMessage(q) {
    if(!q) return false; const mid=text(q.messageId); let node=null;
    const selectors=[`.mes[mesid="${cssEscape(mid)}"]`,`[data-message-id="${cssEscape(mid)}"]`,`#chat .mes[mesid="${cssEscape(mid)}"]`];
    for(const sel of selectors){ try { node=hostDoc.querySelector(sel); if(node) break; } catch(_){} }
    if(!node && /^\d+$/.test(mid)) { try { node=hostDoc.querySelectorAll('#chat .mes')[Number(mid)] || null; } catch(_){} }
    if(node){ node.scrollIntoView({behavior:'smooth',block:'center'}); node.classList.add('shiomi-notebook-source-flash'); setTimeout(()=>node.classList.remove('shiomi-notebook-source-flash'),1800); return true; }
    return false;
  }
  function composer() {
    for(const doc of [hostDoc,document]){
      try {
        const el=doc.querySelector('#send_textarea, textarea#send_textarea, textarea[name="send_textarea"], textarea');
        if(el) return el;
      } catch(_){}
    }
    return null;
  }
  function appendToComposer(value) {
    const ta=composer(); if(!ta) return false;
    const old=text(ta.value); ta.value=old ? `${old}\n${value}` : value;
    try { ta.dispatchEvent(new hostWin.Event('input',{bubbles:true})); } catch(_) { try { ta.dispatchEvent(new Event('input',{bubbles:true})); } catch(__){} }
    ta.focus(); return true;
  }

  class NotebookUI {
    constructor(){
      this.store=loadStore(); this.tab='clues'; this.selected=new Set(); this.editor=null; this.opened=false; this.livePolice=[];
      this.create(); this.refreshPolice(); this.render();
    }
    icon(name){
      const paths={
        book:'<path d="M5 4.5h8.2A3.8 3.8 0 0 1 17 8.3V20H8.7A3.7 3.7 0 0 0 5 23.7z"/><path d="M19 4.5h-5.2A3.8 3.8 0 0 0 10 8.3V20h5.3a3.7 3.7 0 0 1 3.7 3.7z"/>',
        close:'<path d="M6 6l12 12M18 6L6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>', more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
        quote:'<path d="M7 10h4v7H5v-5a6 6 0 0 1 6-6M17 10h4v7h-6v-5a6 6 0 0 1 6-6"/>', source:'<path d="M9 18l6-12M7 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2M14 3h7v7M21 3l-9 9"/>',
        edit:'<path d="M4 20l4.2-1 10-10a2 2 0 0 0-3-3l-10 10zM13.5 7.5l3 3"/>', trash:'<path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14"/>',
        send:'<path d="M22 2L10.8 13.2M22 2l-7 20-4.2-8.8L2 9z"/>', check:'<path d="M5 12l4 4L19 6"/>', folder:'<path d="M3 6h7l2 2h9v11H3z"/>'
      };
      return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.book}</svg>`;
    }
    create(){
      hostDoc.getElementById(ROOT_ID)?.remove();
      this.host=hostDoc.createElement('div'); this.host.id=ROOT_ID;
      this.shadow=this.host.attachShadow ? this.host.attachShadow({mode:'open'}) : null; this.root=this.shadow||this.host;
      this.root.innerHTML=`<style>${this.styles()}</style>
        <button class="nb-launch" type="button" aria-label="打开调查手册">${this.icon('book')}<span>手册</span></button>
        <section class="nb-shell" aria-hidden="true">
          <header class="nb-header">
            <div class="nb-title"><span class="nb-mark">${this.icon('book')}</span><div><strong>调查手册</strong><small>用户调查记录 · 不自动写入世界事实</small></div></div>
            <div class="nb-casebar"><select class="nb-case-select" aria-label="选择调查页"></select><button class="nb-plain" data-action="new-case">＋案件</button><button class="nb-icon nb-case-manage" data-action="manage-case" aria-label="编辑当前调查页">${this.icon('more')}</button></div>
            <button class="nb-icon nb-close" data-action="close" aria-label="关闭">${this.icon('close')}</button>
          </header>
          <nav class="nb-tabs" aria-label="手册分类"></nav>
          <main class="nb-main"><div class="nb-list"></div></main>
          <footer class="nb-footer"><button class="nb-primary" data-action="new-entry">${this.icon('plus')}<span>新建</span></button><button class="nb-send" data-action="send-selected" disabled>${this.icon('send')}<span>加入下一轮</span><b class="nb-selected-count">0</b></button></footer>
          <div class="nb-editor-wrap" hidden><div class="nb-editor-backdrop" data-action="cancel-editor"></div><section class="nb-editor" role="dialog" aria-modal="true"><div class="nb-editor-head"><div><strong class="nb-editor-title"></strong><small>内容只保存在当前聊天的调查手册中</small></div><button class="nb-icon" data-action="cancel-editor">${this.icon('close')}</button></div><form class="nb-form"></form></section></div>
          <div class="nb-toast" hidden></div>
        </section>`;
      hostDoc.body.appendChild(this.host);
      const q=s=>this.root.querySelector(s);
      this.refs={launch:q('.nb-launch'),shell:q('.nb-shell'),caseSelect:q('.nb-case-select'),tabs:q('.nb-tabs'),list:q('.nb-list'),send:q('.nb-send'),count:q('.nb-selected-count'),editorWrap:q('.nb-editor-wrap'),editorTitle:q('.nb-editor-title'),form:q('.nb-form'),toast:q('.nb-toast')};
      this.bind();
    }
    styles(){ return `
      :host{all:initial}.nb-launch,.nb-shell,.nb-shell *{box-sizing:border-box}.nb-shell svg,.nb-launch svg{width:19px;height:19px;display:block}
      .nb-launch{position:fixed;right:max(12px,env(safe-area-inset-right));left:auto;bottom:max(126px,calc(env(safe-area-inset-bottom) + 114px));z-index:2147482490;display:flex;align-items:center;gap:7px;border:1px solid rgba(53,48,42,.17);border-radius:12px;padding:10px 13px;background:rgba(249,246,235,.96);color:#3f3b33;font:600 13px/1.2 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;box-shadow:0 4px 16px rgba(35,30,25,.16);cursor:pointer}.nb-launch:hover,.nb-launch:focus-visible{outline:2px solid rgba(52,85,96,.30);outline-offset:2px;background:#fffdf7}
      .nb-shell{position:fixed;inset:0;z-index:2147483100;display:none;background:#e8e3d5;color:#302f2a;font:14px/1.55 "Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei",sans-serif}.nb-shell.open{display:grid;grid-template-rows:auto auto 1fr auto;overflow:hidden}
      .nb-header{display:grid;grid-template-columns:minmax(190px,1fr) minmax(250px,520px) auto;align-items:center;gap:16px;padding:max(14px,env(safe-area-inset-top)) 18px 14px;border-bottom:1px solid rgba(52,49,43,.12);background:rgba(249,247,239,.96);box-shadow:0 3px 14px rgba(50,45,38,.08)}.nb-title{display:flex;align-items:center;gap:11px}.nb-title strong{font:700 18px/1.2 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.08em}.nb-title small{display:block;margin-top:3px;color:#827a6e;font-size:11px}.nb-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:8px;background:#364f55;color:#f8f3e7}.nb-casebar{display:flex;gap:8px;min-width:0}.nb-case-select{min-width:0;flex:1;height:40px;border:1px solid #c9c1b3;border-radius:9px;background:#fffdf8;color:#34312c;padding:0 32px 0 11px;font:inherit;outline:none}.nb-plain,.nb-icon{border:1px solid #c9c1b3;background:#f8f4e9;color:#4b4942;border-radius:9px;cursor:pointer}.nb-plain{height:40px;padding:0 12px;font:600 13px/1 sans-serif;white-space:nowrap}.nb-icon:disabled{opacity:.4;cursor:default}.nb-icon{display:grid;place-items:center;width:40px;height:40px;padding:0}.nb-close{margin-left:auto}
      .nb-tabs{display:flex;align-items:center;gap:3px;padding:8px 18px 0;background:#e8e3d5;border-bottom:1px solid rgba(65,59,50,.09);overflow-x:auto}.nb-tab{position:relative;border:1px solid transparent;border-bottom:0;border-radius:10px 10px 0 0;background:transparent;padding:10px 20px;color:#6b655c;font:650 13px/1 sans-serif;cursor:pointer}.nb-tab.active{background:#f8f5eb;color:#2e454b;border-color:#cbc3b5}.nb-tab b{margin-left:6px;font-size:11px;font-weight:600;color:#90877a}
      .nb-main{min-height:0;overflow:auto;padding:18px 18px 110px;background:radial-gradient(circle at 15% 12%,rgba(255,255,255,.48),transparent 34%),linear-gradient(#e9e4d6,#e3ddce)}.nb-list{width:min(980px,100%);margin:0 auto;display:grid;gap:12px}.nb-empty{padding:54px 24px;border:1px dashed #bcb3a5;border-radius:15px;background:rgba(250,247,238,.72);text-align:center;color:#756d62}.nb-empty strong{display:block;margin-bottom:7px;color:#4c4942;font-size:16px}.nb-empty small{display:block;max-width:520px;margin:0 auto;color:#91887c}
      .nb-card{position:relative;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;padding:15px 14px;border:1px solid rgba(81,72,61,.16);border-radius:13px;background:rgba(250,248,241,.96);box-shadow:0 3px 12px rgba(60,51,41,.07)}.nb-card.selected{border-color:#6a8b90;box-shadow:0 0 0 2px rgba(76,114,122,.12),0 3px 12px rgba(60,51,41,.07)}.nb-pick{align-self:start;margin-top:2px;width:24px;height:24px;border:1px solid #bab1a3;border-radius:7px;background:#fffdf8;color:transparent;display:grid;place-items:center;cursor:pointer}.nb-pick svg{width:15px;height:15px}.nb-card.selected .nb-pick{background:#3e6269;color:white;border-color:#3e6269}.nb-card-main{min-width:0}.nb-card-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nb-card-title h3{margin:0;color:#302e29;font-size:15px;line-height:1.35}.nb-badge{display:inline-flex;align-items:center;min-height:21px;border-radius:999px;padding:2px 8px;background:#ece6d8;color:#6c6255;font-size:11px;white-space:nowrap}.nb-badge.status-important,.nb-badge.status-contradiction{background:#eee0d7;color:#8a493d}.nb-badge.status-confirmed,.nb-badge.status-supported{background:#dfe9df;color:#46654c}.nb-badge.status-doubtful{background:#ebe4ce;color:#7a6633}.nb-badge.status-excluded,.nb-badge.status-rejected{background:#e3e3df;color:#6f6d68}.nb-body{margin-top:8px;color:#4e4a43;white-space:normal}.nb-meta{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:9px;color:#82796d;font-size:12px}.nb-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.nb-tag{padding:2px 7px;border-radius:999px;background:#e9e4da;color:#655d52;font-size:11px}.nb-quote{margin-top:10px;padding:9px 11px;border-left:3px solid #799097;background:#f1eee6;color:#666057;font-size:12px}.nb-quote b{display:block;margin-bottom:3px;color:#536d73}.nb-card-actions{display:flex;gap:4px;align-self:start}.nb-mini{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#777064;cursor:pointer}.nb-mini:hover{background:#ebe6da;color:#3d5d64}.nb-mini.danger:hover{background:#f1ded8;color:#954d40}.nb-mini svg{width:16px;height:16px}
      .nb-footer{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:13px 18px max(13px,env(safe-area-inset-bottom));border-top:1px solid rgba(67,60,51,.13);background:rgba(248,245,236,.96);backdrop-filter:blur(9px)}.nb-primary,.nb-send{height:44px;border-radius:11px;padding:0 17px;display:flex;align-items:center;justify-content:center;gap:8px;font:650 13px/1 sans-serif;cursor:pointer}.nb-primary{border:1px solid #35575e;background:#35575e;color:#fff}.nb-send{border:1px solid #bbb2a4;background:#fffdf8;color:#494640}.nb-send:disabled{opacity:.45;cursor:default}.nb-selected-count{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#dfe8e7;color:#33575e;font-size:11px}
      .nb-editor-wrap{position:fixed;inset:0;z-index:30}.nb-editor-backdrop{position:absolute;inset:0;background:rgba(30,28,25,.34);backdrop-filter:blur(2px)}.nb-editor{position:absolute;top:0;right:0;bottom:0;width:min(560px,94vw);background:#faf7ef;box-shadow:-12px 0 38px rgba(30,26,21,.18);display:grid;grid-template-rows:auto 1fr}.nb-editor-head{display:flex;justify-content:space-between;align-items:center;padding:18px;border-bottom:1px solid #d8d0c3}.nb-editor-head strong{font-size:17px}.nb-editor-head small{display:block;margin-top:3px;color:#887f73;font-size:11px}.nb-form{min-height:0;overflow:auto;padding:17px 18px 90px}.nb-field{display:grid;gap:6px;margin-bottom:13px}.nb-field>span{font-size:12px;font-weight:650;color:#655f56}.nb-field input,.nb-field textarea,.nb-field select{width:100%;border:1px solid #c9c0b1;border-radius:9px;background:#fffdfa;color:#332f2a;padding:9px 10px;font:14px/1.5 inherit;outline:none}.nb-field textarea{min-height:105px;resize:vertical}.nb-field input:focus,.nb-field textarea:focus,.nb-field select:focus{border-color:#66838a;box-shadow:0 0 0 3px rgba(74,111,119,.10)}.nb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px}.nb-editor-actions{position:absolute;left:0;right:0;bottom:0;display:flex;gap:9px;justify-content:flex-end;padding:12px 18px max(12px,env(safe-area-inset-bottom));border-top:1px solid #d8d0c3;background:rgba(250,247,239,.97)}.nb-secondary,.nb-save,.nb-quote-btn{height:40px;border-radius:9px;padding:0 13px;font:650 13px/1 sans-serif;cursor:pointer}.nb-secondary,.nb-quote-btn{border:1px solid #c7beaf;background:#fffdf8;color:#5c564d}.nb-save{border:1px solid #35575e;background:#35575e;color:#fff}.nb-quote-box{margin:4px 0 14px;padding:10px;border:1px dashed #afa697;border-radius:9px;background:#f0ece2;color:#696158;font-size:12px}.nb-quote-box.empty{color:#948b80}.nb-quote-btn{display:inline-flex;align-items:center;gap:6px;margin-bottom:12px}.nb-quote-btn svg{width:16px;height:16px}
      .nb-toast{position:fixed;left:50%;bottom:max(78px,calc(env(safe-area-inset-bottom) + 66px));z-index:60;transform:translateX(-50%);max-width:min(520px,90vw);padding:9px 13px;border-radius:9px;background:rgba(38,43,42,.93);color:white;box-shadow:0 5px 18px rgba(0,0,0,.2);font-size:12px;text-align:center}
      @media(max-width:760px){.nb-launch{bottom:max(126px,calc(env(safe-area-inset-bottom) + 114px))}.nb-header{grid-template-columns:1fr auto;gap:10px;padding-left:12px;padding-right:12px}.nb-title small{display:none}.nb-casebar{grid-column:1/-1;grid-row:2}.nb-close{grid-column:2;grid-row:1}.nb-tabs{padding-left:8px;padding-right:8px}.nb-tab{padding:10px 15px}.nb-main{padding:12px 10px 105px}.nb-card{grid-template-columns:28px minmax(0,1fr);padding:13px 11px}.nb-card-actions{grid-column:2;justify-content:flex-end;margin-top:-3px}.nb-footer{padding-left:10px;padding-right:10px}.nb-primary,.nb-send{flex:1}.nb-grid2{grid-template-columns:1fr}.nb-editor{width:100vw}.nb-editor-head{padding-top:max(16px,env(safe-area-inset-top))}}
      @media(max-width:440px){.nb-title strong{font-size:16px}.nb-mark{width:34px;height:34px}.nb-case-select{height:38px}.nb-plain{height:38px}.nb-tab{padding:9px 12px}.nb-footer span{font-size:12px}}
      @media(prefers-reduced-motion:reduce){.nb-shell *{scroll-behavior:auto!important;transition:none!important}}
    `; }
    bind(){
      this.refs.launch.addEventListener('click',()=>this.open());
      this.root.addEventListener('click',e=>{
        const action=e.target.closest?.('[data-action]')?.dataset.action; if(!action) return;
        const el=e.target.closest('[data-action]');
        if(action==='close') this.close();
        else if(action==='new-case') this.openCaseEditor(null);
        else if(action==='manage-case') { const c=this.activeCase(); if(c) this.openCaseEditor(c); }
        else if(action==='new-entry') this.openEntryEditor(this.tab,null);
        else if(action==='send-selected') this.sendSelected();
        else if(action==='cancel-editor') this.closeEditor();
        else if(action==='edit-entry') this.openEntryEditor(el.dataset.type,el.dataset.id);
        else if(action==='delete-entry') this.deleteEntry(el.dataset.type,el.dataset.id);
        else if(action==='toggle-select') this.toggleSelect(el.dataset.type,el.dataset.id);
        else if(action==='source') this.openSource(el.dataset.type,el.dataset.id);
      });
      this.refs.caseSelect.addEventListener('change',()=>this.selectCase(this.refs.caseSelect.value));
      this.refs.tabs.addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(b){this.tab=b.dataset.tab;this.render();} });
      this.refs.form.addEventListener('click',e=>{ const action=e.target.closest?.('[data-form-action]')?.dataset.formAction; if(action==='quote-latest'){e.preventDefault();this.editor.quote=latestAssistantQuote();this.renderEditorForm();} else if(action==='delete-case'){e.preventDefault();void this.deleteCase();} });
      this.refs.form.addEventListener('submit',e=>{e.preventDefault();void this.submitEditor(new FormData(this.refs.form));});
    }
    async open(){ this.store=loadStore(); this.refreshPolice(); this.opened=true; this.refs.shell.classList.add('open'); this.refs.shell.setAttribute('aria-hidden','false'); this.selected.clear(); this.ensureActiveCase(); this.render(); }
    close(){ this.opened=false; this.refs.shell.classList.remove('open'); this.refs.shell.setAttribute('aria-hidden','true'); this.closeEditor(); }
    refreshPolice(){ this.livePolice=policeMatterNames(); }
    ensureActiveCase(){ const keys=Object.keys(this.store.cases); if(this.store.activeCaseId && this.store.cases[this.store.activeCaseId]) return; if(keys.length) this.store.activeCaseId=keys[0]; }
    activeCase(){ return this.store.cases[this.store.activeCaseId]||null; }
    caseOptions(){
      const rows=Object.values(this.store.cases).map(c=>({value:c.id,label:c.title,kind:c.source}));
      for(const name of this.livePolice){ const cid=policeMatterCaseId(name); if(!this.store.cases[cid]) rows.push({value:`__police__${name}`,label:`${name} · 建立手册页`,kind:'available'}); }
      return rows;
    }
    async selectCase(value){
      if(value.startsWith('__police__')){
        const name=value.slice('__police__'.length); const cid=policeMatterCaseId(name);
        this.store.cases[cid]=normalizeCase({id:cid,title:name,source:'police',linkedMatter:name}); this.store.activeCaseId=cid; this.store=await saveStore(this.store); this.toast('已为该警务事项建立独立调查手册页。');
      } else { this.store.activeCaseId=value; this.store=await saveStore(this.store); }
      this.selected.clear(); this.render();
    }
    counts(c){ return {clues:c?.clues?.length||0,people:c?.people?.length||0,timeline:c?.timeline?.length||0,theories:c?.theories?.length||0}; }
    render(){
      const opts=this.caseOptions(); const placeholder=!this.store.activeCaseId?'<option value="" selected>选择调查页…</option>':''; this.refs.caseSelect.innerHTML=opts.length?placeholder+opts.map(o=>`<option value="${esc(o.value)}" ${o.value===this.store.activeCaseId?'selected':''}>${esc(o.label)}</option>`).join(''):`<option value="">暂无调查页</option>`; const manage=this.root.querySelector('.nb-case-manage'); if(manage) manage.disabled=!this.activeCase();
      const c=this.activeCase(), counts=this.counts(c);
      this.refs.tabs.innerHTML=TABS.map(t=>`<button type="button" class="nb-tab ${t===this.tab?'active':''}" data-tab="${t}">${TAB_LABEL[t]}<b>${counts[t]}</b></button>`).join('');
      if(!c){
        const policeHint=this.livePolice.length?`当前有 ${this.livePolice.length} 个警务事项可从上方案件选择器建立手册页。`:'当前没有可读取的警务事项。';
        this.refs.list.innerHTML=`<div class="nb-empty"><strong>还没有调查页</strong><small>${esc(policeHint)} 也可以点击“＋案件”建立完全私人的调查页。</small></div>`;
      } else this.refs.list.innerHTML=this.renderCards(c,this.tab);
      this.refs.count.textContent=String(this.selected.size); this.refs.send.disabled=this.selected.size===0;
    }
    renderCards(c,type){ const rows=array(c[type]); if(!rows.length) return `<div class="nb-empty"><strong>还没有${TYPE_LABEL[type]}</strong><small>这里由你自己记录。系统不会因为手册内容而改变 MVU、案件真相或人物认知。</small></div>`; return rows.map(row=>this.card(row,type)).join(''); }
    selectionKey(type,idv){ return `${type}:${idv}`; }
    card(row,type){
      const selected=this.selected.has(this.selectionKey(type,row.id));
      let title='',body='',meta=[],badge='',tags=[];
      if(type==='clues'){title=row.title||'未命名线索';body=row.body;badge=STATUS_LABEL[row.status];if(row.source)meta.push(`来源：${row.source}`);if(row.time)meta.push(`时间：${row.time}`);if(row.place)meta.push(`地点：${row.place}`);tags=row.tags;}
      if(type==='people'){title=row.name||'未命名人物';body=row.notes;if(row.relation)badge=row.relation;if(row.focus)meta.push(`关注：${row.focus}`);}
      if(type==='timeline'){title=row.title||row.time||'时间节点';body=row.body;badge=CERTAINTY_LABEL[row.certainty];if(row.time)meta.push(`时间：${row.time}`);if(row.place)meta.push(`地点：${row.place}`);if(row.source)meta.push(`来源：${row.source}`);}
      if(type==='theories'){title=row.title||'未命名推测';body=row.body;badge=STATUS_LABEL[row.status];if(row.evidence)meta.push(`依据：${truncate(row.evidence,90)}`);if(row.against)meta.push(`反证：${truncate(row.against,90)}`);}
      const statusClass=type==='clues'||type==='theories'?`status-${row.status}`:'';
      return `<article class="nb-card ${selected?'selected':''}"><button type="button" class="nb-pick" data-action="toggle-select" data-type="${type}" data-id="${esc(row.id)}" aria-label="选择用于下一轮">${this.icon('check')}</button><div class="nb-card-main"><div class="nb-card-title"><h3>${esc(title)}</h3>${badge?`<span class="nb-badge ${statusClass}">${esc(badge)}</span>`:''}</div>${body?`<div class="nb-body">${nl(body)}</div>`:''}${meta.length?`<div class="nb-meta">${meta.map(v=>`<span>${esc(v)}</span>`).join('')}</div>`:''}${tags.length?`<div class="nb-tags">${tags.map(v=>`<span class="nb-tag">${esc(v)}</span>`).join('')}</div>`:''}${row.quote?`<div class="nb-quote"><b>引用正文</b>${nl(truncate(row.quote.excerpt,230))}</div>`:''}</div><div class="nb-card-actions">${row.quote?`<button class="nb-mini" type="button" data-action="source" data-type="${type}" data-id="${esc(row.id)}" aria-label="查看原文">${this.icon('source')}</button>`:''}<button class="nb-mini" type="button" data-action="edit-entry" data-type="${type}" data-id="${esc(row.id)}" aria-label="编辑">${this.icon('edit')}</button><button class="nb-mini danger" type="button" data-action="delete-entry" data-type="${type}" data-id="${esc(row.id)}" aria-label="删除">${this.icon('trash')}</button></div></article>`;
    }
    toggleSelect(type,idv){ const key=this.selectionKey(type,idv); this.selected.has(key)?this.selected.delete(key):this.selected.add(key); this.render(); }
    entry(type,idv){ return array(this.activeCase()?.[type]).find(v=>v.id===idv)||null; }
    openSource(type,idv){ const row=this.entry(type,idv); const q=row?.quote;if(!q)return;this.close();setTimeout(()=>{if(!scrollToMessage(q))this.toast('没有在当前聊天页面找到对应楼层。');},80); }
    openCaseEditor(existing=null){ const c=existing?clone(existing):null; this.editor={kind:'case',id:c?.id||'',source:c?.source||'manual',linkedMatter:c?.linkedMatter||'',quote:null}; this.refs.editorWrap.hidden=false; this.refs.editorTitle.textContent=c?'编辑调查页':'新建调查页'; const link=c?.source==='police'&&c?.linkedMatter?`<div class="nb-quote-box"><b>关联警务事项</b><br>${esc(c.linkedMatter)}<br><small>这里只修改手册页标题，不会修改警务事项。</small></div>`:''; this.refs.form.innerHTML=`<label class="nb-field"><span>标题</span><input name="title" maxlength="80" required value="${esc(c?.title||'')}" placeholder="例如：白鹭商店街奇怪的包裹"></label>${link}<div class="nb-editor-actions">${c?'<button type="button" class="nb-secondary" data-form-action="delete-case">删除调查页</button>':''}<button type="button" class="nb-secondary" data-action="cancel-editor">取消</button><button class="nb-save" type="submit">${c?'保存':'建立'}</button></div>`; this.refs.form.querySelector('input')?.focus(); }
    openEntryEditor(type,idv){ const row=idv?clone(this.entry(type,idv)):null; this.editor={kind:'entry',type,id:idv||'',row:row||{},quote:row?.quote||null}; this.refs.editorWrap.hidden=false; this.refs.editorTitle.textContent=`${idv?'编辑':'新建'}${TYPE_LABEL[type]}`; this.renderEditorForm(); }
    renderEditorForm(){ if(!this.editor||this.editor.kind!=='entry')return; const t=this.editor.type,r=this.editor.row||{},q=this.editor.quote;
      const quoteBox=`<button type="button" class="nb-quote-btn" data-form-action="quote-latest">${this.icon('quote')}引用最近一条 Assistant 正文</button><div class="nb-quote-box ${q?'':'empty'}">${q?nl(truncate(q.excerpt,320)):'尚未引用正文。引用只保存出处和摘录，不会自动解释或判断内容。'}</div>`;
      let fields='';
      if(t==='clues') fields=`<label class="nb-field"><span>标题</span><input name="title" maxlength="100" required value="${esc(r.title)}"></label><label class="nb-field"><span>内容</span><textarea name="body" required>${esc(r.body)}</textarea></label><div class="nb-grid2"><label class="nb-field"><span>来源</span><input name="source" value="${esc(r.source)}" placeholder="例如：石川诚一的说法"></label><label class="nb-field"><span>状态</span><select name="status">${['unconfirmed','confirmed','doubtful','contradiction','important','excluded'].map(v=>`<option value="${v}" ${r.status===v?'selected':''}>${STATUS_LABEL[v]}</option>`).join('')}</select></label><label class="nb-field"><span>时间</span><input name="time" value="${esc(r.time)}" placeholder="可为空"></label><label class="nb-field"><span>地点</span><input name="place" value="${esc(r.place)}" placeholder="可为空"></label></div><label class="nb-field"><span>标签</span><input name="tags" value="${esc(array(r.tags).join('，'))}" placeholder="证言，未确认，票据"></label>`;
      if(t==='people') fields=`<label class="nb-field"><span>姓名</span><input name="name" maxlength="80" required value="${esc(r.name)}"></label><label class="nb-field"><span>与调查的关系</span><input name="relation" value="${esc(r.relation)}" placeholder="例如：走失者、邻居、目击者"></label><label class="nb-field"><span>我的记录</span><textarea name="notes">${esc(r.notes)}</textarea></label><label class="nb-field"><span>当前关注</span><textarea name="focus" style="min-height:75px">${esc(r.focus)}</textarea></label>`;
      if(t==='timeline') fields=`<div class="nb-grid2"><label class="nb-field"><span>时间</span><input name="time" value="${esc(r.time)}" placeholder="例如：8月15日下午"></label><label class="nb-field"><span>时间性质</span><select name="certainty">${['exact','approximate','unknown'].map(v=>`<option value="${v}" ${r.certainty===v?'selected':''}>${CERTAINTY_LABEL[v]}</option>`).join('')}</select></label></div><label class="nb-field"><span>标题</span><input name="title" maxlength="100" required value="${esc(r.title)}"></label><label class="nb-field"><span>记录</span><textarea name="body">${esc(r.body)}</textarea></label><div class="nb-grid2"><label class="nb-field"><span>地点</span><input name="place" value="${esc(r.place)}"></label><label class="nb-field"><span>来源</span><input name="source" value="${esc(r.source)}"></label></div>`;
      if(t==='theories') fields=`<label class="nb-field"><span>推测</span><input name="title" maxlength="110" required value="${esc(r.title)}"></label><label class="nb-field"><span>说明</span><textarea name="body">${esc(r.body)}</textarea></label><label class="nb-field"><span>依据</span><textarea name="evidence" style="min-height:80px">${esc(r.evidence)}</textarea></label><label class="nb-field"><span>反证 / 不利信息</span><textarea name="against" style="min-height:80px">${esc(r.against)}</textarea></label><label class="nb-field"><span>状态</span><select name="status">${['keep','supported','rejected'].map(v=>`<option value="${v}" ${r.status===v?'selected':''}>${STATUS_LABEL[v]}</option>`).join('')}</select></label>`;
      this.refs.form.innerHTML=quoteBox+fields+`<div class="nb-editor-actions"><button type="button" class="nb-secondary" data-action="cancel-editor">取消</button><button class="nb-save" type="submit">保存</button></div>`;
    }
    closeEditor(){ this.editor=null; this.refs.editorWrap.hidden=true; this.refs.form.innerHTML=''; }
    async submitEditor(fd){
      if(!this.editor)return;
      if(this.editor.kind==='case'){
        const title=text(fd.get('title')).trim(); if(!title)return;
        if(this.editor.id && this.store.cases[this.editor.id]) { const c=this.store.cases[this.editor.id]; c.title=title; c.updatedAt=now(); this.store.activeCaseId=c.id; this.store=await saveStore(this.store); this.closeEditor(); this.render(); this.toast('调查页已更新。'); }
        else { const cid=id('case'); this.store.cases[cid]=normalizeCase({id:cid,title,source:'manual'}); this.store.activeCaseId=cid; this.store=await saveStore(this.store); this.closeEditor(); this.selected.clear(); this.render(); this.toast('调查页已建立。'); }
        return;
      }
      const c=this.activeCase(); if(!c)return; const t=this.editor.type; const existing=this.editor.id?this.entry(t,this.editor.id):null; const base={...(existing||{}),id:existing?.id||id(t),quote:this.editor.quote,createdAt:existing?.createdAt||now(),updatedAt:now()}; let row;
      if(t==='clues') row=normalizeClue({...base,title:fd.get('title'),body:fd.get('body'),source:fd.get('source'),time:fd.get('time'),place:fd.get('place'),tags:splitTags(fd.get('tags')),status:fd.get('status')});
      if(t==='people') row=normalizePerson({...base,name:fd.get('name'),relation:fd.get('relation'),notes:fd.get('notes'),focus:fd.get('focus')});
      if(t==='timeline') row=normalizeTimeline({...base,time:fd.get('time'),certainty:fd.get('certainty'),title:fd.get('title'),body:fd.get('body'),place:fd.get('place'),source:fd.get('source')});
      if(t==='theories') row=normalizeTheory({...base,title:fd.get('title'),body:fd.get('body'),evidence:fd.get('evidence'),against:fd.get('against'),status:fd.get('status')});
      const rows=array(c[t]); const at=rows.findIndex(v=>v.id===row.id); if(at>=0) rows[at]=row; else rows.unshift(row); c[t]=rows; c.updatedAt=now(); this.store=await saveStore(this.store); this.closeEditor(); this.render(); this.toast('已保存。');
    }
    async deleteCase(){ const cid=this.editor?.id; if(!cid||!this.store.cases[cid])return; const ask=hostWin.confirm ? hostWin.confirm('删除这个调查页以及其中全部手册记录？这不会删除警务事项或MVU数据。') : false; if(!ask)return; delete this.store.cases[cid]; const next=Object.keys(this.store.cases)[0]||''; this.store.activeCaseId=next; this.store=await saveStore(this.store); this.selected.clear(); this.closeEditor(); this.render(); this.toast('调查页已删除；警务事项未受影响。'); }
    async deleteEntry(type,idv){ const c=this.activeCase(); if(!c)return; if(!hostWin.confirm?.(`删除这条${TYPE_LABEL[type]}？`))return; c[type]=array(c[type]).filter(v=>v.id!==idv); c.updatedAt=now(); this.selected.delete(this.selectionKey(type,idv)); this.store=await saveStore(this.store); this.render(); }
    selectedRows(){ const c=this.activeCase();if(!c)return[];const rows=[];for(const key of this.selected){const [type,idv]=key.split(':');const row=array(c[type]).find(v=>v.id===idv);if(row)rows.push({type,row});}return rows; }
    noteLine(type,row){
      if(type==='clues'){ let s=`[线索] ${row.title||'未命名'}：${row.body||''}`; if(row.status)s+=`（用户标记：${STATUS_LABEL[row.status]||row.status}）`; return s; }
      if(type==='people') return `[人物笔记] ${row.name||'未命名'}：${row.notes||row.focus||''}${row.relation?`（与调查关系：${row.relation}）`:''}`;
      if(type==='timeline') return `[时间线] ${row.time||'时间未定'}｜${row.title||''}：${row.body||''}（${CERTAINTY_LABEL[row.certainty]||'时间未定'}）`;
      if(type==='theories') return `[用户推测] ${row.title||'未命名'}：${row.body||''}${row.evidence?`；依据：${row.evidence}`:''}${row.against?`；反证：${row.against}`:''}（用户状态：${STATUS_LABEL[row.status]||row.status}）`;
      return '';
    }
    sendSelected(){ const c=this.activeCase(), rows=this.selectedRows(); if(!c||!rows.length)return; const lines=rows.map(v=>this.noteLine(v.type,v.row)).filter(Boolean); const block=`<user_investigation_notes>\n以下内容是{{user}}主动选择用于本轮参考的个人调查笔记。它们可能包含未确认信息、主观判断或错误推测，不代表世界客观事实、警方已确认事实或其他角色已经知道。除非正文或既有资料另有支持，不得将其自动升级为事实。\n调查页：${c.title}\n${lines.map(v=>`- ${v}`).join('\n')}\n</user_investigation_notes>`; if(appendToComposer(block)){this.selected.clear();this.render();this.toast('已加入输入框；只会在你实际发送这一轮时进入上下文。');} else this.toast('没有找到酒馆输入框。'); }
    destroy(){
      try { clearTimeout(this.toastTimer); } catch (_) {}
      this.opened=false; this.editor=null; this.selected?.clear?.();
      try { this.host?.remove(); } catch (_) {}
      this.host=null; this.root=null; this.shadow=null; this.refs={};
    }
    toast(message){ const el=this.refs.toast;if(!el)return;el.textContent=text(message);el.hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{if(el?.isConnected){el.hidden=true;}},2600); }
  }

  function boot(){
    if (destroyed) return;
    try {
      activeUI = new NotebookUI();
      const initialCharacterKey = currentCharacterKey();
      hostWin[NS] = { version: VERSION, destroy: destroyNotebook, ui: activeUI };
      bindNotebookLifecycle(initialCharacterKey);
      console.info(`[ShiomiNotebook] v${VERSION} ready`);
    } catch(error){
      cleanupNotebookRoot();
      console.error('[ShiomiNotebook] boot failed',error);
    }
  }
  if(hostDoc.readyState==='loading') hostDoc.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
