// 汐见 AssetManager v0.1
// 负责远程静态资源清单、URL 解析、懒加载与轻量缓存。
(() => {
  'use strict';

  const VERSION = '0.1.0';
  const LOG = '[ShiomiAssets]';
  const DEFAULT_MANIFEST_URL = ''; // 正式部署后写入固定、带版本的 manifest URL。
  const LS_URL = 'SHIOMI_ASSET_MANIFEST_URL_V1';
  const LS_CACHE = 'SHIOMI_ASSET_MANIFEST_CACHE_V1';

  function safeHostWindow() {
    try { if (window.parent && window.parent.document) return window.parent; } catch (_) {}
    return window;
  }

  const localWin = window;
  const hostWin = safeHostWindow();

  const text = value => String(value == null ? '' : value).trim();
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const list = value => Array.isArray(value) ? value : [];

  function storage() {
    try { return hostWin.localStorage || localWin.localStorage || null; } catch (_) { return null; }
  }

  function absoluteUrl(value, base) {
    const raw = text(value);
    if (!raw) return '';
    if (/^(?:data:|blob:|https?:\/\/)/i.test(raw)) return raw;
    try { return new URL(raw, base || hostWin.location?.href || localWin.location?.href).href; }
    catch (_) { return raw; }
  }

  function deepGet(root, path) {
    if (!root || !path) return undefined;
    const parts = Array.isArray(path) ? path : String(path).split('.').filter(Boolean);
    let cur = root;
    for (const part of parts) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  class ShiomiAssetManager {
    constructor() {
      this.version = VERSION;
      this.manifest = null;
      this.manifestUrl = '';
      this.manifestBase = '';
      this.loading = null;
      this.stale = false;
      this.lastError = '';
      this.listeners = new Map();
      this.imagePromises = new Map();
      this.configure({ manifestUrl: this.savedManifestUrl() || DEFAULT_MANIFEST_URL }, false);
    }

    savedManifestUrl() {
      try { return text(storage()?.getItem(LS_URL)); } catch (_) { return ''; }
    }

    configure(options = {}, persist = true) {
      const next = text(options.manifestUrl);
      if (next !== this.manifestUrl) {
        this.manifestUrl = next;
        this.manifest = null;
        this.manifestBase = '';
        this.loading = null;
        this.stale = false;
        this.lastError = '';
      }
      if (persist) {
        try {
          const s = storage();
          if (s) next ? s.setItem(LS_URL, next) : s.removeItem(LS_URL);
        } catch (_) {}
      }
      return this.status();
    }

    setManifestUrl(url) { return this.configure({ manifestUrl: url }, true); }
    isConfigured() { return !!text(this.manifestUrl); }

    on(name, listener) {
      if (typeof listener !== 'function') return () => {};
      const key = text(name) || 'change';
      if (!this.listeners.has(key)) this.listeners.set(key, new Set());
      this.listeners.get(key).add(listener);
      return () => this.listeners.get(key)?.delete(listener);
    }

    emit(name, payload) {
      for (const fn of this.listeners.get(name) || []) {
        try { fn(payload); } catch (error) { console.warn(LOG, '监听器执行失败。', error); }
      }
    }

    validateManifest(raw) {
      const source = object(raw);
      if (source.schema !== 'shiomi_assets_v1') throw new Error('资源清单 schema 必须为 shiomi_assets_v1。');
      if (!text(source.version)) throw new Error('资源清单缺少 version。');
      return {
        schema: source.schema,
        version: text(source.version),
        baseUrl: text(source.baseUrl || './'),
        assets: object(source.assets),
        collections: object(source.collections)
      };
    }

    cachedManifest() {
      try {
        const raw = storage()?.getItem(LS_CACHE);
        if (!raw) return null;
        const box = JSON.parse(raw);
        if (text(box.url) !== text(this.manifestUrl)) return null;
        return this.validateManifest(box.manifest);
      } catch (_) { return null; }
    }

    saveManifestCache(manifest) {
      try {
        storage()?.setItem(LS_CACHE, JSON.stringify({
          url: this.manifestUrl,
          savedAt: Date.now(),
          manifest
        }));
      } catch (_) {}
    }

    async loadManifest(force = false) {
      if (this.manifest && !force) return this.manifest;
      if (!this.isConfigured()) return null;
      if (this.loading && !force) return this.loading;
      const url = this.manifestUrl;
      this.loading = (async () => {
        try {
          const response = await fetch(url, { cache: force ? 'reload' : 'no-cache', credentials: 'omit' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const parsed = this.validateManifest(await response.json());
          this.manifest = parsed;
          this.manifestBase = absoluteUrl(parsed.baseUrl || './', url);
          this.stale = false;
          this.lastError = '';
          this.saveManifestCache(parsed);
          this.emit('manifest', { manifest: parsed, stale: false });
          return parsed;
        } catch (error) {
          this.lastError = String(error?.message || error);
          const cached = this.cachedManifest();
          if (cached) {
            this.manifest = cached;
            this.manifestBase = absoluteUrl(cached.baseUrl || './', url);
            this.stale = true;
            console.warn(LOG, '远程 manifest 加载失败，使用上次缓存。', error);
            this.emit('manifest', { manifest: cached, stale: true, error: this.lastError });
            return cached;
          }
          console.warn(LOG, '远程 manifest 加载失败。', error);
          this.emit('error', { type: 'manifest', error: this.lastError });
          return null;
        } finally {
          this.loading = null;
        }
      })();
      return this.loading;
    }

    assetRecord(key) {
      return object(this.manifest?.assets)[text(key)] || null;
    }

    async asset(key, options = {}) {
      if (!this.manifest && options.load !== false) await this.loadManifest(false);
      const record = this.assetRecord(key);
      if (!record) return null;
      const src = text(record.src);
      return { ...record, key: text(key), url: absoluteUrl(src, this.manifestBase || this.manifestUrl) };
    }

    async resolve(key, options = {}) {
      const record = await this.asset(key, options);
      return record?.url || '';
    }

    collectionRecord(kind, id) {
      const collections = object(this.manifest?.collections);
      return object(object(collections[text(kind)])[text(id)]);
    }

    resolveMediaValue(value) {
      if (!value) return '';
      if (typeof value === 'string') return absoluteUrl(value, this.manifestBase || this.manifestUrl);
      const row = object(value);
      if (row.asset) {
        const record = this.assetRecord(row.asset);
        if (record?.src) return absoluteUrl(record.src, this.manifestBase || this.manifestUrl);
      }
      return absoluteUrl(row.src || row.url, this.manifestBase || this.manifestUrl);
    }

    async collection(kind, id, options = {}) {
      if (!this.manifest && options.load !== false) await this.loadManifest(false);
      const row = this.collectionRecord(kind, id);
      if (!Object.keys(row).length) return null;
      const cover = this.resolveMediaValue(row.cover);
      const gallery = list(row.gallery).map(item => {
        if (typeof item === 'string') return { id: '', url: this.resolveMediaValue(item) };
        const obj = object(item);
        return { ...obj, url: this.resolveMediaValue(obj) };
      }).filter(item => item.url);
      return { ...row, cover, gallery };
    }

    async region(id, options) { return this.collection('regions', id, options); }
    async place(id, options) { return this.collection('places', id, options); }
    async character(id, options) { return this.collection('characters', id, options); }
    async event(id, options) { return this.collection('events', id, options); }

    preloadUrl(url, timeoutMs = 15000) {
      const src = text(url);
      if (!src) return Promise.resolve(false);
      if (this.imagePromises.has(src)) return this.imagePromises.get(src);
      const promise = new Promise(resolve => {
        const image = new hostWin.Image();
        let done = false;
        const finish = ok => { if (done) return; done = true; hostWin.clearTimeout(timer); resolve(ok); };
        const timer = hostWin.setTimeout(() => finish(false), timeoutMs);
        image.onload = () => finish(true);
        image.onerror = () => finish(false);
        image.decoding = 'async';
        image.src = src;
      }).finally(() => this.imagePromises.delete(src));
      this.imagePromises.set(src, promise);
      return promise;
    }

    async preload(keys, options = {}) {
      const urls = [];
      for (const key of list(keys)) {
        const url = await this.resolve(key);
        if (url) urls.push(url);
      }
      const concurrency = Math.max(1, Math.min(6, Number(options.concurrency) || 2));
      let cursor = 0, ok = 0;
      const worker = async () => {
        while (cursor < urls.length) {
          const index = cursor++;
          if (await this.preloadUrl(urls[index], options.timeoutMs)) ok++;
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
      return { total: urls.length, loaded: ok, failed: urls.length - ok };
    }

    status() {
      return {
        version: VERSION,
        configured: this.isConfigured(),
        manifestUrl: this.manifestUrl,
        manifestVersion: this.manifest?.version || '',
        loaded: !!this.manifest,
        stale: !!this.stale,
        lastError: this.lastError
      };
    }

    clearManifestCache() {
      this.manifest = null; this.loading = null; this.stale = false; this.lastError = '';
      try { storage()?.removeItem(LS_CACHE); } catch (_) {}
    }
  }

  try {
    const old = hostWin.ShiomiAssets || localWin.ShiomiAssets;
    if (old?.version === VERSION && typeof old.resolve === 'function') return;
  } catch (_) {}

  const api = new ShiomiAssetManager();
  hostWin.ShiomiAssets = api;
  localWin.ShiomiAssets = api;
  console.info(LOG, 'AssetManager 已就绪。', api.status());
})();
