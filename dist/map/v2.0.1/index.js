const VERSION = '2.0.1-svg-marker-layer';
const localWin = window;
const hostWin = (() => {
  try { return window.parent?.document ? window.parent : window; } catch (_) { return window; }
})();
const hostDoc = hostWin.document;
const moduleUrl = new URL(import.meta.url);

const baseModuleUrl = new URL('../v2.0.0/index.js', moduleUrl);
for (const [key, value] of moduleUrl.searchParams) baseModuleUrl.searchParams.set(key, value);
baseModuleUrl.searchParams.set('svg_marker_layer', VERSION);

await import(baseModuleUrl.href);

const runtimeUrl = new URL('../v2.0.0/data/shiomi-runtime-data.v2.json', moduleUrl);

const ICON_BY_CATEGORY = {
  food: 'food',
  bath: 'bath',
  shop: 'shop',
  service: 'service',
  medical: 'medical',
  residence: 'residence',
  market: 'market',
  community: 'community',
  station: 'station',
  police: 'police',
  government: 'government',
  commercial: 'commercial',
  hospital: 'hospital',
  office: 'office',
  hotel: 'hotel',
  school: 'school',
  temple: 'temple',
  cemetery: 'cemetery',
  university: 'university',
  park: 'park',
  nightlife: 'nightlife',
  bar: 'bar',
  transport: 'transport',
  port: 'port',
  warehouse: 'warehouse',
  industrial: 'industrial',
  casino: 'casino',
  station_exit: 'station-exit',
  water: 'water',
  bridge: 'bridge',
  airship: 'airship',
  shrine: 'shrine'
};

const FAMILY_BY_ICON = {
  station: 'transit', 'station-exit': 'transit', bridge: 'transit', transport: 'transit', airship: 'transit',
  police: 'civic', government: 'civic', hospital: 'civic', medical: 'civic',
  school: 'education', university: 'education',
  market: 'commerce', commercial: 'commerce', shop: 'commerce', service: 'commerce', office: 'commerce',
  food: 'hospitality', bath: 'hospitality', hotel: 'hospitality',
  residence: 'residence',
  shrine: 'culture', temple: 'culture', cemetery: 'culture', community: 'culture',
  nightlife: 'leisure', bar: 'leisure', casino: 'leisure',
  park: 'nature', water: 'nature',
  port: 'industry', warehouse: 'industry', industrial: 'industry'
};

function iconKey(item) {
  if (item.id === 'south_exit_taxi') return 'transport';
  return ICON_BY_CATEGORY[item.category] || ICON_BY_CATEGORY[item.kind] || 'shop';
}

