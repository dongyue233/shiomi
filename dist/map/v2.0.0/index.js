const VERSION = '2.0.0';
const ROOT_ID = 'shiomi-map-host';
const localWin = window;
const hostWin = (() => {
  try { return window.parent?.document ? window.parent : window; } catch (_) { return window; }
})();
const hostDoc = hostWin.document;
const moduleUrl = new URL(import.meta.url);
const embedded = moduleUrl.searchParams.has('shiomi_scene_carousel') || moduleUrl.searchParams.has('embedded');

const emit = (name, detail = {}) => {
  try { hostWin.dispatchEvent(new hostWin.CustomEvent(name, { detail })); } catch (_) {}
  if (localWin !== hostWin) {
    try { localWin.dispatchEvent(new localWin.CustomEvent(name, { detail })); } catch (_) {}
  }
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const assetUrl = (path) => new URL(path, import.meta.url).href;

async function loadJson(path) {
  const response = await fetch(assetUrl(path), { cache: 'force-cache' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

function shellMarkup() {
  return `
    <section class="shiomi-map-shell${embedded ? ' closed' : ''}" data-busy="true" aria-label="汐见市城市地图">
      <section id="map-viewport" class="map-viewport" tabindex="0" aria-label="可拖动和缩放的汐见市地图">
        <canvas id="tile-canvas"></canvas>
        <div class="map-tint" aria-hidden="true"></div>
        <svg id="vector-overlay" class="vector-overlay" width="1448" height="1086" viewBox="0 0 1448 1086" aria-hidden="true"></svg>
        <div id="world-layer" class="world-layer"></div>
      </section>

      <div class="map-frame" aria-hidden="true"></div>
      <header class="map-brand" aria-label="汐见城市地图">
        <div class="map-brand-kicker">CITY ARCHIVE · MAP 07</div>
        <h1>汐见<small>城市案内</small></h1>
      </header>

      <nav class="map-actions" aria-label="地图操作">
        <button class="map-command" type="button" data-action="back" aria-label="返回上一级" hidden><span class="glyph">↶</span><span class="label">返回</span></button>
        <button class="map-command" type="button" data-action="search" aria-label="搜索地点"><span class="glyph">⌕</span><span class="label">搜索</span></button>
        <button class="map-command" type="button" data-action="layers" aria-label="地图图层"><span class="glyph">≡</span><span class="label">图层</span></button>
        <button class="map-command close" type="button" data-action="close" aria-label="关闭地图"><span class="glyph">×</span></button>
      </nav>

      <nav class="map-zoom" aria-label="缩放操作">
        <button class="map-command" type="button" data-action="zoom-out" aria-label="缩小">−</button>
        <button class="map-command" type="button" data-action="zoom-in" aria-label="放大">＋</button>
        <button class="map-command" type="button" data-action="fit" aria-label="显示全城">◇</button>
      </nav>

      <div class="map-status" aria-live="polite">
        <div class="status-block"><small>CURRENT VIEW</small><strong id="map-current-region">汐见市</strong></div>
        <div class="status-block"><small>SELECTED</small><strong id="map-current-selection">城市总览</strong></div>
        <div class="status-block"><small>MAP SCALE</small><code id="scale-readout">CITY / LOD 0</code></div>
      </div>

      <section id="search-drawer" class="map-drawer" aria-label="地点搜索" aria-hidden="true">
        <header class="drawer-head"><span>SEARCH / LOCATION INDEX</span><button class="drawer-close" type="button" data-action="search-close" aria-label="关闭搜索">×</button></header>
        <div class="search-inner">
          <label class="search-field"><span aria-hidden="true">⌕</span><input id="map-search" type="search" autocomplete="off" placeholder="地区、地点或案件"><kbd>ESC</kbd></label>
          <div id="search-results" class="search-results" role="listbox"></div>
        </div>
      </section>

      <section id="layer-drawer" class="map-drawer" aria-label="地图图层" aria-hidden="true">
        <header class="drawer-head"><span>DISPLAY / LAYER CONTROL</span><button class="drawer-close" type="button" data-action="layers-close" aria-label="关闭图层">×</button></header>
        <div class="layer-list">
          <button class="layer-toggle active" type="button" data-layer="labels" aria-pressed="true"><span class="layer-number">01</span><span class="layer-name"><strong>地名标注</strong><small>LABELS</small></span><span class="layer-state"></span></button>
          <button class="layer-toggle active" type="button" data-layer="locations" aria-pressed="true"><span class="layer-number">02</span><span class="layer-name"><strong>地点坐标</strong><small>LOCATIONS</small></span><span class="layer-state"></span></button>
          <button class="layer-toggle" type="button" data-layer="cases" aria-pressed="false"><span class="layer-number">03</span><span class="layer-name"><strong>案件位置</strong><small>KNOWN CASES</small></span><span class="layer-state"></span></button>
          <button class="layer-toggle" type="button" data-layer="routes" aria-pressed="false"><span class="layer-number">04</span><span class="layer-name"><strong>道路核对</strong><small>ROAD NETWORK</small></span><span class="layer-state"></span></button>
          <button class="layer-toggle" type="button" data-layer="access" aria-pressed="false"><span class="layer-number">05</span><span class="layer-name"><strong>通行权限</strong><small>ACCESS</small></span><span class="layer-state"></span></button>
        </div>
      </section>

      <aside id="detail-panel" class="shiomi-map-panel" aria-live="polite" aria-hidden="true">
        <button class="panel-close" type="button" data-action="panel-close" aria-label="收起地点资料">×</button>
        <div class="shiomi-map-panel-content"></div>
      </aside>

      <div class="map-loader" role="status"><div class="loader-mark"><span>汐</span></div><div class="loader-copy">LOADING CITY ARCHIVE</div></div>
      <div class="map-error"><div><strong>地图资料读取失败</strong><p>请检查网络连接或地图资源路径后重新打开。</p></div></div>
    </section>`;
}

async function start() {
  try {
    const previous = hostWin.ShiomiMap || localWin.ShiomiMap;
    if (previous?.destroy) await previous.destroy();
  } catch (_) {}
  hostDoc.getElementById(ROOT_ID)?.remove();

  const host = hostDoc.createElement('div');
  host.id = ROOT_ID;
  const root = host.attachShadow({ mode: 'open' });
  const link = hostDoc.createElement('link');
  link.rel = 'stylesheet';
  link.href = assetUrl('./styles.css');
  root.append(link);
  const mount = hostDoc.createElement('div');
  mount.innerHTML = shellMarkup();
  root.append(mount);
  (hostDoc.body || hostDoc.documentElement).append(host);

  const shell = root.querySelector('.shiomi-map-shell');
  const errorPanel = root.querySelector('.map-error');
  let DATA;
  let MANIFEST;
  let LABELS;
  try {
    [DATA, MANIFEST, LABELS] = await Promise.all([
      loadJson('./data/shiomi-runtime-data.v2.json'),
      loadJson('./data/tile-manifest.v7.0.json'),
      loadJson('./data/label-layout.v4.9.json')
    ]);
  } catch (error) {
    console.error('[ShiomiMap]', error);
    shell.dataset.busy = 'false';
    errorPanel.classList.add('open');
    emit('shiomi-map:error', { message: '地图数据读取失败', error: String(error) });
    return;
  }

  const viewport = root.getElementById('map-viewport');
  const canvas = root.getElementById('tile-canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const overlay = root.getElementById('vector-overlay');
  const world = root.getElementById('world-layer');
  const detail = root.getElementById('detail-panel');
  const detailContent = detail.querySelector('.shiomi-map-panel-content');
  const searchDrawer = root.getElementById('search-drawer');
  const layerDrawer = root.getElementById('layer-drawer');
  const search = root.getElementById('map-search');
  const results = root.getElementById('search-results');
  const readout = root.getElementById('scale-readout');
  const regionReadout = root.getElementById('map-current-region');
  const selectionReadout = root.getElementById('map-current-selection');
  const backButtons = [...root.querySelectorAll('[data-action="back"]')];
  const cache = new Map();
  const disposers = [];
  const nodeIndex = new Map(DATA.coordinates.map((item) => [item.id, item]));
  const regionIndex = new Map(DATA.regions.map((item) => [item.id, item]));
  const placementIndex = new Map((LABELS.regional || []).map((item) => [item.id, item]));
  const overviewMajorIds = new Set((LABELS.overview || []).filter((item) => item.type === 'major').map((item) => item.id));
  const tileBase = assetUrl('./tiles-v7.0-final-master/');
  let renderFrame = 0;
  let collisionTimer = 0;
  let tileFailureReported = false;

  DATA.cases.forEach((item) => nodeIndex.set(item.id, {
    ...item,
    kind: 'case',
    name: `CASE ${item.no}《${item.title}》`,
    region: DATA.coordinates.find((coordinate) => coordinate.name === item.place)?.region || '',
    category: 'case',
    description: item.matter
  }));

  const state = {
    initialized: false,
    open: !embedded,
    centerX: DATA.canvas.width / 2,
    centerY: DATA.canvas.height / 2,
    zoom: 1,
    minZoom: .25,
    maxZoom: 8,
    selected: '',
    region: '',
    lod: 'city',
    layers: { labels: true, locations: true, cases: false, routes: false, access: false },
    knownCaseIds: new Set(embedded ? [] : DATA.cases.map((item) => item.id)),
    pointers: new Map(),
    drag: null,
    pinch: null,
    didMove: false,
    history: [],
    fitted: false,
    diagnostics: { last: 0, samples: 0, total: 0, max: 0, over25: 0, over34: 0 },
    destroyed: false
  };

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    disposers.push(() => target.removeEventListener(type, handler, options));
  };

  function resetShellScroll() {
    shell.scrollLeft = 0;
    shell.scrollTop = 0;
  }

  function resetDiagnostics() {
    state.diagnostics = { last: 0, samples: 0, total: 0, max: 0, over25: 0, over34: 0 };
    publishDiagnostics();
  }

  function recordRenderTiming() {
    const now = hostWin.performance?.now?.() ?? Date.now();
    const metrics = state.diagnostics;
    if (metrics.last) {
      const interval = now - metrics.last;
      if (interval > 0 && interval < 250) {
        metrics.samples += 1;
        metrics.total += interval;
        metrics.max = Math.max(metrics.max, interval);
        if (interval > 25) metrics.over25 += 1;
        if (interval > 34) metrics.over34 += 1;
      }
    }
    metrics.last = now;
  }

  function diagnosticsSnapshot() {
    const metrics = state.diagnostics;
    return {
      samples: metrics.samples,
      averageMs: metrics.samples ? metrics.total / metrics.samples : 0,
      maxMs: metrics.max,
      over25: metrics.over25,
      over34: metrics.over34,
      cacheSize: cache.size,
      cacheLimit: viewport.clientWidth < 700 ? 52 : 108
    };
  }

  function publishDiagnostics() {
    const metrics = diagnosticsSnapshot();
    shell.dataset.renderSamples = String(metrics.samples);
    shell.dataset.renderAverageMs = metrics.averageMs.toFixed(2);
    shell.dataset.renderMaxMs = metrics.maxMs.toFixed(2);
    shell.dataset.renderOver25 = String(metrics.over25);
    shell.dataset.renderOver34 = String(metrics.over34);
    shell.dataset.cacheSize = String(metrics.cacheSize);
    shell.dataset.cacheLimit = String(metrics.cacheLimit);
  }

  function setDrawer(drawer, open) {
    const previousActive = root.activeElement;
    [searchDrawer, layerDrawer].forEach((item) => {
      const active = item === drawer && open;
      item.classList.toggle('open', active);
      item.setAttribute('aria-hidden', String(!active));
    });
    root.querySelector('[data-action="search"]')?.classList.toggle('active', drawer === searchDrawer && open);
    root.querySelector('[data-action="layers"]')?.classList.toggle('active', drawer === layerDrawer && open);
    if (drawer === searchDrawer && open) {
      renderSearchResults(search.value);
      setTimeout(() => {
        try { search.focus({ preventScroll: true }); } catch (_) { search.focus(); }
        resetShellScroll();
      }, 30);
    } else if (!open) {
      if (previousActive && (searchDrawer.contains(previousActive) || layerDrawer.contains(previousActive))) previousActive.blur?.();
      resetShellScroll();
      hostWin.requestAnimationFrame(resetShellScroll);
    }
  }

  function closeOverlays() {
    setDrawer(null, false);
    detail.classList.remove('open');
    detail.setAttribute('aria-hidden', 'true');
  }

  function currentView() {
    return { centerX: state.centerX, centerY: state.centerY, zoom: state.zoom, region: state.region, selected: state.selected };
  }

  function pushHistory() {
    const view = currentView();
    const previous = state.history[state.history.length - 1];
    const changed = !previous || previous.region !== view.region || previous.selected !== view.selected ||
      Math.hypot(previous.centerX - view.centerX, previous.centerY - view.centerY) > 2 || Math.abs(previous.zoom - view.zoom) > .03;
    if (!changed) return;
    state.history.push(view);
    if (state.history.length > 16) state.history.shift();
  }

  function fit(remember = false) {
    if (remember) pushHistory();
    const rect = viewport.getBoundingClientRect();
    const contain = Math.min(rect.width / DATA.canvas.width, rect.height / DATA.canvas.height) * .96;
    const cover = Math.max(rect.width / DATA.canvas.width, rect.height / DATA.canvas.height);
    const portraitReadingZoom = rect.height > rect.width * 1.18 ? Math.min(.62, cover * .74) : contain;
    const next = Math.max(contain, portraitReadingZoom);
    state.zoom = next;
    state.minZoom = next * .72;
    state.centerX = DATA.canvas.width / 2;
    state.centerY = DATA.canvas.height / 2;
    state.region = '';
    state.selected = '';
    state.fitted = true;
    world.querySelectorAll('.pin.selected').forEach((pin) => pin.classList.remove('selected'));
    closeOverlays();
    scheduleRender();
  }

  function resize() {
    const rect = viewport.getBoundingClientRect();
    const dprLimit = rect.width < 700 ? 1.6 : 2;
    const dpr = Math.min(dprLimit, hostWin.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    scheduleRender();
  }

  function chooseLevel() {
    const target = state.zoom * Math.min(2, hostWin.devicePixelRatio || 1);
    let best = MANIFEST.levels[0];
    for (const level of MANIFEST.levels) {
      const levelScale = level.width / DATA.canvas.width;
      const bestScale = best.width / DATA.canvas.width;
      if (Math.abs(Math.log2(levelScale) - Math.log2(target)) < Math.abs(Math.log2(bestScale) - Math.log2(target))) best = level;
    }
    return best;
  }

  function requestTile(level, x, y) {
    const formats = MANIFEST.formatPriority || ['avif', 'webp'];
    const cacheKey = `${level.id}/${x}_${y}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const record = { image: new hostWin.Image(), ready: false, formatIndex: 0, last: performance.now() };
    record.image.decoding = 'async';
    const load = () => { record.image.src = `${tileBase}${level.id}/${x}_${y}.${formats[record.formatIndex]}`; };
    record.image.onload = () => { record.ready = true; scheduleRender(); };
    record.image.onerror = () => {
      record.formatIndex += 1;
      if (record.formatIndex < formats.length) load();
      else if (!tileFailureReported) {
        tileFailureReported = true;
        emit('shiomi-map:error', { message: '部分地图切片加载失败' });
      }
    };
    load();
    cache.set(cacheKey, record);
    return record;
  }

  function trimCache() {
    const limit = viewport.clientWidth < 700 ? 52 : 108;
    if (cache.size <= limit) return;
    [...cache.entries()]
      .sort((left, right) => left[1].last - right[1].last)
      .slice(0, cache.size - limit)
      .forEach(([key, record]) => {
        record.image.onload = null;
        record.image.onerror = null;
        cache.delete(key);
      });
  }

  function drawTiles() {
    const rect = viewport.getBoundingClientRect();
    const level = chooseLevel();
    const scale = level.width / DATA.canvas.width;
    const tileWorld = MANIFEST.tileSize / scale;
    const left = state.centerX - rect.width / (2 * state.zoom);
    const top = state.centerY - rect.height / (2 * state.zoom);
    const right = state.centerX + rect.width / (2 * state.zoom);
    const bottom = state.centerY + rect.height / (2 * state.zoom);
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = '#d9d4c8';
    context.fillRect(0, 0, rect.width, rect.height);
    const x0 = Math.max(0, Math.floor(left / tileWorld) - 1);
    const y0 = Math.max(0, Math.floor(top / tileWorld) - 1);
    const x1 = Math.min(level.columns - 1, Math.floor(right / tileWorld) + 1);
    const y1 = Math.min(level.rows - 1, Math.floor(bottom / tileWorld) + 1);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const record = requestTile(level, x, y);
        record.last = performance.now();
        if (!record.ready) continue;
        const worldX = x * tileWorld;
        const worldY = y * tileWorld;
        const sourceWidth = record.image.naturalWidth / scale;
        const sourceHeight = record.image.naturalHeight / scale;
        const screenX = (worldX - state.centerX) * state.zoom + rect.width / 2;
        const screenY = (worldY - state.centerY) * state.zoom + rect.height / 2;
        context.drawImage(record.image, screenX, screenY, sourceWidth * state.zoom + .4, sourceHeight * state.zoom + .4);
      }
    }
    trimCache();
    return level;
  }

  function computeLod() {
    if (state.zoom < 1.05) return 'city';
    if (state.zoom < 2.2) return 'region';
    return 'detail';
  }

  function updateTransform() {
    const rect = viewport.getBoundingClientRect();
    const x = rect.width / 2 - state.centerX * state.zoom;
    const y = rect.height / 2 - state.centerY * state.zoom;
    const transform = `translate(${x}px, ${y}px) scale(${state.zoom})`;
    overlay.style.transform = transform;
    world.style.transform = transform;
    world.style.setProperty('--inv-zoom', String(1 / state.zoom));
    state.lod = computeLod();
    world.classList.toggle('hide-labels', !state.layers.labels);
    world.classList.toggle('hide-locations', !state.layers.locations);
    world.classList.toggle('show-cases', state.layers.cases);
    viewport.classList.toggle('show-routes', state.layers.routes);
    viewport.classList.toggle('show-access', state.layers.access);
    world.querySelectorAll('.city-label').forEach((label) => {
      label.style.display = state.layers.labels && state.lod === 'city' ? 'block' : 'none';
    });
    world.querySelectorAll('.regional-label').forEach((label) => {
      const item = nodeIndex.get(label.dataset.id);
      const inActiveRegion = !state.region || item?.region === state.region;
      const visible = state.layers.labels && inActiveRegion &&
        (state.lod === 'detail' || (state.lod === 'region' && (Boolean(state.region) || item?.major || item?.kind === 'anchor')));
      label.style.display = visible ? 'block' : 'none';
    });
    world.querySelectorAll('.pin.coordinate').forEach((pin) => {
      const item = nodeIndex.get(pin.dataset.id);
      const inActiveRegion = !state.region || item?.region === state.region;
      const visible = state.layers.locations && (pin.classList.contains('selected') ||
        (inActiveRegion && state.lod === 'detail') ||
        (inActiveRegion && state.lod === 'region' && (Boolean(state.region) || item?.major || item?.kind === 'anchor')) ||
        (state.lod === 'city' && overviewMajorIds.has(item?.id)));
      pin.style.display = visible ? '' : 'none';
    });
    world.querySelectorAll('.pin.case').forEach((pin) => {
      const visible = state.layers.cases && state.knownCaseIds.has(pin.dataset.id);
      pin.style.display = visible ? 'grid' : 'none';
    });
    const lodNumber = state.lod === 'city' ? 0 : state.lod === 'region' ? 1 : 2;
    readout.textContent = `${state.lod.toUpperCase()} / LOD ${lodNumber} / ${state.zoom.toFixed(2)}×`;
    regionReadout.textContent = regionIndex.get(state.region)?.name || '汐见市';
    const selectedItem = nodeIndex.get(state.selected);
    selectionReadout.textContent = selectedItem?.name || (state.region ? '地区阅读' : '城市总览');
    backButtons.forEach((button) => { button.hidden = state.history.length === 0 && !state.region && !state.selected; });
    scheduleCollision();
  }

  function scheduleCollision() {
    clearTimeout(collisionTimer);
    if (state.drag || state.pinch || !state.layers.labels) return;
    collisionTimer = setTimeout(() => {
      if (state.destroyed) return;
      const labels = [...world.querySelectorAll('.map-label')];
      labels.forEach((label) => label.classList.remove('collision-hidden'));
      const viewportBox = viewport.getBoundingClientRect();
      const occupied = [];
      labels.sort((left, right) => {
        const score = (label) => label.dataset.id === state.selected ? 0 : label.classList.contains('city-major') ? 1 : label.classList.contains('major') ? 2 : 3;
        return score(left) - score(right);
      });
      labels.forEach((label) => {
        if (getComputedStyle(label).display === 'none') return;
        const box = label.getBoundingClientRect();
        if (box.right < viewportBox.left || box.left > viewportBox.right || box.bottom < viewportBox.top || box.top > viewportBox.bottom) return;
        const padded = { left: box.left - 4, right: box.right + 4, top: box.top - 3, bottom: box.bottom + 3 };
        const overlaps = occupied.some((other) => !(padded.right < other.left || padded.left > other.right || padded.bottom < other.top || padded.top > other.bottom));
        if (overlaps && label.dataset.id !== state.selected) label.classList.add('collision-hidden');
        else occupied.push(padded);
      });
    }, 74);
  }

  function renderNow() {
    renderFrame = 0;
    if (state.destroyed || !state.initialized || !state.open) return;
    recordRenderTiming();
    drawTiles();
    updateTransform();
  }

  function scheduleRender() {
    if (!renderFrame) renderFrame = hostWin.requestAnimationFrame(renderNow);
  }

  function clampCenter() {
    const pad = 120 / state.zoom;
    state.centerX = Math.max(-pad, Math.min(DATA.canvas.width + pad, state.centerX));
    state.centerY = Math.max(-pad, Math.min(DATA.canvas.height + pad, state.centerY));
  }

  function zoomAt(factor, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const oldZoom = state.zoom;
    const nextZoom = Math.max(state.minZoom, Math.min(state.maxZoom, oldZoom * factor));
    const worldX = state.centerX + (clientX - rect.left - rect.width / 2) / oldZoom;
    const worldY = state.centerY + (clientY - rect.top - rect.height / 2) / oldZoom;
    state.zoom = nextZoom;
    state.centerX = worldX - (clientX - rect.left - rect.width / 2) / nextZoom;
    state.centerY = worldY - (clientY - rect.top - rect.height / 2) / nextZoom;
    clampCenter();
    scheduleRender();
  }

  function focusPoint(x, y, zoom = Math.max(state.zoom, 2.45), remember = true) {
    if (remember) pushHistory();
    state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, zoom));
    state.centerX = x;
    state.centerY = y;
    if (viewport.clientWidth <= 900 && detail.classList.contains('open')) {
      const rect = viewport.getBoundingClientRect();
      const targetScreenY = Math.max(118, rect.height * .24);
      state.centerY = y + (rect.height / 2 - targetScreenY) / state.zoom;
    }
    clampCenter();
    scheduleRender();
  }

  function regionBounds(region) {
    const layoutView = LABELS.regionViews?.[region.id];
    if (layoutView) return layoutView;
    const xs = region.polygon.map((point) => point[0]);
    const ys = region.polygon.map((point) => point[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  function focusRegionView(region, remember = true) {
    if (remember) pushHistory();
    const bounds = regionBounds(region);
    const rect = viewport.getBoundingClientRect();
    state.centerX = bounds.x + bounds.width / 2;
    state.centerY = bounds.y + bounds.height / 2;
    state.zoom = Math.max(1.2, Math.min(2.05, Math.min(rect.width / bounds.width, rect.height / bounds.height) * .84));
    clampCenter();
    scheduleRender();
  }

  function panelMarkup(item, region) {
    const isCase = item.kind === 'case';
    const kicker = isCase ? 'CASE POSITION / KNOWN FACT' : item.kind === 'anchor' ? 'CITY ANCHOR / TRANSIT' : 'LOCATION INDEX / CITY ARCHIVE';
    const typeLabels = {
      anchor: '城市锚点', bath: '公共浴场', bridge: '桥梁', case: '案件位置', cemetery: '墓园',
      civic: '公共机构', clinic: '诊所', commercial: '商业设施', hotel: '旅馆', hospital: '医院',
      industrial: '工业设施', landmark: '城市地标', location: '地点', market: '市场', park: '公园',
      port: '港口设施', school: '学校', shrine: '寺社', station: '车站', university: '大学'
    };
    const typeLabel = typeLabels[item.category] || typeLabels[item.kind] || item.category || item.kind || '地点';
    const description = item.description || item.matter || item.semanticRole || '已登记的汐见市地点。';
    const parent = item.parent ? nodeIndex.get(item.parent)?.name || item.parent : '';
    const code = isCase ? item.no : String([...nodeIndex.keys()].indexOf(item.id) + 1).padStart(2, '0');
    return `<div class="panel-kicker">${kicker}</div>
      <div class="panel-code">${escapeHtml(code)}</div>
      <h2>${escapeHtml(item.name)}</h2>
      <div class="panel-subtitle">${escapeHtml(region?.name || item.place || '汐见市')}</div>
      <p>${escapeHtml(description)}</p>
      <dl><dt>地区</dt><dd>${escapeHtml(region?.name || item.place || '城市级')}</dd>
      <dt>分类</dt><dd>${escapeHtml(typeLabel)}</dd>
      <dt>地图坐标</dt><dd>${Number(item.x).toFixed(1)} / ${Number(item.y).toFixed(1)}</dd>
      ${parent ? `<dt>父级空间</dt><dd>${escapeHtml(parent)}</dd>` : ''}</dl>
      <div class="panel-note">地图只呈现调查中已经确认的空间信息，不生成或补充案件事实。</div>
      <div class="shiomi-map-actions">
        <button class="panel-action" type="button" data-action="focus-selected">聚焦地点</button>
        <button class="panel-action secondary" type="button" data-action="panel-close">继续浏览</button>
      </div>`;
  }

  function regionPanelMarkup(region) {
    const locationCount = DATA.coordinates.filter((item) => item.region === region.id).length;
    const roadCount = DATA.roads.filter((item) => item.district === region.id || item.region === region.id).length;
    const code = String(DATA.regions.findIndex((item) => item.id === region.id) + 1).padStart(2, '0');
    return `<div class="panel-kicker">CITY DISTRICT / REGION INDEX</div>
      <div class="panel-code">${code}</div>
      <h2>${escapeHtml(region.name)}</h2>
      <div class="panel-subtitle">SHIOMI CITY · DISTRICT ${code}</div>
      <p>${escapeHtml(region.description || region.morphology || '汐见市城市地区。')}</p>
      <dl><dt>登记地点</dt><dd>${locationCount}</dd><dt>地区道路</dt><dd>${roadCount}</dd><dt>阅读级别</dt><dd>区域 LOD</dd></dl>
      <div class="panel-note">地区范围用于地图阅读；地点可见性仍由当前调查状态控制。</div>
      <div class="shiomi-map-actions">
        <button class="panel-action" type="button" data-action="focus-region">进入地区</button>
        <button class="panel-action secondary" type="button" data-action="panel-close">继续浏览</button>
      </div>`;
  }

  function openDetail(markup) {
    detailContent.innerHTML = markup;
    detail.classList.add('open');
    detail.setAttribute('aria-hidden', 'false');
    setDrawer(null, false);
  }

  function selectNode(id, focus = false) {
    const item = nodeIndex.get(id);
    if (!item) return false;
    if (item.kind === 'case' && !state.knownCaseIds.has(id)) return false;
    state.selected = id;
    if (item.region) state.region = item.region;
    world.querySelectorAll('.pin.selected').forEach((pin) => pin.classList.toggle('selected', pin.dataset.id === id));
    world.querySelector(`.pin[data-id="${CSS.escape(id)}"]`)?.classList.add('selected');
    openDetail(panelMarkup(item, regionIndex.get(item.region)));
    if (focus) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);
    else scheduleRender();
    emit('shiomi-map:focus', { id, item, focused: focus });
    return true;
  }

  function selectRegion(id, focus = false) {
    const region = regionIndex.get(id);
    if (!region) return false;
    state.region = id;
    state.selected = '';
    world.querySelectorAll('.pin.selected').forEach((pin) => pin.classList.remove('selected'));
    openDetail(regionPanelMarkup(region));
    if (focus) focusRegionView(region);
    else scheduleRender();
    emit('shiomi-map:focus', { id, item: { ...region, kind: 'region' }, focused: focus });
    return true;
  }

  function createLabel(item, className) {
    const label = hostDoc.createElement('span');
    label.className = `map-label ${className}`;
    label.textContent = item.name;
    label.style.left = `${item.labelX ?? item.x}px`;
    label.style.top = `${item.labelY ?? item.y}px`;
    if (item.fontSize) label.style.fontSize = `${Math.max(8, item.fontSize)}px`;
    if (item.id) label.dataset.id = item.id;
    return label;
  }

  function buildOverlay() {
    const namespace = 'http://www.w3.org/2000/svg';
    overlay.replaceChildren();
    world.replaceChildren();
    DATA.roads.forEach((line) => {
      const path = hostDoc.createElementNS(namespace, 'path');
      path.setAttribute('class', `route tier-${String(line.tier || '').toLowerCase()} ${line.access === 'controlled' ? 'controlled' : ''}`);
      path.setAttribute('d', `M${line.points.map((point) => point.join(' ')).join('L')}`);
      overlay.append(path);
    });
    DATA.regions.forEach((region) => {
      const polygon = hostDoc.createElementNS(namespace, 'polygon');
      polygon.setAttribute('class', 'region-hit');
      polygon.setAttribute('points', region.polygon.map((point) => point.join(',')).join(' '));
      polygon.dataset.region = region.id;
      listen(polygon, 'click', () => {
        if (state.didMove) return;
        const secondTap = state.region === region.id && detail.classList.contains('open');
        selectRegion(region.id, secondTap);
      });
      overlay.append(polygon);
    });
    (LABELS.overview || []).forEach((item) => world.append(createLabel(item, `city-label city-${item.type}`)));
    DATA.coordinates.forEach((item) => {
      const pin = hostDoc.createElement('button');
      pin.type = 'button';
      pin.className = `pin coordinate ${item.kind === 'anchor' ? 'anchor' : 'location'}${item.major ? ' major' : ''}`;
      pin.dataset.id = item.id;
      pin.style.left = `${item.x}px`;
      pin.style.top = `${item.y}px`;
      pin.setAttribute('aria-label', item.name);
      listen(pin, 'click', (event) => {
        event.stopPropagation();
        const secondTap = state.selected === item.id && detail.classList.contains('open');
        selectNode(item.id, secondTap);
      });
      world.append(pin);
      const placement = placementIndex.get(item.id);
      const labelItem = placement ? {
        ...item,
        labelX: placement.box?.x ?? placement.x + 8,
        labelY: placement.box ? placement.box.y + placement.box.height / 2 : placement.y,
        fontSize: placement.fontSize
      } : { ...item, labelX: item.x + 9, labelY: item.y - 8 };
      world.append(createLabel(labelItem, `regional-label ${item.major || item.kind === 'anchor' ? 'major' : 'minor'}`));
    });
    DATA.cases.forEach((item) => {
      const pin = hostDoc.createElement('button');
      pin.type = 'button';
      pin.className = 'pin case';
      pin.dataset.id = item.id;
      pin.textContent = item.no;
      pin.style.left = `${item.x}px`;
      pin.style.top = `${item.y}px`;
      pin.setAttribute('aria-label', `CASE ${item.no} ${item.title}`);
      listen(pin, 'click', (event) => {
        event.stopPropagation();
        const secondTap = state.selected === item.id && detail.classList.contains('open');
        selectNode(item.id, secondTap);
      });
      world.append(pin);
    });
  }

  function searchItems(query) {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    if (!normalized) return DATA.regions;
    return [...nodeIndex.values(), ...DATA.regions].filter((item) =>
      (item.kind !== 'case' || state.knownCaseIds.has(item.id)) &&
      [item.name, ...(item.aliases || []), item.title, item.matter, item.semanticRole]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('zh-CN').includes(normalized))).slice(0, 18);
  }

  function renderSearchResults(query = '') {
    const items = searchItems(query);
    results.replaceChildren();
    if (!items.length) {
      const empty = hostDoc.createElement('div');
      empty.className = 'search-results-empty';
      empty.textContent = '没有匹配的已知地点';
      results.append(empty);
      return;
    }
    items.forEach((item, index) => {
      const button = hostDoc.createElement('button');
      button.type = 'button';
      button.className = 'result';
      const regionName = regionIndex.get(item.region)?.name || (item.polygon ? '城市地区' : item.kind === 'case' ? '案件位置' : '汐见市');
      button.innerHTML = `<span class="result-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(item.name || item.title)}</strong><small>${escapeHtml(regionName)}</small></span>`;
      listen(button, 'click', () => {
        search.value = item.name || item.title;
        setDrawer(null, false);
        if (item.polygon) selectRegion(item.id, true);
        else selectNode(item.id, true);
        try { viewport.focus({ preventScroll: true }); } catch (_) { viewport.focus(); }
        resetShellScroll();
      });
      results.append(button);
    });
  }

  function returnToPreviousView() {
    const previous = state.history.pop();
    if (!previous) { fit(); return; }
    Object.assign(state, previous);
    world.querySelectorAll('.pin.selected').forEach((pin) => pin.classList.toggle('selected', pin.dataset.id === state.selected));
    if (state.selected) {
      const item = nodeIndex.get(state.selected);
      if (item) openDetail(panelMarkup(item, regionIndex.get(item.region)));
    } else if (state.region) {
      const region = regionIndex.get(state.region);
      if (region) openDetail(regionPanelMarkup(region));
    } else closeOverlays();
    scheduleRender();
  }

  const pointerDistance = (points) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const pointerMidpoint = (points) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
  function beginPinch() {
    const points = [...state.pointers.values()].slice(0, 2);
    if (points.length < 2) return;
    const rect = viewport.getBoundingClientRect();
    const midpoint = pointerMidpoint(points);
    state.pinch = {
      distance: pointerDistance(points),
      zoom: state.zoom,
      worldX: state.centerX + (midpoint.x - rect.left - rect.width / 2) / state.zoom,
      worldY: state.centerY + (midpoint.y - rect.top - rect.height / 2) / state.zoom
    };
    state.drag = null;
  }

  function bind() {
    listen(hostWin, 'resize', resize);
    listen(search, 'input', () => renderSearchResults(search.value));
    listen(search, 'keydown', (event) => {
      if (event.key === 'Escape') setDrawer(null, false);
      if (event.key === 'Enter') results.querySelector('.result')?.click();
    });
    listen(viewport, 'wheel', (event) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.15 : .87, event.clientX, event.clientY);
    }, { passive: false });
    listen(viewport, 'pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest?.('.pin')) return;
      if (state.pointers.size === 0) resetDiagnostics();
      viewport.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      state.didMove = false;
      if (state.pointers.size === 1) {
        state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, centerX: state.centerX, centerY: state.centerY };
        viewport.classList.add('dragging');
      } else beginPinch();
    });
    listen(viewport, 'pointermove', (event) => {
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.pointers.size >= 2 && state.pinch) {
        const rect = viewport.getBoundingClientRect();
        const points = [...state.pointers.values()].slice(0, 2);
        const midpoint = pointerMidpoint(points);
        state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.pinch.zoom * pointerDistance(points) / state.pinch.distance));
        state.centerX = state.pinch.worldX - (midpoint.x - rect.left - rect.width / 2) / state.zoom;
        state.centerY = state.pinch.worldY - (midpoint.y - rect.top - rect.height / 2) / state.zoom;
        state.didMove = true;
      } else if (state.drag?.id === event.pointerId) {
        const dx = event.clientX - state.drag.x;
        const dy = event.clientY - state.drag.y;
        state.centerX = state.drag.centerX - dx / state.zoom;
        state.centerY = state.drag.centerY - dy / state.zoom;
        if (Math.hypot(dx, dy) > 4) state.didMove = true;
      }
      clampCenter();
      scheduleRender();
    });
    const endPointer = (event) => {
      state.pointers.delete(event.pointerId);
      if (state.pointers.size < 2) state.pinch = null;
      if (state.pointers.size === 1) {
        const [id, point] = [...state.pointers.entries()][0];
        state.drag = { id, x: point.x, y: point.y, centerX: state.centerX, centerY: state.centerY };
      } else if (state.pointers.size === 0) {
        state.drag = null;
        viewport.classList.remove('dragging');
        publishDiagnostics();
        setTimeout(() => { state.didMove = false; scheduleCollision(); }, 0);
      }
    };
    listen(viewport, 'pointerup', endPointer);
    listen(viewport, 'pointercancel', endPointer);
    listen(viewport, 'keydown', (event) => {
      const step = 70 / state.zoom;
      if (event.key === 'ArrowLeft') state.centerX -= step;
      else if (event.key === 'ArrowRight') state.centerX += step;
      else if (event.key === 'ArrowUp') state.centerY -= step;
      else if (event.key === 'ArrowDown') state.centerY += step;
      else if (event.key === '+' || event.key === '=') zoomAt(1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
      else if (event.key === '-') zoomAt(.84, viewport.clientWidth / 2, viewport.clientHeight / 2);
      else if (event.key === 'Escape') closeOverlays();
      else return;
      event.preventDefault();
      clampCenter();
      scheduleRender();
    });
    listen(root, 'click', (event) => {
      const actionButton = event.target.closest?.('[data-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      const rect = viewport.getBoundingClientRect();
      if (action === 'zoom-in') zoomAt(1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (action === 'zoom-out') zoomAt(.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (action === 'fit') fit(true);
      if (action === 'back') returnToPreviousView();
      if (action === 'close') api.close();
      if (action === 'search') setDrawer(searchDrawer, !searchDrawer.classList.contains('open'));
      if (action === 'layers') setDrawer(layerDrawer, !layerDrawer.classList.contains('open'));
      if (action === 'search-close' || action === 'layers-close') setDrawer(null, false);
      if (action === 'panel-close') {
        detail.classList.remove('open');
        detail.setAttribute('aria-hidden', 'true');
      }
      if (action === 'focus-selected') {
        const item = nodeIndex.get(state.selected);
        if (item) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);
      }
      if (action === 'focus-region') {
        const region = regionIndex.get(state.region);
        if (region) focusRegionView(region);
      }
    });
    root.querySelectorAll('[data-layer]').forEach((button) => listen(button, 'click', () => {
      const key = button.dataset.layer;
      state.layers[key] = !state.layers[key];
      button.classList.toggle('active', state.layers[key]);
      button.setAttribute('aria-pressed', String(state.layers[key]));
      scheduleRender();
      emit('shiomi-map:layers', { layers: { ...state.layers } });
    }));
  }

  const api = {
    version: VERSION,
    init(options = {}) {
      if (options.layers) Object.assign(state.layers, options.layers);
      if (Array.isArray(options.knownCases)) state.knownCaseIds = new Set(options.knownCases.filter((id) => nodeIndex.get(id)?.kind === 'case'));
      if (!state.initialized) {
        state.initialized = true;
        buildOverlay();
        bind();
        hostWin.requestAnimationFrame(() => {
          if (!embedded) {
            resize();
            fit();
          }
          shell.dataset.busy = 'false';
          if (!embedded) api.open();
          if (options.initialRegion) selectRegion(options.initialRegion, true);
          if (options.initialNode) selectNode(options.initialNode, true);
          emit('shiomi-map:ready', api.getState());
        });
      }
      return api;
    },
    open(options = {}) {
      shell.classList.remove('closed');
      state.open = true;
      if (options.layers) api.setLayers(options.layers);
      if (Array.isArray(options.knownCases)) api.setKnownCases(options.knownCases);
      hostWin.requestAnimationFrame(() => {
        resize();
        if (!state.fitted) fit();
        if (options.initialRegion) selectRegion(options.initialRegion, true);
        if (options.initialNode) selectNode(options.initialNode, true);
      });
      emit('shiomi-map:open', api.getState());
      return Promise.resolve(api);
    },
    close() {
      shell.classList.add('closed');
      state.open = false;
      closeOverlays();
      emit('shiomi-map:close', api.getState());
      return api;
    },
    focusNode(id) {
      if (!state.open) api.open();
      return selectNode(id, true);
    },
    focusRegion(id) {
      if (!state.open) api.open();
      return selectRegion(id, true);
    },
    setLayers(next = {}) {
      Object.assign(state.layers, next);
      root.querySelectorAll('[data-layer]').forEach((button) => {
        const value = Boolean(state.layers[button.dataset.layer]);
        button.classList.toggle('active', value);
        button.setAttribute('aria-pressed', String(value));
      });
      scheduleRender();
      return api.getState();
    },
    setKnownCases(ids = []) {
      state.knownCaseIds = new Set((Array.isArray(ids) ? ids : []).filter((id) => nodeIndex.get(id)?.kind === 'case'));
      if (nodeIndex.get(state.selected)?.kind === 'case' && !state.knownCaseIds.has(state.selected)) {
        state.selected = '';
        detail.classList.remove('open');
        detail.setAttribute('aria-hidden', 'true');
      }
      scheduleRender();
      emit('shiomi-map:visibility', { knownCases: [...state.knownCaseIds] });
      return api.getState();
    },
    resetDiagnostics() {
      resetDiagnostics();
      return diagnosticsSnapshot();
    },
    getDiagnostics() {
      return diagnosticsSnapshot();
    },
    getState() {
      return {
        version: VERSION,
        initialized: state.initialized,
        open: state.open,
        center: { x: state.centerX, y: state.centerY },
        zoom: state.zoom,
        lod: state.lod,
        selected: state.selected,
        region: state.region,
        layers: { ...state.layers },
        knownCases: [...state.knownCaseIds],
        cacheSize: cache.size,
        tileSource: MANIFEST.sourceVersion
      };
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      if (renderFrame) hostWin.cancelAnimationFrame(renderFrame);
      clearTimeout(collisionTimer);
      disposers.splice(0).forEach((dispose) => dispose());
      cache.forEach((record) => { record.image.onload = null; record.image.onerror = null; });
      cache.clear();
      host.remove();
      if (hostWin.ShiomiMap === api) delete hostWin.ShiomiMap;
      if (localWin.ShiomiMap === api) delete localWin.ShiomiMap;
      emit('shiomi-map:destroyed', { version: VERSION });
    }
  };

  hostWin.ShiomiMap = api;
  localWin.ShiomiMap = api;
  api.init();
}

start().catch((error) => {
  console.error('[ShiomiMap]', error);
  emit('shiomi-map:error', { message: '地图初始化失败', error: String(error) });
});
