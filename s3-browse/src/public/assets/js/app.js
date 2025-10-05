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

String.prototype.removePrefix = function (prefix) { return this.startsWith(prefix) ? this.substring(prefix.length) : this; };
String.prototype.escapeHTML = function () { const t = document.createElement('span'); t.innerText = this; return t.innerHTML; };

function devicePlatform_iOS() { return /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function encodePath(path) {
  path = (path || '').replace(/\/{2,}/g, '/');
  try { if (decodeURI(path) !== path) return path; } catch (e) {}
  const m = {";":"%3B","?":"%3F",":":"%3A","@":"%40","&":"%26","=":"%3D","+":"%2B","$":"%24",",":"%2C","#":"%23"};
  return encodeURI(path).split("").map(ch => m[ch] || ch).join("");
}
function extOf(s='') { const m = /\.([^.]+)$/.exec(s.toLowerCase()); return m ? m[1] : ''; }

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
  nginx:'nginx', conf_d:'nginx',
  proto:'protobuf', thrift:'thrift',
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
  lua:'lua',
  r:'r',
  dart:'dart',
  ktm:'kotlin',
  scalahtml:'xml',
  mustache:'xml', hbs:'xml', ejs:'xml', njk:'xml', twig:'xml', jinja:'xml',
  handlebars:'xml',
  tex:'latex', latex:'latex',
  asm:'armasm', s:'armasm',
  wasm:'wasm',
  clj:'clojure', cljs:'clojure', edn:'clojure',
  erl:'erlang', ex:'elixir', exs:'elixir',
  hs:'haskell',
  ml:'ocaml', mli:'ocaml',
  pas:'pascal', pp:'pascal',
  vb:'vbnet', vbs:'vbscript',
  fs:'fsharp', fsx:'fsharp',
  adoc:'asciidoc', asciidoc:'asciidoc',
  bat:'dos', cmd:'dos',
  nojekyll:'plaintext',
  prisma:'prisma',
  zig:'zig',
  cue:'cue',
  bicep:'bicep',
  tf:'terraform', tfvars:'terraform', hcl:'terraform',
  kql:'kusto',
  sqlx:'sql',
  psql:'sql',
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
  [/r-language|x-r|/i, 'r'],
  [/text\/plain/i, 'plaintext']
];