function markerDefsMarkup() {
  return `
  <svg class="shiomi-marker-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <symbol id="sm-station" viewBox="0 0 32 32">
        <path d="M8.5 6.5h15v15h-15z"/>
        <path d="M11 10h10M11 14h10M12 21.5l-2.8 4M20 21.5l2.8 4M10.5 25.5h11"/>
        <circle cx="12" cy="18" r="1.2"/><circle cx="20" cy="18" r="1.2"/>
      </symbol>
      <symbol id="sm-station-exit" viewBox="0 0 32 32">
        <path d="M8 7h11v18H8zM19 16h7M22.5 12.5 26 16l-3.5 3.5"/>
        <path d="M12 11v10"/>
      </symbol>
      <symbol id="sm-bridge" viewBox="0 0 32 32">
        <path d="M5 21h22M7 21c1.5-7 5.2-10 9-10s7.5 3 9 10M9 16h14"/>
        <path d="M10 21v4M22 21v4"/>
      </symbol>
      <symbol id="sm-transport" viewBox="0 0 32 32">
        <path d="M8 20.5h16l-1.6-7H9.6zM10.5 13.5l2-4h7l2 4"/>
        <circle cx="11.5" cy="22" r="1.5"/><circle cx="20.5" cy="22" r="1.5"/>
        <path d="M13 17h6"/>
      </symbol>
      <symbol id="sm-airship" viewBox="0 0 32 32">
        <path d="M5 15.5c3.5-5 18.5-5 22 0-3.5 5-18.5 5-22 0Z"/>
        <path d="M9 15.5h14M15 20.5v3M18 20.5v3M13 23.5h7M8 12l-2-3M24 12l2-3"/>
      </symbol>

      <symbol id="sm-police" viewBox="0 0 32 32">
        <path d="M16 5.5 24 9v6.7c0 5.3-3.2 8.6-8 10.8-4.8-2.2-8-5.5-8-10.8V9z"/>
        <path d="m16 10 1.5 3.2 3.5.4-2.6 2.4.7 3.5-3.1-1.7-3.1 1.7.7-3.5-2.6-2.4 3.5-.4z"/>
      </symbol>
      <symbol id="sm-government" viewBox="0 0 32 32">
        <path d="m6 12 10-6 10 6M8 13h16M9.5 14.5v8M14 14.5v8M18 14.5v8M22.5 14.5v8M7 24h18M5.5 26h21"/>
      </symbol>
      <symbol id="sm-hospital" viewBox="0 0 32 32">
        <path d="M8 7h16v18H8z"/>
        <path d="M14 10.5h4v4h4v4h-4v4h-4v-4h-4v-4h4z"/>
      </symbol>
      <symbol id="sm-medical" viewBox="0 0 32 32">
        <path d="M16 6.5 25.5 16 16 25.5 6.5 16z"/>
        <path d="M14 11h4v3h3v4h-3v3h-4v-3h-3v-4h3z"/>
      </symbol>

      <symbol id="sm-school" viewBox="0 0 32 32">
        <path d="M6.5 9.5 16 6l9.5 3.5V24H6.5z"/>
        <path d="M11 13h3M18 13h3M11 17h3M18 17h3M14 24v-4h4v4"/>
      </symbol>
      <symbol id="sm-university" viewBox="0 0 32 32">
        <path d="m5.5 12 10.5-6 10.5 6M7 13h18M9 14.5v8M14 14.5v8M18 14.5v8M23 14.5v8M7 24h18"/>
        <circle cx="16" cy="10" r="1.5"/>
      </symbol>

      <symbol id="sm-market" viewBox="0 0 32 32">
        <path d="M7 12h18l-2-5H9zM8.5 14.5V25h15V14.5"/>
        <path d="M7 12c0 2 2 3 4 1.2C13 15 15 15 16 13.2 17 15 19 15 21 13.2 23 15 25 14 25 12"/>
        <path d="M12 18h8M12 21h8"/>
      </symbol>
      <symbol id="sm-commercial" viewBox="0 0 32 32">
        <path d="M7 8h18v17H7zM10 11h12M10 15h12M10 19h12"/>
        <path d="M12 25v-3h8v3"/>
      </symbol>
      <symbol id="sm-shop" viewBox="0 0 32 32">
        <path d="M8 13h16v12H8zM7 13l2-6h14l2 6"/>
        <path d="M7 13c0 2 2 3 4 1 2 2 4 1 5-1 1 2 3 3 5 1 2 2 4 1 4-1M12 18h8"/>
      </symbol>
      <symbol id="sm-service" viewBox="0 0 32 32">
        <path d="M8 8h16v16H8zM11 11h10v10H11z"/>
        <path d="m13 18 6-6M13 12l6 6"/>
      </symbol>
      <symbol id="sm-office" viewBox="0 0 32 32">
        <path d="M9 6.5h11l4 4V25H9zM20 6.5v5h4"/>
        <path d="M12 15h9M12 19h9M12 22h6"/>
      </symbol>

      <symbol id="sm-food" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="8.5"/>
        <path d="M11 12v8M13 12v8M11 15h2M21 12v8M19 12c0 3 4 3 4 0"/>
      </symbol>
      <symbol id="sm-bath" viewBox="0 0 32 32">
        <path d="M7 18h18v4c0 2-1.5 3-3 3H10c-1.5 0-3-1-3-3z"/>
        <path d="M10 15c-2-2 2-3 0-5M16 15c-2-2 2-3 0-5M22 15c-2-2 2-3 0-5"/>
      </symbol>
      <symbol id="sm-hotel" viewBox="0 0 32 32">
        <path d="M8 8h16v17H8zM11 12h10M11 16h10M11 20h5"/>
        <circle cx="20" cy="21" r="1"/>
      </symbol>
      <symbol id="sm-residence" viewBox="0 0 32 32">
        <path d="m6.5 14 9.5-7 9.5 7V25h-19z"/>
        <path d="M13 25v-7h6v7M10 14h3M19 14h3"/>
      </symbol>

      <symbol id="sm-shrine" viewBox="0 0 32 32">
        <path d="M7 9h18M9 7h14M11 10.5v14M21 10.5v14M8.5 14h15"/>
        <path d="M6 25h20"/>
      </symbol>
      <symbol id="sm-temple" viewBox="0 0 32 32">
        <path d="M7 13h18L16 6zM9 14.5h14V25H9zM12 18h8M13 25v-6h6v6"/>
      </symbol>
      <symbol id="sm-cemetery" viewBox="0 0 32 32">
        <path d="M12 7h8l2 16H10zM8 24h16M6 27h20"/>
        <path d="M13 12h6M14 16h4"/>
      </symbol>
      <symbol id="sm-community" viewBox="0 0 32 32">
        <path d="M7 10h18v15H7zM10 7h12v3M10 14h12M13 18h6M14 25v-5h4v5"/>
      </symbol>

      <symbol id="sm-park" viewBox="0 0 32 32">
        <path d="M16 25v-8"/>
        <path d="M16 18c-5 0-8-3-8-7 5 0 8 2 8 7ZM16 18c5 0 8-3 8-7-5 0-8 2-8 7Z"/>
        <path d="M11 25h10"/>
      </symbol>
      <symbol id="sm-water" viewBox="0 0 32 32">
        <path d="M5 12c3 0 3 2 6 2s3-2 6-2 3 2 6 2 3-2 4-2M5 18c3 0 3 2 6 2s3-2 6-2 3 2 6 2 3-2 4-2"/>
      </symbol>

      <symbol id="sm-nightlife" viewBox="0 0 32 32">
        <path d="M8 7h16v18H8zM11 11c2.5 2.5 7.5 2.5 10 0M11 21c2.5-2.5 7.5-2.5 10 0"/>
        <circle cx="13" cy="15.5" r="1"/><circle cx="19" cy="15.5" r="1"/>
      </symbol>
      <symbol id="sm-bar" viewBox="0 0 32 32">
        <path d="m10 7 12 0-2 7c-.7 2.5-2 4-4 4s-3.3-1.5-4-4zM16 18v6M12 25h8"/>
        <path d="M12 10h8"/>
      </symbol>
      <symbol id="sm-casino" viewBox="0 0 32 32">
        <path d="M16 5.5 26.5 16 16 26.5 5.5 16z"/>
        <circle cx="16" cy="16" r="5"/>
        <circle cx="16" cy="11" r=".8"/><circle cx="21" cy="16" r=".8"/><circle cx="16" cy="21" r=".8"/><circle cx="11" cy="16" r=".8"/>
      </symbol>

      <symbol id="sm-port" viewBox="0 0 32 32">
        <path d="M16 6v15M12 9h8M8 16c0 6 3 10 8 10s8-4 8-10M8 16h5M19 16h5"/>
        <path d="M13 26h6"/>
      </symbol>
      <symbol id="sm-warehouse" viewBox="0 0 32 32">
        <path d="M6.5 11 16 6l9.5 5v14h-19zM10 15h12M10 19h12M10 23h12"/>
      </symbol>
      <symbol id="sm-industrial" viewBox="0 0 32 32">
        <path d="M7 25V14l6 3v-6l6 4V9h6v16z"/>
        <path d="M10 21h3M16 21h3M22 21h2"/>
      </symbol>

      <symbol id="sm-case" viewBox="0 0 32 32">
        <path d="M9 7h14v18H9zM12 11h8M12 15h8M12 19h5"/>
        <path d="M7 10V5h5"/>
      </symbol>
    </defs>
  </svg>`;
}

