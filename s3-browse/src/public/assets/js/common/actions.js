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
    metaTitle: 'Métadonnées',
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
    showMetadata, renameObject, deleteObject, downloadObject, moveToTrash
  };
})();
