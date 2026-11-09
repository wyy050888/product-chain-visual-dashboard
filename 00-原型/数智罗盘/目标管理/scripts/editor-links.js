(() => {
  const app = GoalPrototype, { $ , escape: esc } = app;
  let values, cards, nextId, parent, original, contextKey;
  const metrics = app.entrySchema.metrics.link;
  const people = ['strategy', 'promotion'];
  const cardFields = ['linkId', ...metrics];
  const control = name => $('#dform').elements.namedItem(name);
  const get = name => app.editorCombobox.value(control(name));
  const scope = () => ({ year: Number(values.year), monthNumber: Number(values.monthNumber), cid: values.cid });
  const targets = () => app.targetStore.read('product', scope());
  const products = () => app.entrySchema.catalog().products;
  const productTargets = () => targets().filter(row => app.targetGroup.productKey(row) === app.targetGroup.productKey(values));
  const shops = () => {
    const preferred = new Set(productTargets().map(row => row.shopId));
    return app.entrySchema.catalog().shops.map(row => ({ ...row, hasTarget: preferred.has(row.shopId) }))
      .sort((a, b) => Number(b.hasTarget) - Number(a.hasTarget));
  };
  const selectedShop = () => app.entrySchema.catalog().shops.find(row => row.shopId === values.shopId);
  const ready = () => Boolean((values.productCode || original?.productMatch === 'unmatched') && selectedShop());
  // 店铺下方的产品目标文字仅供查看；本次归属与人员来自用户填写。
  const identity = () => ({ ...selectedShop(), ...(original?.productMatch === 'unmatched' ? { product: original.product, productCode: '', brand: original.brand, productMatch: 'unmatched' } : products().find(row => row.productCode === values.productCode)), shopId: values.shopId, region: values.region, ...Object.fromEntries(people.map(role => [role, values[role]])) });
  const selectionKey = () => JSON.stringify([Number(values.year), Number(values.monthNumber), values.cid, values.productCode, values.shopId]);
  const links = () => app.entrySchema.catalog().links.filter(row => row.shopId === values.shopId);
  const existing = () => app.targetStore.read('link', scope()).filter(row => row.shopId === values.shopId && (!original || app.targetStore.key(row) !== app.targetStore.key(original)));
  const blank = () => ({ id: nextId++, linkId: '', ...Object.fromEntries(metrics.map(key => [key, ''])) });
  const field = (name, label, placeholder) => `<label class="edit-field edit-wide"><span class="edit-label-row"><span class="edit-label-text"><b class="req">*</b>${label}</span>${name === 'shop' ? '<span id="linkShopHint" class="edit-inline-hint"></span>' : ''}</span><input name="${name}" value="${esc(values[name] || '')}" list="linkEditorOptions" placeholder="${placeholder}" ${original && name === 'product' ? 'disabled' : ''} autocomplete="off" aria-label="${label}" aria-describedby="edit-${name}-error${name === 'shop' ? ' linkShopHint' : ''}"><small id="edit-${name}-error" data-error="${name}"></small></label>`;
  function capture() {
    values.region = get('region');
    people.forEach(role => { values[role] = get(role); });
    values.product = get('product'); values.shop = get('shop'); values.cid = get('cid');
    [values.year, values.monthNumber] = get('targetMonth').split('-');
    cards.forEach(card => cardFields.forEach(key => { card[key] = get(`${key}_${card.id}`); }));
  }
  function options(name) {
    if (people.includes(name)) return app.targetPeople.options();
    if (name === 'product') return products().map(row => ({ value: row.productCode, label: row.product, code: row.productCode }));
    if (name === 'shop') return shops().map(row => ({ value: row.shopCode, label: row.shop, code: row.shopCode, channel: row.channel, group: row.hasTarget ? '已拆解产品目标' : '其他店铺' }));
    return [];
  }
  function cardMarkup(card, index) {
    return `<section class="edit-link-card" data-link-card="${card.id}">
      <div class="edit-link-heading"><h3>核心链接 ${index + 1}</h3>${cards.length > 1 ? `<button type="button" class="text-link" data-remove-link="${card.id}">移除</button>` : ''}</div>
      <div class="edit-field"><span><b class="req">*</b>核心链接</span><input type="hidden" name="linkId_${card.id}" value="${esc(card.linkId)}"><button type="button" class="edit-link-select" data-pick-link="${card.id}" aria-haspopup="dialog" aria-controls="linkPicker" aria-describedby="edit-linkId_${card.id}-error"></button><small id="edit-linkId_${card.id}-error" data-error="linkId_${card.id}"></small></div>
      <div class="edit-grid edit-link-metrics">${metrics.map(key => app.editorMetrics.render(key, card[key], `_${card.id}`)).join('')}</div>
    </section>`;
  }
  function renderCards() {
    app.editorCombobox.detach();
    $('#linkTargetCards').innerHTML = cards.map(cardMarkup).join('');
    app.editorCombobox.attach($('#drawer'), options);
    updateSummary();
  }
  function updateSummary() {
    cards.forEach(card => {
      const row = links().find(row => row.linkId === card.linkId), button = $(`[data-pick-link="${card.id}"]`);
      button.innerHTML = `<span>${row ? `${esc(row.linkName)}<small>ID：${esc(row.linkId)}</small>` : original ? '请选择核心链接' : '请选择核心链接，支持批量添加'}</span><span>${row ? '更换' : '选择链接'}</span>`;
      button.disabled = !ready();
      button.setAttribute('aria-invalid', control(`linkId_${card.id}`).getAttribute('aria-invalid') || 'false');
    });
    control('brand').value = original?.productMatch === 'unmatched' ? original.brand : products().find(row => row.productCode === values.productCode)?.brand || '';
    control('channel').value = selectedShop()?.channel || '';
    const rows = existing();
    $('#linkParentSummary').hidden = !parent;
    $('#linkParentSummary').innerHTML = parent
      ? `<span>产品目标：</span>${[['GSV', `${Number(parent.gsv).toFixed(2)}w`], ['利润率', `${Number(parent.profit).toFixed(2)}%`]].map(([label, value]) => `<span>${label}：${esc(value)}</span>`).join('')}`
      : '';
    const remaining = links().length - rows.length;
    $('#linkEditorHint').textContent = !ready() ? '先选择产品和目标店铺' : !links().length ? '该店铺暂无链接' : !remaining ? '该店铺下暂无可新增目标的链接；已有目标请在列表中修改。' : '';
    $('#linkEditorHint').hidden = Boolean(original) || !$('#linkEditorHint').textContent;
    $('#addCoreLink').disabled = !ready() || cards.filter(card => card.linkId).length >= remaining;
    $('#linkTargetCards').querySelectorAll('input').forEach(input => { input.disabled = !ready(); });
    $('#linkShopHint').textContent = '已拆解产品目标的店铺优先';
  }
  function sync(name) {
    capture();
    const error = [...$('#dform').querySelectorAll('[data-error]')].find(el => el.dataset.error === name);
    if (error) error.textContent = '';
    control(name)?.setAttribute('aria-invalid', 'false');
    $('#editError').textContent = '';
    if (!['product', 'shop', 'targetMonth', 'cid'].includes(name)) { updateSummary(); return; }
    const previous = contextKey;
    const product = original?.productMatch === 'unmatched' ? original : products().find(row => [row.productCode, row.product].includes(values.product));
    values.productCode = product?.productCode;
    if (!product && ['targetMonth', 'cid'].includes(name)) { values.product = ''; control('product').value = ''; }
    const available = shops();
    let shop = available.find(row => [row.shopId, row.shopCode, row.shop].includes(values.shop));
    if (!shop && !values.shop && name !== 'shop' && productTargets().length === 1) {
      shop = available.find(row => row.shopId === productTargets()[0].shopId);
      values.shop = shop.shopCode; control('shop').value = values.shop;
    }
    values.shopId = shop?.shopId;
    parent = productTargets().find(row => row.shopId === values.shopId);
    contextKey = selectionKey();
    if (previous !== contextKey) {
      // 联动期间保留正在输入的控件及焦点，只清除失效链接目标。
      cards = [original ? { ...cards[0], linkId: '' } : { ...blank(), id: cards[0].id }];
      $('#linkTargetCards').querySelectorAll('[data-link-card]').forEach((el, index) => { if (index) el.remove(); });
      $('#linkTargetCards [data-remove-link]')?.remove();
      (original ? ['linkId'] : cardFields).forEach(key => { control(`${key}_${cards[0].id}`).value = ''; });
    }
    updateSummary(); app.editorCombobox.refresh();
    app.editorGroup.refresh();
    $('#editError').textContent = '';
    $('#dform [data-error="product"]').textContent = '';
    $('#dform [data-error="shop"]').textContent = '';
  }
  function render(initial, record = null) {
    original = record;
    values = initial; cards = []; nextId = 0; parent = null;
    values.productCode = products().find(row => row.productCode === values.product)?.productCode;
    const shop = shops().find(row => row.shopId === values.shopId) || (productTargets().length === 1 ? productTargets()[0] : null);
    values.shop = shop?.shopCode || ''; values.shopId = shop?.shopId;
    parent = productTargets().find(row => row.shopId === values.shopId);
    contextKey = selectionKey();
    cards.push(original ? { ...blank(), linkId: original.linkId, ...Object.fromEntries(metrics.map(key => [key, original[key]])) } : blank());
    app.editorCombobox.detach();
    $('#dform').innerHTML = `<div class="edit-grid">
      <label class="edit-field edit-wide"><span><b class="req">*</b>月份</span><input name="targetMonth" type="month" value="${values.year}-${String(values.monthNumber).padStart(2, '0')}" ${original ? 'disabled' : ''} aria-describedby="edit-targetMonth-error"><small id="edit-targetMonth-error" data-error="targetMonth"></small></label>
      ${field('product', '产品名称（SPU）', '搜索产品名称 / SPU码')}
      <div class="edit-wide">${field('shop', '目标店铺', '搜索店铺名称 / ID')}<div id="linkParentSummary" class="edit-parent-hint" aria-label="产品目标信息"></div></div>
      <div class="edit-link-attribution edit-wide">
        ${app.regionConfig.field(values.region)}
        <label class="edit-field"><span>品牌</span><input name="brand" readonly placeholder="选择产品后自动带出"><small data-error="brand"></small></label>
        <label class="edit-field"><span>渠道</span><input name="channel" readonly placeholder="选择店铺后自动带出"><small data-error="channel"></small></label>
      </div>
      <div class="edit-grid edit-wide">${people.map(role => app.targetPeople.field(role, original ? original[`${role}Id`] || original[role] : values[role] || '', original?.[role])).join('')}</div>
      ${app.editorGroup.markup()}
      <datalist id="linkEditorOptions"></datalist>
    </div><div class="edit-link-section"><div class="edit-section-heading"><h3>链接目标</h3><span id="linkEditorHint" class="edit-inline-hint"></span></div><div id="linkTargetCards"></div><button type="button" id="addCoreLink" class="btn" ${original ? 'hidden' : ''}>＋ 批量选择核心链接</button></div>`;
    renderCards();
    app.editorGroup.refresh(true);
  }
  function click(event) {
    const remove = event.target.closest('[data-remove-link]');
    const pick = event.target.closest('[data-pick-link]');
    if (!remove && !pick && event.target.id !== 'addCoreLink') return;
    capture();
    if (!remove) { openPicker(pick ? Number(pick.dataset.pickLink) : null); return; }
    cards = cards.filter(card => card.id !== Number(remove.dataset.removeLink));
    renderCards();
    $('#editError').textContent = '';
  }
  function openPicker(cardId) {
    if (!ready()) return;
    const current = cards.find(card => card.id === cardId);
    const single = Boolean(original || current?.linkId);
    const saved = new Set(existing().map(row => row.linkId));
    const added = new Set(cards.filter(card => card !== current).map(card => card.linkId));
    const period = scope();
    const inSelectedShop = row => row.shopId === values.shopId;
    const reported = new Set(app.targetStore.read('link', period).filter(inSelectedShop).map(row => row.linkId));
    const previous = new Set(app.targetStore.read('link', { ...period, year: period.monthNumber === 1 ? period.year - 1 : period.year, monthNumber: period.monthNumber === 1 ? 12 : period.monthNumber - 1 }).filter(inSelectedShop).map(row => row.linkId));
    app.linkPicker.open({ parent: identity(), single, selected: single && current?.linkId ? [current.linkId] : [],
      rows: links().map(row => ({ ...row, previousReported: previous.has(row.linkId), currentReported: reported.has(row.linkId), added: added.has(row.linkId), disabledReason: saved.has(row.linkId) ? '本月已填报' : added.has(row.linkId) ? '本次已添加' : '' })),
      onConfirm(ids) {
        // 仅确认时写回卡片；取消不新增空卡，已有指标保持原值。
        if (single) current.linkId = ids[0];
        else ids.forEach(id => {
          const target = cards.find(card => !card.linkId) || blank();
          target.linkId = id;
          if (!cards.includes(target)) cards.push(target);
        });
        renderCards(); $('#editError').textContent = '';
        const target = single ? current : cards.find(card => card.linkId === ids[0]);
        control(`gsv_${target.id}`).focus();
      }
    });
  }
  function save(revision) {
    capture();
    const errors = {}, records = [], used = new Set(existing().map(row => row.linkId));
    const validMonth = /^\d{4}$/.test(values.year) && Number(values.year) >= 1900 && Number(values.year) <= 9999 && /^(0?[1-9]|1[0-2])$/.test(values.monthNumber);
    if (!validMonth) errors.targetMonth = '请选择有效月份（1900—9999年）';
    if (original?.productMatch !== 'unmatched' && !products().some(row => row.productCode === values.product)) errors.product = '请选择有效产品';
    if (!selectedShop()) errors.shop = '请选择有效店铺';
    cards.forEach(card => {
      // 所有卡片共用表单人员；每条记录保存同一组人员ID。
      const { id, ...metricsAndLink } = card;
      const result = app.entrySchema.normalize('link', { ...identity(), ...scope(), ...metricsAndLink }, { preserveUnmatched: original?.productMatch === 'unmatched' });
      if (original && values.shopId === original.shopId) Object.assign(result.record, app.entrySchema.productTags(original));
      ['region', 'brand', 'channel', ...people].forEach(key => { if (result.errors[key]) errors[key] = result.errors[key]; });
      cardFields.forEach(key => { if (result.errors[key]) errors[`${key}_${id}`] = result.errors[key]; });
      if (used.has(card.linkId)) errors[`linkId_${id}`] = '该核心链接已有目标或已在本次添加';
      used.add(card.linkId); records.push(result.record);
    });
    $('#dform').querySelectorAll('[data-error]').forEach(el => { el.textContent = errors[el.dataset.error] || ''; });
    $('#dform').querySelectorAll('[name]').forEach(el => el.setAttribute('aria-invalid', String(Boolean(errors[el.name]))));
    app.editorCombobox.refresh();
    updateSummary();
    if (Object.keys(errors).length) {
      $('#editError').textContent = '请检查并修正标红字段';
      $('#dform [aria-invalid="true"]:not([disabled]):not([type="hidden"])')?.focus(); return null;
    }
    if (original) app.targetStore.updateLink(original, records[0], revision);
    else app.targetStore.addLinks(records, revision);
    return records;
  }
  app.editorLinks = { render, sync, click, save };
})();
