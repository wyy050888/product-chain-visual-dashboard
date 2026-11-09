(() => {
  const app = GoalPrototype, { $, escape: esc } = app;
  let kind, original, values, revision, snapshot, opener;
  const read = () => {
    const data = Object.fromEntries([...$('#dform').elements].filter(input => input.name).map(input => [input.name, app.editorCombobox.value(input)]));
    if ('targetMonth' in data) {
      [data.year, data.monthNumber] = data.targetMonth.split('-');
      delete data.targetMonth;
    }
    return data;
  };
  const isLink = () => kind === 'link';
  const fingerprint = () => JSON.stringify([...$('#dform').elements].filter(el => el.name).map(el => [el.name, app.editorCombobox.value(el)]));
  const label = key => {
    const text = app.entrySchema.fields(kind).find(field => field[0] === key)?.[1] || key;
    return ['gsv', 'profit'].includes(key) ? text.replace(/（.*）$/, '') : text;
  };
  const field = (key, control) => `<label class="edit-field"><span><b class="req">*</b>${label(key)}</span>${control}<small data-error="${key}"></small></label>`;
  const input = (key, extra = '') => {
    const control = `<input name="${key}" value="${esc(values[key] ?? '')}" ${extra} aria-describedby="edit-${key}-error">`;
    return field(key, ['gsv', 'profit'].includes(key) ? `<span class="edit-unit-input">${control}<span aria-hidden="true">${key === 'gsv' ? 'w' : '%'}</span></span>` : control);
  };
  const productTagFields = () => `<div class="edit-product-tags">${[['newTag', '新品/清仓品'], ['sharedStock', '一盘货'], ['selectedProduct', '一类自选品']].map(([key, text]) => `<label class="edit-field"><span>${text}</span><input data-product-tag="${key}" value="${esc(original?.[key] || '')}" readonly placeholder="自动带出" tabindex="-1"></label>`).join('')}</div>`;
  function syncProductTags() {
    if (original || kind !== 'product') return;
    const data = read(), catalog = app.entrySchema.catalog();
    const products = catalog.products.filter(row => [row.product, row.productCode].includes(data.product.trim()));
    const product = products.length === 1 ? products[0] : null;
    const tags = app.entrySchema.productTags(product);
    $('#dform [name="brand"]').value = product?.brand || '';
    $('#dform').querySelectorAll('[data-product-tag]').forEach(control => { control.value = tags[control.dataset.productTag]; });
  }
  function syncChannel() {
    const shop = app.entrySchema.catalog().shops.find(row => [row.shop, row.shopCode, row.shopId].includes(read().shop.trim()));
    values.shopId = shop?.shopId;
    values.channel = shop?.channel || '';
    $('#dform [name="channel"]').value = values.channel;
  }
  function identityOptions() {
    $('#editProducts').innerHTML = app.entrySchema.catalog().products.map(row => `<option value="${esc(row.productCode)}">${esc(row.product)}</option>`).join('');
    syncProductTags(); app.editorCombobox.refresh();
  }
  function comboOptions(name) {
    const catalog = app.entrySchema.catalog();
    if (['strategy', 'promotion'].includes(name)) return app.targetPeople.options();
    if (name === 'product') return catalog.products.map(row => ({ value: row.productCode, label: row.product, code: row.productCode }));
    if (name === 'shop') return catalog.shops.map(row => ({ value: row.shopCode, label: row.shop, code: row.shopCode, channel: row.channel }));
    return [];
  }
  function productAttribution(catalog) {
    return `${app.regionConfig.field(values.region)}${input('brand', 'readonly placeholder="选择产品后自动带出"')}
      ${input('shop', 'list="editShops" autocomplete="off" placeholder="搜索店铺名称 / ID"')}${input('channel', 'readonly placeholder="选择店铺后自动带出"')}
      <datalist id="editShops">${catalog.shops.map(row => `<option value="${row.shopCode}">${esc(row.shop)}</option>`).join('')}</datalist>
      ${app.targetPeople.field('strategy', values.strategyId || values.strategy, values.strategy)}${app.targetPeople.field('promotion', values.promotionId || values.promotion, values.promotion)}`;
  }
  function productIdentity(catalog) {
    const locked = original ? 'disabled' : '';
    const identity = `<label class="edit-field edit-wide"><span><b class="req">*</b>月份</span><input name="targetMonth" type="month" min="1900-01" max="9999-12" value="${values.year}-${String(values.monthNumber).padStart(2, '0')}" ${locked} aria-describedby="edit-monthNumber-error"><small data-error="monthNumber"></small><small data-error="year"></small></label>
        <div class="edit-wide">${input('product', `list="editProducts" autocomplete="off" placeholder="搜索产品名称 / SPU码" ${locked}`)}</div><datalist id="editProducts"></datalist>`;
    return `<div class="edit-grid">${identity}${productTagFields()}${productAttribution(catalog)}${app.editorGroup.markup()}</div>`;
  }
  function render() {
    if (isLink()) { app.editorLinks.render(values, original); snapshot = fingerprint(); return; }
    const catalog = app.entrySchema.catalog();
    const identity = productIdentity(catalog);
    $('#dform').innerHTML = identity + `<div class="edit-grid edit-metrics">${app.entrySchema.metrics[kind].map(key => app.editorMetrics.render(key, values[key] ?? '')).join('')}</div>`;
    if (kind === 'product') identityOptions();
    $('#dform').querySelectorAll('[data-error]').forEach(el => { el.id = `edit-${el.dataset.error}-error`; });
    app.editorCombobox.attach($('#drawer'), comboOptions);
    app.editorGroup.refresh(true);
    snapshot = fingerprint();
  }
  function open(nextKind, row, context) {
    app.editorCombobox.detach();
    kind = nextKind; original = row; revision = app.targetStore.version(); opener = document.activeElement;
    $('#dform').dataset.unmatchedProduct = row?.productMatch === 'unmatched' ? JSON.stringify({ product: row.product, brand: row.brand, productCode: '', productMatch: 'unmatched' }) : '';
    const now = app.clock.parts();
    values = row ? { ...row } : { year: now.year, monthNumber: now.month, cid: context.cid, shopId: context.shopId, productCode: context.productCode, shop: context.shopId ? app.fixtures.shops[context.shopId].shopCode : '', product: context.productCode || '' };
    if (row) { values.shop = row.shopCode; values.product = row.productMatch === 'unmatched' ? row.product : row.productCode; }
    if (values.shopId && !row) {
      const shop = app.fixtures.shops[values.shopId];
      Object.assign(values, { channel: shop.channel }, { shop: shop.shopCode });
    }
    $('#dtitle').textContent = `${row ? '修改' : '新增'}${kind === 'product' ? '产品目标' : '产品链接目标'}`;
    $('#editScope').innerHTML = `<select name="cid" form="dform" class="select edit-scope-select" aria-label="目标口径" ${row ? 'disabled' : ''}>${['一类不含 CID', '一类含 CID'].map(cid => `<option value="${cid}" ${values.cid === cid ? 'selected' : ''}>${cid.replace(' ', '')}</option>`).join('')}</select>`;
    $('#editError').textContent = ''; $('#discardEdit').close();
    render(); $('#drawer').showModal(); $('#dtitle').focus({ preventScroll: true });
  }
  function close(force = false) {
    app.periodPicker.close();
    app.editorCombobox.close();
    if (!force && fingerprint() !== snapshot) {
      if (!$('#discardEdit').open) $('#discardEdit').showModal();
      $('#discardCancel').focus();
      return;
    }
    $('#discardEdit').close();
    $('#drawer').close(); opener?.focus();
  }
  function save() {
    if (isLink()) {
      try {
        $('#saveTarget').disabled = true;
        const records = app.editorLinks.save(revision);
        if (!records) return;
        app.state.cid = records[0].cid;
        close(true); app.entry.refresh(); app.entry.notify(original ? '修改成功' : `成功新增 ${records.length} 条产品链接目标`);
      } catch (error) { $('#editError').textContent = error.message; }
      finally { $('#saveTarget').disabled = false; }
      return;
    }
    const submitted = { ...values, ...read() };
    if (kind === 'product') {
      const catalog = app.entrySchema.catalog();
      const shop = catalog.shops.find(row => [row.shop, row.shopCode, row.shopId].includes(submitted.shop));
      const product = catalog.products.find(row => [row.product, row.productCode].includes(submitted.product));
      submitted.shopId = shop?.shopId; submitted.productCode = product?.productCode;
    }
    const result = app.entrySchema.normalize(kind, submitted, { preserveUnmatched: original?.productMatch === 'unmatched' });
    if (original) Object.assign(result.record, app.entrySchema.productTags(original));
    $('#dform').querySelectorAll('[data-error]').forEach(el => { el.textContent = result.errors[el.dataset.error] || ''; });
    $('#dform').querySelectorAll('[name]').forEach(el => el.setAttribute('aria-invalid', String(Boolean(el.name === 'targetMonth' ? result.errors.year || result.errors.monthNumber : result.errors[el.name]))));
    app.editorCombobox.refresh();
    $('#editError').textContent = '';
    if (Object.keys(result.errors).length) { $('#editError').textContent = '请检查并修正标红字段'; $('#dform [aria-invalid="true"]:not([hidden])')?.focus(); return; }
    try {
      $('#saveTarget').disabled = true;
      if (original && kind === 'product') app.targetStore.updateProduct(original, result.record, revision);
      else app.targetStore.put(kind, result.record, Boolean(original), revision);
      if (!original && kind === 'product') app.state.cid = result.record.cid;
      close(true); app.entry.refresh(); app.entry.notify(original ? '修改成功' : '新增成功');
    } catch (error) { $('#editError').textContent = error.message; }
    finally { $('#saveTarget').disabled = false; }
  }
  function init() {
    const drawer = $('#drawer');
    let backdropPressed = false;
    const onBackdrop = event => {
      const bounds = drawer.getBoundingClientRect();
      return event.target === drawer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    };
    // 按下和释放都在遮罩上才关闭，避免从表单内拖动到外侧时误触。
    drawer.addEventListener('pointerdown', event => { backdropPressed = event.button === 0 && onBackdrop(event); });
    drawer.addEventListener('pointercancel', () => { backdropPressed = false; });
    $('#drawer').addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('#drawer').addEventListener('click', event => {
      const dismiss = backdropPressed && onBackdrop(event);
      backdropPressed = false;
      if (dismiss || event.target.closest('[data-close-editor]')) close();
    });
    $('#discardConfirm').addEventListener('click', () => close(true));
    $('#discardCancel').addEventListener('click', () => $('#discardEdit').close());
    $('#discardEdit').addEventListener('cancel', event => { event.preventDefault(); $('#discardEdit').close(); });
    $('#saveTarget').addEventListener('click', save);
    $('#dform').addEventListener('submit', event => { event.preventDefault(); save(); });
    $('#dform').addEventListener('click', event => { if (isLink()) app.editorLinks.click(event); });
    $('#drawer').addEventListener('input', event => {
      if (isLink()) { if (event.target.name) app.editorLinks.sync(event.target.name); return; }
      if (['product', 'shop'].includes(event.target.name)) syncProductTags();
      if (kind === 'product' && event.target.name === 'shop') syncChannel();
      if (['product', 'shop'].includes(event.target.name)) app.editorGroup.refresh();
    });
    $('#drawer').addEventListener('change', event => {
      if (isLink()) { if (event.target.name) app.editorLinks.sync(event.target.name); return; }
      if (original && kind === 'product' && event.target.name === 'shop') syncChannel();
      if (['shop', 'product', 'targetMonth', 'cid'].includes(event.target.name)) app.editorGroup.refresh();
      if (original || !['shop', 'product', 'targetMonth', 'cid'].includes(event.target.name)) return;
      Object.assign(values, read());
      if (event.target.name === 'shop') syncChannel();
      identityOptions();
    });
  }
  app.editor = { open, close, init };
})();
