const VERSION = '2.0.2-final-master-identity-r2';
const localWin = window;
const hostWin = (() => {
  try { return window.parent?.document ? window.parent : window; } catch (_) { return window; }
})();
const hostDoc = hostWin.document;
const moduleUrl = new URL(import.meta.url);

const coreUrl = new URL('../v2.0.0/index.js', moduleUrl);
const markerLayerUrl = new URL('../v2.0.1/index.js', moduleUrl);
const anchorDataUrl = new URL('./data/marker-anchors.v3.2-identity-audit.json', moduleUrl);
const coreBaseUrl = new URL('../v2.0.0/', moduleUrl);

for (const [key, value] of moduleUrl.searchParams) {
  coreUrl.searchParams.set(key, value);
  markerLayerUrl.searchParams.set(key, value);
  anchorDataUrl.searchParams.set(key, value);
}
coreUrl.searchParams.set('core_patch', VERSION);
markerLayerUrl.searchParams.set('marker_patch', VERSION);
anchorDataUrl.searchParams.set('anchor_patch', VERSION);

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url.pathname}: HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
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
const finalDescriptions = Object.fromEntries(
  (anchorData.locations || []).filter(item => item.description).map(item => [item.id, String(item.description)])
);
const caseAnchors = Object.fromEntries(
  (anchorData.caseOverrides || []).map(item => [item.id, { x: Number(item.x), y: Number(item.y) }])
);

