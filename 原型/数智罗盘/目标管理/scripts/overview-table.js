(() => {
  const app = GoalPrototype;
  const { escape, components, config } = app;
  const { linkMetrics, summaryMetrics } = config;
  const basic = Object.fromEntries(['whole', 'wholeBrand', 'wholeCategory', 'wholeChannel', 'region', 'regionCategory', 'regionChannel', 'brand', 'brandCategory', 'store', 'product', 'link', 'dabo'].map(key => [key, config.columns[key].filter(field => !linkMetrics.includes(field))]));
  const title = (key, field) => field === 'name' ? ({ whole: '大区', wholeBrand: '品牌', wholeCategory: '类目', wholeChannel: '渠道', region: '品牌', regionCategory: '类目', regionChannel: '渠道', brand: '渠道', brandCategory: '类目', dabo: '大区' }[key]) : field === 'gsv' ? '目标GSV' : field === 'profit' ? '目标利润率' : field === 'linkId' ? '核心链接' : config.labels[field];
  const pin = (field, key) => field === basic[key][0] ? ' pinned first-col' : field === 'shop' && ['product', 'link'].includes(key) ? ' pinned second-col' : '';
  const missing = '<span class="missing info" tabindex="0" data-action="toggle-tip" data-tip="该期间未设置目标" aria-label="该期间未设置目标">—</span>';
  function status(row, label) {
    const tip = `${label} · ${row.reasonable ? '合理' : '不合理'}\n产品目标：${row.gsv.toFixed(2)}w\n链接目标合计：${row.linkedGsv.toFixed(2)}w\n覆盖率：${row.coverage == null ? '—' : row.coverage.toFixed(2) + '%'}\n${row.coverage == null ? '无法计算覆盖率' : row.reasonable ? '覆盖率达到70%' : '覆盖率低于70%'}`;
    const details = { period: label, reasonable: row.reasonable, gsv: row.gsv, linkedGsv: row.linkedGsv, coverage: row.coverage };
    return `<span class="info target-status ${row.reasonable ? 'good' : 'red'}" data-tip="${escape(tip)}" data-tip-details="${escape(JSON.stringify(details))}" data-action="toggle-tip" tabindex="0" role="button" aria-label="${escape(label)}${row.reasonable ? '合理' : '不合理'}，查看覆盖率">${row.reasonable ? '✓' : '!'}</span>`;
  }
  function renderHead(key, buckets, sorting) {
    const metrics = key === 'link' ? linkMetrics : summaryMetrics;
    const bases = basic[key].map(field => `<th rowspan="2" class="base-${field}${pin(field, key)}">${title(key, field)}${config.tags.includes(field) ? ` <span class="info" tabindex="0" role="button" data-action="toggle-tip" data-tip="${escape(config.tips[field])}" aria-label="查看${title(key, field)}说明">ⓘ</span>` : ''}</th>`).join('');
    const groups = buckets.map(bucket => `<th colspan="${metrics.length}" class="period-group">${escape(bucket.label)}</th>`).join('');
    const cols = buckets.map((bucket, index) => metrics.map(field => {
      const sortable = ['gsv', 'profit'].includes(field);
      const active = sorting?.bucket === index && sorting.field === field;
      const nextSort = !active ? '降序' : sorting.direction === -1 ? '升序' : '取消排序';
      const sortLabel = `${title(key, field)}：${nextSort}${key === 'link' ? nextSort === '取消排序' ? '，恢复产品分组' : '，按全部链接排序' : ''}`;
      return `<th class="metric-head" ${sortable ? `aria-sort="${active ? sorting.direction === 1 ? 'ascending' : 'descending' : 'none'}"` : ''}>${sortable ? `<button data-sort-field="${field}" data-sort-bucket="${index}" title="${sortLabel}" aria-label="${escape(bucket.label)} ${sortLabel}">${title(key, field)} <span class="sort-mark">${active ? sorting.direction === 1 ? '↑' : '↓' : '↕'}</span></button>` : title(key, field)}</th>`;
    }).join('')).join('');
    return `<tr>${bases}${groups}</tr><tr>${cols}</tr>`;
  }
  function renderRows(key, rows, buckets, { grouped = false } = {}) {
    const metrics = key === 'link' ? linkMetrics : summaryMetrics;
    // 仅合并当前页连续的同店铺、同SPU；排序或翻页后重新计算跨度。
    const productSpans = [];
    if (key === 'link') {
      let start = 0;
      rows.forEach((row, index) => {
        if (index === 0 || app.overviewData.linkGroup(row) !== app.overviewData.linkGroup(rows[index - 1])) {
          start = index; productSpans[index] = 1;
        } else {
          productSpans[start]++; productSpans[index] = 0;
        }
      });
    }
    return rows.map((row, rowIndex) => {
      const bases = basic[key].map(field => {
        const span = key === 'link' && field === 'product' ? productSpans[rowIndex] : 1;
        if (span === 0) return '';
        const content = field === 'name' ? key === 'dabo' || app.overviewDimensions.supports(key) ? escape(row.name) : `<button class="text-link" data-open-node="${escape(row.path)}">${escape(row.name)}<span class="drill-arrow">›</span></button>` : components.renderCell(row, field, key, {}, 0);
        return `<td${span > 1 ? ` rowspan="${span}"` : ''} class="base-${field}${pin(field, key)}">${content}</td>`;
      }).join('');
      const cells = buckets.map((bucket, index) => metrics.map(field => {
        const cell = row.cells[index];
        if (key === 'link' && bucket.months.length > 1 && ['clickRate', 'conversionRate', 'feeRate'].includes(field)) return '';
        const span = key === 'link' && bucket.months.length > 1 && field === 'rank' ? ' colspan="4"' : '';
        let value = missing;
        if (cell) {
          if (key === 'link' && !['gsv', 'profit'].includes(field) && bucket.months.length > 1) {
            value = `<button class="text-link month-detail" data-month-detail="${escape(row.linkId)}" data-detail-product="${escape(row.productId)}" data-detail-shop="${escape(row.shopId)}">查看月度</button>`;
          } else {
            value = components.renderCell(cell, field, key, {}, 0);
            if (key === 'product' && field === 'gsv') value += ' ' + status(cell, bucket.label);
          }
        }
        return `<td${span} class="metric-cell ${span ? 'monthly-detail-cell' : ''} ${field === 'gsv' ? 'period-start' : ''}">${value}</td>`;
      }).join('')).join('');
      const boundary = grouped && rowIndex > 0 && app.overviewData.linkGroup(row) !== app.overviewData.linkGroup(rows[rowIndex - 1]);
      return `<tr${boundary ? ' class="link-group-start"' : ''}>${bases}${cells}</tr>`;
    }).join('');
  }
  function colspan(key, buckets) { return basic[key].length + buckets.length * (key === 'link' ? 6 : 2); }
  function renderSummary(key, totals) {
    if (key === 'link') return '';
    const bases = basic[key].map((field, index) => `<td class="base-${field}${pin(field, key)}">${index === 0 ? '<span title="当前筛选条件下全部记录的汇总，不受分页影响">汇总</span>' : ''}</td>`).join('');
    const cells = totals.map(row => summaryMetrics.map(field => `<td class="metric-cell ${field === 'gsv' ? 'period-start' : ''}">${row ? components.renderCell(row, field, key, {}, 0) : '—'}</td>`).join('')).join('');
    return `<tr class="summary-row">${bases}${cells}</tr>`;
  }
  app.overviewTable = { renderHead, renderRows, renderSummary, colspan };
})();
