// 汐见地图 v1.4.0 · 内置单张底图 / 地点小游戏接入 / 最大缩放 200%
// 运行环境：SillyTavern + 酒馆助手 / Tavern Helper
// 数据来源：关闭状态世界书条目「【地图卷】汐见市地图数据」
(() => {
  'use strict';

  const VERSION = '1.4.0';
  const ENTRY_TITLE = '【地图卷】汐见市地图数据';
  const ROOT_ID = 'shiomi-map-host';
  const LOG = '[ShiomiMap]';
  const MIN_ZOOM = 0.62;
  const MAX_ZOOM = 2.0;

  function safeHostWindow() {
    try { if (window.parent && window.parent.document) return window.parent; } catch (_) {}
    return window;
  }

  const localWin = window;
  const hostWin = safeHostWindow();
  const hostDoc = hostWin.document;

  try {
    const old = hostWin.ShiomiMap || localWin.ShiomiMap;
    if (old && typeof old.destroy === 'function') old.destroy();
  } catch (error) {
    console.warn(LOG, '旧实例清理失败，将继续建立新实例。', error);
  }

  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value : [];
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalize = value => text(value)
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s\u3000·・,，。.!！?？:：;；'"“”‘’()（）\[\]【】<>《》〈〉—_\-/\\]+/g, '');
  const pairList = value => list(value)
    .map(point => Array.isArray(point) && point.length >= 2 ? [finite(point[0]), finite(point[1])] : null)
    .filter(Boolean);

  function nodeTitle(entry) {
    return text(entry?.name || entry?.comment || entry?.title || entry?.uid || entry?.id);
  }

  function isPublicNode(node) {
    const visibility = text(node?.visibility).toLowerCase();
    return node?.public !== false && node?.known !== false && node?.hidden !== true &&
      visibility !== 'private' && visibility !== 'hidden' && visibility !== 'secret';
  }

  function stripJsonWrapper(source) {
    let value = text(source).replace(/^\uFEFF/, '');
    const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) value = fenced[1].trim();
    const tagged = value.match(/^<json>\s*([\s\S]*?)\s*<\/json>$/i);
    if (tagged) value = tagged[1].trim();
    return value;
  }

  function trackEvent(name, handler, disposers) {
    if (!name || typeof handler !== 'function' || typeof eventOn !== 'function') return;
    try {
      const unsubscribe = eventOn(name, handler);
      if (typeof unsubscribe === 'function') disposers.push(unsubscribe);
      else if (typeof eventOff === 'function') disposers.push(() => { try { eventOff(name, handler); } catch (_) {} });
    } catch (error) {
      console.warn(LOG, `事件监听失败：${name}`, error);
    }
  }

  function pointInPolygon(x, y, rawPolygon) {
    const polygon = pairList(rawPolygon);
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersects = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function polygonCenter(rawPolygon, fallbackX = 0, fallbackY = 0) {
    const polygon = pairList(rawPolygon);
    if (!polygon.length) return { x: fallbackX, y: fallbackY };
    let x = 0, y = 0;
    for (const p of polygon) { x += p[0]; y += p[1]; }
    return { x: x / polygon.length, y: y / polygon.length };
  }

  const ICON_PATHS = Object.freeze({
    station: 'M5 4h14v12H5z M8 8h8 M8 12h8 M8 20l3-4 M16 20l-3-4',
    station_exit: 'M5 5h10v14H5z M10 12h9 M16 9l3 3-3 3',
    police: 'M12 3l7 3v5c0 4.6-2.9 7.8-7 10-4.1-2.2-7-5.4-7-10V6z M9 11h6',
    government: 'M3 9l9-5 9 5 M5 10h14 M6 10v8 M10 10v8 M14 10v8 M18 10v8 M4 19h16',
    hospital: 'M4 4h16v16H4z M12 8v8 M8 12h8',
    school: 'M3 9l9-5 9 5-9 5z M7 12v5c3 2 7 2 10 0v-5',
    university: 'M2.5 8.5 12 4l9.5 4.5L12 13z M6 11.5V17h12v-5.5 M4 19h16',
    commercial: 'M6 8h12l1 12H5z M9 9V7a3 3 0 016 0v2',
    shop: 'M4 9h16l-1-5H5z M6 9v11h12V9 M9 14h6',
    culture: 'M5 5h14v14H5z M8 9h8 M8 13h5 M8 17h3',
    nightlife: 'M6 4h12l-2 7a4 4 0 01-8 0z M12 15v5 M8 20h8',
    office: 'M5 3h14v18H5z M8 7h3 M13 7h3 M8 11h3 M13 11h3 M8 15h3 M13 15h3',
    hotel: 'M4 5v14 M20 9v10 M4 14h16 M7 10h5a3 3 0 013 3v1',
    food: 'M7 3v8 M4 3v5a3 3 0 006 0V3 M7 11v10 M16 3v18 M16 3c4 2 4 8 0 10',
    bath: 'M4 11h16v4a5 5 0 01-5 5H9a5 5 0 01-5-5z M7 8c-1-2 1-3 0-5 M12 8c-1-2 1-3 0-5',
    port: 'M12 3v15 M8 7h8 M5 13c0 4 3 7 7 8 4-1 7-4 7-8 M4 16h4 M16 16h4',
    airship: 'M5 9c1.5-4 12.5-4 14 0s-2 7-7 7-6-3-7-7z M8 16l-1 3 M16 16l1 3 M4 11H2 M22 11h-2',
    bridge: 'M3 17c3-8 15-8 18 0 M3 17h18 M7 17v-4 M17 17v-4',
    park: 'M12 3l5 7h-3l4 6h-5v5h-2v-5H6l4-6H7z',
    water: 'M3 9c3-3 5 3 8 0s5 3 10 0 M3 15c3-3 5 3 8 0s5 3 10 0',
    anchor: 'M12 3l8 9-8 9-8-9z M8 12h8',
    place: 'M12 4a6 6 0 016 6c0 4-6 10-6 10S6 14 6 10a6 6 0 016-6z M12 8v4 M10 10h4'
  });

  class MapRepository {
    constructor() {
      this.data = null;
      this.worldbookName = '';
      this.baseImage = null;
    }

    async worldbookNames() {
      const names = [];
      const add = value => {
        if (Array.isArray(value)) return value.forEach(add);
        const name = text(value);
        if (name && !names.some(item => item.toLowerCase() === name.toLowerCase())) names.push(name);
      };
      try {
        if (typeof getCharWorldbookNames === 'function') {
          const bound = getCharWorldbookNames('current'); add(bound?.primary); add(bound?.additional);
        }
      } catch (_) {}
      try { if (typeof getChatWorldbookName === 'function') add(getChatWorldbookName('current')); } catch (_) {}
      try { if (typeof getWorldbookNames === 'function') add(await getWorldbookNames()); } catch (_) {}
      try {
        const context = hostWin.SillyTavern?.getContext?.() || localWin.SillyTavern?.getContext?.();
        if (typeof context?.getWorldInfoNames === 'function') add(await context.getWorldInfoNames());
      } catch (_) {}
      return names;
    }

    async entries(name) {
      let rows = [];
      try { if (typeof getWorldbook === 'function') rows = await getWorldbook(name); } catch (_) {}
      if (!Array.isArray(rows) || !rows.length) {
        try {
          const context = hostWin.SillyTavern?.getContext?.() || localWin.SillyTavern?.getContext?.();
          if (typeof context?.loadWorldInfo === 'function') {
            const raw = await context.loadWorldInfo(name);
            if (Array.isArray(raw)) rows = raw;
            else if (Array.isArray(raw?.entries)) rows = raw.entries;
            else if (raw?.entries && typeof raw.entries === 'object') rows = Object.values(raw.entries);
          }
        } catch (_) {}
      }
      return Array.isArray(rows) ? rows : [];
    }

    normalizeNode(raw, id, type, canvas) {
      const node = object(raw);
      const name = text(node.name);
      if (!name || !isPublicNode(node)) return null;
      const aliases = list(node.aliases).map(text).filter(Boolean);
      const polygon = pairList(node.polygon);
      const center = polygonCenter(polygon, finite(node.x), finite(node.y));
      const label = pairList([node.label])[0];
      return {
        ...node,
        id: text(node.id || id), type, name, aliases,
        x: clamp(finite(node.x, center.x), 0, canvas.width),
        y: clamp(finite(node.y, center.y), 0, canvas.height),
        label: label || null,
        polygon,
        bounds: list(node.bounds).length === 4 ? list(node.bounds).map(v => finite(v)) : null,
        region: text(node.region), category: text(node.category || type),
        description: text(node.description), importance: text(node.importance || 'normal')
      };
    }

    validate(raw) {
      const source = object(raw);
      if (source.schema !== 'shiomi_map_v1') throw new Error('地图 schema 必须为 shiomi_map_v1。');
      const canvasRaw = object(source.canvas);
      const canvas = {
        width: finite(canvasRaw.width), height: finite(canvasRaw.height),
        baseImage: text(canvasRaw.baseImage), baseImageAsset: text(canvasRaw.baseImageAsset || 'map.city.base'), baseImageAlt: text(canvasRaw.baseImageAlt || '汐见市地图')
      };
      if (canvas.width <= 0 || canvas.height <= 0) throw new Error('canvas.width / canvas.height 必须是正数。');
      const collect = (dictionary, type) => Object.entries(object(dictionary))
        .map(([id, value]) => this.normalizeNode(value, id, type, canvas)).filter(Boolean);
      const regions = collect(source.regions, 'region');
      const anchors = collect(source.anchors, 'anchor');
      const places = collect(source.places, 'place');
      if (!regions.length) throw new Error('地图数据缺少地区。');
      const ids = new Set();
      for (const node of [...regions, ...anchors, ...places]) {
        if (!node.id) throw new Error(`节点「${node.name}」缺少 id。`);
        if (ids.has(node.id)) throw new Error(`地图节点 id 重复：${node.id}`);
        ids.add(node.id);
      }
      return {
        schema: source.schema, canvas, regions, anchors, places,
        roads: object(source.roads), railways: object(source.railways),
        water: object(source.water), bridges: object(source.bridges)
      };
    }

    async loadBaseImage(url) {
      this.baseImage = null;
      if (!url) throw new Error('地图数据没有提供底图。');
      return new Promise((resolve, reject) => {
        const image = new hostWin.Image();
        const timer = hostWin.setTimeout(() => reject(new Error('底图加载超时。')), 15000);
        image.onload = () => { hostWin.clearTimeout(timer); this.baseImage = image; resolve(image); };
        image.onerror = () => { hostWin.clearTimeout(timer); reject(new Error('地图底图无法加载。')); };
        image.decoding = 'async';
        image.src = url;
      });
    }

    async source() {
      const test = localWin.__SHIOMI_MAP_TEST_DATA__ || hostWin.__SHIOMI_MAP_TEST_DATA__;
      if (test && typeof test === 'object') return { raw: test, worldbook: '[demo]' };
      const names = await this.worldbookNames();
      if (!names.length) throw new Error('未找到当前角色或聊天绑定的世界书。');
      for (const name of names) {
        const rows = await this.entries(name);
        const entry = rows.find(row => nodeTitle(row) === ENTRY_TITLE);
        if (!entry) continue;
        let parsed;
        try { parsed = JSON.parse(stripJsonWrapper(entry.content)); }
        catch (error) { throw new Error(`地图 JSON 格式错误：${error?.message || error}`); }
        return { raw: parsed, worldbook: name };
      }
      throw new Error(`未找到关闭状态世界书条目「${ENTRY_TITLE}」。`);
    }

    async load(force = false) {
      if (this.data && !force) return this.data;
      const found = await this.source();
      this.data = this.validate(found.raw);
      this.worldbookName = found.worldbook;
      // 城市地图只有一张正式底图，固定读取角色卡内置 baseImage。
      // AssetManager 仅用于后续地区 / 角色 CG 等远程媒体，不参与地图底图解析。
      const baseImageUrl = this.data.canvas.baseImage;
      await this.loadBaseImage(baseImageUrl);
      console.info(LOG, '地图数据已加载。', {
        version: VERSION, worldbook: this.worldbookName,
        regions: this.data.regions.length, anchors: this.data.anchors.length, places: this.data.places.length
      });
      return this.data;
    }

    clear() { this.data = null; this.worldbookName = ''; this.baseImage = null; }
  }

  class MvuAdapter {
    constructor() { this.api = null; this.warmup = null; }
    tryApi() {
      if (this.api?.getMvuData) return this.api;
      try { if (typeof Mvu !== 'undefined' && Mvu?.getMvuData) return (this.api = Mvu); } catch (_) {}
      try { if (localWin.Mvu?.getMvuData) return (this.api = localWin.Mvu); } catch (_) {}
      try { if (hostWin.Mvu?.getMvuData) return (this.api = hostWin.Mvu); } catch (_) {}
      try { if (typeof TavernHelper !== 'undefined' && TavernHelper?.Mvu?.getMvuData) return (this.api = TavernHelper.Mvu); } catch (_) {}
      return null;
    }
    warmApi() {
      const hit = this.tryApi(); if (hit) return Promise.resolve(hit);
      if (this.warmup) return this.warmup;
      if (typeof waitGlobalInitialized !== 'function') return Promise.resolve(null);
      this.warmup = Promise.resolve(waitGlobalInitialized('Mvu')).then(api => {
        if (api?.getMvuData) this.api = api; return this.tryApi();
      }).catch(() => null).finally(() => { this.warmup = null; });
      return this.warmup;
    }
    readFallback() {
      if (localWin.__SHIOMI_MAP_TEST_LOCATION__) return { 城市生活: { 当前场景: { 地点: localWin.__SHIOMI_MAP_TEST_LOCATION__ } } };
      const readers = [
        () => typeof getVariables === 'function' ? getVariables({ type: 'message', message_id: 'latest' }) : null,
        () => typeof getVariables === 'function' ? getVariables({ type: 'chat' }) : null
      ];
      for (const read of readers) { try { const value = read(); if (value && typeof value === 'object') return value; } catch (_) {} }
      return {};
    }
    locationFrom(data) {
      const root = object(data?.stat_data || data);
      return text(root?.城市生活?.当前场景?.地点);
    }
    async currentLocation() {
      const api = this.tryApi();
      if (api) {
        try { const loc = this.locationFrom(api.getMvuData({ type: 'message', message_id: 'latest' })); if (loc) return loc; }
        catch (error) { console.warn(LOG, 'MVU 当前地点读取失败。', error); }
      }
      const fallback = this.locationFrom(this.readFallback());
      if (fallback) return fallback;
      void this.warmApi();
      return '';
    }
  }

  class LocationResolver {
    constructor(data) { this.data = data; }
    nodes() { return [...this.data.places, ...this.data.anchors, ...this.data.regions]; }
    exact(nodes, query, aliases = false) {
      for (const node of nodes) {
        if (!aliases && normalize(node.name) === query) return node;
        if (aliases && node.aliases.some(alias => normalize(alias) === query)) return node;
      }
      return null;
    }
    longestContains(nodes, query) {
      let best = null, score = 0;
      for (const node of nodes) {
        for (const candidate of [node.name, ...node.aliases]) {
          const key = normalize(candidate);
          if (key.length >= 2 && query.includes(key) && key.length > score) { best = node; score = key.length; }
        }
      }
      return best;
    }
    resolve(value) {
      const query = normalize(value); if (!query) return null;
      const nodes = this.nodes();
      return this.exact(nodes, query, false) || this.exact(nodes, query, true) || this.longestContains(nodes, query);
    }
  }

  class MapSearch {
    constructor(data) {
      this.data = data;
      const regionName = id => data.regions.find(region => region.id === id)?.name || '';
      this.rows = [...data.regions, ...data.places, ...data.anchors].map(node => ({
        node,
        region: node.type === 'region' ? '' : regionName(node.region),
        name: node.name,
        key: normalize([node.name, ...node.aliases, regionName(node.region), node.description].join(' '))
      }));
      this.cache = new Map();
    }
    find(value, limit = 8) {
      const query = normalize(value); if (!query) return [];
      if (this.cache.has(query)) return this.cache.get(query).slice(0, limit);
      const scored = [];
      for (const row of this.rows) {
        const name = normalize(row.name);
        let score = 0;
        if (name === query) score = 100;
        else if (name.startsWith(query)) score = 78;
        else if (name.includes(query)) score = 62;
        else if (row.key.includes(query)) score = 34;
        if (score) {
          if (row.node.importance === 'major') score += 8;
          if (row.node.type === 'region') score += 4;
          scored.push({ ...row, score });
        }
      }
      scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'zh-CN'));
      this.cache.set(query, scored);
      return scored.slice(0, limit);
    }
  }

  class MapViewport {
    constructor() {
      this.width = 1; this.height = 1; this.worldWidth = 1; this.worldHeight = 1;
      this.fitScale = 1; this.zoom = 1; this.minZoom = MIN_ZOOM; this.maxZoom = MAX_ZOOM;
      this.x = 0; this.y = 0;
    }
    configure(width, height, worldWidth, worldHeight) {
      this.width = Math.max(1, width); this.height = Math.max(1, height);
      this.worldWidth = Math.max(1, worldWidth); this.worldHeight = Math.max(1, worldHeight);
      const contain = Math.min(this.width / this.worldWidth, this.height / this.worldHeight);
      const cover = Math.max(this.width / this.worldWidth, this.height / this.worldHeight);
      const portrait = this.width / this.height < 0.72;
      this.fitScale = portrait ? Math.min(cover, contain * 1.58) : contain;
      this.clampOffset();
    }
    scale() { return this.fitScale * this.zoom; }
    home(fullOverview = false) {
      if (fullOverview) {
        const contain = Math.min(this.width / this.worldWidth, this.height / this.worldHeight);
        this.zoom = contain / this.fitScale;
      } else this.zoom = 1;
      this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);
      const scale = this.scale();
      this.x = (this.width - this.worldWidth * scale) / 2;
      this.y = (this.height - this.worldHeight * scale) / 2;
      this.clampOffset();
    }
    clampOffset() {
      const mapWidth = this.worldWidth * this.scale(), mapHeight = this.worldHeight * this.scale();
      const margin = Math.min(80, Math.min(this.width, this.height) * 0.14);
      if (mapWidth <= this.width) this.x = (this.width - mapWidth) / 2;
      else this.x = clamp(this.x, this.width - mapWidth - margin, margin);
      if (mapHeight <= this.height) this.y = (this.height - mapHeight) / 2;
      else this.y = clamp(this.y, this.height - mapHeight - margin, margin);
    }
    pan(dx, dy) { this.x += dx; this.y += dy; this.clampOffset(); }
    setZoom(next, screenX = this.width / 2, screenY = this.height / 2) {
      const before = this.scale();
      const worldX = (screenX - this.x) / before, worldY = (screenY - this.y) / before;
      this.zoom = clamp(next, this.minZoom, this.maxZoom);
      const after = this.scale();
      this.x = screenX - worldX * after; this.y = screenY - worldY * after;
      this.clampOffset();
    }
    focus(node, zoom = 1.8) {
      this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
      const scale = this.scale();
      this.x = this.width / 2 - node.x * scale; this.y = this.height / 2 - node.y * scale;
      this.clampOffset();
    }
    worldToScreen(x, y) { const s = this.scale(); return { x: this.x + x * s, y: this.y + y * s }; }
    screenToWorld(x, y) { const s = this.scale(); return { x: (x - this.x) / s, y: (y - this.y) / s }; }
  }

  class MapHitTest {
    constructor(data, viewport) { this.data = data; this.viewport = viewport; }
    markerCandidates() {
      if (this.viewport.zoom >= 2.15) return [...this.data.places, ...this.data.anchors];
      if (this.viewport.zoom >= 1.25) return [
        ...this.data.places.filter(n => n.importance !== 'minor'),
        ...this.data.anchors.filter(n => n.importance === 'major')
      ];
      return [
        ...this.data.places.filter(n => n.importance === 'major'),
        ...this.data.anchors.filter(n => n.importance === 'major')
      ];
    }
    regionAt(world) {
      const hits = this.data.regions.filter(region => region.polygon.length >= 3 && pointInPolygon(world.x, world.y, region.polygon));
      if (!hits.length) return null;
      if (hits.length === 1) return hits[0];
      hits.sort((a, b) => {
        const pa = a.label || [a.x, a.y], pb = b.label || [b.x, b.y];
        return Math.hypot(pa[0] - world.x, pa[1] - world.y) - Math.hypot(pb[0] - world.x, pb[1] - world.y);
      });
      return hits[0];
    }
    hit(screenX, screenY) {
      let best = null, distance = Infinity;
      const threshold = this.viewport.width < 700 ? 30 : 25;
      for (const node of this.markerCandidates()) {
        const point = this.viewport.worldToScreen(node.x, node.y);
        const d = Math.hypot(point.x - screenX, point.y - screenY);
        if (d < threshold && d < distance) { best = node; distance = d; }
      }
      if (best) return best;
      return this.regionAt(this.viewport.screenToWorld(screenX, screenY));
    }
  }

  class MapRenderer {
    constructor(canvas, base, viewport, data) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: true });
      if (!this.context) throw new Error('无法取得 Canvas 2D Context。');
      this.base = base; this.viewport = viewport; this.data = data;
      this.dpr = 1; this.selected = null; this.hovered = null; this.current = null;
      this.labelBoxes = []; this.iconPaths = new Map(); this.interacting = false;
    }
    resize(width, height) {
      const mobile = Math.min(hostWin.innerWidth || width, hostWin.innerHeight || height) < 900;
      this.dpr = Math.min(hostWin.devicePixelRatio || 1, mobile ? 1.45 : 1.8);
      const pw = Math.max(1, Math.round(width * this.dpr)), ph = Math.max(1, Math.round(height * this.dpr));
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width = pw; this.canvas.height = ph;
        this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
      }
    }
    syncBase() {
      // 不改变 10000×7000 源图，只把浏览器合成层限制在“当前设备最大实际显示尺寸”。
      // 旧版直接建立 10000×7000 CSS 图层再缩小，在 iPad/Safari 上容易形成超大纹理。
      const layerScale = this.viewport.fitScale * this.viewport.maxZoom;
      const relativeScale = this.viewport.zoom / this.viewport.maxZoom;
      this.base.style.width = `${Math.max(1, this.data.canvas.width * layerScale)}px`;
      this.base.style.height = `${Math.max(1, this.data.canvas.height * layerScale)}px`;
      this.base.style.transform = `translate3d(${this.viewport.x}px,${this.viewport.y}px,0) scale(${relativeScale})`;
    }
    visible(node, pad = 100) {
      const p = this.viewport.worldToScreen(node.x, node.y);
      return p.x > -pad && p.x < this.viewport.width + pad && p.y > -pad && p.y < this.viewport.height + pad;
    }
    labelPoint(node) {
      const raw = node.type === 'region' && node.label ? node.label : [node.x, node.y];
      return this.viewport.worldToScreen(raw[0], raw[1]);
    }
    drawRegionShape(ctx, region, kind) {
      if (!region?.polygon?.length) return;
      ctx.save(); ctx.beginPath();
      region.polygon.forEach((p, index) => {
        const q = this.viewport.worldToScreen(p[0], p[1]);
        if (!index) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
      if (kind === 'selected') {
        ctx.fillStyle = 'rgba(143,69,57,.115)'; ctx.strokeStyle = 'rgba(126,55,45,.76)'; ctx.lineWidth = 2.2;
      } else {
        ctx.fillStyle = 'rgba(248,239,217,.07)'; ctx.strokeStyle = 'rgba(81,72,61,.48)'; ctx.lineWidth = 1.4;
      }
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
    categoryKey(node) { return ICON_PATHS[node.category] ? node.category : (node.type === 'anchor' ? 'anchor' : 'place'); }
    iconPath(key) {
      if (this.iconPaths.has(key)) return this.iconPaths.get(key);
      let path = null;
      try { path = new hostWin.Path2D(ICON_PATHS[key] || ICON_PATHS.place); } catch (_) {}
      this.iconPaths.set(key, path);
      return path;
    }
    drawSymbol(ctx, node, x, y, active = false, current = false) {
      ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const size = active || current ? 30 : 24;
      if (current) {
        ctx.strokeStyle = 'rgba(147,68,56,.34)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowColor = 'rgba(35,30,25,.18)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1;
      ctx.fillStyle = current ? '#963f34' : active ? '#9c4a3d' : 'rgba(250,247,239,.94)';
      ctx.strokeStyle = current || active ? '#743129' : 'rgba(52,51,47,.64)'; ctx.lineWidth = active ? 1.8 : 1.25;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(-size/2, -size/2, size, size, active ? 9 : 7);
      else ctx.rect(-size/2, -size/2, size, size);
      ctx.fill(); ctx.stroke(); ctx.shadowColor = 'transparent';
      try {
        const path = this.iconPath(this.categoryKey(node));
        if (!path) throw new Error('Path2D unavailable');
        ctx.scale(0.63, 0.63); ctx.translate(-12, -12);
        ctx.strokeStyle = current || active ? '#fffaf0' : '#343735'; ctx.lineWidth = 1.9; ctx.stroke(path);
      } catch (_) {
        ctx.fillStyle = current || active ? '#fffaf0' : '#343735'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    canPlaceLabel(x, y, width, height, priority) {
      for (const b of this.labelBoxes) {
        if (x < b.x+b.width && x+width > b.x && y < b.y+b.height && y+height > b.y && priority <= b.priority) return false;
      }
      this.labelBoxes.push({x,y,width,height,priority}); return true;
    }
    drawLabel(ctx, node, point, priority = 1) {
      const isRegion = node.type === 'region';
      if (!isRegion && this.viewport.zoom < 1 && node.importance !== 'major' && node !== this.current && node !== this.selected) return;
      const size = isRegion ? clamp(15.5 + this.viewport.zoom * 1.7, 16.5, 22) : (node.importance === 'major' ? 12.5 : 11.5);
      ctx.font = `${isRegion ? 650 : 560} ${size}px ${isRegion ? '"Noto Serif CJK SC","Songti SC",serif' : '"Noto Sans CJK SC","Microsoft YaHei",sans-serif'}`;
      const label = node.name;
      const w = ctx.measureText(label).width;
      const x = isRegion ? point.x - w/2 : point.x + 16;
      const y = isRegion ? point.y + 6 : point.y + 4;
      if (!this.canPlaceLabel(x-4, y-size-2, w+8, size+7, priority)) return;
      ctx.lineJoin = 'round'; ctx.lineWidth = isRegion ? 3.2 : 2.8;
      ctx.strokeStyle = isRegion ? 'rgba(245,238,224,.96)' : 'rgba(250,247,239,.98)';
      ctx.strokeText(label, x, y);
      ctx.fillStyle = isRegion ? 'rgba(61,55,49,.90)' : '#2f322f'; ctx.fillText(label, x, y);
    }
    nodesForZoom() {
      const z = this.viewport.zoom;
      const places = z < 1.25 ? this.data.places.filter(n => n.importance === 'major')
        : z < 1.9 ? this.data.places.filter(n => n.importance !== 'minor') : this.data.places;
      const anchors = z < 1.2 ? this.data.anchors.filter(n => n.importance === 'major')
        : z < 2.05 ? this.data.anchors.filter(n => n.importance === 'major') : this.data.anchors;
      const out = new Map();
      for (const node of [...places, ...anchors, this.current, this.selected].filter(Boolean)) out.set(node.id, node);
      return [...out.values()].filter(n => this.visible(n));
    }
    render() {
      this.syncBase();
      const ctx = this.context;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0); ctx.clearRect(0,0,this.viewport.width,this.viewport.height);
      this.labelBoxes = [];
      if (this.hovered?.type === 'region') this.drawRegionShape(ctx, this.hovered, 'hover');
      if (this.selected?.type === 'region') this.drawRegionShape(ctx, this.selected, 'selected');
      // 拖动/双指缩放期间跳过大部分文字测量与碰撞计算；手势结束后立即恢复完整标签。
      if (!this.interacting) {
        for (const region of this.data.regions) this.drawLabel(ctx, region, this.labelPoint(region), region === this.selected ? 4 : 0);
      }
      const nodes = this.nodesForZoom();
      for (const node of nodes) {
        const p = this.viewport.worldToScreen(node.x,node.y);
        this.drawSymbol(ctx,node,p.x,p.y,node===this.selected||node===this.hovered,node===this.current);
      }
      if (this.interacting) {
        for (const node of [this.current, this.selected].filter(Boolean)) {
          this.drawLabel(ctx,node,this.viewport.worldToScreen(node.x,node.y),5);
        }
        return;
      }
      const ordered = [...nodes].sort((a,b) => {
        const rank = n => n===this.selected||n===this.current ? 5 : n.importance==='major' ? 3 : 1;
        return rank(b)-rank(a);
      });
      for (const node of ordered) {
        const rank = node===this.selected||node===this.current ? 5 : node.importance==='major' ? 3 : 1;
        if (this.viewport.zoom >= 1.12 || rank >= 3) this.drawLabel(ctx,node,this.viewport.worldToScreen(node.x,node.y),rank);
      }
    }
  }

  class MapComposer {
    fill(destination) {
      const command = `前往${destination.name}。`;
      const input = hostDoc.querySelector('#send_textarea, textarea[placeholder], textarea');
      if (!input) {
        if (localWin.__SHIOMI_MAP_DEMO__) return command;
        throw new Error('当前未找到 SillyTavern 输入框。');
      }
      const previous = text(input.value), next = previous ? `${previous}\n${command}` : command;
      try {
        const setter = Object.getOwnPropertyDescriptor(hostWin.HTMLTextAreaElement.prototype,'value')?.set;
        if (setter) setter.call(input,next); else input.value=next;
      } catch (_) { input.value=next; }
      input.dispatchEvent(new hostWin.Event('input',{bubbles:true})); input.focus(); return command;
    }
  }

  class MapUI {
    constructor(lifecycle) {
      this.lifecycle = lifecycle; this.host = null; this.root = null; this.shadow = null; this.refs = {};
      this.listeners = []; this.toastTimer = 0; this.regionMenuOpen = false;
    }
    on(target,type,handler,options) { target.addEventListener(type,handler,options); this.listeners.push(()=>target.removeEventListener(type,handler,options)); }
    icon(name) {
      const icons = {
        map:'<path d="M3 6.5 8 4l8 2.5L21 4v13.5L16 20l-8-2.5L3 20Z"/><path d="M8 4v13.5M16 6.5V20"/>',
        search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
        locate:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
        plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
        close:'<path d="m6 6 12 12M18 6 6 18"/>',
        home:'<path d="M4 5h6M4 5v6M20 5h-6M20 5v6M4 19h6M4 19v-6M20 19h-6M20 19v-6"/>',
        regions:'<path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z"/>'
      };
      return `<svg class="shiomi-map-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.map}</svg>`;
    }
    create() {
      hostDoc.getElementById(ROOT_ID)?.remove();
      this.host = hostDoc.createElement('div'); this.host.id = ROOT_ID;
      this.shadow = typeof this.host.attachShadow === 'function' ? this.host.attachShadow({mode:'open'}) : null;
      this.root = this.shadow || this.host;
      this.root.innerHTML = `
        <style>${this.styles()}</style>
        <button class="shiomi-map-launch" type="button" aria-label="打开汐见地图">${this.icon('map')}<span>地图</span></button>
        <section class="shiomi-map-shell" aria-label="汐见市地图" aria-hidden="true">
          <div class="shiomi-map-stage" tabindex="0" aria-label="可拖动和缩放的汐见市地图">
            <div class="shiomi-map-placeholder" aria-hidden="true"><span>汐见市街案内图<small>底图载入中</small></span></div>
            <img class="shiomi-map-base" alt="" draggable="false" hidden>
            <canvas class="shiomi-map-canvas"></canvas>
            <div class="shiomi-map-search-wrap">
              <span class="shiomi-map-search-icon">${this.icon('search')}</span>
              <input class="shiomi-map-search" type="search" autocomplete="off" inputmode="search" placeholder="搜索地区或地点……" aria-label="搜索地区或地点">
              <div class="shiomi-map-results" role="listbox" hidden></div>
            </div>
            <div class="shiomi-map-controls" aria-label="地图控制">
              <button class="shiomi-map-tool" type="button" data-action="current" aria-label="当前地点">${this.icon('locate')}</button>
              <button class="shiomi-map-tool" type="button" data-action="home" aria-label="回到全城视图">${this.icon('home')}</button>
              <button class="shiomi-map-tool" type="button" data-action="zoom-in" aria-label="放大">${this.icon('plus')}</button>
              <button class="shiomi-map-tool" type="button" data-action="zoom-out" aria-label="缩小">${this.icon('minus')}</button>
              <button class="shiomi-map-tool shiomi-map-close" type="button" data-action="close" aria-label="关闭">${this.icon('close')}</button>
            </div>
            <button class="shiomi-map-region-toggle" type="button" data-action="regions" aria-expanded="false">${this.icon('regions')}<span>地区</span></button>
            <div class="shiomi-map-region-menu" hidden></div>
            <div class="shiomi-map-zoom-hint">拖动地图 · 滚轮/双指缩放</div>
            <div class="shiomi-map-status" role="status" aria-live="polite" hidden></div>
            <aside class="shiomi-map-panel" aria-hidden="true">
              <button class="shiomi-map-panel-close" type="button" data-action="panel-close" aria-label="关闭详情">${this.icon('close')}</button>
              <div class="shiomi-map-panel-content"></div>
            </aside>
          </div>
        </section>`;
      (hostDoc.body || hostDoc.documentElement).appendChild(this.host);
      const q = s => this.root.querySelector(s);
      this.refs = {
        launch:q('.shiomi-map-launch'), shell:q('.shiomi-map-shell'), stage:q('.shiomi-map-stage'),
        base:q('.shiomi-map-base'), placeholder:q('.shiomi-map-placeholder'), canvas:q('.shiomi-map-canvas'),
        search:q('.shiomi-map-search'), results:q('.shiomi-map-results'), status:q('.shiomi-map-status'),
        panel:q('.shiomi-map-panel'), panelContent:q('.shiomi-map-panel-content'),
        regionToggle:q('.shiomi-map-region-toggle'), regionMenu:q('.shiomi-map-region-menu'), hint:q('.shiomi-map-zoom-hint'),
        zoomIn:q('[data-action="zoom-in"]'), zoomOut:q('[data-action="zoom-out"]')
      };
      this.bind(); return this.refs;
    }
    styles() {
      return `
        :host{all:initial}.shiomi-map-launch,.shiomi-map-shell,.shiomi-map-shell *{box-sizing:border-box}
        .shiomi-map-svg{display:block;width:19px;height:19px;pointer-events:none}
        .shiomi-map-launch{position:fixed;right:max(12px,env(safe-area-inset-right));left:auto;bottom:max(74px,calc(env(safe-area-inset-bottom) + 62px));z-index:2147482500;display:flex;align-items:center;gap:7px;border:1px solid rgba(54,50,45,.16);border-radius:12px;padding:10px 13px;background:rgba(252,249,242,.95);color:#383630;font:600 13px/1.2 "Noto Sans CJK SC","Microsoft YaHei",sans-serif;box-shadow:0 4px 16px rgba(35,30,25,.16);cursor:pointer;touch-action:manipulation}
        .shiomi-map-launch:hover,.shiomi-map-launch:focus-visible{background:#fffdf8;outline:2px solid rgba(139,65,53,.4);outline-offset:2px}
        .shiomi-map-shell{position:fixed;inset:0;z-index:2147483000;display:none;background:#d9cdb7;color:#302f2b;font:14px/1.5 "Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei",sans-serif;overscroll-behavior:contain}
        .shiomi-map-shell.open{display:block}.shiomi-map-stage{position:absolute;inset:0;overflow:hidden;background:linear-gradient(135deg,#d8ccb5,#c9b99d);outline:none;touch-action:none;user-select:none;-webkit-user-select:none}
        .shiomi-map-base,.shiomi-map-placeholder{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}.shiomi-map-base{display:block;object-fit:fill;pointer-events:none;box-shadow:0 0 34px rgba(57,43,27,.20);image-rendering:auto}.shiomi-map-placeholder{display:flex;align-items:center;justify-content:center;background:#e5d8c0;color:#746b5d;text-align:center;font:650 44px/1.2 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.12em;pointer-events:none}.shiomi-map-placeholder small{display:block;margin-top:10px;font:500 15px/1.2 sans-serif;letter-spacing:.06em;color:#8c8272}
        .shiomi-map-canvas{position:absolute;inset:0;display:block;cursor:grab;touch-action:none}.shiomi-map-canvas.dragging{cursor:grabbing}
        .shiomi-map-search-wrap{position:absolute;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));z-index:10;width:min(420px,calc(100% - 335px));min-width:250px}.shiomi-map-search-icon{position:absolute;left:14px;top:13px;z-index:2;color:#65625b;pointer-events:none}.shiomi-map-search{width:100%;height:46px;border:1px solid rgba(67,60,51,.16);border-radius:14px;background:rgba(253,250,244,.94);color:#302f2b;padding:0 14px 0 43px;font:14px/1 sans-serif;outline:none;box-shadow:0 5px 18px rgba(44,37,30,.15);backdrop-filter:blur(9px)}.shiomi-map-search:focus{border-color:rgba(139,65,53,.55);background:#fffdf9;box-shadow:0 5px 20px rgba(44,37,30,.18),0 0 0 3px rgba(139,65,53,.10)}
        .shiomi-map-results{position:absolute;top:54px;left:0;right:0;max-height:min(54vh,380px);overflow:auto;border:1px solid rgba(67,60,51,.14);border-radius:14px;background:rgba(253,250,244,.985);box-shadow:0 10px 28px rgba(44,37,30,.18);padding:6px}.shiomi-map-result{display:block;width:100%;border:0;border-radius:9px;background:transparent;padding:9px 10px;color:#302f2b;text-align:left;font:inherit;cursor:pointer}.shiomi-map-result:hover,.shiomi-map-result:focus-visible{background:#eee7dc;outline:none}.shiomi-map-result small{display:block;color:#777166;margin-top:2px}
        .shiomi-map-controls{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));z-index:10;display:flex;gap:7px}.shiomi-map-tool{display:grid;place-items:center;width:43px;height:43px;border:1px solid rgba(67,60,51,.15);border-radius:12px;padding:0;background:rgba(253,250,244,.94);color:#3f3d37;box-shadow:0 4px 15px rgba(44,37,30,.14);cursor:pointer;touch-action:manipulation;backdrop-filter:blur(8px)}.shiomi-map-tool:hover,.shiomi-map-tool:focus-visible{background:#fffdf9;color:#8b4135;outline:2px solid rgba(139,65,53,.28);outline-offset:2px}.shiomi-map-close{margin-left:5px}
        .shiomi-map-region-toggle{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:9;display:flex;align-items:center;gap:7px;height:42px;border:1px solid rgba(67,60,51,.15);border-radius:12px;padding:0 13px;background:rgba(253,250,244,.94);color:#44413b;font:600 13px/1 sans-serif;box-shadow:0 4px 16px rgba(44,37,30,.14);cursor:pointer}.shiomi-map-region-menu{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(66px,calc(env(safe-area-inset-bottom) + 50px));z-index:9;width:min(250px,calc(100% - 32px));border:1px solid rgba(67,60,51,.14);border-radius:14px;background:rgba(253,250,244,.985);box-shadow:0 10px 28px rgba(44,37,30,.18);padding:7px}.shiomi-map-region-item{display:block;width:100%;border:0;border-radius:9px;background:transparent;padding:9px 10px;color:#34322e;text-align:left;font:600 13px/1.35 sans-serif;cursor:pointer}.shiomi-map-region-item:hover,.shiomi-map-region-item:focus-visible{background:#eee7dc;outline:none}.shiomi-map-region-item small{display:block;margin-top:2px;color:#7c7569;font-weight:400}
        .shiomi-map-zoom-hint{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));z-index:5;transform:translateX(-50%);padding:6px 10px;border-radius:999px;background:rgba(47,42,36,.48);color:rgba(255,251,242,.92);font:500 11px/1 sans-serif;letter-spacing:.03em;pointer-events:none;transition:opacity .2s}.shiomi-map-zoom-hint.fade{opacity:0}
        .shiomi-map-status{position:absolute;left:50%;top:max(74px,calc(env(safe-area-inset-top) + 62px));z-index:14;max-width:min(520px,calc(100% - 32px));transform:translate(-50%,-8px);border:1px solid rgba(126,58,49,.16);border-radius:12px;background:rgba(253,248,241,.98);color:#874137;padding:9px 13px;text-align:center;box-shadow:0 6px 22px rgba(44,37,30,.16);opacity:0;transition:opacity .16s,transform .16s;pointer-events:none}.shiomi-map-status.show{opacity:1;transform:translate(-50%,0)}.shiomi-map-status.info{border-color:rgba(67,60,51,.13);color:#4e4a43}
        .shiomi-map-panel{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:11;display:none;width:min(360px,calc(100% - 32px));max-height:min(52vh,450px);overflow:auto;border:1px solid rgba(67,60,51,.14);border-radius:18px;background:rgba(253,250,244,.98);color:#302f2b;padding:22px;box-shadow:0 12px 36px rgba(44,37,30,.21);backdrop-filter:blur(10px)}.shiomi-map-panel.open{display:block}.shiomi-map-panel-close{position:absolute;top:9px;right:9px;display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:#68645c;padding:0;cursor:pointer}.shiomi-map-panel-close:hover{background:#eee7dc;color:#8b4135}.shiomi-map-panel h2{margin:0 34px 7px 0;color:#2b2925;font:650 22px/1.3 "Noto Serif CJK SC","Songti SC",serif}.shiomi-map-kicker{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px;color:#777166;font-size:12px}.shiomi-map-meta{padding:3px 7px;border-radius:7px;background:#eee8df}.shiomi-map-description{white-space:pre-wrap;margin:0 0 17px;color:#4d4943}.shiomi-map-actions{display:flex;gap:8px}.shiomi-map-action,.shiomi-map-secondary{border-radius:10px;padding:9px 14px;font:600 13px/1.2 sans-serif;cursor:pointer}.shiomi-map-action{border:1px solid #7d382f;background:#934438;color:#fff}.shiomi-map-secondary{border:1px solid rgba(67,60,51,.22);background:#f8f4ec;color:#403d37}.shiomi-map-action:hover{background:#7d382f}.shiomi-map-secondary:hover{background:#eee7dc}
        .shiomi-map-tool:disabled{opacity:.38;cursor:default;filter:saturate(.55);outline:none}
        @media(max-width:900px){.shiomi-map-search-wrap{left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));right:max(62px,calc(env(safe-area-inset-right) + 50px));width:auto;min-width:0}.shiomi-map-controls{right:max(12px,env(safe-area-inset-right));top:max(66px,calc(env(safe-area-inset-top) + 54px));flex-direction:column}.shiomi-map-close{position:absolute;right:0;bottom:calc(100% + 12px);margin:0}.shiomi-map-tool{width:41px;height:41px;border-radius:11px}.shiomi-map-panel{left:0;right:0;bottom:0;width:auto;max-height:min(45vh,440px);border-width:1px 0 0;border-radius:20px 20px 0 0;padding:24px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -9px 28px rgba(44,37,30,.19)}.shiomi-map-region-toggle{left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom))}.shiomi-map-region-menu{left:max(12px,env(safe-area-inset-left));bottom:max(62px,calc(env(safe-area-inset-bottom) + 50px))}.shiomi-map-zoom-hint{display:none}.shiomi-map-placeholder{font-size:32px}}
        @media(max-width:520px){.shiomi-map-search{height:44px}.shiomi-map-search-icon{top:12px}.shiomi-map-controls{top:max(64px,calc(env(safe-area-inset-top) + 52px))}.shiomi-map-panel h2{font-size:20px}}
        @media(prefers-reduced-motion:reduce){.shiomi-map-shell *{transition:none!important}}
      `;
    }
    bind() {
      this.on(this.refs.launch,'click',()=>void this.lifecycle.open());
      this.root.querySelectorAll('[data-action]').forEach(button => this.on(button,'click',event => {
        const action = event.currentTarget.dataset.action;
        if (action==='close') this.lifecycle.close();
        else if (action==='zoom-in') this.lifecycle.zoomBy(1.24);
        else if (action==='zoom-out') this.lifecycle.zoomBy(1/1.24);
        else if (action==='current') this.lifecycle.focusCurrent();
        else if (action==='home') this.lifecycle.home();
        else if (action==='regions') this.toggleRegions();
        else if (action==='panel-close') this.closePanel();
      }));
      this.on(this.refs.search,'input',event=>this.showSearch(event.target.value));
      this.on(this.refs.search,'keydown',event=>{
        if (event.key==='Escape') { this.hideResults(); this.refs.search.blur(); }
        if (event.key==='Enter') { const first=this.refs.results.querySelector('[data-node-id]'); if(first){event.preventDefault();first.click();} }
      });
      this.on(this.refs.stage,'keydown',event=>{
        const step=event.shiftKey?90:36;
        if(event.key==='ArrowLeft') this.lifecycle.pan(step,0); else if(event.key==='ArrowRight') this.lifecycle.pan(-step,0);
        else if(event.key==='ArrowUp') this.lifecycle.pan(0,step); else if(event.key==='ArrowDown') this.lifecycle.pan(0,-step);
        else if(event.key==='+'||event.key==='=') this.lifecycle.zoomBy(1.2); else if(event.key==='-') this.lifecycle.zoomBy(1/1.2);
        else if(event.key==='Escape'){this.closePanel();this.hideResults();this.setRegions(false);} else return;
        event.preventDefault();
      });
    }
    setOpen(open) { this.refs.shell.classList.toggle('open',open); this.refs.shell.setAttribute('aria-hidden',String(!open)); this.refs.launch.hidden=open; if(open)this.refs.stage.focus({preventScroll:true}); }
    status(message,kind='error',duration=kind==='info'?2200:0) {
      hostWin.clearTimeout(this.toastTimer); this.refs.status.textContent=message; this.refs.status.hidden=!message;
      this.refs.status.classList.toggle('info',kind==='info'); this.refs.status.classList.toggle('show',Boolean(message));
      if(message&&duration>0)this.toastTimer=hostWin.setTimeout(()=>this.status(''),duration);
    }
    setBase(image,data) { if(image){this.refs.base.src=image.src;this.refs.base.alt=data.canvas.baseImageAlt;this.refs.base.hidden=false;this.refs.placeholder.hidden=true;} }
    populateRegions() {
      this.refs.regionMenu.replaceChildren();
      for(const region of this.lifecycle.data?.regions||[]) {
        const b=hostDoc.createElement('button'); b.type='button';b.className='shiomi-map-region-item';
        const n=hostDoc.createElement('span');n.textContent=region.name; const s=hostDoc.createElement('small');s.textContent=region.description||'';
        b.append(n,s);b.addEventListener('click',()=>{this.lifecycle.selectNode(region,true);this.setRegions(false);}); this.refs.regionMenu.appendChild(b);
      }
    }
    setRegions(open){this.regionMenuOpen=Boolean(open);this.refs.regionMenu.hidden=!this.regionMenuOpen;this.refs.regionToggle.setAttribute('aria-expanded',String(this.regionMenuOpen));}
    toggleRegions(){if(!this.lifecycle.loaded)return;this.setRegions(!this.regionMenuOpen);}
    typeLabel(node) {
      const labels={region:'地区',anchor:'地理锚点',station:'车站',station_exit:'车站出口',police:'警务机构',government:'公共机构',hospital:'医院',school:'学校',university:'大学',commercial:'商业',shop:'商店',culture:'文化娱乐',nightlife:'夜间场所',office:'事务机构',hotel:'饭店旅馆',food:'餐饮',bath:'浴场',port:'港口',airship:'空艇设施',bridge:'桥梁',park:'公园',water:'水系',place:'地点'};
      return labels[node.category]||labels[node.type]||'地点';
    }
    regionName(node){return this.lifecycle.data?.regions.find(region=>region.id===node.region)?.name||'';}
    showNode(node) {
      const title=hostDoc.createElement('h2');title.textContent=node.name;
      const kicker=hostDoc.createElement('p');kicker.className='shiomi-map-kicker';
      const tm=hostDoc.createElement('span');tm.className='shiomi-map-meta';tm.textContent=this.typeLabel(node);kicker.appendChild(tm);
      const rn=this.regionName(node);if(rn){const rm=hostDoc.createElement('span');rm.className='shiomi-map-meta';rm.textContent=rn;kicker.appendChild(rm);}
      const description=hostDoc.createElement('p');description.className='shiomi-map-description';description.textContent=node.description||'暂无补充说明。';
      const actions=hostDoc.createElement('div');actions.className='shiomi-map-actions';
      const center=hostDoc.createElement('button');center.type='button';center.className='shiomi-map-secondary';center.textContent='定位';center.addEventListener('click',()=>this.lifecycle.focusNode(node));actions.appendChild(center);
      if(node.type!=='region') {const go=hostDoc.createElement('button');go.type='button';go.className='shiomi-map-action';go.textContent='前往这里';go.addEventListener('click',()=>this.lifecycle.compose(node));actions.appendChild(go);}
      try {
        const gameApi = hostWin.ShiomiGames || localWin.ShiomiGames;
        const games = typeof gameApi?.gamesForPlace === 'function' ? gameApi.gamesForPlace(node.id) : [];
        for (const game of games) {
          const play = hostDoc.createElement('button');
          play.type = 'button';
          play.className = 'shiomi-map-action';
          play.textContent = game.label || '开始游戏';
          play.title = game.description || '';
          play.addEventListener('click', () => gameApi.open(game.id, { place: node }));
          actions.appendChild(play);
        }
      } catch (error) { console.warn(LOG, '地点小游戏入口读取失败。', error); }
      this.refs.panelContent.replaceChildren(title,kicker,description,actions);this.refs.panel.classList.add('open');this.refs.panel.setAttribute('aria-hidden','false');
    }
    closePanel(){this.refs.panel.classList.remove('open');this.refs.panel.setAttribute('aria-hidden','true');this.lifecycle.clearSelection();}
    showSearch(query){
      const results=this.lifecycle.search?.find(query)||[];this.refs.results.replaceChildren();if(!text(query))return this.hideResults();
      if(!results.length){const e=hostDoc.createElement('div');e.className='shiomi-map-result';e.textContent='没有匹配地点';this.refs.results.appendChild(e);}
      for(const result of results){const b=hostDoc.createElement('button');b.type='button';b.className='shiomi-map-result';b.dataset.nodeId=result.node.id;const n=hostDoc.createElement('span');n.textContent=result.name;const m=hostDoc.createElement('small');m.textContent=[this.typeLabel(result.node),result.region].filter(Boolean).join(' · ');b.append(n,m);b.addEventListener('click',()=>{this.lifecycle.selectNode(result.node,true);this.refs.search.value=result.name;this.hideResults();});this.refs.results.appendChild(b);}
      this.refs.results.hidden=false;
    }
    hideResults(){this.refs.results.hidden=true;}
    fadeHint(){this.refs.hint?.classList.add('fade');}
    updateZoomControls(zoom,min,max){
      const epsilon=0.001;
      if(this.refs.zoomIn)this.refs.zoomIn.disabled=zoom>=max-epsilon;
      if(this.refs.zoomOut)this.refs.zoomOut.disabled=zoom<=min+epsilon;
    }
    destroy(){hostWin.clearTimeout(this.toastTimer);for(const d of this.listeners.splice(0)){try{d();}catch(_){}}this.host?.remove();this.host=null;}
  }

  class MapLifecycle {
    constructor(){
      this.repository=new MapRepository();this.mvu=new MvuAdapter();this.composer=new MapComposer();this.ui=new MapUI(this);
      this.data=null;this.search=null;this.resolver=null;this.viewport=new MapViewport();this.hitTest=null;this.renderer=null;
      this.initialized=false;this.loaded=false;this.loading=null;this.isOpen=false;this.destroyed=false;this.renderPending=false;
      this.locationDirty=true;this.currentLocationText='';this.currentNode=null;this.disposers=[];this.pointers=new Map();this.gesture=null;this.dragMoved=false;this.interactionTimer=0;
    }
    init(){if(this.initialized||this.destroyed)return this;this.ui.create();this.initialized=true;this.bindEvents();console.info(LOG,`v${VERSION} 入口已建立。`);return this;}
    bindEvents(){
      const resize=()=>{if(this.isOpen&&this.loaded)this.resize(false);};hostWin.addEventListener('resize',resize,{passive:true});this.disposers.push(()=>hostWin.removeEventListener('resize',resize));
      const dirty=()=>{this.locationDirty=true;if(this.isOpen&&this.loaded)void this.refreshCurrentLocation();};
      trackEvent('mag_variable_update_ended',dirty,this.disposers);trackEvent('mag_variable_initialized',dirty,this.disposers);trackEvent('mag_variable_initiailized',dirty,this.disposers);
      const events=hostWin.tavern_events||localWin.tavern_events||{};for(const key of ['CHAT_CHANGED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','MESSAGE_DELETED','MESSAGE_EDITED'])if(events[key])trackEvent(events[key],dirty,this.disposers);
      const pagehide=()=>this.destroy();localWin.addEventListener('pagehide',pagehide,{once:true});this.disposers.push(()=>localWin.removeEventListener('pagehide',pagehide));
    }
    bindMapInput(){
      const canvas=this.ui.refs.canvas,stage=this.ui.refs.stage;
      const point=event=>{const r=canvas.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};};
      const setInteracting=value=>{if(this.renderer)this.renderer.interacting=Boolean(value);};
      const settleInteraction=(delay=90)=>{
        try{if(this.interactionTimer)hostWin.clearTimeout(this.interactionTimer);}catch(_){}
        this.interactionTimer=hostWin.setTimeout(()=>{this.interactionTimer=0;setInteracting(false);this.requestRender();},delay);
      };
      const down=event=>{if(event.pointerType==='mouse'&&event.button!==0)return;canvas.setPointerCapture?.(event.pointerId);const p=point(event);this.pointers.set(event.pointerId,p);this.dragMoved=false;setInteracting(true);if(this.pointers.size===1)this.gesture={type:'pan',last:p,start:p};else if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.viewport.zoom};}canvas.classList.add('dragging');this.ui.fadeHint();};
      const move=event=>{const p=point(event);if(!this.pointers.has(event.pointerId)){if(event.pointerType==='mouse'){const h=this.hitTest.hit(p.x,p.y);if(h!==this.renderer.hovered){this.renderer.hovered=h;this.requestRender();}}return;}this.pointers.set(event.pointerId,p);if(this.pointers.size>=2){const[a,b]=[...this.pointers.values()];const distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(this.gesture?.type!=='pinch')this.gesture={type:'pinch',distance,zoom:this.viewport.zoom};this.viewport.setZoom(this.gesture.zoom*distance/Math.max(1,this.gesture.distance),center.x,center.y);this.dragMoved=true;this.requestRender();}else if(this.gesture?.type==='pan'){const dx=p.x-this.gesture.last.x,dy=p.y-this.gesture.last.y;if(Math.hypot(p.x-this.gesture.start.x,p.y-this.gesture.start.y)>5)this.dragMoved=true;this.gesture.last=p;this.viewport.pan(dx,dy);this.requestRender();}};
      const up=event=>{const p=point(event),wasTap=this.pointers.size===1&&!this.dragMoved;this.pointers.delete(event.pointerId);if(wasTap){const hit=this.hitTest.hit(p.x,p.y);if(hit)this.selectNode(hit,false);else{this.ui.closePanel();this.clearSelection();}}if(this.pointers.size===1){const remain=[...this.pointers.values()][0];this.gesture={type:'pan',last:remain,start:remain};}else if(!this.pointers.size){this.gesture=null;canvas.classList.remove('dragging');setInteracting(false);this.requestRender();}};
      const wheel=event=>{event.preventDefault();this.ui.fadeHint();setInteracting(true);const p=point(event);this.viewport.setZoom(this.viewport.zoom*Math.exp(-event.deltaY*.00135),p.x,p.y);this.requestRender();settleInteraction(110);};
      const leave=()=>{if(this.renderer.hovered){this.renderer.hovered=null;this.requestRender();}};
      canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',leave);stage.addEventListener('wheel',wheel,{passive:false});
      this.disposers.push(()=>canvas.removeEventListener('pointerdown',down),()=>canvas.removeEventListener('pointermove',move),()=>canvas.removeEventListener('pointerup',up),()=>canvas.removeEventListener('pointercancel',up),()=>canvas.removeEventListener('pointerleave',leave),()=>stage.removeEventListener('wheel',wheel));
    }
    async ensureLoaded(force=false){
      if(this.loaded&&!force)return;if(this.loading)return this.loading;
      this.loading=(async()=>{this.ui.status('正在读取汐见地图……','info');const data=await this.repository.load(force);this.data=data;this.search=new MapSearch(data);this.resolver=new LocationResolver(data);if(!this.renderer){this.renderer=new MapRenderer(this.ui.refs.canvas,this.ui.refs.base,this.viewport,data);this.hitTest=new MapHitTest(data,this.viewport);this.bindMapInput();}else{this.renderer.data=data;this.hitTest.data=data;}this.ui.setBase(this.repository.baseImage,data);this.ui.populateRegions();this.loaded=true;this.locationDirty=true;this.resize(true);this.ui.status('','info');await this.refreshCurrentLocation();})().catch(error=>{this.loaded=false;console.error(LOG,'地图初始化失败。',error);this.ui.status(error?.message||'地图初始化失败。');throw error;}).finally(()=>{this.loading=null;});return this.loading;
    }
    async open(){if(this.destroyed)return;if(!this.initialized)this.init();this.isOpen=true;this.ui.setOpen(true);try{await this.ensureLoaded(false);this.resize(false);if(this.locationDirty)await this.refreshCurrentLocation();this.requestRender();}catch(_) {}}
    close(){if(this.destroyed)return;this.isOpen=false;this.ui.setOpen(false);this.ui.hideResults();this.ui.setRegions(false);this.pointers.clear();this.gesture=null;if(this.renderer)this.renderer.interacting=false;try{if(this.interactionTimer){hostWin.clearTimeout(this.interactionTimer);this.interactionTimer=0;}}catch(_){}console.info(LOG,'地图已关闭；没有后台渲染循环。');}
    resize(reset=false){if(!this.loaded||!this.renderer)return;const rect=this.ui.refs.stage.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const oldCenter=this.viewport.screenToWorld(this.viewport.width/2,this.viewport.height/2);const first=this.viewport.width<=1||this.viewport.height<=1;this.viewport.configure(rect.width,rect.height,this.data.canvas.width,this.data.canvas.height);if(reset||first)this.viewport.home(false);else{const s=this.viewport.scale();this.viewport.x=rect.width/2-oldCenter.x*s;this.viewport.y=rect.height/2-oldCenter.y*s;this.viewport.clampOffset();}this.renderer.resize(rect.width,rect.height);this.requestRender();}
    requestRender(){this.ui.updateZoomControls(this.viewport.zoom,this.viewport.minZoom,this.viewport.maxZoom);if(!this.isOpen||!this.loaded||this.renderPending||this.destroyed)return;this.renderPending=true;hostWin.requestAnimationFrame(()=>{this.renderPending=false;if(!this.isOpen||!this.loaded||this.destroyed)return;try{this.renderer.render();}catch(error){console.error(LOG,'地图绘制失败。',error);this.ui.status('地图绘制失败，请查看控制台。');}});}
    async refreshCurrentLocation(){if(!this.loaded||!this.resolver)return;this.locationDirty=false;this.currentLocationText=await this.mvu.currentLocation();this.currentNode=this.resolver.resolve(this.currentLocationText);this.renderer.current=this.currentNode;if(this.currentLocationText&&!this.currentNode)console.warn(LOG,`当前地点无法识别：${this.currentLocationText}`);this.requestRender();}
    focusCurrent(){if(!this.currentNode){this.ui.status(this.currentLocationText?`无法在地图中匹配「${this.currentLocationText}」。`:'MVU 当前地点暂不可用。');return;}this.ui.status('');this.selectNode(this.currentNode,true);}
    selectNode(node,focus=false){if(!node||!this.renderer)return;this.renderer.selected=node;if(focus)this.viewport.focus(node,node.type==='region'?1.38:1.85);this.ui.showNode(node);this.requestRender();}
    focusNode(node){this.viewport.focus(node,node.type==='region'?1.45:2.0);this.requestRender();}
    clearSelection(){if(this.renderer?.selected){this.renderer.selected=null;this.requestRender();}}
    compose(node){try{const command=this.composer.fill(node);this.ui.status(`已填入输入框：${command}`,'info');if(!localWin.__SHIOMI_MAP_DEMO__)this.close();}catch(error){console.warn(LOG,'无法填入输入框。',error);this.ui.status(error?.message||'无法填入输入框。');}}
    zoomBy(factor){this.ui.fadeHint();this.viewport.setZoom(this.viewport.zoom*factor);this.requestRender();}
    pan(dx,dy){this.ui.fadeHint();this.viewport.pan(dx,dy);this.requestRender();}
    home(){this.viewport.home(true);this.requestRender();}
    async reloadData(){if(this.destroyed)return;this.repository.clear();this.loaded=false;this.locationDirty=true;try{await this.ensureLoaded(true);this.requestRender();}catch(_) {}}
    destroy(){if(this.destroyed)return;this.destroyed=true;this.isOpen=false;try{if(this.interactionTimer){hostWin.clearTimeout(this.interactionTimer);this.interactionTimer=0;}}catch(_){}for(const d of this.disposers.splice(0)){try{d();}catch(_){}}this.ui.destroy();this.repository.clear();this.pointers.clear();if(hostWin.ShiomiMap===api){try{delete hostWin.ShiomiMap;}catch(_){hostWin.ShiomiMap=undefined;}}if(localWin.ShiomiMap===api){try{delete localWin.ShiomiMap;}catch(_){localWin.ShiomiMap=undefined;}}console.info(LOG,'实例已销毁。');}
  }

  const lifecycle=new MapLifecycle();
  const api={
    version:VERSION,init:()=>lifecycle.init(),open:()=>lifecycle.open(),close:()=>lifecycle.close(),destroy:()=>lifecycle.destroy(),reloadData:()=>lifecycle.reloadData(),
    getState:()=>({initialized:lifecycle.initialized,loaded:lifecycle.loaded,open:lifecycle.isOpen,currentLocation:lifecycle.currentLocationText,currentNode:lifecycle.currentNode?.id||'',worldbook:lifecycle.repository.worldbookName,zoom:lifecycle.viewport.zoom,minZoom:lifecycle.viewport.minZoom,maxZoom:lifecycle.viewport.maxZoom})
  };
  hostWin.ShiomiMap=api;localWin.ShiomiMap=api;
  try{if(typeof initializeGlobal==='function')initializeGlobal('ShiomiMap',api);}catch(error){console.warn(LOG,'initializeGlobal 不可用；已保留 window.ShiomiMap 接口。',error);}
  const start=()=>{try{lifecycle.init();if(localWin.__SHIOMI_MAP_DEMO_AUTO_OPEN__)hostWin.setTimeout(()=>void lifecycle.open(),50);}catch(error){console.error(LOG,'入口初始化失败。',error);}};
  if(hostDoc.readyState==='loading')hostDoc.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
