const VERSION = '2.0.2-final-master-zoom15';
const localWin = window;
const hostWin = (() => {
  try { return window.parent?.document ? window.parent : window; } catch (_) { return window; }
})();
const hostDoc = hostWin.document;
const moduleUrl = new URL(import.meta.url);

const coreUrl = new URL('../v2.0.0/index.js', moduleUrl);
const markerLayerUrl = new URL('../v2.0.1/index.js', moduleUrl);
const anchorDataUrl = new URL('./data/marker-anchors.v3.1-final.json', moduleUrl);
const coreBaseUrl = new URL('../v2.0.0/', moduleUrl);

for (const [key, value] of moduleUrl.searchParams) {
  coreUrl.searchParams.set(key, value);
  markerLayerUrl.searchParams.set(key, value);
}
coreUrl.searchParams.set('core_patch', VERSION);
markerLayerUrl.searchParams.set('marker_patch', VERSION);

async function fetchText(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return response.json();
}

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`core patch missing: ${label}`);
  return source.replace(from, to);
}

function literal(value) {
  return JSON.stringify(value);
}

const anchorData = await fetchJson(anchorDataUrl);
const finalAnchors = Object.fromEntries(
  (anchorData.locations || []).map(item => [item.id, {
    x: Number(item.markerAnchor?.x),
    y: Number(item.markerAnchor?.y)
  }])
);
const renderModes = Object.fromEntries(
  (anchorData.locations || []).map(item => [item.id, item.renderMode || 'point'])
);
const caseAnchors = Object.fromEntries(
  (anchorData.caseOverrides || []).map(item => [item.id, { x: Number(item.x), y: Number(item.y) }])
);

hostWin.__SHIOMI_FINAL_MARKER_ANCHORS__ = finalAnchors;
hostWin.__SHIOMI_RENDER_MODES__ = renderModes;
if (localWin !== hostWin) {
  localWin.__SHIOMI_FINAL_MARKER_ANCHORS__ = finalAnchors;
  localWin.__SHIOMI_RENDER_MODES__ = renderModes;
}

let coreSource = await fetchText(coreUrl);
coreSource = replaceRequired(coreSource, "const VERSION = '2.0.0';", `const VERSION = ${literal(VERSION)};`, 'version');
coreSource = replaceRequired(coreSource, 'const moduleUrl = new URL(import.meta.url);', `const moduleUrl = new URL(${literal(coreUrl.href)});`, 'module-url');
coreSource = replaceRequired(coreSource, 'const assetUrl = (path) => new URL(path, import.meta.url).href;', `const assetUrl = (path) => new URL(path, ${literal(coreBaseUrl.href)}).href;`, 'asset-url');
coreSource = replaceRequired(coreSource, '    maxZoom: 8,', '    maxZoom: 1.5,', 'max-zoom');
coreSource = replaceRequired(coreSource, "  function computeLod() {\n    if (state.zoom < 1.05) return 'city';\n    if (state.zoom < 2.2) return 'region';\n    return 'detail';\n  }", "  function computeLod() {\n    if (state.zoom < .85) return 'city';\n    if (state.zoom < 1.22) return 'region';\n    return 'detail';\n  }", 'lod');
coreSource = replaceRequired(coreSource, '    state.zoom = next;\n    state.minZoom = next * .72;', '    state.zoom = Math.min(state.maxZoom, next);\n    state.minZoom = Math.min(state.zoom, state.zoom * .72);', 'fit-clamp');
coreSource = replaceRequired(coreSource, '  function focusPoint(x, y, zoom = Math.max(state.zoom, 2.45), remember = true) {', '  function focusPoint(x, y, zoom = state.maxZoom, remember = true) {', 'focus-default');
coreSource = replaceRequired(coreSource, '    state.zoom = Math.max(1.2, Math.min(2.05, Math.min(rect.width / bounds.width, rect.height / bounds.height) * .84));', '    state.zoom = Math.min(state.maxZoom, Math.max(1.05, Math.min(1.35, Math.min(rect.width / bounds.width, rect.height / bounds.height) * .84)));', 'region-focus');

