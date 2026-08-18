// 汐见地图 v1.5.0 · v1.4.0 地图 + 地点/地区CG按视口单图惰性渲染
// 说明：地图底图仍读取角色卡内置数据；CG 只从 ShiomiAssets 远程清单按需取得。
// 性能原则：详情面板一次最多存在 1 个 CG <img>；只有 CG 区进入可视范围才赋予 src；离开可视范围即卸载。
(async () => {
  'use strict';
  const VERSION = '1.5.0';
  const BASE_VERSION = '1.4.0';
  const LOG = '[ShiomiMapCG]';

  function safeHostWindow() {
    try { if (window.parent && window.parent.document) return window.parent; } catch (_) {}
    return window;
  }
  const localWin = window;
  const hostWin = safeHostWindow();
  const hostDoc = hostWin.document;
  const text = v => String(v == null ? '' : v).trim();
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const list = v => Array.isArray(v) ? v : [];
  const norm = v => text(v).toLocaleLowerCase('zh-CN').replace(/[\s\u3000·・,，。.!！?？:：;；'"“”‘’()（）\[\]【】<>《》〈〉—_\-/\\]+/g,'');

  // 清理旧的 CG 桥；底层地图由新的 v1.4.0 实例重新建立。
  try { (hostWin.__SHIOMI_MAP_CG_BRIDGE__ || localWin.__SHIOMI_MAP_CG_BRIDGE__)?.destroy?.(); } catch (_) {}

  // 复用 v1.4.0 的成熟地图逻辑，不复制/改写底图、坐标、缩放与交互系统。
  // 带查询参数可避免同一页面热更新时命中 ES module 缓存而不重新执行 v1.4.0。
  const baseUrl = new URL('../v1.4.0/index.js', import.meta.url);
  try {
    const fresh = new URL(baseUrl.href);
    fresh.searchParams.set('shiomi_bridge', VERSION);
    await import(fresh.href);
  } catch (error) {
    console.warn(LOG, '带版本参数载入基础地图失败，尝试标准路径。', error);
    await import(baseUrl.href);
  }

  const mapApi = hostWin.ShiomiMap || localWin.ShiomiMap;
  if (!mapApi) throw new Error('基础地图 v1.4.0 未建立。');

  class CgPanelBridge {
    constructor() {
      this.host = null;
      this.root = null;
      this.panel = null;
      this.content = null;
      this.mo = null;
      this.io = null;
      this.panelMo = null;
      this.currentTitle = '';
      this.currentRecord = null;
      this.currentKind = '';
      this.index = 0;
      this.visible = false;
      this.image = null;
      this.section = null;
      this.captionZh = null;
      this.captionJa = null;
      this.counter = null;
      this.loader = null;
      this.loadToken = 0;
      this.destroyed = false;
      this.nameIndex = null;
      this.pending = null;
      this.styleEl = null;
      this.hostWatcher = null;
    }

    manager() { return hostWin.ShiomiAssets || localWin.ShiomiAssets || null; }

    async ensureIndex() {
      if (this.nameIndex) return this.nameIndex;
      const manager = this.manager();
      if (!manager) throw new Error('ShiomiAssets 未就绪。');
      await manager.loadManifest(false);
      const index = new Map();
      const collections = obj(manager.manifest?.collections);
      for (const kind of ['places','regions']) {
        for (const [id, raw] of Object.entries(obj(collections[kind]))) {
          const row = obj(raw);
          const names = [row.nameZh,row.nameJa,row.name,row.id,id].map(text).filter(Boolean);
          for (const name of names) index.set(norm(name), {kind,id,row});
        }
      }
      this.nameIndex = index;
      return index;
    }

    async collectionForTitle(title) {
      const manager = this.manager();
      if (!manager) return null;
      const index = await this.ensureIndex();
      const hit = index.get(norm(title));
      if (!hit) return null;
      const record = await manager.collection(hit.kind, hit.id);
      if (!record || !list(record.gallery).length) return null;
      return {kind:hit.kind,id:hit.id,record};
    }

    findMapUi() {
      this.host = hostDoc.getElementById('shiomi-map-host');
      this.root = this.host?.shadowRoot || this.host || null;
      this.panel = this.root?.querySelector?.('.shiomi-map-panel') || null;
      this.content = this.root?.querySelector?.('.shiomi-map-panel-content') || null;
      return !!(this.host && this.root && this.panel && this.content);
    }

    installStyles() {
      if (!this.root || this.root.querySelector('#shiomi-map-cg-bridge-style')) return;
      const style = hostDoc.createElement('style');
      style.id = 'shiomi-map-cg-bridge-style';
      style.textContent = `
        .shiomi-map-panel.cg-enabled{width:min(430px,calc(100% - 32px));max-height:min(72vh,680px)}
        .shiomi-map-cg{margin:4px 0 17px;padding-top:14px;border-top:1px solid rgba(67,60,51,.12)}
        .shiomi-map-cg-head{display:flex;align-items:baseline;gap:7px;margin-bottom:9px;color:#35322d}
        .shiomi-map-cg-head strong{font:650 14px/1.2 "Noto Sans CJK SC","Microsoft YaHei",sans-serif}
        .shiomi-map-cg-head small{color:#8a8378;font:600 10px/1.2 sans-serif;letter-spacing:.08em}
        .shiomi-map-cg-count{margin-left:auto;color:#81796e;font:600 11px/1.2 sans-serif;font-variant-numeric:tabular-nums}
        .shiomi-map-cg-frame{position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;border:1px solid rgba(67,60,51,.12);border-radius:12px;background:linear-gradient(135deg,#eee7da,#e4d8c6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
        .shiomi-map-cg-frame img{display:block;width:100%;height:100%;object-fit:contain;background:#e9dfd0;opacity:0;transition:opacity .14s}
        .shiomi-map-cg-frame img.ready{opacity:1}
        .shiomi-map-cg-placeholder{position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;color:#81786b;font:500 12px/1.55 sans-serif;pointer-events:none}
        .shiomi-map-cg-placeholder b{display:block;color:#5f584e;font-weight:600;margin-bottom:2px}
        .shiomi-map-cg-caption{min-height:38px;margin:8px 2px 0;color:#4c4841}
        .shiomi-map-cg-caption span{display:block;font:600 12px/1.4 "Noto Sans CJK SC","Microsoft YaHei",sans-serif}
        .shiomi-map-cg-caption small{display:block;margin-top:1px;color:#888074;font:500 11px/1.35 "Noto Sans CJK JP","Yu Gothic",sans-serif}
        .shiomi-map-cg-nav{display:flex;gap:7px;margin-top:9px}
        .shiomi-map-cg-nav button{flex:1;border:1px solid rgba(67,60,51,.18);border-radius:9px;background:#f8f4ec;color:#48443e;padding:8px 10px;font:600 12px/1 sans-serif;cursor:pointer;touch-action:manipulation}
        .shiomi-map-cg-nav button:hover,.shiomi-map-cg-nav button:focus-visible{background:#eee7dc;outline:none}
        .shiomi-map-cg-nav button:disabled{opacity:.35;cursor:default}
        @media(max-width:900px){.shiomi-map-panel.cg-enabled{width:auto;max-height:min(64vh,620px)}.shiomi-map-cg-frame{aspect-ratio:16/10}}
        @media(prefers-reduced-motion:reduce){.shiomi-map-cg-frame img{transition:none}}
      `;
      this.root.appendChild(style);
      this.styleEl = style;
    }

    async syncPanel() {
      if (this.destroyed || !this.content) return;
      const title = text(this.content.querySelector('h2')?.textContent);
      if (!title) { this.removeGallery(); return; }
      if (title === this.currentTitle && this.section?.isConnected) return;
      this.currentTitle = title;
      const serial = Symbol(title);
      this.pending = serial;
      let found = null;
      try { found = await this.collectionForTitle(title); }
      catch (error) { console.warn(LOG, `CG 清单读取失败：${title}`, error); }
      if (this.destroyed || this.pending !== serial || this.currentTitle !== title) return;
      if (!found) { this.removeGallery(false); return; }
      this.currentKind = found.kind;
      this.currentRecord = found.record;
      this.index = 0;
      this.mountGallery();
    }

    mountGallery() {
      this.removeGallery(false);
      const record = this.currentRecord;
      const gallery = list(record?.gallery);
      if (!gallery.length || !this.content) return;

      const section = hostDoc.createElement('section');
      section.className = 'shiomi-map-cg';
      section.setAttribute('aria-label', `${record.nameZh || this.currentTitle} 场景图`);

      const head = hostDoc.createElement('div'); head.className = 'shiomi-map-cg-head';
      const strong = hostDoc.createElement('strong'); strong.textContent = '场景图';
      const small = hostDoc.createElement('small'); small.textContent = 'SCENE CG';
      const count = hostDoc.createElement('span'); count.className = 'shiomi-map-cg-count';
      head.append(strong,small,count);

      const frame = hostDoc.createElement('div'); frame.className = 'shiomi-map-cg-frame';
      const img = hostDoc.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      try { img.fetchPriority = 'low'; } catch (_) {}
      const placeholder = hostDoc.createElement('div'); placeholder.className='shiomi-map-cg-placeholder';
      placeholder.innerHTML = '<div><b>滚动到这里后载入</b><span>表示位置に入ると読み込みます</span></div>';
      frame.append(img,placeholder);

      const caption = hostDoc.createElement('div'); caption.className='shiomi-map-cg-caption';
      const capZh = hostDoc.createElement('span');
      const capJa = hostDoc.createElement('small');
      caption.append(capZh,capJa);

      const nav = hostDoc.createElement('div'); nav.className='shiomi-map-cg-nav';
      const prev = hostDoc.createElement('button'); prev.type='button'; prev.textContent='‹ 上一张';
      const next = hostDoc.createElement('button'); next.type='button'; next.textContent='下一张 ›';
      nav.append(prev,next);
      section.append(head,frame,caption);
      if (gallery.length > 1) section.append(nav);

      const actions = this.content.querySelector('.shiomi-map-actions');
      if (actions) this.content.insertBefore(section, actions); else this.content.appendChild(section);
      this.panel?.classList.add('cg-enabled');
      this.section=section; this.image=img; this.loader=placeholder; this.captionZh=capZh; this.captionJa=capJa; this.counter=count;

      const step = delta => {
        if (!this.currentRecord) return;
        const rows=list(this.currentRecord.gallery);
        if (!rows.length) return;
        this.index = (this.index + delta + rows.length) % rows.length;
        this.updateMeta();
        this.unloadImage(false);
        if (this.visible) this.loadCurrent();
      };
      prev.addEventListener('click',()=>step(-1));
      next.addEventListener('click',()=>step(1));
      this.updateMeta();

      if (typeof hostWin.IntersectionObserver === 'function') {
        this.io = new hostWin.IntersectionObserver(entries => {
          const entry = entries[entries.length-1];
          const now = !!entry?.isIntersecting && entry.intersectionRatio > 0;
          if (now === this.visible) return;
          this.visible = now;
          if (now) this.loadCurrent(); else this.unloadImage(true);
        }, { root:this.panel, rootMargin:'24px 0px 24px 0px', threshold:0.01 });
        this.io.observe(section);
      } else {
        this.visible = true;
        this.loadCurrent();
      }
    }

    updateMeta() {
      const rows=list(this.currentRecord?.gallery);
      const item=obj(rows[this.index]);
      if (this.counter) this.counter.textContent = rows.length ? `${this.index+1} / ${rows.length}` : '';
      if (this.captionZh) this.captionZh.textContent = text(item.labelZh) || `场景 ${this.index+1}`;
      if (this.captionJa) this.captionJa.textContent = text(item.labelJa) || '';
    }

    async loadCurrent() {
      if (!this.visible || !this.image || !this.currentRecord) return;
      const rows=list(this.currentRecord.gallery);
      const item=obj(rows[this.index]);
      const url=text(item.url);
      if (!url) return;
      const token=++this.loadToken;
      const img=this.image;
      img.classList.remove('ready');
      img.removeAttribute('src');
      img.alt = `${text(this.currentRecord.nameZh || this.currentTitle)} · ${text(item.labelZh || item.labelJa || `场景 ${this.index+1}`)}`;
      if (this.loader) {
        this.loader.hidden=false;
        this.loader.innerHTML='<div><b>正在载入当前场景</b><span>現在のシーンを読み込み中</span></div>';
      }
      img.onload=()=>{
        if (token!==this.loadToken || !this.visible) return;
        img.classList.add('ready');
        if(this.loader)this.loader.hidden=true;
      };
      img.onerror=()=>{
        if(token!==this.loadToken)return;
        img.classList.remove('ready');
        if(this.loader){this.loader.hidden=false;this.loader.innerHTML='<div><b>场景图暂时无法载入</b><span>画像を読み込めませんでした</span></div>';}
      };
      // 关键：这里只给当前可见的一张图设置 src；不存在隐藏图、缩略图列表或预取队列。
      img.src=url;
    }

    unloadImage(offscreen=true) {
      this.loadToken++;
      if (!this.image) return;
      this.image.onload=null; this.image.onerror=null;
      this.image.classList.remove('ready');
      this.image.removeAttribute('src');
      if (this.loader) {
        this.loader.hidden=false;
        this.loader.innerHTML = offscreen
          ? '<div><b>滚动到这里后载入</b><span>表示位置に入ると読み込みます</span></div>'
          : '<div><b>准备载入当前场景</b><span>現在のシーンを準備中</span></div>';
      }
    }

    removeGallery(resetTitle=true) {
      try { this.io?.disconnect(); } catch (_) {}
      this.io=null; this.visible=false; this.unloadImage(false);
      this.section?.remove(); this.section=null; this.image=null; this.loader=null; this.captionZh=null; this.captionJa=null; this.counter=null;
      this.panel?.classList.remove('cg-enabled');
      this.currentRecord=null; this.currentKind=''; this.index=0;
      if(resetTitle)this.currentTitle='';
    }

    attach() {
      if (this.destroyed) return false;
      if (!this.findMapUi()) return false;
      this.installStyles();
      this.mo = new hostWin.MutationObserver(() => void this.syncPanel());
      this.mo.observe(this.content,{childList:true,subtree:false});
      this.panelMo = new hostWin.MutationObserver(() => {
        if (!this.panel?.classList.contains('open')) { this.visible=false; this.unloadImage(true); }
        else if (this.section && !this.io) { this.visible=true; this.loadCurrent(); }
      });
      this.panelMo.observe(this.panel,{attributes:true,attributeFilter:['class','aria-hidden']});
      void this.syncPanel();
      console.info(LOG, '地图详情 CG 桥已挂载：仅可视单图渲染。');
      return true;
    }

    start() {
      if (this.attach()) return this;
      this.hostWatcher = new hostWin.MutationObserver(() => {
        if (this.attach()) { try{this.hostWatcher?.disconnect();}catch(_){} this.hostWatcher=null; }
      });
      this.hostWatcher.observe(hostDoc.documentElement || hostDoc,{childList:true,subtree:true});
      return this;
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed=true;
      try{this.mo?.disconnect();}catch(_){} try{this.panelMo?.disconnect();}catch(_){} try{this.hostWatcher?.disconnect();}catch(_){} try{this.io?.disconnect();}catch(_){}
      this.mo=this.panelMo=this.hostWatcher=this.io=null;
      this.removeGallery();
      this.styleEl?.remove(); this.styleEl=null;
      if(hostWin.__SHIOMI_MAP_CG_BRIDGE__===this)try{delete hostWin.__SHIOMI_MAP_CG_BRIDGE__;}catch(_){hostWin.__SHIOMI_MAP_CG_BRIDGE__=undefined;}
      if(localWin.__SHIOMI_MAP_CG_BRIDGE__===this)try{delete localWin.__SHIOMI_MAP_CG_BRIDGE__;}catch(_){localWin.__SHIOMI_MAP_CG_BRIDGE__=undefined;}
    }
  }

  const bridge = new CgPanelBridge().start();
  hostWin.__SHIOMI_MAP_CG_BRIDGE__=bridge;
  localWin.__SHIOMI_MAP_CG_BRIDGE__=bridge;

  // 在不改变底层生命周期的情况下，把公开版本标记为 1.5.0，并在销毁地图时同步清理 CG 观察器。
  const originalDestroy = typeof mapApi.destroy === 'function' ? mapApi.destroy.bind(mapApi) : null;
  const originalGetState = typeof mapApi.getState === 'function' ? mapApi.getState.bind(mapApi) : (()=>({}));
  mapApi.version=VERSION;
  mapApi.baseVersion=BASE_VERSION;
  mapApi.cgMode='visible-single-image';
  mapApi.getState=()=>({...obj(originalGetState()),version:VERSION,baseVersion:BASE_VERSION,cgMode:'visible-single-image'});
  if(originalDestroy) mapApi.destroy=()=>{try{bridge.destroy();}catch(_){} return originalDestroy();};

  console.info(LOG, `v${VERSION} 已就绪：地图 v${BASE_VERSION} + 地点/地区 CG 惰性单图渲染。`);
})();
