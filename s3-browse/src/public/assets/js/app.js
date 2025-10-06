/* ===== Config ===== */
const config = {
  primaryColor: '#167df0',
  allowDownloadAll: true,
  bucketUrl: '/s3',
  bucketMaskUrl: '/s3',
  rootPrefix: '',
  trashPrefix: '_trash/',
  keyExcludePatterns: [/^index\.html$/],
  pageSize: 50,
  defaultOrder: 'name-asc'
};
window.BB = window.BB || {};
BB.cfg = config;

/* ===== Helpers ===== */
String.prototype.removePrefix = function (prefix) { return this.startsWith(prefix) ? this.substring(prefix.length) : this; };
String.prototype.escapeHTML = function () { const t = document.createElement('span'); t.innerText = this; return t.innerHTML; };

function devicePlatform_iOS() { return /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function encodePath(path) {
  path = (path || '').replace(/\/{2,}/g, '/');
  try { if (decodeURI(path) !== path) return path; } catch (e) {}
  const m = {";":"%3B","?":"%3F",":":"%3A","@":"%40","&":"%26","=":"%3D","+":"%2B","$":"%24",",":"%2C","#":"%23"};
  return encodeURI(path).split("").map(ch => m[ch] || ch).join("");
}
function extOf(s='') { const m = /\.([^.]+)$/.exec((s||'').toLowerCase()); return m ? m[1] : ''; }

/* ===== Lang mapping (shared) ===== */
function isImageExt(e){ return BB.detect.isImageExt(e); }
function isArchiveExt(e){ return BB.detect.isArchiveExt(e); }
function isVideoExt(e){ return BB.detect.isVideoExt(e); }
function isAudioExt(e){ return BB.detect.isAudioExt(e); }
function isSpreadsheetExt(e){ return BB.detect.isSpreadsheetExt(e); }
function isPresentationExt(e){ return BB.detect.isPresentationExt(e); }
function isPdfExt(e){ return BB.detect.isPdfExt(e); }
function isCodeExt(e){ return BB.detect.isCodeExt(e); }
function langFromExt(e){ return BB.detect.langFromExt(e); }

/* ===== Setup (theme + exclusions) ===== */
(function setup() {
  const htmlPrefix = 'HTML>';
  if (config.title) config.titleHTML = config.title.startsWith(htmlPrefix) ? config.title.substring(htmlPrefix.length) : config.title.escapeHTML();
  if (config.subtitle) config.subtitleHTML = config.subtitle.startsWith(htmlPrefix) ? config.subtitle.substring(htmlPrefix.length) : config.subtitle.escapeHTML();
  config.bucketUrl = config.bucketUrl || '/s3';
  config.bucketMaskUrl = config.bucketMaskUrl || '/s3';
  config.rootPrefix = (config.rootPrefix || '');
  if (config.rootPrefix) config.rootPrefix = config.rootPrefix.replace(/\/?$/, '/');
  document.title = config.title || 'Bucket Browser';
  const fav = document.getElementById('favicon'); if (fav && config.favicon) fav.href = config.favicon;
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
  const absTrash = (config.rootPrefix || '') + (config.trashPrefix || '_trash/');
  const rx = new RegExp('^' + absTrash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!config.keyExcludePatterns.some(r => r.toString() === rx.toString())) config.keyExcludePatterns.push(rx);
})();

/* ===== App ===== */
(function main() {
  const app = Vue.createApp({
    data() {
      return {
        config,
        pathPrefix: '',
        searchPrefix: '',
        pathContentTableData: [],
        previousContinuationTokens: [],
        continuationToken: undefined,
        nextContinuationToken: undefined,
        windowWidth: window.innerWidth,
        downloadAllFilesCount: null,
        downloadAllFilesReceivedCount: null,
        downloadAllFilesProgress: null,
        isRefreshing: false,
        hasFflate: typeof window !== 'undefined' && !!window.fflate,
        pageSize: config.pageSize || 50   // server-side page size
      };
    },
    computed: {
      cssVars() { return {'--primary-color': this.config.primaryColor}; },
      cardView() { return this.windowWidth <= 768; },
      bucketPrefix() { return `${config.rootPrefix}${this.pathPrefix || ''}`; },
      canDownloadAll() {
        const filesCount = this.pathContentTableData.filter(i => i.type === 'content').length;
        return this.config.allowDownloadAll && filesCount >= 2;
      },
      currentPage() { return (this.previousContinuationTokens?.length || 0) + 1; }
    },
    watch: {
      pathPrefix() {
        const pp = (this.pathPrefix || '');
        this.previousContinuationTokens = [];
        this.continuationToken = undefined;
        this.nextContinuationToken = undefined;
        this.searchPrefix = pp.replace(/^.*\//, '');
        this.refresh();
      },
      pageSize() {
        this.config.pageSize = Number(this.pageSize) || 50;
        this.previousContinuationTokens = [];
        this.continuationToken = undefined;
        this.nextContinuationToken = undefined;
        this.refresh();
      }
    },
    methods: {
      /* UI helpers */
      blurActiveElement() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); },
      manualRefresh() {
        this.previousContinuationTokens = [];
        this.continuationToken = undefined;
        this.nextContinuationToken = undefined;
        this.refresh();
      },

      /* Router */
      updatePathFromHash() {
        const raw = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
        const q = raw.indexOf('?');
        const path = q === -1 ? raw : raw.slice(0, q);
        let target = path || '';
        if (!target && config.rootPrefix) target = config.rootPrefix;
        if (this.pathPrefix !== target) {
          this.pathPrefix = target;
        } else {
          if (!this.pathContentTableData.length) this.refresh();
        }
      },

      /* Icons per row */
      fileRowIcon(row) {
        if (row.type === 'prefix') return 'folder';
        const e = extOf(row.name);
        if (isArchiveExt(e))       return 'zip-box';
        if (isVideoExt(e))         return 'file-video-outline';
        if (isAudioExt(e))         return 'file-music-outline';
        if (isSpreadsheetExt(e))   return 'file-table-outline';
        if (isPresentationExt(e))  return 'file-powerpoint-outline';
        if (e === 'md' || e === 'txt') return 'file-document-outline';
        if (isImageExt(e))         return 'file-image-outline';
        if (isPdfExt(e))           return 'file-pdf-box';
        if (isCodeExt(e))          return 'file-code-outline';
        return 'file-outline';
      },

      /* Search / nav (server-side: prefix) */
      validBucketPrefix(prefix) {
        if (prefix === '') return true;
        if (prefix.startsWith(' ') || prefix.endsWith(' ')) return false;
        if (prefix.includes('//')) return false;
        if (prefix.startsWith('/') && this.bucketPrefix.includes('/')) return false;
        return true;
      },
      searchByPrefix() {
        if (this.validBucketPrefix(this.searchPrefix)) {
          const dir = (this.pathPrefix || '').replace(/[^/]*$/, '');
          const nextPath = dir + this.searchPrefix;
          if (('#' + nextPath) !== window.location.hash) window.location.hash = nextPath;
        }
      },
      previousPage() {
        if (this.previousContinuationTokens.length > 0) {
          this.continuationToken = this.previousContinuationTokens.pop();
          this.refresh();
        }
      },
      nextPage() {
        if (this.nextContinuationToken) {
          this.previousContinuationTokens.push(this.continuationToken);
          this.continuationToken = this.nextContinuationToken;
          this.refresh();
        }
      },

      /* Preview link */
      previewHref(row) {
        const dir = (this.pathPrefix || '').replace(/[^/]*$/, '');
        const e = extOf(row.name);
        let type = 'download';
        if (e === 'md') type = 'markdown';
        else if (isImageExt(e)) type = 'image';
        else if (isPdfExt(e)) type = 'pdf';
        else if (isCodeExt(e)) type = 'code';
        const lang = type === 'code' ? (langFromExt(e) || 'plaintext') : '';
        const base = location.pathname.replace(/[^/]*$/, '') + 'preview.html';
        return `${base}#${dir}${row.name}?type=${type}${lang ? `&lang=${encodeURIComponent(lang)}`:''}`;
      },
      async openPreview(row) {
        const href = this.previewHref(row);
        const w = window.open(href, '_blank', 'noopener,noreferrer');
        try {
          const key = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
          const fileUrl = `${(config.bucketMaskUrl || config.bucketUrl).replace(/\/*$/, '')}/${encodePath(key)}`;
          const head = await fetch(fileUrl, { method: 'HEAD' });
          if (!head.ok) return;
          const ct = head.headers.get('Content-Type') || '';
          let type = 'download';
          if (ct.startsWith('image/')) type = 'image';
          else if (ct === 'application/pdf') type = 'pdf';
          else if (/markdown/i.test(ct)) type = 'markdown';
          else if (ct.startsWith('text/') || /(json|xml|yaml|toml|javascript|typescript|shellscript)/i.test(ct)) type = 'code';
          if (type !== 'download' && w && !w.closed) {
            const url = new URL(w.location.href);
            url.searchParams.set('type', type);
            if (type === 'code') url.searchParams.set('lang', BB.detect.langFromMime(ct) || 'plaintext');
            else url.searchParams.delete('lang');
            w.location.replace(url.toString());
          }
        } catch {}
      },

      /* Go to folder */
      goToPrefix(prefix) {
        const h = '#' + String(prefix || '');
        if (window.location.hash !== h) window.location.hash = h;
      },

      /* Row actions */
      onRowDownload(row) {
        const absKey = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
        BB.actions.downloadObject(absKey, row.name);
      },
      async onRowRename(row) {
        const absKey = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
        const dst = await BB.actions.renameObject(absKey);
        if (dst) await this.refresh();
      },
      onRowDetails(row) {
       const absKey = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
        BB.actions.showFileDetails(absKey);
      },
      async onRowDelete(row) {
        const absKey = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
        const ok = await BB.actions.deleteObject(absKey);
        if (ok) await this.refresh();
      },

      onPrefixDetails(row) {
        const prefixAbs = ((config.rootPrefix||'') + row.prefix).replace(/\/{2,}/g,'/');
        BB.actions.showPrefixDetails(prefixAbs);
      },
      onCurrentFolderDetails() {
        const prefixAbs = (this.bucketPrefix || '').replace(/\/{2,}/g,'/');
        BB.actions.showPrefixDetails(prefixAbs);
      },

      /* Listing (server-side) */
      async refresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        try {
          let url = `${config.bucketUrl}?list-type=2&delimiter=/&prefix=${encodePath(this.bucketPrefix)}`;
          if (this.pageSize) url += `&max-keys=${this.pageSize}`;
          if (this.continuationToken) url += `&continuation-token=${encodePath(this.continuationToken)}`;
          const resp = await fetch(url);
          const xml = await resp.text();
          const listBucketResult = new DOMParser().parseFromString(xml, "text/xml");
          if (!listBucketResult.querySelector('ListBucketResult > Delimiter')) throw Error(`Bucket URL ${config.bucketUrl} is not a valid bucket API URL, response does not contain <ListBucketResult><Delimiter> tag.`);

          const nextTok = listBucketResult.querySelector("ListBucketResult > NextContinuationToken");
          this.nextContinuationToken = nextTok && nextTok.textContent;

          const commonPrefixes = [...listBucketResult.querySelectorAll("ListBucketResult > CommonPrefixes")]
            .map(tag => ({ prefix: tag.querySelector('Prefix').textContent.removePrefix(config.rootPrefix) }))
            .filter(p => !config.keyExcludePatterns.find(rx => rx.test(p.prefix.removePrefix(config.rootPrefix))))
            .map(p => ({ type:'prefix', name: p.prefix.split('/').slice(-2)[0] + '/', prefix: p.prefix, size: 0, dateModified: null }));

          const contents = [...listBucketResult.querySelectorAll("ListBucketResult > Contents")]
            .map(tag => ({
              key: tag.querySelector('Key').textContent,
              size: parseInt(tag.querySelector('Size').textContent),
              dateModified: new Date(tag.querySelector('LastModified').textContent)
            }))
            .filter(c => c.key !== decodeURI(this.bucketPrefix))
            .filter(c => !config.keyExcludePatterns.find(rx => rx.test(c.key.removePrefix(config.rootPrefix))))
            .map(c => {
              if (c.key.endsWith('/') && !c.size) {
                return {
                  type:'prefix',
                  name: c.key.split('/').slice(-2)[0] + '/',
                  prefix: c.key.removePrefix(config.rootPrefix),
                  size: 0,
                  dateModified: c.dateModified || null
                };
              }
              const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(c.key)}`;
              let installUrl; if (url.endsWith('/manifest.plist') && devicePlatform_iOS()) installUrl = `itms-services://?action=download-manifest&url=${encodePath(url)}`;
              return { type:'content', name: c.key.split('/').slice(-1)[0], size: c.size, dateModified: c.dateModified, key: c.key, url, installUrl };
            });

          // Fusion/dédoublonnage
          const map = new Map();
          for (const it of [...commonPrefixes, ...contents]) {
            const id = (it.type === 'prefix' ? 'P:' + it.prefix : 'F:' + it.key);
            if (!map.has(id)) map.set(id, it);
            else {
              const prev = map.get(id);
              if (it.type === 'prefix' && it.dateModified && !prev.dateModified) map.set(id, it);
            }
          }
          this.pathContentTableData = Array.from(map.values());
        } catch (error) {
          BB.ui.toast((error && (error.message || error))?.toString() || 'Error');
        } finally { this.isRefreshing = false; }
      },

      /* ===== Format helpers ===== */
      formatBytes(size) {
        if (!Number.isFinite(size)) return '-';
        const KB = 1024, MB = 1048576, GB = 1073741824;
        if (size < KB) return size + '  B';
        if (size < MB) return (size / KB).toFixed(0) + ' KB';
        if (size < GB) return (size / MB).toFixed(2) + ' MB';
        return (size / GB).toFixed(2) + ' GB';
      },
      formatDateTime_relative(d){ return d ? moment(d).fromNow() : '-'; },
      formatDateTime_utc(d){ return d ? moment(d).utc().format('YYYY-MM-DD HH:mm:ss [UTC]') : ''; },

      /* Uploads */
      triggerUpload() { const el = this.$refs.fileInput; if (el) { el.value = ''; el.click(); } },
      async onFileInput(evt) {
        const files = Array.from(evt.target.files || []);
        if (!files.length) return;
        await this.uploadFiles(files, f => f.name);
        evt.target.value = '';
        await this.refresh();
      },
      triggerUploadDir() { const el = this.$refs.dirInput; if (el) { el.value = ''; el.click(); } },
      async onDirInput(evt) {
        const files = Array.from(evt.target.files || []);
        if (!files.length) return;
        await this.uploadFiles(files, f => f.webkitRelativePath || f.name);
        evt.target.value = '';
        await this.refresh();
      },
      async uploadFiles(files, keyResolver) {
        const base = (config.bucketUrl || '/s3').replace(/\/*$/, '');
        const concurrency = 5;
        const queue = files.slice();
        const runOne = async () => {
          const f = queue.shift(); if (!f) return;
          const rel = keyResolver(f);
          const key = (this.bucketPrefix + rel).replace(/\/{2,}/g, '/');
          const putURL = `${base}/${encodePath(key)}`;
          try {
            const res = await fetch(putURL, { method: 'PUT', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f });
            if (!res.ok) { const txt = await res.text().catch(()=>''); throw new Error(`HTTP ${res.status}${txt ? ' – ' + txt : ''}`); }
          } catch (e) { BB.ui.toast(`Upload failed: ${rel} — ${e}`); }
          if (queue.length) await runOne();
        };
        await Promise.all(Array.from({length: Math.min(concurrency, queue.length)}, runOne));
        BB.ui.toast(`Upload terminé (${files.length})`);
      },

      /* Download all (fflate) */
      async downloadAllFiles() {
        if (!window.fflate || !window.fflate.Zip || !window.fflate.ZipPassThrough) { BB.ui.toast('Archive indisponible (fflate non chargé).'); return; }
        const { Zip, ZipPassThrough } = window.fflate;
        const archiveFiles = this.pathContentTableData.filter(i => i.type === 'content').map(i => i.url);
        if (!archiveFiles.length) { BB.ui.toast('Aucun fichier à télécharger.'); return; }
        this.downloadAllFilesCount = archiveFiles.length;
        this.downloadAllFilesReceivedCount = 0;
        this.downloadAllFilesProgress = 0;

        let totalContentLength = 0, totalReceivedLength = 0;
        const archiveName = (this.pathPrefix || '').split('/').filter(p => p.trim()).pop();
        const archiveData = [];
        const archive = new Zip((err, data) => { if (err) throw err; archiveData.push(data); });

        await Promise.all(archiveFiles.map(async (url) => {
          const fileName = url.split('/').filter(p => p.trim()).pop();
          const fileStream = new ZipPassThrough(fileName);
          archive.add(fileStream);

          const resp = await fetch(url);
          const len = parseInt(resp.headers.get('Content-Length') || '0', 10);
          if (!isNaN(len)) totalContentLength += len;

          const reader = resp.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) { fileStream.push(new Uint8Array(), true); break; }
            fileStream.push(new Uint8Array(value));
            totalReceivedLength += value.length;
            const p1 = totalContentLength ? (totalReceivedLength / totalContentLength) : 0;
            const p2 = this.downloadAllFilesCount ? (this.downloadAllFilesReceivedCount / this.downloadAllFilesCount) : 0;
            this.downloadAllFilesProgress = (p1 + p2) / 2;
          }
          this.downloadAllFilesReceivedCount++;
        })).then(() => archive.end());

        const blob = new Blob(archiveData, { type: 'application/zip' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href; a.download = `${archiveName || 'archive'}.zip`; a.click();
        URL.revokeObjectURL(href);

        this.downloadAllFilesCount = this.downloadAllFilesReceivedCount = this.downloadAllFilesProgress = null;
      }
    },
    mounted() {
      this.hasFflate = !!(window && window.fflate);
      window.addEventListener('hashchange', this.updatePathFromHash);
      window.addEventListener('resize', () => { this.windowWidth = window.innerWidth; });
      this.updatePathFromHash();
      if (!this.pathContentTableData.length) { this.refresh(); }
    },
    beforeUnmount() {
      window.removeEventListener('hashchange', this.updatePathFromHash);
      window.removeEventListener('resize', this.updatePathFromHash);
    }
  });

  app.use(Buefy.default, {defaultIconPack: 'mdi'});
  app.mount('#root');
})();
