(() => {
  const app = GoalPrototype;
  const { state, escape, config } = app;
  const info = (text, red = false) => `<span class="info ${red ? 'red' : ''}" data-tip="${escape(text)}" data-action="toggle-tip" tabindex="0" role="button" aria-label="${red ? '查看不合理原因' : '查看指标说明'}">${red ? '?' : 'ⓘ'}</span>`;
  const coverage = (value, reasonable) => value === null ? '--' : `<div class="cover"><div class="track ${reasonable ? '' : 'low'}"><i style="width:${Math.min(100, value)}%"></i></div><span class="percent">${value.toFixed(2)}%</span></div>`;
  const status = row => `<span class="state ${row.reasonable ? 'good' : 'bad'}">${row.reasonable ? '✓ 合理' : '× 不合理 ' + info(row.reason, true)}</span>`;
  const person = value => `<div class="pd">${escape(value.name)}<small>${escape(value.time)}</small></div>`;
  const isEntry = key => key === 'ep' || key === 'el';
  const identity = (name, code, unmatched = false) => `<span class="identity"><span title="${escape(name)}">${escape(name)}</span><small${unmatched ? ' class="product-unmatched"' : ''}>${escape(code || '—')}</small></span>`;

  function columnLabel(field, key) {
    if (field === 'month' && !isEntry(key)) return { year: '年度', quarter: '季度', month: '月份' }[state.period];
    const prefix = key === 'ep' ? '产品' : ['el', 'link'].includes(key) ? '链接' : '';
    return ['gsv', 'profit'].includes(field) ? prefix + config.labels[field] : config.labels[field];
  }

  function renderHead(key) {
    return '<tr>' + config.columns[key].map(field => {
      const tip = field === 'coverage' ? config.tips.coverage : field === 'reasonable' ? config.tips.reasonable
        : ['product', 'ep'].includes(key) && config.tags.includes(field) ? config.tips[field] : '';
      return `<th>${columnLabel(field, key)}${tip ? ' ' + info(tip) : ''}</th>`;
    }).join('') + '</tr>';
  }

  function renderCell(row, field, key, period, rowIndex) {
    if (key === 'store' && ['strategy', 'promotion'].includes(field)) return `<span class="store-people" title="${escape(row[field] || '')}">${escape(row[field] || '—')}</span>`;
    if (field === 'shop') return key === 'store' ? `<button class="text-link" data-open-shop="${escape(row.shopId)}" aria-label="查看${escape(row.shop)}的产品">${identity(row.shop, row.shopCode || row.shopId)}</button>` : identity(row.shop, row.shopCode || row.shopId);
    if (field === 'product') return key === 'product' ? `<button class="text-link" data-open-product="${escape(row.id)}" data-product-shop="${escape(row.shopId)}" aria-label="查看${escape(row.product)}的核心链接">${identity(row.product, app.targetGroup.productCaption(row), row.productMatch === 'unmatched')}</button>` : identity(row.product, app.targetGroup.productCaption(row), row.productMatch === 'unmatched');
    if (field === 'linkId') return identity(row.linkName || row.product, row.linkId);
    if (field === 'month') {
      const label = escape(isEntry(key) ? row.month : period.label);
      return `<span class="date-value" title="${label}">${label}</span>`;
    }
    if (field === 'gsv') return row.gsv.toFixed(2) + 'w';
    if (['profit', 'clickRate', 'conversionRate', 'feeRate'].includes(field)) {
      return row[field] === null ? '--' : typeof row[field] === 'number' ? row[field].toFixed(2) + '%' : escape(row[field]);
    }
    if (field === 'coverage') return coverage(row.coverage, row.reasonable);
    if (field === 'reasonable') return status(row);
    if (field === 'created' || field === 'updated') return person(row[field]);
    if (field === 'actions') return `<span class="op" data-action="edit" data-row="${rowIndex}" data-kind="${key}">✎ 修改</span><span class="op delete" data-action="delete"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M2.5 4.5h11M6 2.5h4l.5 2H5.5l.5-2ZM4 4.5l.7 9h6.6l.7-9M6.5 7v4M9.5 7v4"/></svg> 删除</span>`;
    return escape(row[field]);
  }

  function renderRows(key, rows, period = { label: '' }) {
    return rows.map((row, index) => '<tr>' + config.columns[key].map(field => {
      const cell = renderCell(row, field, key, period, index);
      return `<td>${cell}</td>`;
    }).join('') + '</tr>').join('');
  }

  function renderControl(field, key, values, choices) {
    const value = values[field] || '';
    const attribute = `data-filter="${escape(field)}"`;
    const searchHints = { 店铺: '搜索店铺名称 / ID', '产品名称（SPU）': '搜索产品名称 / SPU码', 核心链接ID: '搜索链接名称 / ID', 店长策略: '搜索店长策略姓名', 店长推广: '搜索店长推广姓名' };
    if (!isEntry(key) && searchHints[field]) return `<input class="input" type="search" ${attribute} value="${escape(value)}" placeholder="${searchHints[field]}" autocomplete="off" maxlength="100">`;
    if (field === '一盘货' && isEntry(key)) return `<span class="radio-filter">${['', '是', '否'].map(option => `<label><input type="radio" name="cargo_${key}" ${attribute} value="${option}" ${value === option ? 'checked' : ''}>${option || '全部'}</label>`).join('')}</span>`;
    const options = choices[field] || config.options[field];
    if (options) return `<select class="select" ${attribute}><option value="">全部</option>` + options.map(option => {
      const id = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      return `<option value="${escape(id)}" ${value === id ? 'selected' : ''}>${escape(label)}</option>`;
    }).join('') + '</select>';
    return `<input class="input" ${attribute} value="${escape(value)}" placeholder="请输入" maxlength="100">`;
  }

  function renderFilters(key, { values = {}, choices = {}, overview = false } = {}) {
    const filters = config.filters[key].map(field => {
      if (overview && field === '产品类型') {
        const valuesByKey = Object.fromEntries(app.productTypeFilter.groups.map(group => [group.key, values[group.field] || '']));
        const inputs = app.productTypeFilter.groups.map(group => `<input type="hidden" data-filter="${group.field}" value="${escape(values[group.field] || '')}">`).join('');
        return `<div class="fl">${app.productTypeFilter.trigger('overviewProductType', valuesByKey)}${inputs}</div>`;
      }
      const label = overview && field === '产品名称（SPU）' ? '产品名称' : overview && field === '核心链接ID' ? '核心链接' : field;
      return field === '一盘货' && isEntry(key)
        ? `<div class="fl"><span>${label}</span>${renderControl(field, key, values, choices)}</div>`
        : `<label class="fl"><span>${label}${overview && field === '合理性' ? ' ' + info('按所选月/季/年逐期判断，任一期不合理即计入；同一店铺同一产品只计一次，未填报期间不单独算异常。年视图按全年累计判断。') : ''}</span>${renderControl(field, key, values, choices)}</label>`;
    }).join('');
    const entryActions = isEntry(key) ? `<button class="btn primary" data-action="add" data-kind="${key}">＋ 新增</button><button class="btn primary" data-action="import">⇧ 批量导入</button>` : '';
    const queryActions = config.filters[key].length
      ? `<span class="actions">${overview ? '' : '<button class="btn primary">查询</button>'}<button class="btn" ${overview ? 'data-overview-action="reset"' : ''}>重置</button></span>`
      : '';
    const scopeButtons = ['一类不含 CID', '一类含 CID'].map(value => `<button class="${state.cid === value ? 'on' : ''}" data-action="scope" data-scope="${value}">${value.replace(' ', '')}</button>`).join('');
    return filters + queryActions + (overview ? '' : `<span class="right">${entryActions}<span class="cid">${scopeButtons}</span></span>`);
  }

  const pagination = count => `<div class="pager">共 ${count} 条 <span class="pages"><button class="pg">‹</button><button class="pg on">1</button><button class="pg">›</button></span><select class="select" style="min-width:95px"><option>50条/页</option></select></div>`;
  app.components = { renderHead, renderRows, renderFilters, pagination, identity, renderCell };
})();
