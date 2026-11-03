function createRecordsView(root, {getShops,directory}) {
  if (directory.readOnly) return createGoalRecordsView(root, {getShops});
  const $ = s => root.querySelector(s), V = View;
  const changeTime = V.dateTime;
  const pagination = createPagination($('#record-pagination'),() => {
    render(); $('#records-overlay .dialog-content').scrollTop = 0;
  },{prefix:'record-',countId:'record-count'});
  function reset() {
    $('#record-shop').value = ''; $('#record-time-start').value = ''; $('#record-time-end').value = ''; $('#record-changer').value = '';
    $('#record-region').value = ''; $('#record-owner').value = ''; delete $('#record-shop').dataset.shopId; pagination.reset(); render();
  }
  function compactPeriod(segment) {
    const md = (month,day) => `${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
    return `${md(segment.sm,segment.sd)}—${Assignment.crossYear(segment) ? '次年' : ''}${md(segment.em,segment.ed)}`;
  }
  function configuration(c, empty) {
    if (!c) return `<span class="secondary">${empty}</span>`;
    const schedule = c.type === 'annual'
      ? c.segments.map(segment => `<div class="record-period"><span>${compactPeriod(segment)}</span><strong>${V.escape(V.person(segment))}</strong></div>`).join('')
      : `<div class="record-period"><strong>${V.escape(V.person(c))}</strong></div>`;
    return `<div class="record-config"><div class="record-config-heading"><strong>${Assignment.typeName(c)}</strong><span class="record-origin-date">生效日 ${V.date(c.start)}</span></div>${schedule}</div>`;
  }
  function render() {
    const shopQuery = $('#record-shop').value.trim().toLowerCase(), shopId = $('#record-shop').dataset.shopId;
    $('#record-shop-clear').hidden = !shopQuery;
    const from = $('#record-time-start').value, to = $('#record-time-end').value;
    const changer = $('#record-changer').value.trim().toLowerCase();
    const invalidRange = !!(from && to && from > to);
    $('#record-time-error').hidden = !invalidRange;
    $('#record-time-end').setAttribute('aria-invalid',String(invalidRange));
    // Match full calendar days in the same timezone used by the visible change timestamps.
    const start = from ? Date.parse(`${from}T00:00:00+08:00`) : null;
    const end = to ? Date.parse(`${to}T00:00:00+08:00`) + 86400000 : null;
    const matchesTime = r => {
      const time = Date.parse(r.changedAt);
      return !invalidRange && (!(from || to) || (Number.isFinite(time) && (start === null || time >= start) && (end === null || time < end)));
    };
    const region = $('#record-region').value, owner = $('#record-owner').value.trim().toLowerCase();
    const matches = c => c && (c.type === 'annual' ? c.segments : [c]).some(s => (!region || s.region === region) && (!owner || s.owner.toLowerCase().includes(owner)));
    const rows = getShops().filter(s => shopId ? s.id === shopId : !shopQuery || `${s.name} ${s.id}`.toLowerCase().includes(shopQuery))
      .flatMap(s => (s.changes || []).map((r,index) => ({...r,shop:s,order:index})))
      .filter(r => matchesTime(r) && (!changer || (r.changedBy || '').toLowerCase().includes(changer)) && ((!region && !owner) || matches(r.before) || matches(r.after)))
      .sort((a,b) => (Date.parse(b.changedAt) || 0) - (Date.parse(a.changedAt) || 0) || b.order-a.order || a.shop.id.localeCompare(b.shop.id));
    const actions = {create:'新增',update:'修改',cancel:'取消'};
    $('#record-rows').innerHTML = pagination.slice(rows).map(r => `<tr><td><div>${V.escape(r.shop.name)}</div><div class="shop-id">ID：${r.shop.id}</div></td><td class="record-operation">${actions[r.action] ? `<span class="record-action" data-action="${V.escape(r.action)}">${actions[r.action]}</span>` : '--'}</td><td class="record-before">${configuration(r.before,'--')}</td><td class="record-after">${configuration(r.after,'--')}</td><td>${V.escape(r.changedBy || '--')}</td><td class="record-change-time">${changeTime(r.changedAt)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty"><strong>暂无匹配的分配记录</strong></td></tr>';
  }
  function open(shopId = null) {
    $('#record-region').innerHTML = V.options(directory.regions,'',directory.allLabel);
    reset();
    const shop = getShops().find(s => s.id === shopId);
    if (shop) { $('#record-shop').value = `${shop.name}（${shop.id}）`; $('#record-shop').dataset.shopId = shop.id; }
    render();
  }
  ['#record-shop','#record-time-start','#record-time-end','#record-changer','#record-region','#record-owner'].forEach(s => $(s).addEventListener('input',() => { if (s === '#record-shop') delete $('#record-shop').dataset.shopId; pagination.reset(); render(); }));
  $('#record-reset').addEventListener('click',reset);
  $('#record-shop-clear').addEventListener('click',() => {
    $('#record-shop').value = ''; delete $('#record-shop').dataset.shopId; pagination.reset(); render(); $('#record-shop').focus();
  });
  return {open,render};
}
