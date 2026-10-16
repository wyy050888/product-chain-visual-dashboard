(() => {
  const app = GoalPrototype, { $, $$, state, entryView: view } = app;
  let year = 2026, size = 20, timer, composing = false;
  const currentMonth = () => new Date().getMonth() + 1;
  const memory = { product: { months: [currentMonth()], filters: {}, page: 1, sorting: null, scroll: 0 }, link: { months: [currentMonth()], filters: {}, page: 1, sorting: null, scroll: 0 } };
  const nameFields = new Set(['product', 'shop']);
  const timeFields = new Set(['created', 'updated']);
  const defaultSorting = { field: 'updated', direction: -1 };
  const timestamp = value => Date.parse((value?.time || '').replaceAll('/', '-').replace(' ', 'T')) || 0;
  const nameOrder = new Intl.Collator('zh-CN-u-co-pinyin', { numeric: true, sensitivity: 'base' });
  const current = () => memory[state.entryTab];
  const context = () => ({ year, monthNumber: current().months.includes(currentMonth()) ? currentMonth() : Math.max(...current().months), monthList: [...current().months], cid: state.cid, ...current().filters });
  const records = () => current().months.flatMap(monthNumber => app.targetStore.read(state.entryTab, { year, monthNumber, cid: state.cid }));
  const record = id => records().find(row => row.recordKey === id);
  function notify(text, { type = 'default' } = {}) {
    const notice = $('#entryNotice');
    notice.dataset.type = type;
    notice.replaceChildren();
    if (type === 'success') {
      const icon = document.createElement('span');
      icon.className = 'notice-success-icon';
      icon.setAttribute('aria-hidden', 'true');
      notice.append(icon);
    }
    const message = document.createElement('span');
    message.textContent = text;
    notice.append(message);
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => notice.replaceChildren(), 4500);
  }
  function refresh() { render(); app.overviewPeriod.sync(); app.overview.render(); }
  function render({ filters = true } = {}) {
    clearTimeout(timer);
    const selected = current();
    let rows = view.filter(records(), selected.filters);
    const sorting = selected.sorting || defaultSorting;
    const { field, direction } = sorting;
    // 时间只比较日期、不比较人员；相同值保持原始顺序，先排序再分页。
    rows.sort((a, b) => (nameFields.has(field)
      ? nameOrder.compare(a[field] || '', b[field] || '')
      : timeFields.has(field) ? timestamp(a[field]) - timestamp(b[field])
      : field === 'month' ? (a.year * 12 + a.monthNumber) - (b.year * 12 + b.monthNumber)
      : a[field] - b[field]) * direction);
    selected.page = Math.max(1, Math.min(selected.page, Math.ceil(rows.length / size)));
    $('#entryYear').innerHTML = [...new Set([...app.targetStore.years(), year])].sort((a, b) => a - b).map(value => `<option>${value}</option>`).join('');
    $('#entryYear').value = year;
    $('#entryScope').innerHTML = ['一类不含 CID', '一类含 CID'].map(cid => `<button data-action="scope" data-scope="${cid}" class="${state.cid === cid ? 'on' : ''}">${cid.replace(' ', '')}</button>`).join('');
    $$('[data-et]').forEach(button => { button.classList.toggle('on', button.dataset.et === state.entryTab); button.setAttribute('aria-selected', String(button.dataset.et === state.entryTab)); });
    $('#entryAdd').dataset.kind = state.entryTab === 'product' ? 'ep' : 'el';
    $('#entryAdd').textContent = state.entryTab === 'product' ? '新增产品目标' : '新增链接目标';
    if (filters) { app.entryFilterPanels.close(); $('#entryDynamicFilters').innerHTML = view.filters(state.entryTab, selected.filters); composing = false; }
    app.entryFilterPanels.sync();
    $('#ehead').innerHTML = view.head(state.entryTab, sorting);
    $('#entryTable .entry-table').dataset.kind = state.entryTab;
    $('#ebody').innerHTML = view.body(state.entryTab, rows.slice((selected.page - 1) * size, selected.page * size));
    $('#epage').innerHTML = view.pager(rows.length, selected.page, size, app.model.summarize(rows));
    $('#entryTable').setAttribute('aria-busy', 'false');
  }
  function switchTab(kind, values) {
    if (kind === state.entryTab && !values) return;
    current().scroll = $('#entryTable').scrollLeft;
    state.entryTab = kind;
    if (values) Object.assign(current(), { filters: values, page: 1, sorting: null, scroll: 0 });
    render(); $('#entryTable').scrollLeft = current().scroll; $('#entryTable').scrollTop = 0;
  }
  function showLinks(row) {
    memory.link.months = [row.monthNumber];
    switchTab('link', { shop: row.shopCode, shopId: row.shopId, product: row.product, productIdentity: app.targetGroup.productKey(row) });
  }
  function init() {
    app.entryFilterPanels.init({
      get: () => ({ year, months: current().months, filters: current().filters }),
      change: update => {
        if (update.months) current().months = update.months;
        if (update.year) year = update.year;
        if (update.filters) Object.assign(current().filters, update.filters);
        current().page = 1; render({ filters: false }); $('#entryTable').scrollTop = 0;
      },
    });
    $$('[data-et]').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.et)));
    $('#entry').addEventListener('change', event => {
      if (event.target.id === 'entryYear') year = Number(event.target.value);
      else if (event.target.id === 'entryPageSize') size = Number(event.target.value);
      else if (event.target.matches('select[data-ef]')) {
        current().filters[event.target.dataset.ef] = event.target.value;
        if (event.target.dataset.ef === 'region') { delete current().filters.brand; delete current().filters.channel; }
        if (event.target.dataset.ef === 'brand') delete current().filters.channel;
      } else return;
      current().page = 1; render(); $('#entryTable').scrollTop = 0;
    });
    const input = event => {
      if (!event.target.matches('input[data-ef]') || composing || event.isComposing) return;
      const field = event.target.dataset.ef;
      current().filters[field] = event.target.value.trim();
      if (field === 'shop') delete current().filters.shopId;
      if (field === 'product') { delete current().filters.productCode; delete current().filters.productIdentity; }
      current().page = 1; clearTimeout(timer);
      $('#entryTable').setAttribute('aria-busy', 'true');
      if (!event.target.value.trim()) render({ filters: false }); else timer = setTimeout(() => render({ filters: false }), 250);
    };
    $('#efilters').addEventListener('input', input);
    $('#efilters').addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
    $('#efilters').addEventListener('compositionend', event => { composing = false; input(event); });
    $('#efilters').addEventListener('keydown', event => { if (event.key === 'Enter' && !composing && !event.isComposing) { event.preventDefault(); render({ filters: false }); } });
    $('#entry').addEventListener('click', event => {
      const product = event.target.closest('[data-entry-product]');
      if (product) { const row = record(product.dataset.entryProduct); if (row) showLinks(row); return; }
      const sort = event.target.closest('[data-entry-sort]');
      if (sort) {
        const old = current().sorting || defaultSorting, field = sort.dataset.entrySort;
        const firstDirection = nameFields.has(field) || field === 'month' ? 1 : -1;
        current().sorting = old?.field !== field ? { field, direction: firstDirection }
          : old.direction === firstDirection ? { field, direction: -firstDirection } : null;
        current().page = 1;
        render({ filters: false });
        $('#entryTable').scrollTop = 0;
        $(`[data-entry-sort="${field}"]`).focus({ preventScroll: true });
        return;
      }
      const page = event.target.closest('[data-entry-page]');
      if (page && !page.disabled) { current().page = Number(page.dataset.entryPage); render(); $('#entryTable').scrollTop = 0; }
      if (event.target.closest('[data-entry-action="reset"]')) { year = new Date().getFullYear(); Object.assign(current(), { months: [currentMonth()], filters: {}, sorting: null, page: 1 }); render(); }
    });
    render();
  }
  app.entry = { render, init, context, record, refresh, notify, showLinks, switchTab };
})();
