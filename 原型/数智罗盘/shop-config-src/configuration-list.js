/* Current and future configurations stay prominent; previous versions are collapsible. */
function renderConfigurationList(root, shop, today) {
  const A = Assignment, V = View, current = A.configAt(shop,today);
  const configs = A.ordered(shop);
  const activeRows = [], historyRows = [];
  configs.forEach((c,index) => {
    const pending = c.start > today, historical = !pending && c.id !== current?.id;
    const until = historical ? `<div class="shop-id">至 ${V.date(A.shift(configs[index+1].start,-1))}</div>` : '';
    const arrangement = c.type === 'long' ? V.escape(V.person(c)) : c.segments.map(s =>
      `<div class="configuration-period"><span>${A.period(s)}</span><strong>${V.escape(V.person(s))}</strong></div>`).join('');
    const actions = pending ? `<button type="button" class="text-button" data-config="${V.escape(c.id)}">编辑</button><button type="button" class="text-button danger" data-cancel-config="${V.escape(c.id)}">取消</button>` : '<span class="secondary" title="已生效配置不可修改">--</span>';
    const row = `<tr data-configuration="${V.escape(c.id)}"><td>${V.date(c.start)}${until}</td><td>${A.typeName(c)}</td><td>${arrangement}</td><td><span class="badge ${pending || historical ? '' : 'green'}">${pending ? '待生效' : historical ? '历史负责' : '生效中'}</span></td><td><div class="actions">${actions}</div></td></tr>`;
    (historical ? historyRows : activeRows).push(row);
  });
  root.querySelector('#configuration-count').textContent = activeRows.length;
  root.querySelector('#configuration-rows').innerHTML = activeRows.join('') || '<tr><td colspan="5" class="empty">暂无配置</td></tr>';
  root.querySelector('#configuration-history').hidden = !historyRows.length;
  root.querySelector('#configuration-history-count').textContent = historyRows.length;
  root.querySelector('#configuration-history-rows').innerHTML = historyRows.reverse().join('');
}
