// 汐见小游戏框架 v0.1.0
// 仅负责前端小游戏加载、弹层与手动写入剧情输入框；不自动修改 MVU / 世界事实。
const VERSION = '0.1.0';
const LOG = '[ShiomiGames]';
const localWin = window;
const hostWin = (() => { try { return window.parent && window.parent.document ? window.parent : window; } catch (_) { return window; } })();
const hostDoc = hostWin.document || document;

const MODULES = Object.freeze({
  kings_game: new URL('../../kings-game/v0.1.0/index.js', import.meta.url).href,
  shiomi_cards: new URL('../../shiomi-cards/v0.1.0/index.js', import.meta.url).href,
});

// 这里只绑定已经存在且适合的地点。牌局模块先完成但不擅自把现有地点改成赌场。
const PLACE_BINDINGS = Object.freeze({
  blue_bell: ['kings_game'],
});

function text(v) { return String(v == null ? '' : v).trim(); }
function safeArray(v) { return Array.isArray(v) ? v : []; }
function composer() {
  for (const doc of [hostDoc, document]) {
    try {
      const el = doc.querySelector('#send_textarea, textarea#send_textarea, textarea[name="send_textarea"], textarea');
      if (el) return el;
    } catch (_) {}
  }
  return null;
}
function appendToComposer(value) {
  const ta = composer();
  if (!ta) return false;
  const old = String(ta.value || '').trim();
  ta.value = old ? `${old}\n${value}` : value;
  try { ta.dispatchEvent(new hostWin.Event('input', { bubbles: true })); } catch (_) {}
  try { ta.focus(); } catch (_) {}
  return true;
}

