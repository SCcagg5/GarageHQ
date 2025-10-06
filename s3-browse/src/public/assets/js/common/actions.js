/*!
 * BB.actions — Unified actions using BB.ui + BB.api + BB.detect
 * Tolerant load order: UI is resolved at call time with a native fallback.
 */
(function () {
  const BB = (window.BB = window.BB || {});
  if (!BB.detect) throw new Error("BB.detect required before BB.actions");
  if (!BB.api) throw new Error("BB.api required before BB.actions");

  function nativeUI() {
    return {
      alert({ title, message }) { window.alert((title ? title + '\n' : '') + (message || '')); return Promise.resolve(); },
      confirm({ title, message }) { const ok = window.confirm((title ? title + '\n' : '') + (message || '')); return Promise.resolve(ok); },
      prompt({ title, message, defaultValue }) { const val = window.prompt((title ? title + '\n' : '') + (message || ''), defaultValue || ''); return Promise.resolve(val); },
      toast(msg) { try { console.log('[toast]', msg); } catch {} }
    };
  }
  function getUI() { return (BB.ui ? BB.ui : nativeUI()); }

  const labels = {
    renameTitle: 'Renommer',
    renamePrompt: 'Nouveau nom :',
    deleteTitle: 'Supprimer',
    deletePrompt: 'Supprimer ce fichier ?',
    detailsTitle: 'Détails',
    folderDeletePrompt: 'Supprimer ce dossier et tout son contenu ?',
    deleteOk: 'Supprimé.',
    renameOk: 'Renommé.',
    moveTrashOk: 'Déplacé dans la corbeille.',
    deleteDenied: 'Suppression non autorisée par le proxy (DELETE 405).',
    copyDenied: 'Copie refusée (PUT) / proxy.'
  };

  async function showMetadata(key) {
    const ui = getUI();
    try {
      const { headers } = await BB.api.head(key);
      const text = JSON.stringify(headers, null, 2);
      await ui.alert({ title: `${labels.metaTitle} — ${key.split('/').pop()}`, message: text });
    } catch (e) {
      await ui.alert({ title: labels.metaTitle, message: String(e) });
    }
  }

  function fmtBytes(n) {
    const KB=1024, MB=1048576, GB=1073741824, TB=1099511627776;
    if (!Number.isFinite(n)) return '-';
    if (n<KB) return `${n} B`;
    if (n<MB) return `${(n/KB).toFixed(0)} KB`;
    if (n<GB) return `${(n/MB).toFixed(2)} MB`;
    if (n<TB) return `${(n/GB).toFixed(2)} GB`;
    return `${(n/TB).toFixed(2)} TB`;
  }

  function fmtDate(d) {
    try { return new Date(d).toISOString().replace('T',' ').replace('Z',' UTC'); } catch { return String(d||''); }
  }

  function joinPath(base, name) {
    base = String(base||'').replace(/\/{2,}/g,'/'); name = String(name||'');
    if (!base.endsWith('/')) base += '/';
    return (base + name).replace(/\/{2,}/g,'/');
  }
  function dirOf(absKey) {
    const i = absKey.lastIndexOf('/'); return i === -1 ? '' : absKey.slice(0, i+1);
  }
  function ensurePrefix(p) {
    p = (p||'').replace(/\/{2,}/g,'/').replace(/^\//,'');
    return p.endsWith('/') ? p : (p + '/');
  }
  function escapeRx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  async function showFileDetails(absKey) {
    const ui = getUI();
    try {
      const { mime, size, headers } = await BB.api.head(absKey);
      const name = absKey.split('/').pop() || absKey;
      const last = headers['last-modified'] || headers['Last-Modified'] || '';
      const etag = headers['etag'] || headers['ETag'] || '';
      const lines = [
        `Nom: ${decodeURIComponent(name)}`,
        `Chemin: ${absKey}`,
        `Taille: ${fmtBytes(size)} (${size||0} octets)`,
        `Type: ${mime || '—'}`,
        `ETag: ${etag || '—'}`,
        `Dernière modification: ${last ? fmtDate(last) : '—'}`,
        '',
        '— En-têtes HTTP —',
        JSON.stringify(headers, null, 2)
      ];
      await ui.alert({ title: `${labels.detailsTitle} — fichier`, message: lines.join('\n') });
    } catch (e) {
      await ui.alert({ title: labels.detailsTitle, message: String(e) });
    }
  }

  async function showPrefixDetails(prefixAbs) {
    const ui = getUI();
    try {
      const stat = await BB.api.stats(prefixAbs);
      // L’API renvoie des champs en minuscules/camelCase
      const bt = stat.byType || {};
      const norm = (a)=>({ count: (a && a.count) || 0, bytes: (a && a.bytes) || 0 });
      const img = norm(bt.image), vid = norm(bt.video), aud = norm(bt.audio);
      const doc = norm(bt.doc),    arc = norm(bt.archive), code = norm(bt.code), oth = norm(bt.other);

      // Top dossiers (tri client)
      const folders = Object.entries(stat.byFolder || {}).map(([name, a]) => [name, norm(a)]);
      folders.sort((a,b)=> (b[1].bytes - a[1].bytes) || a[0].localeCompare(b[0]));
      const topN = folders.slice(0, 10);

      const lines = [
        `Préfixe: ${prefixAbs || '/'}`,
        `Objets: ${stat.count}`,
        `Taille totale: ${fmtBytes(stat.totalBytes)} (${stat.totalBytes} octets)`,
        `Plus ancien: ${stat.oldest ? fmtDate(stat.oldest) : '—'}`,
        `Plus récent: ${stat.newest ? fmtDate(stat.newest) : '—'}`,
        '',
        '— Par type —',
        `images: ${img.count} — ${fmtBytes(img.bytes)}`,
        `vidéos: ${vid.count} — ${fmtBytes(vid.bytes)}`,
        `audios: ${aud.count} — ${fmtBytes(aud.bytes)}`,
        `documents: ${doc.count} — ${fmtBytes(doc.bytes)}`,
        `archives: ${arc.count} — ${fmtBytes(arc.bytes)}`,
        `code: ${code.count} — ${fmtBytes(code.bytes)}`,
        `autres: ${oth.count} — ${fmtBytes(oth.bytes)}`,
        '',
        '— Dossiers les plus volumineux —',
        ...(topN.length ? topN.map(([name,a],i)=> `${String(i+1).padStart(2,' ')}. ${name}  ${fmtBytes(a.bytes)}  (${a.count} objets)`)
                        : ['(aucun sous-dossier)']),
        '',
        `Calculé en ${stat.tookMs} ms`
      ];
      await ui.alert({ title: `${labels.detailsTitle} — dossier`, message: lines.join('\n') });
    } catch (e) {
      await ui.alert({ title: labels.detailsTitle, message: String(e) });
    }
  }

  // ----- DOSSIER (prefix) : copier / renommer / supprimer -----
  async function renamePrefix(prefixAbs) {
    const ui = getUI();
    const p = ensurePrefix(prefixAbs);
    const last = p.split('/').filter(Boolean).pop() || '';
    const parent = p.slice(0, p.length - last.length - 1); // garde le slash final
    const newName = await ui.prompt({ title: labels.renameTitle, message: labels.renamePrompt, defaultValue: last || 'nouveau-dossier' });
    if (!newName || newName === last) return false;
    const dst = ensurePrefix(parent + newName);
    try {
      await BB.api.rename({ src: p, dst, isPrefix: true });
      ui.toast(labels.renameOk);
      return dst;
    } catch (e) {
      await ui.alert({ title: labels.renameTitle, message: String(e) });
      return false;
    }
  }

  async function copyPrefix(prefixAbs) {
    const ui = getUI();
    const src = ensurePrefix(prefixAbs);
    const last = src.split('/').filter(Boolean).pop() || '';
    const parent = src.slice(0, src.length - last.length - 1);
    const newName = await ui.prompt({ title: 'Copier le dossier', message: 'Nouveau nom :', defaultValue: last + '-copy' });
    if (!newName) return false;
    const dst = ensurePrefix(parent + '/' + newName);

    try {
      const keys = await BB.api.listAll(src);
      const rx = new RegExp('^' + escapeRx(src));
      const toCopy = keys.filter(k => !k.endsWith('/')); // ignore markers éventuels
      const concurrency = 8;
      let done = 0;
      const queue = toCopy.slice();
      const runOne = async () => {
        const k = queue.shift(); if (!k) return;
        const rel = k.replace(rx, '');
        const out = dst + rel;
        try { await BB.api.copy(k, out); } catch (e) { console.error('copy fail', k, '->', out, e); }
        done++;
        if (queue.length) await runOne();
      };
      await Promise.all(Array.from({length: Math.min(concurrency, queue.length)}, runOne));
      ui.toast(`Copie dossier OK (${done} objets)`);
      return dst;
    } catch (e) {
      await ui.alert({ title: 'Copier le dossier', message: String(e) });
      return false;
    }
  }

  async function deletePrefix(prefixAbs) {
    const ui = getUI();
    const okc = await ui.confirm({ title: labels.deleteTitle, message: labels.folderDeletePrompt });
    if (!okc) return false;
    try {
      const { deleted } = await BB.api.deletePrefix(ensurePrefix(prefixAbs));
      ui.toast(`Supprimé (${deleted} objets)`);
      return true;
    } catch (e) {
      await ui.alert({ title: labels.deleteTitle, message: String(e) });
      return false;
    }
  }

  async function renameObject(absKey) {
    const ui = getUI();
    const cur = absKey.split('/').pop() || absKey;
    const base = absKey.replace(/[^/]*$/, '');
    const newName = await ui.prompt({ title: labels.renameTitle, message: labels.renamePrompt, defaultValue: cur });
    if (!newName || newName === cur) return false;
    const dst = base + newName;
    try {
      await BB.api.rename({ src: absKey, dst, isPrefix: false });
    } catch (e) {
      // fallback copy+delete (ancien comportement)
      try {
        await BB.api.copy(absKey, dst);
        const ok = await BB.api.del(absKey);
        if (!ok) await moveToTrash(absKey);
      } catch (ee) {
        await ui.alert({ title: labels.renameTitle, message: String(ee||e||labels.copyDenied) });
        return false;
      }
    }
    ui.toast(labels.renameOk);
    return dst;
  }

  async function copyObject(absKey) {
    const ui = getUI();
    const cur = absKey.split('/').pop() || absKey;
    const base = dirOf(absKey);
    const newName = await ui.prompt({ title: 'Copier', message: `Nouveau nom dans ${base}`, defaultValue: cur });
    if (!newName || newName === cur) return false;
    const dst = base + newName;
    try {
      await BB.api.copy(absKey, dst);
      ui.toast('Copie effectuée.');
      return dst;
    } catch (e) {
      await ui.alert({ title: 'Copier', message: String(e || labels.copyDenied) });
      return false;
    }
  }

  async function deleteObject(absKey) {
    const ui = getUI();
    const okc = await ui.confirm({ title: labels.deleteTitle, message: labels.deletePrompt, confirmText: 'Supprimer' });
    if (!okc) return false;
    const ok = await BB.api.del(absKey);
    if (!ok) {
      await moveToTrash(absKey);
      ui.toast(labels.moveTrashOk);
      return 'trash';
    }
    ui.toast(labels.deleteOk);
    return true;
  }

  async function moveToTrash(absKey) {
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const dst = (BB.cfg.trashPrefix || '_trash/') + ts + '/' + absKey;
    await BB.api.copy(absKey, dst);
  }

  // NEW: Download helper
  function downloadObject(absKey, filename) {
    const url = BB.api.urlForKey(absKey, { mask: true });
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || (absKey.split('/').pop() || 'download');
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  BB.actions = {
    labels,
    // Détails
    showFileDetails,
    showPrefixDetails,
    // rétro-compat: laisser showMetadata pointer vers le nouveau rendu fichier
    showMetadata: showFileDetails,
    // existants
    renameObject, copyObject, deleteObject, downloadObject, moveToTrash,
    // Dossier
    renamePrefix, copyPrefix, deletePrefix
  };
})();
