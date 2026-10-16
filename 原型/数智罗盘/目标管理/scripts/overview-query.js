(() => {
  const { $, $$ } = GoalPrototype;
  const fields = { 店铺: 'shopId', 店长策略: 'strategy', 店长推广: 'promotion', 合理性: 'reasonable', '产品名称（SPU）': 'product', '新品/清仓品': 'newTag', 一盘货: 'sharedStock', 一类自选品: 'selectedProduct', 产品类目: 'category', 核心链接ID: 'linkId' };
  const partial = new Set(['店铺', '产品名称（SPU）', '核心链接ID', '店长策略', '店长推广']);
  let searchTimer, composing = false;
  function cancelPending() { clearTimeout(searchTimer); searchTimer = null; }
  function resetInput() { cancelPending(); composing = false; }
  function read() {
    const values = {};
    $$('#ofilters [data-filter]').forEach(input => {
      if (input.type !== 'radio' || input.checked) values[input.dataset.filter] = input.value.trim();
    });
    return values;
  }
  function filter(rows, values) {
    return rows.filter(row => Object.entries(values).every(([field, value]) => {
      if (!value) return true;
      if (field === 'shopId') return row.shopId === value;
      if (field === 'productId') return row.productId === value;
      if (field === '合理性') return row.reasonable === (value === '合理');
      if (field === '店铺') return [row.shop, row.shopCode, row.shopId].some(part => String(part ?? '').toLocaleLowerCase().includes(value.toLocaleLowerCase()));
      const extra = field === '产品名称（SPU）' ? row.productCode : field === '核心链接ID' ? row.linkName : '';
      const actual = String(row[fields[field]] ?? '') + (extra ? ' ' + extra : '');
      return partial.has(field) ? actual.toLocaleLowerCase().includes(value.toLocaleLowerCase()) : actual === value;
    }));
  }
  function pager(count, page, size, unit = '条') {
    const total = Math.max(1, Math.ceil(count / size));
    return `<div class="pager"><span>共 ${count} ${unit}</span><span class="pages">
      <button class="pg" data-page="${page - 1}" aria-label="上一页" ${page <= 1 ? 'disabled' : ''}>‹</button>
      <span class="page-count">${page} / ${total}</span>
      <button class="pg" data-page="${page + 1}" aria-label="下一页" ${page >= total ? 'disabled' : ''}>›</button></span>
      <select class="select" id="overviewPageSize" aria-label="每页条数">${[10, 20, 50].map(value => `<option value="${value}" ${value === size ? 'selected' : ''}>${value}条/页</option>`).join('')}</select></div>`;
  }
  function renderFilters(key, values) {
    GoalPrototype.productTypeFilter.close();
    $('#ofilters').dataset.kind = key;
    $('#ofilters').innerHTML = GoalPrototype.components.renderFilters(key, {
      values, overview: true,
    });
    GoalPrototype.productTypeFilter.sync("overviewProductType");
  }
  function initLiveFilters(onChange) {
    const form = $('#ofilters');
    const commit = field => { cancelPending(); onChange(read(), field, true); };
    GoalPrototype.productTypeFilter.bind('overviewProductType', {
      root: form,
      get: () => Object.fromEntries(GoalPrototype.productTypeFilter.groups.map(group => [group.key, read()[group.field] || ''])),
      change: (key, value) => {
        const field = GoalPrototype.productTypeFilter.groups.find(group => group.key === key).field;
        form.querySelector(`[data-filter="${field}"]`).value = value;
        commit(field);
      },
    });
    const input = event => {
      if (!event.target.matches('input[data-filter]') || composing || event.isComposing) return;
      cancelPending();
      const field = event.target.dataset.filter;
      onChange(read(), field, false);
      if (!event.target.value.trim()) commit(field);
      else searchTimer = setTimeout(() => commit(field), 250);
    };
    form.addEventListener('compositionstart', () => { composing = true; cancelPending(); });
    form.addEventListener('compositionend', event => { composing = false; input(event); });
    form.addEventListener('input', input);
    form.addEventListener('search', input);
    form.addEventListener('change', event => { if (event.target.matches('select[data-filter]')) commit(event.target.dataset.filter); });
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input[data-filter]') && !composing && !event.isComposing && event.keyCode !== 229) {
        event.preventDefault(); commit(event.target.dataset.filter);
      }
    });
  }
  GoalPrototype.overviewQuery = { read, filter, pager, renderFilters, initLiveFilters, cancelPending, resetInput };
})();