hostWin.__SHIOMI_FINAL_MARKER_ANCHORS__ = finalAnchors;
hostWin.__SHIOMI_RENDER_MODES__ = renderModes;
hostWin.__SHIOMI_MAP_DESCRIPTIONS__ = finalDescriptions;
if (localWin !== hostWin) {
  localWin.__SHIOMI_FINAL_MARKER_ANCHORS__ = finalAnchors;
  localWin.__SHIOMI_RENDER_MODES__ = renderModes;
  localWin.__SHIOMI_MAP_DESCRIPTIONS__ = finalDescriptions;
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
  const __finalDescriptions = ${literal(finalDescriptions)};
  const __finalCaseAnchors = ${literal(caseAnchors)};
  const __overviewBridgeIds = {
    'bridge-鹤见桥': 'tsurumi_bridge',
    'bridge-白鹭桥': 'shirasagi_bridge',
    'bridge-海门桥': 'kaimon_bridge'
  };
  DATA.coordinates.forEach((item) => {
    item.accessAnchor = { x: item.x, y: item.y };
    const anchor = __finalMarkerAnchors[item.id] || item.visualCenter || { x: item.x, y: item.y };
    item.markerAnchor = { x: Number(anchor.x), y: Number(anchor.y) };
    item.renderMode = __finalRenderModes[item.id] || 'point';
    if (__finalDescriptions[item.id]) item.description = __finalDescriptions[item.id];
  });
  DATA.cases.forEach((item) => {
    const anchor = __finalCaseAnchors[item.id] || { x: item.x, y: item.y };
    item.markerAnchor = { x: Number(anchor.x), y: Number(anchor.y) };
  });
  (LABELS.overview || []).forEach((label) => {
    const locationId = __overviewBridgeIds[label.id] || label.id;
    const anchor = __finalMarkerAnchors[locationId];
    if (!anchor) return;
    const oldX = Number(label.x ?? anchor.x);
    const oldY = Number(label.y ?? anchor.y);
    const oldLabelX = Number(label.labelX ?? oldX);
    const oldLabelY = Number(label.labelY ?? oldY);
    label.x = Number(anchor.x);
    label.y = Number(anchor.y);
    label.labelX = Number(anchor.x) + (oldLabelX - oldX);
    label.labelY = Number(anchor.y) + (oldLabelY - oldY);
  });

`;
coreSource = replaceRequired(coreSource, "  const viewport = root.getElementById('map-viewport');", `${anchorInjection}  const viewport = root.getElementById('map-viewport');`, 'anchor-injection');

coreSource = replaceRequired(coreSource, '      pin.dataset.id = item.id;\n      pin.style.left = `${item.x}px`;\n      pin.style.top = `${item.y}px`;', "      pin.dataset.id = item.id;\n      pin.dataset.renderMode = item.renderMode || 'point';\n      const markerAnchor = item.markerAnchor || { x: item.x, y: item.y };\n      pin.style.left = `${markerAnchor.x}px`;\n      pin.style.top = `${markerAnchor.y}px`;", 'location-pin-anchor');

coreSource = replaceRequired(coreSource, "      const placement = placementIndex.get(item.id);\n      const labelItem = placement ? {\n        ...item,\n        labelX: placement.box?.x ?? placement.x + 8,\n        labelY: placement.box ? placement.box.y + placement.box.height / 2 : placement.y,\n        fontSize: placement.fontSize\n      } : { ...item, labelX: item.x + 9, labelY: item.y - 8 };", "      const placement = placementIndex.get(item.id);\n      const legacyLabelX = placement ? (placement.box?.x ?? placement.x + 8) : item.x + 9;\n      const legacyLabelY = placement ? (placement.box ? placement.box.y + placement.box.height / 2 : placement.y) : item.y - 8;\n      const labelItem = {\n        ...item,\n        labelX: markerAnchor.x + (legacyLabelX - item.x),\n        labelY: markerAnchor.y + (legacyLabelY - item.y),\n        fontSize: placement?.fontSize\n      };", 'label-relative-anchor');

coreSource = replaceRequired(coreSource, '      pin.dataset.id = item.id;\n      pin.textContent = item.no;\n      pin.style.left = `${item.x}px`;\n      pin.style.top = `${item.y}px`;', "      pin.dataset.id = item.id;\n      pin.textContent = item.no;\n      const markerAnchor = item.markerAnchor || { x: item.x, y: item.y };\n      pin.style.left = `${markerAnchor.x}px`;\n      pin.style.top = `${markerAnchor.y}px`;", 'case-pin-anchor');

coreSource = replaceRequired(coreSource, "    if (focus) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);", "    if (focus) {\n      const anchor = item.markerAnchor || { x: item.x, y: item.y };\n      focusPoint(anchor.x, anchor.y, state.maxZoom);\n    }", 'node-focus-anchor');

coreSource = replaceRequired(coreSource, "        if (item) focusPoint(item.x, item.y, item.kind === 'case' ? 2.7 : 2.45);", "        if (item) {\n          const anchor = item.markerAnchor || { x: item.x, y: item.y };\n          focusPoint(anchor.x, anchor.y, state.maxZoom);\n        }", 'panel-focus-anchor');

coreSource = replaceRequired(
  coreSource,
  "    const code = isCase ? item.no : String([...nodeIndex.keys()].indexOf(item.id) + 1).padStart(2, '0');\n    return `<div class=\"panel-kicker\">${kicker}</div>",
  "    const code = isCase ? item.no : String([...nodeIndex.keys()].indexOf(item.id) + 1).padStart(2, '0');\n    const displayAnchor = item.markerAnchor || { x: item.x, y: item.y };\n    const accessAnchor = item.accessAnchor || { x: item.x, y: item.y };\n    const hasSeparateAccess = Math.hypot(Number(displayAnchor.x) - Number(accessAnchor.x), Number(displayAnchor.y) - Number(accessAnchor.y)) > .5;\n    return `<div class=\"panel-kicker\">${kicker}</div>",
  'panel-anchor-vars'
);
coreSource = replaceRequired(
  coreSource,
  '      <dt>地图坐标</dt><dd>${Number(item.x).toFixed(1)} / ${Number(item.y).toFixed(1)}</dd>\n      ${parent ? `<dt>父级空间</dt><dd>${escapeHtml(parent)}</dd>` : \'\'}',
  '      <dt>图示坐标</dt><dd>${Number(displayAnchor.x).toFixed(1)} / ${Number(displayAnchor.y).toFixed(1)}</dd>\n      ${hasSeparateAccess ? `<dt>通行坐标</dt><dd>${Number(accessAnchor.x).toFixed(1)} / ${Number(accessAnchor.y).toFixed(1)}</dd>` : \'\'}\n      ${parent ? `<dt>父级空间</dt><dd>${escapeHtml(parent)}</dd>` : \'\'}',
  'panel-coordinate-copy'
);

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
markerSource = markerSource.replaceAll("markerAnchorMode = 'visualCenter'", "markerAnchorMode = 'finalMasterV7IdentityAudit'");

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
    style.textContent = `
      .pin[data-render-mode="linear-label"]{display:none!important}
      .map-label{text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}
      .shiomi-map-panel{overscroll-behavior:contain}
      @media (max-width:900px){
        .shiomi-map-panel .panel-close{
          position:sticky!important;
          float:right!important;
          top:0!important;
          display:grid!important;
          place-items:center!important;
          width:44px!important;
          height:44px!important;
          margin:-10px -10px 10px 12px!important;
          border:1px solid rgba(38,47,46,.28)!important;
          background:rgba(239,234,224,.96)!important;
          color:#182020!important;
          box-shadow:0 5px 14px rgba(8,12,12,.12)!important;
          font-size:25px!important;
          line-height:1!important;
          cursor:pointer!important;
          touch-action:manipulation!important;
        }
      }
    `;
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
    api.markerAnchorMode = 'finalMasterV7IdentityAudit';
    api.maxVisualScale = 1.5;
    api.anchorDataVersion = anchorData.version;
    api.identityAuditVersion = 'v7-final-master-r2';
  } catch (_) {}
}

try {
  hostWin.dispatchEvent(new hostWin.CustomEvent('shiomi-map:v2.0.2-ready', {
    detail: {
      version: VERSION,
      maxZoom: 1.5,
      locations: anchorData.locations?.length || 0,
      anchorDataVersion: anchorData.version,
      identityAudit: true
    }
  }));
} catch (_) {}