// 一类电商的分配历史只读；与兴趣电商手工负责计划共用抽屉和分页控件。
function createGoalRecordsView(root, { getShops }) {
  const $ = selector => root.querySelector(selector), V = View;
  const platformName = { tmall: '天猫', jd: '京东', pdd: '拼多多' }[platformId];
  const fields = { brand: '品牌', region: '运营大区', strategy: '店铺策略', promotion: '店铺推广' };
  const ownerLabel = $('#record-owner').closest('label');
  ownerLabel.firstChild.textContent = '店铺策略';
  $('#record-owner').placeholder = '请输入策略姓名';
  ownerLabel.insertAdjacentHTML('afterend', '<label>店铺推广<input id="record-promotion" type="search" placeholder="请输入推广姓名" autocomplete="off"></label>');
  $('.record-table thead').innerHTML = '<tr><th>店铺</th><th>操作</th><th>分配前</th><th>分配后</th><th>操作人</th><th>分配时间</th></tr>';
  const pagination = createPagination($('#record-pagination'), () => {
    render(); $('#records-overlay .dialog-content').scrollTop = 0;
  }, { prefix: 'record-', countId: 'record-count' });
  function allRecords() {
    const shops = new Map(getShops().map(shop => [`${platformName}|${shop.id}`, shop]));
    return ShopAttribution.read().records.filter(record => shops.has(record.identity))
      .map(record => ({ ...record, shop: shops.get(record.identity) }));
  }
  function configuration(rows, empty) {
    return rows.length ? rows.map(row => `<div class="goal-record-snapshot">${Object.entries(fields)
      .map(([key, label]) => `<div><span>${label}</span><strong>${V.escape(row[key] || '未配置')}</strong></div>`).join('')}</div>`).join('') : `<span class="secondary">${empty}</span>`;
  }
  function render() {
    const query = $('#record-shop').value.trim().toLowerCase(), region = $('#record-region').value;
    const strategy = $('#record-owner').value.trim(), promotion = $('#record-promotion').value.trim();
    const actor = $('#record-changer').value.trim();
    const from = $('#record-time-start').value, to = $('#record-time-end').value;
    const invalid = !!(from && to && from > to);
    $('#record-time-error').hidden = !invalid;
    $('#record-time-end').setAttribute('aria-invalid', String(invalid));
    $('#record-shop-clear').hidden = !query;
    const start = from ? Date.parse(`${from}T00:00:00+08:00`) : -Infinity;
    const end = to ? Date.parse(`${to}T00:00:00+08:00`) + 86400000 : Infinity;
    const rows = allRecords().filter(record => {
      const time = Date.parse(record.changedAt);
      const matches = row => (!region || row.region === region) && (!strategy || row.strategy.includes(strategy)) && (!promotion || row.promotion.includes(promotion));
      return !invalid && (!query || `${record.shop.name} ${record.shop.id}`.toLowerCase().includes(query)) &&
        (!actor || record.changedBy.includes(actor)) && (!(from || to) || Number.isFinite(time) && time >= start && time < end) &&
        (!(region || strategy || promotion) || [...record.before, ...record.after].some(matches));
    }).sort((a, b) => b.order - a.order || a.shop.id.localeCompare(b.shop.id));
    const labels = { initial: '新增', create: '新增', update: '变更', legacy: '变更' };
    $('#record-rows').innerHTML = pagination.slice(rows).map(record => `<tr data-goal-record="${V.escape(record.id)}"><td><div>${V.escape(record.shop.name)}</div><div class="shop-id">ID：${V.escape(record.shop.id)}</div></td><td class="record-operation"><span class="record-action" data-action="${['initial', 'create'].includes(record.action) ? 'create' : 'update'}">${labels[record.action] || '--'}</span></td><td>${configuration(record.before, '--')}</td><td>${configuration(record.after, '未配置')}</td><td>${V.escape(record.changedBy || '--')}</td><td class="record-change-time">${record.changedAt ? V.dateTime(record.changedAt) : '--'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">暂无匹配的分配记录</td></tr>';
  }
  function reset() {
    for (const selector of ['#record-shop', '#record-region', '#record-owner', '#record-promotion', '#record-changer', '#record-time-start', '#record-time-end']) $(selector).value = '';
    pagination.reset(); render();
  }
  function open() {
    const regions = [...new Set(allRecords().flatMap(record => [...record.before, ...record.after].map(row => row.region)).filter(Boolean))];
    $('#record-region').innerHTML = V.options(regions, '', '全部大区');
    reset();
  }
  for (const selector of ['#record-shop', '#record-region', '#record-owner', '#record-promotion', '#record-changer', '#record-time-start', '#record-time-end']) $(selector).addEventListener('input', () => { pagination.reset(); render(); });
  $('#record-reset').addEventListener('click', reset);
  $('#record-shop-clear').addEventListener('click', () => { $('#record-shop').value = ''; pagination.reset(); render(); $('#record-shop').focus(); });
  ShopAttribution.subscribe(() => { if (!$('#records-overlay').hidden) render(); });
  return { open, render };
}
