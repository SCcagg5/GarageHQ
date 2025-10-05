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

/* ===== Lang mapping ===== */
const EXT_TO_LANG = {
  sh:'bash', bash:'bash', zsh:'bash', ksh:'bash', fish:'bash',
  ps1:'powershell', psm1:'powershell', psd1:'powershell',
  js:'javascript', mjs:'javascript', cjs:'javascript',
  ts:'typescript', jsx:'jsx', tsx:'tsx',
  json:'json', json5:'json', ndjson:'json', jsonl:'json', hjson:'json',
  yaml:'yaml', yml:'yaml', toml:'toml',
  html:'xml', htm:'xml', xhtml:'xml', vue:'xml', svelte:'xml',
  css:'css', scss:'scss', sass:'sass', less:'less',
  xml:'xml', rss:'xml', atom:'xml', svg:'xml',
  ini:'ini', conf:'ini', cfg:'ini', properties:'ini', env:'ini', dotenv:'ini', editorconfig:'ini',
  md:'markdown', markdown:'markdown', mdown:'markdown', mkd:'markdown', rmd:'markdown',
  txt:'plaintext', log:'plaintext', csv:'plaintext', tsv:'plaintext',
  sql:'sql', gql:'graphql', graphql:'graphql',
  dockerfile:'dockerfile', compose:'yaml',
  makefile:'makefile', mk:'makefile', gnumakefile:'makefile',
  nginx:'nginx', proto:'protobuf', thrift:'thrift',
  java:'java', kt:'kotlin', kts:'kotlin', groovy:'groovy', scala:'scala',
  c:'c', h:'c',
  cpp:'cpp', cxx:'cpp', cc:'cpp', hpp:'cpp', hxx:'cpp', inl:'cpp',
  m:'objectivec', mm:'objectivec',
  cs:'csharp',
  go:'go', rs:'rust', swift:'swift',
  py:'python', pyw:'python',
  rb:'ruby',
  php:'php', phtml:'php', inc:'php',
  pl:'perl', pm:'perl', t:'perl',
  lua:'lua', r:'r', dart:'dart',
  prisma:'prisma', zig:'zig', cue:'cue', bicep:'bicep',
  tf:'terraform', tfvars:'terraform', hcl:'terraform',
  kql:'kusto',
  asciidoc:'asciidoc', adoc:'asciidoc',
  bat:'dos', cmd:'dos',
  wasm:'wasm',
  scalahtml:'xml',
  mustache:'xml', hbs:'xml', ejs:'xml', njk:'xml', twig:'xml', jinja:'xml',
  handlebars:'xml',
  hs:'haskell',
  ml:'ocaml', mli:'ocaml',
  pas:'pascal', pp:'pascal',
  vb:'vbnet', vbs:'vbscript',
  fs:'fsharp', fsx:'fsharp',
  ipynb:'json'
};
const MIME_TO_LANG = [
  [/shellscript|x-sh|x-bash|x-zsh|x-shellscript/i, 'bash'],
  [/powershell/i, 'powershell'],
  [/typescript/i, 'typescript'],
  [/javascript|ecmascript/i, 'javascript'],
  [/json|ndjson|jsonl/i, 'json'],
  [/yaml|yml/i, 'yaml'],
  [/xml|html|xhtml|svg/i, 'xml'],
  [/css/i, 'css'],
  [/markdown|md/i, 'markdown'],
  [/x-toml|toml/i, 'toml'],
  [/x-ini|ini|config|properties/i, 'ini'],
  [/python/i, 'python'],
  [/ruby/i, 'ruby'],
  [/php/i, 'php'],
  [/java/i, 'java'],
  [/kotlin/i, 'kotlin'],
  [/go/i, 'go'],
  [/rust/i, 'rust'],
  [/c\+\+|x-c\+\+|cpp/i, 'cpp'],
  [/csharp|c\#/i, 'csharp'],
  [/sql|postgresql|mysql|sqlite/i, 'sql'],
  [/graphql/i, 'graphql'],
  [/dockerfile|x-dockerfile/i, 'dockerfile'],
  [/makefile/i, 'makefile'],
  [/nginx/i, 'nginx'],
  [/protobuf/i, 'protobuf'],
  [/thrift/i, 'thrift'],
  [/lua/i, 'lua'],
  [/perl/i, 'perl'],
  [/swift/i, 'swift'],
  [/haskell/i, 'haskell'],
  [/clojure|edn/i, 'clojure'],
  [/elixir/i, 'elixir'],
  [/ocaml/i, 'ocaml'],
  [/pascal|delphi/i, 'pascal'],
  [/vb(net)?|vbs/i, 'vbnet'],
  [/fsharp/i, 'fsharp'],
  [/asciidoc/i, 'asciidoc'],
  [/latex|x-tex/i, 'latex'],
  [/terraform|hcl/i, 'terraform'],
  [/kusto/i, 'kusto'],
  [/dart/i, 'dart'],
  [/r-language|x-r|\/r$/i, 'r'],
  [/text\/plain/i, 'plaintext']
];

function isImageExt(e){ return ['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(e); }
function isArchiveExt(e){ return ['zip','rar','7z','tar','gz','tgz','bz2','tbz','xz','txz','zst'].includes(e); }
function isVideoExt(e){ return ['mp4','mkv','webm','avi','mov','m4v','mpg','mpeg','flv','3gp','wmv','ogv','mts','m2ts','ts','vob'].includes(e); }
function isAudioExt(e){ return ['mp3','flac','wav','m4a','aac','ogg','opus','aiff','aif','alac','wma','amr','midi','mid'].includes(e); }
function isSpreadsheetExt(e){ return ['xls','xlsx','xlsm','xlsb','xlt','ods','csv','tsv','numbers'].includes(e); }
function isPresentationExt(e){ return ['ppt','pptx','pps','ppsx','odp','key'].includes(e); }
function isPdfExt(e){ return e === 'pdf'; }
function isCodeExt(e){ return !!EXT_TO_LANG[e]; }
function langFromExt(e){ return EXT_TO_LANG[e] || 'plaintext'; }
function langFromMime(ct=''){ const lo=(ct||'').toLowerCase(); for (const [rx,lang] of MIME_TO_LANG) if (rx.test(lo)) return lang; return ''; }

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
        pathPrefix: '',                 // chemin courant
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
        hasFflate: typeof window !== 'undefined' && !!window.fflate
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
      bucketPrefix() { return `${config.rootPrefix}${this.pathPrefix || ''}`; },
      canDownloadAll() {
        const filesCount = this.pathContentTableData.filter(i => i.type === 'content').length;
        return this.config.allowDownloadAll && filesCount >= 2;
      }
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
      /* UI helpers */
      blurActiveElement() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); },
      moment,
      manualRefresh() {
        this.previousContinuationTokens = [];
        this.continuationToken = undefined;
        this.nextContinuationToken = undefined;
        this.refresh();
      },

      /* Router (index = liste uniquement) */
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


      /* Breadcrumb root */
      goRoot() {
        const target = (config.rootPrefix || '');
        const h = '#' + target;
        if (window.location.hash !== h) window.location.hash = h;
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

      /* Search / nav */
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
      previousPage() { if (this.previousContinuationTokens.length > 0) { this.continuationToken = this.previousContinuationTokens.pop(); this.refresh(); } },
      nextPage() { if (this.nextContinuationToken) { this.previousContinuationTokens.push(this.continuationToken); this.continuationToken = this.nextContinuationToken; this.refresh(); } },

      /* Preview: ouvre preview.html dans un nouvel onglet */
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

        // Essai d’amélioration par HEAD (MIME) pour ajuster type/lang
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
            if (type === 'code') {
              const byMime = langFromMime(ct) || 'plaintext';
              url.searchParams.set('lang', byMime);
            } else {
              url.searchParams.delete('lang');
            }
            w.location.replace(url.toString());
          }
        } catch {}
      },

      /* Metadata / rename / delete (trash fallback) */
      async showMetadata(row) {
        try {
          const key = ((config.rootPrefix||'') + (this.pathPrefix||'') + (row.name || '')).replace(/\/{2,}/g,'/');
          const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(key)}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const meta = {}; res.headers.forEach((v, k) => { meta[k] = v; });
          const text = JSON.stringify(meta, null, 2);
          this.$buefy.dialog.alert({
            title: `Metadata — ${row.name || row.prefix}`,
            message: `<pre style="white-space:pre-wrap;margin:0">${text}</pre>`,
            ariaRole: 'alertdialog', ariaModal: true, dangerouslyUseHTMLString: true
          });
        } catch (e) { this.$buefy.toast.open({ message: `Metadata error: ${e}`, type: 'is-danger' }); }
      },
      renameFile(row) {
        const current = row.name;
        this.$buefy.dialog.prompt({
          message: `Nouveau nom pour le fichier`,
          inputAttrs: { value: current, placeholder: current },
          confirmText: 'Renommer',
          onConfirm: async (val) => {
            const newName = (val || '').trim();
            if (!newName || newName === current) return;
            const parent = (((config.rootPrefix||'') + (this.pathPrefix||'')).replace(/\/{2,}/g,'/')).replace(/[^/]*$/, '');
            const oldKey = parent + current;
            const newKey = parent + newName;
            await this.copyOnly(oldKey, newKey);
            const ok = await this.tryDelete(oldKey);
            if (!ok) await this.moveToTrashSingle(oldKey);
            this.$buefy.toast.open({ message: `Renommé: ${current} → ${newName}`, type: 'is-success' });
            await this.refresh();
          }
        });
      },
      async deleteFile(row) {
        this.$buefy.dialog.confirm({
          message: `Supprimer « ${row.name} » ?`,
          confirmText: 'Supprimer',
          type: 'is-danger',
          onConfirm: async () => {
            const key = ((config.rootPrefix||'') + (this.pathPrefix||'') + row.name).replace(/\/{2,}/g,'/');
            const ok = await this.tryDelete(key);
            if (!ok) { await this.moveToTrashSingle(key); this.$buefy.toast.open({ message: `Déplacé dans la corbeille`, type: 'is-warning' }); }
            else this.$buefy.toast.open({ message: `Supprimé`, type: 'is-success' });
            await this.refresh();
          }
        });
      },
      renamePrefix(row) {
        const oldPrefix = row.prefix;
        const baseName = oldPrefix.replace(/\/$/, '').split('/').pop();
        this.$buefy.dialog.prompt({
          message: `Nouveau nom pour le dossier`,
          inputAttrs: { value: baseName, placeholder: baseName },
          confirmText: 'Renommer',
          onConfirm: async (val) => {
            let newName = (val || '').trim().replace(/\/+$/,'');
            if (!newName || newName === baseName) return;
            const parent = oldPrefix.replace(/[^/]*\/$/, '');
            const newPrefix = `${parent}${newName}/`;
            await this.batchCopyPrefix(oldPrefix, newPrefix);
            const ok = await this.tryDeletePrefix(oldPrefix);
            if (!ok) await this.moveToTrashPrefix(oldPrefix);
            if ((this.pathPrefix || '').startsWith(oldPrefix)) window.location.hash = '#' + (this.pathPrefix || '').replace(oldPrefix, newPrefix);
            await this.refresh();
            this.$buefy.toast.open({ message: `Dossier renommé: ${baseName}/ → ${newName}/`, type: 'is-success' });
          }
        });
      },
      deletePrefix(row) {
        const oldPrefix = row.prefix;
        this.$buefy.dialog.confirm({
          message: `Supprimer le dossier « ${oldPrefix} » et tout son contenu ?`,
          confirmText: 'Supprimer',
          type: 'is-danger',
          onConfirm: async () => {
            const ok = await this.tryDeletePrefix(oldPrefix);
            if (!ok) { await this.moveToTrashPrefix(oldPrefix); this.$buefy.toast.open({ message: `Dossier déplacé dans la corbeille`, type: 'is-warning' }); }
            else this.$buefy.toast.open({ message: `Dossier supprimé`, type: 'is-success' });
            if ((this.pathPrefix || '') === oldPrefix) window.location.hash = '#' + oldPrefix.replace(/[^/]*\/$/, '');
            await this.refresh();
          }
        });
      },

      /* Copy / delete / trash / batch */
      async copyOnly(srcKey, dstKey) {
        const base = (config.bucketUrl || '/s3').replace(/\/*$/, '');
        const srcUrl = `${base}/${encodePath(srcKey)}`;
        const dstUrl = `${base}/${encodePath(dstKey)}`;
        const get = await fetch(srcUrl); if (!get.ok) throw new Error(`GET ${get.status}`);
        const blob = await get.blob();
        const put = await fetch(dstUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
        if (!put.ok) throw new Error(`PUT ${put.status}`);
      },
      async tryDelete(key) {
        const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(key)}`;
        try {
          const res = await fetch(url, { method: 'DELETE' });
          if (res.ok) return true;
          if (res.status === 405) return false;
          return false;
        } catch { return false; }
      },
      async tryDeletePrefix(prefixRel) {
        const fullPrefix = (config.rootPrefix || '') + prefixRel;
        const keys = await this.listAllKeys(fullPrefix);
        const base = (config.bucketUrl || '/s3').replace(/\/*$/, '');
        let allOk = true;
        for (const k of keys) {
          const url = `${base}/${encodePath(k)}`;
          try {
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) { if (res.status === 405) return false; allOk = false; }
          } catch { return false; }
        }
        return allOk;
      },
      async moveToTrashSingle(key) {
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        const dst = (config.trashPrefix || '_trash/') + ts + '/' + key;
        await this.copyOnly(key, dst);
      },
      async moveToTrashPrefix(prefixRel) {
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        const fullPrefix = (config.rootPrefix || '') + prefixRel;
        const keys = await this.listAllKeys(fullPrefix);
        const moves = keys.map(k => this.copyOnly(k, (config.trashPrefix || '_trash/') + ts + '/' + k));
        await Promise.all(moves);
      },
      async batchCopyPrefix(oldPrefixRel, newPrefixRel) {
        const fullOld = (config.rootPrefix || '') + oldPrefixRel;
        const fullNew = (config.rootPrefix || '') + newPrefixRel;
        const keys = await this.listAllKeys(fullOld);
        const concurrency = 4;
        let i = 0;
        const run = async () => {
          while (i < keys.length) {
            const idx = i++;
            const src = keys[idx];
            const dst = src.replace(fullOld, fullNew);
            await this.copyOnly(src, dst);
          }
        };
        await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, run));
      },
      async listAllKeys(fullPrefix) {
        const out = [];
        let token;
        do {
          let url = `${config.bucketUrl}?list-type=2&prefix=${encodePath(fullPrefix)}`;
          if (token) url += `&continuation-token=${encodePath(token)}`;
          const resp = await fetch(url);
          const xml = await resp.text();
          const doc = new DOMParser().parseFromString(xml, 'text/xml');
          const contents = [...doc.querySelectorAll('ListBucketResult > Contents > Key')].map(n => n.textContent);
          out.push(...contents);
          const nt = doc.querySelector('ListBucketResult > NextContinuationToken'); token = nt && nt.textContent;
        } while (token);
        return out;
      },

      /* Download all (fflate) */
      async downloadAllFiles() {
        if (!window.fflate || !window.fflate.Zip || !window.fflate.ZipPassThrough) {
          this.$buefy.toast.open({ message: 'Archive indisponible (fflate non chargé).', type: 'is-danger' });
          return;
        }
        const { Zip, ZipPassThrough } = window.fflate;
        const archiveFiles = this.pathContentTableData.filter(i => i.type === 'content').map(i => i.url);
        if (!archiveFiles.length) {
          this.$buefy.toast.open({ message: 'Aucun fichier à télécharger.', type: 'is-warning' });
          return;
        }
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
        a.href = href;
        a.download = `${archiveName || 'archive'}.zip`;
        a.click();
        URL.revokeObjectURL(href);

        this.downloadAllFilesCount = this.downloadAllFilesReceivedCount = this.downloadAllFilesProgress = null;
      },

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
          } catch (e) { this.$buefy.toast.open({ message: `Upload failed: ${rel} — ${e}`, type: 'is-danger' }); }
          if (queue.length) await runOne();
        };
        await Promise.all(Array.from({length: Math.min(concurrency, queue.length)}, runOne));
        this.$buefy.toast.open({ message: `Upload terminé (${files.length})`, type: 'is-success' });
      },

      /* Listing */
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
          if (!listBucketResult.querySelector('ListBucketResult > Delimiter')) throw Error(`Bucket URL ${config.bucketUrl} is not a valid bucket API URL, response does not contain <ListBucketResult><Delimiter> tag.`);
          const nextTok = listBucketResult.querySelector("ListBucketResult > NextContinuationToken");
          this.nextContinuationToken = nextTok && nextTok.textContent;
          const commonPrefixes = [...listBucketResult.querySelectorAll("ListBucketResult > CommonPrefixes")]
            .map(tag => ({ prefix: tag.querySelector('Prefix').textContent.removePrefix(config.rootPrefix) }))
            .filter(p => !config.keyExcludePatterns.find(rx => rx.test(p.prefix.removePrefix(config.rootPrefix))))
            .map(p => ({ type:'prefix', name: p.prefix.split('/').slice(-2)[0] + '/', prefix: p.prefix }));
          const contents = [...listBucketResult.querySelectorAll("ListBucketResult > Contents")]
            .map(tag => ({ key: tag.querySelector('Key').textContent, size: parseInt(tag.querySelector('Size').textContent), dateModified: new Date(tag.querySelector('LastModified').textContent) }))
            .filter(c => c.key !== decodeURI(this.bucketPrefix))
            .filter(c => !config.keyExcludePatterns.find(rx => rx.test(c.key.removePrefix(config.rootPrefix))))
            .map(c => {
              if (c.key.endsWith('/') && !c.size) return { type:'prefix', name: c.key.split('/').slice(-2)[0] + '/', prefix: c.key.removePrefix(config.rootPrefix) };
              const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(c.key)}`;
              let installUrl; if (url.endsWith('/manifest.plist') && devicePlatform_iOS()) installUrl = `itms-services://?action=download-manifest&url=${encodePath(url)}`;
              return { type:'content', name: c.key.split('/').slice(-1)[0], size: c.size, dateModified: c.dateModified, key: c.key, url, installUrl };
            });
          this.pathContentTableData = [...commonPrefixes, ...contents];
        } catch (error) {
          this.$buefy.notification.open({ message: (error && (error.message || error))?.toString(), type:'is-danger', duration:60000, position:'is-bottom' });
        } finally { this.isRefreshing = false; }
      },

      /* Sort + format */
      sortTableData(columnName) {
        return (a, b, isAsc) => {
          if (a.type !== b.type) return a.type === 'prefix' ? -1 : 1;
          const va = a[columnName]; const vb = b[columnName];
          if (va == null && vb == null) return 0;
          if (va == null) return isAsc ? -1 : 1;
          if (vb == null) return isAsc ? 1 : -1;
          if (typeof va === 'string' && typeof vb === 'string') return isAsc ? va.localeCompare(vb) : vb.localeCompare(va);
          if (va < vb) return isAsc ? -1 : 1;
          if (va > vb) return isAsc ? 1 : -1;
          return 0;
        };
      },
      formatBytes(size) { if (!Number.isFinite(size)) return '-'; const KB=1024, MB=1048576, GB=1073741824; if(size<KB)return size+'  B'; if(size<MB)return (size/KB).toFixed(0)+' KB'; if(size<GB)return (size/MB).toFixed(2)+' MB'; return (size/GB).toFixed(2)+' GB'; },
      formatDateTime_date(d){ return d ? moment(d).format('ddd, DD. MMM YYYY') : '-'; },
      formatDateTime_time(d){ return d ? moment(d).format('hh:mm:ss') : '-'; },
      formatDateTime_relative(d){ return d ? moment(d).fromNow() : '-'; }
    },
    mounted() {
        this.hasFflate = !!(window && window.fflate);
        window.addEventListener('hashchange', this.updatePathFromHash);
        window.addEventListener('resize', () => { this.windowWidth = window.innerWidth; });

        this.updatePathFromHash();                 // positionne pathPrefix
        if (!this.pathContentTableData.length) {   // au cas où le watcher ne se déclenche pas
            this.refresh();
        }
    },
    beforeUnmount() {
        window.removeEventListener('hashchange', this.updatePathFromHash);
        window.removeEventListener('resize', this.updatePathFromHash);
    }

  });

  app.use(Buefy.default, {defaultIconPack: 'mdi'});
  app.mount('#root');
})();
