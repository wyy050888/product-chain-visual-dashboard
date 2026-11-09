(() => {
  const { $, $$, state, escape, overviewQuery: query, overviewPeriod: period, overviewTable: table, overviewData: data } = GoalPrototype;
  let filters = {}, page = 1, pageSize = 20, sorting = null, displayedRows = [];
  let productDrill = false;
  const tabMemory = {};
  const dimensionTabs = { region: 'region', brand: 'brand' };
  const tableKey = () => state.level === 'whole' ? state.overviewTab : state.level === 'channel' ? state.shopTab : dimensionTabs[state.level] || state.level;
  function saveTab() { tabMemory[tableKey()] = { filters: { ...filters }, page, sorting, scroll: $('#overviewTable').scrollLeft }; }
  function switchRootTab(key) {
    saveTab();
    if (state.level === 'whole') state.overviewTab = key;
    else dimensionTabs[state.level] = key;
    const saved = tabMemory[key];
    filters = { ...saved?.filters }; page = saved?.page || 1; sorting = saved?.sorting || null;
    period.close(); render();
    $('#overviewTable').scrollLeft = saved?.scroll || 0;
    $('#overviewTable').scrollTop = 0;
  }
  function selectNode(previousLevel) {
    if (state.level in dimensionTabs) dimensionTabs[state.level] = state.level;
    if (!(previousLevel === 'channel' && state.level === 'channel')) state.shopTab = 'store';
    Object.keys(tabMemory).forEach(key => delete tabMemory[key]);
    filters = {}; page = 1; sorting = null;
    productDrill = false;
    period.close(); render(); $('#overviewTable').scrollLeft = 0; $('#overviewTable').scrollTop = 0;
  }
  function refreshContext() { page = 1; render(); }
  function switchTab(key, values) {
    const restoreProduct = productDrill && state.shopTab === 'link' && key === 'product' && !values;
    productDrill = false;
    saveTab();
    const previousShop = filters.店铺;
    const previousShopId = filters.shopId;
    if (state.level === 'whole') state.overviewTab = key;
    else if (state.level in dimensionTabs) dimensionTabs[state.level] = key;
    else state.shopTab = key;
    const saved = tabMemory[key];
    filters = values || { ...saved?.filters };
    if (!values && !restoreProduct) {
      if (previousShop) filters.店铺 = previousShop; else delete filters.店铺;
      if (previousShopId) filters.shopId = previousShopId; else delete filters.shopId;
    }
    page = values ? 1 : saved?.page || 1;
    sorting = saved?.sorting || null;
    period.close(); render();
    $('#overviewTable').scrollLeft = saved?.scroll || 0;
    $('#overviewTable').scrollTop = 0;
  }
  function renderSummary(shops, context, rows) {
    let total = state.level === 'dabo' ? GoalPrototype.daboData.summary(context) : GoalPrototype.model.rows('whole', context)[0];
    const dimensions = GoalPrototype.overviewDimensions.supports(tableKey());
    if (dimensions) total = GoalPrototype.model.summarize(rows);
    const daboRows = tableKey() === 'whole' ? GoalPrototype.daboData.filled(context) : [];
    if (daboRows.length) total = GoalPrototype.model.summarize([total, ...daboRows]);
    const status = state.level === 'dabo' ? {} : GoalPrototype.model.treeStatus(context);
    const metric = (label, value, unit) => `<span class="summary-item"><span class="summary-label">${label}</span><span class="summary-value"><strong>${value == null ? '—' : value.toFixed(2)}</strong>${value == null ? '' : `<span class="summary-unit">${unit}</span>`}</span></span>`;
    $('#channelSummary').classList.remove('hidden');
    $('#channelSummary').innerHTML = `<div class="summary-metrics">${metric('目标GSV', shops.length || daboRows.length ? total.gsv : null, 'w')}<span class="summary-divider" aria-hidden="true"></span>${metric('目标利润率', total.profit, '%')}</div>` + (state.level === 'channel' && state.shopTab !== 'link' && status.abnormalCount ? `<button class="summary-alert" data-overview-action="abnormal">${status.abnormalCount} 个产品不合理</button>` : '');
  }
  function render({ preserveFilters = false } = {}) {
    if (preserveFilters) query.cancelPending(); else query.resetInput();
    GoalPrototype.tooltips.hide(); period.sync();
    GoalPrototype.tree.sync();
    const key = tableKey(), context = period.context(), buckets = period.buckets();
    const shops = state.level === 'dabo' ? GoalPrototype.daboData.filled(context) : GoalPrototype.model.rows('store', context);
    if (sorting && sorting.bucket >= buckets.length) sorting = null;
    const peopleFilters = { strategy: filters.店长策略 || '', promotion: filters.店长推广 || '' };
    const rowContext = Object.values(peopleFilters).some(Boolean) ? { ...context, peopleFilters } : context;
    const allRows = data.rows(key, rowContext, buckets);
    const rows = data.sort(query.filter(allRows, filters), sorting, key);
    page = Math.max(1, Math.min(page, Math.ceil(rows.length / pageSize)));
    $('#vtitle').innerHTML = state.path.split('/').map((name, index, parts) => index === parts.length - 1 ? `<strong>${escape(name)}</strong>` : `<button class="text-link" data-open-node="${escape(parts.slice(0, index + 1).join('/'))}">${escape(name)}</button><span class="path-divider">/</span>`).join('');
    $('#otabs').classList.toggle('hidden', state.level !== 'channel');
    const dimensionOptions = GoalPrototype.overviewDimensions.tabs[state.level];
    const dimensionContainer = $('#overviewRootTabs');
    dimensionContainer.classList.toggle('hidden', !dimensionOptions);
    if (dimensionOptions) dimensionContainer.setAttribute('aria-label', state.path.split('/').at(-1) + '汇总维度');
    if (dimensionOptions && dimensionContainer.dataset.level !== state.level) {
      dimensionContainer.dataset.level = state.level;
      dimensionContainer.innerHTML = dimensionOptions.map(([value, label]) => `<button class="tab" data-root-tab="${value}" role="tab" aria-selected="false" aria-controls="overviewTable">${label}</button>`).join('');
    }
    $$('[data-root-tab]').forEach(tab => {
      const selected = tab.dataset.rootTab === key;
      tab.classList.toggle('on', selected); tab.setAttribute('aria-selected', String(selected));
    });
    $$('[data-st]').forEach(tab => { tab.classList.toggle('on', tab.dataset.st === state.shopTab); tab.setAttribute('aria-selected', String(tab.dataset.st === state.shopTab)); });
    $('#overviewScope').innerHTML = ['一类不含 CID', '一类含 CID'].map(value => `<button class="${state.cid === value ? 'on' : ''}" data-action="scope" data-scope="${value}">${value.replace(' ', '')}</button>`).join('');
    $('#overviewScope').classList.toggle('hidden', key === 'dabo');
    renderSummary(shops, context, allRows);
    if (!preserveFilters) query.renderFilters(key, filters);
    $('#ofilters').classList.toggle('hidden', GoalPrototype.config.filters[key].length === 0);
    $('#ohead').innerHTML = table.renderHead(key, buckets, sorting);
    $('#osummary').innerHTML = rows.length && key !== 'link' ? table.renderSummary(key, data.totals(rows, buckets)) : '';
    displayedRows = rows.slice((page - 1) * pageSize, page * pageSize);
    $('#obody').innerHTML = rows.length ? table.renderRows(key, displayedRows, buckets, { grouped: key === 'link' && !sorting }) : `<tr><td colspan="${table.colspan(key, buckets)}" class="empty-state">${allRows.length ? '暂无符合条件的数据，请调整筛选条件' : '当前范围暂无已填报目标'}</td></tr>`;
    $('#opage').innerHTML = query.pager(rows.length, page, pageSize, key === 'link' ? '条链接' : '条');
    $('#overviewTable').setAttribute('aria-busy', 'false');
    GoalPrototype.tree.refresh(context);
  }
  function init() {
    $('#overviewRootTabs').addEventListener('click', event => {
      const tab = event.target.closest('[data-root-tab]');
      if (tab && tab.dataset.rootTab !== tableKey()) switchRootTab(tab.dataset.rootTab);
    });
    $('#overviewRootTabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('[data-root-tab]'), current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); tabs[next].click();
    });
    $('#otabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('[data-st]'), current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); tabs[next].click();
    });
    $$('[data-st]').forEach(tab => tab.addEventListener('click', () => { if (state.shopTab !== tab.dataset.st) switchTab(tab.dataset.st); }));
    $('#overview').addEventListener('click', event => {
      const node = event.target.closest('[data-open-node]');
      if (node) { GoalPrototype.tree.select(node.dataset.openNode); return; }
      const shop = event.target.closest('[data-open-shop]');
      if (shop) {
        const id = shop.dataset.openShop;
        switchTab('product', { 店铺: GoalPrototype.fixtures.shops[id].shopCode || id, shopId: id }); return;
      }
      const product = event.target.closest('[data-open-product]');
      if (product) {
        const row = displayedRows.find(row => row.id === product.dataset.openProduct && row.shopId === product.dataset.productShop);
        if (row) {
          // 上层产品下钻到实际渠道的链接页，沿用同店同产品筛选。
          if (state.level !== 'channel') GoalPrototype.tree.select(['一类电商', row.region, row.brand, row.channel].join('/'));
          switchTab('link', { 店铺: row.shopCode || row.shopId, shopId: row.shopId, '产品名称（SPU）': row.productCode || row.product, productId: row.id });
          productDrill = true;
          $('#overviewTable').scrollLeft = 0;
          $('[data-st="link"]').focus();
        }
        return;
      }
      const detail = event.target.closest('[data-month-detail]');
      if (detail) {
        const row = displayedRows.find(row => row.linkId === detail.dataset.monthDetail && row.shopId === detail.dataset.detailShop && row.productId === detail.dataset.detailProduct);
        if (row) GoalPrototype.linkMonthly.open(row, period.context());
        return;
      }
      const sort = event.target.closest('[data-sort-field]');
      if (sort) {
        const field = sort.dataset.sortField, bucket = Number(sort.dataset.sortBucket);
        const current = sorting?.field === field && sorting.bucket === bucket;
        sorting = current && sorting.direction === 1 ? null : { field, bucket, direction: current ? 1 : -1 };
        page = 1; render(); $(`#ohead [data-sort-field="${field}"][data-sort-bucket="${bucket}"]`).focus(); return;
      }
      const paging = event.target.closest('[data-page]');
      if (paging && !paging.disabled) { page = Number(paging.dataset.page); render(); $('#overviewTable').scrollTop = 0; return; }
      const action = event.target.closest('[data-overview-action]')?.dataset.overviewAction;
      if (!action) return;
      if (action === 'reset') { filters = {}; sorting = null; }
      if (action === 'abnormal') { switchTab('product', { 合理性: '不合理' }); return; }
      page = 1; render();
    });
    query.initLiveFilters((values, field, commit) => {
      const shopId = field === '店铺' ? undefined : filters.shopId;
      const productId = ['店铺', '产品名称（SPU）'].includes(field) ? undefined : filters.productId;
      filters = { ...values, ...(shopId ? { shopId } : {}), ...(productId ? { productId } : {}) };
      page = 1;
      $('#overviewTable').setAttribute('aria-busy', String(!commit));
      if (commit) { render({ preserveFilters: true }); $('#overviewTable').scrollTop = 0; }
    });
    $('#opage').addEventListener('change', event => { if (event.target.id === 'overviewPageSize') { pageSize = Number(event.target.value); page = 1; render(); } });
    GoalPrototype.linkMonthly.init();
    period.init(() => { page = 1; sorting = null; render(); $('#overviewTable').scrollLeft = 0; });
    render();
  }
  GoalPrototype.overview = { render, init, selectNode, refreshContext, rangeLabel: period.label, periodFactor: period.factor };
})();