const STYLE = `
  .shiomi-marker-defs{position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;pointer-events:none!important}

  .pin.svg-marker{
    --marker-ink:#26302e;
    --marker-paper:rgba(241,235,222,.96);
    --marker-accent:#7d6b4e;
    --marker-ring:rgba(38,48,46,.42);
    width:38px!important;height:38px!important;
    border:0!important;border-radius:0!important;background:transparent!important;
    box-shadow:none!important;clip-path:none!important;padding:0!important;
    display:grid!important;place-items:center!important;
    transform:translate(-50%,-50%) scale(var(--inv-zoom))!important;
    outline:0!important;
    overflow:visible!important;
    -webkit-tap-highlight-color:transparent;
  }
  .pin.svg-marker::after{display:none!important}
  .pin.svg-marker.anchor{background:transparent!important;border-radius:0!important;transform:translate(-50%,-50%) scale(var(--inv-zoom))!important}
  .pin.svg-marker .marker-plate{
    position:relative;width:25px;height:25px;display:grid;place-items:center;
    color:var(--marker-ink);
    background:linear-gradient(145deg,rgba(248,244,234,.98),rgba(222,213,196,.96));
    border:1px solid rgba(43,54,51,.66);
    box-shadow:0 1px 0 rgba(255,255,255,.72) inset,0 2px 7px rgba(26,34,32,.17);
    transition:transform .16s ease,border-color .16s ease,background .16s ease,color .16s ease,box-shadow .16s ease;
  }
  .pin.svg-marker .marker-plate::before{
    content:"";position:absolute;inset:2px;border:1px solid rgba(43,54,51,.14);pointer-events:none
  }
  .pin.svg-marker .marker-icon{width:17px;height:17px;display:block;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}
  .pin.svg-marker.marker-family-transit .marker-plate,
  .pin.svg-marker.marker-family-civic .marker-plate,
  .pin.svg-marker.marker-family-education .marker-plate,
  .pin.svg-marker.marker-family-industry .marker-plate{
    transform:rotate(45deg);border-radius:2px
  }
  .pin.svg-marker.marker-family-transit .marker-icon,
  .pin.svg-marker.marker-family-civic .marker-icon,
  .pin.svg-marker.marker-family-education .marker-icon,
  .pin.svg-marker.marker-family-industry .marker-icon{transform:rotate(-45deg)}
  .pin.svg-marker.marker-family-culture .marker-plate{
    border-radius:50% 50% 3px 3px;
    background:linear-gradient(150deg,rgba(246,240,226,.98),rgba(217,207,188,.96))
  }
  .pin.svg-marker.marker-family-hospitality .marker-plate{border-radius:50%}
  .pin.svg-marker.marker-family-leisure .marker-plate{border-radius:3px;transform:rotate(45deg)}
  .pin.svg-marker.marker-family-leisure .marker-icon{transform:rotate(-45deg)}
  .pin.svg-marker.marker-family-nature .marker-plate{border-radius:50% 50% 45% 45%}
  .pin.svg-marker.marker-major .marker-plate{width:28px;height:28px;border-color:rgba(35,47,44,.82)}
  .pin.svg-marker.marker-major .marker-icon{width:18px;height:18px}
  .pin.svg-marker.marker-family-transit{--marker-accent:#5f7978}
  .pin.svg-marker.marker-family-civic{--marker-accent:#596c70}
  .pin.svg-marker.marker-family-education{--marker-accent:#6a715d}
  .pin.svg-marker.marker-family-commerce{--marker-accent:#8a6d4e}
  .pin.svg-marker.marker-family-hospitality{--marker-accent:#8b624d}
  .pin.svg-marker.marker-family-residence{--marker-accent:#6d756b}
  .pin.svg-marker.marker-family-culture{--marker-accent:#80664f}
  .pin.svg-marker.marker-family-leisure{--marker-accent:#755f72}
  .pin.svg-marker.marker-family-nature{--marker-accent:#5f7869}
  .pin.svg-marker.marker-family-industry{--marker-accent:#586d70}

  .pin.svg-marker.selected .marker-plate,
  .pin.svg-marker:focus-visible .marker-plate{
    color:#242b29;border-color:var(--marker-accent);
    background:linear-gradient(145deg,#f5ead7,#d9c39d);
    box-shadow:0 0 0 2px rgba(244,237,223,.88),0 0 0 4px color-mix(in srgb,var(--marker-accent) 68%,transparent),0 5px 13px rgba(24,31,29,.22)
  }
  .pin.svg-marker.selected .marker-plate{transform:scale(1.06)}
  .pin.svg-marker.marker-family-transit.selected .marker-plate,
  .pin.svg-marker.marker-family-civic.selected .marker-plate,
  .pin.svg-marker.marker-family-education.selected .marker-plate,
  .pin.svg-marker.marker-family-industry.selected .marker-plate,
  .pin.svg-marker.marker-family-leisure.selected .marker-plate{transform:rotate(45deg) scale(1.06)}
  @media (hover:hover) and (pointer:fine){
    .pin.svg-marker:hover .marker-plate{
      color:#222a28;border-color:var(--marker-accent);
      background:linear-gradient(145deg,#f8efe0,#dfccb0);
      box-shadow:0 0 0 2px rgba(245,238,225,.75),0 5px 12px rgba(24,31,29,.2)
    }
  }

  .pin.case.svg-marker{
    width:42px!important;height:42px!important;color:#f4ecdf!important;font:inherit!important
  }
  .pin.case.svg-marker .marker-plate{
    width:29px;height:29px;border-radius:2px!important;
    transform:rotate(45deg)!important;
    color:#f5ecdf;background:linear-gradient(145deg,#765048,#513b37);
    border-color:#e8dcc7
  }
  .pin.case.svg-marker .marker-icon{width:17px;height:17px;transform:rotate(-45deg)!important}
  .pin.case.svg-marker .marker-case-number{
    position:absolute;right:-4px;top:-3px;min-width:17px;height:17px;padding:0 3px;
    display:grid;place-items:center;border:1px solid rgba(239,226,204,.9);
    background:#2e3533;color:#f1e6d2;
    font:700 7px/1 "Cormorant Garamond",Georgia,serif;letter-spacing:.04em;
    box-shadow:0 2px 5px rgba(20,26,25,.25)
  }

  .map-label{
    color:#313733!important;
    text-shadow:0 1px 0 rgba(251,248,239,.98),0 0 5px rgba(247,242,230,.94),0 0 9px rgba(247,242,230,.72)!important;
    font-family:"Songti SC","STSong","Noto Serif CJK SC","Noto Serif SC",serif!important;
    font-weight:600!important;
    letter-spacing:.055em!important;
    isolation:isolate;
  }
  .map-label.city-label{
    font-size:16px!important;font-weight:650!important;letter-spacing:.13em!important;
    color:rgba(41,49,46,.92)!important
  }
  .map-label.city-minor{font-size:11.5px!important;font-weight:560!important;opacity:.7!important}
  .map-label.regional-label{
    font-size:9.8px!important;font-weight:580!important;
    padding:1px 3px 2px;
    background:linear-gradient(90deg,transparent,rgba(241,236,224,.62) 12%,rgba(241,236,224,.74) 50%,rgba(241,236,224,.62) 88%,transparent);
    border-radius:1px
  }
  .map-label.regional-label.major{
    font-size:11.2px!important;font-weight:650!important;letter-spacing:.075em!important
  }
  .map-label.svg-selected-label{
    color:#5f4933!important;
    text-shadow:0 1px 0 #fff8e9,0 0 5px rgba(250,241,218,.98),0 0 10px rgba(192,157,104,.38)!important
  }
  @media (max-width:900px){
    .pin.svg-marker{width:42px!important;height:42px!important}
    .pin.svg-marker .marker-plate{width:25px;height:25px}
    .pin.svg-marker.marker-major .marker-plate{width:27px;height:27px}
    .map-label.regional-label{font-size:9.5px!important}
    .map-label.regional-label.major{font-size:10.6px!important}
    .map-label.city-label{font-size:14.5px!important}
  }
`;

