// 仅在目标组变化时回显，避免用户改选公共字段后被旧数据覆盖。
(() => {
  const app = GoalPrototype;
  let previous = null;
  const markup = () => '<div class="edit-wide edit-group-hint" id="editGroupHint" role="status"></div>';
  function refresh(force = false) {
    const form = app.$('#dform'), control = name => form.elements.namedItem(name);
    const get = name => app.editorCombobox.value(control(name));
    const catalog = app.entrySchema.catalog(), product = form.dataset.unmatchedProduct ? JSON.parse(form.dataset.unmatchedProduct) : catalog.products.find(row => [row.productCode, row.product].includes(get('product')));
    const shop = catalog.shops.find(row => [row.shopId, row.shopCode, row.shop].includes(get('shop')));
    const [year, monthNumber] = get('targetMonth').split('-').map(Number);
    const context = { ...product, year, monthNumber, cid: get('cid'), shopId: shop?.shopId };
    const ready = product && shop && year && monthNumber;
    const current = ready ? app.targetGroup.key(context) : null;
    if (!force && current === previous) return;
    previous = current;
    const hint = app.$('#editGroupHint');
    hint.textContent = '同月、同店铺、同产品共用大区、店长策略和店长推广；修改后将同步更新两种口径的全部目标，目标指标分别维护。';
    if (!ready) return;
    const group = app.targetGroup.describe(context);
    if (group.count) app.targetGroup.fields.forEach(field => app.editorCombobox.setValue(control(field), group.values[field] || '', field === 'region' ? undefined : group.names[field] || ''));
    if (group.conflicts.length) hint.textContent = `该组目标的${group.conflicts.map(field => app.targetGroup.labels[field]).join('、')}不一致，请重新指定；保存后统一更新该组。`;
    const unavailable = ['strategy', 'promotion'].filter(field => group.values[field] && !app.targetPeople.options().some(person => person.value === group.values[field]));
    if (unavailable.length) hint.textContent += ` ${unavailable.map(field => app.targetGroup.labels[field]).join('、')}原人员已不在有效人员名单中，请重新选择。`;
  }
  app.editorGroup = { markup, refresh };
})();
