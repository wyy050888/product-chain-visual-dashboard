(() => {
  const app = GoalPrototype;
  // 只绑定一次公共动作。页面模块负责各自 Tab、周期和表单状态。
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    switch (target.dataset.action) {
      case 'toggle-tip': app.tooltips.toggle(target); break;
      case 'scope':
        app.state.cid = target.dataset.scope;
        app.overview.refreshContext();
        app.entry.render();
        break;
      case 'add':
      case 'edit': {
        const edit = target.dataset.action === 'edit';
        const kind = target.dataset.kind;
        const row = edit ? app.entry.record(target.dataset.rowKey) : undefined;
        if (edit && !row) break;
        app.editor.open(kind === 'el' ? 'link' : 'product', row, app.entry.context());
        break;
      }
      case 'import': app.entryImport.open(); break;
      case 'history': app.history.open(target.dataset.rowKey ? app.entry.record(target.dataset.rowKey) : null); break;
      case 'delete': app.entryDelete.open(app.entry.record(target.dataset.rowKey)); break;
    }
  });
  app.tooltips.init();
  app.tree.init();
  app.overview.init();
  app.entry.init();
  app.dabo.init();
  app.editor.init();
  app.entryDelete.init();
  app.entryImport.init();
  app.history.init();
  app.periodPicker.init();
  app.goalConsumption.init();
})();