function makeSvg(icon) {
  return `<span class="marker-plate" aria-hidden="true"><svg class="marker-icon" viewBox="0 0 32 32"><use href="#sm-${icon}"></use></svg></span>`;
}

async function waitForMap() {
  const started = performance.now();
  while (performance.now() - started < 8000) {
    const host = hostDoc.getElementById('shiomi-map-host');
    const root = host?.shadowRoot || host;
    if (root?.querySelector?.('.world-layer') && root.querySelectorAll('.pin.coordinate').length) return { host, root };
    await new Promise(resolve => hostWin.setTimeout(resolve, 40));
  }
  return null;
}

function shiftLabels(root, item, dx, dy) {
  if (!dx && !dy) return;
  root.querySelectorAll(`.map-label[data-id="${CSS.escape(item.id)}"]`).forEach(label => {
    if (label.dataset.svgCalibrated === VERSION) return;
    const left = parseFloat(label.style.left || '0');
    const top = parseFloat(label.style.top || '0');
    if (Number.isFinite(left)) label.style.left = `${left + dx}px`;
    if (Number.isFinite(top)) label.style.top = `${top + dy}px`;
    label.dataset.svgCalibrated = VERSION;
  });
}

function syncSelectedLabels(root) {
  root.querySelectorAll('.map-label.svg-selected-label').forEach(label => label.classList.remove('svg-selected-label'));
  const selected = root.querySelector('.pin.coordinate.selected');
  if (!selected?.dataset.id) return;
  root.querySelectorAll(`.map-label[data-id="${CSS.escape(selected.dataset.id)}"]`).forEach(label => label.classList.add('svg-selected-label'));
}