class GameHost {
  constructor() {
    this.registry = new Map();
    this.loading = new Map();
    this.host = null;
    this.root = null;
    this.shadow = null;
    this.active = null;
    this.frame = (() => { try { return localWin !== hostWin ? localWin.frameElement : null; } catch (_) { return null; } })();
    this.timer = 0;
    this.createRoot();
    this.bindLifecycle();
  }
  createRoot() {
    hostDoc.getElementById('shiomi-game-host')?.remove();
    this.host = hostDoc.createElement('div');
    this.host.id = 'shiomi-game-host';
    this.shadow = this.host.attachShadow?.({ mode: 'open' }) || null;
    this.root = this.shadow || this.host;
    this.root.innerHTML = `
      <style>
        :host{all:initial}.sg-shell,.sg-shell *{box-sizing:border-box}
        .sg-shell{position:fixed;inset:0;z-index:2147483300;display:none;background:rgba(21,24,24,.58);backdrop-filter:blur(4px);font:14px/1.5 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;color:#e9e7df}
        .sg-shell.open{display:grid;place-items:center;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
        .sg-window{position:relative;width:min(1120px,100%);height:min(780px,100%);border:1px solid rgba(215,210,191,.2);border-radius:18px;overflow:hidden;background:#1b2021;box-shadow:0 22px 70px rgba(0,0,0,.36)}
        .sg-content{width:100%;height:100%;overflow:auto}
        .sg-close{position:absolute;top:10px;right:10px;z-index:20;width:38px;height:38px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(20,24,24,.76);color:#f5f1e7;font-size:22px;line-height:1;cursor:pointer;backdrop-filter:blur(8px)}
        .sg-close:active{transform:scale(.97)}
        @media(max-width:760px){.sg-shell.open{padding:0}.sg-window{width:100vw;height:100dvh;border:0;border-radius:0}.sg-close{top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right))}}
      </style>
      <section class="sg-shell" aria-hidden="true">
        <div class="sg-window">
          <button class="sg-close" type="button" aria-label="关闭小游戏">×</button>
          <div class="sg-content"></div>
        </div>
      </section>`;
    (hostDoc.body || hostDoc.documentElement).appendChild(this.host);
    this.shell = this.root.querySelector('.sg-shell');
    this.content = this.root.querySelector('.sg-content');
    this.root.querySelector('.sg-close')?.addEventListener('click', () => this.close());
    this.shell?.addEventListener('pointerdown', e => { if (e.target === this.shell) this.close(); });
  }
  bindLifecycle() {
    try {
      for (const name of ['pagehide','beforeunload','unload']) localWin.addEventListener(name, () => this.destroy(), { once: true });
    } catch (_) {}
    if (localWin !== hostWin && this.frame) {
      this.timer = (hostWin.setInterval || setInterval)(() => {
        try {
          const root = hostDoc.documentElement || hostDoc.body;
          if (root && !root.contains(this.frame)) this.destroy();
        } catch (_) {}
      }, 900);
    }
  }
  register(definition) {
    if (!definition || !text(definition.id) || typeof definition.mount !== 'function') throw new Error('小游戏模块缺少 id 或 mount。');
    this.registry.set(definition.id, definition);
    return definition;
  }
  descriptor(id) {
    const d = this.registry.get(id);
    if (d) return { id: d.id, label: d.label || d.id, description: d.description || '' };
    const labels = {
      kings_game: ['国王游戏','多人抽号与命令游戏'],
      shiomi_cards: ['汐见牌局','三列式两胜卡牌游戏'],
    };
    const row = labels[id] || [id,id];
    return { id, label: row[0], description: row[1] };
  }
  gamesForPlace(placeId) {
    return safeArray(PLACE_BINDINGS[text(placeId)]).map(id => this.descriptor(id));
  }
  async ensure(id) {
    if (this.registry.has(id)) return this.registry.get(id);
    if (!MODULES[id]) throw new Error(`未登记小游戏：${id}`);
    if (!this.loading.has(id)) {
      this.loading.set(id, import(MODULES[id]).then(() => {
        const hit = this.registry.get(id);
        if (!hit) throw new Error(`小游戏模块「${id}」载入后未注册。`);
        return hit;
      }).finally(() => this.loading.delete(id)));
    }
    return this.loading.get(id);
  }
  async open(id, options = {}) {
    const game = await this.ensure(id);
    this.close(false);
    this.content.replaceChildren();
    this.shell.classList.add('open');
    this.shell.setAttribute('aria-hidden','false');
    this.active = { id, game, cleanup: null };
    const api = {
      hostWin, hostDoc,
      close: () => this.close(),
      writeToComposer: appendToComposer,
      place: options.place || null,
      gameHost: this,
    };
    try {
      const cleanup = await game.mount(this.content, api, options);
      if (this.active?.id === id && typeof cleanup === 'function') this.active.cleanup = cleanup;
    } catch (error) {
      console.error(LOG, '小游戏启动失败。', error);
      this.content.innerHTML = `<div style="padding:60px 24px;text-align:center;color:#eee">小游戏启动失败：${String(error?.message || error)}</div>`;
    }
  }
  close(hide = true) {
    try { this.active?.cleanup?.(); } catch (_) {}
    this.active = null;
    this.content?.replaceChildren();
    if (hide) {
      this.shell?.classList.remove('open');
      this.shell?.setAttribute('aria-hidden','true');
    }
  }
  destroy() {
    this.close();
    if (this.timer) { try { (hostWin.clearInterval || clearInterval)(this.timer); } catch (_) {} this.timer = 0; }
    try { this.host?.remove(); } catch (_) {}
    try { if (hostWin.ShiomiGames === this) hostWin.ShiomiGames = null; } catch (_) {}
    try { if (localWin.ShiomiGames === this) localWin.ShiomiGames = null; } catch (_) {}
  }
}

try { hostWin.ShiomiGames?.destroy?.(); } catch (_) {}
const api = new GameHost();
hostWin.ShiomiGames = api;
localWin.ShiomiGames = api;
console.info(LOG, `小游戏框架 v${VERSION} 已就绪。`);

export default api;
