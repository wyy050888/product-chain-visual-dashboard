(() => {
  const app = GoalPrototype, { escape: esc, components } = app;
  const filterFields = {
    product: ['product', 'shop', 'strategy', 'promotion', 'region', 'brand', 'channel', 'productType'],
    link: ['product', 'shop', 'linkId', 'strategy', 'promotion', 'region', 'brand', 'channel'],
  };
  const labels = { ...app.config.labels, product: '产品名称', linkId: '核心链接', sharedStock: '一盘货', channel: '渠道' };
  const searches = { shop: '搜索店铺名称 / ID', product: '搜索产品名称 / SPU码', linkId: '搜索链接名称 / ID', strategy: '搜索店长策略姓名', promotion: '搜索店长推广姓名' };
  function choices(field, values) {
    const shops = [...app.entrySchema.catalog().shops, ...app.targetStore.attributions()].filter(row => (!values.region || row.region === values.region) && (field === 'brand' || !values.brand || row.brand === values.brand));
    if (field === 'region') return app.regionConfig.list().map(row => row.name);
    if (['brand', 'channel'].includes(field)) return [...new Set(shops.map(row => row[field]))];
    return { newTag: ['新品', '清仓品'], sharedStock: ['是', '否'], selectedProduct: ['自选品', '承流品'] }[field] || [];
  }
  function filters(kind, values) {
    const fields = filterFields[kind].map(field => field === 'productType'
      ? `<div class="fl">${app.productTypeFilter.trigger("entryProductType", values)}</div>`
      : `<label class="fl"><span>${labels[field]}</span>${searches[field]
      ? `<input type="search" class="input" data-ef="${field}" value="${esc(values[field] || '')}" placeholder="${searches[field]}" autocomplete="off">`
      : `<select class="select" data-ef="${field}"><option value="">全部</option>${choices(field, values).map(value => `<option ${values[field] === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>`}</label>`).join('');
    return fields;
  }
  function filter(rows, values) {
    return rows.filter(row => Object.entries(values).every(([field, value]) => {
      if (!value) return true;
      if (field === 'productIdentity') return app.targetGroup.productKey(row) === value;
      if (field === 'shopId' || field === 'productCode') return row[field] === value;
      if (!searches[field]) return row[field] === value;
      const keys = field === 'shop' ? ['shop', 'shopCode', 'shopId'] : field === 'product' ? ['product', 'productCode'] : field === 'linkId' ? ['linkId', 'linkName'] : [field];
      return keys.some(key => String(row[key] || '').toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
    }));
  }
  const columns = kind => app.config.columns[kind === 'product' ? 'ep' : 'el'];
  const columnClass = field => `entry-${field}${field === 'actions' ? ' entry-fixed' : ''}`;
  const columnLabels = {
    product: { product: '产品名称(SPU)', gsv: '产品目标GSV(w)', profit: '产品目标利润率(%)', created: '创建时间', updated: '更新时间' },
    link: { linkId: '核心链接ID', created: '创建时间', updated: '更新时间' },
  };
  const columnLabel = (kind,field) => columnLabels[kind][field] || (field === 'actions' ? '操作' : field === 'product' ? '产品名称（SPU）' : ['gsv', 'profit'].includes(field) ? (kind === 'product' ? '产品' : '链接') + app.config.labels[field] : labels[field]);
  function head(kind, sorting) {
    return '<tr>' + columns(kind).map(field => {
      const label = columnLabel(kind,field);
      const active = sorting?.field === field, sortable = ['month', 'product', 'shop', 'created', 'updated'].includes(field) || app.entrySchema.metrics[kind].includes(field);
      const tip = app.config.tags.includes(field) ? `<span class="info" data-action="toggle-tip" data-tip="${esc(app.config.tips[field])}" tabindex="0" role="button" aria-label="查看${label}说明">ⓘ</span>` : '';
      return `<th class="${columnClass(field)}" ${sortable ? `aria-sort="${active ? sorting.direction === 1 ? 'ascending' : 'descending' : 'none'}"` : ''}>${sortable ? `<button data-entry-sort="${field}">${label}<span aria-hidden="true">${active ? sorting.direction === 1 ? '↑' : '↓' : '↕'}</span></button>` : label + tip}</th>`;
    }).join('') + '</tr>';
  }
  function body(kind, rows) {
    if (!rows.length) return `<tr><td colspan="${columns(kind).length}" class="empty-state">暂无符合条件的目标</td></tr>`;
    return rows.map(row => '<tr>' + columns(kind).map(field => {
      let content = components.renderCell(row, field, kind === 'product' ? 'ep' : 'el', {}, 0);
      if (field === 'product' && kind === 'product') content = `<button class="text-link" data-entry-product="${esc(row.recordKey)}">${content}</button>`;
      if (field === 'actions') content = `<button class="text-link" data-action="edit" data-row-key="${esc(row.recordKey)}" data-kind="${kind === 'product' ? 'ep' : 'el'}">修改</button><button class="text-link delete" data-action="delete" data-row-key="${esc(row.recordKey)}">删除</button><button class="text-link" data-action="history" data-row-key="${esc(row.recordKey)}">变更记录</button>`;
      return `<td class="${columnClass(field)} ${app.entrySchema.metrics[kind].includes(field) ? 'entry-number' : ''} ${['gsv', 'profit'].includes(field) ? 'entry-key-metric' : ''}">${content}</td>`;
    }).join('') + '</tr>').join('');
  }
  function pager(count, page, size, summary) {
    const pages = Math.max(1, Math.ceil(count / size));
    const totals = `<div class="entry-summary" role="group" aria-label="当前筛选结果汇总"><span class="summary-item"><span class="summary-label">目标GSV</span><strong data-entry-total="gsv">${summary.gsv.toFixed(2)}w</strong></span><span class="summary-divider" aria-hidden="true"></span><span class="summary-item" title="按目标GSV加权计算"><span class="summary-label">目标利润率</span><strong data-entry-total="profit">${summary.profit == null ? '—' : summary.profit.toFixed(2) + '%'}</strong></span></div>`;
    return `<div class="pager">${totals}<div class="entry-pagination"><span>共 ${count} 条</span><button class="pg" data-entry-page="${page - 1}" aria-label="填报上一页" ${page === 1 ? 'disabled' : ''}>‹</button><span>${page} / ${pages}</span><button class="pg" data-entry-page="${page + 1}" aria-label="填报下一页" ${page === pages ? 'disabled' : ''}>›</button><select class="select" id="entryPageSize" aria-label="填报每页条数">${[10, 20, 50].map(value => `<option value="${value}" ${size === value ? 'selected' : ''}>${value}条/页</option>`).join('')}</select></div></div>`;
  }
  app.entryView = { filters, filter, choices, head, body, pager, columnLabel, filterLabels:labels, searches };
})();
