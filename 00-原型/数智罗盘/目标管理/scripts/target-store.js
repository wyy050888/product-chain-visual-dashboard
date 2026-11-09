(() => {
  const app = GoalPrototype, storageKey = 'goal-prototype-targets-v1';
  const duplicateProductMessage = '该月份、口径、店铺下已存在此产品目标，请在列表中修改已有记录';
  let state = { revision: 0, product: {}, link: {} };
  try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved?.product && saved?.link) state = saved; } catch (_) { /* 无历史记录时使用样例。 */ }
  // 兼容已保存目标中的旧姓名；后续保存时随目标一起持久化。
  Object.values(state.product).concat(Object.values(state.link)).filter(Boolean).forEach(row => {
    ['strategy', 'promotion'].forEach(field => { if (row[field] === '夜狼') row[field] = '刘远锴'; });
    ['created', 'updated'].forEach(field => { if (row[field]?.name === '夜狼') row[field].name = '刘远锴'; });
  });
  const key = row => JSON.stringify([row.cid, row.year, row.monthNumber, row.shopId, app.targetGroup.productKey(row), row.linkId || '']);
  // 存储键保留SPU以兼容历史记录；同月份/口径/店铺的链接不得跨产品重复填报。
  const linkKey = row => JSON.stringify([row.cid, row.year, row.monthNumber, row.shopId, '', row.linkId || '']);
  const version = () => state.revision;
  const changed = () => Object.keys(state.product).length + Object.keys(state.link).length > 0;
  const attributions = () => [...new Map(Object.values(state.product).concat(Object.values(state.link)).filter(Boolean).map(({ region, brand, channel }) => [JSON.stringify([region, brand, channel]), { region, brand, channel }])).values()];
  const years = () => [...new Set([...Array.from({length:Math.max(1,app.clock.parts().year-2024+2)},(_,i)=>2024+i), ...Object.keys(state.product).concat(Object.keys(state.link)).map(id => JSON.parse(id)[1])])].sort((a, b) => a - b);
  function read(kind, { year, monthNumber, cid }, source = state) {
    const base = app.model.baseRows(kind === 'product' ? 'ep' : 'el', { year, monthList: [monthNumber], cid });
    const map = new Map(base.map(row => { const record = { ...row, cid, year, monthNumber, month: `${year}/${String(monthNumber).padStart(2, '0')}` }; return [key(record), record]; }));
    Object.entries(source[kind]).forEach(([id, row]) => {
      const [scope, y, m] = JSON.parse(id);
      if (scope === cid && y === year && m === monthNumber) { if (row) map.set(id, row); else map.delete(id); }
    });
    return [...map.values()].map(row => ({ ...row, category: window.FilterCatalog.normalizeChain(row.category) || app.fixtures.products.find(product => product.id === row.id || product.product === row.product)?.category || null, regionId: row.regionId || app.regionConfig.find(row.region)?.id || '', recordKey: key(row) }));
  }
  function commit(next, expected, meta = {}) {
    if (expected !== state.revision) throw new Error('数据已变化，请重新打开后操作');
    const operation = app.targetAudit.capture(state, next, read, meta);
    if (!operation && !meta.record) return;
    next.operations = [...(state.operations || []), ...(meta.record ? [meta.record] : [operation])];
    try {
      const persisted = JSON.parse(localStorage.getItem(storageKey));
      if (persisted && persisted.revision !== state.revision) throw new Error('其他页面已修改数据，请刷新后重试');
      next.revision = state.revision + 1;
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) { throw new Error(error.message.includes('其他页面') ? error.message : '保存失败：浏览器本地存储不可用或空间不足'); }
    state = next;
    window.dispatchEvent(new Event('compass-targets-committed'));
  }
  function linkAttribution(row) {
    const catalog = app.entrySchema.catalog();
    if (!catalog.links.some(link => link.shopId === row.shopId && link.linkId === row.linkId)) throw new Error('核心链接不属于所选店铺');
    const product = catalog.products.find(item => item.productCode === row.productCode);
    const shop = catalog.shops.find(item => item.shopId === row.shopId);
    return { brand: product?.brand || row.brand, channel: shop.channel };
  }
  function put(kind, row, edit, expected) {
    row = { ...row, ...app.regionConfig.requireRegion(row.region) };
    const found = read(kind, row).find(item => key(item) === key(row));
    if (edit && !found) throw new Error('目标已删除，请刷新后重试');
    if (kind === 'link' && read('link', row).some(item => linkKey(item) === linkKey(row) && key(item) !== key(row))) throw new Error('该核心链接本月已有目标，请修改现有记录');
    if (!edit && found) throw new Error(kind === 'product' ? duplicateProductMessage : '该年份、月份、口径下已有此目标，请修改现有记录');
    const next = structuredClone(state), now = { name: '系统租户管理员', time: new Date().toLocaleString('sv-SE').replaceAll('-', '/') };
    next[kind][key(row)] = { ...row, ...(kind === 'link' ? linkAttribution(row) : {}), created: found?.created || now, updated: now };
    const synced = app.targetGroup.synchronize(next, [row], read, now);
    commit(next, expected, { kind, cid: row.cid, synced, groupSync: true });
  }
  // 多条核心链接作为一次提交：校验全部通过后只写入一次。
  function addLinks(rows, expected) {
    const ids = new Set(), next = structuredClone(state);
    const now = { name: '系统租户管理员', time: new Date().toLocaleString('sv-SE').replaceAll('-', '/') };
    if (!rows.length) throw new Error('请至少添加一条核心链接');
    rows.forEach(row => {
      row = { ...row, ...app.regionConfig.requireRegion(row.region) };
      const id = key(row);
      if (ids.has(linkKey(row)) || read('link', row).some(item => linkKey(item) === linkKey(row))) throw new Error('存在重复链接目标，请修改现有记录');
      ids.add(linkKey(row)); next.link[id] = { ...row, ...linkAttribution(row), created: now, updated: now };
    });
    const synced = app.targetGroup.synchronize(next, rows, read, now);
    commit(next, expected, { kind:'link', cid: rows[0].cid, synced, groupSync: true });
  }
  const children = row => read('link', row).filter(item => item.shopId === row.shopId && app.targetGroup.productKey(item) === app.targetGroup.productKey(row));
  function updateLink(original, row, expected) {
    row = { ...row, ...app.regionConfig.requireRegion(row.region) };
    const found = read('link', original).find(item => key(item) === key(original));
    if (!found) throw new Error('目标已删除，请刷新后重试');
    if (['year', 'monthNumber', 'cid', 'productCode'].some(field => row[field] !== found[field])) throw new Error('修改链接目标时不能更换月份、口径或产品');
    const attribution = linkAttribution(row);
    const moved = key(found) !== key(row);
    if (moved && read('link', row).some(item => linkKey(item) === linkKey(row) && key(item) !== key(found))) throw new Error('所选链接已有目标，请修改现有记录');
    const next = structuredClone(state), now = { name: '系统租户管理员', time: new Date().toLocaleString('sv-SE').replaceAll('-', '/') };
    // 更换店铺或链接时原键屏蔽与新记录同时提交，避免新增一条并遗留旧目标。
    if (moved) next.link[key(found)] = null;
    next.link[key(row)] = { ...row, ...attribution, created: found.created || now, updated: now };
    const synced = app.targetGroup.synchronize(next, [row], read, now);
    commit(next, expected, { kind:'link', cid: row.cid, synced, groupSync: true, pairs:[{before:app.targetAudit.detailKey(found),after:app.targetAudit.detailKey(row)}] });
  }
  function updateProduct(original, row, expected) {
    row = { ...row, ...app.regionConfig.requireRegion(row.region) };
    const found = read('product', original).find(item => key(item) === key(original));
    if (!found) throw new Error('目标已删除，请刷新后重试');
    if (['year', 'monthNumber', 'cid', 'productCode'].some(field => row[field] !== found[field])) throw new Error('修改产品目标时不能更换月份、口径或产品');
    const moved = key(found) !== key(row), linked = children(found);
    if (moved && read('product', row).some(item => key(item) === key(row))) throw new Error(duplicateProductMessage);
    if (moved && linked.length) throw new Error('当前目标有关联链接，请先处理链接目标再更换店铺');
    const next = structuredClone(state), now = { name: '系统租户管理员', time: new Date().toLocaleString('sv-SE').replaceAll('-', '/') };
    // 店铺是唯一键的一部分：迁移时屏蔽原记录，并与新记录一次写入。
    if (moved) next.product[key(found)] = null;
    next.product[key(row)] = { ...row, created: found.created || now, updated: now };
    const synced = app.targetGroup.synchronize(next, [row], read, now);
    commit(next, expected, { kind:'product', cid: row.cid, synced, groupSync: true, pairs:[{before:app.targetAudit.detailKey(found),after:app.targetAudit.detailKey(row)}] });
  }
  function remove(kind, row, expected) {
    if (kind === 'product' && children(row).length) throw new Error('该产品目标下存在产品链接目标，请先删除关联产品链接目标');
    const next = structuredClone(state); next[kind][key(row)] = null;
    commit(next, expected, { kind });
  }
  function importPeriod(records) {
    const years = [...new Set(records.map(row => row.year))], months = [...new Set(records.map(row => row.monthNumber))].sort((a, b) => a - b);
    const quarter = Math.ceil(months[0] / 3), annual = months.length === 12 && months.every((value, index) => value === index + 1);
    if (years.length !== 1 || !Number.isInteger(years[0]) || years[0]<1900 || years[0]>9999 || months.some(value=>!Number.isInteger(value)||value<1||value>12) || (!annual && !(months.length === 3 && months.every((value, index) => value === quarter * 3 - 2 + index)))) throw new Error('导入数据须为同一年完整自然季度或全年，请检查年份及月份是否完整。');
    return { years, months, annual, quarter };
  }
  function importPlan(kind, records, cid) {
    records = records.map(row => ({ ...row, ...app.regionConfig.requireRegion(row.region) }));
    const { years, months, annual, quarter } = importPeriod(records);
    const next = structuredClone(state), incoming = new Set(records.map(key)), old = months.flatMap(monthNumber => read(kind, { year: years[0], monthNumber, cid }));
    const removed = old.filter(row => !incoming.has(key(row)));
    if (incoming.size !== records.length) throw new Error('文件中存在重复目标');
    if (kind === 'link') {
      if (new Set(records.map(linkKey)).size !== records.length) throw new Error('文件中存在重复链接目标');
    }
    const now = { name: '系统租户管理员', time: new Date().toLocaleString('sv-SE').replaceAll('-', '/') };
    removed.forEach(row => { next[kind][key(row)] = null; });
    records.forEach(row => { next[kind][key(row)] = { ...row, created: old.find(item => key(item) === key(row))?.created || now, updated: now }; });
    // 与历史明细共用差异算法，按完整唯一键对应的记录计数。
    const synced = app.targetGroup.synchronize(next, records, read, now);
    const summary = app.targetAudit.summarize(app.targetAudit.compare(kind, old, records));
    summary.unchanged = records.length - summary.added - summary.updated;
    summary.unmatched = records.filter(row => row.productMatch === 'unmatched').length;
    summary.synced = synced.length;
    return { kind, cid, next, syncedTargets: synced, revision: state.revision, year: years[0], months, annual, quarter, total: records.length, summary, ...summary };
  }
  function applyImport(plan, file='',stats={}) {
    commit(plan.next,plan.revision,{import:true,groupSync:true,synced:plan.syncedTargets,kind:plan.kind,cid:plan.cid,file,year:plan.year,months:plan.months,total:plan.total,unmatched:plan.summary.unmatched,unchanged:plan.summary.unchanged,...stats});
  }
  function recordImport(meta) {
    const record={id:app.targetAudit.id(),timestamp:new Date().toISOString(),actor:'系统租户管理员',source:'import',groups:[],summary:{added:0,updated:0,removed:0},...meta};
    commit(structuredClone(state),version(),{record});return record;
  }
  app.targetStore = { key, linkKey, read, put, updateProduct, updateLink, addLinks, remove, children, changed, attributions, years, version, importPeriod, importPlan, applyImport, recordImport, operations:()=>structuredClone(state.operations || []) };
})();
