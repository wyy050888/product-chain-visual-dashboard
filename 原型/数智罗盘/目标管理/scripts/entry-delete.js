(() => {
  const app = GoalPrototype, { $, escape: esc } = app;
  let row, kind, revision, opener;
  function open(nextRow) {
    if (!nextRow) return;
    row = nextRow; kind = app.state.entryTab; revision = app.targetStore.version(); opener = document.activeElement;
    const blocked = kind === 'product' && app.targetStore.children(row).length > 0;
    $('#deleteIdentity').innerHTML = `<strong>${esc(row.product)}</strong><span>${esc(row.month)} · ${esc(row.cid.replace(' ', ''))}</span><span>${esc(row.shop)} · ${esc(row.shopCode)}</span>${kind === 'link' ? `<span>${esc(row.linkName)} · ${esc(row.linkId)}</span>` : ''}`;
    $('#deleteError').textContent = blocked ? '该产品目标下存在产品链接目标，请先删除关联产品链接目标。' : '确认删除这条目标？删除后将同步更新总览。';
    $('#confirmDelete').hidden = Boolean(blocked); $('#deleteLinks').hidden = !blocked;
    $('#refDelete').showModal();
  }
  function close() { $('#refDelete').close(); opener?.focus(); }
  function init() {
    $('#refDelete [data-close-dialog]').addEventListener('click', close);
    $('#deleteLinks').addEventListener('click', () => { close(); app.entry.showLinks(row); });
    $('#confirmDelete').addEventListener('click', () => {
      try { app.targetStore.remove(kind, row, revision); close(); app.entry.refresh(); app.entry.notify('删除成功'); }
      catch (error) { $('#deleteError').textContent = error.message; }
    });
  }
  app.entryDelete = { open, init };
})();