async function installMarkerLayer() {
  let data;
  try {
    const response = await fetch(runtimeUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`runtime HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    console.error('[ShiomiMap SVG markers] runtime data failed', error);
    return;
  }

  const map = await waitForMap();
  if (!map) {
    console.error('[ShiomiMap SVG markers] map host not ready');
    return;
  }
  const { root } = map;

  if (!root.querySelector('.shiomi-marker-defs')) {
    const template = hostDoc.createElement('template');
    template.innerHTML = markerDefsMarkup().trim();
    root.prepend(template.content.cloneNode(true));
  }

  if (!root.querySelector('#shiomi-svg-marker-style')) {
    const style = hostDoc.createElement('style');
    style.id = 'shiomi-svg-marker-style';
    style.textContent = STYLE;
    root.append(style);
  }

  data.coordinates.forEach(item => {
    const pin = root.querySelector(`.pin.coordinate[data-id="${CSS.escape(item.id)}"]`);
    if (!pin) return;

    const visual = item.visualCenter || { x: item.x, y: item.y };
    const dx = Number(visual.x) - Number(item.x);
    const dy = Number(visual.y) - Number(item.y);

    pin.style.left = `${visual.x}px`;
    pin.style.top = `${visual.y}px`;

    const icon = iconKey(item);
    const family = FAMILY_BY_ICON[icon] || 'commerce';
    pin.classList.add('svg-marker', `marker-family-${family}`, `marker-icon-${icon}`);
    if (item.major || item.kind === 'anchor') pin.classList.add('marker-major');
    pin.dataset.markerAnchor = `${visual.x},${visual.y}`;
    pin.dataset.accessAnchor = `${item.x},${item.y}`;
    pin.dataset.icon = icon;
    pin.innerHTML = makeSvg(icon);

    shiftLabels(root, item, dx, dy);
  });

  root.querySelectorAll('.pin.case').forEach(pin => {
    if (pin.classList.contains('svg-marker')) return;
    const number = pin.textContent.trim();
    pin.classList.add('svg-marker', 'marker-family-case');
    pin.innerHTML = `${makeSvg('case')}<span class="marker-case-number">${number}</span>`;
  });

  syncSelectedLabels(root);

  const world = root.querySelector('.world-layer');
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation =>
      mutation.type === 'attributes' &&
      mutation.attributeName === 'class' &&
      mutation.target instanceof Element &&
      mutation.target.matches?.('.pin.coordinate')
    )) {
      syncSelectedLabels(root);
    }
  });
  observer.observe(world, { subtree: true, attributes: true, attributeFilter: ['class'] });

  try {
    if (hostWin.ShiomiMap) {
      hostWin.ShiomiMap.markerLayerVersion = VERSION;
      hostWin.ShiomiMap.markerAnchorMode = 'visualCenter';
    }
    if (localWin !== hostWin && localWin.ShiomiMap) {
      localWin.ShiomiMap.markerLayerVersion = VERSION;
      localWin.ShiomiMap.markerAnchorMode = 'visualCenter';
    }
  } catch (_) {}

  try {
    hostWin.dispatchEvent(new hostWin.CustomEvent('shiomi-map:marker-layer-ready', {
      detail: { version: VERSION, locations: data.coordinates.length, anchorMode: 'visualCenter' }
    }));
  } catch (_) {}
}

await installMarkerLayer();
