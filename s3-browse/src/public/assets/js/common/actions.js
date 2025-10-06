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
    deleteOk: 'Supprimé.',
    renameOk: 'Renommé.',
    moveTrashOk: 'Déplacé dans la corbeille.',
    deleteDenied: 'Suppression non autorisée par le proxy (DELETE 405).',
    copyDenied: 'Renommage non autorisé (COPY/PUT refusé).'
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

  async function renameObject(absKey) {
    const ui = getUI();
    const cur = absKey.split('/').pop() || absKey;
    const base = absKey.replace(/[^/]*$/, '');
    const newName = await ui.prompt({ title: labels.renameTitle, message: labels.renamePrompt, defaultValue: cur });
    if (!newName || newName === cur) return false;
    const dst = base + newName;
    try {
      await BB.api.copy(absKey, dst);
    } catch {
      await ui.alert({ title: labels.renameTitle, message: labels.copyDenied });
      return false;
    }
    const ok = await BB.api.del(absKey);
    if (!ok) await moveToTrash(absKey);
    ui.toast(labels.renameOk);
    return dst;
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
    renameObject, deleteObject, downloadObject, moveToTrash
  };
})();
