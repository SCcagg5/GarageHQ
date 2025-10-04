const config = {
  primaryColor: '#167df0',
  allowDownloadAll: true,
  bucketUrl: '/s3',
  bucketMaskUrl: '/s3',
  rootPrefix: '',
  keyExcludePatterns: [/^index\.html$/],
  pageSize: 50,
  defaultOrder: 'name-asc'
};

String.prototype.removePrefix = function (prefix) {
  return this.startsWith(prefix) ? this.substring(prefix.length) : this;
};
String.prototype.escapeHTML = function () {
  const t = document.createElement('span');
  t.innerText = this;
  return t.innerHTML;
};
function devicePlatform_iOS() {
  return /iPad|iPhone|iPod/.test(navigator.platform) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function encodePath(path) {
  path = (path || '').replace(/\/{2,}/g, '/');
  try { if (decodeURI(path) !== path) return path; } catch(e) {}
  const m = {";":"%3B","?":"%3F",":":"%3A","@":"%40","&":"%26","=":"%3D","+":"%2B","$":"%24",",":"%2C","#":"%23"};
  return encodeURI(path).split("").map(ch => m[ch] || ch).join("");
}

(function setup() {
  const htmlPrefix = 'HTML>';
  if (config.title) config.titleHTML = config.title.startsWith(htmlPrefix) ? config.title.substring(htmlPrefix.length) : config.title.escapeHTML();
  if (config.subtitle) config.subtitleHTML = config.subtitle.startsWith(htmlPrefix) ? config.subtitle.substring(htmlPrefix.length) : config.subtitle.escapeHTML();
  config.bucketUrl = config.bucketUrl || '/s3';
  config.bucketMaskUrl = config.bucketMaskUrl || '/s3';
  config.rootPrefix = (config.rootPrefix || '');
  if (config.rootPrefix) config.rootPrefix = config.rootPrefix.replace(/\/?$/, '/');
  document.title = config.title || 'Bucket Browser';
  const fav = document.getElementById('favicon');
  if (fav && config.favicon) fav.href = config.favicon;
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
})();

(function main() {
  function getRoute() {
    const hash = decodeURIComponent(window.location.hash).replace(/^#/, '') || '';
    const q = hash.indexOf('?');
    const path = q === -1 ? hash : hash.slice(0, q);
    const params = new URLSearchParams(q === -1 ? '' : hash.slice(q));
    return { path, params };
  }
  function show(el) { el.classList.remove('is-hidden'); }
  function hide(el) { el.classList.add('is-hidden'); }

  function route(vm) {
    const r = getRoute();
    const appEl = document.getElementById('app');
    const previewEl = document.getElementById('preview');

    if (r.params.get('preview')) {
      hide(appEl);
      show(previewEl);

      if (r.params.get('preview') === 'markdown') {
        const fileUrl = `${(config.bucketMaskUrl || config.bucketUrl).replace(/\/*$/, '')}/${encodePath(r.path)}`;
        const z = document.querySelector('#preview #preview-markdown');
        customElements.whenDefined('zero-md').then(() => {
          if (!z) return;
          const current = z.getAttribute('src') || '';
          if (current !== fileUrl) z.setAttribute('src', fileUrl);
        });
        const dir = (r.path || '').replace(/[^/]*$/, '');
        if (vm.pathPrefix !== dir) vm.pathPrefix = dir;
      }
    } else {
      const z = document.querySelector('#preview #preview-markdown');
      if (z && z.hasAttribute('src')) z.removeAttribute('src');
      show(appEl);
      hide(previewEl);

      let target = r.path || '';
      if (!target && config.rootPrefix) target = config.rootPrefix;

      if (vm.pathPrefix !== target) {
        vm.pathPrefix = target;
      }
    }
  }

  const app = Vue.createApp({
    data() {
      return {
        config,
        pathPrefix: null,
        searchPrefix: '',
        pathContentTableData: [],
        previousContinuationTokens: [],
        continuationToken: undefined,
        nextContinuationToken: undefined,
        windowWidth: window.innerWidth,
        downloadAllFilesCount: null,
        downloadAllFilesReceivedCount: null,
        downloadAllFilesProgress: null,
        isRefreshing: false
      };
    },
    computed: {
      cssVars() { return {'--primary-color': this.config.primaryColor}; },
      pathBreadcrumbs() {
        const p = (this.pathPrefix || '');
        return ['', ...(p.match(/[^/]*\//g) || [])]
          .map((part, i, parts) => ({ name: decodeURI(part), url: '#' + parts.slice(0, i).join('') + part }));
      },
      cardView() { return this.windowWidth <= 768; },
      bucketPrefix() { return `${config.rootPrefix}${this.pathPrefix || ''}`; }
    },
    watch: {
      pathPrefix() {
        const pp = (this.pathPrefix || '');
        this.previousContinuationTokens = [];
        this.continuationToken = undefined;
        this.nextContinuationToken = undefined;
        this.searchPrefix = pp.replace(/^.*\//, '');
        this.refresh();
      }
    },
    methods: {
      blurActiveElement() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); },
      moment,
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
      async downloadAllFiles() {
        const archiveFiles = this.pathContentTableData.filter(i => i.type === 'content').map(i => i.url);
        this.downloadAllFilesCount = archiveFiles.length;
        this.downloadAllFilesReceivedCount = 0;
        this.downloadAllFilesProgress = 0;
        let totalContentLength = 0, totalReceivedLength = 0;
        const archiveName = (this.pathPrefix || '').split('/').filter(p => p.trim()).pop();
        const archiveData = [];
        const archive = new fflate.Zip((err, data) => { if (err) throw err; archiveData.push(data); });
        await Promise.all(archiveFiles.map(async (url) => {
          const fileName = url.split('/').filter(p => p.trim()).pop();
          const fileStream = new fflate.ZipPassThrough(fileName); archive.add(fileStream);
          const resp = await fetch(url);
          const len = parseInt(resp.headers.get('Content-Length') || '0', 10);
          if (!isNaN(len)) totalContentLength += len;
          const reader = resp.body.getReader();
          while (true) {
            const {done, value} = await reader.read();
            if (done) { fileStream.push(new Uint8Array(), true); break; }
            fileStream.push(new Uint8Array(value));
            totalReceivedLength += value.length;
            const p1 = totalContentLength ? (totalReceivedLength / totalContentLength) : 0;
            const p2 = this.downloadAllFilesCount ? (this.downloadAllFilesReceivedCount / this.downloadAllFilesCount) : 0;
            this.downloadAllFilesProgress = (p1 + p2) / 2;
          }
          this.downloadAllFilesReceivedCount++;
        })).then(() => archive.end());
        const blob = new Blob(archiveData, {type:'application/octet-stream'});
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `${archiveName || 'archive'}.zip`;
        a.click();
        URL.revokeObjectURL(href);
        this.downloadAllFilesCount = this.downloadAllFilesReceivedCount = this.downloadAllFilesProgress = null;
      },
      async downloadViaProxy(row) {
        try {
          const res = await fetch(row.url, { method: 'GET' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const href = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = href;
          a.download = row.name || 'download';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(href);
        } catch (e) {
          this.$buefy.notification.open({ message: `Failed to download ${row.name}: ${e.message || e}`, type:'is-danger', duration:8000, position:'is-bottom' });
        }
      },
      previewHref(row) {
        const dir = (this.pathPrefix || '').replace(/[^/]*$/, '');
        return `#${dir}${row.name}?preview=markdown`;
      },
      openPreview(row) {
        const h = this.previewHref(row);
        if (('#' + h) !== window.location.hash) window.location.hash = h;
      },
      triggerUpload() {
        const el = this.$refs.fileInput;
        if (el) { el.value = ''; el.click(); }
      },
      async onFileInput(evt) {
        const files = evt.target.files;
        if (!files || !files.length) return;
        for (const file of files) {
          const key = (this.bucketPrefix + file.name).replace(/\/{2,}/g, '/');
          const putURL = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(key)}`;
          try {
            const res = await fetch(putURL, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'application/octet-stream' },
              body: file
            });
            if (!res.ok) {
              const txt = await res.text().catch(()=>'');
              throw new Error(`HTTP ${res.status}${txt ? ' – ' + txt : ''}`);
            }
            this.$buefy.toast.open({ message: `Uploaded ${file.name}`, type: 'is-success' });
          } catch (e) {
            this.$buefy.toast.open({ message: `Upload failed: ${file.name} — ${e}`, type: 'is-danger' });
          }
        }
        evt.target.value = '';
        await this.refresh();
      },
      async refresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        try {
          let url = `${config.bucketUrl}?list-type=2&delimiter=/&prefix=${encodePath(this.bucketPrefix)}`;
          if (config.pageSize) url += `&max-keys=${config.pageSize}`;
          if (this.continuationToken) url += `&continuation-token=${encodePath(this.continuationToken)}`;
          const resp = await fetch(url);
          const xml = await resp.text();
          const listBucketResult = new DOMParser().parseFromString(xml, "text/xml");
          if (!listBucketResult.querySelector('ListBucketResult > Delimiter')) {
            throw Error(`Bucket URL ${config.bucketUrl} is not a valid bucket API URL, response does not contain <ListBucketResult><Delimiter> tag.`);
          }
          const nextTok = listBucketResult.querySelector("NextContinuationToken");
          this.nextContinuationToken = nextTok && nextTok.textContent;

          const commonPrefixes = [...listBucketResult.querySelectorAll("ListBucketResult > CommonPrefixes")]
            .map(tag => ({ prefix: tag.querySelector('Prefix').textContent.removePrefix(config.rootPrefix) }))
            .filter(p => !config.keyExcludePatterns.find(rx => rx.test(p.prefix.removePrefix(config.rootPrefix))))
            .map(p => ({ type:'prefix', name: p.prefix.split('/').slice(-2)[0] + '/', prefix: p.prefix }));

          const contents = [...listBucketResult.querySelectorAll("ListBucketResult > Contents")]
            .map(tag => ({
              key: tag.querySelector('Key').textContent,
              size: parseInt(tag.querySelector('Size').textContent),
              dateModified: new Date(tag.querySelector('LastModified').textContent)
            }))
            .filter(c => c.key !== decodeURI(this.bucketPrefix))
            .filter(c => !config.keyExcludePatterns.find(rx => rx.test(c.key.removePrefix(config.rootPrefix))))
            .map(c => {
              if (c.key.endsWith('/') && !c.size) return { type:'prefix', name: c.key.split('/').slice(-2)[0] + '/', prefix: c.key.removePrefix(config.rootPrefix) };
              const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(c.key)}`;
              let installUrl;
              if (url.endsWith('/manifest.plist') && devicePlatform_iOS()) installUrl = `itms-services://?action=download-manifest&url=${encodePath(url)}`;
              return { type:'content', name: c.key.split('/').slice(-1)[0], size: c.size, dateModified: c.dateModified, key: c.key, url, installUrl };
            });

          this.pathContentTableData = [...commonPrefixes, ...contents];
        } catch (error) {
          this.$buefy.notification.open({ message: (error && (error.message || error))?.toString(), type:'is-danger', duration:60000, position:'is-bottom' });
        } finally {
          this.isRefreshing = false;
        }
      },
      sortTableData(columnName) {
        return (a, b, isAsc) => {
          if (a.type !== b.type) return a.type === 'prefix' ? -1 : 1;
          const va = a[columnName];
          const vb = b[columnName];
          if (va == null && vb == null) return 0;
          if (va == null) return isAsc ? -1 : 1;
          if (vb == null) return isAsc ? 1 : -1;
          if (typeof va === 'string' && typeof vb === 'string') return isAsc ? va.localeCompare(vb) : vb.localeCompare(va);
          if (va < vb) return isAsc ? -1 : 1;
          if (va > vb) return isAsc ? 1 : -1;
          return 0;
        };
      },
      formatBytes(size) { if (!size) return '-'; const KB=1024, MB=1048576, GB=1073741824; if(size<KB)return size+'  B'; if(size<MB)return (size/KB).toFixed(0)+' KB'; if(size<GB)return (size/MB).toFixed(2)+' MB'; return (size/GB).toFixed(2)+' GB'; },
      formatDateTime_date(d){ return d ? moment(d).format('ddd, DD. MMM YYYY') : '-'; },
      formatDateTime_time(d){ return d ? moment(d).format('hh:mm:ss') : '-'; },
      formatDateTime_relative(d){ return d ? moment(d).fromNow() : '-'; }
    },
    async mounted() {
      window.addEventListener('hashchange', () => route(this));
      window.addEventListener('resize', () => { this.windowWidth = window.innerWidth; });
      route(this);
    },
    async beforeUnmount() {
      window.removeEventListener('resize');
      window.removeEventListener('hashchange');
    }
  });

  app.use(Buefy.default, {defaultIconPack: 'fas'});
  app.mount('#app');
})();
