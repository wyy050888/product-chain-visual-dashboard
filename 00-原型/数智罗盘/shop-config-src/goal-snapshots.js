// 从目标管理的已保存操作快照投影分配记录；不另写一份历史，避免漏记和重复同步。
const GoalAssignmentSnapshots = (() => {
  const fields = ['brand', 'region', 'strategy', 'promotion'];
  const channels = new Set(['天猫', '京东', '拼多多']);
  const masters = new Map(shopGoalSeed.shops.map(shop => [shop.shopId, shop]));
  const identity = row => {
    const channel = masters.get(row.shopId)?.channel || row.channel;
    return channels.has(channel) ? `${channel}|${row.shopId}` : null;
  };
  const period = row => Number(row.year) * 12 + Number(row.monthNumber);
  const name = (row, field) => ['strategy', 'promotion'].includes(field)
    ? shopGoalSeed.people.find(person => person.id === (row[field + 'Id'] || row[field]))?.name || row[field] || ''
    : row[field] || '';
  function snapshot(rows) {
    const unique = new Map();
    rows.forEach(row => {
      const value = Object.fromEntries(fields.map(field => [field, name(row, field)]));
      if (fields.some(field => value[field])) unique.set(JSON.stringify(value), value);
    });
    return [...unique.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  function latest(rows) {
    const newest = Math.max(...rows.map(period));
    return snapshot(rows.filter(row => period(row) === newest));
  }
  function groupShops(rows) {
    const groups = new Map();
    rows.filter(Boolean).forEach(row => {
      const id = identity(row);
      if (id) { if (!groups.has(id)) groups.set(id, []); groups.get(id).push(row); }
    });
    return groups;
  }
  // 删除销售目标不等于重新分配负责人；只有新增/修改负责关系才产生分配快照。
  const changed = detail => !!detail.after && (detail.type === 'added' ||
    (detail.fields || []).some(field => ['shopId', 'channel', ...fields].includes(field)));
  function project(state) {
    const seedRows = ['product', 'link'].flatMap(kind => Object.values(shopGoalSeed[kind]));
    const current = new Map(), records = [];
    for (const [id, rows] of groupShops(seedRows)) current.set(id, latest(rows));
    // 操作数组是提交顺序；不按目标月份或客户端时间重排“最新”分配。
    const operationShops = new Set();
    for (const [order, operation] of (state.operations || []).entries()) {
      if (operation.status && operation.status !== 'success') continue;
      const allDetails = (operation.groups || []).flatMap(group => group.details || []);
      groupShops(allDetails.flatMap(detail => [detail.before, detail.after])).forEach((_, id) => operationShops.add(id));
      const details = allDetails.filter(changed);
      const affected = groupShops(details.map(detail => detail.after));
      for (const [id, rows] of affected) {
        const newest = Math.max(...rows.map(period));
        const after = details.flatMap(detail => detail.after && identity(detail.after) === id && period(detail.after) === newest ? [detail.after] : []);
        const next = snapshot(after), before = current.get(id) || [];
        if (JSON.stringify(before) === JSON.stringify(next)) continue;
        records.push({ id: `${operation.id || order}|${id}`, identity: id, before, after: next,
          changedAt: operation.timestamp || null, changedBy: operation.actor || '', order,
          action: before.length ? 'update' : 'create', source: '目标管理' });
        current.set(id, next);
      }
    }
    // 兼容没有操作历史的旧本地目标：只展示最近更新批次，不捏造调整前数据。
    const legacyRows = ['product', 'link'].flatMap(kind => Object.values(state[kind] || {}));
    for (const [id, rows] of groupShops(legacyRows)) {
      if (operationShops.has(id)) continue;
      const stamp = row => row.updated?.time || row.created?.time || '';
      const newest = rows.map(stamp).sort().at(-1);
      const batch = newest ? rows.filter(row => stamp(row) === newest) : rows;
      const next = latest(batch);
      current.set(id, next);
      if (JSON.stringify(next) !== JSON.stringify(latest(groupShops(seedRows).get(id) || []))) {
        records.push({ id: `legacy|${id}`, identity: id, before: [], after: next,
          changedAt: newest ? new Date(newest.replaceAll('/', '-').replace(' ', 'T') + '+08:00').toISOString() : null,
          changedBy: batch[0].updated?.name || batch[0].created?.name || '', order: -0.5,
          action: 'legacy', source: '目标管理已有快照' });
      }
    }
    for (const [id, rows] of groupShops(seedRows)) records.push({ id: `initial|${id}`, identity: id,
      before: [], after: latest(rows), changedAt: null, changedBy: '', order: -1,
      action: 'initial', source: '目标管理初始快照' });
    const values = new Map([...current].map(([id, rows]) => [id,
      Object.fromEntries(fields.map(field => [field, [...new Set(rows.map(row => row[field]).filter(Boolean))]]))]));
    return { rows: values, records, period: '最新分配快照', revision: state.revision || 0 };
  }
  return { project };
})();