const anchorInjection = `  const __finalMarkerAnchors = ${literal(finalAnchors)};
  const __finalRenderModes = ${literal(renderModes)};
  const __finalCaseAnchors = ${literal(caseAnchors)};
  DATA.coordinates.forEach((item) => {
    item.accessAnchor = { x: item.x, y: item.y };
    const anchor = __finalMarkerAnchors[item.id] || item.visualCenter || { x: item.x, y: item.y };
    item.markerAnchor = { x: Number(anchor.x), y: Number(anchor.y) };
    item.renderMode = __finalRenderModes[item.id] || 'point';
  });
  DATA.cases.forEach((item) => {
    const anchor = __finalCaseAnchors[item.id] || { x: item.x, y: item.y };
    item.markerAnchor = { x: Number(anchor.x), y: Number(anchor.y) };
  });

`;
coreSource = replaceRequired(coreSource, "  const viewport = root.getElementById('map-viewport');", `${anchorInjection}  const viewport = root.getElementById('map-viewport');`, 'anchor-injection');
coreSource = replaceRequired(coreSource, '      pin.dataset.id = item.id;\n      pin.style.left = `${item.x}px`;\n      pin.style.top = `${item.y}px`;', "      pin.dataset.id = item.id;\n      pin.dataset.renderMode = item.renderMode || 'point';\n      const markerAnchor = item.markerAnchor || { x: item.x, y: item.y };\n      pin.style.left = `${markerAnchor.x}px`;\n      pin.style.top = `${markerAnchor.y}px`;", 'location-pin-anchor');
coreSource = replaceRequired(coreSource, "      const placement = placementIndex.get(item.id);\n      const labelItem = placement ? {\n        ...item,\n        labelX: placement.box?.x ?? placement.x + 8,\n        labelY: placement.box ? placement.box.y + placement.box.height / 2 : placement.y,\n        fontSize: placement.fontSize\n      } : { ...item, labelX: item.x + 9, labelY: item.y - 8 };", "      const placement = placementIndex.get(item.id);\n      const legacyLabelX = placement ? (placement.box?.x ?? placement.x + 8) : item.x + 9;\n      const legacyLabelY = placement ? (placement.box ? placement.box.y + placement.box.height / 2 : placement.y) : item.y - 8;\n      const labelItem = {\n        ...item,\n        labelX: markerAnchor.x + (legacyLabelX - item.x),\n        labelY: markerAnchor.y + (legacyLabelY - item.y),\n        fontSize: placement?.fontSize\n      };", 'label-relative-anchor');
coreSource = replaceRequired(coreSource, '      pin.dataset.id = item.id;\n      pin.textContent = item.no;\n      pin.style.left = `${item.x}px`;\n      pin.style.top = `${item.y}px`;', "      pin.dataset.id = item.id;\n      pin.textContent = item.no;\n      const markerAnchor = item.markerAnchor || { x: item.x, y: item.y };\n      pin.style.left = `${markerAnchor.x}px`;\n      pin.style.top = `${markerAnchor.y}px`;", 'case-pin-anchor');
coreSource = replaceRequired(coreSource, "    if (focus) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);", "    if (focus) {\n      const anchor = item.markerAnchor || { x: item.x, y: item.y };\n      focusPoint(anchor.x, anchor.y, state.maxZoom);\n    }", 'node-focus-anchor');
coreSource = replaceRequired(coreSource, "        if (item) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);", "        if (item) {\n          const anchor = item.markerAnchor || { x: item.x, y: item.y };\n          focusPoint(anchor.x, anchor.y, state.maxZoom);\n        }", 'panel-focus-anchor');

try {
  Function(`${coreSource}\n//# sourceURL=shiomi-map-v2.0.2-core.js`)();
} catch (error) {
  console.error('[ShiomiMap v2.0.2] core execution failed', error);
  throw error;
}

let markerSource = await fetchText(markerLayerUrl);
markerSource = replaceRequired(markerSource, "const VERSION = '2.0.1-svg-marker-layer';", `const VERSION = ${literal(`${VERSION}-svg`)};`, 'svg-version');
markerSource = replaceRequired(markerSource, 'const moduleUrl = new URL(import.meta.url);', `const moduleUrl = new URL(${literal(markerLayerUrl.href)});`, 'svg-module-url');
markerSource = replaceRequired(markerSource, 'await import(baseModuleUrl.href);', '// v2.0.2 core is already running; do not import v2.0.0 again.', 'svg-base-import');
markerSource = replaceRequired(markerSource, '    const visual = item.visualCenter || { x: item.x, y: item.y };', "    const visual = hostWin.__SHIOMI_FINAL_MARKER_ANCHORS__?.[item.id] || item.visualCenter || { x: item.x, y: item.y };", 'svg-final-anchor');
markerSource = replaceRequired(markerSource, '    shiftLabels(root, item, dx, dy);', '    // Labels were already rebuilt relative to final markerAnchor by the v2.0.2 core.', 'svg-label-shift');
markerSource = markerSource.replaceAll("markerAnchorMode = 'visualCenter'", "markerAnchorMode = 'finalMasterV7'");

try {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction(`${markerSource}\n//# sourceURL=shiomi-map-v2.0.2-svg.js`)();
} catch (error) {
  console.error('[ShiomiMap v2.0.2] SVG layer execution failed', error);
  throw error;
}

const waitStarted = performance.now();
while (performance.now() - waitStarted < 9000 && !hostWin.ShiomiMap?.getState) {
  await new Promise(resolve => hostWin.setTimeout(resolve, 40));
}

const mapHost = hostDoc.getElementById('shiomi-map-host');
const mapRoot = mapHost?.shadowRoot || mapHost;
if (mapRoot) {
  if (!mapRoot.querySelector('#shiomi-v202-final-style')) {
    const style = hostDoc.createElement('style');
    style.id = 'shiomi-v202-final-style';
    style.textContent = `.pin[data-render-mode="linear-label"]{display:none!important}.map-label{text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}`;
    mapRoot.append(style);
  }
  mapRoot.querySelectorAll('.pin.coordinate[data-id]').forEach(pin => {
    pin.dataset.renderMode = renderModes[pin.dataset.id] || 'point';
  });
}

for (const api of new Set([hostWin.ShiomiMap, localWin.ShiomiMap].filter(Boolean))) {
  try {
    api.version = VERSION;
    api.coreVersion = VERSION;
    api.markerLayerVersion = `${VERSION}-svg`;
    api.markerAnchorMode = 'finalMasterV7';
    api.maxVisualScale = 1.5;
    api.anchorDataVersion = anchorData.version;
  } catch (_) {}
}

try {
  hostWin.dispatchEvent(new hostWin.CustomEvent('shiomi-map:v2.0.2-ready', {
    detail: { version: VERSION, maxZoom: 1.5, locations: anchorData.locations?.length || 0, anchorDataVersion: anchorData.version }
  }));
} catch (_) {}