function isImageExt(e){ return ['png','jpg','jpeg','gif','webp','bmp','svg','avif'].includes(e); }
function isPdfExt(e){ return e === 'pdf'; }
function isCodeExt(e){ return !!EXT_TO_LANG[e]; }
function langFromExt(e){ return EXT_TO_LANG[e] || 'plaintext'; }
function langFromMime(ct=''){
  const lo = (ct||'').toLowerCase();
  for (const [rx, lang] of MIME_TO_LANG) if (rx.test(lo)) return lang;
  return '';
}
function guessPreviewTypeByMime(ct=''){
  const lo = (ct||'').toLowerCase();
  if (!lo) return 'download';
  if (lo.startsWith('image/')) return 'image';
  if (lo === 'application/pdf') return 'pdf';
  if (lo === 'text/markdown' || lo === 'text/x-markdown') return 'markdown';
  if (lo.startsWith('text/')) return 'code';
  if (/(json|xml|yaml|toml|x-)?(javascript|typescript)/.test(lo)) return 'code';
  if (/shellscript|x-sh|x-bash|x-zsh/.test(lo)) return 'code';
  return 'download';
}
function guessPreviewTypeByExt(name){
  const e = extOf(name);
  if (e === 'md') return 'markdown';
  if (isImageExt(e)) return 'image';
  if (isPdfExt(e)) return 'pdf';
  if (isCodeExt(e)) return 'code';
  return 'download';
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
  const fav = document.getElementById('favicon'); if (fav && config.favicon) fav.href = config.favicon;
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
  const absTrash = (config.rootPrefix || '') + (config.trashPrefix || '_trash/');
  const rx = new RegExp('^' + absTrash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!config.keyExcludePatterns.some(r => r.toString() === rx.toString())) config.keyExcludePatterns.push(rx);
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
      hide(appEl); show(previewEl);
      const type = r.params.get('preview');
      const fileUrl = `${(config.bucketMaskUrl || config.bucketUrl).replace(/\/*$/, '')}/${encodePath(r.path)}`;
      const z = document.querySelector('#preview #preview-markdown');
      if (type === 'markdown') {
        customElements.whenDefined('zero-md').then(() => { if (!z) return; const current = z.getAttribute('src') || ''; if (current !== fileUrl) z.setAttribute('src', fileUrl); });
      } else if (type === 'image') {
        vm.setZeroMdInline(`![${r.path.split('/').pop()}](${fileUrl})`);
      } else if (type === 'pdf') {
        vm.setZeroMdInline(`<iframe src="${fileUrl}" style="width:100%;height:calc(100vh - 5rem);border:0;"></iframe>`);
      } else if (type === 'code') {
        const urlLang = r.params.get('lang');
        fetch(fileUrl)
          .then(resp => resp.ok ? resp.text() : Promise.reject(new Error(`HTTP ${resp.status}`)))
          .then(text => {
            const fallback = langFromExt(extOf(r.path)) || 'plaintext';
            const lang = urlLang || fallback;
            const md = `\`\`\`${lang}\n${text}\n\`\`\``;
            vm.setZeroMdInline(md);
          })
          .catch(err => vm.setZeroMdInline(`\`\`\`plaintext\nErreur de chargement: ${String(err)}\n\`\`\``));
      }
      const dir = (r.path || '').replace(/[^/]*$/, '');
      if (vm.pathPrefix !== dir) vm.pathPrefix = dir;
    } else {
      const z = document.querySelector('#preview #preview-markdown'); if (z && z.hasAttribute('src')) z.removeAttribute('src');
      show(appEl); hide(previewEl);
      let target = r.path || ''; if (!target && config.rootPrefix) target = config.rootPrefix;
      if (vm.pathPrefix !== target) vm.pathPrefix = target;
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
      pathBreadcrumbs() { const p = (this.pathPrefix || ''); return ['', ...(p.match(/[^/]*\//g) || [])].map((part, i, parts) => ({ name: decodeURI(part), url: '#' + parts.slice(0, i).join('') + part })); },
      cardView() { return this.windowWidth <= 768; },
      bucketPrefix() { return `${config.rootPrefix}${this.pathPrefix || ''}`; }
    },
    watch: {
      pathPrefix() { const pp = (this.pathPrefix || ''); this.previousContinuationTokens = []; this.continuationToken = undefined; this.nextContinuationToken = undefined; this.searchPrefix = pp.replace(/^.*\//, ''); this.refresh(); }
    },
    methods: {
      blurActiveElement() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); },
      moment,
      validBucketPrefix(prefix) { if (prefix === '') return true; if (prefix.startsWith(' ') || prefix.endsWith(' ')) return false; if (prefix.includes('//')) return false; if (prefix.startsWith('/') && this.bucketPrefix.includes('/')) return false; return true; },
      searchByPrefix() { if (this.validBucketPrefix(this.searchPrefix)) { const dir = (this.pathPrefix || '').replace(/[^/]*$/, ''); const nextPath = dir + this.searchPrefix; if (('#' + nextPath) !== window.location.hash) window.location.hash = nextPath; } },
      previousPage() { if (this.previousContinuationTokens.length > 0) { this.continuationToken = this.previousContinuationTokens.pop(); this.refresh(); } },
      nextPage() { if (this.nextContinuationToken) { this.previousContinuationTokens.push(this.continuationToken); this.continuationToken = this.nextContinuationToken; this.refresh(); } },
      setZeroMdInline(markdown) {
        const z = document.querySelector('#preview #preview-markdown');
        if (!z) return;

        // Forcer zero-md à utiliser le contenu inline (et non l’attribut src)
        if (z.hasAttribute('src')) z.removeAttribute('src');

        // Supprimer tout ancien contenu inline
        [...z.querySelectorAll('script[type="text/markdown"]')].forEach(s => s.remove());

        // Injecter le nouveau markdown (HTML autorisé si nécessaire)
        const s = document.createElement('script');
        s.type = 'text/markdown';
        s.textContent = String(markdown || '');
        z.appendChild(s);
      },

      async showMetadata(row) {
        try {
          const url = `${(config.bucketUrl || '/s3').replace(/\/*$/, '')}/${encodePath(row.key)}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const meta = {}; res.headers.forEach((v, k) => { meta[k] = v; });
          const text = JSON.stringify(meta, null, 2);
          this.$buefy.dialog.alert({ title: `Metadata — ${row.name || row.prefix}`, message: `<pre style="white-space:pre-wrap;margin:0">${text}</pre>`, ariaRole: 'alertdialog', ariaModal: true, dangerouslyUseHTMLString: true });
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
            const parent = row.key.replace(/[^/]*$/, '');
            const newKey = parent + newName;
            await this.copyOnly(row.key, newKey);
            const ok = await this.tryDelete(row.key);
            if (!ok) await this.moveToTrashSingle(row.key);
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
            const ok = await this.tryDelete(row.key);
            if (!ok) { await this.moveToTrashSingle(row.key); this.$buefy.toast.open({ message: `Déplacé dans la corbeille`, type: 'is-warning' }); }
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

      async downloadAllFiles() {
        const archiveFiles = this.pathContentTableData.filter(i => i.type === 'content').map(i => i.url);
        this.downloadAllFilesCount = archiveFiles.length; this.downloadAllFilesReceivedCount = 0; this.downloadAllFilesProgress = 0;
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
        const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = `${archiveName || 'archive'}.zip`; a.click(); URL.revokeObjectURL(href);
        this.downloadAllFilesCount = this.downloadAllFilesReceivedCount = this.downloadAllFilesProgress = null;
      },

      async downloadViaProxy(row) {
        try {
          const res = await fetch(row.url, { method: 'GET' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = row.name || 'download';
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(href);
        } catch (e) { this.$buefy.toast.open({ message: `Failed to download ${row.name}: ${e.message || e}`, type:'is-danger', duration:8000, position:'is-bottom' }); }
      },

      previewHref(row) {
        const dir = (this.pathPrefix || '').replace(/[^/]*$/, '');
        const t = guessPreviewTypeByExt(row.name);
        let h = `#${dir}${row.name}?preview=${t}`;
        if (t === 'code') {
          const e = extOf(row.name);
          const lang = langFromExt(e);
          if (lang) h += `&lang=${encodeURIComponent(lang)}`;
        }
        return h;
      },

      async resolveFileInfo(row){
        const fileUrl = `${(config.bucketMaskUrl || config.bucketUrl).replace(/\/*$/, '')}/${encodePath(row.key)}`;
        let ct = '';
        try { const head = await fetch(fileUrl, { method:'HEAD' }); if (head.ok) ct = head.headers.get('Content-Type') || ''; } catch {}
        let type = guessPreviewTypeByExt(row.name);
        const byMime = guessPreviewTypeByMime(ct);
        if (byMime !== 'download') type = byMime;
        let lang = 'plaintext';
        if (type === 'code') lang = langFromExt(extOf(row.name)) || langFromMime(ct) || 'plaintext';
        return { type, lang, ct };
      },

      async openPreview(row){
        const info = await this.resolveFileInfo(row);
        if (info.type === 'download') { this.downloadViaProxy(row); return; }
        const dir = (this.pathPrefix || '').replace(/[^/]*$/, '');
        let h = `#${dir}${row.name}?preview=${info.type}`;
        if (info.type === 'code' && info.lang) h += `&lang=${encodeURIComponent(info.lang)}`;
        if (('#' + h) !== window.location.hash) window.location.hash = h;
      },

      triggerUpload() { const el = this.$refs.fileInput; if (el) { el.value = ''; el.click(); } },
      async onFileInput(evt) { const files = Array.from(evt.target.files || []); if (!files.length) return; await this.uploadFiles(files, f => f.name); evt.target.value = ''; await this.refresh(); },
      triggerUploadDir() { const el = this.$refs.dirInput; if (el) { el.value = ''; el.click(); } },
      async onDirInput(evt) { const files = Array.from(evt.target.files || []); if (!files.length) return; await this.uploadFiles(files, f => f.webkitRelativePath || f.name); evt.target.value = ''; await this.refresh(); },
      async uploadFiles(files, keyResolver) {
        const base = (config.bucketUrl || '/s3').replace(/\/*$/, ''); const concurrency = 5; const queue = files.slice();
        const runOne = async () => {
          const f = queue.shift(); if (!f) return;
          const rel = keyResolver(f); const key = (this.bucketPrefix + rel).replace(/\/{2,}/g, '/');
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

  const appEl = document.getElementById('app');
  const previewEl = document.getElementById('preview');
  if (appEl && previewEl) { }
})();
